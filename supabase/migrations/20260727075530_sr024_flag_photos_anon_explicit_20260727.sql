-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075530, hosted name "sr024_flag_photos_anon_explicit_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

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
  'Community evidence photos. RATIFIED 2026-07-27 (Sky): photos on ANONYMOUS '
  'flags are permanently un-curatable — no owner exists to curate them. '
  'Admin/service_role cleanup only. (SR-024)';
