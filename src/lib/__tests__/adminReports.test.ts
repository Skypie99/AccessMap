/**
 * MOD1 — the admin report queue's data layer.
 *
 * Three things this suite exists to pin, because a plausible-looking
 * implementation can get each one silently wrong:
 *
 *   1. PARTIAL FAILURE ORDERING — the content action (reject/remove a flag,
 *      delete a comment) must land BEFORE the report is ever marked
 *      reviewed. If the content action throws, closeReport() must never be
 *      called. If it succeeds but closeReport() fails, the function must
 *      say so without throwing — so a caller does not repeat an
 *      already-applied destructive action on retry.
 *   2. IDEMPOTENCE — closing an already-closed report must be a safe no-op,
 *      not a silent overwrite of a prior decision or a hard error.
 *   3. HONESTY ABOUT MISSING/MALFORMED DATA — a deleted target or an
 *      unparseable '[REPORT]' body must be surfaced, never dropped.
 */
import { buildReportBody } from '../reports';
import type { FlagRow, CommentRow } from '@/types/database';

const mockFeedbackFrom = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { from: (table: string) => mockFeedbackFrom(table) },
}));

const mockUpdateFlagStatus = jest.fn();
const mockDeleteFlag = jest.fn();
const mockFetchFlagsByIds = jest.fn();
jest.mock('../flags', () => ({
  updateFlagStatus: (...a: unknown[]) => mockUpdateFlagStatus(...a),
  deleteFlag: (...a: unknown[]) => mockDeleteFlag(...a),
  fetchFlagsByIds: (...a: unknown[]) => mockFetchFlagsByIds(...a),
}));

const mockDeleteComment = jest.fn();
const mockFetchCommentsByIds = jest.fn();
jest.mock('../comments', () => ({
  deleteComment: (...a: unknown[]) => mockDeleteComment(...a),
  fetchCommentsByIds: (...a: unknown[]) => mockFetchCommentsByIds(...a),
}));

import {
  listOpenReports,
  closeReport,
  rejectFlagReport,
  removeFlagReport,
  removeCommentReport,
  retryClose,
} from '../adminReports';

/** A thenable query-builder stub: every chain method returns itself, and it
 *  resolves to `result` however long the chain runs before being awaited. */
function queryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = jest.fn(() => builder);
  for (const method of ['select', 'is', 'in', 'like', 'order', 'limit', 'update', 'eq']) {
    builder[method] = chain;
  }
  (builder as { then: PromiseLike<unknown>['then'] }).then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

const FLAG: FlagRow = {
  id: 'flag-1',
  user_id: 'reporter-1',
  lat: 1,
  lng: 1,
  category: 'sidewalk',
  description: 'x',
  severity: 3,
  photo_url: null,
  status: 'open',
  created_at: '2026-08-01T00:00:00.000Z',
} as unknown as FlagRow;

