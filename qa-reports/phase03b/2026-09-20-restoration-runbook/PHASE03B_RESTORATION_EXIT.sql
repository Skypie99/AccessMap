-- PROPOSAL ONLY. A separate production-write authorization is required.
-- This deterministic template must be materialized by generate_exit_sql.mjs
-- from the committed entry receipt. Do not hand-edit generated output.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.flags in share row exclusive mode;

do $guard$
declare
  v_function_hash text;
  v_trigger_hash text;
  v_truncate_trigger_hash text;
begin
  if current_user <> 'postgres' then raise exception 'Phase 03B exit refused: owner mismatch.' using errcode='P0001'; end if;
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='flagstone_phase03b_block_row_lifecycle_r2' and pg_catalog.pg_get_function_identity_arguments(p.oid)='') <> 1
     or (select count(*) from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname in ('aaa_flagstone_phase03b_row_lifecycle_quiescence_r2','aaa_flagstone_phase03b_truncate_quiescence_r3') and not tgisinternal) <> 2 then
    raise exception 'Phase 03B exit refused: reserved-object cardinality mismatch.' using errcode='P0001';
  end if;
  if 'private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure::oid <> 20772
     or (select oid from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal) <> 20773
     or (select oid from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not tgisinternal) <> 20774
     or (select pg_catalog.pg_get_userbyid(proowner) from pg_catalog.pg_proc where oid='private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure) <> 'postgres'
     or (select pg_catalog.pg_get_userbyid(relowner) from pg_catalog.pg_class where oid='public.flags'::pg_catalog.regclass) <> 'postgres'
     or (select tgenabled from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal) <> 'A' then
    raise exception 'Phase 03B exit refused: row gate OID, owner, or enable state changed.' using errcode='P0001';
  end if;
  if (select tgenabled from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not tgisinternal) <> 'A' then
    raise exception 'Phase 03B exit refused: OID, owner, or enable state changed.' using errcode='P0001';
  end if;

  with f as (
    select p.oid,n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) identity_args,pg_catalog.pg_get_userbyid(p.proowner) owner_name,l.lanname,p.prosecdef,p.provolatile,
      coalesce((select jsonb_agg(x order by x::text) from unnest(coalesce(p.proconfig,array[]::text[])) x),'[]'::jsonb) config,
      coalesce((select jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by (case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end),a.privilege_type,a.is_grantable) from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a),'[]'::jsonb) acl,
      pg_catalog.pg_get_functiondef(p.oid) definition
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace join pg_catalog.pg_language l on l.oid=p.prolang where p.oid='private.flagstone_phase03b_block_row_lifecycle_r2()'::pg_catalog.regprocedure
  ) select encode(extensions.digest(jsonb_build_object('schema',nspname,'name',proname,'identity_args',identity_args,'owner',owner_name,'language',lanname,'security_definer',prosecdef,'volatility',provolatile,'config',config,'acl',acl,'definition',definition)::text,'sha256'),'hex') into v_function_hash from f;
  with t as (
    select t.oid,n.nspname,c.relname,pg_catalog.pg_get_userbyid(c.relowner) table_owner,t.tgname,t.tgenabled,t.tgtype,coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,pg_catalog.pg_get_triggerdef(t.oid,true) definition,pn.nspname function_schema,p.proname function_name,pg_catalog.pg_get_function_identity_arguments(p.oid) function_args
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
    where t.tgrelid='public.flags'::pg_catalog.regclass and t.tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not t.tgisinternal
  ) select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') into v_trigger_hash from t;
  with t as (
    select t.oid,n.nspname,c.relname,pg_catalog.pg_get_userbyid(c.relowner) table_owner,t.tgname,t.tgenabled,t.tgtype,coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,pg_catalog.pg_get_triggerdef(t.oid,true) definition,pn.nspname function_schema,p.proname function_name,pg_catalog.pg_get_function_identity_arguments(p.oid) function_args
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
    where t.tgrelid='public.flags'::pg_catalog.regclass and t.tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not t.tgisinternal
  ) select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') into v_truncate_trigger_hash from t;
  if v_function_hash <> '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac'
     or v_trigger_hash <> 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf'
     or v_truncate_trigger_hash <> '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a'
     or v_function_hash <> '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac' or v_trigger_hash <> 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf'
     or v_truncate_trigger_hash <> '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a' then
    raise exception 'Phase 03B exit refused: gate definition changed.' using errcode='P0001';
  end if;

  if (select count(*) from public.flags) <> 24
     or encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex') <> 'b3b517e8fe5b996d7108d09e6d3fdfaa6143b92fe6c2501ef83f249b5fd0942e'
     or (select count(*) from public.flag_status_history) <> 49
     or encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex') <> 'f8533cc1f34588b0556027d759767e4cd1fbdd960071ec16354cd82e37e874f7' then
    raise exception 'Phase 03B exit refused: entry-to-exit invariant changed.' using errcode='P0001';
  end if;

  if (select count(*) from supabase_migrations.schema_migrations) <> 87
     or (select count(distinct version) from supabase_migrations.schema_migrations) <> 87
     or (select coalesce(string_agg(version,',' order by version),'') from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')) <> '20260915210256,20260915210413'
     or (select max(version) from supabase_migrations.schema_migrations) <> '20260915210413' then
    raise exception 'Phase 03B exit refused: migration ledger mismatch.' using errcode='P0001';
  end if;
  if to_regclass('public.flag_moderation_events') is null or to_regclass('public.flag_point_reward_claims') is null
     or to_regclass('public.comment_reward_daily') is null or to_regclass('public.comment_vote_reward_counts') is null
     or to_regprocedure('public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)') is null
     or to_regprocedure('public.moderate_report(uuid,text,public.flag_status,text)') is null
     or not has_column_privilege('authenticated','public.flags','status','UPDATE') or has_column_privilege('anon','public.flags','status','UPDATE')
     or not has_function_privilege('authenticated','public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)','EXECUTE')
     or has_function_privilege('anon','public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)','EXECUTE')
     or position('photo_alt' in pg_catalog.pg_get_functiondef('public.enforce_flag_status_only_for_non_owner()'::pg_catalog.regprocedure))=0
     or position('flag_point_reward_claims' in pg_catalog.pg_get_functiondef('public.handle_flag_status_change()'::pg_catalog.regprocedure))=0
     or position('flag_spam_penalty' in pg_catalog.pg_get_functiondef('public.handle_flag_status_change()'::pg_catalog.regprocedure))<>0 then
    raise exception 'Phase 03B exit refused: structural/authorization semantics mismatch.' using errcode='P0001';
  end if;
  if current_setting('pg_net.ttl', true) is null
     or extract(epoch from current_setting('pg_net.ttl')::interval) <= 600
     or (select count(*) from net.http_request_queue) <> 0
     or (select count(*) from net._http_response where created >= '2026-09-20T06:20:25.216974Z'::timestamptz) <> 0 then
    raise exception 'Phase 03B exit refused: run-relative pg_net invariant failed.' using errcode='P0001';
  end if;
end
$guard$;

select jsonb_build_object('receipt','phase03b_quiescence_pre_exit_r3','captured_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'database_t0',to_char('2026-09-20T06:20:25.216974Z'::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'pg_net_ttl',current_setting('pg_net.ttl', true),'pg_net_ttl_seconds',extract(epoch from current_setting('pg_net.ttl')::interval)::bigint,'http_queue_count',(select count(*) from net.http_request_queue),'http_response_count',(select count(*) from net._http_response),'http_response_sha256',(select encode(extensions.digest(coalesce(string_agg(coalesce(id::text,'')||E'\t'||to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||E'\t'||coalesce(status_code::text,'')||E'\t'||coalesce(timed_out::text,'')||E'\t'||case when error_msg is null then 'NO_ERROR' else 'ERROR' end,E'\n' order by id nulls first,created),''),'sha256'),'hex') from net._http_response),'http_response_new_since_t0_count',(select count(*) from net._http_response where created >= '2026-09-20T06:20:25.216974Z'::timestamptz),'function_oid',20772,'trigger_oid',20773,'truncate_trigger_oid',20774,'flags_count',24,'flags_sha256','b3b517e8fe5b996d7108d09e6d3fdfaa6143b92fe6c2501ef83f249b5fd0942e','history_count',49,'history_sha256','f8533cc1f34588b0556027d759767e4cd1fbdd960071ec16354cd82e37e874f7') as phase03b_quiescence_pre_exit_r3;

drop trigger aaa_flagstone_phase03b_truncate_quiescence_r3 on public.flags;
drop trigger aaa_flagstone_phase03b_row_lifecycle_quiescence_r2 on public.flags;
drop function private.flagstone_phase03b_block_row_lifecycle_r2();

do $absence$
begin
  if to_regprocedure('private.flagstone_phase03b_block_row_lifecycle_r2()') is not null
     or exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.flags'::pg_catalog.regclass and tgname in ('aaa_flagstone_phase03b_row_lifecycle_quiescence_r2','aaa_flagstone_phase03b_truncate_quiescence_r3') and not tgisinternal) then
    raise exception 'Phase 03B exit refused: exact object removal did not complete.' using errcode='P0001';
  end if;
end
$absence$;
commit;
