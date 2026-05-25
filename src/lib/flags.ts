import { supabase } from './supabase';
import type {
  FlagCategory,
  FlagRow,
  FlagSeverity,
  FlagStatus,
} from '@/types/database';

export const FLAG_PHOTOS_BUCKET = 'flag-photos';

/**
 * Default page sizes used by listFlagsPage and FlagsProvider.
 * Exported here so flagsStore.tsx and TasksScreen.tsx can import them
 * without a circular dependency.
 */
export const INITIAL_PAGE_SIZE = 50;
export const NEXT_PAGE_SIZE = 20;

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
  // Optional context tags — see src/lib/contextTags.ts for the vocabulary.
  // Sent to the `context_tags` column added by
  // supabase/migrations/2026-05-24_flag_context_tags.sql. Until that
  // migration is applied, the insert below detects the unknown-column
  // error and retries without this field (tags are silently dropped
  // server-side; the chip UI still works).
  context_tags?: string[];
}

/**
 * Fetch flags matching the given statuses. Capped at 500 rows so a runaway
 * table can't lock up the Map/Tasks screens. The shared FlagsProvider now
 * uses listFlagsPage() for the default open+verified set; this function is
 * kept for one-shot filtered queries (e.g. Map filter when toggling Resolved).
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

export interface ListFlagsPageOptions {
  limit?: number;
  /**
   * Cursor: when set, fetch rows whose created_at is strictly less than this
   * ISO timestamp. Pair with the previous page's `nextCursor`.
   */
  before?: string;
}

export interface ListFlagsPageResult {
  rows: FlagRow[];
  /**
   * `created_at` of the last row when a full page was returned — implies more
   * may exist. `null` once the server returned fewer than `limit` rows.
   */
  nextCursor: string | null;
}

/**
 * Cursor-paginated fetch over the flags table. Used by FlagsProvider for the
 * default open+verified feed so the first page arrives fast and the user
 * loads more on demand. Cursor is the `created_at` value of the last row in
 * the previous page.
 *
 * Returns `{ rows, nextCursor }`. `nextCursor` is only set when a full page
 * was returned; once a short page comes back we know we've reached the end.
 *
 * Note on ties: two rows with identical `created_at` could be skipped at a
 * page boundary (strict `lt` cursor). Postgres `now()` is microsecond
 * resolution so collisions are very unlikely in practice.
 */
export async function listFlagsPage(
  statuses: FlagStatus[] = ['open', 'verified'],
  opts: ListFlagsPageOptions = {},
): Promise<ListFlagsPageResult> {
  const limit = opts.limit ?? INITIAL_PAGE_SIZE;
  let query = supabase
    .from('flags')
    .select('*')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.before) {
    query = query.lt('created_at', opts.before);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as FlagRow[];
  const nextCursor =
    rows.length === limit ? (rows[rows.length - 1]?.created_at ?? null) : null;
  return { rows, nextCursor };
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

// Heuristic: did this PostgREST error come from sending a column the schema
// cache doesn't know about? PostgREST returns code 'PGRST204' for
// "column 'X' of relation 'Y' does not exist" (schema-cache miss). On older
// Supabase deployments the message-only path is the fallback. Used by
// createFlag to gracefully degrade when the context_tags migration hasn't
// been applied yet.
function isUnknownColumnError(err: unknown, columnName: string): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message;
  if (code === 'PGRST204') return true;
  if (typeof message === 'string' && message.includes(columnName)) {
    // "could not find the 'context_tags' column" or "column ... does not exist".
    return /not (find|exist)/i.test(message);
  }
  return false;
}

// Capability gate for the `flags.context_tags` column. Starts 'unknown' on
// app launch. Each successful insert WITH tags flips it to 'available'.
// Each PGRST204-style failure flips it to 'unavailable' — the UI watches
// this so the chip picker can disable itself + show a "coming soon" hint
// instead of letting the user pick tags that will be silently dropped.
//
// Why module-level state and not React state: createFlag is a pure helper
// called from a screen, and we want the capability cached for the lifetime
// of the JS bundle (re-probing every submit would be wasteful). The
// `__resetContextTagsCapabilityForTests` export below lets test files
// reset between cases.
export type ContextTagsCapability = 'unknown' | 'available' | 'unavailable';
let contextTagsCapability: ContextTagsCapability = 'unknown';
const capabilityListeners = new Set<(cap: ContextTagsCapability) => void>();

export function getContextTagsCapability(): ContextTagsCapability {
  return contextTagsCapability;
}

/**
 * Subscribe to capability changes. Returns an unsubscribe function. The
 * listener fires once immediately with the current value so a freshly-
 * mounted UI doesn't have to read + subscribe separately.
 */
