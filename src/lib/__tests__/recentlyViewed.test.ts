/**
 * Tests for recentlyViewed.ts — per-user on-device recent-view list.
 *
 * Covers:
 *   - loadRecentlyViewed: empty, round-trip, malformed JSON, non-array,
 *     non-string entries filtered out, hard-cap on read.
 *   - recordView: dedupe + front-insertion, cap enforcement, fire-and-forget
 *     does not throw on storage error.
 *   - clearRecentlyViewed: removes the key; no-op when nothing stored.
 *   - dropFromRecent: removes a single id; no-op when id is absent.
 *   - Per-user isolation: clearing user A does not affect user B.
 */

import {
  RECENTLY_VIEWED_MAX,
  clearRecentlyViewed,
  dropFromRecent,
  loadRecentlyViewed,
  recordView,
} from '../recentlyViewed';

// ---------------------------------------------------------------------------
// In-memory AsyncStorage mock — mirrors the pattern in addressRecents.test.ts.
// ---------------------------------------------------------------------------
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      removeItem: jest.fn(async (k: string) => {
        store.delete(k);
      }),
      __reset: () => store.clear(),
      __setRaw: (k: string, v: string) => store.set(k, v),
      __peek: (k: string) => store.get(k) ?? null,
      __keys: () => Array.from(store.keys()),
    },
  };
});

const mockStorage =
  jest.requireMock('@react-native-async-storage/async-storage').default;

const KEY_PREFIX = '@accessmap/recently_viewed_v1:';
const key = (userId: string) => `${KEY_PREFIX}${userId}`;

