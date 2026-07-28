import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { FeedbackCategory } from './feedback';
import type { FeedbackRow } from '@/types/database';

/**
 * Server-side store for user feedback — a thin wrapper over the
 * `public.feedback` Supabase table created by
 * supabase/migrations/2026-05-23_feedback_table.sql.
 *
 * Designed for the DUAL-WRITE pattern in FeedbackModal:
 *   1. Best-effort INSERT to this store (catches and discards errors so a
 *      missing/locked table never blocks the user).
 *   2. Open the OS mail composer via the existing mailto: flow.
 *
 * Until Sky applies the feedback-table migration, every insert will fail
 * at the postgrest layer ("relation public.feedback does not exist"). The
 * try/catch in submitFeedback() turns that into a quiet "tried our best"
 * — the mailto: flow still works and the user sees no error.
 */

interface SubmitInput {
  body: string;
  category: FeedbackCategory;
  contactEmail?: string;
  // userId is passed in (not pulled from supabase.auth.getUser()) so the
  // caller can submit anonymously by passing undefined, and so unit tests
  // don't need to mock the auth client.
  userId?: string;
}

export type SubmitFeedbackResult =
  /**
   * The row was written. `row` is null for an ANONYMOUS insert, which is not a
   * degraded result — see the RLS note in submitFeedback. No caller reads it.
   */
  | { status: 'inserted'; row: FeedbackRow | null }
  | { status: 'skipped'; reason: string };

/**
 * Insert a feedback row into Supabase. Returns a discriminator so callers
 * can decide whether to surface the "tracked!" affordance — but should
 * NEVER block the user on the result. The companion mailto: flow is the
 * authoritative delivery path.
 *
 * `skipped` is the success-as-failure case: nothing was inserted, but the
 * caller can ignore it because the mailto: handles the delivery. Common
 * reasons: table not yet created on the server, transient network blip,
 * RLS rejected the insert because of an auth mismatch.
 */
export async function submitFeedback(input: SubmitInput): Promise<SubmitFeedbackResult> {
  try {
    const row = {
      user_id: input.userId ?? null,
      category: input.category,
      body: input.body.trim().slice(0, 5000),
      contact_email: input.contactEmail?.trim() || null,
      platform: Platform.OS,
    };

    // ⚠ AN ANONYMOUS INSERT MUST NOT ASK FOR THE ROW BACK.
    //
    // `feedback_insert_self_or_anon` permits `user_id IS NULL`, so a guest's
    // write LANDS. But BOTH select policies exclude that row —
    // `feedback_select_own` requires `user_id IS NOT NULL AND user_id =
    // auth.uid()`, and the maintainer policy requires her email — and PostgREST
    // applies SELECT RLS to the RETURNING clause. So `.select('*').single()`
    // reads back nothing and reports FAILURE for a write that succeeded. The
    // migration says as much in its own comment: "Anonymous inserts are not
    // retrievable by anyone but the maintainer."
    //
    // This was invisible while FeedbackModal was the only caller: it ignores
    // the result and has a mailto carrying the same text, so a wrong `skipped`
    // cost nothing. The B-1 report path made it user-visible and serious —
    // `submitContentReport` maps skipped → failed by design (a report's insert
    // IS the channel), so EVERY GUEST REPORT told the reporter it had failed
    // while sitting correctly in the table. Guests are the App Review
    // reviewer's cohort, and the report control is guest-visible on purpose.
    //
    // No caller reads `row`, so declining to fetch it costs nothing.
    if (!input.userId) {
      const { error: anonError } = await supabase.from('feedback').insert(row);
      if (anonError) {
        return { status: 'skipped', reason: anonError.message };
      }
      return { status: 'inserted', row: null };
    }

    const { data, error } = await supabase.from('feedback').insert(row).select('*').single();

    if (error) {
      return { status: 'skipped', reason: error.message };
    }
    if (!data) {
      return { status: 'skipped', reason: 'No row returned from insert.' };
    }
    return { status: 'inserted', row: data as FeedbackRow };
  } catch (e) {
    return {
      status: 'skipped',
      reason: e instanceof Error ? e.message : 'Unknown error.',
    };
  }
}

/**
 * List the user's past feedback, newest first. Capped at 100 — beyond
 * that we'd want cursor pagination, but a single user is very unlikely
 * to hit 100 feedback messages.
 *
 * Returns an empty array if the table doesn't exist or the user is
 * signed out — the caller renders an "empty state" card either way, so
 * the distinction doesn't matter for UX.
 */
export async function listFeedbackByUser(userId: string): Promise<FeedbackRow[]> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return [];
    return (data ?? []) as FeedbackRow[];
  } catch {
    return [];
  }
}
