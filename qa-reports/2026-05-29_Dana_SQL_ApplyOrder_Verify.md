---
role: Dana (Backend Engineer)
date: 2026-05-29
task: READ-ONLY dependency audit — SQL migration apply-order verification
status: COMPLETE
audience: Sky (live-DB apply — Sky only, Const. Art. 5)
source: /Users/skypie/AccessMap/supabase/migrations/ (all .sql files read)
cross-ref: 2026-05-29_Morgan_SQL_Apply_Checklist.md (Section A corrections noted)
---

# AccessMap — SQL Migration Apply Order: Verified

> Const. Art. 5: Sky applies to the live DB. This is a read-only analysis.
> Every conclusion below is derived from reading the .sql file contents directly.
> Where PROJECT_STATE.md and file contents disagreed, file contents win.

---

## Already Applied (confirmed by PROJECT_STATE.md — do NOT re-apply these)

| File | Status | Notes |
|---|---|---|
| `2026-05-23_feedback_table.sql` | APPLIED | `public.feedback` table live. File is idempotent so harmless to re-run, but not needed. |
| `2026-05-24_flag_context_tags.sql` | APPLIED | `context_tags` column live. Same — idempotent. |
| `2026-05-24_status_history_table.sql` | APPLIED | `flag_status_history` table + triggers live. |

---

## SECTION 1 — VERIFIED ORDERED APPLY LIST

Dependencies mapped from SQL content. Each step lists what the SQL actually does, whether the file is idempotent, and whether a rollback exists.

---

