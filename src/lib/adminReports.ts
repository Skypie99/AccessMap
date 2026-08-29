// MOD1 — the admin moderation queue over the EXISTING [REPORT] envelope
// (src/lib/reports.ts). No second reporting backend: this file only reads
// public.feedback rows that already look like reports, and writes only the
// moderation_reviewed_at / moderation_reviewed_by / moderation_resolution
// columns added by supabase/migrations/20260828050000_mod1_admin_report_queue.sql.
//
// RELEASE-SAFETY ORDERING (locked decision, do not reorder): every action
// that touches content (reject/remove a flag, delete a comment) performs
// that write FIRST and only calls closeReport() after it succeeds. If the
// content write throws, this module throws too and the report is untouched
// — the caller's whole action is safe to retry from scratch. If the content
// write succeeds but closeReport() fails (network blip, etc.), the
// composite functions below return `{ closed: false, closeError, resolution
// }` instead of throwing, specifically so the caller does NOT repeat the
// now-already-applied destructive action — it should retry with retryClose()
// alone, passing the SAME resolution back.
//
// PENDING CLOSE (MOD1R FIX1): closeAfterContentAction() records the
// resolution (+ reviewedBy) via markPendingResolution() BEFORE attempting the
// close write, so that fact survives a reload even if every close retry is
// exhausted — see 20260828070000_mod1r_fix1_pending_close_state.sql. A report
// with resolution set and reviewedAt still null is PENDING CLOSE, never OPEN:
// the caller must offer only a close-only retry (retryClose), never re-offer
// the original content actions.
//
// PRE-ACTION INTENT (MOD1R FIX2): markPendingResolution() above is
// best-effort and runs AFTER the content action, so if it (and every close
// retry) also fails, nothing durable was ever written and a reload sees a
// report indistinguishable from one never touched — the destructive button
// returns even though the content action already happened. markActionIntent()
// closes that gap: it runs and THROWS *before* the content action (so a
// content action never runs un-tracked — see 20260828080000), then
// hydrateReports() reconciles any report whose resolution is still null but
// whose intent is set against the LIVE target (flag status / flag or comment
// existence) rather than trusting local memory. See reconcileActionIntent().
import { supabase } from './supabase';
import { errorMessage } from './errors';
import { deleteFlag, fetchFlagsByIds, updateFlagStatus } from './flags';
import { deleteComment, fetchCommentsByIds } from './comments';
import { parseReportBody, REPORT_BODY_PREFIX } from './reports';
import type { ReportCategoryId } from './copy';
import type { CommentRow, FlagRow, FlagStatus, ModerationResolution } from '@/types/database';

/** The subset of ModerationResolution that names an actual destructive
 *  content mutation — 'no_action' and 'target_unavailable' never mutate
 *  content, so there is nothing for a pre-action intent to protect. */
export type ContentActionIntent = 'flag_rejected' | 'flag_removed' | 'comment_removed';

export type AdminReport = {
  id: string;
  createdAt: string;
  reason: string;
  category?: ReportCategoryId;
  /** true when the body starts with '[REPORT]' but parseReportBody() could
   *  not read it — surfaced, never silently dropped. */
  malformed: boolean;
  rawBody: string;
  targetKind: 'flag' | 'comment' | null;
  targetId: string | null;
  /** The reported flag itself (kind 'flag'), or the parent flag of a
   *  reported comment (kind 'comment', for context) — null if that flag no
   *  longer exists (or, for a malformed row, unknown). */
  flag: FlagRow | null;
  /** The reported comment (kind 'comment' only) — null if it was already
   *  deleted (or the row doesn't concern a comment). */
  comment: CommentRow | null;
  /** false when the thing this report is about is already gone. */
  targetAvailable: boolean;
  reviewedAt: string | null;
  resolution: ModerationResolution | null;
};

type FeedbackReportColumns = {
  id: string;
  created_at: string;
  body: string;
  moderation_reviewed_at: string | null;
  moderation_resolution: ModerationResolution | null;
  moderation_action_intent: ContentActionIntent | null;
};

const REPORT_SELECT = 'id, created_at, body, moderation_reviewed_at, moderation_resolution, moderation_action_intent';

