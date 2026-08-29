-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529043753, hosted name "d1_flag_edit_rls_fix".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

drop policy if exists "flags owner edit open" on public.flags;
drop policy if exists "flags update own" on public.flags;
create policy "flags owner edit open"
  on public.flags for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
  )
  with check (
    (select auth.uid()) = user_id
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id)
  );
