-- Reconstructed 2026-07-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260729053159, hosted name "sr050_admin_delete_flag_photo_20260729".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

drop policy if exists "flag-photos admin delete" on storage.objects;
create policy "flag-photos admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (select is_admin from public.users where id = (select auth.uid()))
  );
