-- R11 execution-transport repair: target-pinned callers use this read-only
-- capture before constructing or validating a Supabase migration workspace.
begin transaction read only;
select jsonb_build_object(
  'receipt','phase03b_r11_production_migration_ledger_read_only',
  'captured_at_utc',to_char(pg_catalog.transaction_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only',current_setting('transaction_read_only'),
  'ledger_count',count(*),
  'ledger_unique_count',count(distinct version),
  'ledger_latest_version',max(version),
  'ledger_ordered_version_name_sha256',encode(extensions.digest(coalesce(string_agg(version::text||E'\t'||name::text,E'\n' order by version)||E'\n',''),'sha256'),'hex'),
  'rows',coalesce(jsonb_agg(jsonb_build_object('version',version::text,'name',name::text) order by version),'[]'::jsonb)
) as phase03b_r11_production_migration_ledger_read_only
from supabase_migrations.schema_migrations;
rollback;
