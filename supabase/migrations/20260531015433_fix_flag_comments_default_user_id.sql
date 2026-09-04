-- Reconstructed 2026-05-31 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260531015433, hosted name "fix_flag_comments_default_user_id".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

ALTER TABLE public.flag_comments
ALTER COLUMN user_id SET DEFAULT auth.uid();
