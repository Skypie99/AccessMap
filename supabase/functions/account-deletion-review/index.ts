// Sky-only, narrowly scoped privacy-review continuation. This is not a client
// permission or public admin API; deployment supplies the server-only secret.
// It accepts redacted evidence and exact keys only, never photo bytes or URLs.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  const absentIntentIds = uuidArray(body.absentIntentIds);
  const exactObjectKeys = keyArray(body.exactObjectKeys);
  if (typeof body.operationId !== 'string' || !UUID_RE.test(body.operationId)
    || typeof body.evidenceDigest !== 'string' || !DIGEST_RE.test(body.evidenceDigest)
    || absentIntentIds === null || exactObjectKeys === null
    || typeof body.resolveIntents !== 'boolean' || typeof body.resolveHistoric !== 'boolean') {
    return new Response('Invalid request', { status: 400 });
  }
  const { error } = await admin.rpc('resolve_account_deletion_review', {
    p_operation_id: body.operationId,
    p_evidence_digest: body.evidenceDigest,
    p_absent_intent_ids: absentIntentIds,
    p_exact_object_keys: exactObjectKeys,
    p_resolve_intents: body.resolveIntents,
    p_resolve_historic: body.resolveHistoric,
  });
  if (error) {
    console.error('[account-deletion-review] resolution failed.');
    return new Response('Unavailable', { status: 503 });
  }
  return new Response(JSON.stringify({ status: 'requeued' }), { headers: { 'Content-Type': 'application/json' } });
});

function uuidArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  return Array.isArray(value) && value.length <= 250 && value.every((item) => typeof item === 'string' && UUID_RE.test(item)) ? value : null;
}
function keyArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  return Array.isArray(value) && value.length <= 500 && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 512 && !/[\u0000-\u001f]/.test(item)) ? value : null;
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
