import { supabase } from './supabase';
import type {
  FlagCategory,
  FlagRow,
  FlagSeverity,
  FlagStatus,
} from '@/types/database';

export const FLAG_PHOTOS_BUCKET = 'flag-photos';

// 10 MB. Bigger than any photo the picker will hand us at quality=0.7,
// small enough that a runaway upload can't burn the user's data plan or
// hog the device while we wait for arrayBuffer(). Tune up if real photos
// start hitting this cap.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Only image extensions we're willing to upload. Anything else (svg, html,
// pdf, exe…) gets rejected with a clear message rather than landing in a
// public Storage bucket with an inferred MIME type that may or may not
// match the actual bytes.
const ALLOWED_PHOTO_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
]);

// Schemes expo-image-picker produces. `file://` (most platforms),
// `content://` (Android storage URIs), `ph://` and `assets-library://`
// (iOS photo library). `data:` and `blob:` show up on web. We deliberately
// don't accept `http(s)://` here — those would fetch from the network and
// happily re-upload someone else's image. The whole point of this helper
// is "take this just-picked local photo and put it in Storage."
const ALLOWED_PHOTO_SCHEMES = [
  'file://',
  'content://',
  'ph://',
  'assets-library://',
  'data:',
  'blob:',
];

/**
 * Upload a local image (file:// URI from expo-image-picker) to the
 * flag-photos Supabase bucket and return its public URL.
 *
 * Validates the URI scheme, the extension, and the byte size before
 * touching Storage so a malformed pick or a runaway file fails loudly
 * here instead of silently filling the bucket with garbage.
 */
export async function uploadFlagPhoto(
  userId: string,
  localUri: string,
): Promise<string> {
  if (!localUri || typeof localUri !== 'string') {
    throw new Error('No photo selected.');
  }
  if (!ALLOWED_PHOTO_SCHEMES.some((s) => localUri.startsWith(s))) {
    throw new Error('Unsupported photo source.');
  }
  // Pick an extension from the uri; default to jpg for schemes that
  // don't carry one (data:, blob:, some content:// uris).
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(localUri);
  const ext = (match?.[1] ?? 'jpg').toLowerCase();
  if (!ALLOWED_PHOTO_EXTS.has(ext)) {
    throw new Error('Photo must be a JPG, PNG, WEBP, or HEIC image.');
  }

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Photo file is empty.');
  }
  if (arrayBuffer.byteLength > MAX_PHOTO_BYTES) {
    throw new Error('Photo is too large. Please pick one under 10 MB.');
  }
  const contentType =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'heic' || ext === 'heif'
          ? 'image/heic'
          : 'image/jpeg';
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export interface CreateFlagInput {
  lat: number;
  lng: number;
  category: FlagCategory;
  severity: FlagSeverity;
  description?: string | null;
  photo_url?: string | null;
}

/**
 * Fetch flags matching the given statuses. Capped at 500 rows so a runaway
 * table can't lock up the Map/Tasks screens. Real cursor-paginated fetching
 * is tracked as a proposal in qa-reports/qa-2026-05-22.md (P1).
 */
