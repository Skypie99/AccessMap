// send-push-notification — Supabase Edge Function
// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).
//
// Expected request body (JSON):
//   { user_id: string, title: string, body: string, data?: Record<string, unknown> }
//
// Returns:
//   200 { status: "sent" }
//   400 { status: "error", error: string }   — bad payload or invalid/malformed token
//   404 { status: "error", error: string }   — no push token found for user
//   502 { status: "error", error: string }   — Expo Push API rejected the send

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// 1. Supabase client
//    We use the SERVICE_ROLE_KEY so this function can read push_tokens regardless
//    of Row Level Security policies. The service role is only ever available
//    server-side (inside this Edge Function) — it is never exposed to the client app.
// ---------------------------------------------------------------------------
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // bypasses RLS — server only
);

// ---------------------------------------------------------------------------
// 2. Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {

  // -------------------------------------------------------------------------
  // 2a. Parse and validate the incoming JSON payload.
  //     We expect { user_id, title, body, data? }.
  // -------------------------------------------------------------------------
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
  const body   = payload.body;
  // data is optional — any JSON-serialisable value is fine.
  const data   = payload.data as Record<string, unknown> | undefined;

  // -------------------------------------------------------------------------
  // 2b. Look up the user's Expo push token from the push_tokens table.
  //     A missing row means the user hasn't enabled push notifications; that
  //     is a normal state, not an application error — so we return 404 (not
  //     found) rather than 500 (server error).
  // -------------------------------------------------------------------------
  const { data: tokenRow, error: dbError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .single();

  if (dbError || !tokenRow) {
    // Log the Supabase error code (no PII) so it shows up in function logs.
    console.error('[send-push-notification] push_tokens lookup failed:', dbError?.code ?? 'row not found');
    return jsonResponse(404, {
      status: 'error',
      error: 'No push token found for this user. The user may not have enabled notifications.',
    });
  }

  // tokenRow.token is the Expo push token string.
  // We intentionally do NOT log its value (PIPEDA device identifier).

  // -------------------------------------------------------------------------
  // 2c. Basic sanity-check: Expo tokens start with "ExponentPushToken["
  //     or "ExpoPushToken[". Anything else is stale / corrupted data; tell
  //     the caller and skip the network round-trip.
  // -------------------------------------------------------------------------
  const token: string = tokenRow.token as string;
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
    console.error('[send-push-notification] token in DB does not look like an Expo push token');
    return jsonResponse(400, {
      status: 'error',
      error: 'The stored token does not appear to be a valid Expo push token. The user may need to re-enable notifications.',
    });
  }

  // -------------------------------------------------------------------------
  // 2d. Build the Expo push message.
  //     Full field reference: https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format
  // -------------------------------------------------------------------------
  const expoMessage: Record<string, unknown> = {
    to:    token,   // destination token — NOT logged
    title: title,
    body:  body,
    sound: 'default',  // plays the device's default notification sound
  };

  // Attach caller-supplied data payload if provided.
  // This is visible to the app in the notification handler (e.g. to deep-link).
  if (data !== undefined) {
    expoMessage.data = data;
  }

  // -------------------------------------------------------------------------
  // 2e. Send to the Expo Push API.
  //     We treat any non-2xx HTTP status as a 502 (upstream error).
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 2f. Parse the Expo response body.
  //     Expo returns { data: [{ status, id, message?, details? }] }
  //     on success, and various error shapes on failure.
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 2g. Check for per-ticket errors in the Expo response body.
  //     Even with HTTP 200, Expo can report per-token errors like
  //     "DeviceNotRegistered" (user uninstalled the app) inside the tickets array.
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 2h. All checks passed — the notification was queued by Expo successfully.
  // -------------------------------------------------------------------------
  return jsonResponse(200, { status: 'sent' });
});

// ---------------------------------------------------------------------------
// 3. Helper: build a JSON Response with a given HTTP status and body object.
// ---------------------------------------------------------------------------
function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
