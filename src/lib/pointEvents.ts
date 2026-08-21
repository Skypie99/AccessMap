import { supabase } from '@/lib/supabase';

export type PointEventType =
  | 'flag_submitted'
  | 'flag_verified_reporter'
  | 'flag_resolved_reporter'
  | 'flag_verified_actor'
  | 'flag_resolved_actor'
  | 'flag_photo_added'
  | 'comment_added'
  | 'comment_upvoted'
  | 'flag_spam_penalty'
  | 'streak_bonus';

export type PointEventRow = {
  id: number;
  user_id: string;
  event_type: PointEventType;
  delta: number;
  // Intentionally not surfaced in UI — flag_id is for internal audit only
  // (see docs/TRUST_SCORE_SPEC.md §3.2 Jordan constraint #1).
  flag_id: string | null;
  created_at: string;
};

const EVENT_LABELS: Record<PointEventType, string> = {
  flag_submitted: 'Reported a barrier',
  flag_verified_reporter: 'Your report was verified',
  flag_resolved_reporter: 'Your report was resolved',
  flag_verified_actor: 'Helped verify a report',
  flag_resolved_actor: 'Helped resolve a report',
  flag_photo_added: 'Added a photo',
  comment_added: 'Added a comment',
  comment_upvoted: 'Your comment got a thumbs-up',
  flag_spam_penalty: 'Report marked as spam',
  streak_bonus: '7-day mapping streak',
};

export function pointEventLabel(eventType: PointEventType): string {
  return EVENT_LABELS[eventType];
}

/**
 * Fetch the signed-in user's point event history from the `point_events`
 * table, ordered newest-first, capped at 50 rows.
 *
 * 42P01 guard: if the table doesn't exist yet (migration not applied),
 * returns [] so the calling UI degrades silently instead of alerting.
 */
export async function getPointEventHistory(userId: string): Promise<PointEventRow[]> {
  const { data, error } = await supabase
    .from('point_events')
    .select('id, user_id, event_type, delta, flag_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    // 42P01 = undefined_table: migration not yet applied.
    if ((error as { code?: string }).code === '42P01') return [];
    throw error;
  }

  return (data ?? []) as PointEventRow[];
}

/**
 * How many of this user's reports have EVER been verified / resolved.
 *
 * SW-39. The Profile headline tiles used to mix two different metrics: the
 * "Reported" tile is a lifetime total, while "Verified" and "Resolved" read
 * `flags.status` — a CURRENT-STATUS snapshot. A report that was verified and
 * then resolved leaves the verified bucket, so the tiles could read
 * "6 REPORTED · 0 VERIFIED · 3 RESOLVED" directly beneath an activity feed
 * saying "Your report was verified · +10 pts" twice. Both numbers were true;
 * together they read as a contradiction. (Confirmed live: the Verified tile
 * went 1 -> 0 the instant a flag moved verified -> resolved.)
 *
 * The point-event ledger is the right source because it is append-only: an
 * award is written when the transition happens and is never revoked, which is
 * exactly the "has this ever happened" question the tiles are asking. The
 * current-status view is not lost — the per-status pill row below the tiles
 * still shows all four buckets, including rejected.
 *
 * Counted server-side (`head: true`) so no rows cross the wire — this is
 * deliberately not derived from `getPointEventHistory`, which caps at 50.
 *
 * Returns `null` when the ledger is unavailable, so the caller can fall back to
 * what it showed before rather than reporting a confident zero.
 *
 * KNOWN LIMIT: `point_events` begins at the 2026-05-30 trust-score migration
 * and was not backfilled, so flags verified or resolved before that date do not
 * count here.
 */
export async function getLifetimeReportOutcomes(
  userId: string,
): Promise<{ verified: number; resolved: number } | null> {
  const countOf = async (eventType: PointEventType): Promise<number | null> => {
    const { count, error } = await supabase
      .from('point_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_type', eventType);

    if (error) {
      // 42P01 = undefined_table: migration not yet applied.
      if ((error as { code?: string }).code === '42P01') return null;
      throw error;
    }
    return count ?? 0;
  };

  const [verified, resolved] = await Promise.all([
    countOf('flag_verified_reporter'),
    countOf('flag_resolved_reporter'),
  ]);

  if (verified === null || resolved === null) return null;
  return { verified, resolved };
}