const COMMENT: CommentRow = {
  id: 'comment-1',
  flag_id: 'flag-1',
  user_id: 'author-1',
  content: 'rude comment',
  created_at: '2026-08-01T00:00:00.000Z',
  display_name: 'Someone',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listOpenReports — hydration', () => {
  it('resolves a flag-target report against the live flag', async () => {
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-1',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'flag', id: 'flag-1' }, 'This is fake'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([FLAG]);
    mockFetchCommentsByIds.mockResolvedValue([]);

    const reports = await listOpenReports();

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      id: 'report-1',
      malformed: false,
      targetKind: 'flag',
      targetId: 'flag-1',
      targetAvailable: true,
      reason: 'This is fake',
    });
    expect(reports[0].flag).toEqual(FLAG);
    expect(reports[0].comment).toBeNull();
    expect(mockFetchFlagsByIds).toHaveBeenCalledWith(['flag-1']);
  });

  it('resolves a comment-target report against both the comment and its parent flag', async () => {
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-2',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'comment', id: 'comment-1', flagId: 'flag-1' }, 'harassment'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([FLAG]);
    mockFetchCommentsByIds.mockResolvedValue([COMMENT]);

    const [report] = await listOpenReports();

    expect(report.targetKind).toBe('comment');
    expect(report.comment).toEqual(COMMENT);
    expect(report.flag).toEqual(FLAG); // parent flag, for context
    expect(report.targetAvailable).toBe(true);
    expect(mockFetchCommentsByIds).toHaveBeenCalledWith(['comment-1']);
  });

  it('surfaces a malformed [REPORT] row instead of dropping it', async () => {
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-3',
            created_at: '2026-08-20T00:00:00.000Z',
            body: '[REPORT] v99 target=flag id=flag-1', // unknown version -> parseReportBody returns null
            moderation_reviewed_at: null,
            moderation_resolution: null,
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([]);
    mockFetchCommentsByIds.mockResolvedValue([]);

    const [report] = await listOpenReports();

    expect(report.malformed).toBe(true);
    expect(report.rawBody).toContain('[REPORT]');
    expect(report.targetAvailable).toBe(false);
  });

  it('marks the target unavailable when the flag was already deleted', async () => {
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-4',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'flag', id: 'flag-missing' }, 'gone'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([]); // fetchFlagsByIds silently drops missing ids
    mockFetchCommentsByIds.mockResolvedValue([]);

    const [report] = await listOpenReports();

    expect(report.flag).toBeNull();
    expect(report.targetAvailable).toBe(false);
  });

  it('throws on a query error rather than returning a partial list', async () => {
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: { message: 'boom' } }));
    await expect(listOpenReports()).rejects.toThrow('boom');
  });

  it("filters to '[REPORT]'-prefixed bodies in the query itself, not only via RLS", async () => {
    // public.feedback has two OTHER permissive SELECT policies pre-dating
    // this feature (feedback_select_own, feedback_select_maintainer) that
    // Postgres composes with the new one via OR — neither checks is_admin or
    // the body prefix. An admin who has ever submitted ordinary feedback (or
    // who IS the hardcoded maintainer) would otherwise see their own
    // unrelated feedback rows unioned into this result. This query-level
    // filter is what actually keeps the queue to reports regardless of
    // which RLS policy admitted a row.
    const builder = queryBuilder({ data: [], error: null });
    mockFeedbackFrom.mockReturnValue(builder);

    await listOpenReports();

    expect(builder.like).toHaveBeenCalledWith('body', '[REPORT]%');
  });
});

describe('closeReport — the single writer, and its idempotence guard', () => {
  it('writes all three moderation columns and reports ok', async () => {
    const builder = queryBuilder({ data: null, error: null });
    mockFeedbackFrom.mockReturnValue(builder);

    const outcome = await closeReport('report-1', 'no_action', 'admin-1');

    expect(outcome).toEqual({ ok: true });
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        moderation_reviewed_by: 'admin-1',
        moderation_resolution: 'no_action',
      }),
    );
    expect(builder.eq).toHaveBeenCalledWith('id', 'report-1');
    // The idempotence guard: only rows still open are matched, so a second
    // close (this one or a concurrent one) affects zero rows instead of
    // clobbering the first decision.
    expect(builder.is).toHaveBeenCalledWith('moderation_reviewed_at', null);
  });

  it('reports failure without throwing, so a caller can retry just the close', async () => {
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: { message: 'network blip' } }));

    const outcome = await closeReport('report-1', 'no_action', 'admin-1');

    expect(outcome).toEqual({ ok: false, error: 'network blip' });
  });
});

