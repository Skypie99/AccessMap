# send-push-notification — Edge Function

Accepts a `{ user_id, title, body, data? }` JSON payload, looks up the user's
Expo push token from the `push_tokens` table, and fires it to the Expo Push API.

> **Security note:** This function requires a server-side shared secret
> (`SEND_PUSH_SECRET`). It is **not** safe to call directly from React Native
> client code — the secret must stay on the server. See §3 for the correct
> calling pattern.

---

## 1. Add the `SEND_PUSH_SECRET` env var

Before deploying, generate a secret and store it in Supabase Edge Function secrets:

```bash
# Generate a secret
openssl rand -hex 32
```

Then in the **Supabase Dashboard** → your project → **Edge Functions** → **Secrets**, add:

```
SEND_PUSH_SECRET = <generated value>
```

Keep this value — you'll need it in any server-side code that calls this function.

---

## 2. Deploy the function

Run this from the **AccessMap project root** (where `supabase/` lives):

```bash
supabase functions deploy send-push-notification
```

The function will be live at:

```
https://<your-project-ref>.supabase.co/functions/v1/send-push-notification
```

---

## 3. Calling the function (server-side only)

This function must only be called from **server-side code** — another Edge Function,
a DB webhook, or a trusted backend script. Never call it directly from the React
Native app: the `SEND_PUSH_SECRET` must not reach client code.

```ts
// From another Supabase Edge Function:
const res = await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Use the SEND_PUSH_SECRET — stored as an Edge Function secret, never hardcoded.
      'Authorization': `Bearer ${Deno.env.get('SEND_PUSH_SECRET')}`,
    },
    body: JSON.stringify({
      user_id: 'the-target-users-uuid',
      title:   'Hello from AccessMap',   // max 150 chars
      body:    'Your flag was updated.', // max 300 chars
      data:    { flagId: '123', screen: 'FlagDetail' }, // optional, max 1 KB JSON
    }),
  }
);

const json = await res.json();
// { status: 'sent' }    — Expo accepted the notification
// { status: 'queued' }  — authenticated call succeeded but user has no push token
// { status: 'error', error: '...' } — Expo rejected (502) or bad input (400)
```

---

## 4. Response codes

| Status | Meaning |
|--------|---------|
| 200 `{"status":"sent"}` | Notification queued by Expo |
| 200 `{"status":"queued"}` | No push token for this user (notifications not enabled) |
| 400 `{"status":"error",...}` | Invalid payload, missing fields, or oversized title/body/data |
| 401 `Unauthorized` | Missing or wrong `SEND_PUSH_SECRET` |
| 502 `{"status":"error",...}` | Expo Push API unreachable or rejected the request |

> **Note:** A missing push token returns 200, not 404. This prevents callers from
> using the response code as a push-token oracle (inferring which users have
> notifications enabled).

---

## 5. Verify after deploying

```bash
# Confirm the function is active
supabase functions list

# Test with curl (replace <ref> and <secret>)
curl -X POST \
  https://<ref>.supabase.co/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SEND_PUSH_SECRET>" \
  -d '{ "user_id": "<a-real-user-uuid>", "title": "Test", "body": "It works!" }'
# Expected: {"status":"sent"} or {"status":"queued"}

# Tail logs
supabase functions logs send-push-notification --tail
```

---

## 6. Relationship to `notify-flag-status`

Both functions share the `push_tokens` table and the Expo Push API endpoint.
They serve different callers:

| Function | Caller | Auth |
|----------|--------|------|
| `notify-flag-status` | DB webhook (automatic on flag UPDATE) | `NOTIFY_WEBHOOK_SECRET` header |
| `send-push-notification` | Other Edge Functions / server scripts | `SEND_PUSH_SECRET` header |

Do not point the same DB webhook at both functions.
