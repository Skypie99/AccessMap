// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).
//
// Security hardening (Cycle 5 — 2026-05-25):
//   1. Shared-secret check  — caller must include `X-Webhook-Secret` matching
//      the NOTIFY_WEBHOOK_SECRET env var.  Without this, anyone who knows the
//      function URL can POST arbitrary records and spam users with notifications,
//      or use the "sent" / "no token" difference as a user-enumeration oracle.
//   2. Input validation     — if `record` is missing or malformed, the function
//      returns 400 instead of crashing with a 500.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service-role bypasses RLS
);

// ---------------------------------------------------------------------------
// Shared-secret check
// ---------------------------------------------------------------------------
// Set NOTIFY_WEBHOOK_SECRET in the Supabase Edge Function secrets panel
// (project → Settings → Edge Functions → Secrets).
// Then configure the DB webhook to include the header:
//   X-Webhook-Secret: <same value>
// Without this env var the function refuses every request — this prevents
// accidentally deploying an open endpoint.
// ---------------------------------------------------------------------------
function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NOTIFY_WEBHOOK_SECRET');
  if (!secret) {
    // Missing secret env var: lock the function entirely.
    return false;
  }
  const incoming = req.headers.get('X-Webhook-Secret');
  // Constant-time compare is not critical here (the secret is not user-supplied),
  // but we do a simple string equality guard.
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
    typeof r['status'] !== 'string' ||
    typeof r['category'] !== 'string'
  ) {
    return null;
  }
  return {
    user_id: r['user_id'],
    status: r['status'],
    category: r['category'],
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

  // 2. Parse + validate body.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 });
  }

  const record = parseRecord(rawBody);
  if (!record) {
    return new Response('Bad Request: missing or invalid record fields', {
      status: 400,
    });
  }

  // 3. Only notify on verified or resolved (unchanged business logic).
  if (!['verified', 'resolved'].includes(record.status)) {
    return new Response('ok', { status: 200 });
  }

  // 4. Fetch token without logging it.
  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', record.user_id)
    .single();

  if (!tokenRow) return new Response('no token', { status: 200 });

  // 5. Send via Expo Push API.
  const message = {
    to: tokenRow.token,
    title: 'AccessMap',
    body: `Your ${record.category} flag was ${record.status}.`,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  return new Response('sent', { status: 200 });
});
