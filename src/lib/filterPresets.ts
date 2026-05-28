/**
 * Filter presets — per-user, on-device snapshots of the Map filter state.
 *
 * The user names a combination of (categories, minimum severity, statuses)
 * once and can pull it back later in one tap. This is the *manager* layer:
 * pure CRUD over a list, plus AsyncStorage IO. The actual "Apply this preset
 * to the live Map filters" wiring lands in a follow-up cycle — see the
 * commit message for why MapScreen is held back this cycle.
 *
 * Why a separate module from `filterSets.ts` (which already exists):
 *  - `filterSets.ts` is DEVICE-WIDE (capped at 5 sets shared across any
 *    account on the device) and is the channel the Map already reads from.
 *  - `filterPresets.ts` is PER-USER (keyed by userId, capped at 20) so a
 *    shared phone keeps each account's named views distinct.
 *  - Different lifecycle (CRUD with rename + per-user namespacing vs. the
 *    older shared-set semantics). The two co-exist until the next cycle
 *    wires presets into MapScreen, at which point the older filterSets
 *    surface may be deprecated separately.
 *
 * Single key per user, namespaced + versioned so a future schema change can
 * bump _v1 → _v2 and harmlessly drop unreadable old entries.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

export const FILTER_PRESETS_KEY_PREFIX = '@accessmap/filter_presets_v1:';

// 20 is a reasonable upper bound for personal saved views. Picked generously
// — five is plenty for typical use but power users juggling many city
// neighborhoods may legitimately want more named contexts. The cap protects
// AsyncStorage payload size and keeps the manager list scannable.
export const FILTER_PRESETS_MAX = 20;

export type FilterPresetStatus = 'open' | 'verified' | 'resolved' | 'rejected';

const STATUS_SET: ReadonlySet<FilterPresetStatus> = new Set<FilterPresetStatus>([
  'open',
  'verified',
  'resolved',
  'rejected',
]);

export type FilterPreset = {
  /** Client-generated id; collision-free at this tiny scale. */
  id: string;
  name: string;
  /**
   * Category enum values. Stored as plain strings (rather than the
   * `FlagCategory` enum) so this module stays self-contained — the
   * consumer (the next cycle's Map wiring) is responsible for filtering
   * out values that don't match the current category vocabulary.
   */
  categories: ReadonlyArray<string>;
  /** 1–5, inclusive. */
  minSeverity: number;
  statusFilter: ReadonlyArray<FilterPresetStatus>;
  /** ISO timestamp for "added on" display + recency sort fallback. */
  createdAt: string;
};

function storageKey(userId: string): string {
  return FILTER_PRESETS_KEY_PREFIX + userId;
}

/**
 * Fresh id that needs no extra deps. Combines now() with a small random
 * suffix — collision-free for the tiny scale (<= 20 entries per user) and
 * sortable enough for "newest at end" semantics.
 */
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isFilterPresetStatus(v: unknown): v is FilterPresetStatus {
  return typeof v === 'string' && STATUS_SET.has(v as FilterPresetStatus);
}

/**
 * Defensive parser for a single stored entry. Returns null if any field
 * is missing / wrong type / out-of-vocabulary so a single corrupt entry
 * doesn't poison the whole list (the caller drops nulls silently). Filters
 * non-string entries out of `categories` and non-status entries out of
 * `statusFilter`; clamps `minSeverity` rejection to the [1, 5] integer range.
 */
function parsePreset(raw: unknown): FilterPreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) return null;
  if (typeof obj.name !== 'string' || obj.name.length === 0) return null;
  if (typeof obj.createdAt !== 'string') return null;
  if (
    typeof obj.minSeverity !== 'number' ||
    !Number.isInteger(obj.minSeverity) ||
    obj.minSeverity < 1 ||
    obj.minSeverity > 5
  ) {
    return null;
  }
  if (!Array.isArray(obj.categories)) return null;
  if (!Array.isArray(obj.statusFilter)) return null;

  const categories = obj.categories.filter((c): c is string => typeof c === 'string');
  const statusFilter = obj.statusFilter.filter(isFilterPresetStatus);

  return {
    id: obj.id,
    name: obj.name,
    categories,
    minSeverity: obj.minSeverity,
    statusFilter,
    createdAt: obj.createdAt,
  };
}

/**
 * Parse + validate the stored array blob. Returns an empty array on any
 * total-failure case (corrupt JSON, wrong top-level shape). Partial
 * corruption (one bad entry inside a good array) drops the bad entry
 * silently — better to lose one preset than lock the user out of the
 * other 19.
 *
 * Also enforces FILTER_PRESETS_MAX on read so a hand-edited / over-cap
 * storage payload can't leak into the UI larger than the cap. When the
 * stored payload is over cap, the OLDEST entries (front of the list, since
 * addPreset always appends) are dropped — matches addPreset's cap behavior
 * so the add and load paths are symmetric. Quinn flagged the previous
 * asymmetry (load kept oldest, add dropped oldest) as a consistency bug.
 */