export function subscribeContextTagsCapability(
  listener: (cap: ContextTagsCapability) => void,
): () => void {
  capabilityListeners.add(listener);
  listener(contextTagsCapability);
  return () => {
    capabilityListeners.delete(listener);
  };
}

function setContextTagsCapability(next: ContextTagsCapability) {
  if (next === contextTagsCapability) return;
  contextTagsCapability = next;
  for (const l of capabilityListeners) l(next);
}

// Test-only: reset module state between cases. Not part of the public API.
export function __resetContextTagsCapabilityForTests() {
  contextTagsCapability = 'unknown';
  capabilityListeners.clear();
}

/**
 * Returned by createFlag so the caller can tell the user when tags they
 * picked were dropped server-side. `tagsAccepted=false` means we fell back
 * to the legacy no-tags insert because the column isn't there yet.
 */
export interface CreateFlagResult {
  row: FlagRow;
  tagsAccepted: boolean;
}

export async function createFlag(
  userId: string,
  input: CreateFlagInput,
): Promise<CreateFlagResult> {
  const basePayload = {
    user_id: userId,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    severity: input.severity,
    description: input.description ?? null,
    photo_url: input.photo_url ?? null,
  };
  // Try the insert WITH context_tags first. If the column isn't there yet
  // (migration 2026-05-24_flag_context_tags.sql hasn't been applied), retry
  // without it so the report still lands. Tags are silently dropped in that
  // case — the chip UI keeps working, the user just doesn't get a
  // server-side record of which contexts they picked until the migration
  // runs. Once the column exists, this single round-trip succeeds.
  const tagsToSend = input.context_tags;
  // Only attempt the tagged insert when (a) the caller actually has tags
  // AND (b) we haven't already learned the column is missing on this
  // backend. This avoids the wasted round-trip + the silent drop.
  const shouldTryTagged =
    tagsToSend !== undefined && contextTagsCapability !== 'unavailable';
  if (shouldTryTagged) {
    // The Database type in src/types/database.ts doesn't list context_tags
    // yet (we're keeping the migration propose-only), so cast the payload
    // to escape the typed Insert shape. Once the migration lands and the
    // type is updated, this cast can come off.
    const withTags = { ...basePayload, context_tags: tagsToSend } as Record<string, unknown>;
    const { data, error } = await supabase
      .from('flags')
      .insert(withTags as never)
      .select()
      .single();
    if (!error) {
      setContextTagsCapability('available');
      return { row: data as FlagRow, tagsAccepted: true };
    }
    if (!isUnknownColumnError(error, 'context_tags')) throw error;
    // Mark capability unavailable so future submits skip the doomed
    // tagged path AND so the UI can disable the picker.
    setContextTagsCapability('unavailable');
    // Fall through to the legacy-shape insert below.
  }
  const { data, error } = await supabase
    .from('flags')
    .insert(basePayload)
    .select()
    .single();
  if (error) throw error;
  // tagsAccepted is true only when the user didn't try to send any in the
  // first place. If they tried and we fell back, surface that to the caller.
  const tagsAccepted = tagsToSend === undefined || tagsToSend.length === 0;
  return { row: data as FlagRow, tagsAccepted };
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

/**
 * Fetch a single flag by id. Used when arriving via a deep link
 * (`accessmap://flag/{id}`) where the URL only carries the id — we need
 * the lat/lng to animate the map and pop the callout.
 *
 * Returns null on not-found instead of throwing, so a stale share link
 * doesn't surface an alarming error to the user — the Map just opens
 * normally without focusing on anything.
 */
export async function fetchFlagById(flagId: string): Promise<FlagRow | null> {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .eq('id', flagId)
    .maybeSingle();
  if (error) throw error;
  return (data as FlagRow | null) ?? null;
}

/**
 * Fetch many flags by ids in a single round-trip. Used by the Watched
 * Flags view to re-read each watched flag's current state (status may
 * have changed since the user last saw it).
 *
 * Returns [] for empty input (skips the round-trip). Missing ids
 * (e.g. a flag the user watched then someone deleted) are silently
 * dropped — the caller decides whether to prune them from the
 * watched list.
 */
export async function fetchFlagsByIds(flagIds: string[]): Promise<FlagRow[]> {
  if (flagIds.length === 0) return [];
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .in('id', flagIds);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

/**
 * Fetch the most recent flags across ALL statuses, newest first. Powers the
 * Activity Feed, which wants a chronological "what's been happening
 * community-wide" view (not filtered down to triage like listFlags).
 *
 * Limit defaults to 100 — enough for ~a week of activity at typical density,
 * small enough to render without virtualization headaches. Bump if needed
 * once usage tells us more.
 */
export async function listRecentFlags(limit = 100): Promise<FlagRow[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
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
