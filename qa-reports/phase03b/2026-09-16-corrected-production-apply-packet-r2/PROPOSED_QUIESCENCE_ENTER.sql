-- PROPOSAL ONLY. A separate production-write authorization is required.
-- Exact target when separately authorized: kldlwszpfkdmsjrjhjym.
-- This transaction drains public.flags writers, installs the complete
-- row-lifecycle gate, verifies its catalog identity, captures the invariant,
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
end
$guard$;

-- SHARE ROW EXCLUSIVE conflicts with INSERT/UPDATE/DELETE's ROW EXCLUSIVE
-- lock. Earlier writers drain; new writers cannot cross the install boundary.
lock table public.flags in share row exclusive mode;

do $baseline_guard$
declare
  v_ledger_hash text;
  v_http_hash text;
begin
  select encode(extensions.digest(coalesce(string_agg(version::text||E'\t'||name::text,E'\n' order by version)||E'\n',''),'sha256'),'hex')
    into v_ledger_hash from supabase_migrations.schema_migrations;
  select encode(extensions.digest(coalesce(string_agg(coalesce(id::text,'')||E'\t'||to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||E'\t'||coalesce(status_code::text,'')||E'\t'||coalesce(timed_out::text,'')||E'\t'||case when error_msg is null then 'NO_ERROR' else 'ERROR' end,E'\n' order by id nulls first,created),''),'sha256'),'hex')
    into v_http_hash from net._http_response;
  if (select count(*) from supabase_migrations.schema_migrations)<>85
     or (select count(distinct version) from supabase_migrations.schema_migrations)<>85
     or (select max(version) from supabase_migrations.schema_migrations)<>'20260911120000'
     or (select count(*) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413'))<>0
     or v_ledger_hash<>'811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec'
     or (select count(*) from net.http_request_queue)<>0
     or (select count(*) from net._http_response)<>6
     or v_http_hash<>'709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8' then
    raise exception 'Phase 03B entry refused: accepted ledger or HTTP baseline changed.' using errcode='P0001';
  end if;
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
  if tg_op = 'INSERT' or tg_op = 'DELETE'
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

do $verify$
declare
  v_function_hash text;
  v_trigger_hash text;
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

  if v_function_hash <> 'bbe1c2892c5191e820a36c64933585e5172f5289945540efae79ed0ae5547ae6' or v_trigger_hash <> 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf' then
    raise exception 'Phase 03B entry refused: gate definition hash mismatch (% / %).', v_function_hash, v_trigger_hash using errcode='P0001';
  end if;
end
$verify$;

select jsonb_build_object(
  'receipt','phase03b_quiescence_entry_r2',
  'boundary_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_id',pg_catalog.txid_current(),
  'lock_wait_ms',round(extract(epoch from (pg_catalog.clock_timestamp()-current_setting('flagstone.phase03b_entry_started_at')::timestamptz))*1000,3),
  'function_oid','private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure::oid,
  'function_owner',(select pg_catalog.pg_get_userbyid(proowner) from pg_catalog.pg_proc where oid='private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure),
  'function_execute_grants',(select coalesce(jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by (case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end),a.privilege_type,a.is_grantable),'[]'::jsonb) from pg_catalog.pg_proc p, lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where p.oid='private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure),
  'function_definition_sha256','bbe1c2892c5191e820a36c64933585e5172f5289945540efae79ed0ae5547ae6',
  'trigger_oid',(select oid from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal),
  'trigger_table_owner',(select pg_catalog.pg_get_userbyid(relowner) from pg_catalog.pg_class where oid='public.flags'::pg_catalog.regclass),
  'trigger_definition_sha256','e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf',
  'trigger_enabled',(select tgenabled from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal),
  'flags_id_status_count',(select count(*) from public.flags),
  'flags_id_status_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex'),
  'history_count',(select count(*) from public.flag_status_history),
  'history_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex'),
  'ledger_count',(select count(*) from supabase_migrations.schema_migrations),
  'ledger_unique_count',(select count(distinct version) from supabase_migrations.schema_migrations),
  'ledger_latest_version',(select max(version) from supabase_migrations.schema_migrations),
  'ledger_ordered_version_name_sha256',(select encode(extensions.digest(coalesce(string_agg(version::text||E'\t'||name::text,E'\n' order by version)||E'\n',''),'sha256'),'hex') from supabase_migrations.schema_migrations),
  'phase03b_ledger_count',(select count(*) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')),
  'http_queue_count',(select count(*) from net.http_request_queue),
  'http_response_count',(select count(*) from net._http_response),
  'http_response_sha256',(select encode(extensions.digest(coalesce(string_agg(coalesce(id::text,'')||E'\t'||to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||E'\t'||coalesce(status_code::text,'')||E'\t'||coalesce(timed_out::text,'')||E'\t'||case when error_msg is null then 'NO_ERROR' else 'ERROR' end,E'\n' order by id nulls first,created),''),'sha256'),'hex') from net._http_response),
  'pre_entry_structural_snapshot_sha256','2d533d8f8bfb827fe6b63f4fb6f17035afd55b8d474260a51a20fe2c004bda01'
) as phase03b_quiescence_entry_r2;

commit;
