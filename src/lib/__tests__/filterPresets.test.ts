/**
 * Tests for src/lib/filterPresets.ts — per-user filter-preset CRUD + IO.
 *
 * What this protects against:
 *  - Pure CRUD helpers silently mutating their input list (the consumer
 *    relies on immutable updates so React re-renders correctly).
 *  - The cap rolling the wrong direction (must drop OLDEST, not newest).
 *  - rename/remove on a missing id corrupting the list.
 *  - IO load reading malformed JSON / non-array blob / over-cap list and
 *    leaking it into the UI as if it were valid.
 *  - The per-user key being wrong (a bug here would silently share presets
 *    across accounts on the same device).
 */

import {
  addPreset,
  clearPresets,
  FILTER_PRESETS_KEY_PREFIX,
  FILTER_PRESETS_MAX,
  loadPresets,
  presetSummary,
  removePreset,
  renamePreset,
  savePresets,
  type FilterPreset,
} from '../filterPresets';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) =>
      Promise.resolve(mockStore.has(key) ? mockStore.get(key)! : null),
    ),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
    __reset: () => mockStore.clear(),
    __setRaw: (k: string, v: string) => mockStore.set(k, v),
  },
}));

const mockStorage = jest.requireMock('@react-native-async-storage/async-storage').default;

const USER = 'user-1';
const OTHER_USER = 'user-2';
const KEY = FILTER_PRESETS_KEY_PREFIX + USER;

function makePreset(overrides: Partial<FilterPreset> = {}): FilterPreset {
  return {
    id: 'fixed-id',
    name: 'Default',
    categories: ['no_ramp'],
    minSeverity: 3,
    statusFilter: ['open', 'verified'],
    createdAt: '2026-05-24T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockStorage.__reset();
  jest.clearAllMocks();
  // The IO module logs to console.warn on storage failure paths. Silence
  // those during tests that intentionally exercise the failure path; we
  // restore in afterEach so unrelated test output stays loud.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore?.();
});

describe('addPreset', () => {
  it('adds to an empty list', () => {
    const next = addPreset([], {
      name: 'Downtown',
      categories: ['no_ramp', 'broken_sidewalk'],
      minSeverity: 2,
      statusFilter: ['open'],
    });
    expect(next).toHaveLength(1);
    expect(next[0]!.name).toBe('Downtown');
    expect(next[0]!.categories).toEqual(['no_ramp', 'broken_sidewalk']);
    expect(next[0]!.minSeverity).toBe(2);
    expect(next[0]!.statusFilter).toEqual(['open']);
    expect(next[0]!.id.length).toBeGreaterThan(0);
    expect(typeof next[0]!.createdAt).toBe('string');
  });

  it('does not mutate the input list', () => {
    const input: FilterPreset[] = [makePreset()];
    const snapshot = [...input];
    addPreset(input, {
      name: 'X',
      categories: [],
      minSeverity: 1,
      statusFilter: [],
    });
    expect(input).toEqual(snapshot);
    expect(input).toHaveLength(1);
  });

  it('caps at FILTER_PRESETS_MAX, trimming the OLDEST entry', () => {
    // Fill to the cap.
    const seeded: FilterPreset[] = Array.from({ length: FILTER_PRESETS_MAX }, (_, i) =>
      makePreset({
        id: `id-${i}`,
        name: `Preset ${i}`,
      }),
    );
    const next = addPreset(seeded, {
      name: 'NEW',
      categories: [],
      minSeverity: 1,
      statusFilter: [],
    });
    expect(next).toHaveLength(FILTER_PRESETS_MAX);
    // Oldest (id-0) must be gone.
    expect(next.some((p) => p.id === 'id-0')).toBe(false);
    // Newest entry is the last one.
    expect(next[next.length - 1]!.name).toBe('NEW');
    // The second-oldest survives at index 0 now.
    expect(next[0]!.id).toBe('id-1');
  });
});

describe('renamePreset', () => {
  it('updates the name of the matching id', () => {
    const list: FilterPreset[] = [
      makePreset({ id: 'a', name: 'Old' }),
      makePreset({ id: 'b', name: 'Other' }),
    ];
    const next = renamePreset(list, 'a', 'New Name');
    expect(next[0]!.name).toBe('New Name');
    expect(next[1]!.name).toBe('Other');
  });

  it('returns the list unchanged when id is unknown', () => {
    const list: FilterPreset[] = [makePreset({ id: 'a', name: 'Old' })];
    const next = renamePreset(list, 'nonexistent', 'Whatever');
    expect(next).toBe(list);
    expect(next[0]!.name).toBe('Old');
  });

  it('does not mutate the input list', () => {
    const list: FilterPreset[] = [makePreset({ id: 'a', name: 'Old' })];
    const snapshot = list.map((p) => ({ ...p }));
    renamePreset(list, 'a', 'New');
    expect(list[0]!.name).toBe('Old');
    expect(list).toEqual(snapshot);
  });
});

