-- =============================================================================
-- D1S-A — deployed security containment
--
-- CORRECTED 2026-08-28 (migration-history truth repair): the line below was
-- accurate as of this file's original 2026-08-27 authoring, but is now
-- stale and contradicted by read-only catalog evidence. Its effects (RLS +
-- revokes on all 7 bk_2026_08_22_* backup tables) ARE currently live in the
-- hosted database (confirmed via read-only pg_class.relrowsecurity = true
-- for all 7 tables) — applied out-of-band, separately from this file, at
-- some point after 2026-08-27. This file itself is still NOT RECORDED in
-- the hosted migration ledger (supabase_migrations.schema_migrations) under
-- any version, and remains excluded from normal migration execution here in
-- nonmanaged/. Distinguish: "live in hosted catalog" (true) vs "recorded
-- applied in the migration ledger" (false, and still not the same claim).
--
-- Original line, preserved for provenance (was accurate at authoring time,
-- now superseded by the above):
-- LOCAL ARTIFACT ONLY. This migration has not been applied to Supabase.
--
-- Scope is intentionally limited to the deployed findings recorded in the
-- D1S-A packet: public backup-table exposure, stale-account writes, photo
-- metadata ownership, and direct execution of a trigger-only function.
-- It does not implement account deletion, moderation policy, voter identity,
-- rate limiting, Storage cleanup, or public-read changes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- F1 — Backup tables are recovery artifacts, never client relations.
--
-- Keep the tables and their owner/service restoration path. RLS is defense in
-- depth; explicit revokes ensure PostgREST client roles cannot use a surviving
-- default grant. There are deliberately no client policies for these tables.
-- -----------------------------------------------------------------------------
alter table public.bk_2026_08_22_flags enable row level security;
revoke all privileges on table public.bk_2026_08_22_flags from public, anon, authenticated;

alter table public.bk_2026_08_22_flag_comments enable row level security;
revoke all privileges on table public.bk_2026_08_22_flag_comments from public, anon, authenticated;

alter table public.bk_2026_08_22_flag_photos enable row level security;
revoke all privileges on table public.bk_2026_08_22_flag_photos from public, anon, authenticated;

alter table public.bk_2026_08_22_flag_status_history enable row level security;
revoke all privileges on table public.bk_2026_08_22_flag_status_history from public, anon, authenticated;

alter table public.bk_2026_08_22_flag_verifications enable row level security;
revoke all privileges on table public.bk_2026_08_22_flag_verifications from public, anon, authenticated;

alter table public.bk_2026_08_22_flag_edit_history enable row level security;
revoke all privileges on table public.bk_2026_08_22_flag_edit_history from public, anon, authenticated;

alter table public.bk_2026_08_22_point_links enable row level security;
revoke all privileges on table public.bk_2026_08_22_point_links from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- F2 — A valid JWT alone is insufficient for account-sensitive mutations.
--
-- `public.users` is the Flagstone account mirror. Requiring its matching row
-- prevents a still-valid token from retaining ordinary privileges after its
-- account row has been deleted. Keep the existing authenticated role and UID
-- namespace checks intact.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- F3 — Photo metadata must be attached only to the caller's own report.
--
-- The current shipped detail UI exposes its photo-add flow only to report
-- owners. This policy matches that product boundary while preserving the
-- existing caller-owned Storage URL requirement and all read behavior.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- F2 — Preserve community triage, but require a current Flagstone account.
--
-- The status-transition trigger continues to define which transitions are
-- legal. This policy adds no ownership or moderator restriction.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- F2 — SECURITY DEFINER counters retain their current behavior only for an
-- existing account. No voter identity is stored or inferred.
-- -----------------------------------------------------------------------------
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
revoke execute on function public.increment_reopen_request(uuid) from public, anon;
grant execute on function public.increment_reopen_request(uuid) to authenticated;

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
revoke execute on function public.increment_dispute_request(uuid) from public, anon;
grant execute on function public.increment_dispute_request(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- F4 — Trigger execution does not require client EXECUTE.
-- -----------------------------------------------------------------------------
revoke execute on function public.enforce_flag_status_transition()
  from public, anon, authenticated;

-- =============================================================================
-- ROLLBACK — technically reversible, but security-unsafe.
--
-- Do not restore direct client privileges to the bk_2026_08_22_* tables. That
-- would deliberately reopen F1 and requires a separate Sky decision.
--
-- The blocks below restore only the immediately preceding policy/function
-- definitions. Applying any of them reopens the stale-account or direct-call
-- boundary closed above and is therefore not a routine release rollback.
-- =============================================================================

-- Storage policies before D1S-A:
-- drop policy if exists "flag-photos auth upload" on storage.objects;
-- create policy "flag-photos auth upload"
--   on storage.objects for insert to authenticated
--   with check (
--     bucket_id = 'flag-photos'
--     and (storage.foldername(name))[1] = (select auth.uid()::text)
--   );
--
-- drop policy if exists "flag-photos owner delete" on storage.objects;
-- create policy "flag-photos owner delete"
--   on storage.objects for delete to authenticated
--   using (
--     bucket_id = 'flag-photos'
--     and (storage.foldername(name))[1] = (select auth.uid()::text)
--   );

-- flag_photos INSERT policy before D1S-A:
-- drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
-- create policy "flag_photos: authenticated insert"
--   on public.flag_photos for insert to authenticated
--   with check (
--     position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0
--   );

-- Community status-triage policy before D1S-A:
-- drop policy if exists "flags status update by any authenticated" on public.flags;
-- create policy "flags status update by any authenticated"
--   on public.flags for update to authenticated
--   using (true)
--   with check (true);

-- Counter RPCs before D1S-A:
-- create or replace function public.increment_reopen_request(p_flag_id uuid)
-- returns integer language plpgsql security definer set search_path = public as $$
-- declare v_new_count integer;
-- begin
--   update public.flags set reopen_requests = reopen_requests + 1
--     where id = p_flag_id and status = 'resolved'
--     returning reopen_requests into v_new_count;
--   return coalesce(v_new_count, 0);
-- end;
-- $$;
-- revoke execute on function public.increment_reopen_request(uuid) from public, anon;
-- grant execute on function public.increment_reopen_request(uuid) to authenticated;
--
-- create or replace function public.increment_dispute_request(p_flag_id uuid)
-- returns integer language plpgsql security definer set search_path = public as $$
-- declare v_new_count integer;
-- begin
--   update public.flags set dispute_requests = dispute_requests + 1
--     where id = p_flag_id and status in ('open', 'verified')
--     returning dispute_requests into v_new_count;
--   return coalesce(v_new_count, 0);
-- end;
-- $$;
-- revoke execute on function public.increment_dispute_request(uuid) from public, anon;
-- grant execute on function public.increment_dispute_request(uuid) to authenticated;
--
-- Trigger-only function before D1S-A (security-unsafe):
-- grant execute on function public.enforce_flag_status_transition()
--   to public, anon, authenticated;
