/**
 * Tests for src/lib/mapFilters.ts — the AsyncStorage-backed persistence
 * of the Map filter knobs (categories, minSeverity, statuses).
 *
 * What this protects against:
 *  - A regression in `parseMapFilters` that lets through an out-of-vocab
 *    category or status, which would silently filter all flags out on
 *    relaunch and look like a load bug.
 *  - A change to the mockStorage key prefix that would silently reset every
 *    user's saved filter to defaults on next launch.
 *  - The "defaults on corrupt blob / mockStorage error" path that keeps the
 *    Map usable when AsyncStorage hiccups or someone hand-edits the value.
 */

const mockStorage: Record<string, string> = {};
let mockThrowOnGet = false;
let mockThrowOnSet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (mockThrowOnGet) {
        mockThrowOnGet = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in mockStorage ? mockStorage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (mockThrowOnSet) {
        mockThrowOnSet = false;
        return Promise.reject(new Error('boom'));
      }
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

// mapFilters.ts → flags.ts → supabase.ts.  The Supabase createClient() fires
// an async _initialize() that leaves an open network handle in the Jest worker.
// We only need the constants re-exported from flags.ts here, so mock the whole
// supabase module to prevent the client from ever being constructed.
jest.mock('../supabase', () => ({ supabase: {} }));

import {
  DEFAULT_MAP_FILTERS,
  loadMapFilters,
  saveMapFilters,
  type MapFilters,
} from '../mapFilters';

const KEY = '@accessmap/map_filters_v1';

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowOnGet = false;
  mockThrowOnSet = false;
  // Silence the helpful "loadMapFilters failed" / "saveMapFilters failed"
  // logs while we're intentionally exercising the error paths.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore?.();
});

describe('DEFAULT_MAP_FILTERS', () => {
  it('matches the unfiltered-Map shape: no categories, severity 1, open+verified', () => {
    expect(DEFAULT_MAP_FILTERS.categories).toEqual([]);
    expect(DEFAULT_MAP_FILTERS.minSeverity).toBe(1);
    // Order doesn't matter for the fetch — just that the set is right.
    expect([...DEFAULT_MAP_FILTERS.statuses].sort()).toEqual(
      ['open', 'verified'].sort(),
    );
  });
});

describe('loadMapFilters', () => {
  it('returns null when nothing is stored', async () => {
    expect(await loadMapFilters()).toBeNull();
  });

  it('round-trips a valid save', async () => {
    const filters: MapFilters = {
      categories: ['broken_sidewalk', 'no_ramp'],
      minSeverity: 3,
      statuses: ['open'],
      maxDistanceKm: null,
    };
    await saveMapFilters(filters);
    expect(await loadMapFilters()).toEqual(filters);
  });

  it('round-trips a save with a distance filter set', async () => {
    const filters: MapFilters = {
      categories: [],
      minSeverity: 1,
      statuses: ['open', 'verified'],
      maxDistanceKm: 5,
    };
    await saveMapFilters(filters);
    expect(await loadMapFilters()).toEqual(filters);
  });

  it('treats a missing maxDistanceKm in older blobs as null (back-compat)', async () => {
    // Pre-v1.1 saves don't have the field. Loader should fill it with
    // null rather than failing the whole parse — otherwise a user who
    // upgrades would silently lose their saved category/severity view.
    mockStorage[KEY] = JSON.stringify({
      categories: ['broken_sidewalk'],
      minSeverity: 2,
      statuses: ['open'],
    });
    expect(await loadMapFilters()).toEqual({
      categories: ['broken_sidewalk'],
      minSeverity: 2,
      statuses: ['open'],
      maxDistanceKm: null,
    });
  });

  it('drops an out-of-vocab maxDistanceKm to null rather than failing', async () => {
    // 999 is not in DISTANCE_OPTIONS; rather than crashing the load,
    // fall back to "off" so the rest of the filter still applies.
    mockStorage[KEY] = JSON.stringify({
      categories: [],
      minSeverity: 1,
      statuses: ['open'],
      maxDistanceKm: 999,
    });
    expect(await loadMapFilters()).toEqual({
      categories: [],
      minSeverity: 1,
      statuses: ['open'],
      maxDistanceKm: null,
    });
  });

  it('returns null on garbage JSON (corrupt blob)', async () => {
    mockStorage[KEY] = 'not json {{';
    expect(await loadMapFilters()).toBeNull();
  });

  it('returns null on a JSON value that is not an object', async () => {
    mockStorage[KEY] = '[]';
    expect(await loadMapFilters()).toBeNull();
  });

  it('returns null when a required field is missing or wrong type', async () => {
    mockStorage[KEY] = JSON.stringify({
      categories: 'broken_sidewalk', // wrong type — should be array
      minSeverity: 2,
      statuses: ['open'],
    });
    expect(await loadMapFilters()).toBeNull();
  });

  it('returns null when minSeverity is out of range', async () => {
    mockStorage[KEY] = JSON.stringify({
      categories: [],
      minSeverity: 9, // not a FlagSeverity
      statuses: ['open'],
    });
    expect(await loadMapFilters()).toBeNull();
  });

  it('filters unknown enum values out of arrays rather than failing the load', async () => {
    // An old category we've since renamed shouldn't lock the user out of
    // their saved view — drop it from the array, keep the rest.
    mockStorage[KEY] = JSON.stringify({
      categories: ['broken_sidewalk', 'old_legacy_category'],
      minSeverity: 2,
      statuses: ['open', 'unknown_status'],
    });
    const loaded = await loadMapFilters();
    expect(loaded).toEqual({
      categories: ['broken_sidewalk'],
      minSeverity: 2,
      statuses: ['open'],
      maxDistanceKm: null,
    });
  });

  it('returns null when AsyncStorage.getItem rejects', async () => {
    mockThrowOnGet = true;
    expect(await loadMapFilters()).toBeNull();
  });
});

describe('saveMapFilters', () => {
  it('writes the canonical key', async () => {
    await saveMapFilters({
      categories: ['no_ramp'],
      minSeverity: 4,
      statuses: ['open', 'verified'],
      maxDistanceKm: null,
    });
    expect(mockStorage[KEY]).toBeDefined();
    // Asserted defined on the line above; the `!` satisfies
    // tsconfig's noUncheckedIndexedAccess.
    expect(JSON.parse(mockStorage[KEY]!)).toEqual({
      categories: ['no_ramp'],
      minSeverity: 4,
      statuses: ['open', 'verified'],
      maxDistanceKm: null,
    });
  });

  it('swallows mockStorage errors (UI never throws)', async () => {
    mockThrowOnSet = true;
    await expect(
      saveMapFilters({
        categories: [],
        minSeverity: 1,
        statuses: ['open', 'verified'],
        maxDistanceKm: null,
      }),
    ).resolves.toBeUndefined();
  });
});
