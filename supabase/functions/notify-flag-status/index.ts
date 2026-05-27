// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).
//
// Security hardening (2026-05-25 — Steve/Jordan A1 fix):
//   1. Shared-secret check  — caller must include `X-Webhook-Secret` matching
//      the NOTIFY_WEBHOOK_SECRET env var. Without this, anyone who knows the
//      function URL can POST arbitrary records and spam users with notifications,
//      or use the "sent" / "no token" difference as a user-enumeration oracle.
//   2. Input validation     — if `record` is missing or malformed the function
//      returns 400 instead of crashing with a 500.
//   3. Oracle fix           — all non-error paths return 'ok' (same body),
//      so callers can't detect whether a given user_id has a push token.
//   4. Expo resilience      — fetch to exp.host is wrapped in try/catch; an
//      upstream failure does not 500 the webhook (status change already happened).
//
// RATE LIMITING — this function MUST be rate-limited at the Supabase dashboard
// level (project → Settings → Edge Functions → Rate Limits). The recommended
// limit is 100 requests/minute per IP. Code-level rate limiting is not possible
// for Edge Functions; the dashboard config is the only enforcement point.
//
// Setup steps for NOTIFY_WEBHOOK_SECRET:
//   1. Generate a secret: openssl rand -hex 32
//   2. Add it in Supabase Dashboard → Edge Functions → Secrets →
//      NOTIFY_WEBHOOK_SECRET = <generated value>
//   3. In your DB Webhook configuration, add the header:
//        X-Webhook-Secret: <same value>
//   4. Deploy: supabase functions deploy notify-flag-status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service-role bypasses RLS — auth gate below is the control
);

const ALLOWED_STATUSES = new Set(['verified', 'resolved']);

// ---------------------------------------------------------------------------
// JWT / shared-secret verification
// ---------------------------------------------------------------------------
// This function is called by a DB webhook, not a user session, so Supabase JWT
// verification (verify_jwt) is not appropriate here — the webhook has no user
// token. Instead we use a shared secret in a custom header. The secret is set
// as an Edge Function secret (never in source) and injected by the DB webhook
// configuration.
// ---------------------------------------------------------------------------
function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NOTIFY_WEBHOOK_SECRET');
  if (!secret) {
    // Missing secret env var: lock the function entirely. This prevents
    // accidentally deploying an open endpoint in a new environment.
    return false;
  }
  const incoming = req.headers.get('X-Webhook-Secret');
  return incoming === secret;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
interface FlagRecord {
  user_id: string;
  status: string;
  category: string;
}

function parseRecord(body: unknown): FlagRecord | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b['record'] !== 'object' || b['record'] === null) return null;
  const r = b['record'] as Record<string, unknown>;
  if (
    typeof r['user_id'] !== 'string' ||
    typeof r['status'] !== 'string'
  ) {
    return null;
  }
  return {
    user_id: r['user_id'],
    status: r['status'],
    // category is optional in the DB record shape; default to empty string
    // so the notification body degrades gracefully rather than crashing.
    category: typeof r['category'] === 'string' ? r['category'] : '',
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  // 1. Auth check — must come before any body parsing so we don't waste
  //    compute on unauthenticated callers.
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse body — reject on invalid JSON.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 });
  }

  // 3. Validate body shape — reject on missing/wrong-typed required fields.
  const record = parseRecord(rawBody);
  if (!record) {
    return new Response('Bad Request: missing or invalid record fields', {
      status: 400,
    });
  }

  // 4. Only notify on verified or resolved (unchanged business logic).
  if (!ALLOWED_STATUSES.has(record.status)) {
    return new Response('ok', { status: 200 });
  }

  // 5. Fetch token without logging it.
  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', record.user_id)
    .single();

  // Return 'ok' (same body as success) — do NOT return 'no token'.
  // A distinct response body is a user-enumeration oracle: it tells callers
  // which user_ids have push notifications enabled.
  if (!tokenRow) return new Response('ok', { status: 200 });

  // 6. Send via Expo Push API — wrapped so an upstream failure doesn't 500.
  const message = {
    to: tokenRow.token,
    title: 'AccessMap',
    body: `Your ${record.category} flag was ${record.status}.`.replace(/\s{2,}/g, ' ').trim(),
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch {
    // Expo is unreachable — don't 500 the webhook; the status change already
    // happened in the DB. The notification is best-effort.
    return new Response('ok', { status: 200 });
  }

  return new Response('ok', { status: 200 });
});
