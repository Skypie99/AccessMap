import { buildReportBody } from '../reports';
import type { CommentRow, FlagRow } from '@/types/database';
import {
  ModerationQueueUnavailableError,
  closeReport,
  listOpenReports,
  rejectFlagReport,
  removeCommentReport,
  removeFlagReport,
} from '../adminReports';
import { FlagStatusConflictError } from '../flags';

const mockRpc = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

const mockFetchFlagsByIds = jest.fn();
jest.mock('../flags', () => {
  const actual = jest.requireActual('../flags');
  return {
    ...actual,
    fetchFlagsByIds: (...args: unknown[]) => mockFetchFlagsByIds(...args),
  };
});

const mockFetchCommentsByIds = jest.fn();
jest.mock('../comments', () => ({
  fetchCommentsByIds: (...args: unknown[]) => mockFetchCommentsByIds(...args),
}));

const FLAG: FlagRow = {
  id: 'flag-1',
  user_id: 'reporter-1',
  lat: 1,
  lng: 1,
  category: 'blocked_path',
  description: 'x',
  severity: 3,
  photo_url: null,
  status: 'open',
  created_at: '2026-08-01T00:00:00.000Z',
};

const COMMENT: CommentRow = {
  id: 'comment-1',
  flag_id: 'flag-1',
  user_id: 'author-1',
  content: 'rude comment',
  created_at: '2026-08-01T00:00:00.000Z',
  display_name: 'Someone',
};

beforeEach(() => {
  jest.resetAllMocks();
  mockFetchFlagsByIds.mockResolvedValue([]);
  mockFetchCommentsByIds.mockResolvedValue([]);
});

describe('listOpenReports — capability-gated hydration', () => {
  it('uses list_open_moderation_reports rather than selecting feedback directly', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await expect(listOpenReports(25)).resolves.toEqual([]);

    expect(mockRpc).toHaveBeenCalledWith('list_open_moderation_reports', { p_limit: 25 });
  });

  it('fails closed with a recognizable queue-unavailable error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: '42883', message: 'function does not exist' },
    });

    await expect(listOpenReports()).rejects.toBeInstanceOf(ModerationQueueUnavailableError);
  });

  it('hydrates flag and comment targets without loading reporter identity', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'report-1',
          created_at: '2026-08-20T00:00:00.000Z',
          body: buildReportBody({ kind: 'flag', id: 'flag-1' }, 'This is fake'),
          moderation_reviewed_at: null,
          moderation_resolution: null,
        },
        {
          id: 'report-2',
          created_at: '2026-08-20T01:00:00.000Z',
          body: buildReportBody(
            { kind: 'comment', id: 'comment-1', flagId: 'flag-1' },
            'harassment',
          ),
          moderation_reviewed_at: null,
          moderation_resolution: null,
        },
      ],
      error: null,
    });
    mockFetchFlagsByIds.mockResolvedValue([FLAG]);
    mockFetchCommentsByIds.mockResolvedValue([COMMENT]);

    const reports = await listOpenReports();

    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({
      id: 'report-1',
      reason: 'This is fake',
      flag: FLAG,
      targetAvailable: true,
    });
    expect(reports[1]).toMatchObject({
      id: 'report-2',
      reason: 'harassment',
      flag: FLAG,
      comment: COMMENT,
      targetAvailable: true,
    });
    expect(mockFetchFlagsByIds).toHaveBeenCalledWith(['flag-1']);
    expect(mockFetchCommentsByIds).toHaveBeenCalledWith(['comment-1']);
  });

  it('surfaces malformed report envelopes rather than dropping them', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'report-bad',
          created_at: '2026-08-20T00:00:00.000Z',
          body: '[REPORT] v99 target=flag id=flag-1',
          moderation_reviewed_at: null,
          moderation_resolution: null,
        },
      ],
      error: null,
    });

    const [report] = await listOpenReports();

    expect(report).toMatchObject({
      id: 'report-bad',
      malformed: true,
      targetKind: null,
      targetAvailable: false,
    });
  });
});

describe('moderate_report — one atomic RPC per decision', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({ data: { closed: true }, error: null });
  });

  it('rejects with expected status and the explicit approved reason', async () => {
    await expect(
      rejectFlagReport({
        reportId: 'report-1',
        previousFlagStatus: 'open',
        reason: 'abusive_or_spam',
      }),
    ).resolves.toEqual({ closed: true });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('moderate_report', {
      p_report_id: 'report-1',
      p_resolution: 'flag_rejected',
      p_expected_flag_status: 'open',
      p_moderation_reason: 'abusive_or_spam',
    });
  });

  it.each([
    ['flag_removed', () => removeFlagReport({ reportId: 'report-1' })],
    ['comment_removed', () => removeCommentReport({ reportId: 'report-1' })],
    ['no_action', () => closeReport('report-1', 'no_action')],
    ['target_unavailable', () => closeReport('report-1', 'target_unavailable')],
  ] as const)('sends %s through exactly one RPC with no client actor', async (resolution, run) => {
    await run();

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('moderate_report', {
      p_report_id: 'report-1',
      p_resolution: resolution,
      p_expected_flag_status: null,
      p_moderation_reason: null,
    });
  });

  it('maps a stale report target to FlagStatusConflictError', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'This flag changed since you opened it. Refresh and try again.',
      },
    });

    await expect(
      rejectFlagReport({
        reportId: 'report-1',
        previousFlagStatus: 'open',
        reason: 'duplicate',
      }),
    ).rejects.toBeInstanceOf(FlagStatusConflictError);
  });

  it('surfaces non-conflict RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'admin required' },
    });

    await expect(closeReport('report-1', 'no_action')).rejects.toThrow(
      "You don't have permission to do that.",
    );
  });
});
