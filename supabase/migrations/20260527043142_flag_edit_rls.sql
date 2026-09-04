-- ===========================================================================
-- 2026-05-25 — Flag Edit RLS Policy (mandatory for flag-editing feature)
-- ===========================================================================
--
-- Replaces the "flags update own" policy with a restricted version that only
-- allows owners to edit their own flags while they remain in 'open' status.
-- Once a flag is verified, resolved, or rejected, the owner cannot edit it.
--
-- This is a mandatory condition from Jordan (gate approver) for the flag-editing
-- feature to ship.
--
-- AFTER APPLYING:
--    1. Old "flags update own" policy is dropped.
--    2. New "flags owner edit open" policy is created.
--    3. Status-only updates by non-owners still work via the existing
--       "flags status update by any authenticated" policy.
--    4. Shamus can build the UI for flag editing on open flags only.
--
-- ROLLBACK (if needed):
--    drop policy if exists "flags owner edit open" on public.flags;
--    -- Re-create the old unrestricted policy (see 2026-05-23_rls_initplan... for reference)
-- ===========================================================================

drop policy if exists "flags update own" on public.flags;

create policy "flags owner edit open"
  on public.flags
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
  )
  with check (
    (select auth.uid()) = user_id
    and status = 'open'
    and user_id = (select user_id from flags where id = flags.id)
  );
