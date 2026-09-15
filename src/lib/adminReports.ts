/**
 * Phase 03B admin moderation data layer.
 *
 * Reads are capability-gated by list_open_moderation_reports. Decisions use
 * moderate_report, which owns the report close and any associated content
 * mutation in one database transaction. The client never writes moderation
 * columns or content separately and never supplies the acting user id.
 */
import { supabase } from './supabase';
import { errorMessage } from './errors';
import { fetchFlagsByIds, FlagStatusConflictError } from './flags';
import { fetchCommentsByIds } from './comments';
import { parseReportBody } from './reports';
import type { ReportCategoryId } from './copy';
import type {
  CommentRow,
  FlagRow,
  FlagStatus,
  ModerationResolution,
  RejectReasonCode,
} from '@/types/database';

export type AdminReport = {
  id: string;
  createdAt: string;
  reason: string;
  category?: ReportCategoryId;
  /** True when the server returned a report envelope the client cannot parse. */
  malformed: boolean;
  rawBody: string;
  targetKind: 'flag' | 'comment' | null;
  targetId: string | null;
  /** The reported flag, or a reported comment's parent flag for context. */
  flag: FlagRow | null;
  comment: CommentRow | null;
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
};

export class ModerationQueueUnavailableError extends Error {
  constructor() {
    super('The moderation report queue is unavailable.');
    this.name = 'ModerationQueueUnavailableError';
  }
}

/**
 * Open report envelopes, oldest first. The RPC proves admin capability and
 * returns only report-shaped rows; the client never selects optional columns
 * directly through permissive feedback policies.
 */
export async function listOpenReports(limit = 100): Promise<AdminReport[]> {
  const { data, error } = await supabase.rpc('list_open_moderation_reports', {
    p_limit: limit,
  });
  if (error) throw new ModerationQueueUnavailableError();
  return hydrateReports((data ?? []) as FeedbackReportColumns[]);
}

async function hydrateReports(rows: FeedbackReportColumns[]): Promise<AdminReport[]> {
  const parsedRows = rows.map((row) => ({ row, parsed: parseReportBody(row.body) }));
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
  const flagById = new Map(flags.map((flag) => [flag.id, flag]));
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));

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
    const flag =
      target.kind === 'flag'
        ? (flagById.get(target.id) ?? null)
        : target.flagId
          ? (flagById.get(target.flagId) ?? null)
          : null;
    const comment =
      target.kind === 'comment' ? (commentById.get(target.id) ?? null) : null;

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
      targetAvailable: target.kind === 'flag' ? flag !== null : comment !== null,
      reviewedAt: row.moderation_reviewed_at,
      resolution: row.moderation_resolution,
    } satisfies AdminReport;
  });
}

export type ContentActionResult = { closed: true };

async function moderateReport(
  reportId: string,
  resolution: ModerationResolution,
  expectedFlagStatus: FlagStatus | null,
  moderationReason: RejectReasonCode | null,
): Promise<ContentActionResult> {
  const { error } = await supabase.rpc('moderate_report', {
    p_report_id: reportId,
    p_resolution: resolution,
    p_expected_flag_status: expectedFlagStatus,
    p_moderation_reason: moderationReason,
  });
  if (
    error &&
    (error.code === '40001' ||
      error.code === 'P0002' ||
      (error.code === 'P0001' && /changed|conflict|stale/i.test(error.message ?? '')))
  ) {
    throw new FlagStatusConflictError();
  }
  if (error) throw new Error(errorMessage(error));
  return { closed: true };
}

export async function rejectFlagReport(params: {
  reportId: string;
  previousFlagStatus: FlagStatus;
  reason: RejectReasonCode;
}): Promise<ContentActionResult> {
  return moderateReport(params.reportId, 'flag_rejected', params.previousFlagStatus, params.reason);
}

export async function removeFlagReport(params: {
  reportId: string;
}): Promise<ContentActionResult> {
  return moderateReport(params.reportId, 'flag_removed', null, null);
}

export async function removeCommentReport(params: {
  reportId: string;
}): Promise<ContentActionResult> {
  return moderateReport(params.reportId, 'comment_removed', null, null);
}

export async function closeReport(
  reportId: string,
  resolution: 'no_action' | 'target_unavailable',
): Promise<ContentActionResult> {
  return moderateReport(reportId, resolution, null, null);
}
