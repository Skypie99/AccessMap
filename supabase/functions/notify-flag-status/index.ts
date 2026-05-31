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

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------
const ALLOWED_STATUSES = new Set(['verified', 'resolved']);

// Inline copy of the client-side CATEGORY_LABELS — Edge Functions cannot
// import from src/. Keep in sync with src/lib/flags.ts CATEGORY_LABELS.
const CATEGORY_LABELS: Record<string, string> = {
  no_ramp:         'No ramp',
  broken_sidewalk: 'Broken sidewalk',
  blocked_path:    'Blocked path',
  missing_signal:  'Missing signal',
  steep_grade:     'Steep grade',
  other:           'Other',
};

// ---------------------------------------------------------------------------
// 2. Auth gate — shared-secret check
// ---------------------------------------------------------------------------
// DB webhooks cannot carry a user JWT, so Supabase's built-in verify_jwt is
// not appropriate. We use a custom header instead.
function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NOTIFY_WEBHOOK_SECRET');
  if (!secret) {
    // Missing env var: lock the function entirely. This prevents accidentally
    // deploying an open endpoint in a new environment.
    return false;
  }
  const incoming = req.headers.get('X-Webhook-Secret');
  return incoming === secret;
}

// ---------------------------------------------------------------------------
// 3. Input types + parsing
// ---------------------------------------------------------------------------
interface FlagRecord {
  id: string;
  user_id: string;
  status: string;
  category: string;
}

// Supabase DB webhooks send { record, old_record, type, table, schema }.
// We need both record (new values) and old_record (pre-update values) to detect
// whether the status field actually changed.
interface WebhookBody {
  record: FlagRecord;
  old_record: FlagRecord;
}

function extractFlagRecord(r: unknown): FlagRecord | null {
  if (typeof r !== 'object' || r === null) return null;
  const rec = r as Record<string, unknown>;
  if (typeof rec['user_id'] !== 'string' || typeof rec['status'] !== 'string') {
    return null;
  }
  return {
    id:       typeof rec['id'] === 'string' ? rec['id'] : '',
    user_id:  rec['user_id'],
    status:   rec['status'],
    // category is optional in the DB shape; default so the message degrades
    // gracefully ("Your flag status changed to verified.") rather than crashing.
    category: typeof rec['category'] === 'string' ? rec['category'] : '',
  };
}

function parseWebhookBody(body: unknown): WebhookBody | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const record     = extractFlagRecord(b['record']);
  const old_record = extractFlagRecord(b['old_record']);
  if (!record || !old_record) return null;
  return { record, old_record };
}

// ---------------------------------------------------------------------------
// 3b. Notification copy builder — Option B (warm/community tone)
// ---------------------------------------------------------------------------
function buildNotification(status: string, category: string): { title: string; body: string } {
  const rawLabel = category ? (CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ')) : '';
  // 'other' and missing category both fall back to a plain noun so the sentence
  // reads naturally ("Your accessibility issue report was verified…").
  const label = rawLabel && rawLabel.toLowerCase() !== 'other' ? rawLabel : 'accessibility issue';

  if (status === 'verified') {
    return {
      title: 'The community backed you up',
      body:  `Your ${label} report was verified by another member. Great catch — thank you.`,
    };
  }
  // resolved
  return {
    title: 'Issue marked resolved',
    body:  `Someone fixed the ${label} you reported. That's real impact — thank you.`,
  };
}

// ---------------------------------------------------------------------------
// 4. Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {

  // 4a. Auth check — must come before any body parsing.
  if (!isAuthorized(req)) {
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

  // 4e. Only notify on transitions to meaningful statuses.
  // 'open' and 'rejected' don't warrant a push; 'verified' and 'resolved' do.
  if (!ALLOWED_STATUSES.has(record.status)) {
    return new Response('ok', { status: 200 });
  }

  // 4f. Build notification copy (Option B — warm/community tone).
  const { title: notifTitle, body: notifBody } = buildNotification(record.status, record.category);

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
