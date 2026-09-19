-- PROPOSAL ONLY. A separate production-write authorization is required.
-- Exact target when separately authorized: kldlwszpfkdmsjrjhjym.
-- This transaction drains public.flags writers, installs the complete
-- whole-domain gate, verifies both trigger identities, captures the invariant,
-- and commits one unambiguous entry boundary.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
select pg_catalog.set_config('flagstone.phase03b_entry_started_at', pg_catalog.clock_timestamp()::text, true);

do $guard$
begin
  if current_user <> 'postgres' then
    raise exception 'Phase 03B entry refused: current_user must be postgres.' using errcode = 'P0001';
  end if;
  if to_regnamespace('private') is null
     or (select pg_catalog.pg_get_userbyid(nspowner) from pg_catalog.pg_namespace where nspname='private') <> 'postgres'
     or (select pg_catalog.pg_get_userbyid(relowner) from pg_catalog.pg_class where oid='public.flags'::pg_catalog.regclass) <> 'postgres' then
    raise exception 'Phase 03B entry refused: expected production ownership is absent.' using errcode = 'P0001';
  end if;
  if to_regprocedure('private.flagstone_phase03b_block_row_lifecycle_r2()') is not null then
    raise exception 'Phase 03B entry refused: reserved function exists.' using errcode = 'P0001';
  end if;
  if exists (select 1 from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal) then
    raise exception 'Phase 03B entry refused: reserved trigger exists.' using errcode = 'P0001';
  end if;
  if exists (select 1 from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not tgisinternal) then
    raise exception 'Phase 03B entry refused: reserved truncate trigger exists.' using errcode = 'P0001';
  end if;
end
$guard$;

-- SHARE ROW EXCLUSIVE conflicts with INSERT/UPDATE/DELETE's ROW EXCLUSIVE
-- lock. Earlier writers drain; new writers cannot cross the install boundary.
lock table public.flags in share row exclusive mode;

do $baseline_guard$
declare
  v_ledger_hash text;
begin
  select encode(extensions.digest(coalesce(string_agg(version::text||E'\t'||name::text,E'\n' order by version)||E'\n',''),'sha256'),'hex')
    into v_ledger_hash from supabase_migrations.schema_migrations;
  if (select count(*) from supabase_migrations.schema_migrations)<>85
     or (select count(distinct version) from supabase_migrations.schema_migrations)<>85
     or (select max(version) from supabase_migrations.schema_migrations)<>'20260911120000'
     or (select count(*) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413'))<>0
     or v_ledger_hash<>'811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec' then
    raise exception 'Phase 03B entry refused: accepted ledger changed.' using errcode='P0001';
  end if;
  if current_setting('pg_net.ttl', true) is null
     or extract(epoch from current_setting('pg_net.ttl')::interval) <= 600
     or (select count(*) from net.http_request_queue) <> 0
     or (select count(*) from net._http_response where created >= '__DATABASE_T0__'::timestamptz) <> 0 then
    raise exception 'Phase 03B entry refused: run-relative pg_net invariant failed.' using errcode='P0001';
  end if;
  perform pg_catalog.set_config('flagstone.phase03b_pre_flags_count',(select count(*)::text from public.flags),true);
  perform pg_catalog.set_config('flagstone.phase03b_pre_flags_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex'),true);
  perform pg_catalog.set_config('flagstone.phase03b_pre_history_count',(select count(*)::text from public.flag_status_history),true);
  perform pg_catalog.set_config('flagstone.phase03b_pre_history_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex'),true);
end
$baseline_guard$;

create function private.flagstone_phase03b_block_row_lifecycle_r2()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
begin
  if tg_op = 'TRUNCATE' or tg_op = 'INSERT' or tg_op = 'DELETE'
     or old.id is distinct from new.id
     or old.status is distinct from new.status then
    raise exception 'Flag creation, deletion, and status changes are temporarily paused for maintenance. Retry after maintenance completes.'
      using errcode = 'P0001';
  end if;
  return new;
