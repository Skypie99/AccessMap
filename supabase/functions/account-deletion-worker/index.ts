// Stateless scheduled worker. Deployment must wire this to a scheduler and a
// server-only secret separately; this source artifact creates neither. Postgres
// owns leases, retry phase, review escalation, and every durable transition.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WORKER_SECRET = Deno.env.get('ACCOUNT_DELETION_WORKER_SECRET') ?? '';
const BUCKET = 'flag-photos';
const PAGE_SIZE = 100;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RetryPhase = 'LOCK_DRAIN' | 'CLEANING' | 'VERIFYING' | 'AUTH_DELETE' | 'AUTH_RECONCILIATION';
type Operation = {
  operation_id: string;
  subject_id: string | null;
  status: string;
  resume_from?: RetryPhase | null;
  last_error_code?: string | null;
};
type StorageObject = { name: string; owner_id: string | null };
type StoragePlan = { knownKeys: string[]; subjectOwnedKeys: string[] };
type Page<T> = { data: T[] | null; error: unknown };

class ReviewRequiredError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'ReviewRequiredError';
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST' || !await secretMatches(req.headers.get('x-account-deletion-worker-secret'), WORKER_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const leaseToken = crypto.randomUUID();
  const { data, error } = await admin.rpc('claim_next_account_deletion_operation', { p_lease_token: leaseToken });
  if (error) {
    console.error('[account-deletion-worker] claim failed.');
    return new Response('Unavailable', { status: 503 });
  }
  if (!data) return json({ status: 'idle' });

  const operation = data as Operation;
  try {
    await process(operation, leaseToken);
    return json({ status: 'processed' });
  } catch (error) {
    try {
      if (error instanceof ReviewRequiredError) {
        await rpcVoid('move_account_deletion_to_review', {
          p_operation_id: operation.operation_id,
          p_lease_token: leaseToken,
          p_reason: error.reason,
        });
        return json({ status: 'review_required' }, 202);
      }
      await retryOrReview(operation.operation_id, leaseToken, 'worker_processing_failed');
      return json({ status: 'retry_scheduled' }, 202);
    } catch {
      // Never say a retry or review was scheduled unless its durable transition
      // actually succeeded. Do not expose operation or subject details.
      console.error('[account-deletion-worker] failure transition failed.');
      return new Response('Unavailable', { status: 503 });
    }
  }
});

async function process(claimed: Operation, leaseToken: string): Promise<void> {
  let operation = claimed;
  if (operation.status === 'RETRY_REQUIRED' && operation.resume_from === 'AUTH_RECONCILIATION') {
    await reconcileAuth(operation, leaseToken);
    return;
  }
  if (operation.status === 'RETRY_REQUIRED') {
    operation = await rpcOperation('resume_account_deletion_operation', {
      p_operation_id: operation.operation_id,
      p_lease_token: leaseToken,
    });
  }
  if (operation.status === 'REQUESTED') {
    operation = await rpcOperation('lock_requested_account_deletion', {
      p_operation_id: operation.operation_id,
      p_lease_token: leaseToken,
    });
  }
  if (!operation.subject_id) throw new Error('non-complete operation has no subject');

  if (operation.status === 'AUTH_DELETED') {
    await reconcileAuth(operation, leaseToken);
    return;
  }
  if (operation.status === 'READY_FOR_AUTH_DELETE') {
    await deleteAuthLast(operation, leaseToken);
    return;
  }
  if (operation.status !== 'LOCKED' && operation.status !== 'CLEANING' && operation.status !== 'VERIFYING') {
    throw new Error('operation is not in a resumable pre-Auth phase');
  }

  const reviewReason = await reviewReasonFor(operation.operation_id);
  if (reviewReason) throw new ReviewRequiredError(reviewReason);

  const plan = await completeStoragePlan(operation.operation_id, operation.subject_id, leaseToken);
  if (operation.status === 'LOCKED') {
    operation = await rpcOperation('begin_account_deletion_cleaning', {
      p_operation_id: operation.operation_id,
      p_lease_token: leaseToken,
    });
  }
  if (operation.status === 'CLEANING') {
    await removeExactOwnedKeys(plan, operation.operation_id, operation.subject_id, leaseToken);
    await assertCompleteStorageInventory(plan.knownKeys, operation.operation_id, operation.subject_id, leaseToken);
    await renewLease(operation.operation_id, leaseToken);
    await rpcVoid('purge_deleting_account', {
      p_operation_id: operation.operation_id,
      p_user_id: operation.subject_id,
      p_lease_token: leaseToken,
    });
    operation = await rpcOperation('mark_account_deletion_verifying', {
      p_operation_id: operation.operation_id,
      p_lease_token: leaseToken,
    });
  }
  if (operation.status !== 'VERIFYING') throw new Error('operation did not enter verification');

  // Re-run the complete subject-owner inventory at the final pre-Auth gate.
  await assertCompleteStorageInventory(plan.knownKeys, operation.operation_id, operation.subject_id, leaseToken);
  operation = await rpcOperation('mark_account_deletion_ready_for_auth', {
    p_operation_id: operation.operation_id,
    p_lease_token: leaseToken,
  });
  await deleteAuthLast(operation, leaseToken);
}

