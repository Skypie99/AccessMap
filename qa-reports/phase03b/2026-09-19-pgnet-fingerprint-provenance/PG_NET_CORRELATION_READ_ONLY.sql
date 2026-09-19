-- FLAGSTONE-P03B-PGNET-FINGERPRINT-PROVENANCE-20260919
-- One-to-one privacy-safe correlation of the six changed response rows to the
-- six contemporaneous status-history commits. User and raw flag IDs are excluded.
begin transaction read only;
set local statement_timeout = '15s';

with responses as (
  select
    row_number() over (order by created, id) as ordinal,
    id,
    created,
    status_code,
    timed_out,
    error_msg is not null as has_error
  from net._http_response
  where id between 73 and 78
), history as (
  select
    row_number() over (order by created_at, id) as ordinal,
    id,
    flag_id,
    from_status,
    to_status,
    created_at
  from public.flag_status_history
  where created_at between '2026-09-19T07:49:30Z'::timestamptz
                       and '2026-09-19T07:54:00Z'::timestamptz
), pairs as (
  select
    r.ordinal,
    r.id as request_id,
    r.created as response_created,
    r.status_code,
    r.timed_out,
    r.has_error,
    h.id as history_id,
    h.flag_id,
    h.from_status,
    h.to_status,
    h.created_at as history_created,
    round((extract(epoch from (r.created - h.created_at)) * 1000)::numeric, 3) as response_delay_ms
  from responses r
  full join history h using (ordinal)
), trigger_metadata as (
  select
    t.oid,
    t.tgname,
    t.tgenabled,
    n.nspname as table_schema,
    c.relname as table_name,
    pn.nspname as function_schema,
    p.proname as function_name,
    case when (t.tgtype::int & 2) <> 0 then 'BEFORE'
         when (t.tgtype::int & 64) <> 0 then 'INSTEAD OF'
         else 'AFTER' end as timing,
    case when (t.tgtype::int & 1) <> 0 then 'ROW' else 'STATEMENT' end as level,
    (t.tgtype::int & 16) <> 0 as fires_on_update,
    encode(extensions.digest(pg_catalog.pg_get_triggerdef(t.oid, true), 'sha256'), 'hex') as trigger_definition_sha256,
    encode(extensions.digest(pg_catalog.pg_get_functiondef(p.oid), 'sha256'), 'hex') as function_definition_sha256,
    pg_catalog.pg_get_functiondef(p.oid) ilike '%net.http_post%' as function_calls_http_post,
    pg_catalog.pg_get_functiondef(p.oid) ilike '%vault.decrypted_secrets%' as function_uses_vault,
    pg_catalog.pg_get_functiondef(p.oid) ilike '%webhook_endpoint%' as function_uses_scoped_endpoint
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_proc p on p.oid = t.tgfoid
  join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
    and n.nspname = 'public'
    and c.relname = 'flags'
    and t.tgname = 'flag_status_notify_trigger'
)
select jsonb_build_object(
  'receipt', 'flagstone_phase03b_pgnet_status_correlation_20260919',
  'captured_at_utc', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only', current_setting('transaction_read_only'),
  'response_count', (select count(*) from responses),
  'status_history_count', (select count(*) from history),
  'pair_count', (select count(*) from pairs where request_id is not null and history_id is not null),
  'all_pairs_within_100ms', coalesce((select bool_and(response_delay_ms between 0 and 100) from pairs), false),
  'all_queue_entries_absent', coalesce((select bool_and(not exists (
    select 1 from net.http_request_queue q where q.id = pairs.request_id
  )) from pairs), false),
  'pairs', coalesce((select jsonb_agg(jsonb_build_object(
    'ordinal', ordinal,
    'request_id', request_id,
    'response_created_utc', to_char(response_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'response_delay_ms', response_delay_ms,
    'status_code', status_code,
    'timed_out', timed_out,
    'has_error', has_error,
    'history_identity_sha256', encode(extensions.digest(history_id::text, 'sha256'), 'hex'),
    'flag_identity_sha256', encode(extensions.digest(flag_id::text, 'sha256'), 'hex'),
    'from_status', from_status,
    'to_status', to_status,
    'history_created_utc', to_char(history_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'corresponding_queue_entry_exists', exists (
      select 1 from net.http_request_queue q where q.id = pairs.request_id
    )
  ) order by ordinal) from pairs), '[]'::jsonb),
  'trigger', (select jsonb_build_object(
    'oid', oid,
    'name', tgname,
    'enabled', tgenabled,
    'table_schema', table_schema,
    'table_name', table_name,
    'function_schema', function_schema,
    'function_name', function_name,
    'timing', timing,
    'level', level,
    'fires_on_update', fires_on_update,
    'trigger_definition_sha256', trigger_definition_sha256,
    'function_definition_sha256', function_definition_sha256,
    'function_calls_http_post', function_calls_http_post,
    'function_uses_vault', function_uses_vault,
    'function_uses_scoped_endpoint', function_uses_scoped_endpoint
  ) from trigger_metadata),
  'http_queue_count', (select count(*) from net.http_request_queue),
  'pg_stat_statements_track', current_setting('pg_stat_statements.track', true)
) as pg_net_correlation;

rollback;
