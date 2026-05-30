// delete-account — Supabase Edge Function
// Permanently deletes the authenticated user's account and all associated data.
// Called from the app's Profile screen after in-app confirmation.
//
// Security:
//   - verify_jwt: true (set in supabase/config.toml) — Supabase validates the
//     JWT before this function runs. No unauthenticated caller can reach here.
//   - The service-role key is used ONLY for the auth.users delete (requires
//     admin privileges). All identity checks use the user-scoped JWT.
//   - Never logs userId in a format correlatable to PII.
//
// Cascade chain (all already in place — see 2026-05-29_account_deletion_cascade.sql):
//   auth.users (id)
//     └─ public.users              ON DELETE CASCADE
//          ├─ public.flags         ON DELETE CASCADE
//          └─ public.push_tokens   ON DELETE CASCADE
//     └─ public.notification_preferences  ON DELETE CASCADE
//     └─ public.feedback           ON DELETE SET NULL  (audit trail preserved)
//     └─ public.flag_edit_history  ON DELETE SET NULL  (audit trail preserved)
//     └─ public.status_history     ON DELETE SET NULL  (audit trail preserved)
//
// Calling adminClient.auth.admin.deleteUser(userId) triggers the full cascade.
//
// Deploy:
//   supabase functions deploy delete-account
//
// supabase/config.toml must include:
//   [functions.delete-account]
//   verify_jwt = true
//
// Returns:
//   200 { status: "deleted" }              — success; client should sign out locally
//   401 Unauthorized                        — missing/invalid JWT (Supabase-level)
//   500 { status: "error", error: string } — deletion failed; caller stays logged in

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Admin client — service-role key, only for auth.users delete.
// Never used for data queries; RLS on those remains enforced by the user client.
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { status: 'error', error: 'Method not allowed.' });
  }

  // Build a user-scoped client to resolve the caller's identity from their JWT.
  // Supabase already validated the token (verify_jwt: true), so getUser() here
  // is a cheap confirmation step, not a second verification round-trip.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse(401, { status: 'error', error: 'Not authenticated.' });
  }

  const userId = user.id;

  try {
    // Deleting auth.users triggers the full cascade. All of the user's data
    // (flags, push_tokens, notification_preferences) is removed atomically.
    // Rows with SET NULL (feedback, status_history, flag_edit_history) are
    // anonymised but preserved so audit trails remain coherent.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return jsonResponse(200, { status: 'deleted' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Deletion failed unexpectedly.';
    // Log a stable opaque marker — not the userId itself (PII concern).
    console.error('[delete-account] deletion failed:', message);
    return jsonResponse(500, { status: 'error', error: message });
  }
});

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