describe('rejectFlagReport / removeFlagReport / removeCommentReport — ordering', () => {
  it('rejects the flag, THEN closes the report — content action strictly between the pre-action intent write and either post-action write', async () => {
    const callOrder: string[] = [];
    mockUpdateFlagStatus.mockImplementation(async () => {
      callOrder.push('updateFlagStatus');
    });
    mockFeedbackFrom.mockImplementation(() => {
      callOrder.push('feedback');
      return queryBuilder({ data: null, error: null });
    });

    const result = await rejectFlagReport({
      reportId: 'report-1',
      flagId: 'flag-1',
      previousFlagStatus: 'open',
      reviewedBy: 'admin-1',
    });

    expect(result).toEqual({ closed: true });
    // markActionIntent ('feedback'), then updateFlagStatus, then
    // markPendingResolution ('feedback'), then the close write itself
    // ('feedback').
    expect(callOrder).toEqual(['feedback', 'updateFlagStatus', 'feedback', 'feedback']);
    expect(mockUpdateFlagStatus).toHaveBeenCalledWith('flag-1', 'rejected', 'open');
  });

  it('never closes the report when the reject itself fails — report stays open for a full retry', async () => {
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: null })); // pre-action intent write succeeds
    mockUpdateFlagStatus.mockRejectedValue(new Error('RLS denied'));

    await expect(
      rejectFlagReport({ reportId: 'report-1', flagId: 'flag-1', previousFlagStatus: 'open', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('RLS denied');

    expect(mockFeedbackFrom).toHaveBeenCalledTimes(1); // only the pre-action intent write
  });

  it('reject succeeds but the close write fails every retry: says so, does not throw, and never re-rejects', async () => {
    mockUpdateFlagStatus.mockResolvedValue(undefined);
    let call = 0;
    mockFeedbackFrom.mockImplementation(() => {
      call += 1;
      return call === 1
        ? queryBuilder({ data: null, error: null }) // markActionIntent
        : queryBuilder({ data: null, error: { message: 'timeout' } }); // markPendingResolution + every close attempt
    });

    const result = await rejectFlagReport({
      reportId: 'report-1',
      flagId: 'flag-1',
      previousFlagStatus: 'open',
      reviewedBy: 'admin-1',
    });

    expect(result).toEqual({ closed: false, closeError: 'timeout', resolution: 'flag_rejected' });
    expect(mockUpdateFlagStatus).toHaveBeenCalledTimes(1); // the destructive step is never repeated
    // 1 intent write + 1 markPendingResolution write + 3 close attempts.
    expect(mockFeedbackFrom).toHaveBeenCalledTimes(5);
  });

  it('reject succeeds and the close write recovers on a later attempt — one destructive call, one visible success', async () => {
    mockUpdateFlagStatus.mockResolvedValue(undefined);
    let call = 0;
    mockFeedbackFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return queryBuilder({ data: null, error: null }); // markActionIntent
      return call < 4
        ? queryBuilder({ data: null, error: { message: 'timeout' } })
        : queryBuilder({ data: null, error: null });
    });

    const result = await rejectFlagReport({
      reportId: 'report-1',
      flagId: 'flag-1',
      previousFlagStatus: 'open',
      reviewedBy: 'admin-1',
    });

    expect(result).toEqual({ closed: true });
    expect(mockUpdateFlagStatus).toHaveBeenCalledTimes(1);
    // call 1 = markActionIntent; call 2 = markPendingResolution (also fails,
    // harmlessly); calls 3-4 = retryClose's own attempts, the second of
    // which recovers.
    expect(mockFeedbackFrom).toHaveBeenCalledTimes(4);
  });

  it('removeFlagReport deletes via the canonical deleteFlag(), then closes as flag_removed', async () => {
    mockDeleteFlag.mockResolvedValue(undefined);
    const builder = queryBuilder({ data: null, error: null });
    mockFeedbackFrom.mockReturnValue(builder);

    const result = await removeFlagReport({ reportId: 'report-1', flagId: 'flag-1', reviewedBy: 'admin-1' });

    expect(result).toEqual({ closed: true });
    expect(mockDeleteFlag).toHaveBeenCalledWith('flag-1');
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ moderation_action_intent: 'flag_removed' }));
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ moderation_resolution: 'flag_removed' }));
  });

  it('removeFlagReport never closes the report when deleteFlag fails', async () => {
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: null })); // pre-action intent write succeeds
    mockDeleteFlag.mockRejectedValue(new Error('not found'));
    await expect(
      removeFlagReport({ reportId: 'report-1', flagId: 'flag-1', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('not found');
    expect(mockFeedbackFrom).toHaveBeenCalledTimes(1); // only the pre-action intent write
  });

  it('removeCommentReport deletes via the canonical deleteComment(), then closes as comment_removed', async () => {
    mockFetchCommentsByIds.mockResolvedValue([COMMENT]); // still exists
    mockDeleteComment.mockResolvedValue(undefined);
    const builder = queryBuilder({ data: null, error: null });
    mockFeedbackFrom.mockReturnValue(builder);

    const result = await removeCommentReport({
      reportId: 'report-1',
      commentId: 'comment-1',
      reviewedBy: 'admin-1',
    });

    expect(result).toEqual({ closed: true });
    expect(mockDeleteComment).toHaveBeenCalledWith('comment-1');
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ moderation_resolution: 'comment_removed' }));
  });

  it('removeCommentReport never closes the report when deleteComment fails', async () => {
    mockFetchCommentsByIds.mockResolvedValue([COMMENT]); // still exists
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: null })); // pre-action intent write succeeds
    mockDeleteComment.mockRejectedValue(new Error('already gone'));
    await expect(
      removeCommentReport({ reportId: 'report-1', commentId: 'comment-1', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('already gone');
    expect(mockFeedbackFrom).toHaveBeenCalledTimes(1); // only the pre-action intent write
  });

  it('removeCommentReport closes as target_unavailable — without calling deleteComment — when the comment is already gone', async () => {
    // The race this guards: the comment's author deletes it themselves
    // between the queue loading and the admin's tap. deleteComment() has no
    // row-count check (see src/lib/comments.ts), so calling it here would
    // "succeed" having deleted nothing and wrongly record comment_removed.
    mockFetchCommentsByIds.mockResolvedValue([]); // already gone
    const builder = queryBuilder({ data: null, error: null });
    mockFeedbackFrom.mockReturnValue(builder);

    const result = await removeCommentReport({
      reportId: 'report-1',
      commentId: 'comment-1',
      reviewedBy: 'admin-1',
    });

    expect(result).toEqual({ closed: true });
    expect(mockDeleteComment).not.toHaveBeenCalled();
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ moderation_resolution: 'target_unavailable' }));
  });
});

