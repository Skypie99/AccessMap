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
