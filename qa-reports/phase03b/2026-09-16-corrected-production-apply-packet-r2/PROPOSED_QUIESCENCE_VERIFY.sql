-- PROPOSAL ONLY. Read-only proof while the separately authorized gate is active.
begin transaction read only;
with f as (
  select p.oid,n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) identity_args,
    pg_catalog.pg_get_userbyid(p.proowner) owner_name,l.lanname,p.prosecdef,p.provolatile,
    coalesce((select jsonb_agg(x order by x::text) from unnest(coalesce(p.proconfig,array[]::text[])) x),'[]'::jsonb) config,
    coalesce((select jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by (case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end),a.privilege_type,a.is_grantable) from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a),'[]'::jsonb) acl,
    pg_catalog.pg_get_functiondef(p.oid) definition
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace join pg_catalog.pg_language l on l.oid=p.prolang
  where n.nspname='private' and p.proname='flagstone_phase03b_block_row_lifecycle_r2' and pg_catalog.pg_get_function_identity_arguments(p.oid)=''
), t as (
  select t.oid,n.nspname,c.relname,pg_catalog.pg_get_userbyid(c.relowner) table_owner,t.tgname,t.tgenabled,t.tgtype,
    coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,pg_catalog.pg_get_triggerdef(t.oid,true) definition,
    pn.nspname function_schema,p.proname function_name,pg_catalog.pg_get_function_identity_arguments(p.oid) function_args
  from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
  where t.tgrelid='public.flags'::pg_catalog.regclass and t.tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not t.tgisinternal
)
select jsonb_build_object(
  'receipt','phase03b_quiescence_proof_r2','transaction_read_only',current_setting('transaction_read_only'),
  'captured_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'function_count',(select count(*) from f),'function_oid',(select oid from f),'function_owner',(select owner_name from f),
  'function_execute_grants',(select acl from f),
  'function_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'name',proname,'identity_args',identity_args,'owner',owner_name,'language',lanname,'security_definer',prosecdef,'volatility',provolatile,'config',config,'acl',acl,'definition',definition)::text,'sha256'),'hex') from f),
  'trigger_count',(select count(*) from t),'trigger_oid',(select oid from t),'trigger_table_owner',(select table_owner from t),'trigger_enabled',(select tgenabled from t),
  'trigger_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') from t),
  'flags_id_status_count',(select count(*) from public.flags),
  'flags_id_status_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex'),
  'history_count',(select count(*) from public.flag_status_history),
  'history_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex'),
  'ledger_count',(select count(*) from supabase_migrations.schema_migrations),
  'phase03b_versions',(select coalesce(jsonb_agg(version order by version),'[]'::jsonb) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')),
  'http_queue_count',(select count(*) from net.http_request_queue),'http_response_count',(select count(*) from net._http_response)
) as phase03b_quiescence_proof_r2;
rollback;
