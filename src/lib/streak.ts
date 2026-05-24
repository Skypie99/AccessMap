/**
 * Visit-streak tracker — counts consecutive local-calendar days the user
 * has opened the Profile tab. Persisted per-user in AsyncStorage at
 * '@accessmap/streak_v1:{userId}'.
 *
 * Day boundary = device-local midnight, formatted as ISO yyyy-mm-dd.
 * (No time zone fanciness — if the user travels, their streak might
 * shift by one day. Acceptable for v1; the alternative is a server-side
 * timestamp store, which is out of scope.)
 *
 * Streak math (pure):
 *   • First visit ever        → current = 1, longest = 1.
 *   • Same day as last visit  → no change (idempotent within a day).
 *   • Next calendar day       → current += 1; longest = max(longest, current).
 *   • Two+ days gap           → current resets to 1; longest unchanged.
 *
 * Fail-soft on read/write — a busted AsyncStorage shouldn't break Profile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

const STORAGE_KEY_PREFIX = '@accessmap/streak_v1:';

export interface StreakState {
  /** Length (in days) of the user's current active streak. */
  current: number;
  /** Best streak length ever recorded for this user. */
  longest: number;
  /** ISO yyyy-mm-dd of the last visit that incremented the streak. */
  lastVisitDay: string | null;
}

export const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastVisitDay: null,
};

function storageKey(userId: string): string {
  return STORAGE_KEY_PREFIX + userId;
}

/**
 * Local-time ISO yyyy-mm-dd string for a Date. Doesn't depend on
 * Date.prototype.toISOString() (which is UTC).
 */
export function isoDay(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the number of full local-calendar days between two ISO days.
 * Both inputs are 'yyyy-mm-dd'. Returns 0 if either is malformed.
 */
function daysBetween(fromIso: string, toIso: string): number {
  const f = new Date(fromIso + 'T00:00:00');
  const t = new Date(toIso + 'T00:00:00');
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return 0;
  return Math.round((t.getTime() - f.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Defensive parser — drops anything that isn't a well-formed StreakState.
 */
function parseStreak(raw: unknown): StreakState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_STREAK;
  const obj = raw as Record<string, unknown>;
  const current = typeof obj.current === 'number' && obj.current >= 0
    ? Math.floor(obj.current)
    : 0;
  const longest = typeof obj.longest === 'number' && obj.longest >= 0
    ? Math.floor(obj.longest)
    : 0;
  const lastVisitDay =
    typeof obj.lastVisitDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.lastVisitDay)
      ? obj.lastVisitDay
      : null;
  return {
    current,
    longest: Math.max(longest, current),
    lastVisitDay,
  };
}

export async function loadStreak(userId: string): Promise<StreakState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return EMPTY_STREAK;
    return parseStreak(JSON.parse(raw));
  } catch (e) {
    console.warn(
      '[streak] load failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
    return EMPTY_STREAK;
  }
}

async function persist(userId: string, state: StreakState): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch (e) {
    console.warn(
      '[streak] save failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
  }
}

/**
 * Pure: applies the streak transition rule to an existing state given
 * today's day-string. No I/O — used by `tickVisit` and trivially testable.
 */
export function applyVisit(prev: StreakState, todayIso: string): StreakState {
  if (!prev.lastVisitDay) {
    // First visit ever.
    return { current: 1, longest: Math.max(prev.longest, 1), lastVisitDay: todayIso };
  }
  if (prev.lastVisitDay === todayIso) {
    // Same day — idempotent.
    return prev;
  }
  const gap = daysBetween(prev.lastVisitDay, todayIso);
  if (gap === 1) {
    // Consecutive day — extend.
    const next = prev.current + 1;
    return {
      current: next,
      longest: Math.max(prev.longest, next),
      lastVisitDay: todayIso,
    };
  }
  if (gap <= 0) {
    // Clock skew or malformed prior state — treat as same-day no-op so we
    // don't accidentally reset on a backwards clock change.
    return prev;
  }
  // Two-or-more-day gap → streak broken; start fresh.
  return { current: 1, longest: prev.longest, lastVisitDay: todayIso };
}

/**
 * Records a visit for `userId` on the local day of `now` (defaults to
 * actual now). Returns the resulting state so the caller can render the
 * banner / number without a second load.
 */
export async function tickVisit(
  userId: string,
  now: Date = new Date(),
): Promise<StreakState> {
  const today = isoDay(now);
  const prev = await loadStreak(userId);
  const next = applyVisit(prev, today);
  if (next !== prev) {
    await persist(userId, next);
  }
  return next;
}
