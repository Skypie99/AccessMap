-- FLAGSTONE-P03B-PGNET-FINGERPRINT-PROVENANCE-20260919
-- Privacy-safe production metadata only: no URLs, headers, bodies, payloads, or query text.
begin transaction read only;
set local statement_timeout = '15s';

with historical_baseline(id, created_utc, status_code, timed_out, has_error) as (
  values
    (67::bigint, '2026-09-09T02:37:21.383126Z'::timestamptz, 200::integer, false, false),
    (68::bigint, '2026-09-09T02:37:28.116576Z'::timestamptz, 400::integer, false, false),
    (69::bigint, '2026-09-09T02:37:31.364153Z'::timestamptz, 400::integer, false, false),
    (70::bigint, '2026-09-09T02:37:36.115069Z'::timestamptz, 400::integer, false, false),
    (71::bigint, '2026-09-09T02:37:40.493470Z'::timestamptz, 400::integer, false, false),
    (72::bigint, '2026-09-09T02:37:43.435372Z'::timestamptz, 400::integer, false, false)
), responses as (
  select
    r.id,
    r.created,
    r.status_code,
    r.timed_out,
    (r.error_msg is not null) as has_error
  from net._http_response r
), response_rows as (
  select jsonb_build_object(
    'response_row_identity', r.id,
    'request_id', r.id,
    'created_utc', to_char(r.created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'status_code', r.status_code,
    'timed_out', r.timed_out,
    'has_error', r.has_error,
    'age_seconds', extract(epoch from (clock_timestamp() - r.created))::bigint,
    'historical_baseline_exact_match', exists (
      select 1 from historical_baseline h
      where h.id = r.id
        and h.created_utc = r.created
        and h.status_code is not distinct from r.status_code
        and h.timed_out is not distinct from r.timed_out
        and h.has_error = r.has_error
    ),
    'corresponding_queue_entry_exists', exists (
      select 1 from net.http_request_queue q where q.id = r.id
    )
  ) as row_json
  from responses r
), baseline_missing as (
  select h.id
  from historical_baseline h
  where not exists (
    select 1 from responses r
    where r.id = h.id
      and r.created = h.created_utc
      and r.status_code is not distinct from h.status_code
      and r.timed_out is not distinct from h.timed_out
      and r.has_error = h.has_error
  )
), extension_members as (
  select d.classid, d.objid, d.objsubid
  from pg_catalog.pg_depend d
  join pg_catalog.pg_extension e on e.oid = d.refobjid
  where d.deptype = 'e' and e.extname = 'pg_net'
), response_triggers as (
  select t.oid, n.nspname as schema_name, c.relname as table_name, t.tgname
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'net' and c.relname = '_http_response' and not t.tgisinternal
), custom_response_routines as (
  select p.oid, n.nspname as schema_name, p.proname,
         pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prokind in ('f', 'p')
    and pg_catalog.pg_get_functiondef(p.oid) ilike '%net._http_response%'
    and not exists (
      select 1 from extension_members em
      where em.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass
        and em.objid = p.oid and em.objsubid = 0
    )
), custom_response_views as (
  select distinct vn.nspname as schema_name, v.relname as view_name
  from pg_catalog.pg_rewrite rw
  join pg_catalog.pg_class v on v.oid = rw.ev_class
  join pg_catalog.pg_namespace vn on vn.oid = v.relnamespace
  join pg_catalog.pg_depend d on d.classid = 'pg_catalog.pg_rewrite'::pg_catalog.regclass
    and d.objid = rw.oid
  where d.refobjid = 'net._http_response'::pg_catalog.regclass
    and v.relkind in ('v', 'm')
    and not exists (
      select 1 from extension_members em
      where em.classid = 'pg_catalog.pg_class'::pg_catalog.regclass
        and em.objid = v.oid and em.objsubid = 0
    )
), tracker_candidates as (
  select distinct n.nspname as schema_name, c.relname as table_name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_attribute a on a.attrelid = c.oid
  where c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped
    and n.nspname not in ('pg_catalog', 'information_schema', 'net')
    and a.attname in ('request_id', 'response_id', 'pg_net_request_id')
), active_sessions as (
  select pid, usename, application_name, backend_type, state,
         wait_event_type, wait_event, xact_start, query_start
  from pg_catalog.pg_stat_activity
  where datname = current_database() and pid <> pg_backend_pid() and state <> 'idle'
)
select jsonb_build_object(
  'receipt', 'flagstone_phase03b_pgnet_provenance_20260919',
  'captured_at_utc', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only', current_setting('transaction_read_only'),
  'database_name', current_database(),
  'server_version_num', current_setting('server_version_num'),
  'pg_net_version', (select extversion from pg_catalog.pg_extension where extname = 'pg_net'),
  'pg_net_schema', (select n.nspname from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_net'),
  'pg_net_ttl', current_setting('pg_net.ttl', true),
  'pg_net_batch_size', current_setting('pg_net.batch_size', true),
  'http_queue_count', (select count(*) from net.http_request_queue),
  'http_queue_request_ids', coalesce((select jsonb_agg(id order by id) from net.http_request_queue), '[]'::jsonb),
  'http_response_count', (select count(*) from responses),
  'http_response_rows', coalesce((select jsonb_agg(row_json order by (row_json->>'response_row_identity')::bigint) from response_rows), '[]'::jsonb),
  'historical_baseline_missing_ids', coalesce((select jsonb_agg(id order by id) from baseline_missing), '[]'::jsonb),
  'new_or_changed_row_count', (select count(*) from responses r where not exists (
    select 1 from historical_baseline h
    where h.id = r.id
      and h.created_utc = r.created
      and h.status_code is not distinct from r.status_code
      and h.timed_out is not distinct from r.timed_out
      and h.has_error = r.has_error
  )),
  'http_response_sha256', (select encode(extensions.digest(coalesce(string_agg(
    coalesce(id::text, '') || E'\t' ||
    to_char(created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || E'\t' ||
    coalesce(status_code::text, '') || E'\t' ||
    coalesce(timed_out::text, '') || E'\t' ||
    case when has_error then 'ERROR' else 'NO_ERROR' end,
    E'\n' order by id nulls first, created), ''), 'sha256'), 'hex') from responses),
  'noninternal_response_triggers', coalesce((select jsonb_agg(jsonb_build_object('oid', oid, 'schema', schema_name, 'table', table_name, 'name', tgname) order by oid) from response_triggers), '[]'::jsonb),
  'custom_response_routines', coalesce((select jsonb_agg(jsonb_build_object('oid', oid, 'schema', schema_name, 'name', proname, 'identity_args', identity_args) order by oid) from custom_response_routines), '[]'::jsonb),
  'custom_response_views', coalesce((select jsonb_agg(jsonb_build_object('schema', schema_name, 'name', view_name) order by schema_name, view_name) from custom_response_views), '[]'::jsonb),
  'retry_tracker_candidates', coalesce((select jsonb_agg(jsonb_build_object('schema', schema_name, 'table', table_name) order by schema_name, table_name) from tracker_candidates), '[]'::jsonb),
  'pg_cron_installed', exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron'),
  'active_session_count_excluding_self', (select count(*) from active_sessions),
  'active_sessions_excluding_self', coalesce((select jsonb_agg(jsonb_build_object(
    'pid', pid, 'usename', usename, 'application_name', application_name,
    'backend_type', backend_type, 'state', state,
    'wait_event_type', wait_event_type, 'wait_event', wait_event,
    'xact_start', xact_start, 'query_start', query_start
  ) order by pid) from active_sessions), '[]'::jsonb)
) as pg_net_provenance;

rollback;