describe('MOD1R FIX1 — pending close: a second press never repeats the content action', () => {
  // Shared shape for all three: the first press's content mutation succeeds,
  // markPendingResolution's write lands, but every close retry then fails —
  // exactly the exhausted-retries case the task requires a real fix for.
  // The "second press" is retryClose() alone, exactly as AdminScreen's
  // Finish-review button calls it — never the original composite action.
  function failEveryCloseAfterPendingMark() {
    let call = 0;
    mockFeedbackFrom.mockImplementation(() => {
      call += 1;
      return call <= 2
        ? queryBuilder({ data: null, error: null }) // markActionIntent, then markPendingResolution
        : queryBuilder({ data: null, error: { message: 'timeout' } }); // every closeReport attempt
    });
  }

  it('rejectFlagReport: retryClose alone finishes the job without ever calling updateFlagStatus again', async () => {
    mockUpdateFlagStatus.mockResolvedValue(undefined);
    failEveryCloseAfterPendingMark();

    const first = await rejectFlagReport({
      reportId: 'report-1',
      flagId: 'flag-1',
      previousFlagStatus: 'open',
      reviewedBy: 'admin-1',
    });
    expect(first).toEqual({ closed: false, closeError: 'timeout', resolution: 'flag_rejected' });
    expect(mockUpdateFlagStatus).toHaveBeenCalledTimes(1);

    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: null }));
    const second = await retryClose('report-1', first.resolution, 'admin-1');

    expect(second).toEqual({ closed: true });
    expect(mockUpdateFlagStatus).toHaveBeenCalledTimes(1); // still the one original call
  });

  it('removeFlagReport: retryClose alone finishes the job without ever calling deleteFlag again', async () => {
    mockDeleteFlag.mockResolvedValue(undefined);
    failEveryCloseAfterPendingMark();

    const first = await removeFlagReport({ reportId: 'report-1', flagId: 'flag-1', reviewedBy: 'admin-1' });
    expect(first).toEqual({ closed: false, closeError: 'timeout', resolution: 'flag_removed' });
    expect(mockDeleteFlag).toHaveBeenCalledTimes(1);

    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: null }));
    const second = await retryClose('report-1', first.resolution, 'admin-1');

    expect(second).toEqual({ closed: true });
    expect(mockDeleteFlag).toHaveBeenCalledTimes(1);
  });

  it('removeCommentReport: retryClose alone finishes the job without ever calling deleteComment again', async () => {
    mockFetchCommentsByIds.mockResolvedValue([COMMENT]);
    mockDeleteComment.mockResolvedValue(undefined);
    failEveryCloseAfterPendingMark();

    const first = await removeCommentReport({
      reportId: 'report-1',
      commentId: 'comment-1',
      reviewedBy: 'admin-1',
    });
    expect(first).toEqual({ closed: false, closeError: 'timeout', resolution: 'comment_removed' });
    expect(mockDeleteComment).toHaveBeenCalledTimes(1);

    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: null }));
    const second = await retryClose('report-1', first.resolution, 'admin-1');

    expect(second).toEqual({ closed: true });
    expect(mockDeleteComment).toHaveBeenCalledTimes(1); // never repeated, even though its target is now gone
  });

  it('a pending-close report (resolution set, reviewedAt still null) keeps surfacing via listOpenReports after a reload', async () => {
    // Simulates a reload after markPendingResolution landed but every close
    // attempt failed in a prior session: the durable columns, not any local
    // state, are what a fresh listOpenReports() call sees.
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-1',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'flag', id: 'flag-1' }, 'spam'),
            moderation_reviewed_at: null,
            moderation_resolution: 'flag_rejected',
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([FLAG]);
    mockFetchCommentsByIds.mockResolvedValue([]);

    const [report] = await listOpenReports();

    expect(report.reviewedAt).toBeNull();
    expect(report.resolution).toBe('flag_rejected');
  });
});

