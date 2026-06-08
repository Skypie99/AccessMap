import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cacheMetaKey,
  clearTileCache,
  getCachedTile,
  setCachedTile,
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
});
