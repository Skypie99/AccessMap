import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_ORDER, DEFAULT_STATUSES, SEVERITY_ORDER, STATUS_ORDER } from './flags';
import { errorMessage } from './errors';
import type { FlagCategory, FlagSeverity, FlagStatus } from '@/types/database';

/**
 * Map filter persistence — on-device only.
 *
 * Persists the three filter knobs on `MapScreen` (categories, minimum
 * severity, statuses) across app launches so a user who narrows the map
 * to e.g. "broken sidewalks, severity 3+" gets that same view on relaunch
 * instead of re-picking every chip.
 *
 * Why this lives here (not in `preferences.ts`):
 *  - Different shape (three values vs. one enum-ish string).
 *  - Not user-keyed. The map filters are UX shape; they're fine to share
 *    across users on the same device. If multi-account use ever matters
 *    we can bump the key version and re-think.
 *  - Validation is non-trivial — we have to defend against partial /
 *    out-of-vocabulary stored values without crashing.
 *
 * Single key, namespaced + versioned so a future schema change can bump
 * _v1 → _v2 and harmlessly re-default.
 */

const STORAGE_KEY = '@accessmap/map_filters_v1';

export interface MapFilters {
  categories: FlagCategory[];
  minSeverity: FlagSeverity;
  statuses: FlagStatus[];
  /**
   * Maximum distance (in km) from the user's current location at which a
   * flag stays visible on the Map. `null` means "no distance filter".
   *
   * Optional in the persisted blob — pre-v1.1 saves don't have it and we
   * parse a missing/invalid value as null (off). Saved sets/presets do not
   * carry this axis yet; it persists as a last-toggled value via mapFilters
   * just like categories/severity/status.
   */
  maxDistanceKm: number | null;
}

/**
 * Allowed values for the distance chip. `null` means "off". Other values
 * are the radii surfaced to the user. We constrain to a small enum rather
 * than a slider because:
 *  - The five-step set covers the urban-walking → driving-radius range
 *    AccessMap cares about (within a block → across a city) without UI
 *    overload.
 *  - Discrete values are screen-reader-friendly (each chip has a clean
 *    label) and trivial to validate on load.
 *
 * If you add a value, add a matching chip label in MapScreen's distance
 * row — there's no programmatic mapping so the label and value stay in
 * lockstep visually.
 */
export const DISTANCE_OPTIONS: ReadonlyArray<number | null> = [null, 0.5, 1, 5, 25];

// Canonical default shape — what MapScreen would show with nothing stored.
// Kept here rather than in MapScreen so we have one source of truth for
// "what does an unfiltered Map look like" both at first launch and after a
// future "reset filters" entry point.
export const DEFAULT_MAP_FILTERS: MapFilters = {
  categories: [],
  minSeverity: 1,
  statuses: [...DEFAULT_STATUSES],
  maxDistanceKm: null,
};

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
 * Parse + validate a previously-stored MapFilters blob. Returns null for
 * any failure — corrupt JSON, missing fields, unknown enum values, wrong
 * types. The caller treats null as "use defaults" so a busted entry
 * silently degrades rather than crashing the Map.
 *
 * Out-of-vocabulary entries inside an otherwise-good array (e.g. an old
 * category name we've since renamed) are filtered out rather than failing
 * the whole load, so removing a category from the enum doesn't lock users
 * out of their saved view.
 */
// New maxDistanceKm field is BACKWARD-COMPATIBLE: missing or invalid values
// resolve to null ("off"), so older saved blobs continue to load without
// resetting the rest of the filter triple. Only values that match the
// DISTANCE_OPTIONS enum survive — anything else (negative, NaN, unknown
// number, string) drops to null silently.
function parseMaxDistanceKm(v: unknown): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  for (const opt of DISTANCE_OPTIONS) {
    if (opt !== null && opt === v) return opt;
  }
  return null;
}

function parseMapFilters(raw: string): MapFilters | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.categories)) return null;
  if (!Array.isArray(obj.statuses)) return null;
  if (!isFlagSeverity(obj.minSeverity)) return null;

  const categories = obj.categories.filter(isFlagCategory);
  const statuses = obj.statuses.filter(isFlagStatus);

  return {
    categories,
    minSeverity: obj.minSeverity,
    statuses,
    maxDistanceKm: parseMaxDistanceKm(obj.maxDistanceKm),
  };
}

/**
 * Read the saved map filters. Returns null if nothing is stored or the
 * blob is unreadable / invalid — callers should fall back to
 * DEFAULT_MAP_FILTERS in that case.
 *
 * Defensive on storage errors: returns null rather than throwing, so a
 * transient AsyncStorage failure can never block the Map from rendering.
 */
export async function loadMapFilters(): Promise<MapFilters | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return parseMapFilters(raw);
  } catch (e) {
    // Best-effort log; ignore the error so the UI proceeds with defaults.
    console.warn('[mapFilters] loadMapFilters failed:', errorMessage(e, 'AsyncStorage error.'));
    return null;
  }
}

/**
 * Persist the current map filters. Fire-and-forget from the UI; we
 * intentionally don't surface storage errors because the worst case is
 * the user's filter pick doesn't survive a relaunch, which is recoverable
 * by re-picking.
 */
export async function saveMapFilters(filters: MapFilters): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (e) {
    console.warn('[mapFilters] saveMapFilters failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}
