-- Reconstructed 2026-06-02 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260602045352, hosted name "drop_duplicate_index_flags".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

drop index if exists public.idx_flags_status_created_at_desc;
