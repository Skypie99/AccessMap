// Sky-only, narrowly scoped privacy-review continuation. This is not a client
// permission or public admin API; deployment supplies the server-only secret.
// It accepts redacted evidence and exact keys only, never photo bytes or URLs.
import { createClient } from '../_shared/supabase.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVIEW_SECRET = Deno.env.get('ACCOUNT_DELETION_REVIEW_SECRET') ?? '';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST_RE = /^[0-9a-f]{64}$/;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST' || !await secretMatches(req.headers.get('x-account-deletion-review-secret'), REVIEW_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return new Response('Invalid request', { status: 400 }); }
  if (typeof body.operationId !== 'string' || !UUID_RE.test(body.operationId)
    || typeof body.evidenceDigest !== 'string' || !DIGEST_RE.test(body.evidenceDigest)
    || typeof body.reviewItemId !== 'string' || !UUID_RE.test(body.reviewItemId)
    || !isResolutionAction(body.action)) {
    return new Response('Invalid request', { status: 400 });
  }
  // One server-created item per request. The reviewer cannot submit a bulk
  // inventory, public URL, or arbitrary object key for the worker to delete.
  const { data, error } = await admin.rpc('resolve_account_deletion_review_item', {
    p_operation_id: body.operationId,
    p_evidence_digest: body.evidenceDigest,
    p_review_item_id: body.reviewItemId,
    p_action: body.action,
  });
  if (error) {
    console.error('[account-deletion-review] resolution failed.');
    return new Response('Unavailable', { status: 503 });
  }
  // A lost HTTP response can replay the identical review decision. The RPC
  // reports its durable truth, so this handler never claims a requeue while
  // unresolved items still block the operation.
  const status = data === 'requeued' || data === 'waiting_for_review' || data === 'resolved_item'
    ? data
    : null;
  if (!status) {
    console.error('[account-deletion-review] resolution returned an invalid state.');
    return new Response('Unavailable', { status: 503 });
  }
  return new Response(JSON.stringify({ status }), { headers: { 'Content-Type': 'application/json' } });
});

function isResolutionAction(value: unknown): value is 'DELETE' | 'PRESERVE_FOREIGN' | 'ACKNOWLEDGE' {
  return value === 'DELETE' || value === 'PRESERVE_FOREIGN' || value === 'ACKNOWLEDGE';
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
