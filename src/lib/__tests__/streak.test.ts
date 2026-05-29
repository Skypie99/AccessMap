import { applyVisit, EMPTY_STREAK, isoDay, loadStreak, tickVisit } from '../streak';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      __reset: () => store.clear(),
      __setRaw: (k: string, v: string) => store.set(k, v),
    },
  };
});

const mockStorage = jest.requireMock('@react-native-async-storage/async-storage').default;

describe('isoDay', () => {
  it('formats yyyy-mm-dd in local time', () => {
    // Constructed in local time so the day is unambiguous.
    expect(isoDay(new Date(2026, 4, 23, 10, 0, 0))).toBe('2026-05-23');
    expect(isoDay(new Date(2026, 0, 1, 23, 59, 0))).toBe('2026-01-01');
    expect(isoDay(new Date(2026, 11, 31, 0, 0, 0))).toBe('2026-12-31');
  });
});

describe('applyVisit (pure)', () => {
  it('starts current=1 on the first visit ever', () => {
    const next = applyVisit(EMPTY_STREAK, '2026-05-23');
    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
    expect(next.lastVisitDay).toBe('2026-05-23');
  });

  it('is idempotent within the same day', () => {
    const start = applyVisit(EMPTY_STREAK, '2026-05-23');
    const sameDay = applyVisit(start, '2026-05-23');
    expect(sameDay).toBe(start); // identity — no new object
  });

  it('extends the streak on consecutive days', () => {
    let s = applyVisit(EMPTY_STREAK, '2026-05-23');
    s = applyVisit(s, '2026-05-24');
    s = applyVisit(s, '2026-05-25');
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.lastVisitDay).toBe('2026-05-25');
  });

  it('resets to 1 after a two-day gap', () => {
    let s = applyVisit(EMPTY_STREAK, '2026-05-23');
    s = applyVisit(s, '2026-05-24'); // current 2
    s = applyVisit(s, '2026-05-27'); // gap of 3 days → reset
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2); // longest preserved
    expect(s.lastVisitDay).toBe('2026-05-27');
  });

  it('preserves longest across a streak reset', () => {
    let s = applyVisit(EMPTY_STREAK, '2026-05-01');
    for (let i = 2; i <= 10; i++) {
      s = applyVisit(s, `2026-05-${String(i).padStart(2, '0')}`);
    }
    expect(s.current).toBe(10);
    expect(s.longest).toBe(10);
    // Break the streak by skipping ahead.
    s = applyVisit(s, '2026-06-01');
    expect(s.current).toBe(1);
    expect(s.longest).toBe(10);
  });

  it('survives backwards clock skew without resetting', () => {
    let s = applyVisit(EMPTY_STREAK, '2026-05-23');
    // System clock somehow rewound — visit registered as yesterday.
    s = applyVisit(s, '2026-05-22');
    expect(s.current).toBe(1); // unchanged
    expect(s.lastVisitDay).toBe('2026-05-23'); // unchanged
  });

  it('handles a long sequence across month boundaries', () => {
    let s = EMPTY_STREAK;
    s = applyVisit(s, '2026-04-29');
    s = applyVisit(s, '2026-04-30');
    s = applyVisit(s, '2026-05-01');
    s = applyVisit(s, '2026-05-02');
    expect(s.current).toBe(4);
    expect(s.longest).toBe(4);
  });
});

describe('loadStreak / persistence', () => {
  beforeEach(() => {
    mockStorage.__reset();
    jest.clearAllMocks();
  });

  it('returns EMPTY_STREAK for a never-saved user', async () => {
    expect(await loadStreak('u1')).toEqual(EMPTY_STREAK);
  });

  it('round-trips a saved state', async () => {
    await tickVisit('u1', new Date(2026, 4, 23));
    await tickVisit('u1', new Date(2026, 4, 24));
    const loaded = await loadStreak('u1');
    expect(loaded.current).toBe(2);
    expect(loaded.longest).toBe(2);
    expect(loaded.lastVisitDay).toBe('2026-05-24');
  });

  it('returns EMPTY_STREAK on invalid JSON', async () => {
    mockStorage.__setRaw('@accessmap/streak_v1:u1', '{not json');
    expect(await loadStreak('u1')).toEqual(EMPTY_STREAK);
  });

  it('defends against malformed shapes', async () => {
    mockStorage.__setRaw(
      '@accessmap/streak_v1:u1',
      JSON.stringify({
        current: 'not a number',
        longest: -5,
        lastVisitDay: 'not a date',
      }),
    );
    const loaded = await loadStreak('u1');
    expect(loaded.current).toBe(0);
    expect(loaded.longest).toBe(0);
    expect(loaded.lastVisitDay).toBeNull();
  });

  it('forces longest >= current on load (defends old buggy writes)', async () => {
    mockStorage.__setRaw(
      '@accessmap/streak_v1:u1',
      JSON.stringify({
        current: 7,
        longest: 3, // bogus: longest shouldn't be less than current
        lastVisitDay: '2026-05-23',
      }),
    );
    const loaded = await loadStreak('u1');
    expect(loaded.longest).toBe(7);
  });

  it('resets current to 0 when lastVisitDay is invalid (QA C4 invariant)', async () => {
    // A user with a 30-day streak whose lastVisitDay somehow got
    // corrupted should NOT keep current=30 — the invariant
    // (current > 0 ⇒ lastVisitDay set) must hold, or applyVisit
    // would treat it as "first visit ever" and break the math.
    // longest is preserved so the personal-best memory survives.
    mockStorage.__setRaw(
      '@accessmap/streak_v1:u1',
      JSON.stringify({
        current: 30,
        longest: 30,
        lastVisitDay: 'corrupted',
      }),
    );
    const loaded = await loadStreak('u1');
    expect(loaded.current).toBe(0);
    expect(loaded.longest).toBe(30);
    expect(loaded.lastVisitDay).toBeNull();
  });
});

describe('tickVisit', () => {
  beforeEach(() => {
    mockStorage.__reset();
    jest.clearAllMocks();
  });

  it('does not write to storage when the streak is unchanged (same day)', async () => {
    await tickVisit('u1', new Date(2026, 4, 23, 8, 0));
    mockStorage.setItem.mockClear();
    await tickVisit('u1', new Date(2026, 4, 23, 20, 0));
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('writes on first visit', async () => {
    await tickVisit('u1', new Date(2026, 4, 23));
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('is per-user isolated', async () => {
    await tickVisit('alice', new Date(2026, 4, 23));
    await tickVisit('alice', new Date(2026, 4, 24));
    await tickVisit('bob', new Date(2026, 4, 24));
    const alice = await loadStreak('alice');
    const bob = await loadStreak('bob');
    expect(alice.current).toBe(2);
    expect(bob.current).toBe(1);
  });
});
