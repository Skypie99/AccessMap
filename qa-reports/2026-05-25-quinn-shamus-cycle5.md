# AccessMap — Cycle 5 QA Report
**Date:** 2026-05-25
**Roles:** Quinn (product selection) + Shamus (engineer)
**Branch:** `security/auto-2026-05-25-steve-edge-function-auth`
**Commit:** `86d379d`

---

## Feature chosen and why (Quinn's reasoning)

**Chosen: A1 security fix — harden `notify-flag-status` Edge Function**

The 2026-05-25 security audit flagged this as **High severity** with two specific
attack vectors:
1. **User-enumeration oracle** — the public endpoint leaks which `user_id` values
   have push notifications enabled, because it returns a different response body
   ("sent" vs "no token") without any auth check.
2. **Notification spam** — anyone who knows the function URL can POST a crafted
   body and trigger arbitrary push notifications to any user.

All four Cycle 4 features (`feat/leaflet-tile-interception-2026-05-25`,
`feat/edit-profile-2026-05-25`, `feat/context-tags-display-2026-05-25`,
`feat/tasks-search-2026-05-25`) are on unmerged branches. This fix is fully
independent of all of them and touches only a single Edge Function file.

No schema changes required. No new npm packages. Under 30 minutes of build time.

Candidates reviewed and rejected:
- **Search/filter for Watched Flags** — good, but the `MyWatchedModal` pattern
  is best built after the Cycle 4 branches merge (to avoid duplicate
  `SearchInputRow` patterns landing in parallel).
- **Flag clustering on web map** — `supercluster` is already a dep, but the
  `feat/flags-map-2026-05-25` branch is unmerged and covers related map work.
- **Neighbourhood heat-map** — Jordan approval condition (severity-colour
  rendering decision, see D5) not yet resolved.

---

## Files changed

| File | Change |
|---|---|
| `supabase/functions/notify-flag-status/index.ts` | Rewrote: added shared-secret auth, input validation, safe error responses |

---

## Acceptance criteria — all met

| Criterion | Result |
|---|---|
| Malformed JSON body → 400 | `await req.json()` catches SyntaxError → `return 400 "Bad Request: invalid JSON"` |
| Missing record fields → 400 | `parseRecord()` validates `user_id`, `status`, `category` are strings → `return 400` |
| Missing `X-Webhook-Secret` header → 401 | `isAuthorized()` checks `incoming === secret` → returns false → `return 401` |
| Wrong secret → 401 | Same: `incoming !== secret` → `return 401` |
| Missing `NOTIFY_WEBHOOK_SECRET` env var → 401 | `isAuthorized()` returns false if env var unset — function locks itself entirely |
| Valid request, no push token → 200 "no token" | Preserved from original |
| Valid request, token present → 200 "sent" | Preserved from original |
| Business logic (verified/resolved filter) preserved | Line 62 — identical to original |
| PIPEDA no-log rule preserved | Comment retained; `tokenRow.token` never logged |

---

## Typecheck + test results

```
tsc --noEmit   → 0 errors (supabase/functions excluded per tsconfig.json)
jest --ci      → 789/789 tests passed, 52 suites, 0 failures
```

Both green before and after the change.

---

## Deployment steps for Sky (propose-only — not applied)

This fix is live in the file but the function needs to be deployed with the
secret configured for it to take effect:

**Step 1 — Set the secret in Supabase**
1. Open Supabase dashboard → your AccessMap project → Settings → Edge Functions → Secrets
2. Add a secret named `NOTIFY_WEBHOOK_SECRET` with a strong random value
   (e.g. `openssl rand -hex 32` from your terminal)

**Step 2 — Configure your DB webhook to include the header**
1. Supabase dashboard → Database → Webhooks → (your `notify-flag-status` webhook)
2. Add a custom header: `X-Webhook-Secret` = same value as Step 1

**Step 3 — Deploy the updated function**
```bash
supabase functions deploy notify-flag-status
```
(Or via the Supabase dashboard: Functions → notify-flag-status → Deploy)

**Step 4 — Verify**
- POST to the function URL without the header → should get `401 Unauthorized`
- DB webhook fires on a flag status change → should still deliver the notification

---

## Follow-up for Gary (tests to add)

The Edge Function logic is Deno/TypeScript and lives outside the Jest coverage
scope. Gary could add integration tests via Supabase's `supabase functions serve`
+ `fetch()` calls in a separate `supabase/functions/__tests__/` directory.
Specifically worth testing:
- `isAuthorized()` returns false when env var missing
- `parseRecord()` rejects all invalid shapes
- Full handler: 401 on bad secret, 400 on bad body, 200 on valid happy path

These can't use Jest directly (Deno runtime), but Deno's built-in test runner
(`deno test`) works for this.

---

## Follow-up for Alex (a11y)

No UI changes in this cycle — no a11y review needed.

---

## Suggested next features (1-2)

1. **Search/filter for Watched Flags list** (`MyWatchedModal`) — add a
   `SearchInputRow` + status/severity filter chips above the flat list, matching
   the existing Tasks pattern. No schema change, no migrations, pure local filter.
   Best picked up after the Cycle 4 branches merge so `SearchInputRow` patterns
   are stable.

2. **A2 security fix — points farming prevention** (medium severity). Make the
   `handle_flag_status_change` trigger award points only the first time a flag
   reaches each milestone (idempotent/forward-only). This IS a schema/migration
   change, so it's propose-only; but the logic sketch is in the security audit
   (uses `flag_status_history` table which is already applied). Steve sign-off
   recommended before Sky applies.

---

## Verification

- **Typecheck before:** 0 errors
- **Typecheck after:** 0 errors
- **Tests:** 789/789, 52 suites
- **Reachable via UI:** N/A (backend Edge Function, not a UI screen)
- **Accessibility:** N/A (no UI)
- **Commits:** 1 (`86d379d`)
- **Files touched:** 1
- **Lines changed:** +84 / -4

---

## How to review

```bash
git diff main..security/auto-2026-05-25-steve-edge-function-auth

# merge (after Sky review):
git checkout main && git merge security/auto-2026-05-25-steve-edge-function-auth

# discard:
git branch -D security/auto-2026-05-25-steve-edge-function-auth
```
