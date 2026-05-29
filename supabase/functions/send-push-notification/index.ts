// send-push-notification — Supabase Edge Function
// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).
//
// Security hardening (2026-05-26 — Steve A1 fix; re-applied 2026-05-30 after regression):
//   1. Shared-secret auth     — caller MUST include `Authorization: Bearer <SEND_PUSH_SECRET>`.
//      Without this, any caller who knows the function URL can send arbitrary push
//      notifications to any user or use 200/404 differences as a push-token oracle.
//      Secret is stored as an Edge Function secret (never in source).
//   2. Oracle fix              — when a valid token is not found, return 200 {"status":"queued"}
//      (same body as success) so callers cannot detect which user_ids have push tokens.
//   3. Input length limits     — title ≤ 150 chars, body ≤ 300 chars, data ≤ 1 KB serialised.
//      Prevents social-engineering payloads and oversized data being forwarded to Expo.
//   4. Caller scope            — this function is SERVER-SIDE ONLY (called from other Edge
//      Functions, DB webhooks, or server scripts). Do NOT call it directly from the React
//      Native app — the SEND_PUSH_SECRET must never reach client code.
//
// Setup steps for SEND_PUSH_SECRET:
//   1. Generate a secret: openssl rand -hex 32
//   2. Add it in Supabase Dashboard → Edge Functions → Secrets →
//      SEND_PUSH_SECRET = <generated value>
//   3. In any calling code (another Edge Function / server script), add the header:
//        Authorization: Bearer <same value>
//   4. Deploy: supabase functions deploy send-push-notification
//
// RATE LIMITING — enforce at Supabase dashboard level (project → Settings →
// Edge Functions → Rate Limits). Recommended: 60 req/min per IP.
//
// Expected request body (JSON):
//   { user_id: string, title: string, body: string, data?: Record<string, unknown> }
//
// Returns:
//   200 { status: "sent" | "queued" }   — sent = Expo accepted; queued = no token found
//   400 { status: "error", error: string } — bad payload, missing fields, or oversized input
//   401 Unauthorized                       — missing or wrong SEND_PUSH_SECRET
//   502 { status: "error", error: string } — Expo Push API rejected the request

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// 1. Supabase client (service-role so we can read push_tokens bypassing RLS)
// ---------------------------------------------------------------------------
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // server-side only — never in client code
);

// ---------------------------------------------------------------------------
// 2. Auth gate — shared-secret check (same pattern as notify-flag-status)
// ---------------------------------------------------------------------------
function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('SEND_PUSH_SECRET');
  if (!secret) {
    // If the env var is not set, lock the function entirely so we never run
    // open on a fresh deploy that hasn't been configured yet.
    return false;
  }
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  return auth.slice(7) === secret;
}

// ---------------------------------------------------------------------------
// 3. Input length limits
// ---------------------------------------------------------------------------
const MAX_TITLE_LEN = 150;
const MAX_BODY_LEN  = 300;
const MAX_DATA_JSON = 1024; // bytes

