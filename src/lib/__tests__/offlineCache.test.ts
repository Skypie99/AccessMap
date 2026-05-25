/**
 * Tests for the offline cache helpers in flagsStore.tsx.
 *
 * Covers:
 *   - offlineCacheKey: user-scoped key format (Jordan Condition 2)
 *   - MAX_CACHE_AGE_MS: 24-hour TTL constant (Jordan Condition 3)
 *   - writeFlagsCache: capping at INITIAL_PAGE_SIZE (Jordan Condition 4) + storage write
 *   - readFlagsCache: happy path, TTL rejection, bad JSON, empty storage
 */

import {
  MAX_CACHE_AGE_MS,
  __readFlagsCache,
  __writeFlagsCache,
  offlineCacheKey,
} from '../flagsStore';
import { INITIAL_PAGE_SIZE } from '../flags';
import type { FlagRow } from '@/types/database';

jest.mock('../supabase', () => ({ supabase: {} }));

// ---------------------------------------------------------------------------
// AsyncStorage mock — in-memory store with reset and raw-set helpers.
// Matches the pattern used by notificationPrefs.test.ts.
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
      __getStore: () => store,
    },
  };
});

const mockStorage =
  jest.requireMock('@react-native-async-storage/async-storage').default;

// ---------------------------------------------------------------------------
// Minimal FlagRow factory — only the fields that readFlagsCache cares about.
// ---------------------------------------------------------------------------
function makeFlagRow(overrides: Partial<FlagRow> = {}): FlagRow {
  return {
    id: overrides.id ?? 'flag-1',
    user_id: 'user-abc',
    lat: 37.7749,
    lng: -122.4194,
    category: 'no_ramp',
    severity: 3,
    status: 'open',
    description: null,
    photo_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as FlagRow;
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  mockStorage.__reset();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// offlineCacheKey
// ---------------------------------------------------------------------------
describe('offlineCacheKey', () => {
  it('returns the namespaced key for a given userId', () => {
    expect(offlineCacheKey('u-123')).toBe('@accessmap/offline_flags_v1:u-123');
  });

  it('produces distinct keys for different users (Jordan Condition 2)', () => {
    expect(offlineCacheKey('alice')).not.toBe(offlineCacheKey('bob'));
  });
});

// ---------------------------------------------------------------------------
// MAX_CACHE_AGE_MS
// ---------------------------------------------------------------------------
describe('MAX_CACHE_AGE_MS', () => {
  it('equals 24 hours in milliseconds (Jordan Condition 3)', () => {
    expect(MAX_CACHE_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// __writeFlagsCache / __readFlagsCache — round-trip
// ---------------------------------------------------------------------------
describe('offline cache round-trip', () => {
  it('stores rows and retrieves them', async () => {
    const rows = [makeFlagRow({ id: 'f1' }), makeFlagRow({ id: 'f2' })];
    await __writeFlagsCache('user-1', rows);
    const result = (await __readFlagsCache('user-1')) as FlagRow[];
    expect(result).toHaveLength(2);
    expect(result.at(0)?.id).toBe('f1');
    expect(result.at(1)?.id).toBe('f2');
  });

  it('returns null when nothing has been written', async () => {
    expect(await __readFlagsCache('unknown-user')).toBeNull();
  });

  it('is user-scoped — reading with a different userId returns null (Jordan Condition 2)', async () => {
    await __writeFlagsCache('alice', [makeFlagRow({ id: 'f-alice' })]);
    expect(await __readFlagsCache('bob')).toBeNull();
    const alice = (await __readFlagsCache('alice')) as FlagRow[];
    expect(alice).not.toBeNull();
    expect(alice.at(0)?.id).toBe('f-alice');
  });
});

// ---------------------------------------------------------------------------
// Jordan Condition 4 — cap at INITIAL_PAGE_SIZE
// ---------------------------------------------------------------------------
describe('INITIAL_PAGE_SIZE cap (Jordan Condition 4)', () => {
  it('truncates rows to INITIAL_PAGE_SIZE when more are provided', async () => {
    // Build INITIAL_PAGE_SIZE + 10 rows so we're clearly over the cap.
    const rows = Array.from({ length: INITIAL_PAGE_SIZE + 10 }, (_, i) =>
      makeFlagRow({ id: `flag-${i}` }),
    );
    await __writeFlagsCache('user-cap', rows);
    const result = (await __readFlagsCache('user-cap')) as FlagRow[];
    expect(result).toHaveLength(INITIAL_PAGE_SIZE);
    // Verify the FIRST INITIAL_PAGE_SIZE are kept (not the tail).
    expect(result.at(0)?.id).toBe('flag-0');
    expect(result.at(INITIAL_PAGE_SIZE - 1)?.id).toBe(`flag-${INITIAL_PAGE_SIZE - 1}`);
  });

  it('keeps all rows when count is below INITIAL_PAGE_SIZE', async () => {
    const rows = [makeFlagRow({ id: 'a' }), makeFlagRow({ id: 'b' })];
    await __writeFlagsCache('user-small', rows);
    const result = await __readFlagsCache('user-small');
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Jordan Condition 3 — 24-hour TTL
// ---------------------------------------------------------------------------
describe('TTL rejection (Jordan Condition 3)', () => {
  it('returns cached rows when within the TTL', async () => {
    const rows = [makeFlagRow({ id: 'fresh' })];
    await __writeFlagsCache('user-ttl', rows);
    // No time manipulation needed — just written, so age ≈ 0 ms.
    const result = (await __readFlagsCache('user-ttl')) as FlagRow[];
    expect(result).not.toBeNull();
    expect(result.at(0)?.id).toBe('fresh');
  });

  it('returns null when the entry is older than MAX_CACHE_AGE_MS', async () => {
    const staleTimestamp = new Date(
      Date.now() - MAX_CACHE_AGE_MS - 1000,
    ).toISOString();
    const entry = {
      cachedAt: staleTimestamp,
      rows: [makeFlagRow({ id: 'stale' })],
    };
    mockStorage.__setRaw(offlineCacheKey('user-stale'), JSON.stringify(entry));
    expect(await __readFlagsCache('user-stale')).toBeNull();
  });

  it('returns rows when cachedAt is exactly at the TTL boundary (inclusive edge)', async () => {
    // cachedAt = now - MAX_CACHE_AGE_MS + 1 → still within TTL
    const justFreshTimestamp = new Date(
      Date.now() - MAX_CACHE_AGE_MS + 1,
    ).toISOString();
    const entry = {
      cachedAt: justFreshTimestamp,
      rows: [makeFlagRow({ id: 'edge' })],
    };
    mockStorage.__setRaw(offlineCacheKey('user-edge'), JSON.stringify(entry));
    const result = (await __readFlagsCache('user-edge')) as FlagRow[];
    expect(result).not.toBeNull();
    expect(result.at(0)?.id).toBe('edge');
  });
});

// ---------------------------------------------------------------------------
// Defensive read — bad/corrupt storage
// ---------------------------------------------------------------------------
describe('defensive read behavior', () => {
  it('returns null on invalid JSON', async () => {
    mockStorage.__setRaw(offlineCacheKey('user-corrupt'), '{not json');
    expect(await __readFlagsCache('user-corrupt')).toBeNull();
  });

  it('returns null when entry has wrong shape (missing rows)', async () => {
    mockStorage.__setRaw(
      offlineCacheKey('user-shape'),
      JSON.stringify({ cachedAt: new Date().toISOString() }),
    );
    expect(await __readFlagsCache('user-shape')).toBeNull();
  });

  it('returns null when entry has wrong shape (missing cachedAt)', async () => {
    mockStorage.__setRaw(
      offlineCacheKey('user-shape2'),
      JSON.stringify({ rows: [] }),
    );
    expect(await __readFlagsCache('user-shape2')).toBeNull();
  });

  it('returns null when entry is null in storage', async () => {
    // mockStorage.getItem returns null for unknown keys.
    expect(await __readFlagsCache('never-written')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Write failure — non-fatal
// ---------------------------------------------------------------------------
describe('write failure handling', () => {
  it('does not throw when AsyncStorage.setItem rejects', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
    // Should not throw — write failure is logged + ignored.
    await expect(
      __writeFlagsCache('user-fail', [makeFlagRow()]),
    ).resolves.toBeUndefined();
  });
});
