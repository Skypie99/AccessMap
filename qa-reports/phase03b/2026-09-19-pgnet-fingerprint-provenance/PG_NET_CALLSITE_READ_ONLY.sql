-- FLAGSTONE-P03B-PGNET-FINGERPRINT-PROVENANCE-20260919
-- Privacy-safe call-site and statement metadata; no query text, URLs, headers,
-- payloads, response bodies, user IDs, flag IDs, or secrets are returned.
begin transaction read only;
set local statement_timeout = '15s';

with extension_members as (
  select d.classid, d.objid, d.objsubid
  from pg_catalog.pg_depend d
  join pg_catalog.pg_extension e on e.oid = d.refobjid
  where d.deptype = 'e' and e.extname = 'pg_net'
), outbound_routines as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args,
    pg_catalog.pg_get_userbyid(p.proowner) as owner_name,
    p.prosecdef,
    encode(extensions.digest(pg_catalog.pg_get_functiondef(p.oid), 'sha256'), 'hex') as definition_sha256
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prokind in ('f', 'p')
    and (
      pg_catalog.pg_get_functiondef(p.oid) ilike '%net.http_get%'
      or pg_catalog.pg_get_functiondef(p.oid) ilike '%net.http_post%'
      or pg_catalog.pg_get_functiondef(p.oid) ilike '%net.http_delete%'
      or pg_catalog.pg_get_functiondef(p.oid) ilike '%net.http_head%'
      or pg_catalog.pg_get_functiondef(p.oid) ilike '%net.http_request_queue%'
    )
    and not exists (
      select 1 from extension_members em
      where em.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass
        and em.objid = p.oid and em.objsubid = 0
    )
), outbound_triggers as (
  select
    t.oid,
    n.nspname as table_schema,
    c.relname as table_name,
    t.tgname,
    t.tgenabled,
    pn.nspname as function_schema,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as function_args,
    encode(extensions.digest(pg_catalog.pg_get_triggerdef(t.oid, true), 'sha256'), 'hex') as definition_sha256
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_proc p on p.oid = t.tgfoid
  join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
  join outbound_routines r on r.oid = p.oid
  where not t.tgisinternal
), response_hashes as (
  select jsonb_build_object(
    'response_row_identity', id,
    'request_id', id,
    'created_utc', to_char(created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'status_code', status_code,
    'timed_out', timed_out,
    'has_error', error_msg is not null,
    'content_type', content_type,
    'content_byte_length', octet_length(coalesce(content, '')),
    'content_sha256', encode(extensions.digest(coalesce(content, ''), 'sha256'), 'hex'),
    'headers_sha256', encode(extensions.digest(coalesce(headers::text, ''), 'sha256'), 'hex')
  ) as row_json
  from net._http_response
), pgss as (
  select
    s.queryid,
    pg_catalog.pg_get_userbyid(s.userid) as role_name,
    s.toplevel,
    s.calls,
    s.rows,
    round(s.total_exec_time::numeric, 3) as total_exec_time_ms,
    encode(extensions.digest(s.query, 'sha256'), 'hex') as normalized_query_sha256
  from extensions.pg_stat_statements s
  where s.query ilike '%net.http_get%'
     or s.query ilike '%net.http_post%'
     or s.query ilike '%net.http_delete%'
     or s.query ilike '%net.http_head%'
     or s.query ilike '%net.http_request_queue%'
), recent_flag_metadata as (
  select jsonb_build_object(
    'updated_utc', to_char(f.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'flag_identity_sha256', encode(extensions.digest(f.id::text, 'sha256'), 'hex'),
    'status', f.status
  ) as row_json
  from public.flags f
  where f.updated_at between '2026-09-19T07:49:30Z'::timestamptz and '2026-09-19T07:54:00Z'::timestamptz
), recent_status_history_metadata as (
  select jsonb_build_object(
    'created_utc', to_char(h.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'history_identity_sha256', encode(extensions.digest(h.id::text, 'sha256'), 'hex'),
    'flag_identity_sha256', encode(extensions.digest(h.flag_id::text, 'sha256'), 'hex'),
    'from_status', h.from_status,
    'to_status', h.to_status
  ) as row_json
  from public.flag_status_history h
  where h.created_at between '2026-09-19T07:49:30Z'::timestamptz and '2026-09-19T07:54:00Z'::timestamptz
)
select jsonb_build_object(
  'receipt', 'flagstone_phase03b_pgnet_callsite_20260919',
  'captured_at_utc', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only', current_setting('transaction_read_only'),
  'outbound_routines', coalesce((select jsonb_agg(jsonb_build_object(
    'oid', oid, 'schema', schema_name, 'name', proname, 'identity_args', identity_args,
    'owner', owner_name, 'security_definer', prosecdef, 'definition_sha256', definition_sha256
  ) order by oid) from outbound_routines), '[]'::jsonb),
  'outbound_triggers', coalesce((select jsonb_agg(jsonb_build_object(
    'oid', oid, 'table_schema', table_schema, 'table_name', table_name,
    'name', tgname, 'enabled', tgenabled, 'function_schema', function_schema,
    'function_name', function_name, 'function_args', function_args,
    'definition_sha256', definition_sha256
  ) order by oid) from outbound_triggers), '[]'::jsonb),
  'response_hashes', coalesce((select jsonb_agg(row_json order by (row_json->>'response_row_identity')::bigint) from response_hashes), '[]'::jsonb),
  'pg_stat_statements_available', to_regclass('extensions.pg_stat_statements') is not null,
  'pg_stat_statements_info', case when to_regclass('extensions.pg_stat_statements_info') is null then null else (
    select jsonb_build_object('dealloc', dealloc, 'stats_reset', stats_reset)
    from extensions.pg_stat_statements_info
  ) end,
  'outbound_statement_stats', coalesce((select jsonb_agg(jsonb_build_object(
    'queryid', queryid, 'role_name', role_name, 'toplevel', toplevel, 'calls', calls,
    'rows', rows, 'total_exec_time_ms', total_exec_time_ms,
    'normalized_query_sha256', normalized_query_sha256
  ) order by queryid, role_name) from pgss), '[]'::jsonb),
  'recent_flag_update_count', (select count(*) from recent_flag_metadata),
  'recent_flag_updates', coalesce((select jsonb_agg(row_json order by row_json->>'updated_utc') from recent_flag_metadata), '[]'::jsonb),
  'recent_status_history_count', (select count(*) from recent_status_history_metadata),
  'recent_status_history', coalesce((select jsonb_agg(row_json order by row_json->>'created_utc') from recent_status_history_metadata), '[]'::jsonb)
) as pg_net_callsite;

rollback;
