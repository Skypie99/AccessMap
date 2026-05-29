---
role: Dana (Backend Engineer)
date: 2026-05-29
task: SQL APPLY RUNBOOK — 5 pending migrations (CoWork session artifact)
status: READ-ONLY / PROPOSE-ONLY — Sky applies in Supabase SQL Editor
audience: Sky
authority: Constitution Art. 5 — agents never write to the live DB
cross-ref:
  - 2026-05-29_Dana_SQL_ApplyOrder_Verify.md   (full dependency analysis)
  - 2026-05-29_Morgan_SQL_Apply_Checklist.md   (Morgan-verified order)
---

# AccessMap — SQL APPLY RUNBOOK (CoWork Session)

> Sky runs these. You paste each file into **Supabase Dashboard → SQL Editor → New query → Run**.
> Apply in the EXACT ORDER below. Confirm each step returns no errors before proceeding.
> Dana is AUDIT/PROPOSE only — no live DB access, no branches, no commits.

---

## Quick-reference card

| Apply order | File | One-line purpose | Idempotent? |
|---|---|---|---|
| **1** | `2026-05-27_users_email_privacy.sql` | Revoke `email` column read from all authenticated/anon users; add self-only view | YES |
| **2** | `2026-05-23_status_update_trigger_proposal.sql` | BEFORE UPDATE trigger: reverts non-`status` edits by non-owners at DB layer | YES |
| **3** | `2026-05-28_d4_realtime_flags_filtered.sql` | Realtime publication filtered to `{id, status}` only; adds subscribe-log table | MOSTLY |
| **4** | `2026-05-25_flag_edit_rls_replacement.sql` | Owner UPDATE policy: open flags only, 5 immutable columns frozen in WITH CHECK | YES |
| **5** | `2026-05-25_push_tokens.sql` | New `push_tokens` table with owner-scoped RLS and updated_at trigger | PARTIAL |

> **IMPORTANT — dependency note for Step 2 and Step 4:**
> Two migrations that must precede these were confirmed already-applied in PROJECT_STATE:
> - `2026-05-23_data_layer_hardening.sql` — adds `updated_at` column + `on_flag_updated_at` trigger that Step 2 relies on.
> - `2026-05-23_rls_initplan_and_non_owner_status_update.sql` — creates "flags update own" policy that Step 4 drops and replaces.
>
> If Sky is uncertain whether those ran, verify with: `SELECT column_name FROM information_schema.columns WHERE table_name = 'flags' AND column_name = 'updated_at';` — must return 1 row before applying Step 2.

---

## STEP 1 — `2026-05-27_users_email_privacy.sql`

**Full path:** `/Users/skypie/AccessMap/supabase/migrations/2026-05-27_users_email_privacy.sql`

**Purpose:** Closes the PII exposure where any authenticated user could REST-query every other user's `email` column. Revokes broad SELECT on `public.users` from `authenticated` and `anon`; re-grants only `(id, display_name, avatar_url, points, created_at)` to `authenticated`; silences `anon` entirely on the table; creates `public.users_self_email` SECURITY INVOKER view so the caller can still read their own email if needed.

**Apply order rationale:** Must be first — it is the active privacy gate (Constitution Art. 2.4) and establishes the `anon`-is-blocked-on-users invariant that Step 3 (realtime) and the guest sign-in migration rely on.

**Post-apply smoke test:**
```sql
-- Must return 0 rows (email not in grant, so column is inaccessible):
SELECT column_name
FROM information_schema.role_column_grants
WHERE table_name = 'users'
  AND column_name = 'email'
  AND grantee = 'authenticated';

-- Must return the 5 allowed columns only:
SELECT column_name
FROM information_schema.role_column_grants
WHERE table_name = 'users'
  AND grantee = 'authenticated'
ORDER BY column_name;
-- Expected: avatar_url, created_at, display_name, id, points

-- Must return 1 row (the view exists):
SELECT viewname FROM pg_views
WHERE schemaname = 'public' AND viewname = 'users_self_email';
```

**Rollback (2 lines):**
```sql
grant select (email) on public.users to authenticated;
drop view if exists public.users_self_email;
```
> After rollback: the live DB returns to the prior state where any authenticated user can read any other user's email — the same exposure that existed at first launch.

---

## STEP 2 — `2026-05-23_status_update_trigger_proposal.sql`

**Full path:** `/Users/skypie/AccessMap/supabase/migrations/2026-05-23_status_update_trigger_proposal.sql`

**Purpose:** Installs `enforce_flag_status_only_for_non_owner` as a BEFORE UPDATE trigger on `public.flags`. For non-owner callers it reverts all columns except `status` and `updated_at` to their OLD values, providing defense-in-depth against unauthorized column writes at the DB layer (belt-and-suspenders with the RLS in Step 4). Steve-approved 2026-05-27.

