# AccessMap — Security, Safety & Robustness Audit Plan + Findings Register

**Auditor:** Steve (Safety Engineer) · **Date:** 2026-06-01 · **Branch:**
`qa-steve/accessmap-2026-06-01` (off `main`) · **Live project:** `Accessable
City App` (`kldlwszpfkdmsjrjhjym`)

This is the Phase-0 surface map + the triaged findings register. Remediation
detail lives in the propose-only migration files and the final report
(`qa-reports/2026-06-01_Security_Robustness_QA_Report.md`).

**Rules honored:** no live-DB writes (read-only verification only — `list_*`,
`get_advisors`, SELECT-only `execute_sql`); RLS/auth/schema changes are
PROPOSE-ONLY (migration + rollback, Sky applies); no external sends (report
routes via Morgan); branch never merged to main.

---

## 1. Attack & failure surface (full inventory)

**Auth & session.** `App.tsx` gate → `SignInScreen` / guest / `RootNavigator`;
`src/lib/auth.tsx` (`AuthProvider`); `src/lib/supabase.ts` (client, storage
adapter, sign-in/up/out). Session: AsyncStorage (native) / localStorage (web),
`autoRefreshToken`, `persistSession`, `detectSessionInUrl` (web). Deep links:
`accessmap://flag/:flagId` (`RootNavigator`).

**Data layer (every Supabase touch).** `src/lib/`: `flags.ts` (create/list/
status/photo/EXIF), `comments.ts`, `photos.ts`, `users.ts`, `admin.ts`,
`account.ts`, `pushNotifications.ts`, `feedbackStore.ts`, `anonRateLimit.ts`,
`watchedFlags.ts`, `analytics.ts` (stripPII), `points.ts`, plus local stores
(`mapFilters`, `filterSets`, `streak`, `notificationPrefs`, `flagsStore`,
`tileCache`).

**User-input entry points.** ReportFlagModal (category/severity/description/
photo/context-tags/anon), comments, profile (display_name/avatar), feedback,
address search, filter presets, saved places.

**External calls.** Supabase REST/Storage/Realtime; OSM tiles (web); `mailto:`
(feedback); maps `directionsLink`; Expo push; (Sentry/analytics = stubs).

**Permissions.** expo-location (foreground), expo-image-picker (camera +
library), notifications.

**Privacy-sensitive (load-bearing).** lat/lng + accessibility category/
description (disability-adjacent); display_name; email; push tokens.

**Live tables (RLS enabled on all):** users, flags, flag_comments,
comment_votes, flag_photos, flag_verifications, flag_status_history,
flag_edit_history, point_events, push_tokens, notification_preferences,
feedback, realtime_subscribe_log + storage.objects/buckets.

---

## 2. What is already solid (verified, not re-litigated)

- **Secrets:** only `EXPO_PUBLIC_*` anon creds (public by design); **no
  service-role key** anywhere; `.env`/`.env.local` gitignored; env validated
  with a startup throw. No secrets in logs. `analytics.stripPII` denylist.
- **Top-level `ErrorBoundary` mounted** (`App.tsx:170`).
- **Storage RLS** (`flag-photos`): upload/delete path-scoped to `auth.uid()`.
- **EXIF stripping** on photo + avatar upload is fail-closed (privacy gate).
- **Already applied live** (so not open): `users_email_privacy` (email column-
  grant revoke — confirmed protecting PII even under `USING(true)`),
  `anon_flag_reporting_photo_fix`, `latlong_range_constraint`,
  `account_deletion_cascade`, `function_search_path_hardening` (partial — see
  F2), `anon_flags_select`, `trust_score_system`, `flag_photos_junction`.

---

## 3. Findings register (triaged; severity + disposition)

### PROPOSE-ONLY (DB — Sky applies; migration + rollback written)

