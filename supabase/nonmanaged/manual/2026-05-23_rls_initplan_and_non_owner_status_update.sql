-- ===========================================================================
-- 2026-05-23 — P-NEW-1 (HIGH RLS gap) + P2 / Proposal C (initPlan perf rewrite)
-- ===========================================================================
--
-- This migration does two things in one shot. Both are idempotent (each
-- block drops the named policy first), so re-running is safe.
--
-- 1. P2 / Proposal C — replace bare `auth.uid()` calls in the four public
--    policies + the two storage policies with `(select auth.uid())`. This
--    is a pure perf change — semantics identical, but Postgres can cache
--    the value per-statement instead of re-evaluating it per row. The
--    Supabase Advisor's four `auth_rls_initplan` warnings should clear
--    after this runs.
--
-- 2. P-NEW-1 — add a SECOND update policy on public.flags that lets ANY
--    authenticated user change ONLY the `status` column on ANY flag. The
--    existing "flags update own" policy stays in place; both policies are
--    OR'd by Postgres, so owners keep full edit rights on their own rows
--    AND non-owners can triage (verify/resolve/reject) other users' flags.
--
--    The status-only enforcement is via WITH CHECK clauses that compare
--    every non-status column on the NEW row against a subselect against
--    the table. Under READ COMMITTED isolation (Supabase default), the
--    subselects see the OLD row, so changing any non-status column will
--    make the equality fail and the UPDATE rejects.
--
-- AFTER APPLYING:
--    1. Supabase Dashboard → Authentication → Policies → confirm BOTH
--       "flags update own" AND "flags status update by any authenticated"
--       are listed on public.flags.
--    2. Smoke test with two accounts:
--       - Account A creates a flag.
--       - Account B opens Tasks → Verify on A's flag.
--         Expected: status flips to verified; B's points go +2 via the
--         actor-bonus branch in handle_flag_status_change.
--       - Account B tries to change A's flag's description (e.g. via
--         direct REST PATCH). Expected: rejected.
--    3. Supabase Dashboard → Database → Advisors → confirm the four
--       `auth_rls_initplan` warnings are gone.
--
-- ROLLBACK (if needed):
--    drop policy if exists "flags status update by any authenticated" on public.flags;
--    -- and re-run the prior policy bodies WITHOUT (select ...) wrappers.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- P2 / Proposal C — initPlan rewrite
-- ---------------------------------------------------------------------------

drop policy if exists "users update own row" on public.users;
create policy "users update own row"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "flags insert own" on public.flags;
create policy "flags insert own"
  on public.flags for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "flags update own" on public.flags;
create policy "flags update own"
  on public.flags for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "flags delete own" on public.flags;
create policy "flags delete own"
  on public.flags for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "flag-photos auth upload" on storage.objects;
create policy "flag-photos auth upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- P-NEW-1 — non-owner status update
-- ---------------------------------------------------------------------------

drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using (true)
  with check (
    -- Every non-status column on the NEW row must equal its OLD value.
    -- Read-Committed isolation: the subselects return the OLD row because
    -- the UPDATE has not yet committed.
    user_id     = (select user_id     from public.flags where id = flags.id)
    and lat         = (select lat         from public.flags where id = flags.id)
    and lng         = (select lng         from public.flags where id = flags.id)
    and category    = (select category    from public.flags where id = flags.id)
    and severity    = (select severity    from public.flags where id = flags.id)
    and description is not distinct from (select description from public.flags where id = flags.id)
    and photo_url   is not distinct from (select photo_url   from public.flags where id = flags.id)
    and created_at  = (select created_at  from public.flags where id = flags.id)
  );
