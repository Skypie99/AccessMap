-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529043812, hosted name "email_privacy_closes_pii_exposure".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

revoke select on public.users from authenticated;
grant select (id, display_name, avatar_url, points, created_at) on public.users to authenticated;
create policy "users own row full select"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);
