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
} from '../adminReports';

/** A thenable query-builder stub: every chain method returns itself, and it
 *  resolves to `result` however long the chain runs before being awaited. */
function queryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = jest.fn(() => builder);
  for (const method of ['select', 'is', 'in', 'order', 'limit', 'update', 'eq']) {
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
  it('rejects the flag, THEN closes the report — content action first', async () => {
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
    expect(callOrder).toEqual(['updateFlagStatus', 'feedback']);
    expect(mockUpdateFlagStatus).toHaveBeenCalledWith('flag-1', 'rejected', 'open');
  });

  it('never closes the report when the reject itself fails — report stays open for a full retry', async () => {
    mockUpdateFlagStatus.mockRejectedValue(new Error('RLS denied'));

    await expect(
      rejectFlagReport({ reportId: 'report-1', flagId: 'flag-1', previousFlagStatus: 'open', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('RLS denied');

    expect(mockFeedbackFrom).not.toHaveBeenCalled();
  });

  it('reject succeeds but the close write fails every retry: says so, does not throw, and never re-rejects', async () => {
    mockUpdateFlagStatus.mockResolvedValue(undefined);
    mockFeedbackFrom.mockReturnValue(queryBuilder({ data: null, error: { message: 'timeout' } }));

    const result = await rejectFlagReport({
      reportId: 'report-1',
      flagId: 'flag-1',
      previousFlagStatus: 'open',
      reviewedBy: 'admin-1',
    });

    expect(result).toEqual({ closed: false, closeError: 'timeout' });
    expect(mockUpdateFlagStatus).toHaveBeenCalledTimes(1); // the destructive step is never repeated
    expect(mockFeedbackFrom).toHaveBeenCalledTimes(3); // but the close write itself gets 3 attempts
  });

  it('reject succeeds and the close write recovers on a later attempt — one destructive call, one visible success', async () => {
    mockUpdateFlagStatus.mockResolvedValue(undefined);
    let call = 0;
    mockFeedbackFrom.mockImplementation(() => {
      call += 1;
      return call < 3
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
    expect(mockFeedbackFrom).toHaveBeenCalledTimes(3);
  });

  it('removeFlagReport deletes via the canonical deleteFlag(), then closes as flag_removed', async () => {
    mockDeleteFlag.mockResolvedValue(undefined);
    const builder = queryBuilder({ data: null, error: null });
    mockFeedbackFrom.mockReturnValue(builder);

    const result = await removeFlagReport({ reportId: 'report-1', flagId: 'flag-1', reviewedBy: 'admin-1' });

    expect(result).toEqual({ closed: true });
    expect(mockDeleteFlag).toHaveBeenCalledWith('flag-1');
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ moderation_resolution: 'flag_removed' }));
  });

  it('removeFlagReport never closes the report when deleteFlag fails', async () => {
    mockDeleteFlag.mockRejectedValue(new Error('not found'));
    await expect(
      removeFlagReport({ reportId: 'report-1', flagId: 'flag-1', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('not found');
    expect(mockFeedbackFrom).not.toHaveBeenCalled();
  });

  it('removeCommentReport deletes via the canonical deleteComment(), then closes as comment_removed', async () => {
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
    mockDeleteComment.mockRejectedValue(new Error('already gone'));
    await expect(
      removeCommentReport({ reportId: 'report-1', commentId: 'comment-1', reviewedBy: 'admin-1' }),
    ).rejects.toThrow('already gone');
    expect(mockFeedbackFrom).not.toHaveBeenCalled();
  });
});
