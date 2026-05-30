/**
 * Tests for src/lib/points.ts:
 *   - getLastSeenPoints (AsyncStorage read + parse)
 *   - setLastSeenPoints (AsyncStorage write + non-negative clamp)
 *   - fetchCurrentPoints (Supabase read — previously deferred, now mocked)
 *
 * Behaviour locked in:
 *  - null when never recorded (NOT 0 — "first-ever observation" should NOT
 *    trigger a "+N earned while away" toast).
 *  - null when storage holds garbage that can't be parsed.
 *  - Negative writes clamp to 0 — toast logic uses absolute deltas so a
 *    negative stored value would invert the comparison.
 *  - Storage errors are swallowed (UI never throws).
 *  - fetchCurrentPoints returns null on any Supabase error or missing user,
 *    and also guards against a non-number `points` column value.
 */

const mockStorage: Record<string, string> = {};
let mockThrowOnGet = false;
let mockThrowOnSet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (mockThrowOnGet) {
        mockThrowOnGet = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in mockStorage ? mockStorage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (mockThrowOnSet) {
        mockThrowOnSet = false;
        return Promise.reject(new Error('boom'));
      }
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

// Supabase mock — chained builder used by fetchCurrentPoints:
//   supabase.from('users').select('points').eq('id', userId).maybySingle()
// getLastSeenPoints and setLastSeenPoints use AsyncStorage only and are
// completely unaffected by how this mock is configured.
const mockMaybySingle = jest.fn();
const mockPointsEq = jest.fn();
const mockPointsSelect = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({ select: mockPointsSelect })),
  },
}));

import { fetchCurrentPoints, getLastSeenPoints, setLastSeenPoints } from '../points';

const userId = 'u1';
const KEY = `@accessmap/points_last_seen_v1:${userId}`;

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowOnGet = false;
  mockThrowOnSet = false;
  // Wire the Supabase chain. Default: "no row found, no error".
  // Individual tests override with mockResolvedValueOnce as needed.
  mockPointsSelect.mockReturnValue({ eq: mockPointsEq });
  mockPointsEq.mockReturnValue({ maybeSingle: mockMaybySingle });
  mockMaybySingle.mockResolvedValue({ data: null, error: null });
});

// ---------------------------------------------------------------------------
// getLastSeenPoints
// ---------------------------------------------------------------------------
describe('getLastSeenPoints', () => {
  it('returns null when no value has ever been stored', async () => {
    expect(await getLastSeenPoints(userId)).toBeNull();
  });

  it('returns the stored integer when present', async () => {
    mockStorage[KEY] = '42';
    expect(await getLastSeenPoints(userId)).toBe(42);
  });

  it('returns null for a stored value that is not a finite number', async () => {
    mockStorage[KEY] = 'not-a-number';
    expect(await getLastSeenPoints(userId)).toBeNull();
  });

  it('returns null when mockStorage rejects', async () => {
    mockStorage[KEY] = '7';
    mockThrowOnGet = true;
    expect(await getLastSeenPoints(userId)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setLastSeenPoints
// ---------------------------------------------------------------------------
describe('setLastSeenPoints', () => {
  it('writes the value as a string', async () => {
    await setLastSeenPoints(userId, 17);
    expect(mockStorage[KEY]).toBe('17');
  });

  it('clamps negative values to 0 (no inverted deltas next launch)', async () => {
    await setLastSeenPoints(userId, -5);
    expect(mockStorage[KEY]).toBe('0');
  });

  it('round-trips through get correctly', async () => {
    await setLastSeenPoints(userId, 123);
    expect(await getLastSeenPoints(userId)).toBe(123);
  });

  it('swallows mockStorage errors silently (UI never throws)', async () => {
    mockThrowOnSet = true;
    await expect(setLastSeenPoints(userId, 5)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// fetchCurrentPoints — Supabase path
// ---------------------------------------------------------------------------
// Covers lines 38-47 which were 0% because fetchCurrentPoints makes a real
// Supabase query. The chain: from('users').select('points').eq(id).maybySingle().
describe('fetchCurrentPoints', () => {
  it('returns the points value when the user row exists', async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { points: 42 }, error: null });
    expect(await fetchCurrentPoints(userId)).toBe(42);
  });

  it('returns 0 when points is 0 (valid zero — not falsy)', async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { points: 0 }, error: null });
    expect(await fetchCurrentPoints(userId)).toBe(0);
  });

  it('returns null when the Supabase query returns an error', async () => {
    mockMaybySingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection refused' },
    });
    expect(await fetchCurrentPoints(userId)).toBeNull();
  });

  it('returns null when data is null (user not found in public.users)', async () => {
    // Default mock already returns { data: null, error: null } — explicit here.
    mockMaybySingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchCurrentPoints(userId)).toBeNull();
  });

  it('returns null when points is not a number (defensive type guard)', async () => {
    // Guards against a future migration or stale data returning a string.
    mockMaybySingle.mockResolvedValueOnce({ data: { points: '42' }, error: null });
    expect(await fetchCurrentPoints(userId)).toBeNull();
  });

  it('returns null when points is null inside data (nullable column)', async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { points: null }, error: null });
    expect(await fetchCurrentPoints(userId)).toBeNull();
  });
});