describe('MOD1R FIX2 — pre-action intent gates the destructive action', () => {
  it('rejectFlagReport: never calls updateFlagStatus when the pre-action intent write fails', async () => {
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: { message: 'network blip' } }));

    await expect(
      rejectFlagReport({ reportId: 'report-1', flagId: 'flag-1', previousFlagStatus: 'open', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('network blip');

    expect(mockUpdateFlagStatus).not.toHaveBeenCalled();
  });

  it('removeFlagReport: never calls deleteFlag when the pre-action intent write fails', async () => {
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: { message: 'network blip' } }));

    await expect(
      removeFlagReport({ reportId: 'report-1', flagId: 'flag-1', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('network blip');

    expect(mockDeleteFlag).not.toHaveBeenCalled();
  });

  it('removeCommentReport: never calls deleteComment when the pre-action intent write fails (target still present)', async () => {
    mockFetchCommentsByIds.mockResolvedValue([COMMENT]); // still exists — takes the destructive path
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: { message: 'network blip' } }));

    await expect(
      removeCommentReport({ reportId: 'report-1', commentId: 'comment-1', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('network blip');

    expect(mockDeleteComment).not.toHaveBeenCalled();
  });
});

describe('MOD1R FIX2 — surviving total post-action write loss (the bug this fix repairs)', () => {
  // The exact failure this task exists to close: the content action
  // succeeds, but BOTH markPendingResolution() and every close retry then
  // also fail (same outage, worse luck) — moderation_resolution is left
  // null, same as an untouched report. Only moderation_action_intent (this
  // fix's pre-action write) survives. A full reload — a fresh
  // listOpenReports() call with no memory of this session — must still
  // recover the true outcome from the live target.
  function failEveryPostActionWrite() {
    let call = 0;
    mockFeedbackFrom.mockImplementation(() => {
      call += 1;
      return call === 1
        ? queryBuilder({ data: null, error: null }) // markActionIntent — the one write that survives
        : queryBuilder({ data: null, error: { message: 'outage' } }); // markPendingResolution + every close attempt
    });
  }

  it('flag reject: content action succeeds, every durable write after it is lost, reload still recovers flag_rejected and never re-offers Reject', async () => {
    mockUpdateFlagStatus.mockResolvedValue(undefined);
    failEveryPostActionWrite();

    const inSession = await rejectFlagReport({
      reportId: 'report-1',
      flagId: 'flag-1',
      previousFlagStatus: 'open',
      reviewedBy: 'admin-1',
    });
    expect(inSession).toEqual({ closed: false, closeError: 'outage', resolution: 'flag_rejected' });
    expect(mockUpdateFlagStatus).toHaveBeenCalledTimes(1); // the destructive step ran exactly once

    // Reload: a brand-new listOpenReports() call, no in-memory state carried
    // over. The DB truthfully has resolution=null (every post-action write
    // failed) but moderation_action_intent='flag_rejected' survived, and the
    // flag itself really is 'rejected' now.
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-1',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'flag', id: 'flag-1' }, 'spam'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
            moderation_action_intent: 'flag_rejected',
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([{ ...FLAG, status: 'rejected' }]);
    mockFetchCommentsByIds.mockResolvedValue([]);

    const [reloaded] = await listOpenReports();

    // Original successful resolution is recoverable...
    expect(reloaded.resolution).toBe('flag_rejected');
    // ...report is truthfully still open (not silently marked reviewed)...
    expect(reloaded.reviewedAt).toBeNull();
    // ...and AdminScreen's pendingResolutionFor() = report.resolution ??
    // pendingResolutions[id] is now non-null purely from the durable
    // column, so it renders ONLY the close-only "Finish review" control —
    // the original Reject/Remove buttons never come back.
  });

  it('flag remove: content action succeeds, every durable write after it is lost, reload still recovers flag_removed and never re-offers Remove', async () => {
    mockDeleteFlag.mockResolvedValue(undefined);
    failEveryPostActionWrite();

    const inSession = await removeFlagReport({ reportId: 'report-1', flagId: 'flag-1', reviewedBy: 'admin-1' });
    expect(inSession).toEqual({ closed: false, closeError: 'outage', resolution: 'flag_removed' });
    expect(mockDeleteFlag).toHaveBeenCalledTimes(1);

    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-1',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'flag', id: 'flag-1' }, 'spam'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
            moderation_action_intent: 'flag_removed',
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([]); // really deleted
    mockFetchCommentsByIds.mockResolvedValue([]);

    const [reloaded] = await listOpenReports();

    expect(reloaded.resolution).toBe('flag_removed');
    expect(reloaded.reviewedAt).toBeNull();
  });

  it('comment delete: content action succeeds, every durable write after it is lost, reload still recovers comment_removed and never re-offers Delete', async () => {
    mockFetchCommentsByIds.mockResolvedValueOnce([COMMENT]); // exists at action time
    mockDeleteComment.mockResolvedValue(undefined);
    failEveryPostActionWrite();

    const inSession = await removeCommentReport({
      reportId: 'report-1',
      commentId: 'comment-1',
      reviewedBy: 'admin-1',
    });
    expect(inSession).toEqual({ closed: false, closeError: 'outage', resolution: 'comment_removed' });
    expect(mockDeleteComment).toHaveBeenCalledTimes(1);

    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-1',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'comment', id: 'comment-1', flagId: 'flag-1' }, 'harassment'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
            moderation_action_intent: 'comment_removed',
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([FLAG]);
    mockFetchCommentsByIds.mockResolvedValue([]); // really deleted

    const [reloaded] = await listOpenReports();

    expect(reloaded.resolution).toBe('comment_removed');
    expect(reloaded.reviewedAt).toBeNull();
  });
});

