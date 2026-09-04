// Canonical ordinary-report deletion. The browser never receives service-role
// power or an arbitrary Storage inventory: this handler derives the actor from
// a verified bearer token, asks the server for the exact current flag plan,
// verifies every actual Storage owner, and refuses the relational delete until
// an authoritative exact-absence check succeeds.
//
// Root gateway configuration remains deliberately unchanged. This route uses
// the default gateway JWT protection and validates the bearer again here.

import { createClient } from '../_shared/supabase.ts';
import { corsHeaders, corsPreflight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'flag-photos';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RequestBody = { flagId?: unknown };
type DeletePlanItem = { object_key?: unknown; expected_owner_id?: unknown };
type StorageObject = { object_key?: unknown; owner_id?: unknown };

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
  if (typeof body.flagId !== 'string' || !UUID_RE.test(body.flagId)) return json(400, { status: 'error' });

  try {
    const { data, error } = await admin.rpc('account_deletion_prepare_flag_delete', {
      p_flag_id: body.flagId,
      p_actor_id: user.id,
    });
    if (error) return json(403, { status: 'error' });
    const plan = normalizePlan(data ?? []);

    for (const item of plan) {
      const object = await exactObject(item.objectKey);
      // Missing is idempotent. Present objects need an exact canonical owner
      // match, even for an admin: authorization to moderate a report never
      // converts foreign Storage metadata into deletion authority.
      if (object && object.ownerId !== item.expectedOwnerId) return json(409, { status: 'error' });
    }
    if (plan.length > 0) {
      const { error: removeError } = await admin.storage.from(BUCKET).remove(plan.map((item) => item.objectKey));
      if (removeError) return json(503, { status: 'error' });
    }
    for (const item of plan) {
      if (await exactObject(item.objectKey)) return json(409, { status: 'error' });
    }
    const { error: finalizeError } = await admin.rpc('account_deletion_finalize_flag_delete', {
      p_flag_id: body.flagId,
      p_actor_id: user.id,
    });
    if (finalizeError) return json(409, { status: 'error' });
    return json(200, { status: 'deleted' });
  } catch {
    // Do not reveal object keys, account roles, or whether a specific report
    // exists. A retry is safe because exact absence is idempotent.
    console.error('[delete-flag] canonical deletion failed.');
    return json(503, { status: 'error' });
  }
});

function normalizePlan(raw: unknown): { objectKey: string; expectedOwnerId: string }[] {
  if (!Array.isArray(raw)) throw new Error('invalid deletion plan');
  const seen = new Set<string>();
  return raw.map((item) => {
    const row = item as DeletePlanItem;
    if (typeof row.object_key !== 'string' || typeof row.expected_owner_id !== 'string'
      || row.object_key.length === 0 || row.object_key.length > 512 || !UUID_RE.test(row.expected_owner_id)
      || seen.has(row.object_key)) {
      throw new Error('invalid deletion plan');
    }
    seen.add(row.object_key);
    return { objectKey: row.object_key, expectedOwnerId: row.expected_owner_id };
  });
}

async function exactObject(objectKey: string): Promise<{ objectKey: string; ownerId: string | null } | null> {
  const { data, error } = await admin.rpc('account_deletion_storage_exact_object', { p_object_key: objectKey });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const object = row as StorageObject;
  if (typeof object.object_key !== 'string' || object.object_key !== objectKey) throw new Error('invalid exact object');
  return { objectKey: object.object_key, ownerId: typeof object.owner_id === 'string' ? object.owner_id : null };
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
