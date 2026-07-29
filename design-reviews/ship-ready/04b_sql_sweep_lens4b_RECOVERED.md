# 04b · SQL POLICY-CLASS SWEEP — full agent report (Lens 4b) — RECOVERED

> **PROVENANCE / RECOVERY NOTE (2026-07-26, recovery window).** The Lens-4b sweep agent finished at 18:30 but its report was never banked: the parent session died at 18:32 (the same window death recorded in HANDOFF). This file is the agent's final report recovered **verbatim** from the session transcript (`agent-aae5977794eb8777b`, 62,311 chars) — zero edits beyond this banner. The condensed, SR-id-assigned summary lives in `04_appstore_readiness.md §C-1`; this file is the full text those SR rows point into. Recovered + banked by the Fable 5 resume window.

---

# SQL POLICY-CLASS SWEEP — AccessMap Lens 4b (final report)

Repo tip `512494a` · every claim below is **repo-inferred** unless tagged **live-verified** (= corroborated by the coordinator's §C-0 read-only MCP data: applied-migrations ledger, advisors, `list_tables`). Source-of-truth ordering applied: migrations > schema.sql (self-declared incomplete, L4-28); `*.deprecated-option1-do-not-apply` ×2 excluded (noted §F).

---

## §A Sweep-class results

### Class 1 — NULL-unsafe comparisons (exhaustive enumeration: 93 comparison sites; 7 defective)

**A1-1 · SR-008 · points-trigger actor guard — 3 repo copies, ONE live object** `[HIGH][live-verified]`
`auth.uid() <> new.user_id` at `2026-05-30_trust_score_system.sql:186-188` (**LATEST-APPLIED TRUTH** — ledger `trust_score_system` applied `20260531`) · `schema.sql:163-165` (doc mirror, "pg_get_functiondef-verified 2026-06-07" — same body) · `2026-05-24_status_history_table.sql:289-291` (**HISTORICAL, superseded** — old 5/2/10/5 values + a history INSERT the live body no longer has).
Truth table: anon flag ⇒ `NEW.user_id IS NULL` ⇒ guard = NULL ⇒ branch skipped ⇒ 0 points, no `point_events` row, while the UI flashes and SR-announces "+3/+7". **ROUTED→fork-briefs Fork-2/OA** (artifact §657-809 of the fork briefs). My only addition is in §C-1.

**A1-2 · SR-009 · `flag_verifications` INSERT policy** `[MED — latent, table is dead][repo-inferred + live-corroborated]`
`2026-05-30_trust_score_system.sql:75`: `verifier_id <> (SELECT user_id FROM public.flags WHERE id = flag_id)` → anon flag ⇒ NULL ⇒ whole `WITH CHECK` NULL ⇒ **deny**. Live-corroborated dead: `flag_verifications` = **0 rows**; zero app writers (`src/types/database.ts:231` is the only repo hit).

**A1-3 · SR-024 · `flag_photos` junction owner-gated verbs** `[MED][live-corroborated]`
`2026-05-30_flag_photos_junction.sql:57` (DELETE), `:65`+`:68` (UPDATE using+check): `(SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid()` → anon flag ⇒ NULL ⇒ deny. **Live-corroborated as applied-as-written**: the advisor's `auth_rls_initplan` list shows `flag_photos ×2` = exactly these two (the read policy is `true`; the INSERT policy was rewritten with a `(select auth.uid())` wrapper by `2026-06-01_flag_photos_insert_guard.sql:48`, hence unflagged). Consistent with the anon-no-photo law, but it is an **accident of NULL semantics, not a written decision** — §C-3 makes it explicit.

**A1-4 · SR-007 · rate-limit trigger is a no-op for the entire anon cohort** `[HIGH][repo-inferred]`
`2026-05-30_flag_creation_rate_limit.sql:20`: `WHERE user_id = auth.uid()`. Anon insert ⇒ `auth.uid()` NULL ⇒ `user_id = NULL` is NULL for **every** row (including other anon rows) ⇒ `COUNT(*) = 0` ⇒ ceiling never reached. The 20/24h server cap covers signed-in users only; the anon path's sole throttle is `anonRateLimit.ts` (AsyncStorage, 5/24h, user-clearable). Artifact §C-5.

**A1-5 · NEW · `handle_flag_photo_added` owner guard inverts when `auth.uid()` is NULL** `[LOW][repo-inferred]`
`2026-05-30_trust_score_system.sql:218`: `IF flag_owner IS NULL OR flag_owner <> auth.uid() THEN RETURN NEW`. With a non-null `flag_owner` and NULL `auth.uid()` (service-role / dashboard / SQL-editor insert) the expression is `false OR NULL` = NULL ⇒ IF not taken ⇒ **+3 awarded to the flag owner for someone else's insert**. Unreachable via REST (junction INSERT is `TO authenticated`); reachable from the dashboard.

**A1-6 · NEW · `flag_edit_history` INSERT policy, same anon collapse** `[LOW — dead table][repo-inferred]`
`2026-05-25_flag_edit_history_table.sql:144-146`: `(select auth.uid()) = (select user_id from public.flags where id = flag_id)` → anon flag ⇒ NULL ⇒ deny. Table live with **0 rows**, zero app writers (no `updateFlag` exists — see A4-3). Same fix shape as §C-3 if ever revived.

**A1-7 · NEW · `handle_comment_vote_added` self-vote guard** `[NOTE][repo-inferred]`
`:286` `IF comment_author = NEW.voter_id` → if the parent comment vanished mid-txn, `comment_author` is NULL ⇒ guard NULL ⇒ falls through ⇒ the later `INSERT INTO point_events (user_id …) VALUES (NULL …)` violates NOT NULL and aborts the vote. FK `ON DELETE CASCADE` makes this near-unreachable. Robustness nit, not a defect.

**⚠️ Class-1 ANTI-FINDING (do not "fix"):** `enforce_flag_status_only_for_non_owner` (`2026-05-23_status_update_trigger_proposal.sql:90`) `if auth.uid() is null or auth.uid() = old.user_id then return new;` — the NULL branch is **load-bearing**. `supabase/functions/delete-account/index.ts:80-81` runs `update flags set user_id = null` as **service_role** (`:46`,`:50`), where `auth.uid()` is NULL. Hardening this line to `IS DISTINCT FROM` would make the trigger revert `user_id` back to the deleted user's UUID and **silently break account-deletion anonymisation (SR-010)**. Flag this in any future "null-safety pass".

### Class 2 — RLS coverage
**A2-1 · `flags` UPDATE: the only column guard is a trigger with an allow-by-omission hole** `[MED-HIGH][live-verified]`
Live triage policy is `USING (true) WITH CHECK (true)` (`2026-06-01_flags_policy_consolidation.sql:42-46`, applied+verified; advisor re-confirms). The sole column lock is `enforce_flag_status_only_for_non_owner`, whose revert list (`:96-103`) is **user_id, lat, lng, category, severity, description, photo_url, created_at** — live-verified effective (06-01 probe: a non-owner severity change did not persist). **Not reverted: `context_tags`, `reopen_requests`, `reopen_requests_reset_at`, `id`, and every column added after 2026-05-23.** So any signed-in user can rewrite any flag's `context_tags` — including the disability tags that drive MapScreen's filter (`MapScreen.tsx:1091-1093`). Blast radius is capped by `FlagDetailModal.tsx:395` (`isValidTag` filter ⇒ no raw-string render, no XSS): this is **filter/semantic pollution, not content injection**. Artifact §C-6.

**A2-2 · `feedback` is a SECOND unthrottled anon write surface** `[MED][repo-inferred]`
`2026-05-23_feedback_table.sql:89-94` — `feedback_insert_self_or_anon` has **no `TO` clause** ⇒ role `public` ⇒ anon may INSERT (`user_id IS NULL` branch is explicitly allowed by design). No rate limit, no length gate beyond `1..5000` chars, no captcha. Reachable in the shipped app for guests: `FeedbackModal` (global header, every screen) → `feedbackStore.submitFeedback` → `.from('feedback').insert({user_id: input.userId ?? null …})` with `userId: user?.id` = undefined for guests. The anon surface is therefore **{flags SELECT, flags INSERT, feedback INSERT}**, not the two the registry assumed. Artifact §C-7.

**A2-3 · SR-001 evidence · `flag_comments` has no admin-delete and no UPDATE policy** `[MED][repo-inferred]`
`2026-05-30_flag_comments.sql:17-35` = read(all authenticated) / insert(own) / delete(own). There is **no `admin delete any comment`** counterpart to `admin delete any flag` (`2026-05-30_admin_role.sql:21-26`). An admin cannot remove an abusive comment through the app's role model at all — only via dashboard/service_role. This is the RLS half of SR-001's Apple 1.2 exposure. Artifact §C-8.

**A2-4 · `FORCE ROW LEVEL SECURITY` absent on all 13 tables** `[NOTE — intentional][repo-inferred]`
Zero occurrences repo-wide. Correct for this design: every points/history writer is a `SECURITY DEFINER` trigger owned by `postgres` and *relies* on owner-bypass (e.g. `flag_status_history` INSERT policy is `with check (false)`). Consequence to record: any future DEFINER function owned by `postgres` also reads/writes every row unfiltered.

**A2-5 · Default-deny verbs (audited, all intentional):** `point_events` no I/U/D · `realtime_subscribe_log` no S/U/D (service-role reads) · `flag_status_history`/`flag_edit_history` no U/D (append-only) · `feedback` no UPDATE · `notification_preferences` no DELETE · `users` no INSERT (trigger) / no DELETE (cascade).

### Class 3 — SECURITY DEFINER hygiene
**A3-1 · `verify_webhook_secret(text)` is EXECUTE-granted to `anon` AND `authenticated`** `[MED][live-verified — advisor WARN]`
`2026-06-03_verify_webhook_secret.sql:25` `GRANT EXECUTE … TO anon, authenticated` (mirrored `schema.sql:220-230`). A `SECURITY DEFINER` boolean oracle over `vault.decrypted_secrets`, callable unauthenticated at `/rest/v1/rpc/verify_webhook_secret`. **The grant is unnecessary**: the only caller authenticates with the service-role key (`supabase/functions/notify-flag-status/index.ts` `isAuthorized()` posts with `SUPABASE_SERVICE_ROLE_KEY`). A 64-hex secret is not brute-forceable, so the live risk is oracle + free Vault-decrypt CPU — but the revoke is zero-cost and zero-blast-radius. Artifact §C-4.

**A3-2 · search_path pinning: complete** `[live-verified]` — see §D.

**A3-3 · Two live functions have NO repo definition** `[NOTE][repo-inferred from hardening files]`
`update_flags_updated_at()` and `check_flag_creation_rate_limit()` are ALTERed/REVOKEd by `2026-05-29_function_search_path_hardening.sql:143` and `2026-06-01_function_exec_and_search_path_hardening.sql:54` but defined nowhere in the repo — SR-039 evidence: the repo cannot reproduce live by file replay.

### Class 4 — Trigger correctness beyond nulls
**A4-1 · NEW · status-history is doubly dead** `[MED][repo-inferred + live-corroborated]`
(i) `2026-05-30_trust_score_system.sql:138` `CREATE OR REPLACE`d `handle_flag_status_change` **without** the `insert into flag_status_history` block that `2026-05-24_status_history_table.sql:268-272` had added — applied later (`20260531`), so the live body (== `schema.sql:115-175`, pg_get_functiondef-verified 06-07) writes **no** status-change history. Corroboration: live `flag_status_history` = **18 rows** and live `flags` = **18 rows** ⇒ consistent with `handle_flag_insert_history` (AFTER INSERT, 1 row/flag) firing and **zero** transition rows, despite 27 `point_events`.
(ii) Even the creation rows are unreadable: `2026-05-24_status_history_table.sql:210` `revoke select on public.flag_status_history from anon, authenticated` while the client reads `flag_status_history_public` (`src/lib/statusHistory.ts:73`), a **`security_invoker = true`** view (`:226-230`) — invoker-mode views check base-table privileges as the *caller*, so `authenticated` gets 42501. `listStatusHistory` swallows every error → `[]` → `StatusHistoryModal.tsx:177-179` renders "No history yet / History not yet enabled" **forever**. Same pattern duplicated for `flag_edit_history` (`:173` + `:184-188`). Live-corroborating detail: the advisor's initplan list shows `flag_status_history ×1` = its `auth.email()` maintainer policy ⇒ that file **is** applied as written, revoke included. Artifact §C-9.

**A4-2 · Duplicate webhook triggers (never remediated)** `[MED][repo-inferred]`
`2026-06-01_flags_policy_consolidation.sql:69-72` records "two webhook triggers + two updated_at triggers" as an open follow-up. No repo file ever drops one; the live ledger carries a chunk `notify_flag_status_webhook_trigger` (20260529) with no repo counterpart. Predicted live effect: **two push notifications per status change** (pg_net trigger + dashboard DB-webhook trigger). The duplicate *points* trigger was fixed (`schema.sql:177-179`, dropped 2026-06-03) — the webhook pair apparently was not. Verification in §E.

**A4-3 · NEW · `flags owner edit open` carries the mis-correlated subquery that live-broke the triage policy** `[MED — latent; HIGH if flag-editing ever ships][live-verified existence + repo-inferred effect]`
`2026-05-25_flag_edit_rls_replacement.sql:131-135` (and the older `2026-05-25_flag_edit_rls.sql:37`, and the stale `schema.sql:351-358`) use `(select lat from public.flags where id = flags.id)`. Inside the subquery the FROM item is itself named `flags`, so `flags.id` binds to the **inner** relation ⇒ `where id = id` ⇒ all rows ⇒ SQLSTATE **21000** "more than one row returned by a subquery". This is precisely the failure the 06-01 session observed and fixed for the triage policy (`consolidation:26-27`). Live-verified that the policy exists (advisor: three permissive policies on authenticated UPDATE, this among them).
Why it has not broken production: `WITH CHECK` disjuncts are OR'd in **policy-name order** and short-circuit; this policy's leading conjunct `(select auth.uid()) = user_id` is FALSE for every non-owner, so the AND short-circuits before the broken subqueries. **It fires only for an owner UPDATEing their own row** — and the app has no owner-edit path (`updateFlag` does not exist; zero callers). Owner self-*triage* would hit it, so §E includes the probe. Artifact §C-10.

**A4-4 · Trigger sanity, audited clean:** reopen-reset is correctly `BEFORE` (it assigns NEW) and correctly narrowed with `OF status`; `handle_point_event_streak` is AFTER INSERT on `point_events` and **inserts into `point_events`** — recursion is correctly guarded by the `IF NEW.event_type = 'streak_bonus' THEN RETURN NEW` early-out (`trust_score:329`). The BEFORE-trigger name ordering assumed by `status_update_trigger_proposal:44` (`enforce_…` < `set_flag_updated_at`) holds alphabetically.

### Class 5 — Secrets (SR-018)
**A5-1 · At `512494a` the repo contains NO hardcoded webhook secret** `[repo-verified]`
The only live-verified webhook function body (`schema.sql:232-255`, 06-07) reads the secret from `vault.decrypted_secrets` and passes it in a header — clean. The documented exposure (`consolidation:65-68`) was in **two** trigger definitions, one of which is the **dashboard DB-webhook** (`supabase_functions.http_request`) whose secret lives in `pg_trigger.tgargs` — an object that has no repo file and that `authenticated` can read. Repo cannot prove the state either way; the consolidation follow-up ("rotate both + move to Vault") has **no corresponding remediation file**. So: `notify_flag_status_webhook` = FIXED; the dashboard webhook = **NOT-VERIFIED, presumed still exposed**. Fix shape: delete the dashboard webhook entirely (the pg_net trigger already does the job) rather than trying to hide a secret inside `tgargs`. Probe in §E.

### Class 6 — Grants / privileges
**A6-1** `verify_webhook_secret` — over-granted (A3-1, §C-4). **A6-2** `increment_reopen_request(uuid)` — `REVOKE … FROM public, anon` + `GRANT … TO authenticated` (`flag_reopen_requests:99-100`) ✔ intended, advisor-confirmed. **A6-3** `log_realtime_event(text,text)` — same shape (`d4_realtime:115-116`) ✔ intended and **in use** (`src/lib/realtimeLog.ts:26`; live table 67 rows). **A6-4** zero `GRANT ALL` anywhere in the repo (`0` hits). **A6-5** column-grant defence on `users` (`users_email_privacy:175-180`) is the only column-level grant; `email` unreachable to `authenticated`/`anon` ✔. **A6-6** storage: `INSERT` + `DELETE` policies scoped to `<uid>/` only; **no UPDATE policy** — safe because `src/lib/flags.ts:818` uploads with `upsert:false` (an upsert would silently 42501).

### Class 7 — Drift / dead objects (SR-039 evidence)
**A7-1** Dead tables (0 live rows, zero app writers): `flag_verifications`, `comment_votes`, `flag_edit_history`, `notification_preferences` (SR-020 — app reads AsyncStorage only). **A7-2** `2026-05-30_anon_flag_reporting_photo_fix.sql` carries a "PROPOSE-ONLY — DO NOT APPLY YET" header at `:6-8` but `consolidation:58-60` records a **stronger** version applied that same session (`user_id IS NULL AND photo_url IS NULL AND status='open'`) — the header lies and the repo file is a **subset** of live. `createAnonFlag` does send `status:'open'` (`flags.ts:1586`), so the client matches the live-only third guard. **A7-3** `2026-05-25_flag_edit_rls.sql` is an unheadered near-duplicate of `_replacement.sql` — replay hazard. **A7-4** live ledger chunk `restore_flags_auth_user_only_triage_unblock_20260601` has **no repo text anywhere** (grep: zero hits) — see §F-1. **A7-5** `schema.sql`'s flags-policy block (`:346-359`) and its comment at `:112` ("DECISION PENDING") are stale relative to live.

---

## §B Per-table RLS matrix

> **EPISTEMIC HEADER — read before using this table.** The repo is a **LOWER BOUND on live permissions**, never an upper bound. An un-versioned live policy, **`flags_user_scoped`**, exists on `public.flags` with **no repo definition anywhere** (grep: zero hits). Permissive policies are OR'd, so an un-versioned policy can only *widen* what is written here. The **`flags` row is CONTAMINATED**: every cell marked ⚠ may be wider live than shown, and the anon-INSERT hardening + the non-owner-DELETE closure could both be defeated by it. `UNKNOWN` cells are honest, not lazy. All row counts and `rls_enabled: true` are live-verified.

Legend: `A`=authenticated · `N`=anon · `—`=no policy (default-deny) · `†`=policy has no `TO` clause ⇒ role `public` (anon included) but the predicate NULL-denies anon.

| Table (live rows) | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| **flags** (18) ⚠CONTAMINATED | A `true` · **N `true`** · ⚠+`flags_user_scoped` UNKNOWN | A `uid=user_id` · **N** `user_id IS NULL ∧ photo_url IS NULL` **∧ status='open' (live-only)** · ⚠+UNKNOWN | A ×3 permissive: `owner edit open` (broken WITH CHECK, A4-3) ∨ `status update by any authenticated` **`USING(true) WITH CHECK(true)`** ∨ ⚠`flags_user_scoped` — column lock is trigger-only, holes per A2-1 | A own · A admin (`is_admin`) · ⚠`flags_user_scoped` **UNKNOWN — could re-open non-owner DELETE** |
| **users** (4) | A `true`, **column-granted** (id, display_name, avatar_url, points, created_at; `email` revoked) · N revoked | — (trigger `handle_new_user`) | A own row, `is_admin` frozen via `IS NOT DISTINCT FROM` | — (cascade from `auth.users`) |
| **feedback** (0) | own† · maintainer-email† | **† ⇒ anon ALLOWED** (`user_id IS NULL ∨ =uid`), unthrottled (A2-2) | — (append-only) | own† |
| **flag_comments** (0) | A `true` | A `user_id=uid` | — | A own only — **no admin delete (A2-3)** |
| **flag_photos** (0) | A `true` | A `url` must contain `/flag-photos/<uid>/` | A flag-owner — **NULL-collapse on anon flags** | A flag-owner — **NULL-collapse on anon flags** |
| **point_events** (27) | A own | — (DEFINER triggers) | — | — |
| **flag_status_history** (18) | A maintainer · A `true` — **but base-table SELECT REVOKED ⇒ invoker view unreadable (A4-1)** | A `WITH CHECK(false)`; DEFINER trigger writes | — | — |
| **flag_edit_history** (0) | same shape, same defect | A flag-owner (NULL-collapse, A1-6) | — | — |
| **push_tokens** (2) | own† | own† | own† | own† (4 initplan warnings live ⇒ exactly one policy set is live, not two) |
| **notification_preferences** (0) | A own | A own | A own | — (deliberate) |
| **realtime_subscribe_log** (67) | — (service_role) | A `uid=user_id` | — | — |
| **flag_verifications** (0, DEAD) | A own votes only | A own ∧ **`<>` NULL-collapse (SR-009)** | — | — |
| **comment_votes** (0, DEAD) | A own votes only | A own | — | A own |
| *storage.objects (flag-photos)* | — (bucket public; deliberate, `schema.sql:428-431`) | A `<uid>/` prefix | **— (none; safe only because `upsert:false`)** | A `<uid>/` prefix |

---

## §C Artifacts

### C-1 · SR-008 — DEFER to the fork brief; this is the only thing it does not say
**No competing artifact.** Apply the fork-briefs OA migration verbatim (`design-reviews/fork-briefs/2026-07-16_AccessMap_Fork_Decision_Briefs.md`, "F2 · Build-ready spec — OA", the `2026-07-16_fork2_actor_guard_null_safe_PROPOSED.sql` block ≈ §657-809). Additions only:
1. **There is exactly ONE live object** (`public.handle_flag_status_change()`), not three. `trust_score_system.sql:186-188` is the applied truth (`20260531`); `schema.sql:163-165` is a doc mirror; `status_history_table.sql:289-291` is a **superseded historical snapshot** (old 5/2/10/5 + a history INSERT the live body lacks) — do **not** "fix" it, and do **not** replay that file: doing so would silently roll points back to 5/2/10/5.
2. **OA's body must be reconciled with A4-1 before Sky applies it.** OA's body (correctly copied from the live catalog) also omits the history INSERT. If Sky wants status history to work, the six lines in §C-9(ii) must be folded into whichever body is applied — one `CREATE OR REPLACE`, never two competing ones.
3. Post-apply, `schema.sql:163-165` and `:112` need the doc update OA's checklist already lists.

### C-2 · SR-009 — `flag_verifications` (SKY-DECISION: fix or drop)
**Can another permissive INSERT policy rescue it?** Reasoning, stated explicitly: permissive INSERT policies are OR'd, so a second policy *would* rescue it. Evidence that none exists: (a) the repo defines exactly one INSERT policy on this table; (b) the live advisor's `auth_rls_initplan` list enumerates `flag_photos ×2, push_tokens ×4, notification_preferences ×3, flag_status_history ×1, flag_comments ×2, flags(flags_user_scoped)` and **never names `flag_verifications`** — consistent with its two policies already using `(SELECT auth.uid())` wrappers, and inconsistent with an extra unwrapped policy existing; (c) no `multiple_permissive_policies` warning was raised for it; (d) 0 rows live. **Conclusion: the denial holds — but this is inference from advisor *absence*, so §E's `pg_policies` read is the proof.** Given the contamination precedent on `flags`, do not treat (b)+(c) as conclusive.

```sql
-- ============================================================================
-- FILE:   2026-07-26_sr009_flag_verifications_null_safe_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   OPTION 1 of 2. Makes the anti-self-attestation guard NULL-safe so a
--         signed-in user can attest an ANONYMOUS flag. Pairs with Fork-2/OA:
--         same `IS DISTINCT FROM` pattern, same anon-participation posture.
--         Choose OPTION 2 instead if the table stays dead code.
-- ============================================================================
drop policy if exists "flag_verifications own insert" on public.flag_verifications;
create policy "flag_verifications own insert"
  on public.flag_verifications for insert
  to authenticated
  with check (
    (select auth.uid()) = verifier_id
    -- NULL-safe: TRUE when the flag is anonymous (user_id IS NULL); still
    -- FALSE when you are attesting your own accountable flag.
    and verifier_id is distinct from (
      select f.user_id from public.flags f where f.id = flag_verifications.flag_id
    )
  );
```
```sql
-- ROLLBACK (restores the NULL-collapsing guard exactly as shipped)
drop policy if exists "flag_verifications own insert" on public.flag_verifications;
create policy "flag_verifications own insert"
  on public.flag_verifications for insert
  to authenticated
  with check (
    (select auth.uid()) = verifier_id
    AND verifier_id <> (SELECT user_id FROM public.flags WHERE id = flag_id)
  );
```
```sql
-- VERIFY (read-only): expect one row whose with_check contains 'IS DISTINCT FROM'
select polname, pg_get_expr(polwithcheck, polrelid) as with_check
  from pg_policy where polrelid = 'public.flag_verifications'::regclass;
```
**OPTION 2 — drop the dead table** (`drop table if exists public.flag_verifications;` — rollback = re-run `trust_score_system.sql:49-76`; verify `select to_regclass('public.flag_verifications');` → NULL). Recommended if trust-scoring is not on the roadmap: it deletes an un-exercised RLS surface before review rather than fixing one. **SKY-DECISION.**

### C-3 · SR-024 — `flag_photos` anon-flag collapse (make it a decision, not an accident)
```sql
-- ============================================================================
-- FILE:   2026-07-26_sr024_flag_photos_anon_explicit_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   Behaviour-PRESERVING. Today anon-flag photo DELETE/UPDATE are denied
--         only because `NULL = auth.uid()` is NULL. This rewrites the same
--         outcome as an EXPLICIT rule + comments, so a future null-safety pass
--         cannot silently widen it. Zero behaviour change — deliberately.
-- ============================================================================
drop policy if exists "flag_photos: flag owner delete" on public.flag_photos;
create policy "flag_photos: flag owner delete"
  on public.flag_photos for delete
  to authenticated
  using (
    exists (                       -- explicit: an anonymous flag has NO curator,
      select 1 from public.flags f -- so nobody may curate its photo set.
       where f.id = flag_photos.flag_id
         and f.user_id is not null
         and f.user_id = (select auth.uid())
    )
  );

drop policy if exists "flag_photos: flag owner update" on public.flag_photos;
create policy "flag_photos: flag owner update"
  on public.flag_photos for update
  to authenticated
  using (
    exists (select 1 from public.flags f
             where f.id = flag_photos.flag_id
               and f.user_id is not null and f.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.flags f
             where f.id = flag_photos.flag_id
               and f.user_id is not null and f.user_id = (select auth.uid()))
  );

comment on table public.flag_photos is
  'Community evidence photos. RATIFIED 2026-07-XX (Sky): photos on ANONYMOUS '
  'flags are permanently un-curatable — no owner exists to curate them. '
  'Admin/service_role cleanup only. (SR-024)';
```
```sql
-- ROLLBACK — restore the original owner policies verbatim
drop policy if exists "flag_photos: flag owner delete" on public.flag_photos;
create policy "flag_photos: flag owner delete" on public.flag_photos for delete
  to authenticated using ((SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid());
drop policy if exists "flag_photos: flag owner update" on public.flag_photos;
create policy "flag_photos: flag owner update" on public.flag_photos for update
  to authenticated using ((SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid())
  with check ((SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid());
```
```sql
-- VERIFY (read-only): 2 rows, both quals mentioning 'user_id IS NOT NULL'
select polname, pg_get_expr(polqual, polrelid) from pg_policy
 where polrelid='public.flag_photos'::regclass and polcmd in ('d','w');
```
**Side benefit:** this also clears the two live `auth_rls_initplan` warnings on `flag_photos` (bare `auth.uid()` → `(select auth.uid())`).

### C-4 · SR-018 — revoke the `verify_webhook_secret` oracle
```sql
-- ============================================================================
-- FILE:   2026-07-26_sr018_verify_webhook_secret_revoke_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   Removes anon+authenticated EXECUTE on a SECURITY DEFINER boolean
--         oracle over vault.decrypted_secrets (live advisor WARN).
-- BLAST RADIUS: NONE. The only caller is the notify-flag-status Edge Function,
--   which posts with SUPABASE_SERVICE_ROLE_KEY (functions/notify-flag-status/
--   index.ts isAuthorized()); service_role is unaffected by this revoke.
-- ============================================================================
revoke execute on function public.verify_webhook_secret(text) from anon, authenticated, public;
```
```sql
-- ROLLBACK
grant execute on function public.verify_webhook_secret(text) to anon, authenticated;
```
```sql
-- VERIFY (read-only): expect NO 'anon=X' and NO 'authenticated=X' in proacl
select proname, proacl from pg_proc
 where proname = 'verify_webhook_secret' and pronamespace = 'public'::regnamespace;
```
**Companion (SKY-SIDE, no SQL):** rotate the webhook secret in Vault + redeploy the function, and **delete the dashboard DB-webhook** (see §E probe 5) so the `tgargs`-embedded copy stops existing. Also enable Auth → **leaked-password protection** (live advisor WARN, dashboard toggle).

### C-5 · SR-007 — server-side anon throttle **[SKY-DECISION]**
**Option (a) — global sliding-window cap on anon inserts, enforced in the existing trigger.** Pros: pure SQL, one file, no new infra, cannot be cleared by the client, works for every future anon client. Cons: it is a *global* cap, so one abuser can lock out all guests (a "reporting is paused" DoS) — mitigated by setting the cap generously and by the fact that guests can always sign in.
**Option (b) — per-IP via `current_setting('request.headers')::json->>'x-forwarded-for'`.** ⚠ **NOT-VERIFIED**: I could not confirm from the repo or from first-hand knowledge that PostgREST populates `request.headers` (and specifically `x-forwarded-for`) as a GUC visible to a trigger on this project's Postgres/PostgREST versions, nor that the value is trustworthy behind Supabase's edge proxy. Both are prerequisites; **do not ship (b) on my say-so.** If Sky wants it, the prerequisite is a 1-line live probe (`select current_setting('request.headers', true);` from a PostgREST call) — until that returns headers, (b) is undesignable.
**Option (c) — move anon inserts behind an Edge Function with rate limiting.** Strongest (real IP, captcha-ready, per-IP quotas), but it is new infra, a new deploy surface, a client change on the guest path, and it moves the anon INSERT policy from `anon` to `service_role` — a bigger change than this train should carry pre-submission.

**RECOMMENDED: (a).** Full artifact:
```sql
-- ============================================================================
-- FILE:   2026-07-26_sr007_anon_flag_throttle_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   Closes SR-007. `check_flag_rate_limit` counts `user_id = auth.uid()`,
--         which is NULL=NULL (never TRUE) for the anon cohort, so anonymous
--         reporting has NO server-side cap at all — only the clearable
--         AsyncStorage 5/24h in src/lib/anonRateLimit.ts.
--   This CREATE OR REPLACE keeps the existing 20/24h per-user rule byte-for-byte
--   and ADDS a global sliding-window cap on anonymous inserts.
--   NO trigger DDL — `enforce_flag_rate_limit` already exists and stays.
-- TUNING: ANON_CAP/window are PROPOSED values — Sky tunes. Today's live corpus
--   is 18 flags total, so 60/hour is ~3x the app's entire lifetime volume.
-- ============================================================================
create or replace function public.check_flag_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  flag_count integer;
  rate_limit integer := 20;   -- per signed-in user / 24h  (UNCHANGED)
  anon_cap   integer := 60;   -- global anonymous inserts / 1h  (NEW — tune me)
begin
  if auth.uid() is null then
    -- Anonymous path. Counts rows, not identities: anon flags store no user_id
    -- by design (Jordan posture), so a global window is the only honest cap.
    select count(*) into flag_count
      from public.flags
     where user_id is null
       and created_at > now() - interval '1 hour';

    if flag_count >= anon_cap then
      raise exception
        'Anonymous reporting is temporarily paused. Please sign in, or try again later.'
        using errcode = 'P0001';
    end if;

    return new;
  end if;

  select count(*) into flag_count
    from public.flags
   where user_id = auth.uid()
     and created_at > now() - interval '24 hours';

  if flag_count >= rate_limit then
    raise exception 'Rate limit exceeded: maximum % flags per 24 hours', rate_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_flag_rate_limit() from public, anon, authenticated;
```
```sql
-- ROLLBACK — restore the shipped body verbatim (2026-05-30_flag_creation_rate_limit.sql)
create or replace function public.check_flag_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare flag_count integer; rate_limit integer := 20;
begin
  select count(*) into flag_count from public.flags
   where user_id = auth.uid() and created_at > now() - interval '24 hours';
  if flag_count >= rate_limit then
    raise exception 'Rate limit exceeded: maximum % flags per 24 hours', rate_limit
      using errcode = 'P0001';
  end if;
  return new;
end; $$;
revoke execute on function public.check_flag_rate_limit() from public, anon, authenticated;
```
```sql
-- VERIFY (read-only): headroom against the cap right now — expect a small number
select count(*) as anon_flags_last_hour
  from public.flags where user_id is null and created_at > now() - interval '1 hour';
```
⚠ **Apply-order note:** if `check_flag_creation_rate_limit()` (live-only, A3-3) is a second BEFORE-INSERT trigger on `flags`, this file only fixes one of the two. §E probe 4 settles it.

### C-6 · A2-1 — close the `context_tags` hole in the non-owner column lock
```sql
-- ============================================================================
-- FILE:   2026-07-26_nonowner_revert_context_tags_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   Executes follow-up #3 from 2026-06-01_flags_policy_consolidation.sql
--         (:73-75), never done. Since that session the live triage policy is
--         USING(true)/WITH CHECK(true), so THIS TRIGGER is the ONLY column lock
--         on public.flags. Its revert list omits context_tags => any signed-in
--         user can rewrite any flag's context/disability tags (MapScreen filter).
-- DELIBERATELY NOT REVERTED: status (the point of triage), updated_at (honest
--   touch stamp), reopen_requests + reopen_requests_reset_at (the reopen RPC
--   and reset trigger own them).
-- ⚠ DO NOT "harden" the auth.uid() IS NULL early-out: the delete-account Edge
--   Function anonymises flags as service_role (auth.uid() IS NULL) and MUST NOT
--   be reverted. That NULL branch is load-bearing (SR-010).
-- ============================================================================
create or replace function public.enforce_flag_status_only_for_non_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  new.id           := old.id;            -- NEW: PK immutable
  new.user_id      := old.user_id;
  new.lat          := old.lat;
  new.lng          := old.lng;
  new.category     := old.category;
  new.severity     := old.severity;
  new.description  := old.description;
  new.photo_url    := old.photo_url;
  new.created_at   := old.created_at;
  new.context_tags := old.context_tags;  -- NEW: closes the tag-pollution hole
  return new;
end;
$$;

revoke execute on function public.enforce_flag_status_only_for_non_owner()
  from public, anon, authenticated;
```
```sql
-- ROLLBACK — drop the two new lines (restores the pre-fix revert list)
create or replace function public.enforce_flag_status_only_for_non_owner()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then return new; end if;
  new.user_id := old.user_id; new.lat := old.lat; new.lng := old.lng;
  new.category := old.category; new.severity := old.severity;
  new.description := old.description; new.photo_url := old.photo_url;
  new.created_at := old.created_at;
  return new;
end; $$;
revoke execute on function public.enforce_flag_status_only_for_non_owner()
  from public, anon, authenticated;
```
```sql
-- VERIFY (read-only): expect the body to contain both new assignments
select prosrc like '%new.context_tags := old.context_tags%' as tags_locked,
       prosrc like '%new.id           := old.id%' or prosrc like '%new.id := old.id%' as pk_locked
  from pg_proc where proname = 'enforce_flag_status_only_for_non_owner';
```
**Structural note (not in this artifact):** allow-by-omission means every future column is writable by any authenticated user until someone remembers this function. The durable fix is a deny-by-default rewrite (`new := old; new.status := …`) or reinstating explicit column pinning in the policy — larger change, worth a fork.

### C-7 · A2-2 — throttle the anon `feedback` write surface
```sql
-- ============================================================================
-- FILE:   2026-07-26_feedback_anon_throttle_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   public.feedback accepts UNAUTHENTICATED inserts (the policy has no
--         TO clause => role `public`) with no cap. Reachable from the global
--         header on every screen for guests (FeedbackModal -> feedbackStore).
--         Adds a global sliding-window cap for anonymous rows only. Signed-in
--         feedback is untouched. Client is unaffected: submitFeedback() already
--         swallows insert errors and the mailto: path remains authoritative.
-- ============================================================================
create or replace function public.check_feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent   integer;
  anon_cap integer := 30;   -- anonymous feedback rows / 1h, global (tune me)
begin
  if new.user_id is not null then
    return new;
  end if;

  select count(*) into recent
    from public.feedback
   where user_id is null
     and created_at > now() - interval '1 hour';

  if recent >= anon_cap then
    raise exception 'Feedback is temporarily rate-limited. Please try again later.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_feedback_rate_limit() from public, anon, authenticated;

drop trigger if exists enforce_feedback_rate_limit on public.feedback;
create trigger enforce_feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.check_feedback_rate_limit();
```
```sql
-- ROLLBACK
drop trigger  if exists enforce_feedback_rate_limit on public.feedback;
drop function if exists public.check_feedback_rate_limit();
```
```sql
-- VERIFY (read-only): expect 1 row, tgenabled='O'
select tgname, tgenabled from pg_trigger
 where tgrelid = 'public.feedback'::regclass and not tgisinternal;
```

### C-8 · SR-001 (RLS half) — admin delete on comments
```sql
-- ============================================================================
-- FILE:   2026-07-26_sr001_admin_delete_comment_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   flag_comments has delete-own only; there is no admin counterpart to
--         "admin delete any flag". Admins cannot take down an abusive comment
--         through the app's role model at all. Mirrors 2026-05-30_admin_role.sql
--         exactly (same is_admin subselect shape).
-- NOTE:   This is the DB half only. The UGC-moderation product decision
--         (report-content, block/mute, ToS) is Fork 5 / W1 — ROUTED, not here.
-- ============================================================================
drop policy if exists "admin delete any comment" on public.flag_comments;
create policy "admin delete any comment"
  on public.flag_comments for delete
  to authenticated
  using (
    (select is_admin from public.users where id = (select auth.uid()))
  );
```
```sql
-- ROLLBACK
drop policy if exists "admin delete any comment" on public.flag_comments;
```
```sql
-- VERIFY (read-only): expect 2 DELETE policies on flag_comments
select polname from pg_policy
 where polrelid='public.flag_comments'::regclass and polcmd='d';
```

### C-9 · A4-1 — revive status history (two independent halves)
**(i) Grant fix — makes the existing 18 creation rows readable. Safe, standalone.**
```sql
-- ============================================================================
-- FILE:   2026-07-26_status_history_view_grant_fix_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   flag_status_history_public / flag_edit_history_public are
--         security_invoker views, so base-table privileges are checked as the
--         CALLER — but the migrations REVOKE SELECT on the base tables from
--         `authenticated`. Result: the views 42501 for every client, and
--         listStatusHistory() swallows it into a permanent empty state.
--   Fix: grant SELECT on the NON-PRIVATE COLUMNS only. `user_id` stays
--   ungranted, so Jordan privacy condition #1 is preserved BY THE GRANT, which
--   is a stronger boundary than the view's column list alone.
-- ============================================================================
grant select (id, flag_id, from_status, to_status, created_at)
  on public.flag_status_history to authenticated;

grant select (id, flag_id, changed_fields, old_values, new_values, created_at)
  on public.flag_edit_history to authenticated;
-- anon deliberately gets nothing (history is a signed-in surface).
```
```sql
-- ROLLBACK (restores the current, view-breaking state)
revoke select on public.flag_status_history from authenticated;
revoke select on public.flag_edit_history   from authenticated;
```
```sql
-- VERIFY (read-only): expect the 5 granted columns and NO row for 'user_id'
select table_name, column_name from information_schema.column_privileges
 where grantee='authenticated' and table_name in
       ('flag_status_history','flag_edit_history') order by 1,2;
```
**(ii) The missing history INSERT — fold into ONE body, do not apply separately.** The live `handle_flag_status_change` lost this block when `trust_score_system` replaced the `status_history` version. Insert these six lines immediately after the `IF NEW.status IS NULL OR NEW.status = OLD.status THEN RETURN NEW; END IF;` guard **of whichever body Sky applies** (current live body, or the Fork-2/OA body):
```sql
  -- Audit row first, so the history is faithful even if a later statement raises.
  insert into public.flag_status_history (flag_id, user_id, from_status, to_status)
  values (new.id, auth.uid(), old.status, new.status);
```
Verification after apply: `select count(*) from public.flag_status_history where from_status is not null;` → must become non-zero after the next triage (today: expected 0).

### C-10 · A4-3 — de-fuse the mis-correlated owner-edit policy
```sql
-- ============================================================================
-- FILE:   2026-07-26_owner_edit_subquery_alias_fix_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   In `(select lat from public.flags where id = flags.id)` the inner FROM
--         item is ALSO named `flags`, so `flags.id` binds to the INNER relation:
--         the WHERE is `id = id`, the subquery returns every row, and evaluation
--         raises SQLSTATE 21000 "more than one row returned by a subquery".
--         This is the exact bug that live-broke the triage policy on 2026-06-01.
--         It survives in "flags owner edit open" and fires ONLY for an owner
--         UPDATEing their own row (the leading ownership conjunct short-circuits
--         it away for everyone else). Fix = alias the inner relation.
-- ============================================================================
drop policy if exists "flags owner edit open" on public.flags;
create policy "flags owner edit open"
  on public.flags for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
  )
  with check (
    (select auth.uid()) = user_id
    and lat        = (select f.lat        from public.flags f where f.id = flags.id)
    and lng        = (select f.lng        from public.flags f where f.id = flags.id)
    and user_id    = (select f.user_id    from public.flags f where f.id = flags.id)
    and created_at = (select f.created_at from public.flags f where f.id = flags.id)
    and status     = (select f.status     from public.flags f where f.id = flags.id)
  );
```
```sql
-- ROLLBACK — restore the shipped (broken) policy verbatim
drop policy if exists "flags owner edit open" on public.flags;
create policy "flags owner edit open" on public.flags for update to authenticated
  using ((select auth.uid()) = user_id and status = 'open')
  with check ((select auth.uid()) = user_id
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id));
```
```sql
-- VERIFY — behavioural, rolled-back probe. BEFORE the fix this raises 21000;
-- AFTER it, it returns 1 row updated. Everything rolls back.
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims to '{"sub":"<YOUR-UUID>","role":"authenticated"}';
--   update public.flags set description = description
--    where user_id = '<YOUR-UUID>'::uuid and status = 'open';
--   rollback;
```
**Cheaper alternative (SKY-DECISION):** since no owner-edit UI exists (`updateFlag` is absent), `drop policy if exists "flags owner edit open" on public.flags;` removes the landmine outright — owners keep full function via the permissive triage policy. Re-create it (fixed) on the day the edit feature ships.

### C-11 · Consolidated `auth_rls_initplan` rewrite (perf; clears the live advisor warnings)
```sql
-- ============================================================================
-- FILE:   2026-07-26_rls_initplan_consolidated_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   Wraps every remaining bare auth.uid() in (select auth.uid()) so the
--         planner evaluates it ONCE per statement instead of once per row.
--         SEMANTICS ARE IDENTICAL — pure perf. Covers the live advisor's
--         auth_rls_initplan set EXCEPT flag_photos (in C-3) and flags_user_scoped
--         (un-versioned — see §F-1: do not touch until its body is known).
-- ============================================================================
-- push_tokens ×4
drop policy if exists "push_tokens: owner select" on public.push_tokens;
drop policy if exists "push_tokens owner select"  on public.push_tokens;
create policy "push_tokens owner select" on public.push_tokens for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "push_tokens: owner insert" on public.push_tokens;
drop policy if exists "push_tokens owner insert"  on public.push_tokens;
create policy "push_tokens owner insert" on public.push_tokens for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "push_tokens: owner update" on public.push_tokens;
drop policy if exists "push_tokens owner update"  on public.push_tokens;
create policy "push_tokens owner update" on public.push_tokens for update
  to authenticated using ((select auth.uid()) = user_id)
                    with check ((select auth.uid()) = user_id);
drop policy if exists "push_tokens: owner delete" on public.push_tokens;
drop policy if exists "push_tokens owner delete"  on public.push_tokens;
create policy "push_tokens owner delete" on public.push_tokens for delete
  to authenticated using ((select auth.uid()) = user_id);

-- notification_preferences ×3
drop policy if exists "Users can read their own notification preferences"
  on public.notification_preferences;
create policy "Users can read their own notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Users can upsert their own notification preferences"
  on public.notification_preferences;
create policy "Users can upsert their own notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Users can update their own notification preferences"
  on public.notification_preferences;
create policy "Users can update their own notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- flag_comments ×2
drop policy if exists "flag_comments: own insert" on public.flag_comments;
create policy "flag_comments: own insert" on public.flag_comments for insert
  to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "flag_comments: own delete" on public.flag_comments;
create policy "flag_comments: own delete" on public.flag_comments for delete
  to authenticated using (user_id = (select auth.uid()));

-- flag_status_history ×1 (the maintainer policy's unwrapped auth.email())
drop policy if exists "flag_status_history readable by maintainer"
  on public.flag_status_history;
create policy "flag_status_history readable by maintainer"
  on public.flag_status_history for select to authenticated
  using ((select auth.email()) = 'skylerhalisky@gmail.com');
```
```sql
-- ROLLBACK: re-run the ORIGINAL policy bodies from, in order,
--   2026-05-25_push_tokens.sql:15-29
--   2026-05-25_notification_preferences_proposal.sql:44-66
--   2026-05-30_flag_comments.sql:24-35
--   2026-05-24_status_history_table.sql:177-180
-- (each is a drop-if-exists + create; no data is touched by either direction)
```
```sql
-- VERIFY (read-only): expect ZERO rows — no bare auth.uid()/auth.email() left
select polrelid::regclass as tbl, polname from pg_policy
 where (pg_get_expr(polqual,polrelid)      ~ '(^|[^.(])auth\.(uid|email)\(\)'
     or pg_get_expr(polwithcheck,polrelid) ~ '(^|[^.(])auth\.(uid|email)\(\)')
 order by 1,2;
```
⚠ **Naming caution:** the two `push_tokens` naming variants both appear in the repo; the live advisor reports exactly **4** initplan warnings for that table, so only one set is live. The artifact drops **both** spellings before creating, so it converges regardless of which is live.

---

### C-12 · SR-050 (Storage half) — admin delete on flag photos

**Written 2026-07-28, Run 2 (§SKY-6). The CLIENT half shipped in the same run; this is the other half.**
`deleteFlag` now derives each photo's Storage path and calls `removeUploadedFlagPhotos` before deleting the
row — which works for the flag's OWNER, because `flag-photos owner delete` permits it. It does **not** work
for an ADMIN taking down someone else's flag: the same policy denies it, the row goes, and the photo stays
publicly fetchable. **A takedown that leaves the reported photo up is not a takedown**, so Apple 1.2(b)
cannot be reported closed until this is applied.

This is Option A from `11_SR050_TAKEDOWN_GAP.md` — the narrow, synchronous one. Option B (a server-side
sweep shareable with R-1) remains the alternative and is NOT written here; picking A does not foreclose it.

⚠ **Jordan review before applying.** This widens delete authority over user-uploaded content — the same
class of change as the admin comment-delete in C-8, and it should get the same look.

```sql
-- ============================================================================
-- FILE:   2026-07-28_sr050_admin_delete_flag_photo_PROPOSED.sql
-- STATUS: PROPOSED — *** SKY APPLIES. NEVER AUTO-RUN. ***
-- WHAT:   storage.objects on the flag-photos bucket has ONE delete policy and
--         it is owner-only ((storage.foldername(name))[1] = auth.uid()::text),
--         so an admin can delete the flags ROW but never the photo it points
--         at. The blob stays publicly fetchable forever at a URL any prior
--         viewer still holds. This adds the admin counterpart, mirroring
--         "admin delete any flag" and C-8's "admin delete any comment" exactly
--         (same is_admin subselect shape, same additive-policy pattern).
-- NOTE:   ADDITIVE. Postgres ORs permissive policies, so the owner policy is
--         untouched and owners keep deleting their own photos exactly as
--         before. Scoped to bucket_id = 'flag-photos' — avatars are a
--         different bucket and a different decision (R-1). The CLIENT half is
--         already shipped and needs no change: the same deleteFlag call starts
--         succeeding for admins the moment this lands.
-- ============================================================================
drop policy if exists "flag-photos admin delete" on storage.objects;
create policy "flag-photos admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (select is_admin from public.users where id = (select auth.uid()))
  );
```
```sql
-- ROLLBACK
drop policy if exists "flag-photos admin delete" on storage.objects;
```
```sql
-- VERIFY (read-only): expect 2 DELETE policies on storage.objects for this
-- bucket — the existing owner one, plus this. Neither should be missing.
select polname from pg_policy
 where polrelid = 'storage.objects'::regclass
   and polcmd = 'd'
   and polname in ('flag-photos owner delete', 'flag-photos admin delete')
 order by polname;
```
```sql
-- PRE-STATE PROBE (read-only, run BEFORE applying so the delta is on the
-- record rather than assumed): expect exactly one row, the owner policy.
select polname, pg_get_expr(polqual, polrelid) as using_expr
  from pg_policy
 where polrelid = 'storage.objects'::regclass
   and polcmd = 'd'
   and pg_get_expr(polqual, polrelid) like '%flag-photos%';
```


## §D CHECKS-PASSED

- **DEFINER `search_path` pinning — 16/16 repo-defined DEFINER functions pin `search_path`.** VERIFIED (`handle_new_user`, `handle_flag_status_change` ×3, `handle_flag_reopen_reset` ×2, `handle_flag_insert_history`, `handle_flag_submitted`, `handle_flag_photo_added`, `handle_comment_added`, `handle_comment_vote_added`, `handle_point_event_streak`, `log_realtime_event`, `check_flag_rate_limit`, `increment_reopen_request` ×2, `verify_webhook_secret` ×2, `notify_flag_status_webhook`, + the 2 PROPOSED). **live-verified**: the live advisor reports **zero** `0011_function_search_path_mutable` warnings across all 6 WARNs ⇒ the 2 INVOKER trigger functions and the 2 repo-less live functions are pinned too — i.e. `2026-05-29_function_search_path_hardening.sql` and `2026-06-01_function_exec_…` **were applied** despite their PROPOSE-ONLY headers (a second header-lies instance, cf. A7-2).
- **Trigger-function RPC lockdown — 14/14 trigger functions carry `REVOKE EXECUTE … FROM public, anon, authenticated`.** VERIFIED; the live advisor's `security_definer_function_executable` set is down to exactly the 3 by-design RPCs (`verify_webhook_secret` ← C-4 removes it, `increment_reopen_request` ✔, `log_realtime_event` ✔).
- **`GRANT ALL` — 0 occurrences repo-wide.** VERIFIED.
- **RLS enabled — 13/13 live tables `rls_enabled: true`.** live-verified; every repo `create table` has a matching `enable row level security`.
- **Trigger recursion — 1/1 self-writing trigger guarded.** `handle_point_event_streak` inserts into its own table and early-returns on `event_type='streak_bonus'`. VERIFIED.
- **BEFORE/AFTER correctness — 11/11 triggers.** Every trigger that assigns `NEW.*` is `BEFORE` (`set_flag_updated_at`, `handle_push_token_updated_at`, `handle_flag_reopen_reset`, `enforce_flag_status_only_for_non_owner`, `check_flag_rate_limit`); every side-effect-only trigger is `AFTER`. `WHEN` guards are unused but the `OF status` column lists are correct on all four status triggers.
- **NULL-safe comparison sites — 86/93 clean.** The 7 defects are A1-1…A1-7; the remaining 86 either compare NOT-NULL columns, handle NULL explicitly (`IS NULL` / `IS NOT DISTINCT FROM` — the codebase already uses the right idiom at `admin_role.sql:41`), or collapse in the **deny** direction, which is the safe direction.
- **Secrets in repo SQL — 0 hardcoded secrets at `512494a`.** VERIFIED by grep + by the live-verified webhook body reading Vault.
- **Storage policy/code agreement — 1/1.** No `storage.objects` UPDATE policy and `upsert:false` at `flags.ts:818`: consistent.
- **`increment_reopen_request` grants — anon correctly revoked.** VERIFIED (repo + advisor).

---

## §E SKY-SIDE read-only verification block (all 13 tables + the open questions)

Paste into Supabase → SQL Editor → Run. **Every statement is read-only. Nothing is modified.**

```sql
-- ===== 1. THE COMPLETE LIVE POLICY SET — the ground truth this sweep lacks ====
select c.relname                                as table_name,
       p.polname                                as policy_name,
       case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                     when 'w' then 'UPDATE' when 'd' then 'DELETE'
                     when '*' then 'ALL' end    as command,
       p.polpermissive                          as permissive,
       coalesce(array_agg(r.rolname order by r.rolname)
                filter (where r.rolname is not null), '{PUBLIC}') as roles,
       pg_get_expr(p.polqual,      p.polrelid)  as using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid)  as with_check_expr
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  left join lateral unnest(p.polroles) pr(oid) on true
  left join pg_roles r on r.oid = pr.oid and pr.oid <> 0
 where c.relnamespace = 'public'::regnamespace
 group by 1,2,3,4,6,7
 order by 1, 3, 2;
-- READ IT FOR: (a) the FULL body of `flags_user_scoped` — the un-versioned
--   policy that makes the repo a lower bound. If its command is ALL and its
--   qual is `auth.uid() IS NOT NULL`, it is the resurrected `flags_auth_user_only`
--   and NON-OWNER DELETE OF ANY FLAG IS OPEN (see §F-1) => treat as CRITICAL.
-- (b) whether `flags anon insert` carries the third guard status='open'.
-- (c) whether any policy exists on flag_verifications beyond the two in-repo
--   (the C-2 rescue question).
-- (d) any policy with no TO clause (roles = {PUBLIC}) => anon-reachable.

-- ===== 2. RLS + FORCE-RLS posture, all tables ================================
select relname, relrowsecurity as rls_enabled, relforcerowsecurity as force_rls
  from pg_class where relnamespace='public'::regnamespace and relkind='r'
 order by 1;

-- ===== 3. EVERY function: definer?, search_path pinned?, who can EXECUTE? ====
select p.proname, p.prosecdef as security_definer, p.proconfig as settings,
       pg_get_userbyid(p.proowner) as owner, p.proacl as grants
  from pg_proc p where p.pronamespace='public'::regnamespace order by 1;
-- EXPECT: no NULL proconfig; no 'anon=X' / 'authenticated=X' except
--   increment_reopen_request, log_realtime_event (and verify_webhook_secret
--   until C-4 is applied).

-- ===== 4. EVERY trigger on public tables — duplicates + secrets in tgargs ====
select c.relname as table_name, t.tgname, p.proname as function,
       t.tgtype, pg_get_triggerdef(t.oid) as definition
  from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_proc p on p.oid=t.tgfoid
 where not t.tgisinternal and c.relnamespace='public'::regnamespace
 order by 1,2;
-- READ IT FOR: (a) TWO webhook triggers on flags? (A4-2 => double push notifs)
-- (b) a SECOND BEFORE-INSERT rate-limit trigger (check_flag_creation_rate_limit)
--     that C-5 would not cover.
-- (c) *** ANY LITERAL SECRET inside a definition (supabase_functions.http_request
--     args) *** — SR-018. If present: rotate the secret AND delete that trigger.
-- (d) TWO updated_at triggers (harmless, both set now()).

-- ===== 5. Column-level grants (users.email + the history tables) =============
select table_name, grantee, column_name, privilege_type
  from information_schema.column_privileges
 where table_schema='public' and grantee in ('anon','authenticated')
 order by 1,2,3;
-- EXPECT: users has NO 'email' row. flag_status_history / flag_edit_history
--   have NO rows at all today => that is the A4-1 view breakage.

-- ===== 6. Table-level grants — what anon can touch at all ====================
select table_name, privilege_type from information_schema.role_table_grants
 where table_schema='public' and grantee='anon' order by 1,2;

-- ===== 7. Publication membership (realtime payload columns) ==================
select pubname, schemaname, tablename, attnames
  from pg_publication_tables where pubname='supabase_realtime' order by 3;
-- EXPECT flags => {id,status} ONLY (D4 Option-2). Anything wider is a leak.

-- ===== 8. Live evidence for the A4-1 status-history death =====================
select (select count(*) from public.flags)                                as flags,
       (select count(*) from public.flag_status_history)                  as history_rows,
       (select count(*) from public.flag_status_history
         where from_status is not null)                                   as transition_rows;
-- PREDICTION: transition_rows = 0 (the live status-change function lost its
--   history INSERT). Non-zero would falsify A4-1(i) — report it.

-- ===== 9. Applied-migration order — settles the flags_user_scoped question ===
select version, name from supabase_migrations.schema_migrations
 where name ilike '%flags%' or name ilike '%triage%' or name ilike '%auth_user_only%'
 order by version;
-- READ IT FOR: is `restore_flags_auth_user_only_triage_unblock_20260601` BEFORE
--   or AFTER `flags_close_nonowner_delete_and_fix_triage_20260601`? If AFTER,
--   the over-broad policy was re-applied last and query 1 will show it.
```

---

## §F Open questions

1. **`flags_user_scoped` — the contamination source, and the sweep's single biggest unknown.** An `ALL`-verb-shaped live policy on `public.flags` with **zero repo text**, plausibly the successor to the `flags_auth_user_only` policy the 06-01 session dropped (the ledger carries `restore_flags_auth_user_only_triage_unblock_20260601`, also with zero repo text). **Hypothesis, explicitly not fact:** if its qual is `auth.uid() IS NOT NULL` and its command is `ALL`, then **any signed-in user can DELETE any flag** — exactly the hole the 06-01 session was convened to close, silently re-opened by apply order. §E queries 1 and 9 settle it in under a minute. Until then, the `flags` DELETE and anon-INSERT postures are UNKNOWN, and the repo's anon photo_url hardening cannot be claimed as effective.
2. **SR-018 residue.** Was the webhook secret ever **rotated** after `consolidation:65-68` declared it extractable from `pg_proc`/`pg_trigger`? The migration to Vault happened (2026-06-03); no rotation artifact exists. §E query 4 shows whether a literal secret still sits in a trigger definition.
3. **SR-039 verdict.** The repo **cannot** reproduce live by file replay: ≥3 live chunks have no repo file, 2 live functions have no repo definition, 2 files with PROPOSE-ONLY headers were demonstrably applied, and the live `flags anon insert` is strictly stronger than its repo text. Recommendation: after §E query 1, regenerate a true `schema.sql` from `pg_dump --schema-only` and retire the hand-reconciled one.
4. **Dead-table disposition (SKY-DECISION ×4):** `flag_verifications`, `comment_votes`, `flag_edit_history`, `notification_preferences` — all 0 rows, all with live RLS surfaces, none with an app writer. Keep-and-fix, or drop before review?
5. **Points-values ratification (rider to Fork-2/OA):** `schema.sql:112` still carries "DECISION PENDING (Sky)". ROUTED→fork-briefs.
6. **Deprecated files** — `supabase/realtime.sql.deprecated-option1-do-not-apply` and `migrations/2026-05-24_realtime_flags.sql.deprecated-option1-do-not-apply` exist, are excluded from this sweep, and both would **widen the realtime payload from `{id,status}` to full rows** if ever replayed. Recommend deletion, not renaming.

---

## §NOT-VERIFIED

- **Live policy bodies.** I read **no** live DB state myself (no MCP calls; the brief forbade a DB connection). Everything in §B beyond the coordinator's §C-0 data is repo text. `flags_user_scoped` is a **name only** to me — I never saw its command, roles, `USING`, or `WITH CHECK`, and I have deliberately not guessed them in any artifact.
- **PostgREST request-header availability in Postgres (SR-007 option b).** I could not verify from the repo or from reliable knowledge that `current_setting('request.headers')` is populated for trigger execution on this project, nor that `x-forwarded-for` survives Supabase's edge proxy as a trustworthy value. Option (b) is therefore **undesignable as specified**; I designed around it with option (a). Do not let anyone ship a per-IP throttle on the strength of this report.
- **A4-3's runtime prediction.** The SQLSTATE-21000-on-owner-self-UPDATE conclusion is derived from Postgres name resolution + policy-OR ordering + AND short-circuiting. It is reasoned, not executed. §C-10's rolled-back probe is the proof. *(I was mid-check on whether the app permits owner self-triage — i.e. whether this is user-reachable today — when the run was cut. `TasksScreen.tsx:780` passes `isOwn={item.user_id === userId}` into the card and `:1664/:1676/:1686` wire Verify/Resolve/Reject through `onSetStatus(…, isOwn)`, with the comment at `:643` describing self-triage as a supported case — which suggests it IS reachable — but I did not confirm whether any earlier gate hides those controls for own flags. **Treat reachability as UNCONFIRMED.**)*
- **A4-2 duplicate webhook triggers.** Inferred solely from the 06-01 follow-up note plus the absence of any remediation file. Never observed. §E query 4 settles it.
- **A4-1(i).** The 18-rows-==-18-flags corroboration is suggestive, not conclusive (cascade-deleted flags could coincidentally balance it). §E query 8 is decisive.
- **Trigger firing order on `public.flags`** (five BEFORE/AFTER triggers now interleave: rate-limit, updated_at ×possibly-2, non-owner revert, reopen reset, status-change, submitted, webhook ×possibly-2). I reasoned about the alphabetical BEFORE ordering the 05-23 proposal relies on, but I did **not** verify the full live firing sequence. §E query 4 lists them; a proper ordering audit is a separate piece of work.
- **Edge-function config** (`verify_jwt`, deployed function bodies vs repo) — out of scope for this sweep; SR-010/SR-018 own it.
- **No live drift check, no jest, no browser.** Read-only on the repo throughout; nothing was modified anywhere.