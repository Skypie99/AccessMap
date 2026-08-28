// This control flow is deliberately independent of Deno and the Supabase
// client. The worker injects the real service-role boundary, so the tests use
// the production state machine rather than a separate test-only model.

export const ACCOUNT_DELETION_PAGE_SIZE = 100;

export type RetryPhase = 'LOCK_DRAIN' | 'CLEANING' | 'VERIFYING' | 'AUTH_DELETE' | 'AUTH_RECONCILIATION';

export type AccountDeletionOperation = {
  operation_id: string;
  subject_id: string | null;
  status: string;
  resume_from?: RetryPhase | null;
  last_error_code?: string | null;
};

export type StorageObject = { object_key: string; owner_id: string | null };
export type StoragePlan = { knownKeys: string[]; subjectOwnedKeys: string[] };
export type AuthLookup = 'PRESENT' | 'ABSENT' | 'INDETERMINATE';

export class ReviewRequiredError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'ReviewRequiredError';
  }
}

/** The only mocked surface in state-machine tests. Every member is a real
 * RPC, Storage API, or Auth-admin boundary in the Edge entrypoint. */
export type AccountDeletionWorkerGateway = {
  resume(operationId: string, leaseToken: string): Promise<AccountDeletionOperation>;
  lock(operationId: string, leaseToken: string): Promise<AccountDeletionOperation>;
  beginCleaning(operationId: string, leaseToken: string): Promise<AccountDeletionOperation>;
  markVerifying(operationId: string, leaseToken: string): Promise<AccountDeletionOperation>;
  markReadyForAuth(operationId: string, leaseToken: string): Promise<AccountDeletionOperation>;
  markAuthDeleted(operationId: string, leaseToken: string): Promise<AccountDeletionOperation>;
  purge(operationId: string, subjectId: string, leaseToken: string): Promise<void>;
  complete(operationId: string, leaseToken: string): Promise<void>;
  renew(operationId: string, leaseToken: string): Promise<void>;
  retryOrReview(operationId: string, leaseToken: string, code: string): Promise<void>;
  reviewReason(operationId: string): Promise<string | null>;
  captureHistoricalEvidence(operationId: string, leaseToken: string): Promise<void>;
  completeStoragePlan(operationId: string, subjectId: string, leaseToken: string): Promise<StoragePlan>;
  removeExactOwnedKeys(plan: StoragePlan, operationId: string, subjectId: string, leaseToken: string): Promise<void>;
  assertCompleteStorageInventory(keys: readonly string[], operationId: string, subjectId: string, leaseToken: string): Promise<void>;
  getUserById(subjectId: string): Promise<AuthLookup>;
  deleteUser(subjectId: string): Promise<boolean>;
};

/** Runs one claimed operation. Auth reconciliation stays a distinct safe phase
 * even after review escalation; only this path can reach AUTH_DELETED/COMPLETE. */
export async function processAccountDeletion(
  gateway: AccountDeletionWorkerGateway,
  claimed: AccountDeletionOperation,
  leaseToken: string,
): Promise<void> {
  let operation = claimed;
  if (operation.status === 'RETRY_REQUIRED' && operation.resume_from === 'AUTH_RECONCILIATION') {
    await reconcileAuth(gateway, operation, leaseToken);
    return;
  }
  if (operation.status === 'RETRY_REQUIRED') operation = await gateway.resume(operation.operation_id, leaseToken);
  if (operation.status === 'REQUESTED') operation = await gateway.lock(operation.operation_id, leaseToken);
  if (!operation.subject_id) throw new Error('non-complete operation has no subject');

  if (operation.status === 'AUTH_DELETED') return reconcileAuth(gateway, operation, leaseToken);
  if (operation.status === 'READY_FOR_AUTH_DELETE') return deleteAuthLast(gateway, operation, leaseToken);
  if (!['LOCKED', 'CLEANING', 'VERIFYING'].includes(operation.status)) {
    throw new Error('operation is not in a resumable pre-Auth phase');
  }

  // The durable capture occurs before relational purge can erase legacy or
  // backup associations needed for a later review decision.
  await gateway.captureHistoricalEvidence(operation.operation_id, leaseToken);
  const reviewReason = await gateway.reviewReason(operation.operation_id);
  if (reviewReason) throw new ReviewRequiredError(reviewReason);

  const plan = await gateway.completeStoragePlan(operation.operation_id, operation.subject_id, leaseToken);
  if (operation.status === 'LOCKED') operation = await gateway.beginCleaning(operation.operation_id, leaseToken);
  if (operation.status === 'CLEANING') {
    await gateway.removeExactOwnedKeys(plan, operation.operation_id, operation.subject_id, leaseToken);
    await gateway.assertCompleteStorageInventory(plan.knownKeys, operation.operation_id, operation.subject_id, leaseToken);
    await gateway.renew(operation.operation_id, leaseToken);
    await gateway.purge(operation.operation_id, operation.subject_id, leaseToken);
    operation = await gateway.markVerifying(operation.operation_id, leaseToken);
  }
  if (operation.status !== 'VERIFYING') throw new Error('operation did not enter verification');
  await gateway.assertCompleteStorageInventory(plan.knownKeys, operation.operation_id, operation.subject_id, leaseToken);
  operation = await gateway.markReadyForAuth(operation.operation_id, leaseToken);
  await deleteAuthLast(gateway, operation, leaseToken);
}

