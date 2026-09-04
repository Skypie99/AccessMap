-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075638, hosted name "sr001_admin_delete_comment_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

drop policy if exists "admin delete any comment" on public.flag_comments;
create policy "admin delete any comment"
  on public.flag_comments for delete
  to authenticated
  using (
    (select is_admin from public.users where id = (select auth.uid()))
  );
