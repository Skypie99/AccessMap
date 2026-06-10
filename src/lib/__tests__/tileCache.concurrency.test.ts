import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetTileCacheClearGuardsForTests,
  cacheMetaKey,
  clearTileCache,
  getCachedTile,
  setCachedTile,
  tileDataKey,
  type TileCacheIndex,
} from '../tileCache';

// F23: the metadata index is a single AsyncStorage key shared by every tile.
// Leaflet fires many setCachedTile calls concurrently during a pan. Without
// the per-user serialization lock, concurrent read-modify-write cycles drop
// each other's entries (orphaning tile data). These tests would fail (count
// < N) if the lock regressed.
describe('tileCache concurrent writes (F23)', () => {
  const USER = 'user-1';

  beforeEach(async () => {
    await AsyncStorage.clear();
    // The F31 post-clear guards live in module state and persist across tests
    // in this worker — reset them so a clear in one test can't silently drop
    // writes in the next.
    __resetTileCacheClearGuardsForTests();
  });

  it('records every tile in the index when writes run concurrently', async () => {
    const N = 25;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        setCachedTile(USER, `https://tiles/${i}.png`, `data-${i}`),
      ),
    );

    const raw = await AsyncStorage.getItem(cacheMetaKey(USER));
    expect(raw).not.toBeNull();
    const index = JSON.parse(raw as string) as TileCacheIndex;

    // Every concurrent write must be present — no lost index entries.
    expect(Object.keys(index)).toHaveLength(N);
    for (let i = 0; i < N; i++) {
      expect(index[`https://tiles/${i}.png`]).toBeTruthy();
      expect(await getCachedTile(USER, `https://tiles/${i}.png`)).toBe(`data-${i}`);
    }
  });

  it('clearTileCache removes the index even with writes in flight', async () => {
    const writes = Promise.all([
      setCachedTile(USER, 'https://tiles/a.png', 'a'),
      setCachedTile(USER, 'https://tiles/b.png', 'b'),
    ]);
    await writes;
    await clearTileCache(USER);
    expect(await AsyncStorage.getItem(cacheMetaKey(USER))).toBeNull();
  });

  // F31 (re-sweep): clearTileCache runs at sign-out, but a tile fetch chain
  // started before sign-out can call setCachedTile afterwards. Those writes
  // must NOT resurrect index or data for the signed-out user.
  describe('post-clear write guard (F31)', () => {
    it('a write racing the clear cannot resurrect the cache', async () => {
      // set enters first (captures the pre-clear epoch) but its locked turn
      // runs after clear bumped the epoch — the write must be dropped.
      const racingSet = setCachedTile(USER, 'https://tiles/race.png', 'race-data');
      const clear = clearTileCache(USER);
      await Promise.all([racingSet, clear]);

      expect(await AsyncStorage.getItem(cacheMetaKey(USER))).toBeNull();
      expect(await AsyncStorage.getItem(tileDataKey(USER, 'https://tiles/race.png'))).toBeNull();
      expect(await getCachedTile(USER, 'https://tiles/race.png')).toBeNull();
    });

    it('a late write within the grace window after the clear is dropped', async () => {
      await setCachedTile(USER, 'https://tiles/pre.png', 'pre');
      await clearTileCache(USER);

      // Entirely post-clear (the in-flight-fetch-lands-late case).
      await setCachedTile(USER, 'https://tiles/late.png', 'late-data');

      expect(await AsyncStorage.getItem(cacheMetaKey(USER))).toBeNull();
      expect(await AsyncStorage.getItem(tileDataKey(USER, 'https://tiles/late.png'))).toBeNull();
    });

    it('writes work again once the guards are reset (fresh sign-in later)', async () => {
      await clearTileCache(USER);
      __resetTileCacheClearGuardsForTests(); // simulates the grace window elapsing
      await setCachedTile(USER, 'https://tiles/fresh.png', 'fresh-data');
      expect(await getCachedTile(USER, 'https://tiles/fresh.png')).toBe('fresh-data');
    });
  });
});