**Prerequisite check before applying:**
```sql
-- Must return 1 row. If 0 rows, data_layer_hardening.sql has NOT been applied — stop.
SELECT column_name FROM information_schema.columns
WHERE table_name = 'flags' AND column_name = 'updated_at';
```

**Post-apply smoke test:**
```sql
-- Must return 1 row with trigger name:
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'flags'
  AND trigger_name = 'enforce_flag_status_only_for_non_owner';
-- Expected: enforce_flag_status_only_for_non_owner | UPDATE | BEFORE

-- Function must exist:
SELECT proname FROM pg_proc WHERE proname = 'enforce_flag_status_only_for_non_owner';
```

**Rollback (2 lines):**
```sql
drop trigger if exists enforce_flag_status_only_for_non_owner on public.flags;
drop function if exists public.enforce_flag_status_only_for_non_owner();
```
> After rollback: non-owner column protection reverts to RLS WITH CHECK only (the original pattern from schema.sql). No data is lost.

---

## STEP 3 — `2026-05-28_d4_realtime_flags_filtered.sql`

**Full path:** `/Users/skypie/AccessMap/supabase/migrations/2026-05-28_d4_realtime_flags_filtered.sql`

**Purpose:** Applies D4 (Sky-approved 2026-05-28). Adds `public.flags` to the `supabase_realtime` publication with a column-level filter so Realtime broadcasts ONLY `{id, status}` — not lat/lng, photo_url, description, or user_id. Also creates `public.realtime_subscribe_log` table and `log_realtime_event()` SECURITY DEFINER RPC for observability. Supersedes the deprecated Option-1 realtime migration.

**Post-apply smoke test:**
```sql
-- Must return 1 row with attnames showing id,status only:
SELECT pubname, schemaname, tablename, attnames
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename = 'flags';
-- Expected: supabase_realtime | public | flags | {id,status}

-- Subscribe-log table must exist:
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'realtime_subscribe_log';

-- RPC function must exist:
SELECT proname FROM pg_proc WHERE proname = 'log_realtime_event';
```

**Rollback — use companion file (2 steps, do NOT paste inline):**
Paste `/Users/skypie/AccessMap/supabase/migrations/2026-05-28_d4_realtime_flags_filtered_rollback.sql` into SQL Editor and run.

Summary of what the rollback does:
```sql
-- Drops flags from publication:
alter publication supabase_realtime drop table public.flags;
-- Drops observability infrastructure:
drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
drop function if exists public.log_realtime_event(text, text);
drop table if exists public.realtime_subscribe_log;
```
> After rollback: no Realtime broadcast on flags. Client falls back to fetch-on-tab-focus. Historical subscribe log data is lost (only observability metadata — no user content).

---

## STEP 4 — `2026-05-25_flag_edit_rls_replacement.sql`

**Full path:** `/Users/skypie/AccessMap/supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql`

**Purpose:** D1 RLS gate. Drops the old broad "flags update own" policy and replaces it with "flags owner edit open" — owners may only UPDATE their own flags whose `status = 'open'`; five columns (lat, lng, user_id, created_at, status) are frozen via correlated subselects in WITH CHECK. Jordan-approved with conditions 2026-05-24.

**WARNING — do NOT apply `2026-05-25_flag_edit_rls.sql` (no `_replacement`):** that file is superseded and has weaker WITH CHECK protection. Apply only the `_replacement` version.

**Prerequisite check before applying:**
```sql
-- "flags update own" must exist (created by rls_initplan migration). If 0 rows, stop.
SELECT policyname FROM pg_policies
WHERE tablename = 'flags' AND policyname = 'flags update own';
```

**Post-apply smoke test:**
```sql
-- New policy must exist; old one must be gone:
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'flags'
  AND policyname IN ('flags owner edit open', 'flags update own');
-- Expected: 1 row: 'flags owner edit open' | UPDATE | (with status='open' in qual)
-- 'flags update own' must NOT appear.

-- Non-owner status policy must still exist (coexists with new policy):
SELECT policyname FROM pg_policies
WHERE tablename = 'flags'
  AND policyname = 'flags status update by any authenticated';
-- Expected: 1 row
```

**Rollback (2 lines):**
```sql
drop policy if exists "flags owner edit open" on public.flags;
create policy "flags update own" on public.flags for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
```
> After rollback: owners can edit any column on any of their flags regardless of status. The edit UI (when built) should be hidden until the policy is re-applied.

---

## STEP 5 — `2026-05-25_push_tokens.sql`

**Full path:** `/Users/skypie/AccessMap/supabase/migrations/2026-05-25_push_tokens.sql`

**Purpose:** Creates `public.push_tokens` table (one row per user; stores Expo push token, platform, timestamps). Enables RLS with owner-scoped SELECT/INSERT/UPDATE/DELETE policies. Adds `handle_push_token_updated_at` BEFORE UPDATE trigger. Service-role bypasses RLS for the Edge Function. D2 infrastructure — required before deploying the `notify-flag-status` Edge Function.

