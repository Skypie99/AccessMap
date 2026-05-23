import { supabase } from './supabase';
import type {
  FlagCategory,
  FlagRow,
  FlagSeverity,
  FlagStatus,
} from '@/types/database';

export const FLAG_PHOTOS_BUCKET = 'flag-photos';

/**
 * Upload a local image (file:// URI from expo-image-picker) to the
 * flag-photos Supabase bucket and return its public URL.
 */
export async function uploadFlagPhoto(
  userId: string,
  localUri: string,
): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  // Pick an extension from the uri; default to jpg.
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(localUri);
  const ext = (match?.[1] ?? 'jpg').toLowerCase();
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
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
