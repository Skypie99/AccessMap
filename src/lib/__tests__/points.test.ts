/**
 * Tests for the pure / storage-only helpers in src/lib/points.ts:
 *   - getLastSeenPoints (mockStorage read + parse)
 *   - setLastSeenPoints (mockStorage write + non-negative clamp)
 *
 * `fetchCurrentPoints` is left out of this file because it talks to Supabase;
 * see qa-reports/proposal-testing-2026-05-23.md for the Supabase-mock strategy
 * — when that lands it becomes a sibling test file.
 *
 * Behaviour locked in:
 *  - null when never recorded (NOT 0 — the caller treats those differently:
 *    "first-ever observation" should NOT raise a "+N earned while away" toast).
 *  - null when mockStorage holds garbage that can't be parsed.
 *  - Negative writes clamp to 0 — toast logic uses absolute deltas so a
 *    negative stored value would invert the comparison.
 *  - Storage errors are swallowed (UI never throws).
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

// supabase is imported transitively but never invoked in these tests.
// Stub it so the import doesn't try to read env vars at test time.
jest.mock('../supabase', () => ({ supabase: {} }));

import { getLastSeenPoints, setLastSeenPoints } from '../points';

const userId = 'u1';
const KEY = `@accessmap/points_last_seen_v1:${userId}`;

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowOnGet = false;
  mockThrowOnSet = false;
});

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