**F1 — `flags` policy sprawl grants any signed-in user full CRUD on every
flag. [HIGH]** Live `pg_policies` shows a leftover coarse policy
`flags_auth_user_only` (`FOR ALL`, role `public`, `USING/CHECK
(auth.uid() IS NOT NULL)`). Permissive policies are **OR'd**, so this loosest
policy overrides the granular owner/triage/delete-own set: **any authenticated
user can UPDATE or DELETE any flag, or INSERT with a spoofed `user_id`.** For a
wheelchair-routing app this is integrity *and* safety (a tester could move/erase
others' barrier reports). Also `flags insert anon` (older) only checks
`user_id IS NULL AND status='open'` — **re-opening the anon `photo_url`
injection** that `flags anon insert` was applied to close. Fix: drop the
redundant/over-broad policies, keep the least-privilege set. → migration
`2026-06-01_flags_policy_consolidation.sql` (Steve). **Top DECISION FOR SKY.**

**F2 — Trigger functions are RPC-executable + two have mutable
`search_path`. [MED]** Live `get_advisors` + `pg_proc`: `notify_flag_status_webhook`
(SECURITY DEFINER, **mutable search_path**, anon+auth EXECUTE),
`check_flag_creation_rate_limit`, `check_flag_rate_limit` (triggers, anon+auth
EXECUTE), `enforce_flag_status_only_for_non_owner` (**mutable search_path**,
anon+auth EXECUTE). Trigger functions should not be callable via `/rest/v1/rpc`
— the baseline (`handle_new_user`, `handle_flag_status_change`) already revokes
this; these newer ones missed it. Fix: `SET search_path` + `REVOKE EXECUTE`
from anon/authenticated/public. By-design RPCs `increment_reopen_request` and
`log_realtime_event` already have `search_path` — left as-is. → migration
`2026-06-01_function_exec_and_search_path_hardening.sql` (Steve).

**F3 — `flag_photos` INSERT `WITH CHECK (true)`. [MED]** Confirmed live by
Supabase linter (`rls_policy_always_true`). Any authenticated user can attach an
**arbitrary external image URL** to **any** flag (content injection — same class
as the anon `photo_url` fix, never closed for the multi-photo path). Fix: anchor
`url` to the uploader's storage path. → migration
`2026-06-01_flag_photos_insert_guard.sql` (Steve).

**F4 — Leaked-password protection disabled. [LOW]** Supabase Auth HaveIBeenPwned
check is off (`get_advisors` security). One dashboard toggle; worth enabling
before testers. → DECISION FOR SKY (Auth config, not a migration).

**F5 — `reviewer_test_account` migration commits a plaintext password. [LOW]**
`supabase/migrations/2026-05-31_reviewer_test_account.sql:10` hardcodes
`AccessMap2026!`. Not yet applied live (good). Fix: don't commit the password —
set it in the dashboard, rotate, restrict the account. → DECISION FOR SKY.

**F6 — Residual privacy posture: anon read of precise lat/lng + category +
description. [INFO/DECISION]** Applied + Jordan-approved, but Jordan is not a
lawyer. Worth a final explicit sign-off before public testers. (No code change.)

### SAFE-TO-FIX (client/data-layer — landed on the branch)

**F7 — Raw `<Image uri>` has no `onError` (~12 call sites). [MED robustness]**
Bad/dead/malicious URL → silent broken layout. Fix: `RemoteImage` primitive +
migrate call sites.

**F8 — No per-screen error boundaries. [MED]** Top-level exists; a single
screen's render crash still blanks the app. Fix: optional-fallback
`ErrorBoundary` prop + wrap high-risk screens.

**F9 — Map resilience. [MED]** No offline banner (Tasks has one); `Promise.all`
in filter hydration drops all prefs on one failure; hex→linear color parse can
NaN-out the heatmap on a bad token. Fix: banner + `allSettled` + NaN guard.

**F10 — Input validation gaps. [LOW–MED]** Whitespace-only comments accepted;
confirm/tighten bounds+trim on description, display_name, lat/lng, severity,
category, photo URL shape across `flags.ts`/`comments.ts`/`users.ts`/`photos.ts`.

**F11 — Stale docs/memory. [INFO]** CLAUDE.md:151 + two memories say "lint
broken"; lint was restored (eslint v9, `npm run lint` exits 0). Correct memory;
flag the CLAUDE.md line for Will.

### NOTED for the sibling Performance audit (not mine to fix)
`auth_rls_initplan` (unwrapped `auth.uid()`), `multiple_permissive_policies`
(perf side of F1 sprawl), duplicate/unused indexes, unindexed FKs — all in
`get_advisors` performance output; handed to Peter to avoid overlap.

---

## 4. Verification
`npm run typecheck` + `npm test` + `npm run lint` green after every fix.
Device matrix + per-migration smoke tests in the final report.
