/**
 * tileCache.ts — Offline map tile cache (Jordan C1–C5)
 *
 * Stores raster tile data in AsyncStorage as base64-encoded strings.
 * (expo-file-system is not installed; see QA report for the propose-only
 * file-system upgrade path.)
 *
 * Jordan conditions addressed here:
 *   C1: user-keyed namespace — every key includes userId; clearTileCache
 *       removes all entries for a specific user (called from signOut).
 *   C3: demand-only — no pre-fetching; callers (PlatformMap) only call
 *       setCachedTile when they have already fetched a tile on-demand.
 *   C4: 50 MB size bound with LRU eviction (evictLRU trims to 40 MB).
 *   C5: 7-day TTL — getCachedTile treats any entry older than TILE_TTL_MS
 *       as a cache miss.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const TILE_CACHE_VERSION = 'v1';
export const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB  (Jordan C4)
export const EVICT_TARGET_BYTES = 40 * 1024 * 1024; // evict down to 40 MB
export const TILE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (Jordan C5)

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/** AsyncStorage key for the metadata index belonging to one user. */
export const cacheMetaKey = (userId: string): string =>
  `@accessmap/tile_cache_meta_${TILE_CACHE_VERSION}:${userId}`;

/** AsyncStorage key for the raw tile data belonging to one user + url hash. */
export const tileDataKey = (userId: string, tileUrl: string): string =>
  `@accessmap/tile_data_${TILE_CACHE_VERSION}:${userId}:${tileUrl}`;

// ---------------------------------------------------------------------------
// Metadata types
// ---------------------------------------------------------------------------

export interface TileMeta {
  url: string;
  cachedAt: number; // ms since epoch
  size: number; // bytes (byte-length of the stored base64 string)
  lastAccessed: number; // ms since epoch — updated on every cache hit
}

export type TileCacheIndex = Record<string, TileMeta>; // keyed by tileUrl

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function readIndex(userId: string): Promise<TileCacheIndex> {
  try {
    const raw = await AsyncStorage.getItem(cacheMetaKey(userId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as TileCacheIndex;
  } catch {
    return {};
  }
}

async function writeIndex(userId: string, index: TileCacheIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheMetaKey(userId), JSON.stringify(index));
  } catch (e) {
    console.warn('[tileCache] failed to write index:', e);
  }
}

function totalSize(index: TileCacheIndex): number {
  return Object.values(index).reduce((sum, m) => sum + m.size, 0);
}

// Per-user serialization of index read-modify-write (F23). The metadata index
// lives in a single AsyncStorage key, but Leaflet fires many setCachedTile
// calls in rapid parallel succession during a pan/zoom. Without a lock, two
// calls each read the same index snapshot before either writes, and the last
// write silently drops the other's entry — orphaning that tile's data (it
// stays in storage with no index record, so it's never LRU-evicted and the
// cache grows toward the cap untracked). This chain runs index mutations
// one-at-a-time per user. Non-reentrant: a locked function must only call the
// *unlocked* helpers (readIndex/writeIndex/evictLRUCore), never another locked
// public function.
const indexLocks = new Map<string, Promise<unknown>>();

// Post-clear write guard (F31 re-sweep fix). clearTileCache (sign-out /
// account deletion — Jordan C1) only serializes against writes via the lock;
// it can neither cancel nor out-order a setCachedTile that is still in flight:
//   (a) a tile fetch that completes AFTER the clear calls setCachedTile and
//       happily re-creates index + data for the signed-out user;
//   (b) a setCachedTile already queued behind the clear re-reads the empty
//       index and writes a fresh one.
// Both resurrect location-revealing tiles for a signed-out user. Guard:
// clearTileCache bumps a per-user epoch and records the clear time;
// setCachedTile (1) captures the epoch on entry and skips if a clear happened
// before its locked turn, and (2) refuses to write at all within
// TILE_CLEAR_GRACE_MS of the last clear — covering late writes from fetch
// chains that started before sign-out. Cost: a user who signs back in within
// the grace window just isn't cached for those first minutes (demand cache —
// tiles still render from the network).
export const TILE_CLEAR_GRACE_MS = 2 * 60 * 1000;
const clearEpochs = new Map<string, number>();
const lastClearedAt = new Map<string, number>();

function withIndexLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = indexLocks.get(userId) ?? Promise.resolve();
  // Run fn after prev settles regardless of its outcome (so one failure can't
  // wedge the queue).
  const next = prev.then(fn, fn);
  // Track a settled (never-rejecting) version as the new tail so subsequent
  // callers chain cleanly; the caller still gets the real result/error via next.
  indexLocks.set(
    userId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

/**
 * Test-only: reset the F31 post-clear guards. Module state (clear epochs +
 * grace-window timestamps) persists across tests in one Jest worker; suites
 * that exercise clearTileCache must reset it in beforeEach or every later
 * setCachedTile for the same userId is silently dropped by the grace window.
 */
export function __resetTileCacheClearGuardsForTests(): void {
  clearEpochs.clear();
  lastClearedAt.clear();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * getCachedTile
 *
 * Returns the base64-encoded tile data if a valid (non-expired) entry exists,
 * otherwise returns null (cache miss). Updates `lastAccessed` on a hit so LRU
 * eviction tracks recency correctly.
 *
 * Jordan C5: entries older than TILE_TTL_MS are treated as a miss and pruned.
 */
export async function getCachedTile(userId: string, tileUrl: string): Promise<string | null> {
  // Serialized with setCachedTile/evictLRU so the lastAccessed/TTL-prune index
  // write here can't clobber a concurrent setCachedTile addition (F23).
  return withIndexLock(userId, async () => {
    const index = await readIndex(userId);
    const meta = index[tileUrl];
    if (!meta) return null;

    const now = Date.now();

    // Jordan C5: 7-day TTL
    if (now - meta.cachedAt > TILE_TTL_MS) {
      // Prune the expired entry silently
      try {
        await AsyncStorage.removeItem(tileDataKey(userId, tileUrl));
      } catch {
        /* silent */
      }
      delete index[tileUrl];
      await writeIndex(userId, index);
      return null;
    }

    // Fetch the actual data
    let data: string | null = null;
    try {
      data = await AsyncStorage.getItem(tileDataKey(userId, tileUrl));
    } catch {
      return null;
    }
    if (!data) return null;

    // Update lastAccessed for LRU tracking
    index[tileUrl] = { ...meta, lastAccessed: now };
    await writeIndex(userId, index);

    return data;
  });
}

/**
 * setCachedTile
 *
 * Stores a base64-encoded tile. Writes data + updates metadata index.
 * Triggers LRU eviction if total cache size would exceed MAX_CACHE_SIZE_BYTES
 * after the write.
 *
 * Jordan C3: callers should only invoke this after fetching a tile on-demand.
 * Jordan C4: evicts LRU entries when over the size bound.
 */
export async function setCachedTile(userId: string, tileUrl: string, data: string): Promise<void> {
  const size = data.length; // byte approximation (1 char ≈ 1 byte for base64)
  const now = Date.now();
  // F31: refuse writes shortly after a clear — a tile fetch that started
  // before sign-out can land here long after clearTileCache ran.
  const clearedAt = lastClearedAt.get(userId);
  if (clearedAt !== undefined && now - clearedAt < TILE_CLEAR_GRACE_MS) return;
  const epochAtEntry = clearEpochs.get(userId) ?? 0;

  // Data write + index read-modify-write + eviction all under the per-user
  // lock (F23/F31): the data write used to happen outside the lock, so a
  // clearTileCache holding the lock could snapshot an index that didn't list
  // the new tile yet — its multiRemove missed the data key, and the queued
  // index write then resurrected the entry.
  await withIndexLock(userId, async () => {
    // F31: a clear ran between our entry and our turn on the lock — drop the write.
    if ((clearEpochs.get(userId) ?? 0) !== epochAtEntry) return;

    try {
      await AsyncStorage.setItem(tileDataKey(userId, tileUrl), data);
    } catch (e) {
      console.warn('[tileCache] failed to write tile data:', e);
      return;
    }

    const index = await readIndex(userId);
    index[tileUrl] = { url: tileUrl, cachedAt: now, size, lastAccessed: now };
    await writeIndex(userId, index);

    // Jordan C4: evict if over the size cap. Call the UNLOCKED core — we're
    // already holding the lock (the public evictLRU would deadlock).
    if (totalSize(index) > MAX_CACHE_SIZE_BYTES) {
      await evictLRUCore(userId);
    }
  });
}

/**
 * clearTileCache
 *
 * Removes all tile data and the metadata index for a given user.
 * Called from signOut(userId) — Jordan C1.
 */
export async function clearTileCache(userId: string): Promise<void> {
  // F31: bump the epoch + record the clear time BEFORE taking the lock so any
  // setCachedTile already queued (or still fetching its tile) sees the clear
  // and drops its write instead of resurrecting the cache for a signed-out
  // user. The lock below still serializes against writes whose locked turn
  // started before this call.
  clearEpochs.set(userId, (clearEpochs.get(userId) ?? 0) + 1);
  lastClearedAt.set(userId, Date.now());
  await withIndexLock(userId, async () => {
    const index = await readIndex(userId);
    const tileKeys = Object.keys(index).map((url) => tileDataKey(userId, url));

    // Remove tile data entries in batches to avoid overwhelming AsyncStorage
    // on large caches. multiRemove is available on both native and web.
    try {
      if (tileKeys.length > 0) {
        await AsyncStorage.multiRemove(tileKeys);
      }
      await AsyncStorage.removeItem(cacheMetaKey(userId));
    } catch (e) {
      console.warn('[tileCache] clearTileCache error (silent):', e);
    }
  });
}

/**
 * evictLRU
 *
 * Evicts the least-recently-accessed tiles until total size is at or below
 * EVICT_TARGET_BYTES (40 MB). Called automatically by setCachedTile when the
 * cache exceeds MAX_CACHE_SIZE_BYTES (50 MB). May also be called manually.
 *
 * Jordan C4: 50 MB size bound.
 */
export async function evictLRU(userId: string): Promise<void> {
  // Public entry point — acquire the lock, then run the unlocked core.
  return withIndexLock(userId, () => evictLRUCore(userId));
}

/**
 * Unlocked eviction core. MUST be called only while the per-user index lock is
 * held (by setCachedTile or the public evictLRU wrapper) — calling it without
 * the lock reintroduces the F23 race.
 */
async function evictLRUCore(userId: string): Promise<void> {
  const index = await readIndex(userId);
  let current = totalSize(index);
  if (current <= EVICT_TARGET_BYTES) return;

  // Sort entries oldest-accessed first
  const sorted = Object.values(index).sort((a, b) => a.lastAccessed - b.lastAccessed);

  const keysToRemove: string[] = [];
  for (const meta of sorted) {
    if (current <= EVICT_TARGET_BYTES) break;
    keysToRemove.push(tileDataKey(userId, meta.url));
    current -= meta.size;
    delete index[meta.url];
  }

  try {
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    await writeIndex(userId, index);
  } catch (e) {
    console.warn('[tileCache] evictLRU error (silent):', e);
  }
}