**IMPORTANT — NOT fully idempotent:** The `create policy` statements do NOT have `drop policy if exists` guards. If the table already exists with policies, re-running will error with "policy already exists." Apply exactly once. If you need to verify before applying, run the smoke test query below first.

**Pre-apply check (verify not already applied):**
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'push_tokens';
-- Expected: 0 rows (not yet applied). If 1 row → already applied, skip this step.
```

**Post-apply smoke test:**
```sql
-- Table must exist:
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'push_tokens';

-- 4 RLS policies must exist:
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'push_tokens'
ORDER BY cmd;
-- Expected: 4 rows: DELETE | INSERT | SELECT | UPDATE (all owner-scoped)

-- Updated_at trigger must exist:
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'push_tokens'
  AND trigger_name = 'push_tokens_updated_at';
```

**Rollback (1 line — cascades everything):**
```sql
drop table if exists public.push_tokens;
```
> `DROP TABLE` cascades to all policies and triggers on the table. No user data exists yet (table is new). Safe to re-apply from scratch after rollback.

---

## Files confirmed NOT in scope for this runbook

The following files exist in the migrations directory but are NOT in this runbook for the reasons listed:

| File | Status | Reason |
|---|---|---|
| `2026-05-23_data_layer_hardening.sql` | ALREADY APPLIED | Confirmed in PROJECT_STATE. Prerequisite for Steps 2 and 4 above. |
| `2026-05-23_rls_initplan_and_non_owner_status_update.sql` | ALREADY APPLIED | Confirmed in PROJECT_STATE. Prerequisite for Step 4 above. |
| `2026-05-23_feedback_table.sql` | ALREADY APPLIED | Confirmed in PROJECT_STATE. |
| `2026-05-24_flag_context_tags.sql` | ALREADY APPLIED | Confirmed in PROJECT_STATE. |
| `2026-05-24_status_history_table.sql` | ALREADY APPLIED | Confirmed in PROJECT_STATE. |
| `2026-05-25_flag_edit_rls.sql` | DO NOT APPLY | Superseded by Step 4 (`_replacement` version). Weaker WITH CHECK — applying would leave an insecure policy. |
| `2026-05-25_flag_edit_history_table.sql` | CONDITIONAL | Apply only if Sky answers D6 = YES (edit audit trail). Omitted from this runbook pending that decision. |
| `2026-05-25_notification_preferences_proposal.sql` | DEFERRED | Safe, Jordan-reviewed companion to Step 5. Can be applied in this session after Step 5 if Sky chooses. Not required for push tokens to work at DB layer. |
| `2026-05-28_d4_realtime_flags_filtered_rollback.sql` | ROLLBACK SCRIPT | Companion rollback for Step 3. Do NOT apply unless undoing D4. |
| `2026-05-29_anon_flags_select.sql` | OUT OF SCOPE | Jordan-approved guest read-only flags policy. Not one of the 5 target migrations for this runbook. Safe to apply in same session after Step 5 if guest sign-in feature is active. |
| `2026-05-30_flag_creation_rate_limit.sql` | DO NOT APPLY | Not on main. Trapped on unreviewed branch. Also has a minor SECURITY DEFINER schema-prefix bug (`FROM flags` should be `FROM public.flags`). Needs Steve review + branch merge first. |

---

## Verification: file existence confirmed

All 5 runbook migration files physically exist on disk as of 2026-05-29:

| File | Confirmed present |
|---|---|
| `/Users/skypie/AccessMap/supabase/migrations/2026-05-27_users_email_privacy.sql` | YES |
| `/Users/skypie/AccessMap/supabase/migrations/2026-05-23_status_update_trigger_proposal.sql` | YES |
| `/Users/skypie/AccessMap/supabase/migrations/2026-05-28_d4_realtime_flags_filtered.sql` | YES |
| `/Users/skypie/AccessMap/supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql` | YES |
| `/Users/skypie/AccessMap/supabase/migrations/2026-05-25_push_tokens.sql` | YES |
| `/Users/skypie/AccessMap/supabase/migrations/2026-05-28_d4_realtime_flags_filtered_rollback.sql` | YES (rollback companion only) |

---

## DECISIONS FOR SKY

| Decision | Default if no answer |
|---|---|
| D6: Apply `2026-05-25_flag_edit_history_table.sql` (edit audit trail)? | Skip — table is not required for flag editing to work |
| Apply `2026-05-25_notification_preferences_proposal.sql` in this session (after Step 5)? | Skip — push tokens work without it; Edge Function reads AsyncStorage prefs today |
| Apply `2026-05-29_anon_flags_select.sql` in this session? | Skip unless guest sign-in feature is already merged to main |

---

*Report written by Dana — READ-ONLY. No SQL was executed, no live DB was accessed, no branches were created or modified.*
*Constitution Art. 5 compliance: Sky is the only person who applies to the live database.*
