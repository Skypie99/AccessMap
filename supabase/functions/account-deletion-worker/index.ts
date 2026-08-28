// Stateless scheduled worker. Deployment must wire this to a scheduler and a
// server-only secret separately; this source artifact creates neither. Postgres
// owns leases, retry phase, review escalation, and every durable transition.

import { createClient } from '../_shared/supabase.ts';
import {
  ACCOUNT_DELETION_PAGE_SIZE,
  collectKeysetPages,
  hasExactTextOwner,
  processAccountDeletion,
  removeCheckedStorageBatches,
  ReviewRequiredError,
  type AccountDeletionOperation,
  type AccountDeletionWorkerGateway,
  type AuthLookup,
  type StorageObject,
  type StoragePlan,
} from '../_shared/accountDeletionWorkerCore.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WORKER_SECRET = Deno.env.get('ACCOUNT_DELETION_WORKER_SECRET') ?? '';
const BUCKET = 'flag-photos';
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  const operation = data as AccountDeletionOperation;
  try {
    await processAccountDeletion(createGateway(), operation, leaseToken);
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

function createGateway(): AccountDeletionWorkerGateway {
  return {
    resume: (operationId, leaseToken) => rpcOperation('resume_account_deletion_operation', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    lock: (operationId, leaseToken) => rpcOperation('lock_requested_account_deletion', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    beginCleaning: (operationId, leaseToken) => rpcOperation('begin_account_deletion_cleaning', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    markVerifying: (operationId, leaseToken) => rpcOperation('mark_account_deletion_verifying', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    markReadyForAuth: (operationId, leaseToken) => rpcOperation('mark_account_deletion_ready_for_auth', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    markAuthDeleted: (operationId, leaseToken) => rpcOperation('mark_account_deletion_auth_deleted', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    purge: (operationId, subjectId, leaseToken) => rpcVoid('purge_deleting_account', {
      p_operation_id: operationId, p_user_id: subjectId, p_lease_token: leaseToken,
    }),
    complete: (operationId, leaseToken) => rpcVoid('complete_account_deletion', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    renew: renewLease,
    retryOrReview,
    reviewReason: reviewReasonFor,
    captureHistoricalEvidence: (operationId, leaseToken) => rpcVoid('capture_account_deletion_historical_evidence', {
      p_operation_id: operationId, p_lease_token: leaseToken,
    }),
    completeStoragePlan,
    removeExactOwnedKeys,
    assertCompleteStorageInventory,
    getUserById,
    deleteUser,
  };
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
  const unexpected = subjectOwned.find((object) => !known.has(object.object_key));
  if (unexpected) {
    await captureExactReviewObject(operationId, leaseToken, unexpected.object_key, 'unexpected_subject_owned_storage_object');
    throw new ReviewRequiredError('unexpected_subject_owned_storage_object');
  }

  // A forged application row never authorizes service-role deletion of an
  // object owned by another subject. The authoritative owner value comes from
  // a fixed-bucket Storage RPC, never from a key prefix or a user-controlled URL.
  for (const key of knownKeys) {
    const object = await exactStorageObject(key, operationId, leaseToken);
    if (object && !hasExactTextOwner(object, subjectId)) {
      await captureExactReviewObject(operationId, leaseToken, key, 'canonical_key_has_foreign_storage_owner');
      throw new ReviewRequiredError('canonical_key_has_foreign_storage_owner');
    }
  }
  return { knownKeys, subjectOwnedKeys: subjectOwned.map((object) => object.object_key) };
}

async function exactKnownKeys(operationId: string, subjectId: string): Promise<string[]> {
  const [intents, primary, gallery, reportTree, avatar, reviewed] = await Promise.all([
    allRows((from, to) => admin.from('flag_photo_upload_intents').select('object_key').eq('subject_id', subjectId).order('object_key').range(from, to)),
    allRows((from, to) => admin.from('flags').select('photo_object_key').eq('photo_uploader_id', subjectId).not('photo_object_key', 'is', null).order('photo_object_key').range(from, to)),
    allRows((from, to) => admin.from('flag_photos').select('object_key').eq('uploader_id', subjectId).not('object_key', 'is', null).order('object_key').range(from, to)),
    allRows((from, to) => admin.from('flag_photos').select('object_key, flags!inner(user_id)').eq('flags.user_id', subjectId).not('object_key', 'is', null).order('object_key').range(from, to)),
    allRows((from, to) => admin.from('users').select('avatar_object_key').eq('id', subjectId).not('avatar_object_key', 'is', null).order('avatar_object_key').range(from, to)),
    allRows((from, to) => admin.from('account_deletion_review_items').select('object_key').eq('operation_id', operationId).eq('resolution', 'DELETE').not('object_key', 'is', null).order('object_key').range(from, to)),
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

async function subjectOwnedStorageInventory(
  operationId: string,
  subjectId: string,
  leaseToken: string,
): Promise<StorageObject[]> {
  return collectKeysetPages(async (after) => {
    await renewLease(operationId, leaseToken);
    const { data, error } = await admin.rpc('account_deletion_storage_owned_page', {
      p_subject_id: subjectId,
      p_after_object_key: after,
      p_limit: ACCOUNT_DELETION_PAGE_SIZE,
    });
    if (error) throw error;
    const items = (data ?? []).map((row: { object_key?: unknown; owner_id?: unknown }) => {
      if (typeof row.object_key !== 'string') throw new Error('storage inventory returned an invalid object key');
      return { object_key: row.object_key, owner_id: typeof row.owner_id === 'string' ? row.owner_id : null };
    });
    if (items.length > ACCOUNT_DELETION_PAGE_SIZE) throw new Error('storage inventory exceeded fixed page size');
    const nextCursor = items.length === ACCOUNT_DELETION_PAGE_SIZE
      ? items[items.length - 1]!.object_key
      : null;
    return { items, nextCursor };
  }, (object) => object.object_key);
}

async function removeExactOwnedKeys(
  plan: StoragePlan,
  operationId: string,
  subjectId: string,
  leaseToken: string,
): Promise<void> {
  await removeCheckedStorageBatches(
    plan.knownKeys,
    (key) => exactStorageObject(key, operationId, leaseToken),
    () => renewLease(operationId, leaseToken),
    async (keys) => {
      const { error } = await admin.storage.from(BUCKET).remove([...keys]);
      if (error) throw error;
    },
    subjectId,
  );
}

async function assertCompleteStorageInventory(
  knownKeys: readonly string[],
  operationId: string,
  subjectId: string,
  leaseToken: string,
): Promise<void> {
  const inventory = await subjectOwnedStorageInventory(operationId, subjectId, leaseToken);
  if (inventory.length > 0) throw new Error('subject-owned storage residue remains');
  for (const key of knownKeys) {
    const object = await exactStorageObject(key, operationId, leaseToken);
    if (object && hasExactTextOwner(object, subjectId)) throw new Error('canonical storage object remains');
    if (object && !hasExactTextOwner(object, subjectId)) {
      await captureExactReviewObject(operationId, leaseToken, key, 'canonical_key_has_foreign_storage_owner');
      throw new ReviewRequiredError('canonical_key_has_foreign_storage_owner');
    }
  }
}

async function exactStorageObject(key: string, operationId: string, leaseToken: string): Promise<StorageObject | null> {
  await renewLease(operationId, leaseToken);
  const { data, error } = await admin.rpc('account_deletion_storage_exact_object', {
    p_object_key: key,
  });
  if (error) throw error;
  if (!data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.object_key !== 'string') return null;
  return { object_key: row.object_key, owner_id: typeof row.owner_id === 'string' ? row.owner_id : null };
}

async function captureExactReviewObject(
  operationId: string,
  leaseToken: string,
  objectKey: string,
  reason: string,
): Promise<void> {
  await rpcVoid('capture_account_deletion_exact_review_object', {
    p_operation_id: operationId,
    p_lease_token: leaseToken,
    p_object_key: objectKey,
    p_reason: reason,
  });
}

async function allRows<T extends Record<string, unknown>>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += ACCOUNT_DELETION_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + ACCOUNT_DELETION_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < ACCOUNT_DELETION_PAGE_SIZE) return rows;
  }
}

async function getUserById(subjectId: string): Promise<AuthLookup> {
  const lookup = await admin.auth.admin.getUserById(subjectId);
  if (lookup.data.user) return 'PRESENT';
  return !lookup.error || isNotFound(lookup.error) ? 'ABSENT' : 'INDETERMINATE';
}

async function deleteUser(subjectId: string): Promise<boolean> {
  const { error } = await admin.auth.admin.deleteUser(subjectId);
  return !error;
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

async function rpcOperation(name: string, args: Record<string, unknown>): Promise<AccountDeletionOperation> {
  const { data, error } = await admin.rpc(name, args);
  if (error || !data) throw error ?? new Error(`${name} returned no operation`);
  return data as AccountDeletionOperation;
}

async function rpcVoid(name: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await admin.rpc(name, args);
  if (error) throw error;
}

function isNotFound(error: { status?: number } | null): boolean {
  return error?.status === 404;
}

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
