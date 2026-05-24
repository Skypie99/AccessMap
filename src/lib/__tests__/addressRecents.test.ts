import {
  addRecent,
  ADDRESS_RECENTS_KEY,
  ADDRESS_RECENTS_MAX,
  AddressRecent,
  clearRecents,
  loadRecents,
  saveRecents,
} from '../addressRecents';

// In-memory AsyncStorage mock — mirrors the pattern used by
// savedPlaces.test.ts so we can round-trip load/save/clear in Node.
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
    },
  };
});

const mockStorage =
  jest.requireMock('@react-native-async-storage/async-storage').default;

const CUPERTINO: AddressRecent = {
  id: '1',
  displayName: '1 Infinite Loop, Cupertino, CA',
  lat: 37.3318,
  lng: -122.0312,
};
const SEATTLE: AddressRecent = {
  id: '2',
  displayName: 'Pike Place Market, Seattle, WA',
  lat: 47.6101,
  lng: -122.3421,
};
const NYC: AddressRecent = {
  id: '3',
  displayName: 'Times Square, New York, NY',
  lat: 40.758,
  lng: -73.9855,
};
const LONDON: AddressRecent = {
  id: '4',
  displayName: 'Big Ben, London, UK',
  lat: 51.5007,
  lng: -0.1246,
};
const PARIS: AddressRecent = {
  id: '5',
  displayName: 'Eiffel Tower, Paris, FR',
  lat: 48.8584,
  lng: 2.2945,
};
const TOKYO: AddressRecent = {
  id: '6',
  displayName: 'Shibuya Crossing, Tokyo, JP',
  lat: 35.6595,
  lng: 139.7004,
};

