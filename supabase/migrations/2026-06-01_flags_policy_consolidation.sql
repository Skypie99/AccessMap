-- ===========================================================================
-- 2026-06-01 — APPLIED TO PROD (under Sky's explicit authorization, Morgan→Dana)
-- Close non-owner DELETE on flags + fix the broken triage RLS policy
-- Author: Steve (audit) → Dana (impl/apply) · verified by rolled-back probes
-- ===========================================================================
--
-- STATUS: APPLIED to live prod 2026-06-01 (migration
-- `flags_close_nonowner_delete_and_fix_triage_20260601`) and VERIFIED. This
-- file is the record of what was applied + why.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS ACTUALLY WRONG (corrected after live introspection)
-- ---------------------------------------------------------------------------
-- The audit first reported "any signed-in user can edit AND delete any flag."
-- Live introspection corrected this:
--   * EDIT was NOT exploitable — the BEFORE UPDATE trigger
--     `enforce_flag_status_only_for_non_owner` already reverts every non-status
--     column to OLD for non-owners (verified: a non-owner severity change did
--     not persist). The earlier "edit succeeded" probe only counted rows; the
--     trigger silently reverted the value.
--   * DELETE *was* exploitable — that trigger is UPDATE-only, and the leftover
--     `flags_auth_user_only` policy (`FOR ALL`, role public, auth.uid() IS NOT
--     NULL) granted DELETE (and spoofed INSERT) to any signed-in user.
--     Verified: a non-owner DELETE of another user's flag persisted.
--   * The intended `flags status update by any authenticated` policy was also
--     broken (mis-correlated WITH CHECK subquery → "more than one row" error),
--     so simply dropping the broad policy errored all non-owner triage.
--
-- ---------------------------------------------------------------------------
-- THE FIX (applied) — leverage the already-working trigger
-- ---------------------------------------------------------------------------
-- Replace the broken triage policy with a simple permissive one (the trigger
-- does the column-locking), then drop the over-broad policy. Net result,
-- verified on prod with rolled-back probes:
--   * non-owner DELETE  -> BLOCKED (no policy grants it)
--   * non-owner UPDATE  -> allowed, but trigger reverts all non-status columns
--   * non-owner status triage -> allowed, no RLS error
--   * owner edit/delete -> allowed
--   * authenticated INSERT with spoofed user_id -> blocked (flags insert own)

drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "flags_auth_user_only" on public.flags;

-- ---------------------------------------------------------------------------
-- ROLLBACK (restores the prior, vulnerable state — for reference only)
-- ---------------------------------------------------------------------------
--   create policy "flags_auth_user_only" on public.flags for all to public
--     using (auth.uid() is not null) with check (auth.uid() is not null);
--   (the simple triage policy can stay; it is strictly safer than the broken one)
--
-- ---------------------------------------------------------------------------
-- ALSO APPLIED THIS SESSION: anon-insert consolidation (one hardened
-- "flags anon insert": user_id IS NULL AND photo_url IS NULL AND status='open')
-- closing the anon photo_url injection; legit anon reporting verified working.
--
-- ---------------------------------------------------------------------------
-- FOLLOW-UPS DISCOVERED (NOT fixed here — propose-only, route to Dana/Steve)
-- ---------------------------------------------------------------------------
--   1. Hardcoded webhook secrets in two trigger defs (flag_status_notify_trigger
--      via net.http_post; "notify-flag-status" via supabase_functions.http_request)
--      are extractable by any authenticated role via pg_proc/pg_trigger. Rotate
--      both + move to Vault/config.
--   2. Duplicate triggers: TWO AFTER UPDATE OF status -> handle_flag_status_change
--      (on_flag_status_change + trigger_flag_status_change) = DOUBLE points per
--      status change. Also two webhook triggers + two updated_at triggers. Drop
--      the duplicates (keep one each).
--   3. enforce_flag_status_only_for_non_owner does not lock context_tags (a
--      non-owner could alter a flag's context tags). Low severity; add to the
--      trigger's revert list (do NOT lock reopen_requests — the reopen RPC needs it).
-- ===========================================================================