export async function listFlags(statuses: FlagStatus[] = ['open', 'verified']) {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

/**
 * Fetch every flag a single user has submitted, newest first. Used by the
 * "My Reports" view on Profile. Capped at 200 — same reasoning as listFlags:
 * a runaway user shouldn't lock up the screen. If someone hits the cap we'll
 * add cursor pagination here too (tracked alongside listFlags in P1).
 */
export async function listFlagsByUser(userId: string) {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

export async function createFlag(userId: string, input: CreateFlagInput) {
  const { data, error } = await supabase
    .from('flags')
    .insert({
      user_id: userId,
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      severity: input.severity,
      description: input.description ?? null,
      photo_url: input.photo_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FlagRow;
}

export async function updateFlagStatus(flagId: string, status: FlagStatus) {
  const { data, error } = await supabase
    .from('flags')
    .update({ status })
    .eq('id', flagId)
    .select()
    .single();
  if (error) throw error;
  return data as FlagRow;
}

// RLS allows delete only when user_id = auth.uid(), so the caller does not
// need to re-check ownership — Supabase will reject any other user's row.
export async function deleteFlag(flagId: string) {
  const { error } = await supabase.from('flags').delete().eq('id', flagId);
  if (error) throw error;
}

export const CATEGORY_LABELS: Record<FlagCategory, string> = {
  no_ramp: 'No ramp',
  broken_sidewalk: 'Broken sidewalk',
  blocked_path: 'Blocked path',
  missing_signal: 'Missing signal',
  steep_grade: 'Steep grade',
  other: 'Other',
};

export const CATEGORY_ORDER: FlagCategory[] = [
  'no_ramp',
  'broken_sidewalk',
  'blocked_path',
  'missing_signal',
  'steep_grade',
  'other',
];

// Plain-language descriptions for the in-app legend. Kept short enough to
// render in a single bottom-sheet row without truncation at large dynamic type.
export const CATEGORY_DESCRIPTIONS: Record<FlagCategory, string> = {
  no_ramp: 'A curb, step, or entrance with no ramp or accessible alternative.',
  broken_sidewalk: 'Cracked, heaved, or uneven pavement that blocks wheels.',
  blocked_path: 'A path obstructed by debris, vehicles, scaffolding, or other obstacles.',
  missing_signal: 'A crossing missing audible or visual pedestrian signals.',
  steep_grade: 'A slope too steep to roll up safely.',
  other: 'Anything else that blocks or limits accessibility.',
};

// A small glyph for each category. Used as a visual aid alongside the label;
// labels still carry the meaning (screen readers skip these decorative chars).
export const CATEGORY_ICONS: Record<FlagCategory, string> = {
  no_ramp: '↥',
  broken_sidewalk: '▦',
  blocked_path: '⛔',
  missing_signal: '🚦',
  steep_grade: '⛰',
  other: '•',
};

export const SEVERITY_ORDER: FlagSeverity[] = [1, 2, 3, 4, 5];

// Marker / severity-bar hex tints. Used everywhere a severity needs to show
// up visually: the map pin, the Tasks card dot, the LegendModal swatch, etc.
// Kept here (not in a screen file) so it's the single source of truth — every
// surface tints from the same palette. Pair with SEVERITY_COLOR_NAMES below
// so screen readers can name the color out loud.
//
// The `default` branch is defensive: if a future row carries an unexpected
// severity (dirty data, schema widening), return a neutral gray instead of
// `undefined` so the marker/severity bar still renders something.
export function severityColor(s: FlagSeverity): string {
  switch (s) {
    case 1: return '#27ae60';
    case 2: return '#7fb800';
    case 3: return '#f1c40f';
    case 4: return '#e67e22';
    case 5: return '#e74c3c';
    default: return '#999';
  }
}

// Short human label and color name for each severity. The color name is read
// aloud so meaning isn't carried by color alone.
export const SEVERITY_LABELS: Record<FlagSeverity, string> = {
  1: 'Minor',
  2: 'Mild',
  3: 'Moderate',
  4: 'Significant',
  5: 'Severe',
};

export const SEVERITY_COLOR_NAMES: Record<FlagSeverity, string> = {
  1: 'green',
  2: 'light green',
  3: 'yellow',
  4: 'orange',
  5: 'red',
};

export const SEVERITY_DESCRIPTIONS: Record<FlagSeverity, string> = {
  1: 'Inconvenient but usable.',
  2: 'Doable with effort or help.',
  3: 'Hard for many users.',
  4: 'Hard or unsafe for most users.',
  5: 'Impassable. Needs a detour.',
};

export const STATUS_LABELS: Record<FlagStatus, string> = {
  open: 'Open',
  verified: 'Verified',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

// Tinted-background + darker-foreground palette for the status badges.
// Kept here so the badge looks identical wherever it appears (FlagDetailModal,
// MyReportsModal, future surfaces). Each pair clears WCAG AA 4.5:1 between
// `fg` and `bg`, so they're safe to drop into any badge component.
export const STATUS_COLORS: Record<FlagStatus, { bg: string; fg: string }> = {
  open: { bg: '#fdebd0', fg: '#8a4b00' },
  verified: { bg: '#d6e6f9', fg: '#1c4f99' },
  resolved: { bg: '#d4ecdb', fg: '#1b6b34' },
  rejected: { bg: '#e5e5e5', fg: '#3a3a3a' },
};

// Order shown in the Map filter and elsewhere — chronological lifecycle.
export const STATUS_ORDER: FlagStatus[] = [
  'open',
  'verified',
  'resolved',
  'rejected',
];

// What listFlags() falls back to when no statuses are passed — also the
// default set the Map's status filter starts with, so a default-state
// filter row matches the historical fetch behavior.
export const DEFAULT_STATUSES: FlagStatus[] = ['open', 'verified'];