/**
 * Open reports, oldest first (the queue works oldest-first so nothing ages
 * out of sight).
 *
 * The `.like('body', ...)` filter here is NOT redundant with the
 * "feedback_select_moderation" RLS policy's own body-prefix check — it's
 * defense against a real gap the RLS policy can't close by itself. Postgres
 * combines multiple PERMISSIVE SELECT policies on one table with OR, and
 * `public.feedback` already had two: "feedback_select_own" (a user reading
 * their OWN past feedback, any category, no admin/report-shape check) and
 * "feedback_select_maintainer" (blanket access for one hardcoded email). If
 * the calling admin has ever submitted ordinary feedback themselves, or IS
 * that hardcoded maintainer, rows from those OTHER policies are unioned into
 * the result too — every one of them with `moderation_reviewed_at IS NULL`
 * (the column is brand new), so the `.is(...)` filter doesn't exclude them
 * either. Filtering by prefix here, in the query itself, is what actually
 * keeps this queue to reports regardless of which policy admitted a row.
 */
export async function listOpenReports(limit = 100): Promise<AdminReport[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select(REPORT_SELECT)
    .is('moderation_reviewed_at', null)
    .like('body', `${REPORT_BODY_PREFIX}%`)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(errorMessage(error));
  return hydrateReports((data ?? []) as FeedbackReportColumns[]);
}

async function hydrateReports(rows: FeedbackReportColumns[]): Promise<AdminReport[]> {
  const parsedRows = rows.map((row) => ({ row, parsed: parseReportBody(row.body) }));

  // One batched fetch per target table instead of N+1 — every flag id we'll
  // need (a reported flag directly, or a reported comment's parent flag for
  // context) and every comment id, gathered up front.
  const flagIds = new Set<string>();
  const commentIds = new Set<string>();
  for (const { parsed } of parsedRows) {
    if (!parsed) continue;
    if (parsed.target.kind === 'flag') flagIds.add(parsed.target.id);
    if (parsed.target.kind === 'comment') {
      commentIds.add(parsed.target.id);
      if (parsed.target.flagId) flagIds.add(parsed.target.flagId);
    }
  }
  const [flags, comments] = await Promise.all([
    fetchFlagsByIds([...flagIds]),
    fetchCommentsByIds([...commentIds]),
  ]);
  const flagById = new Map(flags.map((f) => [f.id, f]));
  const commentById = new Map(comments.map((c) => [c.id, c]));

  return parsedRows.map(({ row, parsed }) => {
    if (!parsed) {
      return {
        id: row.id,
        createdAt: row.created_at,
        reason: '',
        malformed: true,
        rawBody: row.body,
        targetKind: null,
        targetId: null,
        flag: null,
        comment: null,
        targetAvailable: false,
        reviewedAt: row.moderation_reviewed_at,
        resolution: row.moderation_resolution,
      } satisfies AdminReport;
    }
    const { target } = parsed;
    const flag = target.kind === 'flag' ? (flagById.get(target.id) ?? null) : (target.flagId ? (flagById.get(target.flagId) ?? null) : null);
    const comment = target.kind === 'comment' ? (commentById.get(target.id) ?? null) : null;
    const targetAvailable = target.kind === 'flag' ? flag !== null : comment !== null;
    // MOD1R FIX2 — resolution is the durable source of truth when present
    // (markPendingResolution already landed). When it's still null but an
    // intent was recorded, reconcile against the LIVE target we just fetched
    // instead of trusting nothing: this is what recovers the true outcome
    // when both the content action's post-write AND every close retry were
    // lost. See reconcileActionIntent().
    const resolution =
      row.moderation_resolution ??
      reconcileActionIntent(row.moderation_action_intent, target.kind, flag, comment);
    return {
      id: row.id,
      createdAt: row.created_at,
      reason: parsed.reason,
      category: parsed.category,
      malformed: false,
      rawBody: row.body,
      targetKind: target.kind,
      targetId: target.id,
      flag,
      comment,
      targetAvailable,
      reviewedAt: row.moderation_reviewed_at,
      resolution,
    } satisfies AdminReport;
  });
}

