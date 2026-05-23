/**
 * Tests for src/lib/mapFilters.ts — the AsyncStorage-backed persistence
 * of the Map filter knobs (categories, minSeverity, statuses).
 *
 * What this protects against:
 *  - A regression in `parseMapFilters` that lets through an out-of-vocab
 *    category or status, which would silently filter all flags out on
 *    relaunch and look like a load bug.
 *  - A change to the storage key prefix that would silently reset every
 *    user's saved filter to defaults on next launch.
 *  - The "defaults on corrupt blob / storage error" path that keeps the
 *    Map usable when AsyncStorage hiccups or someone hand-edits the value.
 */

const storage: Record<string, string> = {};
let throwOnGet = false;
let throwOnSet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (throwOnGet) {
        throwOnGet = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in storage ? storage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (throwOnSet) {
        throwOnSet = false;
        return Promise.reject(new Error('boom'));
      }
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
      return Promise.resolve();
    }),
  },
}));

import {
  DEFAULT_MAP_FILTERS,
  loadMapFilters,
  saveMapFilters,
  type MapFilters,
} from '../mapFilters';

const KEY = '@accessmap/map_filters_v1';

beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k];
  throwOnGet = false;
  throwOnSet = false;
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
    };
    await saveMapFilters(filters);
    expect(await loadMapFilters()).toEqual(filters);
  });

  it('returns null on garbage JSON (corrupt blob)', async () => {
    storage[KEY] = 'not json {{';
    expect(await loadMapFilters()).toBeNull();
  });

  it('returns null on a JSON value that is not an object', async () => {
    storage[KEY] = '[]';
    expect(await loadMapFilters()).toBeNull();
  });

  it('returns null when a required field is missing or wrong type', async () => {
    storage[KEY] = JSON.stringify({
      categories: 'broken_sidewalk', // wrong type — should be array
      minSeverity: 2,
      statuses: ['open'],
    });
    expect(await loadMapFilters()).toBeNull();
  });

  it('returns null when minSeverity is out of range', async () => {
    storage[KEY] = JSON.stringify({
      categories: [],
      minSeverity: 9, // not a FlagSeverity
      statuses: ['open'],
    });
    expect(await loadMapFilters()).toBeNull();
  });

  it('filters unknown enum values out of arrays rather than failing the load', async () => {
    // An old category we've since renamed shouldn't lock the user out of
    // their saved view — drop it from the array, keep the rest.
    storage[KEY] = JSON.stringify({
      categories: ['broken_sidewalk', 'old_legacy_category'],
      minSeverity: 2,
      statuses: ['open', 'unknown_status'],
    });
    const loaded = await loadMapFilters();
    expect(loaded).toEqual({
      categories: ['broken_sidewalk'],
      minSeverity: 2,
      statuses: ['open'],
    });
  });

  it('returns null when AsyncStorage.getItem rejects', async () => {
    throwOnGet = true;
    expect(await loadMapFilters()).toBeNull();
  });
});

describe('saveMapFilters', () => {
  it('writes the canonical key', async () => {
    await saveMapFilters({
      categories: ['no_ramp'],
      minSeverity: 4,
      statuses: ['open', 'verified'],
    });
    expect(storage[KEY]).toBeDefined();
    expect(JSON.parse(storage[KEY])).toEqual({
      categories: ['no_ramp'],
      minSeverity: 4,
      statuses: ['open', 'verified'],
    });
  });

  it('swallows storage errors (UI never throws)', async () => {
    throwOnSet = true;
    await expect(
      saveMapFilters({
        categories: [],
        minSeverity: 1,
        statuses: ['open', 'verified'],
      }),
    ).resolves.toBeUndefined();
  });
});
