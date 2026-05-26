import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_ORDER, SEVERITY_ORDER, STATUS_ORDER } from './flags';
import { errorMessage } from './errors';
import type { FlagCategory, FlagSeverity, FlagStatus } from '@/types/database';

/**
 * Saved named filter sets — on-device only.
 *
 * ⚠️  DEPRECATION NOTE (2026-05-24):
 *   `filterSets` is the OLDER device-wide preset system (max 5 sets,
 *   key: @accessmap/filter_sets_v1, shared across all accounts on the
 *   device). It is superseded by `filterPresets.ts` which is per-user
 *   (max 20, keyed by userId) and fully wired into the Map filter Apply
 *   path as of Cycle B. The two modules co-exist during a transition
 *   window. Once MapScreen is fully migrated to `filterPresets`,
 *   `filterSets` and its corresponding UI chip row in MapScreen will be
 *   removed. Do not add new features here; add them to `filterPresets.ts`.
 *
 * Builds on `mapFilters.ts`: where that module persists the *last-used*
 * filter combination, this module persists a small library of *named*
 * combinations the user can switch between with a single tap. So a user
 * who keeps two views ("downtown commute", "park paths") doesn't have to
 * re-toggle the same five pills every time they switch contexts.
 *
 * Why a separate module:
 *  - Different shape (array of named structs vs. a single state object).
 *  - Different lifecycle (CRUD with cap + uniqueness rules vs. a single
 *    write that always overwrites).
 *  - `mapFilters.ts` is invoked from the Map's save-effect on every
 *    keystroke-equivalent change; this module is only touched when the
 *    user explicitly saves / picks / deletes.
 *
 * Single key, namespaced + versioned so a future schema change can bump
 * _v1 → _v2 and harmlessly drop unreadable old entries.
 */

const STORAGE_KEY = '@accessmap/filter_sets_v1';

// Separate key for the "default set" pointer. Kept apart from the sets
// blob so toggling default doesn't have to rewrite the whole array, and so
// the existing _v1 sets blob keeps the shape its tests already assert.
const DEFAULT_KEY = '@accessmap/default_filter_set_v1';

// Hard upper bound on how many sets the user can save. Picked small on
// purpose — five named contexts is plenty for the city-walker use case,
// and the cap keeps the chip row scannable without horizontal scroll
// pressure. Bump this if profiling shows users hitting the wall.
export const MAX_FILTER_SETS = 5;

export interface FilterSet {
  id: string;
  name: string;
  categories: FlagCategory[];
  minSeverity: FlagSeverity;
  statuses: FlagStatus[];
  createdAt: string;
}

// Typed errors so the UI can render the right user-facing message for
// each rejection without parsing the message string. `code` is a small
// closed set the caller can switch on; everything else falls back to
// errorMessage() like the rest of the app.
export type FilterSetErrorCode = 'cap' | 'duplicate' | 'empty';

export class FilterSetError extends Error {
  code: FilterSetErrorCode;
  constructor(code: FilterSetErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'FilterSetError';
  }
}

// Lookup sets used for validation. Built from the canonical orders so a
// new category / status added to FlagCategory automatically participates
// here without a separate edit.
const CATEGORY_SET = new Set<FlagCategory>(CATEGORY_ORDER);
const STATUS_SET = new Set<FlagStatus>(STATUS_ORDER);
const SEVERITY_SET = new Set<FlagSeverity>(SEVERITY_ORDER);

function isFlagCategory(v: unknown): v is FlagCategory {
  return typeof v === 'string' && CATEGORY_SET.has(v as FlagCategory);
}

function isFlagStatus(v: unknown): v is FlagStatus {
  return typeof v === 'string' && STATUS_SET.has(v as FlagStatus);
}

function isFlagSeverity(v: unknown): v is FlagSeverity {
  return typeof v === 'number' && SEVERITY_SET.has(v as FlagSeverity);
}

/**
 * Validate one stored FilterSet entry. Returns null if any field is
 * missing / wrong type / out-of-vocabulary. The caller drops nulls
 * silently — partial corruption of one entry shouldn't lock the user
 * out of their other saved sets.
 */
function parseSet(raw: unknown): FilterSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) return null;
  if (typeof obj.name !== 'string' || obj.name.length === 0) return null;
  if (typeof obj.createdAt !== 'string') return null;
  if (!Array.isArray(obj.categories)) return null;
  if (!Array.isArray(obj.statuses)) return null;
  if (!isFlagSeverity(obj.minSeverity)) return null;

  const categories = obj.categories.filter(isFlagCategory);
  const statuses = obj.statuses.filter(isFlagStatus);

  return {
    id: obj.id,
    name: obj.name,
    categories,
    minSeverity: obj.minSeverity,
    statuses,
    createdAt: obj.createdAt,
  };
}

