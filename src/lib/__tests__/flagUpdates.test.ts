import {
  diffUpdates,
  loadLastSeen,
  markAllSeen,
  MAX_TRACKED,
  nextLastSeen,
} from '../flagUpdates';
import type { FlagRow, FlagStatus } from '@/types/database';

// AsyncStorage mock — same in-memory pattern as watchedFlags tests.
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
      __getRaw: (k: string) => store.get(k) ?? null,
    },
  };
});

const mockStorage =
  jest.requireMock('@react-native-async-storage/async-storage').default;

function makeFlag(id: string, status: FlagStatus): FlagRow {
  return {
    id,
    user_id: 'u1',
    lat: 47,
    lng: -122,
    category: 'no_ramp',
    severity: 3,
    description: null,
    photo_url: null,
    status,
    created_at: new Date(2026, 4, 23).toISOString(),
  };
}

describe('flagUpdates', () => {
  beforeEach(() => {
    mockStorage.__reset();
    jest.clearAllMocks();
  });

  describe('loadLastSeen', () => {
    it('returns empty object for a never-saved user', async () => {
      expect(await loadLastSeen('u1')).toEqual({});
    });

    it('round-trips a saved map', async () => {
      await markAllSeen('u1', [makeFlag('a', 'open'), makeFlag('b', 'verified')]);
      const loaded = await loadLastSeen('u1');
      expect(loaded).toEqual({ a: 'open', b: 'verified' });
    });

    it('returns empty object on invalid JSON', async () => {
      mockStorage.setItem('@accessmap/flag_last_seen_v1:u1', '{not json');
      expect(await loadLastSeen('u1')).toEqual({});
    });

    it('returns empty object when the stored value is not an object', async () => {
      mockStorage.setItem('@accessmap/flag_last_seen_v1:u1', '"a string"');
      expect(await loadLastSeen('u1')).toEqual({});
    });

    it('returns empty object when the stored value is an array', async () => {
      mockStorage.setItem('@accessmap/flag_last_seen_v1:u1', '["a","b"]');
      expect(await loadLastSeen('u1')).toEqual({});
    });

    it('drops entries with invalid status strings', async () => {
      mockStorage.setItem(
        '@accessmap/flag_last_seen_v1:u1',
        JSON.stringify({ a: 'open', b: 'bogus', c: 'resolved' }),
      );
      expect(await loadLastSeen('u1')).toEqual({ a: 'open', c: 'resolved' });
    });
  });

  describe('diffUpdates', () => {
    it('returns an empty list when nothing changed', () => {
      const flags = [makeFlag('a', 'open'), makeFlag('b', 'verified')];
      const seen = { a: 'open' as const, b: 'verified' as const };
      expect(diffUpdates(flags, seen)).toEqual([]);
    });

    it('detects a status change from open to verified', () => {
      const flags = [makeFlag('a', 'verified')];
      const seen = { a: 'open' as const };
      const updates = diffUpdates(flags, seen);
      expect(updates).toHaveLength(1);
      expect(updates[0]!.fromStatus).toBe('open');
      expect(updates[0]!.toStatus).toBe('verified');
      expect(updates[0]!.flag.id).toBe('a');
    });

    it('detects backward status changes (e.g. verified back to open)', () => {
      const flags = [makeFlag('a', 'open')];
      const seen = { a: 'verified' as const };
      expect(diffUpdates(flags, seen)).toHaveLength(1);
    });

    it('ignores flags with no prior record (first-time-seen)', () => {
      const flags = [makeFlag('a', 'open'), makeFlag('b', 'verified')];
      // Only 'a' has a baseline; 'b' is brand new.
      const seen = { a: 'open' as const };
      expect(diffUpdates(flags, seen)).toEqual([]);
    });

    it('handles a mix of new, unchanged, and changed flags', () => {
      const flags = [
        makeFlag('changed', 'resolved'),
        makeFlag('same', 'open'),
        makeFlag('new', 'verified'),
      ];
      const seen = {
        changed: 'verified' as const,
        same: 'open' as const,
      };
      const updates = diffUpdates(flags, seen);
      expect(updates).toHaveLength(1);
      expect(updates[0]!.flag.id).toBe('changed');
    });
  });

  describe('nextLastSeen', () => {
    it('merges new flags into an empty baseline', () => {
      const merged = nextLastSeen(
        [makeFlag('a', 'open'), makeFlag('b', 'verified')],
        {},
      );
      expect(merged).toEqual({ a: 'open', b: 'verified' });
    });

    it('overwrites existing entries with the current status', () => {
      const merged = nextLastSeen([makeFlag('a', 'verified')], { a: 'open' });
      expect(merged).toEqual({ a: 'verified' });
    });

    it('preserves untouched entries', () => {
      const merged = nextLastSeen([makeFlag('a', 'verified')], {
        a: 'open',
        b: 'resolved',
      });
      expect(merged).toEqual({ a: 'verified', b: 'resolved' });
    });

    it('caps the resulting map at MAX_TRACKED entries', () => {
      // Simulate an over-capacity existing map.
      const existing: Record<string, FlagStatus> = {};
      for (let i = 0; i < MAX_TRACKED + 10; i++) {
        existing[`old-${i}`] = 'open';
      }
      const merged = nextLastSeen([makeFlag('new', 'verified')], existing);
      expect(Object.keys(merged).length).toBeLessThanOrEqual(MAX_TRACKED);
      // The freshly-merged "new" entry must survive the trim.
      expect(merged.new).toBe('verified');
    });
  });

  describe('markAllSeen', () => {
    it('persists the merged map', async () => {
      await markAllSeen('u1', [makeFlag('a', 'open')]);
      const reload = await loadLastSeen('u1');
      expect(reload).toEqual({ a: 'open' });
    });

    it('updates baselines so subsequent diffs are empty', async () => {
      // First visit: a was open.
      await markAllSeen('u1', [makeFlag('a', 'open')]);
      // Server side a became verified.
      const seen = await loadLastSeen('u1');
      expect(diffUpdates([makeFlag('a', 'verified')], seen)).toHaveLength(1);

      // User opens the feed → markAllSeen with current state.
      await markAllSeen('u1', [makeFlag('a', 'verified')]);

      // Now diff against fresh server state — no updates.
      const seen2 = await loadLastSeen('u1');
      expect(diffUpdates([makeFlag('a', 'verified')], seen2)).toEqual([]);
    });

    it('is per-user isolated', async () => {
      await markAllSeen('u1', [makeFlag('a', 'open')]);
      await markAllSeen('u2', [makeFlag('a', 'resolved')]);
      expect(await loadLastSeen('u1')).toEqual({ a: 'open' });
      expect(await loadLastSeen('u2')).toEqual({ a: 'resolved' });
    });
  });
});
