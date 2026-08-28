// Stateless scheduled worker. Deployment must wire this to a scheduler and a
// server-only secret separately; this source artifact creates neither. Postgres
// owns leases, retry count, review escalation, and every durable transition.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WORKER_SECRET = Deno.env.get('ACCOUNT_DELETION_WORKER_SECRET') ?? '';
const BUCKET = 'flag-photos';
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Operation = {
  operation_id: string;
  subject_id: string | null;
  status: string;
  last_error_code?: string | null;
};

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
  } catch {
    await retryOrReview(operation.operation_id, leaseToken, 'worker_processing_failed');
    console.error('[account-deletion-worker] processing failed.');
    return json({ status: 'retry_scheduled' }, 202);
  }
});

async function process(claimed: Operation, leaseToken: string): Promise<void> {
  let operation = claimed;
  if (operation.status === 'REQUESTED') {
    operation = await rpcOperation('lock_requested_account_deletion', {
      p_operation_id: operation.operation_id, p_lease_token: leaseToken,
    });
  }
  if (!operation.subject_id) throw new Error('non-complete operation has no subject');

  // A prior provider result was uncertain. Reconcile before attempting any
  // other side effect; no status endpoint can call this a failure meanwhile.
  if (operation.status === 'RETRY_REQUIRED' && operation.last_error_code === 'auth_outcome_ambiguous') {
    await reconcileAuth(operation, leaseToken);
    return;
  }
  if (operation.status === 'AUTH_DELETED') {
    await reconcileAuth(operation, leaseToken);
    return;
  }
  if (operation.status === 'READY_FOR_AUTH_DELETE') {
    await deleteAuthLast(operation, leaseToken);
    return;
  }

  const { data: reviewReason, error: reviewError } = await admin.rpc('account_deletion_requires_review', {
    p_operation_id: operation.operation_id,
  });
  if (reviewError) throw reviewError;
  if (reviewReason) {
    // Deterministic provenance/security ambiguity is immediate review, not a
    // timed sweep. PREPARED/AMBIGUOUS never reaches automatic cleanup.
    await rpcVoid('move_account_deletion_to_review', {
      p_operation_id: operation.operation_id, p_lease_token: leaseToken, p_reason: String(reviewReason),
    });
    return;
  }

  operation = await rpcOperation('begin_account_deletion_cleaning', {
    p_operation_id: operation.operation_id, p_lease_token: leaseToken,
  });
  const keys = await exactCanonicalKeys(operation.operation_id, operation.subject_id);
  await removeExactKeys(keys);
  await assertExactKeysAbsent(keys);

  await rpcVoid('purge_deleting_account', {
    p_operation_id: operation.operation_id, p_user_id: operation.subject_id,
  });
  await rpcOperation('mark_account_deletion_verifying', {
    p_operation_id: operation.operation_id, p_lease_token: leaseToken,
  });
  operation = await rpcOperation('mark_account_deletion_ready_for_auth', {
    p_operation_id: operation.operation_id, p_lease_token: leaseToken,
  });
  await deleteAuthLast(operation, leaseToken);
}

async function exactCanonicalKeys(operationId: string, subjectId: string): Promise<string[]> {
  const [intents, primary, gallery, reportTree, avatar, reviewed] = await Promise.all([
    admin.from('flag_photo_upload_intents').select('object_key').eq('subject_id', subjectId).eq('status', 'COMMITTED'),
    admin.from('flags').select('photo_object_key').eq('photo_uploader_id', subjectId).not('photo_object_key', 'is', null),
    admin.from('flag_photos').select('object_key').eq('uploader_id', subjectId).not('object_key', 'is', null),
    admin.from('flag_photos').select('object_key, flags!inner(user_id)').eq('flags.user_id', subjectId).not('object_key', 'is', null),
    admin.from('users').select('avatar_object_key').eq('id', subjectId).not('avatar_object_key', 'is', null),
    admin.from('account_deletion_review_objects').select('object_key').eq('operation_id', operationId),
  ]);
  const failed = intents.error ?? primary.error ?? gallery.error ?? reportTree.error ?? avatar.error ?? reviewed.error;
  if (failed) throw failed;
  const values = [
    ...(intents.data ?? []).map((row) => row.object_key),
    ...(primary.data ?? []).map((row) => row.photo_object_key),
    ...(gallery.data ?? []).map((row) => row.object_key),
    ...(reportTree.data ?? []).map((row) => row.object_key),
    ...(avatar.data ?? []).map((row) => row.avatar_object_key),
    ...(reviewed.data ?? []).map((row) => row.object_key),
  ];
  return [...new Set(values.filter((key): key is string => typeof key === 'string' && key.length > 0))];
}

async function removeExactKeys(keys: readonly string[]): Promise<void> {
  for (let index = 0; index < keys.length; index += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(keys.slice(index, index + 100));
    if (error) throw error;
  }
}

// This is an exact-key query, not a root/prefix list. Its hosted timing and
// owner semantics remain a staging deployment gate; an empty listing is never
// used as proof for a PREPARED or AMBIGUOUS intent.
async function assertExactKeysAbsent(keys: readonly string[]): Promise<void> {
  for (const key of keys) {
    const { data, error } = await admin.schema('storage').from('objects')
      .select('name').eq('bucket_id', BUCKET).eq('name', key).maybeSingle();
    if (error || data) throw error ?? new Error('canonical object remains');
  }
}

async function deleteAuthLast(operation: Operation, leaseToken: string): Promise<void> {
  if (!operation.subject_id) throw new Error('Auth deletion subject missing');
  const lookup = await admin.auth.admin.getUserById(operation.subject_id);
  if (lookup.data.user) {
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
    p_operation_id: operation.operation_id, p_lease_token: leaseToken,
  });
  await reconcileAuth(authDeleted, leaseToken);
}

async function reconcileAuth(operation: Operation, leaseToken: string): Promise<void> {
  if (!operation.subject_id) throw new Error('Auth reconciliation subject missing');
  const lookup = await admin.auth.admin.getUserById(operation.subject_id);
  if (lookup.data.user) {
    // Retry deletion only after the authoritative lookup proves the account
    // remains. A provider error instead stays RETRY_REQUIRED/reviewable.
    await deleteAuthLast(operation, leaseToken);
    return;
  }
  if (!isNotFound(lookup.error)) {
    await retryOrReview(operation.operation_id, leaseToken, 'auth_outcome_ambiguous');
    return;
  }
  if (operation.status !== 'AUTH_DELETED') {
    await rpcOperation('mark_account_deletion_auth_deleted', {
      p_operation_id: operation.operation_id, p_lease_token: leaseToken,
    });
  }
  await rpcVoid('complete_account_deletion', { p_operation_id: operation.operation_id, p_lease_token: leaseToken });
}

async function retryOrReview(operationId: string, leaseToken: string, code: string): Promise<void> {
  await admin.rpc('retry_or_review_account_deletion', {
    p_operation_id: operationId, p_lease_token: leaseToken, p_error_code: code,
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
