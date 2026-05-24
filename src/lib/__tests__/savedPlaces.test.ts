import {
  addPlace,
  loadPlaces,
  MAX_NAME_LENGTH,
  MAX_PLACES,
  normalizePlaceName,
  removePlace,
  renamePlace,
  SavedPlacesError,
} from '../savedPlaces';

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
    },
  };
});

const mockStorage =
  jest.requireMock('@react-native-async-storage/async-storage').default;

const USER = 'u1';
const SEATTLE = { lat: 47.6062, lng: -122.3321 };
const BELLEVUE = { lat: 47.6101, lng: -122.2015 };

describe('savedPlaces', () => {
  beforeEach(() => {
    mockStorage.__reset();
    jest.clearAllMocks();
  });

  describe('normalizePlaceName', () => {
    it('trims surrounding whitespace', () => {
      expect(normalizePlaceName('  Home  ')).toBe('Home');
    });

    it('collapses internal whitespace', () => {
      expect(normalizePlaceName('My   Favorite\t\tCafe')).toBe(
        'My Favorite Cafe',
      );
    });

    it('returns null for empty / whitespace-only input', () => {
      expect(normalizePlaceName('')).toBeNull();
      expect(normalizePlaceName('   ')).toBeNull();
      expect(normalizePlaceName('\n\t')).toBeNull();
    });

    it('caps length at MAX_NAME_LENGTH', () => {
      const long = 'A'.repeat(MAX_NAME_LENGTH + 50);
      expect(normalizePlaceName(long)?.length).toBe(MAX_NAME_LENGTH);
    });
  });

  describe('loadPlaces', () => {
    it('returns empty array for a never-saved user', async () => {
      expect(await loadPlaces(USER)).toEqual([]);
    });

    it('round-trips a single added place', async () => {
      await addPlace(USER, { name: 'Home', ...SEATTLE });
      const loaded = await loadPlaces(USER);
      expect(loaded).toHaveLength(1);
      expect(loaded[0]!.name).toBe('Home');
      expect(loaded[0]!.lat).toBe(SEATTLE.lat);
      expect(loaded[0]!.lng).toBe(SEATTLE.lng);
    });

    it('returns [] on invalid JSON', async () => {
      mockStorage.__setRaw('@accessmap/saved_places_v1:u1', '{not json');
      expect(await loadPlaces(USER)).toEqual([]);
    });

    it('returns [] when the stored value is not an array', async () => {
      mockStorage.__setRaw(
        '@accessmap/saved_places_v1:u1',
        '{"id":"a","name":"X"}',
      );
      expect(await loadPlaces(USER)).toEqual([]);
    });

    it('drops malformed entries (missing fields, bad coords)', async () => {
      mockStorage.__setRaw(
        '@accessmap/saved_places_v1:u1',
        JSON.stringify([
          { id: 'a', name: 'Good', lat: 47, lng: -122, created_at: 'x' },
          { id: 'b', name: '', lat: 47, lng: -122, created_at: 'x' },
          { id: 'c', name: 'OOB Lat', lat: 999, lng: -122, created_at: 'x' },
          { id: 'd', name: 'NaN', lat: NaN, lng: -122, created_at: 'x' },
          { id: 'e', name: 'No coords', created_at: 'x' },
          'not even an object',
        ]),
      );
      const loaded = await loadPlaces(USER);
      expect(loaded).toHaveLength(1);
      expect(loaded[0]!.id).toBe('a');
    });
  });

  describe('addPlace', () => {
    it('rejects empty names with invalid_name', async () => {
      await expect(
        addPlace(USER, { name: '   ', ...SEATTLE }),
      ).rejects.toBeInstanceOf(SavedPlacesError);
      try {
        await addPlace(USER, { name: '', ...SEATTLE });
      } catch (e) {
        expect((e as SavedPlacesError).code).toBe('invalid_name');
      }
    });

    it('rejects out-of-range coords with invalid_coords', async () => {
      await expect(
        addPlace(USER, { name: 'Bad', lat: 999, lng: -122 }),
      ).rejects.toBeInstanceOf(SavedPlacesError);
      try {
        await addPlace(USER, { name: 'Bad', lat: 47, lng: -999 });
      } catch (e) {
        expect((e as SavedPlacesError).code).toBe('invalid_coords');
      }
    });

    it('rejects NaN coords', async () => {
      await expect(
        addPlace(USER, { name: 'NaN', lat: NaN, lng: -122 }),
      ).rejects.toBeInstanceOf(SavedPlacesError);
    });

    it('rejects case-insensitive duplicate names', async () => {
      await addPlace(USER, { name: 'Home', ...SEATTLE });
      await expect(
        addPlace(USER, { name: 'home', ...BELLEVUE }),
      ).rejects.toBeInstanceOf(SavedPlacesError);
      try {
        await addPlace(USER, { name: 'HOME', ...BELLEVUE });
      } catch (e) {
        expect((e as SavedPlacesError).code).toBe('duplicate_name');
      }
    });

    it('preserves insertion order', async () => {
      await addPlace(USER, { name: 'First', ...SEATTLE });
      await addPlace(USER, { name: 'Second', ...BELLEVUE });
      await addPlace(USER, { name: 'Third', lat: 47.7, lng: -122.4 });
      const loaded = await loadPlaces(USER);
      expect(loaded.map((p) => p.name)).toEqual(['First', 'Second', 'Third']);
    });

    it('rejects with limit_reached at MAX_PLACES', async () => {
      // Seed MAX_PLACES already.
      const seeded: any[] = [];
      for (let i = 0; i < MAX_PLACES; i++) {
        seeded.push({
          id: `p${i}`,
          name: `Place ${i}`,
          lat: 47,
          lng: -122,
          created_at: new Date().toISOString(),
        });
      }
      mockStorage.__setRaw(
        '@accessmap/saved_places_v1:u1',
        JSON.stringify(seeded),
      );
      await expect(
        addPlace(USER, { name: 'One too many', ...SEATTLE }),
      ).rejects.toBeInstanceOf(SavedPlacesError);
      try {
        await addPlace(USER, { name: 'One too many', ...SEATTLE });
      } catch (e) {
        expect((e as SavedPlacesError).code).toBe('limit_reached');
      }
    });
  });

  describe('removePlace', () => {
    it('removes the matching place', async () => {
      const a = await addPlace(USER, { name: 'A', ...SEATTLE });
      await addPlace(USER, { name: 'B', ...BELLEVUE });
      await removePlace(USER, a.id);
      const loaded = await loadPlaces(USER);
      expect(loaded).toHaveLength(1);
      expect(loaded[0]!.name).toBe('B');
    });

    it('is a no-op when the id is not found', async () => {
      await addPlace(USER, { name: 'A', ...SEATTLE });
      await removePlace(USER, 'nonexistent');
      const loaded = await loadPlaces(USER);
      expect(loaded).toHaveLength(1);
    });
  });

  describe('renamePlace', () => {
    it('renames an existing place', async () => {
      const a = await addPlace(USER, { name: 'Home', ...SEATTLE });
      const updated = await renamePlace(USER, a.id, 'Apartment');
      expect(updated?.name).toBe('Apartment');
      const loaded = await loadPlaces(USER);
      expect(loaded[0]!.name).toBe('Apartment');
    });

    it('returns null when the place id is not found', async () => {
      await addPlace(USER, { name: 'A', ...SEATTLE });
      const result = await renamePlace(USER, 'nonexistent', 'Whatever');
      expect(result).toBeNull();
    });

    it('rejects renaming to an existing other place name (case-insensitive)', async () => {
      await addPlace(USER, { name: 'Home', ...SEATTLE });
      const b = await addPlace(USER, { name: 'Work', ...BELLEVUE });
      await expect(renamePlace(USER, b.id, 'HOME')).rejects.toBeInstanceOf(
        SavedPlacesError,
      );
    });

    it("allows renaming a place to a casing of its own current name", async () => {
      const a = await addPlace(USER, { name: 'home', ...SEATTLE });
      const updated = await renamePlace(USER, a.id, 'Home');
      expect(updated?.name).toBe('Home');
    });
  });

  describe('per-user isolation', () => {
    it('does not leak places between users', async () => {
      await addPlace('alice', { name: 'Alice Home', ...SEATTLE });
      await addPlace('bob', { name: 'Bob Home', ...BELLEVUE });
      const aliceLoaded = await loadPlaces('alice');
      const bobLoaded = await loadPlaces('bob');
      expect(aliceLoaded.map((p) => p.name)).toEqual(['Alice Home']);
      expect(bobLoaded.map((p) => p.name)).toEqual(['Bob Home']);
    });
  });

  describe('storage integrity (QA PL1)', () => {
    it('parsePlaces truncates to MAX_PLACES on read (QA E3)', async () => {
      // Simulate corrupt/forced over-cap storage.
      const oversized: any[] = [];
      for (let i = 0; i < MAX_PLACES + 7; i++) {
        oversized.push({
          id: `p${i}`,
          name: `Place ${i}`,
          lat: 47,
          lng: -122,
          created_at: new Date().toISOString(),
        });
      }
      mockStorage.__setRaw(
        '@accessmap/saved_places_v1:u1',
        JSON.stringify(oversized),
      );
      const loaded = await loadPlaces(USER);
      expect(loaded.length).toBe(MAX_PLACES);
    });

    it('addPlace propagates AsyncStorage write failures (QA C1)', async () => {
      const original = mockStorage.setItem;
      // Force the next setItem to reject — previously the silent-warn
      // would swallow this and let addPlace return success.
      mockStorage.setItem = jest.fn(async () => {
        throw new Error('disk full');
      });
      await expect(
        addPlace(USER, { name: 'Will fail', ...SEATTLE }),
      ).rejects.toThrow('disk full');
      mockStorage.setItem = original;
      // Storage is empty — the failed write didn't half-commit.
      expect(await loadPlaces(USER)).toEqual([]);
    });

    it('serializes concurrent addPlace calls (QA E2)', async () => {
      // Fire 5 add operations in parallel. Without the write lock, two
      // racing load-modify-save chains would clobber each other and the
      // final list would be shorter than 5.
      await Promise.all([
        addPlace(USER, { name: 'P1', ...SEATTLE }),
        addPlace(USER, { name: 'P2', ...BELLEVUE }),
        addPlace(USER, { name: 'P3', lat: 47.7, lng: -122.4 }),
        addPlace(USER, { name: 'P4', lat: 47.8, lng: -122.5 }),
        addPlace(USER, { name: 'P5', lat: 47.9, lng: -122.6 }),
      ]);
      const loaded = await loadPlaces(USER);
      expect(loaded.length).toBe(5);
      expect(loaded.map((p) => p.name).sort()).toEqual(
        ['P1', 'P2', 'P3', 'P4', 'P5'].sort(),
      );
    });

    it('serializes a concurrent add + remove without resurrecting the deleted place', async () => {
      const a = await addPlace(USER, { name: 'A', ...SEATTLE });
      // Now fire remove + add in parallel — the lock should serialize.
      await Promise.all([
        removePlace(USER, a.id),
        addPlace(USER, { name: 'B', ...BELLEVUE }),
      ]);
      const loaded = await loadPlaces(USER);
      expect(loaded.length).toBe(1);
      expect(loaded[0]!.name).toBe('B');
    });

    it('does not leak write-queue entries after operations complete', async () => {
      await addPlace(USER, { name: 'A', ...SEATTLE });
      await removePlace(USER, 'nonexistent');
      // Give the .finally cleanup a microtask to run.
      await Promise.resolve();
      // Spy not necessary — just verify the next add works cleanly
      // (no stale rejected promise blocking the chain).
      await expect(
        addPlace(USER, { name: 'B', ...BELLEVUE }),
      ).resolves.toBeDefined();
    });
  });
});
