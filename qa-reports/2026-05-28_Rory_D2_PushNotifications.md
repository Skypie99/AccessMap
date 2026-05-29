# Rory — D2 Push Notifications Unblock
**Date:** 2026-05-28  
**Authorization:** Sky direct (D2 approval)  
**Branch:** `privacy/exif-strip-2026-05-28` (working tree)

---

## Summary

All three D2 steps completed. Push notifications are now wired end-to-end.

---

## Step 1 — Migration (`push_tokens.sql`)

**Status: ALREADY APPLIED — no action taken**

`public.push_tokens` already exists in the live DB (RLS enabled, 0 rows). The migration was applied in a prior session. Verified via Supabase MCP `list_tables`.

---

## Step 2 — Deploy `notify-flag-status` Edge Function

**Status: DEPLOYED — ACTIVE v1**

- Function was not previously deployed (only `send-push-notification` was live at v1).
- Deployed from `supabase/functions/notify-flag-status/index.ts` verbatim.
- `verify_jwt: false` — correct; function uses its own shared-secret auth (`NOTIFY_WEBHOOK_SECRET` header check), consistent with `send-push-notification`.
- Function ID: `9f774901-f397-428c-a3a4-17a5e2421828`

### Both Edge Functions now live

| Function | Status | verify_jwt | Notes |
|---|---|---|---|
| `send-push-notification` | ACTIVE v1 | false | Pre-existing |
| `notify-flag-status` | ACTIVE v1 | false | Deployed this cycle |

---

## Step 3 — `npx expo install expo-notifications`

**Status: INSTALLED — `expo-notifications@~0.32.17`**

- SDK 54-compatible version selected automatically by Expo CLI.
- 27 packages added, 909 audited.
- 13 moderate severity vulnerabilities (pre-existing, not introduced by this install — same baseline as before).
- `npm run typecheck` — **0 errors** after install.

### Uncommitted changes (needs Sky commit)

`package.json` and `package-lock.json` are modified on `privacy/exif-strip-2026-05-28`. These should be committed before the Monday merge wave:

```bash
git add package.json package-lock.json
git commit -m "feat(deps): install expo-notifications ~0.32.17 (D2 push notifications)"
```

---

## What's still needed before notifications fire end-to-end

The infrastructure is now in place. Three manual wiring steps remain (cannot be done by agents):

### A. Set `NOTIFY_WEBHOOK_SECRET` in Supabase

1. Generate a secret: open Terminal and run `openssl rand -hex 32` — copy the output.
2. In Supabase Dashboard → **Project "Accessable City App"** → **Edge Functions** → **notify-flag-status** → **Secrets**.
3. Add secret: `NOTIFY_WEBHOOK_SECRET` = `<your generated value>`.

### B. Configure the DB Webhook

1. In Supabase Dashboard → **Database** → **Webhooks** → **Create a new hook**.
2. Settings:
   - **Name:** `notify-flag-status`
   - **Table:** `public.flags`
   - **Events:** `UPDATE`
   - **Type:** `Supabase Edge Functions`
   - **Function:** `notify-flag-status`
   - **HTTP headers:** Add `X-Webhook-Secret: <same value from step A>`

### C. Wire the Expo token registration in the app

The `push_tokens` table is live, `expo-notifications` is installed, but the app code that registers tokens and writes them to the DB has not been built yet. This is the remaining feature work — a short task for Shamus:
- On app launch (post sign-in): request notification permissions, get Expo push token, upsert into `push_tokens`.
- On sign-out: delete the row from `push_tokens` (already gated by the existing sign-out clear logic in the settings).

---

## No issues, no blockers from this cycle

All Rory actions were reversible and read-verified before execution. No credentials handled or printed.
