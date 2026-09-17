-- PROPOSAL ONLY. Run read-only every 5 seconds while the apply CLI is active.
-- Do not capture query text; this is privacy-safe operational metadata.
begin transaction read only;
select jsonb_build_object(
  'captured_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only',current_setting('transaction_read_only'),
  'candidate_backends',coalesce((select jsonb_agg(jsonb_build_object('pid',pid,'usename',usename,'application_name',application_name,'state',state,'wait_event_type',wait_event_type,'wait_event',wait_event,'xact_start',xact_start,'query_start',query_start) order by pid) from pg_catalog.pg_stat_activity where datname=current_database() and usename='postgres' and pid<>pg_backend_pid() and state<>'idle'),'[]'::jsonb),
  'ledger_count',(select count(*) from supabase_migrations.schema_migrations),
  'phase03b_versions',(select coalesce(jsonb_agg(version order by version),'[]'::jsonb) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')),
  'gate_trigger_oid',(select oid from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal),
  'gate_enabled',(select tgenabled from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal)
) as phase03b_apply_monitor_r2;
rollback;
