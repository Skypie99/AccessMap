import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Canonical point awards — these MIRROR the live DB triggers. This is the
 * single source of truth for any UI copy that states point values (the Help
 * FAQ, the Tasks "+points" flash). If a trigger ever changes, change it HERE
 * and every screen updates with it.
 *
 * SW-53: for a long time that claim was only half true. This constant covered
 * verify/resolve and nothing else, because it was written against
 * `handle_flag_status_change` in supabase/schema.sql — and FIVE more awarding
 * triggers live only in supabase/migrations/2026-05-30_trust_score_system.sql,
 * which schema.sql never absorbed. The sim walk measured a real account going
 * 90 -> 124 across one flag and reconciled every point of it:
 *
 *     reported +5 · photo +3 · comment +1 · verified +10 · resolved +15 = +34
 *
 * so the app could describe barely half of what it pays out. The Help FAQ said
 * so out loud, which is how a user would have found out.
 *
 * WHERE EACH NUMBER LIVES (all verified against the SQL, 2026-08-20):
 *   schema.sql            handle_flag_status_change   verify/resolve, reject
 *   trust_score_system    handle_flag_submitted       submitReport
 *   trust_score_system    handle_flag_photo_added     addPhoto
 *   trust_score_system    handle_comment_added        addComment
 *   trust_score_system    handle_comment_vote_added   commentUpvoted
 *   trust_score_system    handle_point_event_streak   streakBonus
 */
export const POINTS = {
  /** Awarded to the flag's reporter. */
  reporter: { verify: 10, resolve: 15 },
  /** Awarded to the actor (verifier/resolver) — only when they aren't the reporter. */
  actor: { verify: 3, resolve: 7 },
  /** Rejecting a report awards nothing. */
  reject: 0,
  /**
   * Filing a report. ANONYMOUS reports earn nothing — the trigger returns
   * early when `user_id IS NULL`, so there is no account to credit.
   */
  submitReport: 5,
  /**
   * Adding a photo to your own flag. Paid to the FLAG OWNER, and paid ONCE per
   * flag however many photos are attached — the trigger checks point_events for
   * an existing award before writing another.
   */
  addPhoto: 3,
  /** Commenting. No dedupe and no cap, unlike every other award here. */
  addComment: 1,
  /**
   * Someone upvoted your comment — paid to the comment's AUTHOR, and only for
   * the first 10 votes on that comment. Voting on your own comment raises.
   */
  commentUpvoted: 2,
  /** Paid at every completed 7-day multiple of the activity streak. */
  streakBonus: 5,
} as const;

/**
 * Per-user "points last seen" cache.
 *
 * When the reporter's flag is acted on by someone else, the DB trigger
 * (handle_flag_status_change in supabase/schema.sql) bumps their points.
 * The reporter has no in-app feedback for that event today — they only
 * notice next time they happen to glance at the Profile tab.
 *
 * We close that loop with a simple diff-on-launch check: when the app
 * comes up, fetch the current `points` value, compare against the last
 * value we remembered locally, and if it's higher, raise a toast
 * "You earned +N points while you were away!".
 *
 * This avoids enabling Supabase Realtime on a new table (which would be
 * a propose-only schema/RLS change) and still surfaces the win for ~99%
 * of cases — the reporter goes through this check every time they open
 * the app. Real-time push for the actively-foregrounded case is a
 * clean follow-up once Realtime is enabled.
 *
 * Stored value: a stringified non-negative integer. Defaults to "0" on
 * first launch — the first observed delta is suppressed in the UI so
 * we don't celebrate every point the user already had.
 */
const KEY_PREFIX = '@accessmap/points_last_seen_v1:';

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/**
 * Reads the user's current `points` value from `public.users`. Returns
 * null on error so the caller can choose to skip the diff rather than
 * showing a confusing "+NaN" or wrong-direction toast.
 */
export async function fetchCurrentPoints(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  return typeof data.points === 'number' ? data.points : null;
}

/**
 * Resolves to the last points value we remembered for this user, or null
 * if we've never recorded one. null is meaningful — the caller treats
 * "first-ever observation" differently from a delta of 0.
 */
export async function getLastSeenPoints(userId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function setLastSeenPoints(userId: string, points: number): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), String(Math.max(0, points)));
  } catch {
    // Ignore — worst case we miss one toast next session.
  }
}
