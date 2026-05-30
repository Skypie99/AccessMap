/**
 * Tests for src/lib/watchedFlags.ts.
 *
 * What this covers:
 *  - loadWatched: happy path, parse robustness, AsyncStorage error path.
 *  - addWatched: insert, idempotent, append order, return value.
 *  - removeWatched: remove, no-op, persistence.
 *  - MAX_WATCHED cap: FIFO eviction on single add.
 *  - addWatchedBulk: empty batch, new ids, already-watched ids,
 *    within-batch duplicates, FIFO eviction across a full list.
 *  - setWatched: replaces, no-op when unchanged, clears on [].
 *  - clearWatched: empties the list.
 *  - persist error path: swallows AsyncStorage.setItem rejection.
 *  - Per-user isolation: two users on one device don't see each other's list.
 *
 * Mock strategy: in-memory Map that exposes jest.fn() handles so
 * individual tests can override behaviour (e.g. reject) via
 * jest.requireMock().
 */

import {
  addWatched,
  addWatchedBulk,
  clearWatched,
  loadWatched,
  MAX_WATCHED,
  removeWatched,
  setWatched,
} from '../watchedFlags';

// ────────────────────────────────────────────────────────────────────────────
// AsyncStorage mock — in-memory Map keyed by storage key.
// Exported as named jest.fn() so tests can use mockRejectedValueOnce.
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

