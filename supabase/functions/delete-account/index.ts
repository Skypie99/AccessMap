// Transaction A of D1F4 asynchronous account deletion. The client creates and
// secure-stores its operation id + 256-bit receipt secret before calling this
// endpoint. This endpoint derives the subject only from verified Auth, hashes
// the secret, and commits REQUESTED. It never cleans Storage or deletes Auth.

import { createClient } from '../_shared/supabase.ts';
import { corsHeaders, corsPreflight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECEIPT_RE = /^[0-9a-f]{64}$/i;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RequestBody = { operationId?: unknown; receiptSecret?: unknown };

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return json(405, { status: 'error' });

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return json(401, { status: 'error' });

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json(400, { status: 'error' });
  }
  if (typeof body.operationId !== 'string' || !UUID_RE.test(body.operationId)
    || typeof body.receiptSecret !== 'string' || !RECEIPT_RE.test(body.receiptSecret)) {
    return json(400, { status: 'error' });
  }

  try {
    const { data, error } = await admin.rpc('request_account_deletion', {
      p_operation_id: body.operationId,
      p_receipt_hash: await sha256Hex(body.receiptSecret),
      // Server-derived identity. The client-controlled receipt never chooses it.
      p_subject_id: user.id,
    }).single();
    if (error || !data) throw error ?? new Error('request not recorded');
    return json(202, { status: 'requested', requestedAt: data.requested_at });
  } catch {
    // A lost response is deliberately indistinguishable from a failed request
    // to the UI. The already stored receipt is the recovery capability.
    console.error('[delete-account] request recording failed.');
    return json(409, { status: 'error' });
  }
});

async function sha256Hex(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