describe('removePreset', () => {
  it('filters out the matching id', () => {
    const list: FilterPreset[] = [
      makePreset({ id: 'a' }),
      makePreset({ id: 'b' }),
      makePreset({ id: 'c' }),
    ];
    const next = removePreset(list, 'b');
    expect(next.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('returns the list unchanged when id is unknown', () => {
    const list: FilterPreset[] = [makePreset({ id: 'a' })];
    const next = removePreset(list, 'missing');
    expect(next).toBe(list);
  });

  it('does not mutate the input list', () => {
    const list: FilterPreset[] = [makePreset({ id: 'a' }), makePreset({ id: 'b' })];
    const snapshot = [...list];
    removePreset(list, 'a');
    expect(list).toEqual(snapshot);
    expect(list).toHaveLength(2);
  });
});

describe('loadPresets / savePresets IO', () => {
  it('returns [] when no key has ever been written for the user', async () => {
    expect(await loadPresets(USER)).toEqual([]);
  });

  it('round-trips a saved list', async () => {
    const list: FilterPreset[] = [
      makePreset({ id: 'a', name: 'Commute' }),
      makePreset({ id: 'b', name: 'Park run' }),
    ];
    await savePresets(USER, list);
    const loaded = await loadPresets(USER);
    expect(loaded).toHaveLength(2);
    expect(loaded[0]!.name).toBe('Commute');
    expect(loaded[1]!.name).toBe('Park run');
  });

  it('uses a per-user storage key (other users do not see this list)', async () => {
    await savePresets(USER, [makePreset({ name: 'Private' })]);
    expect(await loadPresets(OTHER_USER)).toEqual([]);
  });

  it('returns [] on invalid JSON', async () => {
    mockStorage.__setRaw(KEY, '{not json');
    expect(await loadPresets(USER)).toEqual([]);
  });

  it('returns [] when the stored value is not an array', async () => {
    mockStorage.__setRaw(KEY, '{"id":"a"}');
    expect(await loadPresets(USER)).toEqual([]);
  });

  it('trims an over-cap stored array down to FILTER_PRESETS_MAX on load by dropping OLDEST', async () => {
    const over: FilterPreset[] = Array.from({ length: FILTER_PRESETS_MAX + 5 }, (_, i) =>
      makePreset({ id: `id-${i}`, name: `P${i}` }),
    );
    mockStorage.__setRaw(KEY, JSON.stringify(over));
    const loaded = await loadPresets(USER);
    expect(loaded).toHaveLength(FILTER_PRESETS_MAX);
    // The trim drops from the FRONT (oldest), keeping the most-recent
    // entries — symmetric with addPreset, which also drops oldest at cap.
    // Quinn flagged the previous asymmetry as a consistency bug; both
    // paths now agree that "newest wins" at the cap boundary.
    expect(loaded[0]!.id).toBe('id-5');
    expect(loaded[loaded.length - 1]!.id).toBe(`id-${FILTER_PRESETS_MAX + 4}`);
    expect(loaded.some((p) => p.id === 'id-0')).toBe(false);
  });

  it('drops malformed entries silently', async () => {
    mockStorage.__setRaw(
      KEY,
      JSON.stringify([
        makePreset({ id: 'good' }),
        { id: 'b', name: '' }, // empty name → dropped
        { id: 'c' }, // missing fields → dropped
        {
          id: 'd',
          name: 'Bad severity',
          categories: [],
          minSeverity: 99,
          statusFilter: [],
          createdAt: 'x',
        },
        'not even an object', // → dropped
      ]),
    );
    const loaded = await loadPresets(USER);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.id).toBe('good');
  });

  it('filters non-string categories and bad status values out of an otherwise-valid entry', async () => {
    mockStorage.__setRaw(
      KEY,
      JSON.stringify([
        {
          id: 'mixed',
          name: 'Mixed',
          categories: ['no_ramp', 42, null, 'broken_sidewalk'],
          minSeverity: 3,
          statusFilter: ['open', 'bogus', 'verified'],
          createdAt: 'x',
        },
      ]),
    );
    const loaded = await loadPresets(USER);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.categories).toEqual(['no_ramp', 'broken_sidewalk']);
    expect(loaded[0]!.statusFilter).toEqual(['open', 'verified']);
  });
});

describe('clearPresets', () => {
  it('wipes the user list so a subsequent load returns []', async () => {
    await savePresets(USER, [makePreset()]);
    expect((await loadPresets(USER)).length).toBe(1);
    await clearPresets(USER);
    expect(await loadPresets(USER)).toEqual([]);
  });
});

describe('presetSummary', () => {
  it('returns "All categories" when no categories are selected', () => {
    const preset = makePreset({ categories: [], minSeverity: 1 });
    expect(presetSummary(preset)).toBe('All categories · severity ≥1');
  });

  it('uses singular "category" for exactly one selected category', () => {
    const preset = makePreset({ categories: ['no_ramp'], minSeverity: 3 });
    expect(presetSummary(preset)).toBe('1 category · severity ≥3');
  });

  it('uses plural "categories" for two or more', () => {
    const preset = makePreset({
      categories: ['no_ramp', 'broken_sidewalk', 'blocked_path'],
      minSeverity: 4,
    });
    expect(presetSummary(preset)).toBe('3 categories · severity ≥4');
  });

  it('does not depend on statusFilter (status count is intentionally omitted from the line)', () => {
    const withStatuses = makePreset({
      categories: [],
      minSeverity: 2,
      statusFilter: ['open', 'verified', 'resolved'],
    });
    const withoutStatuses = makePreset({
      categories: [],
      minSeverity: 2,
      statusFilter: [],
    });
    expect(presetSummary(withStatuses)).toBe(presetSummary(withoutStatuses));
  });
});