async function reviewReasonFor(operationId: string): Promise<string | null> {
  const { data, error } = await admin.rpc('account_deletion_requires_review', { p_operation_id: operationId });
  if (error) throw error;
  return data ? String(data) : null;
}

async function completeStoragePlan(operationId: string, subjectId: string, leaseToken: string): Promise<StoragePlan> {
  const knownKeys = await exactKnownKeys(operationId, subjectId);
  const subjectOwned = await subjectOwnedStorageInventory(operationId, subjectId, leaseToken);
  const known = new Set(knownKeys);
  const unexpected = subjectOwned.filter((object) => !known.has(object.name));
  if (unexpected.length > 0) throw new ReviewRequiredError('unexpected_subject_owned_storage_object');

  // A forged application row must not authorize service-role deletion of an
  // object owned by another subject. Inspect the exact object immediately,
  // never infer ownership from photo_uploader_id or from a key prefix.
  for (const key of knownKeys) {
    const object = await exactStorageObject(key, operationId, leaseToken);
    if (object && !hasExactOwner(object, subjectId)) {
      throw new ReviewRequiredError('canonical_key_has_foreign_storage_owner');
    }
  }
  return { knownKeys, subjectOwnedKeys: subjectOwned.map((object) => object.name) };
}

async function exactKnownKeys(operationId: string, subjectId: string): Promise<string[]> {
  const [intents, primary, gallery, reportTree, avatar, reviewed] = await Promise.all([
    allRows((from, to) => admin.from('flag_photo_upload_intents').select('object_key').eq('subject_id', subjectId).range(from, to)),
    allRows((from, to) => admin.from('flags').select('photo_object_key').eq('photo_uploader_id', subjectId).not('photo_object_key', 'is', null).range(from, to)),
    allRows((from, to) => admin.from('flag_photos').select('object_key').eq('uploader_id', subjectId).not('object_key', 'is', null).range(from, to)),
    allRows((from, to) => admin.from('flag_photos').select('object_key, flags!inner(user_id)').eq('flags.user_id', subjectId).not('object_key', 'is', null).range(from, to)),
    allRows((from, to) => admin.from('users').select('avatar_object_key').eq('id', subjectId).not('avatar_object_key', 'is', null).range(from, to)),
    allRows((from, to) => admin.from('account_deletion_review_objects').select('object_key').eq('operation_id', operationId).range(from, to)),
  ]);
  const values = [
    ...intents.map((row) => row.object_key),
    ...primary.map((row) => row.photo_object_key),
    ...gallery.map((row) => row.object_key),
    ...reportTree.map((row) => row.object_key),
    ...avatar.map((row) => row.avatar_object_key),
    ...reviewed.map((row) => row.object_key),
  ];
  return [...new Set(values.filter((key): key is string => typeof key === 'string' && key.length > 0))];
}

async function subjectOwnedStorageInventory(operationId: string, subjectId: string, leaseToken: string): Promise<StorageObject[]> {
  return allRows(async (from, to) => {
    // A complete inventory can be long-running; retain ownership while each
    // page is read and before any following irreversible operation.
    await renewLease(operationId, leaseToken);
    return admin.schema('storage').from('objects').select('name, owner_id')
      .eq('bucket_id', BUCKET).eq('owner_id', subjectId).range(from, to);
  });
}

async function removeExactOwnedKeys(plan: StoragePlan, operationId: string, subjectId: string, leaseToken: string): Promise<void> {
  const subjectOwned = new Set(plan.subjectOwnedKeys);
  const candidateKeys = plan.knownKeys.filter((key) => subjectOwned.has(key));
  for (let index = 0; index < candidateKeys.length; index += PAGE_SIZE) {
    const batch = candidateKeys.slice(index, index + PAGE_SIZE);
    await renewLease(operationId, leaseToken);
    for (const key of batch) {
      const object = await exactStorageObject(key, operationId, leaseToken);
      if (!object) continue;
      if (!hasExactOwner(object, subjectId)) {
        throw new ReviewRequiredError('storage_owner_changed_before_delete');
      }
    }
    // The immediately preceding exact checks and lease renewal are required
    // before every service-role Storage delete batch.
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) throw error;
  }
}

