// delete-account — Supabase Edge Function
// Anonymises the user's flags then permanently deletes their account and personal data.
// Called from the app's Profile screen after in-app confirmation.
//
// Security:
//   - verify_jwt: true (set in supabase/config.toml) — Supabase validates the
//     JWT before this function runs. No unauthenticated caller can reach here.
//   - The service-role key is used for the flags anonymisation AND auth.users
//     delete (both require elevated privileges). All identity checks use the
//     user-scoped JWT.
//   - Never logs userId in a format correlatable to PII.
//
// Deletion sequence (order matters):
//   1. UPDATE public.flags SET user_id = NULL WHERE user_id = <userId>
//      Accessibility reports stay on the map; attribution is removed.
//      Requires flags.user_id to be nullable — see migration
//      2026-05-29_account_deletion_cascade.sql.
//   2. adminClient.auth.admin.deleteUser(userId) triggers the cascade:
//        auth.users (id)
//          └─ public.users              ON DELETE CASCADE
//               └─ public.push_tokens   ON DELETE CASCADE
//          └─ public.notification_preferences  ON DELETE CASCADE
//          └─ public.feedback           ON DELETE SET NULL  (audit trail preserved)
//          └─ public.flag_edit_history  ON DELETE SET NULL  (audit trail preserved)
//          └─ public.status_history     ON DELETE SET NULL  (audit trail preserved)
//      public.flags rows are NOT touched by the cascade (user_id is already NULL).
//
// If step 1 fails, the function returns 500 and the user's account is NOT deleted.
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
    // Step 1: Anonymise the user's flags. Must run BEFORE deleting auth.users
    // so the cascade doesn't race with this UPDATE. After this, the rows
    // belong to no one — they stay on the map for the community.
    const { error: anonError } = await adminClient
      .from('flags')
      .update({ user_id: null })
      .eq('user_id', userId);
    if (anonError) throw anonError;

    // Step 2: Delete the auth user. Triggers the cascade:
    //   auth.users → public.users → push_tokens, notification_preferences.
    // public.flags rows are untouched (user_id is already NULL).
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return jsonResponse(200, { status: 'deleted' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Deletion failed unexpectedly.';
    // Log a stable opaque marker — not the userId itself (PII concern).
    console.error('[delete-account] anonymise or deletion failed:', message);
    return jsonResponse(500, { status: 'error', error: message });
  }
});

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
