-- Reconstructed 2026-05-23 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260523203409, hosted name "set_flag_updated_at_search_path".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- Harden the search_path on the updated_at trigger function to match the
-- project convention (other functions already set it). The function only
-- calls now() (pg_catalog, always in path), so an empty search_path is safe.
alter function public.set_flag_updated_at() set search_path = '';
