-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075327, hosted name "sr009_flag_verifications_null_safe_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

drop policy if exists "flag_verifications own insert" on public.flag_verifications;
create policy "flag_verifications own insert"
  on public.flag_verifications for insert
  to authenticated
  with check (
    (select auth.uid()) = verifier_id
    -- NULL-safe: TRUE when the flag is anonymous (user_id IS NULL); still
    -- FALSE when you are attesting your own accountable flag.
    and verifier_id is distinct from (
      select f.user_id from public.flags f where f.id = flag_verifications.flag_id
    )
  );
