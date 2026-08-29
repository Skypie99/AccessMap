-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075651, hosted name "a4_1_status_history_view_grant_fix_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

grant select (id, flag_id, from_status, to_status, created_at)
  on public.flag_status_history to authenticated;

grant select (id, flag_id, changed_fields, old_values, new_values, created_at)
  on public.flag_edit_history to authenticated;
-- anon deliberately gets nothing (history is a signed-in surface).