async function deleteAuthLast(
  gateway: AccountDeletionWorkerGateway,
  operation: AccountDeletionOperation,
  leaseToken: string,
): Promise<void> {
  if (!operation.subject_id) throw new Error('Auth deletion subject missing');
  await gateway.renew(operation.operation_id, leaseToken);
  const lookup = await gateway.getUserById(operation.subject_id);
  if (lookup === 'PRESENT') {
    await gateway.renew(operation.operation_id, leaseToken);
    if (!await gateway.deleteUser(operation.subject_id)) {
      await gateway.retryOrReview(operation.operation_id, leaseToken, 'auth_outcome_ambiguous');
      return;
    }
  } else if (lookup === 'INDETERMINATE') {
    await gateway.retryOrReview(operation.operation_id, leaseToken, 'auth_outcome_ambiguous');
    return;
  }
  await reconcileAuth(gateway, await gateway.markAuthDeleted(operation.operation_id, leaseToken), leaseToken);
}

async function reconcileAuth(
  gateway: AccountDeletionWorkerGateway,
  operation: AccountDeletionOperation,
  leaseToken: string,
): Promise<void> {
  if (!operation.subject_id) throw new Error('Auth reconciliation subject missing');
  await gateway.renew(operation.operation_id, leaseToken);
  const lookup = await gateway.getUserById(operation.subject_id);
  if (lookup === 'PRESENT') return deleteAuthLast(gateway, operation, leaseToken);
  if (lookup === 'INDETERMINATE') {
    await gateway.retryOrReview(operation.operation_id, leaseToken, 'auth_outcome_ambiguous');
    return;
  }
  const authDeleted = operation.status === 'AUTH_DELETED'
    ? operation
    : await gateway.markAuthDeleted(operation.operation_id, leaseToken);
  if (!authDeleted.subject_id) throw new Error('Auth reconciliation lost its subject');
  // This also re-enumerates durable canonical intent/review keys after Auth
  // reconciliation; an empty ad-hoc list would not prove their removal.
  const finalPlan = await gateway.completeStoragePlan(
    authDeleted.operation_id,
    authDeleted.subject_id,
    leaseToken,
  );
  await gateway.assertCompleteStorageInventory(
    finalPlan.knownKeys,
    authDeleted.operation_id,
    authDeleted.subject_id,
    leaseToken,
  );
  await gateway.complete(authDeleted.operation_id, leaseToken);
}

/** `storage.objects.owner_id` is treated as documented text. A malformed,
 * null, differently cased, or foreign value never authorizes deletion. */
export function hasExactTextOwner(object: Pick<StorageObject, 'owner_id'>, subjectId: string): boolean {
  return typeof object.owner_id === 'string' && object.owner_id === subjectId;
}

export type KeysetPage<T> = { items: readonly T[]; nextCursor: string | null };

/** Consumes the production keyset contract and fails closed on a duplicate or
 * non-advancing page, instead of accepting a partial inventory as complete. */
export async function collectKeysetPages<T>(
  fetchPage: (after: string | null) => Promise<KeysetPage<T>>,
  keyOf: (item: T) => string,
): Promise<T[]> {
  const all: T[] = [];
  const seen = new Set<string>();
  let after: string | null = null;
  for (;;) {
    const page = await fetchPage(after);
    for (const item of page.items) {
      const key = keyOf(item);
      if (!key || seen.has(key)) throw new Error('storage inventory page is not uniquely enumerable');
      if (after !== null && key <= after) throw new Error('storage inventory page is not strictly ordered');
      seen.add(key);
      all.push(item);
    }
    if (page.nextCursor === null) return all;
    if (after !== null && page.nextCursor <= after) throw new Error('storage inventory cursor did not advance');
    if (page.items.length === 0) throw new Error('storage inventory returned an empty nonterminal page');
    if (page.nextCursor !== keyOf(page.items[page.items.length - 1]!)) {
      throw new Error('storage inventory cursor does not match its final key');
    }
    after = page.nextCursor;
  }
}

/** The worker calls this helper immediately before each real Storage API
 * removal. Keeping this ordering here makes the stale-lease proof exercise
 * the exact production control path. */
export async function removeCheckedStorageBatches(
  keys: readonly string[],
  checkExactObject: (key: string) => Promise<StorageObject | null>,
  renewLease: () => Promise<void>,
  remove: (keys: readonly string[]) => Promise<void>,
  subjectId: string,
): Promise<void> {
  for (let index = 0; index < keys.length; index += ACCOUNT_DELETION_PAGE_SIZE) {
    const batch = keys.slice(index, index + ACCOUNT_DELETION_PAGE_SIZE);
    for (const key of batch) {
      const object = await checkExactObject(key);
      if (!object) continue;
      if (!hasExactTextOwner(object, subjectId)) {
        throw new ReviewRequiredError('storage_owner_changed_before_delete');
      }
    }
    // This is deliberately after all exact reads: a stale lease can never
    // proceed to a Storage deletion merely because it was valid earlier.
    await renewLease();
    await remove(batch);
  }
}