async function assertCompleteStorageInventory(knownKeys: readonly string[], operationId: string, subjectId: string, leaseToken: string): Promise<void> {
  const inventory = await subjectOwnedStorageInventory(operationId, subjectId, leaseToken);
  if (inventory.length > 0) throw new Error('subject-owned storage residue remains');
  for (const key of knownKeys) {
    const object = await exactStorageObject(key, operationId, leaseToken);
    if (object && hasExactOwner(object, subjectId)) throw new Error('canonical storage object remains');
    if (object && !hasExactOwner(object, subjectId)) {
      throw new ReviewRequiredError('canonical_key_has_foreign_storage_owner');
    }
  }
}

async function exactStorageObject(key: string, operationId: string, leaseToken: string): Promise<StorageObject | null> {
  await renewLease(operationId, leaseToken);
  const { data, error } = await admin.schema('storage').from('objects').select('name, owner_id')
    .eq('bucket_id', BUCKET).eq('name', key).range(0, 0).maybeSingle();
  if (error) throw error;
  return data as StorageObject | null;
}

async function allRows<T extends Record<string, unknown>>(
  fetchPage: (from: number, to: number) => PromiseLike<Page<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function hasExactOwner(object: StorageObject, subjectId: string): boolean {
  return typeof object.owner_id === 'string' && object.owner_id.toLowerCase() === subjectId.toLowerCase();
}

async function deleteAuthLast(operation: Operation, leaseToken: string): Promise<void> {
  if (!operation.subject_id) throw new Error('Auth deletion subject missing');
  await renewLease(operation.operation_id, leaseToken);
  const lookup = await admin.auth.admin.getUserById(operation.subject_id);
  if (lookup.data.user) {
    await renewLease(operation.operation_id, leaseToken);
    const { error } = await admin.auth.admin.deleteUser(operation.subject_id);
    if (error) {
      await retryOrReview(operation.operation_id, leaseToken, 'auth_outcome_ambiguous');
      return;
    }
  } else if (!isNotFound(lookup.error)) {
    await retryOrReview(operation.operation_id, leaseToken, 'auth_outcome_ambiguous');
    return;
  }
  const authDeleted = await rpcOperation('mark_account_deletion_auth_deleted', {
    p_operation_id: operation.operation_id,
    p_lease_token: leaseToken,
  });
  await reconcileAuth(authDeleted, leaseToken);
}

async function reconcileAuth(operation: Operation, leaseToken: string): Promise<void> {
  if (!operation.subject_id) throw new Error('Auth reconciliation subject missing');
  await renewLease(operation.operation_id, leaseToken);
  const lookup = await admin.auth.admin.getUserById(operation.subject_id);
  if (lookup.data.user) {
    await deleteAuthLast(operation, leaseToken);
    return;
  }
  if (!isNotFound(lookup.error)) {
    await retryOrReview(operation.operation_id, leaseToken, 'auth_outcome_ambiguous');
    return;
  }
  let authDeleted = operation;
  if (operation.status !== 'AUTH_DELETED') {
    authDeleted = await rpcOperation('mark_account_deletion_auth_deleted', {
      p_operation_id: operation.operation_id,
      p_lease_token: leaseToken,
    });
  }
  if (!authDeleted.subject_id) throw new Error('Auth reconciliation lost its subject');
  // Final complete inventory repeats after Auth reconciliation, before the
  // operation redacts its subject and reaches COMPLETE.
  const knownKeys = await exactKnownKeys(authDeleted.operation_id, authDeleted.subject_id);
  await assertCompleteStorageInventory(knownKeys, authDeleted.operation_id, authDeleted.subject_id, leaseToken);
  await rpcVoid('complete_account_deletion', {
    p_operation_id: authDeleted.operation_id,
    p_lease_token: leaseToken,
  });
}

async function renewLease(operationId: string, leaseToken: string): Promise<void> {
  await rpcOperation('renew_account_deletion_lease', {
    p_operation_id: operationId,
    p_lease_token: leaseToken,
  });
}

async function retryOrReview(operationId: string, leaseToken: string, code: string): Promise<void> {
  await rpcVoid('retry_or_review_account_deletion', {
    p_operation_id: operationId,
    p_lease_token: leaseToken,
    p_error_code: code,
  });
}

async function rpcOperation(name: string, args: Record<string, unknown>): Promise<Operation> {
  const { data, error } = await admin.rpc(name, args);
  if (error || !data) throw error ?? new Error(`${name} returned no operation`);
  return data as Operation;
}

async function rpcVoid(name: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await admin.rpc(name, args);
  if (error) throw error;
}

function isNotFound(error: { status?: number } | null): boolean { return error?.status === 404; }

async function secretMatches(value: string | null, expected: string): Promise<boolean> {
  if (!value || !expected) return false;
  const [actual, wanted] = await Promise.all([digest(value), digest(expected)]);
  let difference = actual.length ^ wanted.length;
  for (let i = 0; i < Math.min(actual.length, wanted.length); i += 1) difference |= actual[i]! ^ wanted[i]!;
  return difference === 0;
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
