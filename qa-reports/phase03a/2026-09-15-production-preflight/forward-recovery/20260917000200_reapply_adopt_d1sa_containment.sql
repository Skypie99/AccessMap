-- FORWARD REAPPLICATION of 20260904000200_adopt_d1sa_containment.
-- Prepared as production Phase 03A preflight evidence only.
-- This later canonical version preserves the original ledger row and reapplies the exact accepted source body.
-- Execution requires a separate exact owner authorization, fresh version-availability proof, and independent security review.
-- =============================================================================
-- FORWARD-ONLY CANDIDATE — not applied anywhere. PHASE-02B.
--
-- Version 20260904000200 is strictly after the ledger head 20260830130000.
--
-- PURPOSE: adopt the D1S-A containment that is LIVE in production but recorded
-- in no applied migration. The PHASE-02B replay measured the gap exactly:
-- replaying the 71 applied migrations reproduces 43 of production's 47 policy
-- predicates byte-for-byte; the 4 that differ are precisely the 4 D1S-A
-- replaced out of band, and it also leaves two rate-limit trigger functions
-- and several EXECUTE grants more permissive than production.
--
-- The statements below are transcribed VERBATIM from
--   supabase/nonmanaged/live-out-of-band/2026-08-27_d1sa_deployed_security_containment.sql
-- whose effects were independently reconfirmed against the live catalog on
-- 2026-09-04 (6 of 6 object groups).
--
-- EFFECT AGAINST PRODUCTION: none. Production is already in this state; every
-- statement is idempotent and asserts what is already true.
-- EFFECT ON A REBUILT DATABASE: closes the last authorization-surface gap
-- between a from-source rebuild and production.
--
-- SCOPE NOTE: this file deliberately does NOT recreate the seven
-- bk_2026_08_22_* tables. They are data snapshots produced by a destructive
-- takedown script, not part of the application contract, and Phase 05 may
-- remove them outright (they are unreachable by any deletion path — see the
-- PHASE-02A receipt). Recreating them in staging would prejudge that decision.
--
-- NOT AUTHORIZED FOR APPLY.
-- =============================================================================

drop policy if exists "flag-photos auth upload" on storage.objects;
create policy "flag-photos auth upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.users as account
      where account.id = (select auth.uid())
    )
  );

drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.users as account
      where account.id = (select auth.uid())
    )
  );

drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
create policy "flag_photos: authenticated insert"
  on public.flag_photos for insert
  to authenticated
  with check (
    position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0
    and exists (
      select 1
      from public.users as account
      where account.id = (select auth.uid())
    )
    and exists (
      select 1
      from public.flags as flag
      where flag.id = flag_photos.flag_id
        and flag.user_id = (select auth.uid())
    )
  );

drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using (
    exists (
      select 1
      from public.users as account
      where account.id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.users as account
      where account.id = (select auth.uid())
    )
  );

-- D1S-A also replaced both account counters with the live-account boundary.
-- Rev1 omitted these bodies and compared only policy/trigger aggregates.
create or replace function public.increment_reopen_request(p_flag_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  if (select auth.uid()) is null
     or not exists (
       select 1
       from public.users as account
       where account.id = (select auth.uid())
     )
  then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;

  update public.flags
    set reopen_requests = reopen_requests + 1
    where id = p_flag_id
      and status = 'resolved'
    returning reopen_requests into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;

create or replace function public.increment_dispute_request(p_flag_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  if (select auth.uid()) is null
     or not exists (
       select 1
       from public.users as account
       where account.id = (select auth.uid())
     )
  then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;

  update public.flags
    set dispute_requests = dispute_requests + 1
    where id = p_flag_id
      and status in ('open', 'verified')
    returning dispute_requests into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;

-- D1S-A revoked direct EXECUTE on trigger-only and counter functions. Without
-- these, a database rebuilt from source can be more permissive than production.
revoke execute on function public.increment_reopen_request(uuid) from public, anon;
revoke execute on function public.increment_dispute_request(uuid) from public, anon;
revoke execute on function public.enforce_flag_status_transition()
  from public, anon, authenticated;
