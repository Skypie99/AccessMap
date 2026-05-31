/**
 * Tests for src/lib/anonRateLimit.ts — per-device anonymous submission guard.
 *
 * What we lock in:
 *  - checkAnonRateLimit allows 0–4 recent submissions (under the cap) and
 *    throws on the 5th.
 *  - Timestamps older than 24 h are invisible to the rate limiter (sliding
 *    window).
 *  - recordAnonSubmit appends a timestamp and prunes expired ones.
 *  - The AsyncStorage key is 'anon_submit_timestamps' (changing it would
 *    silently drop all previous counts on user devices).
 *  - The round-trip (check → record × N → check) behaves correctly.
 *
 * The global AsyncStorage mock from jest.setup.js is overridden here with an
 * in-memory store so we can seed and inspect it directly — same pattern as
 * addressRecents.test.ts.
 *
 * Date.now() is spied on so the 24-hour sliding window is deterministic.
 */

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

const mockStorage = jest.requireMock('@react-native-async-storage/async-storage').default;

import { checkAnonRateLimit, recordAnonSubmit } from '../anonRateLimit';

const STORAGE_KEY = 'anon_submit_timestamps';
const WINDOW_MS = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

let dateNowSpy: jest.SpyInstance;

beforeEach(() => {
  mockStorage.__reset();
  dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  dateNowSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// checkAnonRateLimit
// ---------------------------------------------------------------------------

describe('checkAnonRateLimit', () => {
  it('allows submission when no timestamps are stored', async () => {
    await expect(checkAnonRateLimit()).resolves.toBeUndefined();
  });

  it('allows the 4th submission (3 recent already stored)', async () => {
    const three = [NOW - 1000, NOW - 2000, NOW - 3000];
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify(three));
    await expect(checkAnonRateLimit()).resolves.toBeUndefined();
  });

  it('allows exactly 4 stored recent timestamps (still under the 5-per-24h cap)', async () => {
    const four = [NOW - 100, NOW - 200, NOW - 300, NOW - 400];
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify(four));
    await expect(checkAnonRateLimit()).resolves.toBeUndefined();
  });

  it('blocks when 5 recent timestamps are already stored (cap exceeded)', async () => {
    const five = [NOW - 100, NOW - 200, NOW - 300, NOW - 400, NOW - 500];
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify(five));
    await expect(checkAnonRateLimit()).rejects.toThrow(/5 anonymous reports/);
  });

  it('error message mentions sign-in as the escape hatch', async () => {
    const five = [NOW - 1, NOW - 2, NOW - 3, NOW - 4, NOW - 5];
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify(five));
    await expect(checkAnonRateLimit()).rejects.toThrow(/sign in/i);
  });

  it('ignores timestamps older than 24 h when checking the window', async () => {
    // 4 expired + 1 recent = only 1 counts → still under the cap.
    const fourExpired = [
      NOW - WINDOW_MS - 1,
      NOW - WINDOW_MS - 2,
      NOW - WINDOW_MS - 3,
      NOW - WINDOW_MS - 4,
    ];
    const oneRecent = NOW - 500;
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify([...fourExpired, oneRecent]));
    await expect(checkAnonRateLimit()).resolves.toBeUndefined();
  });

  it('blocks when 5 recent + any number of expired timestamps are stored', async () => {
    const twoExpired = [NOW - WINDOW_MS - 100, NOW - WINDOW_MS - 200];
    const fiveRecent = [NOW - 1, NOW - 2, NOW - 3, NOW - 4, NOW - 5];
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify([...twoExpired, ...fiveRecent]));
    await expect(checkAnonRateLimit()).rejects.toThrow(/5 anonymous reports/);
  });

  it('reads from the correct AsyncStorage key', async () => {
    await checkAnonRateLimit();
    expect(mockStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('tolerates corrupt JSON in storage (treats as empty)', async () => {
    mockStorage.__setRaw(STORAGE_KEY, 'this is not json');
    await expect(checkAnonRateLimit()).resolves.toBeUndefined();
  });

  it('tolerates a non-array stored value (treats as empty)', async () => {
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify({ count: 5 }));
    await expect(checkAnonRateLimit()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// recordAnonSubmit
// ---------------------------------------------------------------------------

describe('recordAnonSubmit', () => {
  it('creates a timestamp entry when storage is empty', async () => {
    await recordAnonSubmit();
    const raw = mockStorage.__peek(STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect((parsed as number[])[0]).toBe(NOW);
  });

  it('appends to existing timestamps', async () => {
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify([NOW - 100]));
    await recordAnonSubmit();
    const parsed: number[] = JSON.parse(mockStorage.__peek(STORAGE_KEY));
    expect(parsed).toHaveLength(2);
    expect(parsed).toContain(NOW);
  });

  it('prunes expired timestamps when recording a new one', async () => {
    const expired = [NOW - WINDOW_MS - 1, NOW - WINDOW_MS - 2];
    const recent = [NOW - 100];
    mockStorage.__setRaw(STORAGE_KEY, JSON.stringify([...expired, ...recent]));
    await recordAnonSubmit();
    const parsed: number[] = JSON.parse(mockStorage.__peek(STORAGE_KEY));
    // 1 surviving recent + 1 new = 2 (the 2 expired are gone)
    expect(parsed).toHaveLength(2);
    for (const ts of parsed) {
      expect(ts).toBeGreaterThan(NOW - WINDOW_MS);
    }
  });

  it('writes to the correct AsyncStorage key', async () => {
    await recordAnonSubmit();
    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
  });

  it('does not throw when AsyncStorage write fails', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(recordAnonSubmit()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Round-trip: check → record × N → check
// ---------------------------------------------------------------------------

describe('rate-limit round-trip', () => {
  it('allows 5 sequential record+check cycles and blocks the 6th check', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(checkAnonRateLimit()).resolves.toBeUndefined();
      await recordAnonSubmit();
    }
    await expect(checkAnonRateLimit()).rejects.toThrow(/5 anonymous reports/);
  });
});