beforeEach(() => {
  mockStorage.__reset();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// loadRecentlyViewed
// ---------------------------------------------------------------------------

describe('loadRecentlyViewed', () => {
  it('returns [] when nothing is stored for the user', async () => {
    expect(await loadRecentlyViewed('user-empty')).toEqual([]);
  });

  it('round-trips a list written by recordView', async () => {
    await recordView('user-1', 'flag-a');
    await recordView('user-1', 'flag-b');
    const list = await loadRecentlyViewed('user-1');
    // recordView puts newest at index 0
    expect(list).toEqual(['flag-b', 'flag-a']);
  });

  it('returns [] when the stored value is invalid JSON', async () => {
    mockStorage.__setRaw(key('user-bad-json'), '{not json}');
    expect(await loadRecentlyViewed('user-bad-json')).toEqual([]);
  });

  it('returns [] when the stored value is a non-array shape', async () => {
    mockStorage.__setRaw(
      key('user-shape'),
      JSON.stringify({ id: 'oops' }),
    );
    expect(await loadRecentlyViewed('user-shape')).toEqual([]);
  });

  it('filters out non-string entries on load', async () => {
    mockStorage.__setRaw(
      key('user-mixed'),
      JSON.stringify(['flag-a', 42, null, { id: 'flag-b' }, 'flag-c']),
    );
    const list = await loadRecentlyViewed('user-mixed');
    expect(list).toEqual(['flag-a', 'flag-c']);
  });

  it('hard-caps to RECENTLY_VIEWED_MAX on load even if storage was forced over cap', async () => {
    const oversized = Array.from(
      { length: RECENTLY_VIEWED_MAX + 5 },
      (_, i) => `flag-${i}`,
    );
    mockStorage.__setRaw(key('user-oversize'), JSON.stringify(oversized));
    const list = await loadRecentlyViewed('user-oversize');
    expect(list).toHaveLength(RECENTLY_VIEWED_MAX);
    expect(list[0]).toBe('flag-0'); // preserves order, just trims tail
  });

  it('returns [] when AsyncStorage.getItem throws', async () => {
    const original = mockStorage.getItem;
    mockStorage.getItem = jest.fn(async () => {
      throw new Error('disk read failure');
    });
    expect(await loadRecentlyViewed('user-err')).toEqual([]);
    mockStorage.getItem = original;
  });
});

// ---------------------------------------------------------------------------
// recordView
// ---------------------------------------------------------------------------

describe('recordView', () => {
  it('inserts a new id at the front of an empty list', async () => {
    await recordView('user-1', 'flag-a');
    expect(await loadRecentlyViewed('user-1')).toEqual(['flag-a']);
  });

  it('prepends new entries (newest first)', async () => {
    await recordView('user-1', 'flag-a');
    await recordView('user-1', 'flag-b');
    await recordView('user-1', 'flag-c');
    expect(await loadRecentlyViewed('user-1')).toEqual([
      'flag-c',
      'flag-b',
      'flag-a',
    ]);
  });

  it('dedupes — re-viewing an existing flag bubbles it to index 0', async () => {
    await recordView('user-1', 'flag-a');
    await recordView('user-1', 'flag-b');
    await recordView('user-1', 'flag-c');
    // Re-view flag-a — should jump to front, no duplicates.
    await recordView('user-1', 'flag-a');
    const list = await loadRecentlyViewed('user-1');
    expect(list).toEqual(['flag-a', 'flag-c', 'flag-b']);
    expect(list.length).toBe(3);
  });

  it('caps the list at RECENTLY_VIEWED_MAX, dropping the oldest', async () => {
    for (let i = 0; i < RECENTLY_VIEWED_MAX + 3; i++) {
      await recordView('user-cap', `flag-${i}`);
    }
    const list = await loadRecentlyViewed('user-cap');
    expect(list).toHaveLength(RECENTLY_VIEWED_MAX);
    // Most recent (last written) is at index 0.
    expect(list[0]).toBe(`flag-${RECENTLY_VIEWED_MAX + 2}`);
    // The earliest three should have fallen off the tail.
    expect(list).not.toContain('flag-0');
    expect(list).not.toContain('flag-1');
    expect(list).not.toContain('flag-2');
  });

  it('does not throw when AsyncStorage.setItem fails (fire-and-forget)', async () => {
    const original = mockStorage.setItem;
    mockStorage.setItem = jest.fn(async () => {
      throw new Error('disk full');
    });
    await expect(recordView('user-err', 'flag-x')).resolves.toBeUndefined();
    mockStorage.setItem = original;
  });
});

// ---------------------------------------------------------------------------
// Per-user isolation
// ---------------------------------------------------------------------------

describe('per-user isolation', () => {
  it('records for one user do not appear under another userId', async () => {
    await recordView('alice', 'flag-a');
    await recordView('alice', 'flag-b');
    await recordView('bob', 'flag-z');

    expect(await loadRecentlyViewed('alice')).toEqual(['flag-b', 'flag-a']);
    expect(await loadRecentlyViewed('bob')).toEqual(['flag-z']);
  });

  it('clearing user A does not affect user B', async () => {
    await recordView('alice', 'flag-a');
    await recordView('bob', 'flag-b');

    await clearRecentlyViewed('alice');

    expect(await loadRecentlyViewed('alice')).toEqual([]);
    expect(await loadRecentlyViewed('bob')).toEqual(['flag-b']);
  });
});

// ---------------------------------------------------------------------------
// clearRecentlyViewed
// ---------------------------------------------------------------------------

describe('clearRecentlyViewed', () => {
  it('removes the key for the given user', async () => {
    await recordView('user-clear', 'flag-a');
    await recordView('user-clear', 'flag-b');
    expect(await loadRecentlyViewed('user-clear')).toHaveLength(2);

    await clearRecentlyViewed('user-clear');

    expect(await loadRecentlyViewed('user-clear')).toEqual([]);
    expect(mockStorage.__peek(key('user-clear'))).toBeNull();
  });

  it('is a silent no-op when there is nothing to clear', async () => {
    await expect(clearRecentlyViewed('never-existed')).resolves.toBeUndefined();
  });

  it('does not throw when AsyncStorage.removeItem fails', async () => {
    const original = mockStorage.removeItem;
    mockStorage.removeItem = jest.fn(async () => {
      throw new Error('storage failure');
    });
    await expect(clearRecentlyViewed('user-err')).resolves.toBeUndefined();
    mockStorage.removeItem = original;
  });
});

// ---------------------------------------------------------------------------
// dropFromRecent
// ---------------------------------------------------------------------------

describe('dropFromRecent', () => {
  it('removes a single id and preserves order of the rest', async () => {
    await recordView('user-d', 'flag-a');
    await recordView('user-d', 'flag-b');
    await recordView('user-d', 'flag-c');
    // List is currently [c, b, a]

    await dropFromRecent('user-d', 'flag-b');

    expect(await loadRecentlyViewed('user-d')).toEqual(['flag-c', 'flag-a']);
  });

  it('is a no-op when the id is not present (does not rewrite storage)', async () => {
    await recordView('user-noop', 'flag-a');
    const before = mockStorage.__peek(key('user-noop'));

    await dropFromRecent('user-noop', 'flag-missing');

    const after = mockStorage.__peek(key('user-noop'));
    // Same persisted bytes — recordView wasn't re-invoked unnecessarily.
    expect(after).toBe(before);
    expect(await loadRecentlyViewed('user-noop')).toEqual(['flag-a']);
  });

  it('is a silent no-op when the user has nothing stored', async () => {
    await expect(
      dropFromRecent('never-existed', 'flag-x'),
    ).resolves.toBeUndefined();
    expect(await loadRecentlyViewed('never-existed')).toEqual([]);
  });

  it('does not throw when AsyncStorage.setItem fails', async () => {
    await recordView('user-drop-err', 'flag-a');
    await recordView('user-drop-err', 'flag-b');

    const original = mockStorage.setItem;
    mockStorage.setItem = jest.fn(async () => {
      throw new Error('disk full');
    });
    await expect(
      dropFromRecent('user-drop-err', 'flag-a'),
    ).resolves.toBeUndefined();
    mockStorage.setItem = original;
  });
});
