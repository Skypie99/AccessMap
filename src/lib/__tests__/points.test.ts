/**
 * Tests for the pure / storage-only helpers in src/lib/points.ts:
 *   - getLastSeenPoints (storage read + parse)
 *   - setLastSeenPoints (storage write + non-negative clamp)
 *
 * `fetchCurrentPoints` is left out of this file because it talks to Supabase;
 * see qa-reports/proposal-testing-2026-05-23.md for the Supabase-mock strategy
 * — when that lands it becomes a sibling test file.
 *
 * Behaviour locked in:
 *  - null when never recorded (NOT 0 — the caller treats those differently:
 *    "first-ever observation" should NOT raise a "+N earned while away" toast).
 *  - null when storage holds garbage that can't be parsed.
 *  - Negative writes clamp to 0 — toast logic uses absolute deltas so a
 *    negative stored value would invert the comparison.
 *  - Storage errors are swallowed (UI never throws).
 */

const storage: Record<string, string> = {};
let throwOnGet = false;
let throwOnSet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (throwOnGet) {
        throwOnGet = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in storage ? storage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (throwOnSet) {
        throwOnSet = false;
        return Promise.reject(new Error('boom'));
      }
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
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
  for (const k of Object.keys(storage)) delete storage[k];
  throwOnGet = false;
  throwOnSet = false;
});

describe('getLastSeenPoints', () => {
  it('returns null when no value has ever been stored', async () => {
    expect(await getLastSeenPoints(userId)).toBeNull();
  });

  it('returns the stored integer when present', async () => {
    storage[KEY] = '42';
    expect(await getLastSeenPoints(userId)).toBe(42);
  });

  it('returns null for a stored value that is not a finite number', async () => {
    storage[KEY] = 'not-a-number';
    expect(await getLastSeenPoints(userId)).toBeNull();
  });

  it('returns null when storage rejects', async () => {
    storage[KEY] = '7';
    throwOnGet = true;
    expect(await getLastSeenPoints(userId)).toBeNull();
  });
});

describe('setLastSeenPoints', () => {
  it('writes the value as a string', async () => {
    await setLastSeenPoints(userId, 17);
    expect(storage[KEY]).toBe('17');
  });

  it('clamps negative values to 0 (no inverted deltas next launch)', async () => {
    await setLastSeenPoints(userId, -5);
    expect(storage[KEY]).toBe('0');
  });

  it('round-trips through get correctly', async () => {
    await setLastSeenPoints(userId, 123);
    expect(await getLastSeenPoints(userId)).toBe(123);
  });

  it('swallows storage errors silently (UI never throws)', async () => {
    throwOnSet = true;
    await expect(setLastSeenPoints(userId, 5)).resolves.toBeUndefined();
  });
});
