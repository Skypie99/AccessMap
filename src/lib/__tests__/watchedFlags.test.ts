/**
 * Tests for src/lib/watchedFlags.ts.
 *
 * What this covers:
 *  - loadWatched returns [] when nothing is stored, and the stored list when
 *    something is there.
 *  - addWatched inserts a new ID and is idempotent when the ID is already
 *    present.
 *  - removeWatched removes an ID and is a no-op when the ID is absent.
 *  - The MAX_WATCHED cap: adding to a full list drops the oldest entry (FIFO).
 *  - parseWatched robustness: bad JSON, non-array values, array with mixed
 *    types — all degrade gracefully to [].
 *  - Per-user isolation: two users share a device without seeing each other's
 *    lists.
 *
 * We mock AsyncStorage at the module level (jest.mock) so the tests never
 * hit the device. The mock is a simple in-memory Map keyed by storage key,
 * which matches the actual AsyncStorage semantics closely enough.
 */

import { addWatched, loadWatched, MAX_WATCHED, removeWatched } from '../watchedFlags';

// ────────────────────────────────────────────────────────────────────────────
// AsyncStorage mock — in-memory store so tests don't touch the device and
// can introspect raw values when needed.
// ────────────────────────────────────────────────────────────────────────────
const mockStore: Map<string, string> = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

const USER_A = 'user-a';
const USER_B = 'user-b';
const FLAG_1 = 'flag-id-1';
const FLAG_2 = 'flag-id-2';
const FLAG_3 = 'flag-id-3';

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// loadWatched
// ────────────────────────────────────────────────────────────────────────────
describe('loadWatched', () => {
  it('returns [] when nothing is stored for the user', async () => {
    const result = await loadWatched(USER_A);
    expect(result).toEqual([]);
  });

  it('returns the stored list in insertion order', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    const result = await loadWatched(USER_A);
    expect(result).toEqual([FLAG_1, FLAG_2]);
  });

  it('returns [] when the stored value is invalid JSON', async () => {
    // Manually corrupt the store entry to simulate a past write failure.
    const key = `@accessmap/watched_flags_v1:${USER_A}`;
    mockStore.set(key, 'not-json{{{');
    const result = await loadWatched(USER_A);
    expect(result).toEqual([]);
  });

  it('returns [] when the stored value is a non-array JSON primitive', async () => {
    const key = `@accessmap/watched_flags_v1:${USER_A}`;
    mockStore.set(key, JSON.stringify(42));
    const result = await loadWatched(USER_A);
    expect(result).toEqual([]);
  });

  it('filters out non-string entries from a mixed array', async () => {
    const key = `@accessmap/watched_flags_v1:${USER_A}`;
    // Simulate a future schema write that accidentally includes a number.
    mockStore.set(key, JSON.stringify([FLAG_1, 99, null, FLAG_2, true]));
    const result = await loadWatched(USER_A);
    expect(result).toEqual([FLAG_1, FLAG_2]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// addWatched
// ────────────────────────────────────────────────────────────────────────────
describe('addWatched', () => {
  it('adds a new flag ID and returns the updated list', async () => {
    const result = await addWatched(USER_A, FLAG_1);
    expect(result).toEqual([FLAG_1]);
  });

  it('is idempotent — adding an existing ID does not duplicate it', async () => {
    await addWatched(USER_A, FLAG_1);
    const result = await addWatched(USER_A, FLAG_1);
    expect(result).toEqual([FLAG_1]);
    expect(result.filter((id) => id === FLAG_1)).toHaveLength(1);
  });

  it('appends at the end (insertion order preserved)', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    const result = await addWatched(USER_A, FLAG_3);
    expect(result).toEqual([FLAG_1, FLAG_2, FLAG_3]);
  });

  it('returns the new list without an extra round-trip to storage', async () => {
    const returned = await addWatched(USER_A, FLAG_1);
    const loaded = await loadWatched(USER_A);
    expect(returned).toEqual(loaded);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// removeWatched
// ────────────────────────────────────────────────────────────────────────────
describe('removeWatched', () => {
  it('removes a watched flag and returns the updated list', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    const result = await removeWatched(USER_A, FLAG_1);
    expect(result).toEqual([FLAG_2]);
  });

  it('is a no-op when the ID is not in the list', async () => {
    await addWatched(USER_A, FLAG_1);
    const result = await removeWatched(USER_A, FLAG_2);
    expect(result).toEqual([FLAG_1]);
  });

  it('returns [] when removing the only ID', async () => {
    await addWatched(USER_A, FLAG_1);
    const result = await removeWatched(USER_A, FLAG_1);
    expect(result).toEqual([]);
  });

  it('persists the removal — loadWatched confirms the ID is gone', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    await removeWatched(USER_A, FLAG_1);
    const loaded = await loadWatched(USER_A);
    expect(loaded).toEqual([FLAG_2]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// MAX_WATCHED cap
// ────────────────────────────────────────────────────────────────────────────
describe('MAX_WATCHED cap', () => {
  it('drops the oldest entry when the list is full (FIFO)', async () => {
    // Pre-fill the store to exactly MAX_WATCHED entries.
    const ids = Array.from({ length: MAX_WATCHED }, (_, i) => `flag-${i}`);
    const key = `@accessmap/watched_flags_v1:${USER_A}`;
    mockStore.set(key, JSON.stringify(ids));

    const newId = 'flag-new';
    const result = await addWatched(USER_A, newId);

    // Length stays at MAX_WATCHED.
    expect(result).toHaveLength(MAX_WATCHED);
    // Oldest (flag-0) is gone.
    expect(result).not.toContain('flag-0');
    // Newest is present.
    expect(result).toContain(newId);
    // Second-oldest (flag-1) is still there.
    expect(result).toContain('flag-1');
  });

  it('does not exceed MAX_WATCHED after repeated adds to a full list', async () => {
    const ids = Array.from({ length: MAX_WATCHED }, (_, i) => `flag-${i}`);
    const key = `@accessmap/watched_flags_v1:${USER_A}`;
    mockStore.set(key, JSON.stringify(ids));

    await addWatched(USER_A, 'extra-1');
    await addWatched(USER_A, 'extra-2');
    const result = await loadWatched(USER_A);
    expect(result.length).toBeLessThanOrEqual(MAX_WATCHED);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Per-user isolation
// ────────────────────────────────────────────────────────────────────────────
describe('per-user isolation', () => {
  it("two users share a device without seeing each other's watched lists", async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_B, FLAG_2);

    const aList = await loadWatched(USER_A);
    const bList = await loadWatched(USER_B);

    expect(aList).toEqual([FLAG_1]);
    expect(bList).toEqual([FLAG_2]);
    expect(aList).not.toContain(FLAG_2);
    expect(bList).not.toContain(FLAG_1);
  });

  it('removing a flag for user A does not affect user B', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_B, FLAG_1);

    await removeWatched(USER_A, FLAG_1);

    expect(await loadWatched(USER_A)).toEqual([]);
    expect(await loadWatched(USER_B)).toEqual([FLAG_1]);
  });
});
