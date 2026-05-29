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

  try {
    await AsyncStorage.setItem(tileDataKey(userId, tileUrl), data);
  } catch (e) {
    console.warn('[tileCache] failed to write tile data:', e);
    return;
  }

  const index = await readIndex(userId);
  index[tileUrl] = { url: tileUrl, cachedAt: now, size, lastAccessed: now };
  await writeIndex(userId, index);

  // Jordan C4: evict if over the size cap
  if (totalSize(index) > MAX_CACHE_SIZE_BYTES) {
    await evictLRU(userId);
  }
}

/**
 * clearTileCache
 *
 * Removes all tile data and the metadata index for a given user.
 * Called from signOut(userId) — Jordan C1.
 */
export async function clearTileCache(userId: string): Promise<void> {
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
