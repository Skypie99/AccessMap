-- Reconstructed 2026-05-28 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260528230609, hosted name "rls_initplan_and_non_owner_status_update".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

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

drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using (true)
  with check (
    user_id     = (select user_id     from public.flags where id = flags.id)
    and lat         = (select lat         from public.flags where id = flags.id)
    and lng         = (select lng         from public.flags where id = flags.id)
    and category    = (select category    from public.flags where id = flags.id)
    and severity    = (select severity    from public.flags where id = flags.id)
    and description is not distinct from (select description from public.flags where id = flags.id)
    and photo_url   is not distinct from (select photo_url   from public.flags where id = flags.id)
    and created_at  = (select created_at  from public.flags where id = flags.id)
  );
