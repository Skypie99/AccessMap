// Small Deno- and client-independent protocol guard for the privileged review
// route. The database is authoritative for transitions; this only rejects a
// malformed RPC response rather than converting it into a false success.

export type ReviewResolutionStatus = 'requeued' | 'waiting_for_review' | 'complete';

export type ReviewOperationStatus =
  | 'REQUESTED'
  | 'LOCKED'
  | 'CLEANING'
  | 'VERIFYING'
  | 'READY_FOR_AUTH_DELETE'
  | 'RETRY_REQUIRED'
  | 'AUTH_DELETED'
  | 'FAILED_REVIEW_REQUIRED'
  | 'COMPLETE';

export type ReviewResolution = {
  status: ReviewResolutionStatus;
  operationStatus: ReviewOperationStatus;
};

const operationStatuses = new Set<ReviewOperationStatus>([
  'REQUESTED',
  'LOCKED',
  'CLEANING',
  'VERIFYING',
  'READY_FOR_AUTH_DELETE',
  'RETRY_REQUIRED',
  'AUTH_DELETED',
  'FAILED_REVIEW_REQUIRED',
  'COMPLETE',
]);

export function parseReviewResolution(value: unknown): ReviewResolution | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as { status?: unknown; operation_status?: unknown };
  if (
    (result.status !== 'requeued' && result.status !== 'waiting_for_review' && result.status !== 'complete')
    || typeof result.operation_status !== 'string'
    || !operationStatuses.has(result.operation_status as ReviewOperationStatus)
  ) {
    return null;
  }
  if (result.status === 'waiting_for_review' && result.operation_status !== 'FAILED_REVIEW_REQUIRED') return null;
  if (result.status === 'complete' && result.operation_status !== 'COMPLETE') return null;
  if (result.status === 'requeued' && ![
    'REQUESTED', 'LOCKED', 'CLEANING', 'VERIFYING', 'READY_FOR_AUTH_DELETE', 'RETRY_REQUIRED', 'AUTH_DELETED',
  ].includes(result.operation_status)) return null;
  return { status: result.status, operationStatus: result.operation_status as ReviewOperationStatus };
}