// ---------------------------------------------------------------------------
// 4. Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {

  // 4a. Auth check — must come before body parsing.
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 4b. Parse and validate the incoming JSON payload.
  //     We expect { user_id, title, body, data? }.
  let payload: {
    user_id?: unknown;
    title?: unknown;
    body?: unknown;
    data?: unknown;
  };

  try {
    payload = await req.json() as typeof payload;
  } catch {
    // The request body wasn't valid JSON at all.
    return jsonResponse(400, { status: 'error', error: 'Request body must be valid JSON.' });
  }

  // All three required fields must be non-empty strings.
  if (
    typeof payload.user_id !== 'string' || !payload.user_id ||
    typeof payload.title !== 'string'   || !payload.title   ||
    typeof payload.body  !== 'string'   || !payload.body
  ) {
    return jsonResponse(400, {
      status: 'error',
      error: 'Payload must include user_id (string), title (string), and body (string).',
    });
  }

  const userId = payload.user_id;
  const title  = payload.title;
  const notifBody = payload.body;

  // 4c. Length limits — prevent oversized or social-engineering payloads.
  if (title.length > MAX_TITLE_LEN) {
    return jsonResponse(400, {
      status: 'error',
      error: `title must be ${MAX_TITLE_LEN} characters or fewer.`,
    });
  }
  if (notifBody.length > MAX_BODY_LEN) {
    return jsonResponse(400, {
      status: 'error',
      error: `body must be ${MAX_BODY_LEN} characters or fewer.`,
    });
  }

  // 4d. Validate optional data payload size.
  let data: Record<string, unknown> | undefined;
  if (payload.data !== undefined) {
    if (typeof payload.data !== 'object' || Array.isArray(payload.data) || payload.data === null) {
      return jsonResponse(400, { status: 'error', error: 'data must be a JSON object if provided.' });
    }
    const dataJson = JSON.stringify(payload.data);
    if (dataJson.length > MAX_DATA_JSON) {
      return jsonResponse(400, {
        status: 'error',
        error: `data payload must serialise to ${MAX_DATA_JSON} bytes or fewer.`,
      });
    }
    data = payload.data as Record<string, unknown>;
  }

  // 4e. Look up the user's Expo push token from the push_tokens table.
  //     We use the service-role key so this query bypasses RLS.
  const { data: tokenRow, error: dbError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .single();

  if (dbError || !tokenRow) {
    // Return 200 {"status":"queued"} — same shape as a success response.
    // A distinct 404 body would be a push-token oracle: it would let callers
    // enumerate which user_ids have notifications enabled.
    console.error('[send-push-notification] push_tokens lookup:', dbError?.code ?? 'row not found');
    return jsonResponse(200, { status: 'queued' });
  }

  // tokenRow.token is the Expo push token string.
  // We intentionally do NOT log its value (PIPEDA device identifier).

  // 4f. Basic sanity-check: Expo tokens start with "ExponentPushToken["
  //     or "ExpoPushToken[". Anything else is stale / corrupted data.
  const token: string = tokenRow.token as string;
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
    console.error('[send-push-notification] token in DB does not look like an Expo push token');
    // Return queued (same oracle fix — don't tell the caller details about DB state).
    return jsonResponse(200, { status: 'queued' });
  }

  // 4g. Build the Expo push message.
  //     Full field reference: https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format
  const expoMessage: Record<string, unknown> = {
    to:    token,       // destination token — NOT logged
    title: title,
    body:  notifBody,
    sound: 'default',  // plays the device's default notification sound
  };

  // Attach caller-supplied data payload if provided.
  // This is visible to the app in the notification handler (e.g. to deep-link).
  if (data !== undefined) {
    expoMessage.data = data;
  }

  // 4h. Send to the Expo Push API.
  //     We treat any non-2xx HTTP status as a 502 (upstream error).
  let expoRes: Response;
  try {
    expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Expo recommends this Accept header to get structured error bodies.
        'Accept': 'application/json',
      },
      body: JSON.stringify(expoMessage),
    });
  } catch (networkErr) {
    // Network failure (DNS, timeout, etc.) — not the caller's fault.
    console.error('[send-push-notification] network error reaching Expo API:', networkErr);
    return jsonResponse(502, {
      status: 'error',
      error: 'Could not reach the Expo Push API. Try again later.',
    });
  }

  // 4i. Parse the Expo response body.
  //     Expo returns { data: [{ status, id, message?, details? }] }
  //     on success, and various error shapes on failure.
  let expoBody: unknown;
  try {
    expoBody = await expoRes.json();
  } catch {
    // Expo returned something we can't parse — treat as upstream error.
    console.error('[send-push-notification] Expo API returned non-JSON body, HTTP', expoRes.status);
    return jsonResponse(502, {
      status: 'error',
      error: `Expo Push API returned an unexpected response (HTTP ${expoRes.status}).`,
    });
  }

  // If Expo's HTTP status itself is not 2xx, surface that.
  if (!expoRes.ok) {
    console.error('[send-push-notification] Expo API error HTTP', expoRes.status, JSON.stringify(expoBody));
    return jsonResponse(502, {
      status: 'error',
      error: `Expo Push API returned HTTP ${expoRes.status}.`,
    });
  }

  // 4j. Check for per-ticket errors in the Expo response body.
  //     Even with HTTP 200, Expo can report per-token errors like
  //     "DeviceNotRegistered" (user uninstalled the app) inside the tickets array.
  const expoData = (expoBody as { data?: Array<{ status: string; message?: string; details?: { error?: string } }> }).data;
  if (Array.isArray(expoData) && expoData.length > 0) {
    const ticket = expoData[0];
    if (ticket.status === 'error') {
      // Log the Expo error code — safe to log (not PII), useful for debugging.
      const expoError = ticket.details?.error ?? ticket.message ?? 'unknown error';
      console.error('[send-push-notification] Expo ticket error:', expoError);
      return jsonResponse(502, {
        status: 'error',
        error: `Expo rejected the notification: ${expoError}`,
      });
    }
  }

  // 4k. All checks passed — the notification was queued by Expo successfully.
  return jsonResponse(200, { status: 'sent' });
});

// ---------------------------------------------------------------------------
// 5. Helper: build a JSON Response with a given HTTP status and body object.
// ---------------------------------------------------------------------------
function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
