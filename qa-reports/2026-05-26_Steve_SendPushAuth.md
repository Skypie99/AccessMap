# Steve — Security Fix Report: `send-push-notification` Auth Gate
**Date:** 2026-05-26
**Branch:** `security/auto-2026-05-26-steve-send-push-auth`
**Commit:** `8a0fd2b`
**Engineer:** Steve (Safety & Robustness)
**Severity:** CRITICAL (pre-deployment gate)

---

## Finding

`supabase/functions/send-push-notification/index.ts` was entirely unauthenticated.
Any caller who knew the function URL could:

1. **Send arbitrary push notifications to any user** — attacker controls `title`, `body`, and `data` (social-engineering / phishing vector).
2. **Enumerate push-token presence** — 200 = token found + sent; 404 = no token. Tells an attacker which user_ids have push notifications enabled (indirect user metadata oracle).

This is **distinct from** the already-merged `notify-flag-status` fix (`eb2e370`), which is a DB webhook secured with `NOTIFY_WEBHOOK_SECRET`. `send-push-notification` is a general-purpose sender designed for other Edge Functions and server scripts.

---

## Fix Applied

**Pattern:** Shared-secret auth, identical to `notify-flag-status` (`eb2e370`).

### Changes in `supabase/functions/send-push-notification/index.ts`

| Change | Detail |
|---|---|
| **Auth gate** | `isAuthorized(req)` checks `Authorization: Bearer <SEND_PUSH_SECRET>`. Returns 401 if missing/wrong. Locks the function entirely if `SEND_PUSH_SECRET` env var is unset (fail-closed). |
| **Oracle fix** | Token-not-found path now returns `200 {"status":"queued"}` instead of `404`. Callers can't distinguish "sent" from "no token" — both return HTTP 200. |
| **Input length limits** | `title` ≤ 150 chars, `body` ≤ 300 chars, `data` ≤ 1 KB serialised. Prevents oversized/social-engineering payloads from reaching the Expo API. |
| **data validation** | `data` must be a plain object (not an array, not a primitive). Prevents type confusion at the Expo API boundary. |
| **Caller scope** | README updated: this function is SERVER-SIDE ONLY. `SEND_PUSH_SECRET` must never reach React Native client code. |

### What was NOT changed

- Expo Push API integration (logic unchanged, wrapping preserved)
- Token format validation (`ExponentPushToken[` / `ExpoPushToken[` prefix check)
- PIPEDA comment (no-log of push tokens)
- All error handling paths for network failures and Expo per-ticket errors

---

## Setup Steps for Sky

**Before deploying** `send-push-notification`, Sky must complete these steps:

### Step 1 — Generate the secret

```bash
openssl rand -hex 32
# Example output: a3f8c2d1e7b94052...
```

### Step 2 — Add to Supabase Edge Function Secrets

Supabase Dashboard → your project → **Edge Functions** → **Secrets** → Add new:

```
Key:   SEND_PUSH_SECRET
Value: <paste generated value>
```

### Step 3 — Deploy the function

```bash
supabase functions deploy send-push-notification
```

### Step 4 — Verify

```bash
# Should return 401:
curl -X POST \
  https://<ref>.supabase.co/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -d '{"user_id":"any","title":"test","body":"test"}'

# Should return 200 {"status":"queued"} or {"status":"sent"}:
curl -X POST \
  https://<ref>.supabase.co/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SEND_PUSH_SECRET>" \
  -d '{"user_id":"<real-user-uuid>","title":"Test","body":"It works!"}'
```

---

## Broader Hardening Scan (AccessMap)

While on this pass, scanned the rest of the codebase for similar issues. No other
unauthenticated Edge Functions found — `notify-flag-status` is correctly gated.

**Propose-only items (no code change this cycle):**

| # | Item | Severity | Location |
|---|---|---|---|
| P1 | `push_tokens` table has no per-user rate limit on inserts — a user could register many tokens to probe for leaks | LOW | `supabase/schema.sql` + DB triggers |
| P2 | `data` field on push messages accepts arbitrary deep-link targets (e.g. `{screen:"AdminPanel"}`) — app should validate/allowlist `screen` values it will act on | LOW | `src/lib/pushNotifications.ts` (when implemented) |
| P3 | `SEND_PUSH_SECRET` has no rotation strategy documented | LOW | README / ops docs |

None of P1–P3 are blockers for deployment, but P2 should be addressed before the push notification UI ships.

---

## Not-merged — awaiting Sky review

Branch `security/auto-2026-05-26-steve-send-push-auth` is ready. Do not merge until
Sky has reviewed and added the `SEND_PUSH_SECRET` to Edge Function secrets (otherwise
the function will lock itself with `isAuthorized` returning false on every request).
