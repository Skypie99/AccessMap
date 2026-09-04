-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075512, hosted name "a4_3_owner_edit_subquery_alias_fix_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

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
    and lat        = (select f.lat        from public.flags f where f.id = flags.id)
    and lng        = (select f.lng        from public.flags f where f.id = flags.id)
    and user_id    = (select f.user_id    from public.flags f where f.id = flags.id)
    and created_at = (select f.created_at from public.flags f where f.id = flags.id)
    and status     = (select f.status     from public.flags f where f.id = flags.id)
  );