/**
 * Parse + validate the stored array blob. Returns an empty array on
 * any total-failure case (corrupt JSON, wrong top-level shape). Partial
 * corruption (one bad entry inside a good array) drops the bad entry.
 */
function parseSetsBlob(raw: string): FilterSet[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: FilterSet[] = [];
  for (const entry of parsed) {
    const parsedEntry = parseSet(entry);
    if (parsedEntry) out.push(parsedEntry);
  }
  return out;
}

/**
 * Read every saved set. Always resolves with an array — never throws,
 * never returns null — so the UI can render the saved row without an
 * extra try/catch dance.
 */
export async function listSets(): Promise<FilterSet[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    return parseSetsBlob(raw);
  } catch (e) {
    console.warn('[filterSets] listSets failed:', errorMessage(e, 'AsyncStorage error.'));
    return [];
  }
}

/**
 * Fresh id with no extra deps. Combines a base-36 timestamp with a few
 * random base-36 chars — sortable enough for "newest at end" semantics
 * and collision-free for the tiny scale (<= 5 entries).
 */
function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

interface SaveSetInput {
  categories: FlagCategory[];
  minSeverity: FlagSeverity;
  statuses: FlagStatus[];
}

/**
 * Save a new named set. Trims the name, rejects:
 *  - empty/whitespace-only names ('empty')
 *  - case-insensitive duplicates of an existing name ('duplicate')
 *  - the 6th save attempt when the cap is hit ('cap')
 *
 * Returns the newly-created FilterSet (caller pushes it into local state).
 */
export async function saveSet(name: string, current: SaveSetInput): Promise<FilterSet> {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new FilterSetError('empty', 'Give this filter a name.');
  }

  const existing = await listSets();

  if (existing.length >= MAX_FILTER_SETS) {
    throw new FilterSetError(
      'cap',
      `You can save up to ${MAX_FILTER_SETS} filter sets. Delete one first.`,
    );
  }

  const nameKey = trimmedName.toLowerCase();
  if (existing.some((s) => s.name.trim().toLowerCase() === nameKey)) {
    throw new FilterSetError('duplicate', `You already have a filter named "${trimmedName}".`);
  }

  const created: FilterSet = {
    id: makeId(),
    name: trimmedName,
    categories: [...current.categories],
    minSeverity: current.minSeverity,
    statuses: [...current.statuses],
    createdAt: new Date().toISOString(),
  };

  const next = [...existing, created];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return created;
}

/**
 * Remove a saved set by id. No-op if the id isn't found (the UI is the
 * only caller and it always passes a known id, so a missing id is a
 * harmless race rather than something to surface).
 *
 * Also clears the default-set pointer if it referenced the deleted set,
 * so a stale pointer can't outlive its target. Done as a best-effort
 * second write — the sets-blob delete is the load-bearing change.
 */
export async function deleteSet(id: string): Promise<void> {
  try {
    const existing = await listSets();
    const next = existing.filter((s) => s.id !== id);
    // Skip the write if nothing changed — avoids a needless AsyncStorage
    // round-trip when the id is already gone.
    if (next.length === existing.length) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const currentDefault = await getDefaultSetId();
    if (currentDefault === id) {
      await setDefaultSetId(null);
    }
  } catch (e) {
    console.warn('[filterSets] deleteSet failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}

/**
 * Read the "default set" pointer. The id is a free-form string — callers
 * still have to look it up in the sets list and ignore-if-missing, since
 * a deleted set's pointer is cleared on a best-effort basis only.
 *
 * Defensive: returns null on any storage failure so a transient error
 * never blocks the Map from rendering.
 */
export async function getDefaultSetId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(DEFAULT_KEY);
    if (raw === null) return null;
    // Stored as a bare JSON string ("abc123"). Treat any non-string
    // payload as "no default" rather than throwing.
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (typeof parsed !== 'string' || parsed.length === 0) return null;
    return parsed;
  } catch (e) {
    console.warn('[filterSets] getDefaultSetId failed:', errorMessage(e, 'AsyncStorage error.'));
    return null;
  }
}

/**
 * Set (or clear with null) the "default set" pointer. Fire-and-forget
 * from the UI; storage failures are logged but not surfaced — the worst
 * case is the user's pick doesn't persist across launches, which is
 * recoverable.
 */
export async function setDefaultSetId(id: string | null): Promise<void> {
  try {
    if (id === null) {
      await AsyncStorage.removeItem(DEFAULT_KEY);
      return;
    }
    await AsyncStorage.setItem(DEFAULT_KEY, JSON.stringify(id));
  } catch (e) {
    console.warn('[filterSets] setDefaultSetId failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}
