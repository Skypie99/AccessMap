// Receipt capability status. Works after Auth removal and reveals no account,
// object, error, or review detail. Invalid and unknown receipts are identical.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, corsPreflight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECEIPT_RE = /^[0-9a-f]{64}$/i;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return json(405, { status: 'error' });
  let body: { operationId?: unknown; receiptSecret?: unknown };
  try { body = await req.json(); } catch { return json(400, { status: 'error' }); }
  if (typeof body.operationId !== 'string' || !UUID_RE.test(body.operationId)
    || typeof body.receiptSecret !== 'string' || !RECEIPT_RE.test(body.receiptSecret)) return json(400, { status: 'error' });
  try {
    const { data, error } = await admin.rpc('account_deletion_receipt_status', {
      p_operation_id: body.operationId,
      p_receipt_hash: await sha256Hex(body.receiptSecret),
    }).maybeSingle();
    if (error || !data) return json(404, { status: 'not_found' });
    return json(200, { status: receiptStatus(data.status), requestedAt: data.requested_at, completedAt: data.completed_at });
  } catch {
    console.error('[account-deletion-status] lookup failed.');
    return json(503, { status: 'unavailable' });
  }
});

function receiptStatus(status: string): 'REQUESTED' | 'DELETING' | 'REVIEWING' | 'COMPLETE' {
  if (status === 'COMPLETE') return 'COMPLETE';
  if (status === 'FAILED_REVIEW_REQUIRED') return 'REVIEWING';
  if (status === 'REQUESTED') return 'REQUESTED';
  return 'DELETING';
}
async function sha256Hex(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