describe('MOD1R FIX2 — reconciliation never lies at the boundaries', () => {
  it('intent recorded but the action never actually ran: target unchanged, so the ORIGINAL action is offered again — never a lie', async () => {
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-1',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'flag', id: 'flag-1' }, 'spam'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
            moderation_action_intent: 'flag_rejected',
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([FLAG]); // still 'open' — the reject never landed
    mockFetchCommentsByIds.mockResolvedValue([]);

    const [report] = await listOpenReports();

    expect(report.resolution).toBeNull();
    expect(report.targetAvailable).toBe(true); // safe to retry rejectFlagReport from scratch
  });

  it('flag_rejected intent but the flag is entirely gone: genuinely ambiguous — fails closed, no destructive button offered', async () => {
    mockFeedbackFrom.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'report-1',
            created_at: '2026-08-20T00:00:00.000Z',
            body: buildReportBody({ kind: 'flag', id: 'flag-1' }, 'spam'),
            moderation_reviewed_at: null,
            moderation_resolution: null,
            moderation_action_intent: 'flag_rejected',
          },
        ],
        error: null,
      }),
    );
    mockFetchFlagsByIds.mockResolvedValue([]); // can't prove the reject happened before the flag vanished
    mockFetchCommentsByIds.mockResolvedValue([]);

    const [report] = await listOpenReports();

    // Cannot recover a truthful resolution — stays unresolved rather than
    // guessing. targetAvailable is already false, so AdminScreen's
    // targetAvailable gate withholds Reject/Remove regardless; only the
    // non-destructive target-unavailable/no-action close is ever offered.
    expect(report.resolution).toBeNull();
    expect(report.targetAvailable).toBe(false);
  });

  it('already-missing target before any action is still recorded as target_unavailable, unaffected by intent reconciliation', async () => {
    mockFetchCommentsByIds.mockResolvedValue([]); // already gone
    const builder = queryBuilder({ data: null, error: null });
    mockFeedbackFrom.mockReturnValue(builder);

    const result = await removeCommentReport({
      reportId: 'report-1',
      commentId: 'comment-1',
      reviewedBy: 'admin-1',
    });

    expect(result).toEqual({ closed: true });
    expect(mockDeleteComment).not.toHaveBeenCalled();
    // No content mutation happened, so no intent was ever written for this
    // path — closeAfterContentAction runs directly with 'target_unavailable'.
    expect(builder.update).not.toHaveBeenCalledWith(expect.objectContaining({ moderation_action_intent: expect.anything() }));
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ moderation_resolution: 'target_unavailable' }));
  });
});