function parsePresetsBlob(raw: string): FilterPreset[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: FilterPreset[] = [];
  for (const entry of parsed) {
    const parsedEntry = parsePreset(entry);
    if (parsedEntry) {
      out.push(parsedEntry);
    }
  }
  if (out.length > FILTER_PRESETS_MAX) {
    // Drop from the front — oldest first, mirroring addPreset.
    return out.slice(out.length - FILTER_PRESETS_MAX);
  }
  return out;
}

// ---------------------------------------------------------------------------
// PURE helpers — no IO; safe to test without an AsyncStorage mock.
// ---------------------------------------------------------------------------

/**
 * Return a NEW list with the given preset appended. Does NOT mutate the
 * input. If the list is already at the cap, the oldest entry (index 0,
 * since we always append) is dropped so the new entry can land — picking
 * "trim oldest" rather than "reject" matches the spec and means the user
 * never sees an error on save; the cost is the oldest preset rolls off
 * silently. Generates a fresh id + createdAt on the new entry.
 */
export function addPreset(
  list: FilterPreset[],
  preset: Omit<FilterPreset, 'id' | 'createdAt'>,
): FilterPreset[] {
  const created: FilterPreset = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    name: preset.name,
    categories: [...preset.categories],
    minSeverity: preset.minSeverity,
    statusFilter: [...preset.statusFilter],
  };
  const next = [...list, created];
  if (next.length > FILTER_PRESETS_MAX) {
    // Drop from the front — oldest first.
    return next.slice(next.length - FILTER_PRESETS_MAX);
  }
  return next;
}

/**
 * Return a NEW list with the matching preset's name replaced. If no entry
 * matches the id, the list is returned unchanged (caller's responsibility
 * to know whether that's an error to surface). Does NOT mutate the input.
 * The name is stored as-given — the UI is responsible for trim / length
 * validation upstream of this call.
 */
export function renamePreset(list: FilterPreset[], id: string, newName: string): FilterPreset[] {
  let changed = false;
  const next = list.map((p) => {
    if (p.id === id) {
      changed = true;
      return { ...p, name: newName };
    }
    return p;
  });
  // Returning the same reference when nothing changed lets callers do a
  // cheap `if (next === list) skip-save` if they want; we don't rely on
  // it inside this module, but it's a nice invariant for the consumer.
  return changed ? next : list;
}

/**
 * Return a NEW list with the matching preset removed. If no entry matches
 * the id, the list is returned unchanged. Does NOT mutate the input.
 */
export function removePreset(list: FilterPreset[], id: string): FilterPreset[] {
  const next = list.filter((p) => p.id !== id);
  return next.length === list.length ? list : next;
}

/**
 * One-line human description of a preset's filter triple. Used by the
 * manager modal's row subtitle and by any future toast / banner that
 * needs to confirm what a preset contains. Kept pure so the JSX layer
 * doesn't repeat the pluralization rules — the modal previously had
 * this inline as `summarize()` and now both callers share it.
 *
 * Format: "<N> categor{y|ies} · severity ≥<M>" — or "All categories ·
 * severity ≥<M>" when no category filter is set (empty array). Status
 * count intentionally omitted so the string fits a single line in
 * narrow row widths; callers that need the full triple can read the
 * fields directly.
 */
export function presetSummary(preset: FilterPreset): string {
  const catPart =
    preset.categories.length === 0
      ? 'All categories'
      : `${preset.categories.length} categor${preset.categories.length === 1 ? 'y' : 'ies'}`;
  return `${catPart} · severity ≥${preset.minSeverity}`;
}

// ---------------------------------------------------------------------------
// IO helpers — per-user, fail-soft on every read/write.
// ---------------------------------------------------------------------------

/**
 * Read every saved preset for the given user. Always resolves with an
 * array — never throws, never returns null — so the UI can render the
 * manager list without an extra try/catch dance. Hard-caps at
 * FILTER_PRESETS_MAX (see parsePresetsBlob) so a forced over-cap write
 * to AsyncStorage doesn't leak into a misbehaving list.
 */
export async function loadPresets(userId: string): Promise<FilterPreset[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (raw === null) return [];
    return parsePresetsBlob(raw);
  } catch (e) {
    console.warn('[filterPresets] loadPresets failed:', errorMessage(e, 'AsyncStorage error.'));
    return [];
  }
}

/**
 * Persist the given list for the user. Re-throws on storage failure so
 * the UI can surface a real error rather than silently losing the write
 * — the caller has already updated local state and should know if the
 * disk write failed. (Compare with the older filterPanelPrefs.ts, which
 * swallowed; that's appropriate for trivial UI ergonomics state, not
 * for user-authored data.)
 */
export async function savePresets(userId: string, list: FilterPreset[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(list));
}

/**
 * Wipe all presets for the user. Used by a hypothetical "reset" button
 * (not wired this cycle); included now because the IO surface is easier
 * to test as a complete set.
 */
export async function clearPresets(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch (e) {
    console.warn('[filterPresets] clearPresets failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}