// Helper to get the mock handles so tests can override behaviour.
function getMockAS() {
  return jest.requireMock('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
  };
}

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  // Re-wire the default implementations after clearAllMocks resets them.
  const AS = getMockAS();
  AS.getItem.mockImplementation((key: string) =>
    Promise.resolve(mockStore.get(key) ?? null),
  );
  AS.setItem.mockImplementation((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  });
  AS.removeItem.mockImplementation((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  });
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
    mockStore.set(key, JSON.stringify([FLAG_1, 99, null, FLAG_2, true]));
    const result = await loadWatched(USER_A);
    expect(result).toEqual([FLAG_1, FLAG_2]);
  });

  it('returns [] and logs a warning when AsyncStorage.getItem rejects', async () => {
    // Covers lines 61-62 (the catch block in loadWatched).
    const AS = getMockAS();
    AS.getItem.mockRejectedValueOnce(new Error('disk I/O error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await loadWatched(USER_A);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[watchedFlags] load failed:'),
      expect.any(String),
    );
    warnSpy.mockRestore();
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
// MAX_WATCHED cap (via addWatched)
// ────────────────────────────────────────────────────────────────────────────
describe('MAX_WATCHED cap', () => {
  it('drops the oldest entry when the list is full (FIFO)', async () => {
    const ids = Array.from({ length: MAX_WATCHED }, (_, i) => `flag-${i}`);
    const key = `@accessmap/watched_flags_v1:${USER_A}`;
    mockStore.set(key, JSON.stringify(ids));

    const newId = 'flag-new';
    const result = await addWatched(USER_A, newId);

    expect(result).toHaveLength(MAX_WATCHED);
    expect(result).not.toContain('flag-0');
    expect(result).toContain(newId);
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
// addWatchedBulk — covers lines 110-140
// ────────────────────────────────────────────────────────────────────────────
describe('addWatchedBulk', () => {
  it('returns zeros for an empty batch (fast path)', async () => {
    const result = await addWatchedBulk(USER_A, []);
    expect(result).toEqual({ added: 0, alreadyWatched: 0, dropped: 0 });
  });

  it('adds new ids and reports the count', async () => {
    const result = await addWatchedBulk(USER_A, [FLAG_1, FLAG_2]);
    expect(result).toEqual({ added: 2, alreadyWatched: 0, dropped: 0 });
    expect(await loadWatched(USER_A)).toEqual([FLAG_1, FLAG_2]);
  });

  it('counts ids already on the list as alreadyWatched (no-op)', async () => {
    await addWatched(USER_A, FLAG_1);
    const result = await addWatchedBulk(USER_A, [FLAG_1, FLAG_2]);
    expect(result.alreadyWatched).toBe(1);
    expect(result.added).toBe(1);
    expect(result.dropped).toBe(0);
  });

  it('deduplicates within the batch itself', async () => {
    // Passing the same id twice in the batch should add it only once.
    const result = await addWatchedBulk(USER_A, [FLAG_1, FLAG_1, FLAG_2]);
    expect(result.added).toBe(2);
    const stored = await loadWatched(USER_A);
    expect(stored.filter((id) => id === FLAG_1)).toHaveLength(1);
  });

  it('returns zero added + alreadyWatched count when all ids already watched', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    const result = await addWatchedBulk(USER_A, [FLAG_1, FLAG_2]);
    expect(result).toEqual({ added: 0, alreadyWatched: 2, dropped: 0 });
  });

  it('evicts oldest entries (FIFO) when the batch pushes past MAX_WATCHED', async () => {
    // Pre-fill to exactly MAX_WATCHED - 1 so adding 2 new ids forces 1 eviction.
    const ids = Array.from({ length: MAX_WATCHED - 1 }, (_, i) => `existing-${i}`);
    const key = `@accessmap/watched_flags_v1:${USER_A}`;
    mockStore.set(key, JSON.stringify(ids));

    const result = await addWatchedBulk(USER_A, [FLAG_1, FLAG_2]);
    expect(result.added).toBe(2);
    expect(result.dropped).toBe(1); // one oldest evicted
    const stored = await loadWatched(USER_A);
    expect(stored).toHaveLength(MAX_WATCHED);
    // Oldest existing-0 was evicted.
    expect(stored).not.toContain('existing-0');
    // Both new ids made it.
    expect(stored).toContain(FLAG_1);
    expect(stored).toContain(FLAG_2);
  });

  it('persists the result — loadWatched confirms all added ids', async () => {
    await addWatchedBulk(USER_A, [FLAG_1, FLAG_2, FLAG_3]);
    const stored = await loadWatched(USER_A);
    expect(stored).toContain(FLAG_1);
    expect(stored).toContain(FLAG_2);
    expect(stored).toContain(FLAG_3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setWatched — covers lines 149-154
// ────────────────────────────────────────────────────────────────────────────
describe('setWatched', () => {
  it('replaces the list with the provided ids', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    const result = await setWatched(USER_A, [FLAG_3]);
    expect(result).toEqual([FLAG_3]);
    expect(await loadWatched(USER_A)).toEqual([FLAG_3]);
  });

  it('is a no-op (no write) when the new list equals the existing one', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    jest.clearAllMocks(); // reset call counts
    const AS = getMockAS();
    AS.getItem.mockImplementation((key: string) =>
      Promise.resolve(mockStore.get(key) ?? null),
    );
    AS.setItem.mockImplementation((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    });

    const result = await setWatched(USER_A, [FLAG_1, FLAG_2]);
    expect(result).toEqual([FLAG_1, FLAG_2]);
    // setItem should NOT have been called (no-op).
    expect(AS.setItem).not.toHaveBeenCalled();
  });

  it('sets the list to [] when given an empty array (clear via setWatched)', async () => {
    await addWatched(USER_A, FLAG_1);
    const result = await setWatched(USER_A, []);
    expect(result).toEqual([]);
    expect(await loadWatched(USER_A)).toEqual([]);
  });

  it('returns the new list, which matches what loadWatched returns', async () => {
    const returned = await setWatched(USER_A, [FLAG_2, FLAG_3]);
    expect(returned).toEqual(await loadWatched(USER_A));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// clearWatched — covers lines 169-171
// ────────────────────────────────────────────────────────────────────────────
describe('clearWatched', () => {
  it('removes all watched ids for the user', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_A, FLAG_2);
    await clearWatched(USER_A);
    expect(await loadWatched(USER_A)).toEqual([]);
  });

  it('is a no-op on an already-empty list (does not throw)', async () => {
    await expect(clearWatched(USER_A)).resolves.toBeUndefined();
    expect(await loadWatched(USER_A)).toEqual([]);
  });

  it('only clears the specified user — other users are unaffected', async () => {
    await addWatched(USER_A, FLAG_1);
    await addWatched(USER_B, FLAG_2);
    await clearWatched(USER_A);
    expect(await loadWatched(USER_A)).toEqual([]);
    expect(await loadWatched(USER_B)).toEqual([FLAG_2]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// persist error path — covers lines 161-162
// ────────────────────────────────────────────────────────────────────────────
describe('persist error path', () => {
  it('swallows AsyncStorage.setItem rejection and logs a warning', async () => {
    // The persist function is private but exercised via any write helper.
    // Here we use addWatched as the driver.
    const AS = getMockAS();
    AS.setItem.mockRejectedValueOnce(new Error('quota exceeded'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Should not throw even though setItem fails.
    await expect(addWatched(USER_A, FLAG_1)).resolves.toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[watchedFlags] save failed:'),
      expect.any(String),
    );
    warnSpy.mockRestore();
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
