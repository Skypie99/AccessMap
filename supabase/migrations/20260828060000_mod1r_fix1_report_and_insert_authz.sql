-- ============================================================================
-- MOD1R FIX1 CHECKPOINT A — close two database-authorization gaps found by
-- independent acceptance review of claude/mod1r-moderation-release-safety.
-- SOURCE FILE ONLY — not applied to any hosted project by this migration.
-- Neither prior MOD1 migration file is edited — this is additive, forward-only.
-- ============================================================================

-- ── Blocker 1 — effective report-read authorization ─────────────────────────
--
-- 20260828050000_mod1_admin_report_queue.sql added "feedback_select_moderation"
-- (admin-only, [REPORT]-only) as a new PERMISSIVE select policy. Postgres ORs
-- all permissive policies for one command together, and public.feedback
-- already carried two older permissive selects from
-- 2026-05-23_feedback_table.sql that neither check is_admin nor body shape:
--   - "feedback_select_own"        — a user reading their OWN past feedback
--   - "feedback_select_maintainer" — blanket read for one hardcoded email
-- A non-admin account that happens to BE that hardcoded maintainer email (or
-- that has ever filed ordinary feedback itself) is therefore still admitted
-- to a [REPORT] row by one of those OTHER permissive policies, regardless of
-- is_admin. adminReports.ts already defends against this at the client with
-- `.like('body', '[REPORT]%')`, but a client-side filter is not database
-- authorization: any direct Data API / REST call bypassing the app entirely
-- still gets the row back.
--
-- FIX: a RESTRICTIVE select policy. Postgres ANDs every restrictive policy
-- against the OR of all permissive ones, so this applies no matter which
-- permissive policy admitted the row — including ones added in the future.
-- Ordinary (non-[REPORT]) feedback is untouched: the first disjunct is true
-- for every such row, so feedback_select_own/feedback_select_maintainer keep
-- working exactly as before for non-report rows.
drop policy if exists "feedback_select_report_requires_admin" on public.feedback;
create policy "feedback_select_report_requires_admin"
  on public.feedback as restrictive for select
  using (
    body not like '[REPORT]%'
    or exists (
      select 1 from public.users as account
      where account.id = (select auth.uid()) and account.is_admin = true
    )
  );

-- ── Blocker 3 — direct INSERT into 'rejected' ────────────────────────────────
--
-- public.flags has two permissive INSERT policies ("flags insert own" for
-- authenticated, "flags anon insert" for anon — most recently redefined in
-- 2026-08-27_d1f4_async_account_deletion.sql). Neither has ever constrained
-- `status`; both only check ownership/photo-field nullity. The status
-- lifecycle guard (enforce_flag_status_transition, most recently rewritten by
-- 20260828040000_mod1_moderation_release_safety.sql) is a `before update of
-- status` trigger — UPDATE only, by construction never fires on INSERT. So an
-- ordinary authenticated (or anon) Data API caller can INSERT a flag with
-- status='rejected' (or any other non-'open' value) directly today, skipping
-- moderation entirely.
--
-- FIX: a RESTRICTIVE insert policy pinning status='open', applying regardless
-- of which permissive insert policy admits the row and requiring no change to
-- either existing policy. `flags.status` already defaults to 'open' (see
-- `create table public.flags` in schema.sql) and neither createFlag() (owner
-- reports) nor the anon reporting path ever sets `status` in its insert
-- payload, so no legitimate client write changes behavior. service_role
-- (BYPASSRLS) is unaffected, so server-side seeding/backfill scripts are
-- unaffected too.
drop policy if exists "flags_insert_status_open_only" on public.flags;
create policy "flags_insert_status_open_only"
  on public.flags as restrictive for insert
  with check (status = 'open');

-- ROLLBACK:
--   drop policy if exists "flags_insert_status_open_only" on public.flags;
--   drop policy if exists "feedback_select_report_requires_admin" on public.feedback;
-- ============================================================================
