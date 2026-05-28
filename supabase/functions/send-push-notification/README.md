# send-push-notification — Edge Function

Accepts a `{ user_id, title, body, data? }` JSON payload, looks up the user's
Expo push token from the `push_tokens` table, and fires it to the Expo Push API.

---

## 1. Deploy the function

Run this from the **AccessMap project root** (where `supabase/` lives):

```bash
supabase functions deploy send-push-notification
```

The Supabase CLI automatically reads your linked project and uploads the function.
It will be live at:

```
https://<your-project-ref>.supabase.co/functions/v1/send-push-notification
```

If you're not sure of your project ref, run `supabase status` or check the
Supabase dashboard → Project Settings → General.

---

## 2. Create the Database Webhook (flags UPDATE trigger)

This step wires the `flags` table so that every time a flag's status changes,
the function fires automatically.

1. Open the **Supabase Dashboard** → your project → **Database** → **Webhooks**.
2. Click **Create a new hook**.
3. Fill in the form:

   | Field | Value |
   |---|---|
   | **Name** | `on_flag_status_update` |
   | **Table** | `flags` |
   | **Events** | `UPDATE` only (uncheck INSERT and DELETE) |
   | **Type** | `Supabase Edge Functions` |
   | **Edge Function** | `send-push-notification` |
   | **HTTP Method** | `POST` |

4. Under **HTTP Headers**, add:
   - `Content-Type`: `application/json`

5. Under **Payload**, choose **Record** (sends the full `new` row as `record` in the body).

   > **Note:** The existing `notify-flag-status` function reads `record.user_id`
   > and `record.status` from the webhook payload. This new function expects a
   > hand-crafted payload `{ user_id, title, body }`, so you should **not**
   > point the same DB webhook at both functions. If you want automatic
   > notifications on flag status change, keep using `notify-flag-status` for
   > that webhook. Use `send-push-notification` for direct/manual calls from
   > your app code or other Edge Functions.

6. Click **Create webhook**.

---

## 3. Calling the function from app code or another Edge Function

```ts
const res = await fetch(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Use the anon key for user-initiated calls, or service-role for
      // server-to-server calls from another Edge Function.
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      user_id: 'the-target-users-uuid',
      title:   'Hello from AccessMap',
      body:    'Your flag was updated.',
      data:    { flagId: '123', screen: 'FlagDetail' }, // optional deep-link data
    }),
  }
);

const json = await res.json();
// { status: 'sent' }  on success
// { status: 'error', error: '...' }  on failure
```

---

## 4. What to do after deploying

1. **Verify the deploy** — run `supabase functions list` and confirm
   `send-push-notification` appears with status `ACTIVE`.

2. **Test with curl** (replace `<ref>` and `<service-role-key>`):

   ```bash
   curl -X POST \
     https://<ref>.supabase.co/functions/v1/send-push-notification \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <service-role-key>" \
     -d '{ "user_id": "<a-real-user-uuid>", "title": "Test", "body": "It works!" }'
   ```

   You should get `{"status":"sent"}` and a notification should arrive on the
   device where that user logged in (assuming they have a row in `push_tokens`).

3. **Check function logs** if something goes wrong:

   ```bash
   supabase functions logs send-push-notification --tail
   ```

   Or view them in the Dashboard → Edge Functions → `send-push-notification` → Logs.

4. **Token not found?** The user hasn't enabled push notifications yet (no row
   in `push_tokens`). In the app, call `requestExpoPushToken()` followed by
   `savePushToken(userId, token)` from `src/lib/pushNotifications.ts`.

---

## Relationship to `notify-flag-status`

The existing `notify-flag-status` function is **tightly coupled** to the DB
webhook payload format (reads `record.status` and `record.category`) and
handles its own title/body construction. This new function is a
**general-purpose sender** — it accepts any title, body, and optional data.
Both functions share the same `push_tokens` table and the same Expo Push API
endpoint. They do not conflict as long as they are not both pointed at the
same webhook event.
