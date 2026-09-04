-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529021624, hosted name "2026_05_27_users_email_privacy".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- SECURITY: Fixes email PII exposure.

drop policy if exists "users readable by authenticated" on public.users;
create policy "users readable by authenticated"
  on public.users for select
  to authenticated
  using (true);

revoke select on public.users from authenticated, anon;

grant select
  (id, display_name, avatar_url, points, created_at)
  on public.users
  to authenticated;

drop view if exists public.users_self_email;
create view public.users_self_email
  with (security_invoker = true)
  as
  select id, email
    from public.users
   where id = (select auth.uid());

grant select on public.users_self_email to authenticated;

comment on view public.users_self_email is
  'Caller-scoped projection of public.users — returns email only for the '
  'authenticated caller''s own row. Use this instead of selecting '
  '`email` from public.users directly.';
