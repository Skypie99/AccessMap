# AccessMap — "Security #1" Pre-Build Record (Rory, DevOps)
**Date:** 2026-06-04 · **Project:** Supabase `kldlwszpfkdmsjrjhjym` · **main:** `cbf9a3b` (UI polish merged + pushed)
**Status:** ✅ **ALREADY DONE — applied live 2026-06-03 and read-only verified. Nothing to apply. Security gate = GREEN for the EAS/TestFlight build.**
**Mode:** propose/verify-only — no live DB access, no `execute_sql`, no migration apply, no secret handling, no app-code or `main` change.

---

## TL;DR (read this first)

The four "Security #1" items Sky asked me to prepare were **already applied to the live database on 2026-06-03** (by Sky via Cowork) and **independently re-verified read-only** by Morgan/Gary against `pg_catalog`. There is **no runbook to run** and **nothing blocking the build** on security grounds.

The "security blockers still gate the build" item in this morning's UI-polish report (`2026-06-04_AccessMap_PreShip_UI_Polish_Report.md`) is **STALE** — it was sourced from the **2026-06-02 prep reports** (Steve sign-off + Dana gate), which predate the **2026-06-03 live application**. **This record supersedes it.** (Classic "trust the live catalog / newest record, not 2-day-old report prose.")

**Authoritative source:** `qa-reports/2026-06-03_Morgan_Security_Record_PreBuild.md` — *"Build readiness from a security standpoint: GREEN. Nothing on this list blocks the EAS TestFlight build."*

---

## Per-item status (the 4 items in the request)

| # | Item | Live status (per 2026-06-03 record) | Migration file (in `supabase/migrations/`) |
|---|------|--------------------------------------|---------------------------------------------|
| 1 | **Webhook secret rotation → Vault** | ✅ DONE LIVE. Secret in Vault (`webhook_secret`) only; DB fn `notify_flag_status_webhook` reads it at runtime; Edge Fn verifies via `verify_webhook_secret(text)` RPC; `config.toml verify_jwt=false`; **no literal secret in `pg_proc`**; broken `notify-flag-status` http_request trigger dropped. Verified **200 ok ×3**. | `2026-06-03_verify_webhook_secret.sql` |
| 2 | **F2 — function search_path + EXECUTE revoke** | ✅ DONE LIVE. `search_path=public` pinned + EXECUTE revoked from public/anon/authenticated on all 4 trigger fns (triggers still fire as owner). | `2026-06-01_function_exec_and_search_path_hardening.sql` |
| 3 | **F3 — flag_photos INSERT guard** | ✅ DONE LIVE. `WITH CHECK` now scopes inserts to the caller's own `/flag-photos/<auth.uid>/` path (was `true`). | `2026-06-01_flag_photos_insert_guard.sql` |
| 4 | **Drop duplicate points trigger + reviewer account** | ✅ DONE LIVE. `trigger_flag_status_change` dropped → only `on_flag_status_change` remains (double-points fixed). Reviewer account `reviewer@accessmap.com` exists, `is_admin=false`. | dup-drop applied via Cowork (one-liner); `2026-05-31_reviewer_test_account.sql` |

Corroborated independently by the durable backend memory `accessmap-backend-live-state-2026-06-03`.

---

## Optional read-only re-verification (for Sky/Dana — applies NOTHING)

If you want fresh, independent confirmation against the live catalog before building, paste these **read-only SELECTs** into the Supabase SQL Editor. They mutate nothing. (Object names are per the security records — confirm if they differ.)

```sql
-- (1) + (4a) Triggers on public.flags: expect EXACTLY two, no duplicates, no broken http_request one.
select tgname, pg_get_triggerdef(oid, true) as def
from pg_trigger
where tgrelid = 'public.flags'::regclass and not tgisinternal
order by tgname;
-- EXPECT: flag_status_notify_trigger (-> notify_flag_status_webhook)
--         on_flag_status_change       (-> handle_flag_status_change)
-- MUST NOT SEE: "notify-flag-status" (broken http_request)  |  trigger_flag_status_change (the dup)

-- (1) Webhook secret lives in Vault only; function reads Vault, carries no literal.
select name, created_at from vault.decrypted_secrets where name = 'webhook_secret';   -- expect 1 row (value NOT shown)
select pg_get_functiondef('public.notify_flag_status_webhook'::regproc);              -- eyeball: references vault.decrypted_secrets; NO 64-hex literal in any header

-- (2) F2: search_path pinned + EXECUTE revoked from anon/authenticated on all four fns.
select p.proname,
       p.proconfig,
       has_function_privilege('anon', p.oid, 'execute')          as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('notify_flag_status_webhook','enforce_flag_status_only_for_non_owner',
                    'check_flag_creation_rate_limit','check_flag_rate_limit');
-- EXPECT: proconfig contains search_path=public; anon_exec = f and auth_exec = f for all four.

-- (3) F3: flag_photos INSERT policy is path-scoped, not WITH CHECK (true).
select polname, pg_get_expr(polwithcheck, polrelid) as with_check
from pg_policy where polrelid = 'public.flag_photos'::regclass and polcmd = 'a';
-- EXPECT with_check to contain:  position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0
-- MUST NOT be:  true

-- (4b) Reviewer account exists and is NOT admin.
select u.email, pu.is_admin
from auth.users u join public.users pu on pu.id = u.id
where u.email = 'reviewer@accessmap.com';
-- EXPECT: 1 row, is_admin = false.
```