/**
 * Reconciles a PRE-ACTION intent (recorded before a content mutation, see
 * markActionIntent()) against the target's actual current state, for the
 * case where neither markPendingResolution() nor any close retry survived.
 *
 * Deliberately conservative: it only ever returns a resolution when the live
 * target PROVES the action happened. Anything else — the action clearly
 * never ran, or the target's kind doesn't match the intent (shouldn't
 * happen, but never trust it blindly) — returns null, which leaves the
 * report OPEN and lets the caller's normal targetAvailable-gated buttons
 * decide what's safe to offer next. A flag_rejected intent whose flag is now
 * gone entirely is the one case this can't disambiguate (did the reject
 * happen and then something else delete the flag, or did the reject never
 * run before the flag was deleted some other way?) — that's exactly the
 * "genuinely ambiguous" case the fail-safe requires: it returns null, and
 * targetAvailable is already false, so no destructive button is offered
 * either way, only the existing target-unavailable/no-action close path.
 */
function reconcileActionIntent(
  intent: ContentActionIntent | null,
  targetKind: 'flag' | 'comment',
  flag: FlagRow | null,
  comment: CommentRow | null,
): ModerationResolution | null {
  if (!intent) return null;
  switch (intent) {
    case 'flag_rejected':
      return targetKind === 'flag' && flag !== null && flag.status === 'rejected' ? 'flag_rejected' : null;
    case 'flag_removed':
      return targetKind === 'flag' && flag === null ? 'flag_removed' : null;
    case 'comment_removed':
      return targetKind === 'comment' && comment === null ? 'comment_removed' : null;
    default:
      return null;
  }
}

export type CloseOutcome = { ok: true } | { ok: false; error: string };

/**
 * The one writer of moderation_reviewed_at/by/resolution. The `.is(...,
 * null)` guard is what makes closing an already-closed report a safe no-op
 * instead of a second, possibly-conflicting write: `count === 0` here means
 * either the id doesn't exist or (far more likely) another admin — or a
 * retried tap — already closed it, and PostgREST reports that as success
 * with zero matched rows, not an error.
 */
export async function closeReport(
  reportId: string,
  resolution: ModerationResolution,
  reviewedBy: string,
): Promise<CloseOutcome> {
  const { error } = await supabase
    .from('feedback')
    .update({
      moderation_reviewed_at: new Date().toISOString(),
      moderation_reviewed_by: reviewedBy,
      moderation_resolution: resolution,
    })
    .eq('id', reportId)
    .is('moderation_reviewed_at', null);
  if (error) return { ok: false, error: errorMessage(error) };
  return { ok: true };
}

export type ContentActionResult =
  | { closed: true }
  // `resolution` is present whenever a content mutation already happened and
  // must never be repeated (closeAfterContentAction/retryClose) — absent for
  // closeDirectly's no_action/target_unavailable, which have no content step
  // and are just as safe to retry via their original button as a close-only one.
  | { closed: false; closeError: string; resolution?: ModerationResolution };

/**
 * Best-effort durability write, run BEFORE the close is attempted: records
 * that the content action succeeded (and what it resolved to) without yet
 * marking the report reviewed. Never throws — closeAfterContentAction()
 * retries the full close regardless of whether this lands, and that retry
 * writes the same resolution/reviewedBy again anyway. The only thing this
 * buys is durability: if every close retry below is then exhausted, this
 * write (if it landed) is what makes "the content action already happened"
 * survive a reload instead of only living in this session's local state.
 */
async function markPendingResolution(
  reportId: string,
  resolution: ModerationResolution,
  reviewedBy: string,
): Promise<void> {
  await supabase
    .from('feedback')
    .update({ moderation_reviewed_by: reviewedBy, moderation_resolution: resolution })
    .eq('id', reportId)
    .is('moderation_reviewed_at', null);
}

/**
 * Durable PRE-ACTION intent write (MOD1R FIX2) — the one thing that must
 * land BEFORE a destructive content mutation runs. Unlike
 * markPendingResolution() this THROWS on failure: per the required
 * invariant, if this can't persist, the destructive action must not be
 * attempted at all, so the caller (rejectFlagReport/removeFlagReport/
 * removeCommentReport) never reaches its content mutation and the report
 * stays exactly as untouched as any other pre-action failure. Guarded the
 * same way as every other moderation write — a no-op against an
 * already-closed report, never a conflicting one.
 */
async function markActionIntent(
  reportId: string,
  intent: ContentActionIntent,
  reviewedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('feedback')
    .update({ moderation_action_intent: intent, moderation_reviewed_by: reviewedBy })
    .eq('id', reportId)
    .is('moderation_reviewed_at', null);
  if (error) throw new Error(errorMessage(error));
}

