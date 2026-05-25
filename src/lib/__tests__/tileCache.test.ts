/**
 * Tests for tileCache.ts — offline map tile cache.
 *
 * Covers:
 *   - getCachedTile: cache miss, TTL expiry, cache hit (Jordan C5)
 *   - setCachedTile: stores data, LRU auto-eviction (Jordan C4)
 *   - evictLRU: evicts least-recently-accessed until under EVICT_TARGET_BYTES
 *   - clearTileCache: removes all entries for a userId (Jordan C1)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearTileCache,
  evictLRU,
  getCachedTile,
  setCachedTile,
  TILE_TTL_MS,
  cacheMetaKey,
  tileDataKey,
  type TileCacheIndex,
} from '../tileCache';

// ---------------------------------------------------------------------------
// AsyncStorage mock — in-memory store identical to the one in offlineCache.test.ts
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
      multiRemove: jest.fn(async (keys: string[]) => {
        for (const k of keys) store.delete(k);
      }),
      __reset: () => store.clear(),
      __setRaw: (k: string, v: string) => store.set(k, v),
      __getStore: () => store,
    },
  };
});

const mockStorage =
  jest.requireMock('@react-native-async-storage/async-storage').default;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeBase64(sizeBytes: number): string {
  // Each base64 char ≈ 1 byte in our size approximation.
  return 'A'.repeat(sizeBytes);
}

async function seedIndex(
  userId: string,
  entries: Array<{ url: string; size: number; lastAccessed: number; cachedAt?: number }>,
): Promise<void> {
  const now = Date.now();
  const index: TileCacheIndex = {};
  for (const e of entries) {
    index[e.url] = {
      url: e.url,
      cachedAt: e.cachedAt ?? now,
      size: e.size,
      lastAccessed: e.lastAccessed,
    };
    // Also write placeholder data so multiRemove finds real keys.
    mockStorage.__setRaw(tileDataKey(userId, e.url), fakeBase64(e.size));
  }
  mockStorage.__setRaw(cacheMetaKey(userId), JSON.stringify(index));
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  mockStorage.__reset();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getCachedTile — cache miss
// ---------------------------------------------------------------------------
describe('getCachedTile — cache miss', () => {
  it('returns null when nothing has been cached', async () => {
    const result = await getCachedTile('user-1', 'https://tile.osm.org/1/2/3.png');
    expect(result).toBeNull();
  });

  it('returns null when the index exists but the requested url is absent', async () => {
    await setCachedTile('user-1', 'https://tile.osm.org/1/2/3.png', fakeBase64(100));
    const result = await getCachedTile('user-1', 'https://tile.osm.org/9/9/9.png');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCachedTile — TTL expiry (Jordan C5)
// ---------------------------------------------------------------------------
describe('getCachedTile — TTL expiry (Jordan C5)', () => {
  it('returns null when the entry is older than TILE_TTL_MS', async () => {
    const expiredAt = Date.now() - TILE_TTL_MS - 1000;
    const url = 'https://tile.osm.org/5/10/12.png';
    const index: TileCacheIndex = {
      [url]: { url, cachedAt: expiredAt, size: 100, lastAccessed: expiredAt },
    };
    mockStorage.__setRaw(cacheMetaKey('user-ttl'), JSON.stringify(index));
    mockStorage.__setRaw(tileDataKey('user-ttl', url), fakeBase64(100));

    const result = await getCachedTile('user-ttl', url);
    expect(result).toBeNull();
  });

  it('returns data when the entry is within TILE_TTL_MS (Jordan C5)', async () => {
    const url = 'https://tile.osm.org/5/10/13.png';
    const data = fakeBase64(100);
    await setCachedTile('user-fresh', url, data);
    const result = await getCachedTile('user-fresh', url);
    expect(result).toBe(data);
  });

  it('prunes the expired entry from the index after a TTL miss', async () => {
    const expiredAt = Date.now() - TILE_TTL_MS - 5000;
    const url = 'https://tile.osm.org/5/10/14.png';
    const index: TileCacheIndex = {
      [url]: { url, cachedAt: expiredAt, size: 50, lastAccessed: expiredAt },
    };
    mockStorage.__setRaw(cacheMetaKey('user-prune'), JSON.stringify(index));
    mockStorage.__setRaw(tileDataKey('user-prune', url), fakeBase64(50));

    await getCachedTile('user-prune', url);

    const rawIndex = mockStorage.__getStore().get(cacheMetaKey('user-prune'));
    const parsedIndex: TileCacheIndex = rawIndex ? JSON.parse(rawIndex) : {};
    expect(parsedIndex[url]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getCachedTile — hit updates lastAccessed
// ---------------------------------------------------------------------------
describe('getCachedTile — updates lastAccessed on hit', () => {
  it('updates lastAccessed in the index when tile is returned', async () => {
    const url = 'https://tile.osm.org/6/11/15.png';
    const data = fakeBase64(200);

    // Seed with an old lastAccessed
    const oldTime = Date.now() - 3_600_000; // 1 hour ago
    const index: TileCacheIndex = {
      [url]: { url, cachedAt: oldTime, size: 200, lastAccessed: oldTime },
    };
    mockStorage.__setRaw(cacheMetaKey('user-access'), JSON.stringify(index));
    mockStorage.__setRaw(tileDataKey('user-access', url), data);

    const beforeGet = Date.now();
    await getCachedTile('user-access', url);

    const rawIndex = mockStorage.__getStore().get(cacheMetaKey('user-access'));
    const updatedIndex: TileCacheIndex = rawIndex ? JSON.parse(rawIndex) : {};
    expect(updatedIndex[url]?.lastAccessed).toBeGreaterThanOrEqual(beforeGet);
  });
});

// ---------------------------------------------------------------------------
// clearTileCache — Jordan C1
// ---------------------------------------------------------------------------
describe('clearTileCache (Jordan C1)', () => {
  it('removes all tile data and the index for the specified user', async () => {
    await setCachedTile('user-clear', 'https://tile.osm.org/1/1/1.png', fakeBase64(100));
    await setCachedTile('user-clear', 'https://tile.osm.org/1/1/2.png', fakeBase64(200));

    await clearTileCache('user-clear');

    expect(await getCachedTile('user-clear', 'https://tile.osm.org/1/1/1.png')).toBeNull();
    expect(await getCachedTile('user-clear', 'https://tile.osm.org/1/1/2.png')).toBeNull();
    expect(mockStorage.__getStore().has(cacheMetaKey('user-clear'))).toBe(false);
  });

  it('does not remove entries belonging to a different user', async () => {
    const url = 'https://tile.osm.org/2/3/4.png';
    const data = fakeBase64(100);
    await setCachedTile('user-a', url, data);
    await setCachedTile('user-b', url, data);

    await clearTileCache('user-a');

    // user-b's data must survive
    expect(await getCachedTile('user-b', url)).toBe(data);
  });

  it('does not throw when called for a user with no cached tiles', async () => {
    await expect(clearTileCache('nonexistent-user')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// evictLRU — Jordan C4
// ---------------------------------------------------------------------------
describe('evictLRU (Jordan C4)', () => {
  it('does nothing when total size is within EVICT_TARGET_BYTES', async () => {
    const url = 'https://tile.osm.org/3/4/5.png';
    await setCachedTile('user-small', url, fakeBase64(1000));

    const storeBefore = new Map(mockStorage.__getStore());
    await evictLRU('user-small');
    const storeAfter = mockStorage.__getStore();

    // Nothing was removed
    expect(storeAfter.size).toBe(storeBefore.size);
  });

  it('evicts oldest-accessed entries until size drops to or below EVICT_TARGET_BYTES', async () => {
    const userId = 'user-lru';
    const now = Date.now();

    // Seed with 3 tiles totalling > 50 MB so eviction is needed.
    // Sizes: 20 MB old, 20 MB mid, 20 MB new → 60 MB total (over 50 MB cap)
    const MB20 = 20 * 1024 * 1024;
    await seedIndex(userId, [
      { url: 'https://t.osm/old.png', size: MB20, lastAccessed: now - 30_000 },
      { url: 'https://t.osm/mid.png', size: MB20, lastAccessed: now - 20_000 },
      { url: 'https://t.osm/new.png', size: MB20, lastAccessed: now - 10_000 },
    ]);

    await evictLRU(userId);

    // 'old' should be evicted; 'mid' and 'new' may or may not be depending on
    // the arithmetic. With 3×20 MB = 60 MB and a 40 MB target, evicting 'old'
    // (20 MB) leaves 40 MB which is exactly the target → stop there.
    const rawIndex = mockStorage.__getStore().get(cacheMetaKey(userId));
    const index: TileCacheIndex = rawIndex ? JSON.parse(rawIndex) : {};
    expect(index['https://t.osm/old.png']).toBeUndefined();
    // Total remaining should be ≤ EVICT_TARGET_BYTES (40 MB = 40 * 1024 * 1024)
    const EXPECTED_TARGET = 40 * 1024 * 1024;
    const remaining = Object.values(index).reduce((s, m) => s + m.size, 0);
    expect(remaining).toBeLessThanOrEqual(EXPECTED_TARGET);
  });

  it('preserves the most recently accessed tiles during eviction', async () => {
    const userId = 'user-lru2';
    const now = Date.now();
    const MB20 = 20 * 1024 * 1024;

    await seedIndex(userId, [
      { url: 'https://t.osm/a.png', size: MB20, lastAccessed: now - 30_000 },
      { url: 'https://t.osm/b.png', size: MB20, lastAccessed: now - 20_000 },
      { url: 'https://t.osm/c.png', size: MB20, lastAccessed: now - 10_000 },
    ]);

    await evictLRU(userId);

    // 'c' (most recent) must survive
    const rawIndex = mockStorage.__getStore().get(cacheMetaKey(userId));
    const index: TileCacheIndex = rawIndex ? JSON.parse(rawIndex) : {};
    expect(index['https://t.osm/c.png']).toBeDefined();
  });
});
