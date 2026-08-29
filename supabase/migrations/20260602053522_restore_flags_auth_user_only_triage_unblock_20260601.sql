-- Reconstructed 2026-06-02 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260602053522, hosted name "restore_flags_auth_user_only_triage_unblock_20260601".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- REVERT the F1 drop: re-create the broad policy to restore non-owner triage,
-- because the intended "status update by any authenticated" policy is itself
-- broken (mis-correlated WITH CHECK subqueries -> "more than one row" error).
-- The anon-insert hardening from F1 is intentionally KEPT (it's independent and
-- safe). Net state: triage works again; anon photo_url injection stays closed;
-- the non-owner-tamper hole remains OPEN pending a combined, tested fix.
create policy "flags_auth_user_only"
  on public.flags for all
  to public
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
