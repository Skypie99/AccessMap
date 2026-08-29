-- Reconstructed 2026-05-28 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260528180513, hosted name "d1_flags_rls".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flags_auth_user_only" ON public.flags
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "flags_user_scoped" ON public.flags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
