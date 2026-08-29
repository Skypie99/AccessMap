-- ============================================================================
-- FILE:    2026-07-27_drift_capture_flags_owner_edit_open_policy.sql
-- BANKED BY: SHIP-READY Phase-3 prep (2026-07-27), at Sky's direction during
--   the Job 1 SQL-slate review, ahead of applying 04b §C-10 (A4-3).
--
-- WHAT: Captures the LIVE body of the "flags owner edit open" UPDATE policy
--   verbatim, read via pg_policy, BEFORE §C-10's alias fix is applied. This
--   is NOT a behaviour change -- the DDL below reproduces the policy exactly
--   as it is live today, self-correlation bug and all.
--
-- VERIFIED (read-only, 2026-07-27): the live body matches 04b §C-10's
--   assumed "as shipped" text. No drift found for this policy -- unlike the
--   sibling C-5 case, where the same check found real un-versioned drift.
--   Banked anyway at Sky's direction, so this fix's rollback points at a
--   versioned file rather than at hand-written text in a chat transcript.
--
-- THE BUG BEING FIXED (04b §A4-3), now confirmed by Postgres's own rendering:
--   The shipped WITH CHECK reads `(select lat from public.flags where id =
--   flags.id)`. The inner FROM item is ALSO named `flags`, so BOTH sides of
--   the comparison bind to the inner relation. Postgres disambiguates this
--   on read-back as `flags_1.id = flags_1.id` -- visible verbatim below --
--   which is `id = id`: true for every row. The subquery therefore returns
--   all 18 rows and evaluation raises SQLSTATE 21000, "more than one row
--   returned by a subquery used as an expression". This is the exact bug
--   that live-broke the triage policy on 2026-06-01 and was fixed there
--   (2026-06-01_flags_policy_consolidation.sql:26-27); it survived here.
--
--   Why it has not broken production: WITH CHECK conjuncts short-circuit,
--   and the leading `(select auth.uid()) = user_id` is FALSE for every
--   non-owner, so the broken subqueries are never reached except by an
--   owner UPDATEing their own row -- and no owner-edit path exists in the
--   app (`updateFlag` does not exist; zero callers). 04b lists owner
--   self-triage reachability as UNCONFIRMED (§NOT-VERIFIED).
--
-- STATUS: Documentation / provenance artifact. Not run through the normal
--   apply pipeline (it would be a safe no-op -- it reasserts the identical,
--   still-broken policy verbatim). Restoring it would REINTRODUCE the 21000
--   bug; that is the point of a rollback.
-- ============================================================================

-- Captured verbatim via (read-only; nothing was modified to produce this):
--   select polname, polcmd, polpermissive, roles,
--          pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid)
--     from pg_policy where polrelid='public.flags'::regclass
--      and polname='flags owner edit open';
--
-- Result (2026-07-27): command=UPDATE ('w'), permissive=true, roles={authenticated}
--   using:      ((( SELECT auth.uid() AS uid) = user_id) AND (status = 'open'::text))
--   with check: (((SELECT auth.uid()) = user_id)
--                AND (lat        = (SELECT flags_1.lat        FROM flags flags_1 WHERE (flags_1.id = flags_1.id)))
--                AND (lng        = (SELECT flags_1.lng        FROM flags flags_1 WHERE (flags_1.id = flags_1.id)))
--                AND (user_id    = (SELECT flags_1.user_id    FROM flags flags_1 WHERE (flags_1.id = flags_1.id)))
--                AND (created_at = (SELECT flags_1.created_at FROM flags flags_1 WHERE (flags_1.id = flags_1.id)))
--                AND (status     = (SELECT flags_1.status     FROM flags flags_1 WHERE (flags_1.id = flags_1.id))))
--   -- `flags_1.id = flags_1.id` IS the bug, rendered by Postgres itself.

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
    -- The un-aliased inner relation below is the defect. Preserved verbatim.
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id)
  );

-- ============================================================================
-- USE: this file IS the rollback for 04b §C-10's alias fix. Re-running it
-- restores the exact pre-fix state -- which is a policy that raises SQLSTATE
-- 21000 on owner self-UPDATE. Roll back only to undo the fix, never as a
-- repair.
-- ============================================================================
