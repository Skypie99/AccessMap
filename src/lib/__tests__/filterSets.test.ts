/**
 * Tests for src/lib/filterSets.ts — the AsyncStorage-backed CRUD for
 * named filter sets, with cap + duplicate-name rules.
 *
 * Uses the same in-memory AsyncStorage stub pattern as mapFilters.test.ts
 * and preferences.test.ts so the tests can run before any RN bridge
 * is wired up.
 *
 * What this protects against:
 *  - A regression that lets a 6th set save and silently breaks the
 *    chip-row layout assumption (or mockStorage's small-payload assumption).
 *  - A duplicate-name check that's case-sensitive or doesn't trim,
 *    which would let users save "downtown" and "Downtown" side by side.
 *  - A change to the mockStorage key prefix that would silently wipe every
 *    user's saved sets on next launch.
 *  - The "drop corrupt entries" behavior that keeps a partially-bad
 *    blob from locking the user out of their *good* saved sets.
 *  - saveSet leaving mockStorage in an inconsistent state if listSets
 *    misreads a blob (cap calc has to come from the validated count).
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

import {
  deleteSet,
  FilterSetError,
  listSets,
  MAX_FILTER_SETS,
  saveSet,
  type FilterSet,
} from '../filterSets';

const KEY = '@accessmap/filter_sets_v1';

// Reusable "current filter snapshot" — the UI passes this in on save.
const SAMPLE = {
  categories: ['broken_sidewalk'] as FilterSet['categories'],
  minSeverity: 3 as FilterSet['minSeverity'],
  statuses: ['open'] as FilterSet['statuses'],
};

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowOnGet = false;
  mockThrowOnSet = false;
  // Silence the helpful "listSets/deleteSet failed" warnings while we
  // intentionally exercise the error paths.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore?.();
});

describe('MAX_FILTER_SETS', () => {
  it('is 5 (must match the user-facing copy in MapScreen)', () => {
    expect(MAX_FILTER_SETS).toBe(5);
  });
});

describe('listSets', () => {
  it('returns an empty array when nothing is stored', async () => {
    expect(await listSets()).toEqual([]);
  });

  it('round-trips a saved set', async () => {
    const created = await saveSet('Downtown', SAMPLE);
    const all = await listSets();
    expect(all).toEqual([created]);
    expect(created.name).toBe('Downtown');
    expect(created.categories).toEqual(['broken_sidewalk']);
    expect(created.minSeverity).toBe(3);
    expect(created.statuses).toEqual(['open']);
    expect(created.id).toMatch(/.+/);
    expect(created.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('returns an empty array on garbage JSON', async () => {
    mockStorage[KEY] = 'not json {{';
    expect(await listSets()).toEqual([]);
  });

  it('returns an empty array on a non-array top-level shape', async () => {
    mockStorage[KEY] = JSON.stringify({ not: 'an array' });
    expect(await listSets()).toEqual([]);
  });

  it('drops invalid entries but keeps the good ones', async () => {
    // Mixed array: one valid set + several invalid shapes.
    mockStorage[KEY] = JSON.stringify([
      {
        id: 'good',
        name: 'Park paths',
        categories: ['no_ramp', 'old_legacy_category'],
        minSeverity: 2,
        statuses: ['open', 'unknown_status'],
        createdAt: '2026-05-23T00:00:00.000Z',
      },
      null,
      {
        // missing id
        name: 'No id',
        categories: [],
        minSeverity: 1,
        statuses: ['open'],
        createdAt: '2026-05-23T00:00:00.000Z',
      },
      {
        id: 'bad-severity',
        name: 'Bad severity',
        categories: [],
        minSeverity: 9,
        statuses: ['open'],
        createdAt: '2026-05-23T00:00:00.000Z',
      },
    ]);
    const all = await listSets();
    expect(all).toHaveLength(1);
    expect(all[0]?.name).toBe('Park paths');
    // Out-of-vocabulary entries inside good arrays are filtered out
    // rather than failing the entire entry.
    expect(all[0]?.categories).toEqual(['no_ramp']);
    expect(all[0]?.statuses).toEqual(['open']);
  });

  it('returns an empty array when AsyncStorage rejects', async () => {
    mockThrowOnGet = true;
    expect(await listSets()).toEqual([]);
  });
});

describe('saveSet', () => {
  it('rejects an empty / whitespace-only name', async () => {
    await expect(saveSet('   ', SAMPLE)).rejects.toBeInstanceOf(FilterSetError);
    await expect(saveSet('', SAMPLE)).rejects.toMatchObject({ code: 'empty' });
  });

  it('trims surrounding whitespace from the saved name', async () => {
    const created = await saveSet('  Park paths  ', SAMPLE);
    expect(created.name).toBe('Park paths');
  });

  it('rejects a case-insensitive duplicate name', async () => {
    await saveSet('Downtown', SAMPLE);
    await expect(saveSet('downtown', SAMPLE)).rejects.toMatchObject({
      code: 'duplicate',
    });
    await expect(saveSet('  DOWNTOWN  ', SAMPLE)).rejects.toMatchObject({
      code: 'duplicate',
    });
  });

  it('rejects the 6th save with a cap error', async () => {
    for (let i = 0; i < MAX_FILTER_SETS; i++) {
      await saveSet(`Set ${i}`, SAMPLE);
    }
    await expect(saveSet('Overflow', SAMPLE)).rejects.toMatchObject({
      code: 'cap',
    });
    // Storage still only holds the cap-count entries — the rejected
    // attempt didn't bleed through.
    const all = await listSets();
    expect(all).toHaveLength(MAX_FILTER_SETS);
  });

  it('generates a unique id per save', async () => {
    const a = await saveSet('A', SAMPLE);
    const b = await saveSet('B', SAMPLE);
    expect(a.id).not.toEqual(b.id);
  });

  it('preserves insertion order across many saves', async () => {
    await saveSet('First', SAMPLE);
    await saveSet('Second', SAMPLE);
    await saveSet('Third', SAMPLE);
    const all = await listSets();
    expect(all.map((s) => s.name)).toEqual(['First', 'Second', 'Third']);
  });
});

describe('deleteSet', () => {
  it('removes the set with the matching id', async () => {
    const a = await saveSet('A', SAMPLE);
    const b = await saveSet('B', SAMPLE);
    await deleteSet(a.id);
    const all = await listSets();
    expect(all).toEqual([b]);
  });

  it('is a no-op for an unknown id (no throw, no write)', async () => {
    await saveSet('A', SAMPLE);
    const before = mockStorage[KEY];
    await deleteSet('does-not-exist');
    expect(mockStorage[KEY]).toBe(before);
  });

  it('swallows mockStorage errors (UI never throws)', async () => {
    await saveSet('A', SAMPLE);
    mockThrowOnSet = true;
    await expect(deleteSet('A')).resolves.toBeUndefined();
  });
});