end
$function$;

alter function private.flagstone_phase03b_block_row_lifecycle_r2() owner to postgres;
revoke all on function private.flagstone_phase03b_block_row_lifecycle_r2() from public, anon, authenticated, service_role;

create trigger aaa_flagstone_phase03b_row_lifecycle_quiescence_r2
before insert or delete or update of id, status on public.flags
for each row
execute function private.flagstone_phase03b_block_row_lifecycle_r2();

alter table public.flags enable always trigger aaa_flagstone_phase03b_row_lifecycle_quiescence_r2;

create trigger aaa_flagstone_phase03b_truncate_quiescence_r3
before truncate on public.flags
for each statement
execute function private.flagstone_phase03b_block_row_lifecycle_r2();

alter table public.flags enable always trigger aaa_flagstone_phase03b_truncate_quiescence_r3;

do $verify$
declare
  v_function_hash text;
  v_trigger_hash text;
  v_truncate_trigger_hash text;
begin
  with f as (
    select p.oid, n.nspname, p.proname,
      pg_catalog.pg_get_function_identity_arguments(p.oid) identity_args,
      pg_catalog.pg_get_userbyid(p.proowner) owner_name,
      l.lanname, p.prosecdef, p.provolatile,
      coalesce((select jsonb_agg(x order by x::text) from unnest(coalesce(p.proconfig, array[]::text[])) x), '[]'::jsonb) config,
      coalesce((select jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by (case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end),a.privilege_type,a.is_grantable)
                from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f',p.proowner))) a), '[]'::jsonb) acl,
      pg_catalog.pg_get_functiondef(p.oid) definition
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid='private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure
  )
  select encode(extensions.digest(jsonb_build_object('schema',nspname,'name',proname,'identity_args',identity_args,'owner',owner_name,'language',lanname,'security_definer',prosecdef,'volatility',provolatile,'config',config,'acl',acl,'definition',definition)::text,'sha256'),'hex') into v_function_hash from f;

  with t as (
    select t.oid, n.nspname, c.relname, pg_catalog.pg_get_userbyid(c.relowner) table_owner,
      t.tgname, t.tgenabled, t.tgtype, coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,
      pg_catalog.pg_get_triggerdef(t.oid,true) definition,
      pn.nspname function_schema, p.proname function_name, pg_catalog.pg_get_function_identity_arguments(p.oid) function_args
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
    where t.tgrelid='public.flags'::pg_catalog.regclass and t.tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not t.tgisinternal
  )
  select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') into v_trigger_hash from t;

  with t as (
    select t.oid, n.nspname, c.relname, pg_catalog.pg_get_userbyid(c.relowner) table_owner,
      t.tgname, t.tgenabled, t.tgtype, coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,
      pg_catalog.pg_get_triggerdef(t.oid,true) definition,
      pn.nspname function_schema, p.proname function_name, pg_catalog.pg_get_function_identity_arguments(p.oid) function_args
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
    where t.tgrelid='public.flags'::pg_catalog.regclass and t.tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not t.tgisinternal
  )
  select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') into v_truncate_trigger_hash from t;

  if v_function_hash <> '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac'
     or v_trigger_hash <> 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf'
     or v_truncate_trigger_hash <> '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a' then
    raise exception 'Phase 03B entry refused: gate definition hash mismatch (% / % / %).', v_function_hash, v_trigger_hash, v_truncate_trigger_hash using errcode='P0001';
  end if;
  if current_setting('flagstone.phase03b_pre_flags_count')::bigint <> (select count(*) from public.flags)
     or current_setting('flagstone.phase03b_pre_flags_sha256') <> encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex')
     or current_setting('flagstone.phase03b_pre_history_count')::bigint <> (select count(*) from public.flag_status_history)
     or current_setting('flagstone.phase03b_pre_history_sha256') <> encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex') then
    raise exception 'Phase 03B entry refused: invariant changed inside locked entry transaction.' using errcode='P0001';
  end if;
end
$verify$;

select jsonb_build_object(
  'receipt','phase03b_quiescence_entry_r3',
  'boundary_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_id',pg_catalog.txid_current(),
  'backend_pid',pg_catalog.pg_backend_pid(),
  'lock_acquisition_started_at_utc',to_char(current_setting('flagstone.phase03b_entry_started_at')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'lock_acquisition_ended_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'lock_wait_ms',round(extract(epoch from (pg_catalog.clock_timestamp()-current_setting('flagstone.phase03b_entry_started_at')::timestamptz))*1000,3),
  'lock_mode','SHARE ROW EXCLUSIVE',
  'table_oid','public.flags'::pg_catalog.regclass::oid,
  'function_oid','private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure::oid,
  'function_owner',(select pg_catalog.pg_get_userbyid(proowner) from pg_catalog.pg_proc where oid='private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure),
  'function_execute_grants',(select coalesce(jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by (case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end),a.privilege_type,a.is_grantable),'[]'::jsonb) from pg_catalog.pg_proc p, lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where p.oid='private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure),
  'function_definition_sha256','16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac',
  'trigger_oid',(select oid from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal),
  'trigger_table_owner',(select pg_catalog.pg_get_userbyid(relowner) from pg_catalog.pg_class where oid='public.flags'::pg_catalog.regclass),
  'trigger_definition_sha256','e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf',
  'trigger_enabled',(select tgenabled from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal),
  'truncate_trigger_oid',(select oid from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not tgisinternal),
  'truncate_trigger_table_oid','public.flags'::pg_catalog.regclass::oid,
  'truncate_trigger_definition_sha256','54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a',
  'truncate_trigger_enabled',(select tgenabled from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not tgisinternal),
  'flags_id_status_count',(select count(*) from public.flags),
  'flags_id_status_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex'),
  'pre_install_flags_id_status_count',current_setting('flagstone.phase03b_pre_flags_count')::bigint,
  'pre_install_flags_id_status_sha256',current_setting('flagstone.phase03b_pre_flags_sha256'),
  'history_count',(select count(*) from public.flag_status_history),
  'history_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex'),
  'pre_install_history_count',current_setting('flagstone.phase03b_pre_history_count')::bigint,
  'pre_install_history_sha256',current_setting('flagstone.phase03b_pre_history_sha256'),
  'ledger_count',(select count(*) from supabase_migrations.schema_migrations),
  'ledger_unique_count',(select count(distinct version) from supabase_migrations.schema_migrations),
  'ledger_latest_version',(select max(version) from supabase_migrations.schema_migrations),
  'ledger_ordered_version_name_sha256',(select encode(extensions.digest(coalesce(string_agg(version::text||E'\t'||name::text,E'\n' order by version)||E'\n',''),'sha256'),'hex') from supabase_migrations.schema_migrations),
  'phase03b_ledger_count',(select count(*) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')),
  'database_t0',to_char('__DATABASE_T0__'::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'pg_net_ttl',current_setting('pg_net.ttl', true),
  'pg_net_ttl_seconds',extract(epoch from current_setting('pg_net.ttl')::interval)::bigint,
  'http_queue_count',(select count(*) from net.http_request_queue),
  'http_response_count',(select count(*) from net._http_response),
  'http_response_sha256',(select encode(extensions.digest(coalesce(string_agg(coalesce(id::text,'')||E'\t'||to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||E'\t'||coalesce(status_code::text,'')||E'\t'||coalesce(timed_out::text,'')||E'\t'||case when error_msg is null then 'NO_ERROR' else 'ERROR' end,E'\n' order by id nulls first,created),''),'sha256'),'hex') from net._http_response),
  'http_response_new_since_t0_count',(select count(*) from net._http_response where created >= '__DATABASE_T0__'::timestamptz),
  'pre_entry_structural_snapshot_sha256','2d533d8f8bfb827fe6b63f4fb6f17035afd55b8d474260a51a20fe2c004bda01'
) as phase03b_quiescence_entry_r3;

commit;