If every result matches, Security #1 is confirmed live and the build is green. If any row is off, **stop and route to Dana (SQL) / Steve (sign-off)** before building — but the 2026-06-03 record already verified all of these.

---

## What is genuinely still open — and neither blocks the TestFlight build

Both are carried straight from the 2026-06-03 record's "DECISIONS FOR SKY". Listed for completeness; **neither is a security blocker.**

1. **Rotate the reviewer-account password** — *Sky-only, pre-App-Store hygiene (NOT pre-TestFlight).* The account exists; only the password needs refreshing because the old value is in public git history and the new one was printed in chat. Generate a fresh one in **Supabase → Auth → Users → `reviewer@accessmap.com`**, and enter it **only** in **App Store Connect → App Review → Demo Account**. Never in git/chat. (An agent can't do this — it's a credential.)
2. **Point-values canonicalization** — *not security; a docs decision.* Live awards **10/3/15/7**; `schema.sql`/`CLAUDE.md` say `5/2/10/5`. Accept live as canonical (update docs) or revert the trigger. Not a build blocker.

---

## DECISIONS FOR SKY (security view, before the EAS build)

1. **Security #1 is done — no action needed to unblock the build.** The earlier "apply F2/F3 / rotate webhook / drop trigger" to-do was stale; those were applied + verified live on 2026-06-03.
2. **(Optional)** Run the read-only re-verify block above if you want independent confirmation against `pg_catalog` right before building.
3. **Before App Store submission (not TestFlight):** rotate the reviewer password (#1 above).
4. **Whenever:** pick canonical point values (#2 above) — non-blocking.

**Net:** from a security/DevOps standpoint the build is **GREEN**. The real remaining pre-TestFlight gate is the **on-device a11y pass** (VoiceOver/TalkBack + large-font, per Alex's script) and the standard EAS env check (`eas env:list --environment production`) — neither is a security item.

---

## Addendum — Item #2: EAS production env check ✅ GREEN (verified 2026-06-04)

Ran read-only `eas env:list --environment production` (CLI authenticated as `skypie911`; no build/submit/deploy; the anon key stayed masked — did **not** pass `--include-sensitive`). The `testflight` and `production` profiles in `eas.json` both map to this `production` environment, which holds:

| Variable | Present | Note |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | `https://kldlwszpfkdmsjrjhjym.supabase.co` — matches the live project |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | masked (sensitive) — present, value not revealed |
| `EXPO_PUBLIC_SENTRY_DSN` | ✅ | crash/error monitoring configured |
| `GOOGLE_SERVICES_JSON` | ✅ | secret (Android build; EAS-builder-only) |

**Verdict:** the TestFlight/production build will boot with a working Supabase backend — it will NOT launch blank. **#2 = GREEN.**

**iOS submit is fully wired:** `appleId` / `ascAppId 6774709116` / `appleTeamId S78F8ZA8QU` are all set in `eas.json`.

**One Android-only heads-up (does NOT affect iOS/TestFlight):** `eas.json → submit.production.android.serviceAccountKeyPath` is still the placeholder `TODO_PATH_TO_GOOGLE_SERVICE_ACCOUNT_KEY.json` — the Google Play *submit* credential, only needed when you submit the Android build to Play. Fix before an Android Play submission.

---

## What I did NOT do (constraint compliance)
- No live DB access; no `execute_sql` / `apply_migration` against prod; no migration applied.
- No secret generated, handled, printed, or rotated. (Item #2 was a read-only `eas env:list` only — no `--include-sensitive`, anon key never revealed, no build/submit/deploy.)
- No app code, no `supabase/` file, no `main` change, no commit, no merge.