describe('addressRecents', () => {
  beforeEach(() => {
    mockStorage.__reset();
    jest.clearAllMocks();
  });

  describe('addRecent (pure)', () => {
    it('adds to an empty list', () => {
      const result = addRecent([], CUPERTINO);
      expect(result).toEqual([CUPERTINO]);
    });

    it('prepends a new entry (newest first)', () => {
      const result = addRecent([CUPERTINO], SEATTLE);
      expect(result).toEqual([SEATTLE, CUPERTINO]);
    });

    it('preserves order of older entries when prepending', () => {
      const seeded = [SEATTLE, CUPERTINO];
      const result = addRecent(seeded, NYC);
      expect(result).toEqual([NYC, SEATTLE, CUPERTINO]);
    });

    it('dedupes by displayName: existing match moves to front, no duplicate', () => {
      const seeded = [SEATTLE, CUPERTINO, NYC];
      // Re-pick Cupertino — should jump to index 0, others shift down.
      const result = addRecent(seeded, CUPERTINO);
      expect(result).toEqual([CUPERTINO, SEATTLE, NYC]);
      expect(result).toHaveLength(3);
    });

    it('dedupes case-insensitively on displayName', () => {
      const upper: AddressRecent = {
        ...CUPERTINO,
        displayName: CUPERTINO.displayName.toUpperCase(),
      };
      const result = addRecent([SEATTLE, CUPERTINO], upper);
      // Old Cupertino removed; new (uppercase) entry at front.
      expect(result).toHaveLength(2);
      expect(result[0]!.displayName).toBe(CUPERTINO.displayName.toUpperCase());
      expect(result[1]).toEqual(SEATTLE);
    });

    it('new entry wins on coords when displayName collides', () => {
      const stale: AddressRecent = {
        ...CUPERTINO,
        lat: 0,
        lng: 0,
      };
      const result = addRecent([stale], CUPERTINO);
      expect(result).toHaveLength(1);
      expect(result[0]!.lat).toBe(CUPERTINO.lat);
      expect(result[0]!.lng).toBe(CUPERTINO.lng);
    });

    it('caps at ADDRESS_RECENTS_MAX, trimming the oldest', () => {
      // Build a 5-deep list, then add a 6th and confirm the oldest drops off.
      let list: AddressRecent[] = [];
      list = addRecent(list, CUPERTINO);
      list = addRecent(list, SEATTLE);
      list = addRecent(list, NYC);
      list = addRecent(list, LONDON);
      list = addRecent(list, PARIS);
      expect(list).toHaveLength(ADDRESS_RECENTS_MAX);
      // PARIS is most recent → index 0. CUPERTINO is oldest → index 4.
      expect(list[0]!.displayName).toBe(PARIS.displayName);
      expect(list[list.length - 1]!.displayName).toBe(CUPERTINO.displayName);

      // Add a 6th; oldest (CUPERTINO) should fall off.
      list = addRecent(list, TOKYO);
      expect(list).toHaveLength(ADDRESS_RECENTS_MAX);
      expect(list[0]!.displayName).toBe(TOKYO.displayName);
      expect(list.map((r) => r.displayName)).not.toContain(
        CUPERTINO.displayName,
      );
    });

    it('is pure — does not mutate the input list', () => {
      const seeded = [CUPERTINO, SEATTLE];
      const seededCopy = [...seeded];
      addRecent(seeded, NYC);
      expect(seeded).toEqual(seededCopy);
    });

    it('handles a same-entry re-pick on a single-item list (no-op shape)', () => {
      const result = addRecent([CUPERTINO], CUPERTINO);
      expect(result).toEqual([CUPERTINO]);
      expect(result).toHaveLength(1);
    });
  });

  describe('loadRecents', () => {
    it('returns [] when storage is empty', async () => {
      expect(await loadRecents()).toEqual([]);
    });

    it('round-trips a saved list', async () => {
      await saveRecents([CUPERTINO, SEATTLE]);
      const loaded = await loadRecents();
      expect(loaded).toEqual([CUPERTINO, SEATTLE]);
    });

    it('returns [] on invalid JSON', async () => {
      mockStorage.__setRaw(ADDRESS_RECENTS_KEY, '{not json');
      expect(await loadRecents()).toEqual([]);
    });

    it('returns [] when the stored value is not an array', async () => {
      mockStorage.__setRaw(
        ADDRESS_RECENTS_KEY,
        JSON.stringify({ displayName: 'X' }),
      );
      expect(await loadRecents()).toEqual([]);
    });

    it('drops malformed entries on load', async () => {
      mockStorage.__setRaw(
        ADDRESS_RECENTS_KEY,
        JSON.stringify([
          CUPERTINO, // good
          { displayName: '', lat: 1, lng: 1 }, // empty name
          { displayName: 'No coords' }, // missing lat/lng
          { displayName: 'NaN coords', lat: NaN, lng: 1 },
          { displayName: 'String coords', lat: '1', lng: '2' },
          'not even an object',
        ]),
      );
      const loaded = await loadRecents();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]!.displayName).toBe(CUPERTINO.displayName);
    });

    it('hard-caps on load even if storage was forced over cap', async () => {
      const oversized: AddressRecent[] = [];
      for (let i = 0; i < ADDRESS_RECENTS_MAX + 5; i++) {
        oversized.push({
          id: `p${i}`,
          displayName: `Place ${i}`,
          lat: 47,
          lng: -122,
        });
      }
      mockStorage.__setRaw(ADDRESS_RECENTS_KEY, JSON.stringify(oversized));
      const loaded = await loadRecents();
      expect(loaded.length).toBe(ADDRESS_RECENTS_MAX);
    });
  });

  describe('saveRecents', () => {
    it('persists the list as JSON', async () => {
      await saveRecents([CUPERTINO, SEATTLE]);
      const raw = mockStorage.__peek(ADDRESS_RECENTS_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string);
      expect(parsed).toEqual([CUPERTINO, SEATTLE]);
    });

    it('trims defensively on write if caller passes over-cap', async () => {
      const oversized = [CUPERTINO, SEATTLE, NYC, LONDON, PARIS, TOKYO];
      await saveRecents(oversized);
      const loaded = await loadRecents();
      expect(loaded).toHaveLength(ADDRESS_RECENTS_MAX);
      expect(loaded[0]).toEqual(CUPERTINO);
    });

    it('swallows write errors (recents are convenience, not critical)', async () => {
      const original = mockStorage.setItem;
      mockStorage.setItem = jest.fn(async () => {
        throw new Error('disk full');
      });
      // Should NOT throw — convenience feature failure shouldn't break UX.
      await expect(saveRecents([CUPERTINO])).resolves.toBeUndefined();
      mockStorage.setItem = original;
    });
  });

  describe('clearRecents', () => {
    it('removes the key from storage', async () => {
      await saveRecents([CUPERTINO, SEATTLE]);
      expect(await loadRecents()).toHaveLength(2);
      await clearRecents();
      expect(await loadRecents()).toEqual([]);
    });

    it('is a no-op when nothing is saved', async () => {
      await expect(clearRecents()).resolves.toBeUndefined();
      expect(await loadRecents()).toEqual([]);
    });
  });
});
