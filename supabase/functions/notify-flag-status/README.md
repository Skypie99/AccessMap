# notify-flag-status — Edge Function

Triggered by a Supabase DB webhook on `UPDATE` events to the `flags` table.
When a flag's `status` field changes to `verified`, `resolved`, or `rejected`,
or a rejected flag is restored to `open`, it sends a push notification to the
flag's owner by delegating to the `send-push-notification` Edge Function.

---

## How it works

```
DB UPDATE on flags
      │
      ▼
notify-flag-status (this function)
  ├─ Authenticates: X-Webhook-Secret header == NOTIFY_WEBHOOK_SECRET
  ├─ Validates: record + old_record present and well-formed
  ├─ Guards:    old_record.status != record.status  (skip if unchanged)
  ├─ Filters:   approved status transition and rejection reason (when required)
  ├─ Prefs:     notification_preferences.flag_status_updates is enabled
  └─ Calls send-push-notification  →  Expo Push API  →  user's device
```

Notifications only fire when the status **actually changes** to an approved
value. Edits to description, category, or photo on an already-open flag do
**not** trigger a notification. A transition to `open` only notifies when the
previous status was `rejected`. Rejection copy only uses the approved public
label from `record.last_moderation_reason_code`; raw values are never echoed.

---

## 1. Required secrets

| Secret | Purpose | How to generate |
|--------|---------|-----------------|
| `NOTIFY_WEBHOOK_SECRET` | Authenticates the DB webhook call to this function | `openssl rand -hex 32` |
| `SEND_PUSH_SECRET` | Authenticates this function's call to `send-push-notification` | Reuse the value already set for `send-push-notification`; or generate a new one if that function hasn't been deployed yet |

Add both in the **Supabase Dashboard** → your project → **Edge Functions** → **Secrets**.

---

## 2. Deploy the function

Run from the **Flagstone project root** (the directory containing `supabase/`):

```bash
supabase functions deploy notify-flag-status
```

The function will be live at:

```
https://<your-project-ref>.supabase.co/functions/v1/notify-flag-status
```

---

## 3. Create the DB Webhook

In the **Supabase Dashboard** → **Database** → **Webhooks** → **Create a new webhook**:

| Field | Value |
|-------|-------|
| Name | `notify-flag-status` |
| Table | `flags` (schema: `public`) |
| Events | `UPDATE` only |
| Webhook URL | `https://<your-project-ref>.supabase.co/functions/v1/notify-flag-status` |
| HTTP method | `POST` |
| HTTP headers | `X-Webhook-Secret: <your NOTIFY_WEBHOOK_SECRET value>` |

> **Note:** The webhook payload for an UPDATE event includes both `record`
> (new values) and `old_record` (pre-update values). This function reads both
> to detect whether the `status` field actually changed.

---

## 4. Dependency: send-push-notification

This function delegates push delivery to `send-push-notification`. That
function must be deployed and its `SEND_PUSH_SECRET` configured **before**
this function will send any notifications.

See `supabase/functions/send-push-notification/README.md` for its setup steps.

---

## 5. Verify after deploying

```bash
# Confirm both functions are active
supabase functions list

# Tail logs while you trigger a test status change in the Supabase SQL editor:
supabase functions logs notify-flag-status --tail

# Manual smoke test (replace <ref> and <secret>)
curl -X POST \
  https://<ref>.supabase.co/functions/v1/notify-flag-status \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <NOTIFY_WEBHOOK_SECRET>" \
  -d '{
    "type": "UPDATE",
    "table": "flags",
    "schema": "public",
    "record":     { "id": "test-id", "user_id": "<a-real-uuid>", "status": "verified", "category": "sidewalk" },
    "old_record": { "id": "test-id", "user_id": "<a-real-uuid>", "status": "open",     "category": "sidewalk" }
  }'
# Expected: ok
```

To confirm end-to-end delivery, update a flag's status in the Supabase SQL
editor (`UPDATE public.flags SET status = 'verified' WHERE id = '<id>';`) and
watch for the push notification on a device with `expo-notifications` installed
and a token stored in `push_tokens`.

---

## 6. Response codes

| Status | Meaning |
|--------|---------|
| 200 `ok` | Processed successfully (notification sent, skipped, or best-effort) |
| 400 `Bad Request: ...` | Malformed JSON or missing required fields |
| 401 `Unauthorized` | Missing or wrong `X-Webhook-Secret` |

All non-error outcomes return `200 ok` with the same body, including cases
where the user has no push token or the `send-push-notification` call fails.
This is intentional — a distinct body would be a push-token oracle.

---

## 7. Notification messages

| Transition | Title | Body |
|-----------|-------|------|
| open → verified | The community backed you up | Your No ramp report was verified by another member. Great catch — thank you. |
| open → resolved | Issue marked resolved | Someone fixed the No ramp you reported. That's real impact — thank you. |
| verified → resolved | Issue marked resolved | Someone fixed the No ramp you reported. That's real impact — thank you. |
| open/verified/resolved → rejected | Report rejected | Your report was rejected after moderation review. Reason: {approved reason label}. Your points were not changed. |
| rejected → open | Report restored | Your report was restored after another review and is visible again. Your points were not changed. |

If `category` is empty in the DB record, verified/resolved copy uses the phrase
`"accessibility issue"`.

The approved rejection reason codes are `duplicate`,
`not_accessibility_barrier`, `inaccurate`, `abusive_or_spam`, and `other`.
Missing or unapproved rejection reasons are skipped rather than copied into a
notification. A missing notification-preferences row uses the database default
(`flag_status_updates = true`); lookup failures fail closed.

---

## 8. Relationship to send-push-notification

| Function | Caller | Auth mechanism |
|----------|--------|----------------|
| `notify-flag-status` | Supabase DB webhook (automatic on flag UPDATE) | `X-Webhook-Secret` header |
| `send-push-notification` | Other Edge Functions / server scripts | `Authorization: Bearer` header |

`notify-flag-status` → calls → `send-push-notification` → calls → Expo Push API.

Do **not** point the DB webhook at `send-push-notification` directly — it
doesn't read `old_record` and would fire on every update, not just status changes.
