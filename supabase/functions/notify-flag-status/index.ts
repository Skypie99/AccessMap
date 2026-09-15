// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).
//
// Security hardening (2026-05-25 — Steve/Jordan A1 fix; Wave 4 — old_record guard):
//   1. Shared-secret check  — caller must include `X-Webhook-Secret` matching
//      the NOTIFY_WEBHOOK_SECRET env var. Without this, anyone who knows the
//      function URL can POST arbitrary records and spam users with notifications,
//      or use the "sent" / "no token" difference as a user-enumeration oracle.
//   2. old_record guard     — only fires when `record.status` differs from
//      `old_record.status`. Prevents spurious notifications when unrelated
//      columns (description, photo_url, etc.) are updated on the same row.
//   3. Input validation     — if `record` or `old_record` is missing or malformed
//      the function returns 400 instead of crashing with a 500.
//   4. Oracle fix           — all non-error paths return 'ok' (same body),
//      so callers can't detect whether a given user_id has a push token.
//   5. Resilience           — send-push-notification failure does not 500 the
//      webhook; the status change already happened in the DB.
//
// Auth pattern: DB webhooks cannot carry a user JWT, so we use a shared secret
// (NOTIFY_WEBHOOK_SECRET) in a custom header instead of Supabase JWT verification.
//
// Notification delivery: delegates to the send-push-notification Edge Function,
// which handles push_tokens lookup, Expo token format validation, and the Expo
// Push API call. Requires SEND_PUSH_SECRET to be set as an Edge Function secret.
//
// RATE LIMITING — enforce at Supabase dashboard level (project → Settings →
// Edge Functions → Rate Limits). Recommended: 100 req/min per IP.
//
// Setup steps:
//   1. Generate NOTIFY_WEBHOOK_SECRET:  openssl rand -hex 32
//   2. Generate SEND_PUSH_SECRET:       openssl rand -hex 32
//      (skip step 2 if send-push-notification is already deployed with its own
//       SEND_PUSH_SECRET — reuse the same value here)
//   3. Supabase Dashboard → Edge Functions → Secrets → add both values.
//   4. Deploy: supabase functions deploy notify-flag-status
//   5. Create DB Webhook — see README.md §2.

import {
  buildNotificationForTransition,
  parseFlagStatusPreference,
  parseWebhookBody,
} from './notification.ts';

// ---------------------------------------------------------------------------
// 2. Auth gate — shared-secret check
// ---------------------------------------------------------------------------
// DB webhooks cannot carry a user JWT, so Supabase's built-in verify_jwt is
// not appropriate. We use a custom X-Webhook-Secret header instead.
// The secret is stored in Supabase Vault (name: 'webhook_secret') and verified
// via the public.verify_webhook_secret() RPC — both sides read from the same
// single source of truth, so rotation only needs to update Vault.
async function isAuthorized(req: Request): Promise<boolean> {
  const incoming = req.headers.get('X-Webhook-Secret');
  if (!incoming) return false;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_webhook_secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ incoming }),
    });
    if (!resp.ok) return false;
    return await resp.json() as boolean;
  } catch {
    return false;
  }
}

// Status notifications use the existing per-user preference. The service key
// is server-side only; failures are fail-closed so an opt-out is never bypassed
// because the preference lookup was unavailable.
async function flagStatusNotificationsEnabled(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/flag_status_notifications_enabled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ p_user_id: userId }),
    });
    if (!response.ok) return false;
    return parseFlagStatusPreference(await response.json()) ?? false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 4. Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {

  // 4a. Auth check — must come before any body parsing.
  if (!await isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 4b. Parse JSON body — reject on invalid JSON.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 });
  }

  // 4c. Validate body shape — reject on missing / wrong-typed required fields.
  const body = parseWebhookBody(rawBody);
  if (!body) {
    return new Response('Bad Request: missing or invalid record/old_record fields', {
      status: 400,
    });
  }

  const { record, old_record } = body;

  // 4d. Guard: only proceed if the status field actually changed.
  // Without this, any unrelated UPDATE (e.g. description edit) would fire a
  // notification even though status is unchanged.
  if (old_record.status === record.status) {
    return new Response('ok', { status: 200 });
  }

  // 4e. Build copy only for approved transitions. Restores are specifically
  // rejected -> open; other moves to open remain silent.
  const notification = buildNotificationForTransition(record, old_record);
  if (!notification) {
    if (record.status === 'rejected') {
      console.error('[notify-flag-status] approved rejection reason missing; skipping notification');
    }
    return new Response('ok', { status: 200 });
  }

  // 4f. Honor the existing status-notification preference. A missing row uses
  // the database default (enabled); lookup failures fail closed.
  if (!await flagStatusNotificationsEnabled(record.user_id)) {
    return new Response('ok', { status: 200 });
  }

  const { title: notifTitle, body: notifBody } = notification;

  // 4g. Build optional deep-link data so the app can navigate to the flag.
  const data: Record<string, unknown> = { screen: 'FlagDetail' };
  if (record.id) data['flagId'] = record.id;

  // 4h. Delegate to send-push-notification, which handles the push_tokens
  //     lookup, Expo token validation, and the Expo Push API call.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const sendPushSecret = Deno.env.get('SEND_PUSH_SECRET');

  if (!sendPushSecret) {
    // Missing secret — don't crash the webhook; the status change is already
    // committed to the DB. Log and return ok so Supabase doesn't retry.
    console.error('[notify-flag-status] SEND_PUSH_SECRET not set; skipping notification');
    return new Response('ok', { status: 200 });
  }

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sendPushSecret}`,
      },
      body: JSON.stringify({
        user_id: record.user_id,
        title:   notifTitle,
        body:    notifBody,
        data,
      }),
    });
    // We intentionally ignore the send-push-notification response — this is a
    // best-effort notification. The status change is already committed.
  } catch {
    // Network error reaching send-push-notification — don't 500 the webhook.
    console.error('[notify-flag-status] failed to reach send-push-notification');
  }

  return new Response('ok', { status: 200 });
});