/**
 * Retries ONLY the close write (moderation_reviewed_at) — never a content
 * mutation. Used both right after a successful content action
 * (closeAfterContentAction, below) and, standalone, by a later "Finish
 * review" retry against a report already in PENDING CLOSE — so it's exactly
 * as safe to call a second or third time as a first: closeReport()'s own
 * `.is('moderation_reviewed_at', null)` guard makes re-closing an
 * already-closed report a no-op, not a conflicting write.
 */
export async function retryClose(
  reportId: string,
  resolution: ModerationResolution,
  reviewedBy: string,
  attempts = 3,
): Promise<ContentActionResult> {
  let outcome: CloseOutcome = { ok: false, error: 'unreachable' };
  for (let i = 0; i < attempts; i++) {
    outcome = await closeReport(reportId, resolution, reviewedBy);
    if (outcome.ok) return { closed: true };
  }
  return { closed: false, closeError: outcome.ok ? '' : outcome.error, resolution };
}

/**
 * The content mutation (reject/remove a flag, delete a comment) already
 * happened by the time this runs, so a transient failure here must not
 * surface as "the whole action failed" — that would invite a caller (or an
 * impatient admin) to press the same button again and re-run a destructive
 * step that already succeeded. Marking PENDING CLOSE first, then retrying
 * only the close write a few times, costs nothing extra on the happy path
 * (it succeeds on attempt 1) and turns most blips into a transparent success
 * instead of a stuck-open report.
 */
async function closeAfterContentAction(
  reportId: string,
  resolution: ModerationResolution,
  reviewedBy: string,
): Promise<ContentActionResult> {
  await markPendingResolution(reportId, resolution, reviewedBy);
  return retryClose(reportId, resolution, reviewedBy);
}

/** Reject the flag (admin-only at the DB trigger layer — see
 *  20260828040000_mod1_moderation_release_safety.sql), then close the report
 *  as 'flag_rejected'. Throws (report stays open) if the pre-action intent
 *  write or the reject itself fails — in neither case does the reject run. */
export async function rejectFlagReport(params: {
  reportId: string;
  flagId: string;
  previousFlagStatus: FlagStatus;
  reviewedBy: string;
}): Promise<ContentActionResult> {
  await markActionIntent(params.reportId, 'flag_rejected', params.reviewedBy);
  await updateFlagStatus(params.flagId, 'rejected', params.previousFlagStatus);
  return closeAfterContentAction(params.reportId, 'flag_rejected', params.reviewedBy);
}

/** Permanently remove the flag via the canonical deleteFlag() route, then
 *  close the report as 'flag_removed'. Never a direct client DELETE. */
export async function removeFlagReport(params: {
  reportId: string;
  flagId: string;
  reviewedBy: string;
}): Promise<ContentActionResult> {
  await markActionIntent(params.reportId, 'flag_removed', params.reviewedBy);
  await deleteFlag(params.flagId);
  return closeAfterContentAction(params.reportId, 'flag_removed', params.reviewedBy);
}

/** Delete the comment via the canonical deleteComment() route (RLS already
 *  grants admins delete on any comment — see "admin delete any comment" in
 *  supabase/migrations/2026-08-27_d1f4_async_account_deletion.sql), then
 *  close the report as 'comment_removed'.
 *
 *  Checks existence FIRST: deleteComment() is a bare `.delete().eq('id',
 *  ...)` with no row-count check, so it "succeeds" whether it deleted a row
 *  or matched zero — a comment already deleted by its author between the
 *  queue loading and this action would otherwise get recorded as
 *  'comment_removed' when this admin action removed nothing. */
export async function removeCommentReport(params: {
  reportId: string;
  commentId: string;
  reviewedBy: string;
}): Promise<ContentActionResult> {
  const [existing] = await fetchCommentsByIds([params.commentId]);
  if (!existing) {
    return closeAfterContentAction(params.reportId, 'target_unavailable', params.reviewedBy);
  }
  await markActionIntent(params.reportId, 'comment_removed', params.reviewedBy);
  await deleteComment(params.commentId);
  return closeAfterContentAction(params.reportId, 'comment_removed', params.reviewedBy);
}