### Step 1 — `2026-05-27_users_email_privacy.sql`
**What it does:** Revokes broad SELECT on `public.users` from `authenticated` and `anon`; re-grants only `(id, display_name, avatar_url, points, created_at)` to `authenticated`; drops `anon` access entirely; creates helper view `public.users_self_email` (SECURITY INVOKER, returns only caller's own email).

**Dependencies:** None. Operates only on `public.users` and a new view. No dependency on any other pending migration.

**Why first:** Closes the active PII exposure (email readable by any authenticated user via REST). Privacy gate — apply before anything that adds more surface area. Morgan listed this as A1; that is correct.

**Idempotent?** YES — `drop policy if exists` / `drop view if exists` / `create or replace` throughout.

**Rollback:** Explicitly documented in file:
```sql
grant select (email) on public.users to authenticated;
drop view if exists public.users_self_email;
```

**Destructive?** Non-destructive. Removes a column from a grant (narrows access — privacy-safe direction). No data deleted.

---

### Step 2 — `2026-05-23_data_layer_hardening.sql`
**What it does:** Adds `updated_at timestamptz` to `public.flags`; backfills to `created_at`; creates `set_flag_updated_at()` BEFORE UPDATE trigger; adds `flags_description_length_chk` constraint (≤2000 chars) and `users_points_nonneg_chk` constraint (points ≥ 0); creates composite index `flags_status_created_at_idx`; drops `flags_status_idx` and `flags_geo_idx`.

**Dependencies:** Must come BEFORE `2026-05-23_status_update_trigger_proposal.sql`. The trigger proposal file's comment explicitly references `updated_at` ("updated_at intentionally NOT reverted — it tracks 'this row was touched'"). The D3 trigger references `new.updated_at` conceptually (it does not revert it, relying on the column already existing). If D3 applies before this migration, the `updated_at` column doesn't exist yet — the trigger body succeeds (it only enumerates specific columns to revert, not updated_at), but the backfill and the `on_flag_updated_at` trigger would be absent, leaving the column un-updated on every write. Apply this first to ensure `updated_at` exists and is auto-managed before D3 installs the non-owner revert trigger.

**Also must come BEFORE `2026-05-25_flag_edit_rls_replacement.sql`:** That RLS policy's WITH CHECK references `updated_at` semantically in the smoke test (step 6: "`on_flag_updated_at` trigger fires on edit"). The trigger `on_flag_updated_at` is created by this file. Safe to apply early.

**Idempotent?** YES — `add column if not exists`, `drop constraint if exists / add constraint`, `create index if not exists`, `drop index if exists` (drops are always-safe on non-existent objects).

**Rollback:** Explicitly documented in file (drop trigger, drop function, drop column, drop constraints, drop new index, restore geo index).

**Destructive?** The `flags_geo_idx` drop is technically irreversible without re-creating it. The file notes this is intentional (btree on lat/lng doesn't help spatial queries; a GIST index is the right future form). Not operationally harmful.

---

### Step 3 — `2026-05-23_rls_initplan_and_non_owner_status_update.sql`
**What it does:** Rewrites four RLS policies with `(select auth.uid())` initPlan optimization on `public.users` and `public.flags`; also rewrites two storage policies on `storage.objects`. Adds a second UPDATE policy "flags status update by any authenticated" that enforces status-only changes for non-owners via correlated subselects (WITH CHECK pins every non-status column to OLD values).

**Dependencies:** Must come AFTER Step 2. This file recreates the "flags update own" policy (via `drop policy if exists "flags update own" / create policy "flags update own"`). Step 4 (`flag_edit_rls_replacement.sql`) ALSO drops "flags update own" and replaces it with "flags owner edit open". If the order were reversed and Step 4 ran first, applying Step 3 afterward would recreate the old, less-restrictive "flags update own" policy — **overwriting the tighter Step-4 policy**. Therefore Step 3 MUST apply before Step 4.

**Idempotent?** YES — every block is `drop policy if exists` then `create policy`.

**Rollback:** Documented: `drop policy if exists "flags status update by any authenticated"` + re-run prior policy bodies without `(select ...)` wrappers.

**Destructive?** No. Pure policy replacement with equivalent semantics for the initPlan blocks; the new non-owner status policy is additive.

---

### Step 4 — `2026-05-23_status_update_trigger_proposal.sql` (D3, Steve-approved)
**What it does:** Creates function `public.enforce_flag_status_only_for_non_owner()` and a BEFORE UPDATE trigger of the same name on `public.flags`. For non-owners, reverts all columns EXCEPT `status` and `updated_at` to OLD values, preventing unauthorized column writes at the trigger layer.

**Dependencies:**
- AFTER Step 2: relies on `updated_at` column existing (the trigger intentionally does NOT revert `updated_at`, implying the column exists).
- AFTER Step 3: the trigger coexists with "flags status update by any authenticated" — both enforce the same intent from different layers. The trigger fires BEFORE the row is committed; the RLS WITH CHECK fires as part of the UPDATE plan. No conflict; they're complementary defense layers. Alphabetical ordering (`enforce_flag_status_only_for_non_owner` sorts before `on_flag_updated_at` and `on_flag_status_change`) — the Steve approval doc confirms this is the correct order.

**Idempotent?** YES — `create or replace function` + `drop trigger if exists / create trigger`.

**Rollback:** Documented:
```sql
drop trigger if exists enforce_flag_status_only_for_non_owner on public.flags;
drop function if exists public.enforce_flag_status_only_for_non_owner();
-- Then re-run the "flags status update by any authenticated" policy body from schema.sql
```

**Destructive?** No. Behavior change: previously a non-owner PATCH with non-status columns would fail WITH CHECK (hard reject). With this trigger, the UPDATE succeeds at HTTP level but the non-status columns are silently reverted. Steve's approval doc notes this is acceptable and the intentional direction.

---

### Step 5 — `2026-05-25_flag_edit_rls_replacement.sql` (D1, Jordan-approved)
**What it does:** Drops "flags update own" policy (the broad owner UPDATE that allows any column, any status). Creates replacement policy "flags owner edit open" — owners can only UPDATE their own flags with `status = 'open'`; immutable columns (lat, lng, user_id, created_at, status) are frozen in WITH CHECK via correlated subselects.

**Dependencies:**
- AFTER Step 3: Step 3 creates "flags update own" (the broadened initPlan-rewritten version). This file drops and replaces it. If applied before Step 3, the sequence would be: Step 5 drops "flags update own" → Step 3 later recreates "flags update own" (the old version) → the tighter policy is gone. **Order is critical: Step 3 must precede Step 5.**
- AFTER Step 2: The WITH CHECK smoke test references `on_flag_updated_at` trigger (Step 2 creates it). Not a hard SQL dependency, but functionally correct to have `updated_at` tracking in place before the edit RLS ships.
- Requires `context_tags` column to exist for full semantics — that column was applied with `2026-05-24_flag_context_tags.sql` (already APPLIED per PROJECT_STATE).

**Idempotent?** YES — `drop policy if exists` / `create policy`.

**Rollback:** Documented in file (drop new policy, re-create original "flags update own").

**Destructive?** No data deleted. The policy NARROWS owner update rights (open flags only, immutable columns frozen). This is a tightening change — correct direction.

---

### Step 6 — `2026-05-28_d4_realtime_flags_filtered.sql` (D4, Sky-approved 2026-05-28)
**What it does:** (1) Drops `public.flags` from `supabase_realtime` publication if present (clearing any Option-1 state); (2) Re-adds `public.flags` with column filter `(id, status)` — only those two fields broadcast; (3) Creates `public.realtime_subscribe_log` table with RLS; (4) Creates `public.log_realtime_event(text, text)` SECURITY DEFINER RPC for client subscribe/unsubscribe logging.

**Dependencies:**
- AFTER Step 2: `realtime_subscribe_log` has a FK `user_id references public.users(id)`. `public.users` exists already. No column dependency on the D2/D3/D4 hardening steps — this migration is relatively independent.
- This file supersedes `2026-05-24_realtime_flags.sql` (not in apply list; deprecated). It also cleans up any Option-1 publication state that may have been applied previously. The `do $$ ... exception ... end $$` wrapper makes Step 1 of the migration safe to run even if flags was never in the publication.
- **No dependency on Steps 3, 4, or 5** — the publication and log table are independent of the RLS and trigger changes on `public.flags`.

**Idempotent?** MOSTLY — `create table if not exists`, `create or replace function`, `drop policy if exists / create policy`. The `alter publication` statement is NOT idempotent in the strict sense: running it twice would attempt to add `public.flags (id, status)` to the publication a second time, which may error on some Postgres versions. The `do $$` block at the start handles the "drop if exists" cleanly, but the ADD at step 2 is a plain `alter publication ... add table` without a guard. In practice: if the publication doesn't already include `flags`, this succeeds. If run twice: the second run's Step 1 drops it, Step 2 re-adds it — functionally idempotent via the drop+re-add sequence. **Safe to re-run due to the drop guard.**

**Rollback:** Companion file `2026-05-28_d4_realtime_flags_filtered_rollback.sql` exists and is correct (drops publication entry, drops table + policy + function). Do NOT apply the rollback file as part of the normal apply sequence.

**Destructive?** No data deleted. The `realtime_subscribe_log` table is new. The publication column filter change is reversible via the rollback file.

---

### Step 7 — `2026-05-25_push_tokens.sql` (D2)
**What it does:** Creates `public.push_tokens` table (user_id PK → users FK, token, platform, timestamps); enables RLS with owner-scoped SELECT/INSERT/UPDATE/DELETE policies; creates `handle_push_token_updated_at()` BEFORE UPDATE trigger.

**Dependencies:** `user_id uuid primary key references public.users(id) on delete cascade` — requires `public.users` to exist (it does, from base schema). No dependency on any of the above pending migrations. This could technically run at any position, but placing it after the realtime migration keeps push-notification infrastructure grouped logically and applies after the privacy hardening (Step 1) which affects the users table.

**Idempotent?** PARTIAL — `create table if not exists` and `create or replace function` + `drop trigger if exists / create trigger` are idempotent. The `create policy` statements for push_tokens are NOT wrapped in `drop policy if exists` — re-running would fail with "policy already exists" errors. **Not fully idempotent. Apply once.**

**Rollback:** Not explicitly documented in file. The implicit rollback is:
```sql
drop table if exists public.push_tokens; -- cascades policies + trigger
```

**Destructive?** No. New table, no impact on existing data.

---

### Step 8 (CONDITIONAL) — `2026-05-29_anon_flags_select.sql`
**Classification:** See Section 2 (Section-B Unknowns) below. Short answer: this is SAFE to apply, Jordan-approved, and belongs AFTER Step 1 (because Step 1 explicitly revokes anon access to `public.users`, establishing the privacy boundary that makes anon flags access safe — `users` has no anon policy, so the `user_id` UUID on flags cannot be reverse-looked-up by guests).

**What it does:** Adds policy "flags readable by anon" on `public.flags` for SELECT (`using (true)`). Allows unauthenticated (guest) users to read all public flags. Supports the `feat/guest-signin-hamburger-menu-2026-05-29` feature.

**Dependencies:** AFTER Step 1 (users email privacy). Step 1 revokes anon from `public.users`. The anon flags SELECT is safe only because users table has no anon policy. If Step 1 were not applied, anon could potentially join flags.user_id to users via a separate anon-accessible path — but since `2026-05-27_users_email_privacy.sql` explicitly silences anon on users, the guest can see flag UUIDs but cannot resolve them to display_name or email. Jordan reviewed and approved this explicitly (qa-reports/2026-05-29_Jordan_GuestSigninPrivacyGate.md).

**Idempotent?** YES — `drop policy if exists / create policy`.

**Rollback:** Documented in file: `drop policy if exists "flags readable by anon" on public.flags;`

**Destructive?** No. Additive-only: new SELECT policy for anon role. All write operations on all tables remain blocked for anon.

**Conditional note:** This migration supports a feature branch (`feat/guest-signin-hamburger-menu-2026-05-29`) that may or may not be merged yet. If the guest sign-in feature is NOT merged, this migration is harmless (the anon policy enables DB-level access but the app's client code won't invoke it). If the feature IS merged, this migration is required.

---

### Step 9 (CONDITIONAL — Sky yes/no) — `2026-05-25_flag_edit_history_table.sql`
**Classification:** Conditional on Sky's D6 decision ("Do you want an edit history table?"). Morgan already lists this correctly as conditional. See Section 3 (DO NOT APPLY without decision).

If Sky says YES: apply AFTER Step 5 (`flag_edit_rls_replacement.sql`). The file's own comment requires this: "Apply 2026-05-25_flag_edit_rls_replacement.sql FIRST." The history table's INSERT RLS policy checks `user_id` against `public.flags.user_id` — that query only succeeds if the flags table is accessible, which it always is. No hard SQL failure if applied without Step 5, but functionally the edit history table is useless before the edit policy ships.

---

## SECTION 2 — SECTION-B UNKNOWNS: RESOLVED

### Unknown 1: `2026-05-29_anon_flags_select.sql`

**What it does:** Creates policy `"flags readable by anon"` on `public.flags` for SELECT with `using (true)`. Enables unauthenticated (anon role) users to read all rows from `public.flags`. Added by Shamus to support the guest sign-in feature (feat/guest-signin-hamburger-menu-2026-05-29).

**Why not in PROJECT_STATE:** This file was created 2026-05-29 (today), after PROJECT_STATE was last compiled (also 2026-05-29 but from the Rory merge wave, before the guest-signin work). A known drift: the guest sign-in feature and its migration landed after the last PROJECT_STATE update.

**Is it safe?** YES. Jordan reviewed and approved it explicitly in `qa-reports/2026-05-29_Jordan_GuestSigninPrivacyGate.md` (referenced in the file header). Key findings:
- `public.flags` contains no PII — lat/lng/description/photo_url are public-intent data the user submitted knowing flags are visible on the public map.
- `user_id` on flags is a UUID — not reversible to name or email because `public.users` has NO anon SELECT policy (Step 1 of this apply list explicitly revokes anon from users).
- Blast radius table in the file confirms: anon INSERT/UPDATE/DELETE on all tables remain BLOCKED.

**Does it apply or is it dead/superseded?** APPLIES. It supports an active, non-deprecated feature branch.

**Touches privacy surface?** YES, and it has already been reviewed by Jordan. Jordan's verdict: approved, no blockers. No additional Jordan review needed.

**Morgan's checklist classification:** Morgan flagged it as "purpose/safety unknown." Verdict: reclassify to APPROVED (Jordan-reviewed), add to apply list as Step 8, AFTER Step 1 (email privacy). See the ordering rationale in Step 8 above.

---

### Unknown 2: `2026-05-25_notification_preferences_proposal.sql`

**What it does:** Creates `public.notification_preferences` table (user_id PK → auth.users FK; four boolean preference columns; updated_at). Enables RLS with owner-only SELECT, INSERT, and UPDATE policies. No DELETE policy (intentional — preferences are logically permanent). The file header says: "future server-side delivery logic (e.g. Edge Function). The client currently reads from AsyncStorage only; this migration is a forward-looking schema stub."

**Why not in PROJECT_STATE:** The file is dated 2026-05-25 but was never added to the PROJECT_STATE migrations table. It is not listed in any "APPLIED" row. It is listed as a file-only pending migration with no status entry. This is a tracking omission in PROJECT_STATE, not a sign that the migration was applied.

**Relationship to `push_tokens.sql`:** These are companion tables but independent migrations. `push_tokens` stores the Expo push token per device. `notification_preferences` stores per-user boolean toggles for four notification categories. The Edge Function would consult both: "does this user have a push token AND are they opted in to this notification type?" They can be applied independently; `notification_preferences` has no FK to `push_tokens` and vice versa. Either order is fine for `push_tokens` (Step 7) and `notification_preferences`.

**Is it safe?** YES — clean owner-scoped RLS, no privacy surface beyond the user's own preferences (which are per-user and accessible only to the row owner via the SELECT policy).

**Does it apply or is it dead/superseded?** APPLIES. It is a forward-looking stub — not required for push tokens to work today (the Edge Function is not yet deployed; client reads from AsyncStorage). But it is a valid, needed migration when the notification delivery logic ships. No superseding file exists.

**Idempotent?** PARTIAL — `create table if not exists` and the comment policies are `create policy` WITHOUT `drop policy if exists` guards. Re-running would fail with "policy already exists." **Apply once.**

**Rollback:** Documented: `DROP TABLE IF EXISTS public.notification_preferences;` (cascades policies).

**Recommendation:** Add to apply list. Lowest-urgency pending migration — safe to apply now or defer. I recommend applying it in the same session as `push_tokens` (after Step 7) since they're thematically paired. Assign it Step 7b in the ordered list (see summary section).

**Morgan's checklist classification:** Morgan listed it as unknown. Verdict: reclassify to SAFE — add to apply list after `push_tokens`.

---

### Unknown 3: `flag_edit_rls.sql` vs `flag_edit_rls_replacement.sql`

**`2026-05-25_flag_edit_rls.sql` — what it does:**
Drops "flags update own" and creates a new policy "flags owner edit open" with two conditions: `(select auth.uid()) = user_id AND status = 'open'` in USING, and those same two conditions PLUS `user_id = (select user_id from flags where id = flags.id)` in WITH CHECK.

**`2026-05-25_flag_edit_rls_replacement.sql` — what it does:**
Also drops "flags update own" and creates "flags owner edit open" — but the WITH CHECK is substantially more thorough: it freezes ALL five immutable columns (lat, lng, user_id, created_at, status) via correlated subselects. It also carries the Jordan gate approval header (Condition 1 of jordan-flag-editing-review-2026-05-24.md) and the full smoke-test suite.

**Are they both live / does only one apply?**
These files create the same policy name (`"flags owner edit open"`) on the same table. Applying both in sequence would result in the second file's `drop policy if exists "flags update own"` being a no-op (already dropped by the first), then creating the policy defined by the second file. The final state would be determined by whichever ran last. They are NOT independently additive.

**Verdict: only `_replacement.sql` applies. `flag_edit_rls.sql` is superseded.**

Evidence from the replacement file's own header: "REPLACES the existing 'flags update own' policy with a tighter policy." The original `flag_edit_rls.sql` was the first attempt. The replacement adds:
1. The full five-column immutable freeze in WITH CHECK (the original only checked user_id + status in WITH CHECK).
2. The Jordan gate approval.
3. A complete rollback section.

The original `flag_edit_rls.sql` is the dead version. Morgan's checklist is correct: only the replacement applies.

**ACTION:** `2026-05-25_flag_edit_rls.sql` → DO NOT APPLY. See Section 3.

---

## SECTION 3 — DO NOT APPLY

| File | Reason |
|---|---|
| `2026-05-24_realtime_flags.sql.deprecated-option1-do-not-apply` | Deprecated. Extension `.deprecated-option1-do-not-apply` makes intent explicit. Superseded by `2026-05-28_d4_realtime_flags_filtered.sql` (Option 2, column-filtered). Applying would broadcast full flag rows (lat, lng, photo_url, description, user_id) over Realtime — privacy concern Jordan reviewed and resolved by mandating Option 2. |
| `2026-05-25_flag_edit_rls.sql` | Superseded by `2026-05-25_flag_edit_rls_replacement.sql`. The replacement is a strict superset with Jordan gate approval and full immutable-column protection. Applying both risks leaving the weaker version in effect if applied after the replacement (it would drop and recreate the policy with weaker WITH CHECK). Apply replacement only. |
| `2026-05-28_d4_realtime_flags_filtered_rollback.sql` | This is the rollback companion for Step 6. It is a rollback script, NOT an apply migration. Never apply unless you need to undo D4. |
| `2026-05-30_flag_creation_rate_limit.sql` | NOT on main. Exists only on branch `fix/security-hardening-2026-05-30` (unreviewed by Steve). Morgan's checklist is correct: gate is Steve review + branch merge first. Also: the function body uses `SECURITY DEFINER` + references `flags` (unqualified table name — missing `public.` schema prefix in the SELECT). This is a minor risk in SECURITY DEFINER context — unqualified names resolve against `search_path`; the function doesn't set `search_path = public` explicitly, unlike all other security-definer functions in this codebase that do. Flag this for Steve to fix before merging the branch. |
| `2026-05-25_flag_edit_history_table.sql` | CONDITIONAL. Apply only if Sky answers YES to D6. If Sky answers NO, this stays unapplied indefinitely. The edit feature works without it. |

---

## SECTION 4 — ROUTE TO JORDAN (PRIVACY)

**No new Jordan escalations required.** All privacy-surface migrations have been pre-reviewed:

| Migration | Jordan status |
|---|---|
| `2026-05-27_users_email_privacy.sql` | Implicit approval — Steve drove this security fix; Constitution Art. 2.4 mandates it. Jordan signed off on the email privacy surface in `2026-05-28_Jordan_SQL-D1-D4-Privacy.md`. |
| `2026-05-25_flag_edit_rls_replacement.sql` | Jordan APPROVED WITH CONDITIONS (2026-05-24) — `jordan-flag-editing-review-2026-05-24.md`. |
| `2026-05-28_d4_realtime_flags_filtered.sql` | Jordan reviewed in `2026-05-28_Jordan_D4-PrivacyReview.md`. Approved. |
| `2026-05-29_anon_flags_select.sql` | Jordan APPROVED — `2026-05-29_Jordan_GuestSigninPrivacyGate.md`. Explicitly noted in the file header. |

No migration in this list requires a new Jordan review before Sky applies it.

---

## SECTION 5 — CORRECTIONS TO MORGAN'S DRAFT ORDER (Section A)

Morgan's Section A order was:
> A1 users_email_privacy → A2 status_update_trigger → A3 flag_edit_rls_replacement → A4 data_layer_hardening → A5 rls_initplan → A6 d4_realtime_flags → A7 push_tokens

**Corrections required:**

1. **A4 and A5 must precede A2 and A3.** Morgan placed `data_layer_hardening` (A4) and `rls_initplan` (A5) AFTER the trigger (A2) and RLS replacement (A3). This is unsafe:
   - `rls_initplan` (Morgan A5) creates a new "flags update own" policy. `flag_edit_rls_replacement` (Morgan A3) drops "flags update own" and replaces it. If A3 runs before A5, applying A5 later recreates the old, weaker "flags update own" policy — **overwriting the tighter replacement**. A5 must run before A3.
   - `data_layer_hardening` (Morgan A4) creates the `updated_at` column and `on_flag_updated_at` trigger. The status_update_trigger (Morgan A2) references `updated_at` semantically (explicitly does NOT revert it). A4 must run before A2.

2. **`notification_preferences_proposal.sql` is missing from Morgan's list.** It was an unknown in Section B. It should be added after `push_tokens`.

3. **`anon_flags_select.sql` was an unknown in Section B.** Now classified as safe/approved. It should be added to the apply list after `users_email_privacy` (Step 1 establishes the privacy boundary it relies on).

**Corrected order (Dana's verified list):**

| Step | File |
|---|---|
| 1 | `2026-05-27_users_email_privacy.sql` |
| 2 | `2026-05-23_data_layer_hardening.sql` |
| 3 | `2026-05-23_rls_initplan_and_non_owner_status_update.sql` |
| 4 | `2026-05-23_status_update_trigger_proposal.sql` |
| 5 | `2026-05-25_flag_edit_rls_replacement.sql` |
| 6 | `2026-05-28_d4_realtime_flags_filtered.sql` |
| 7 | `2026-05-25_push_tokens.sql` |
| 7b | `2026-05-25_notification_preferences_proposal.sql` |
| 8 | `2026-05-29_anon_flags_select.sql` |
| 9 (CONDITIONAL) | `2026-05-25_flag_edit_history_table.sql` — apply only if Sky says YES to D6 |

---

## SECTION 6 — QUICK REFERENCE CHECKLIST (for Sky at the SQL Editor)

Apply in this order. Paste each file in full. After each: check for errors before proceeding to next.

```
1. 2026-05-27_users_email_privacy.sql            ← PII fix (privacy gate)
2. 2026-05-23_data_layer_hardening.sql            ← updated_at + constraints + index
3. 2026-05-23_rls_initplan_and_non_owner_status_update.sql  ← initPlan + non-owner status policy
4. 2026-05-23_status_update_trigger_proposal.sql  ← D3 trigger (Steve-approved, unblocks clustering)
5. 2026-05-25_flag_edit_rls_replacement.sql       ← D1 RLS (Jordan-approved, unblocks clustering)
6. 2026-05-28_d4_realtime_flags_filtered.sql      ← D4 realtime (Sky-approved 2026-05-28)
7. 2026-05-25_push_tokens.sql                     ← D2 push token table
   2026-05-25_notification_preferences_proposal.sql  ← notification prefs stub (pair with D2)
8. 2026-05-29_anon_flags_select.sql               ← guest read-only flags (Jordan-approved)
9. (ONLY if Sky says YES to D6)
   2026-05-25_flag_edit_history_table.sql         ← edit audit trail (conditional)
```

Do NOT apply:
- `2026-05-24_realtime_flags.sql.deprecated-option1-do-not-apply` (deprecated)
- `2026-05-25_flag_edit_rls.sql` (superseded by replacement)
- `2026-05-28_d4_realtime_flags_filtered_rollback.sql` (rollback script, not a migration)
- `2026-05-30_flag_creation_rate_limit.sql` (not on main; needs Steve review + branch merge; minor schema bug to fix first)

---

## SECTION 7 — NOTE ON `2026-05-30_flag_creation_rate_limit.sql`

Beyond the branch-gate issue, this file has a minor SECURITY DEFINER risk: the function body queries `flags` without a schema prefix (`FROM flags` instead of `FROM public.flags`) and does not set `search_path = public`. All other SECURITY DEFINER functions in this codebase (handle_flag_status_change, handle_flag_insert_history, handle_push_token_updated_at, log_realtime_event) all either use fully-qualified names or set `search_path = public`. This is a low-but-real risk in a SECURITY DEFINER context where a malicious user might manipulate search_path. Steve should fix this in the branch before it merges. Flag for Steve's attention.

---

*Report written by Dana (READ-ONLY audit — no SQL was executed, no live DB was accessed)*
*Constitution Art. 5 compliance: this document is a planning artifact only*
