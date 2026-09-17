-- PROPOSAL ONLY. Concrete read-only server-state capture for ambiguous client outcomes.
-- It captures no row payloads or query text and pins every temporary gate definition.
begin transaction read only;
with f as (
  select p.oid,n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) identity_args,
    pg_catalog.pg_get_userbyid(p.proowner) owner_name,l.lanname,p.prosecdef,p.provolatile,
    coalesce((select jsonb_agg(x order by x::text) from unnest(coalesce(p.proconfig,array[]::text[])) x),'[]'::jsonb) config,
    coalesce((select jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by (case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end),a.privilege_type,a.is_grantable) from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a),'[]'::jsonb) acl,
    pg_catalog.pg_get_functiondef(p.oid) definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  join pg_catalog.pg_language l on l.oid=p.prolang
  where n.nspname='private' and p.proname='flagstone_phase03b_block_row_lifecycle_r2'
    and pg_catalog.pg_get_function_identity_arguments(p.oid)=''
), row_t as (
  select t.oid,t.tgrelid table_oid,t.tgfoid function_oid,n.nspname,c.relname,
    pg_catalog.pg_get_userbyid(c.relowner) table_owner,t.tgname,t.tgenabled,t.tgtype,
    coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,
    pg_catalog.pg_get_triggerdef(t.oid,true) definition,pn.nspname function_schema,p.proname function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) function_args,
    case when (t.tgtype::int & 2)<>0 then 'BEFORE' when (t.tgtype::int & 64)<>0 then 'INSTEAD OF' else 'AFTER' end timing,
    case when (t.tgtype::int & 1)<>0 then 'ROW' else 'STATEMENT' end level,
    (select coalesce(jsonb_agg(event order by ordinal),'[]'::jsonb) from (values
      (1,'INSERT',(t.tgtype::int & 4)<>0),(2,'DELETE',(t.tgtype::int & 8)<>0),
      (3,'UPDATE',(t.tgtype::int & 16)<>0),(4,'TRUNCATE',(t.tgtype::int & 32)<>0)
    ) e(ordinal,event,present) where present) events,
    (select coalesce(jsonb_agg(a.attname order by a.attnum),'[]'::jsonb)
      from pg_catalog.pg_attribute a where a.attrelid=t.tgrelid and a.attnum=any(t.tgattr)) update_columns
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid=t.tgrelid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_proc p on p.oid=t.tgfoid
  join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
  where n.nspname='public' and c.relname='flags'
    and t.tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not t.tgisinternal
), truncate_t as (
  select t.oid,t.tgrelid table_oid,t.tgfoid function_oid,n.nspname,c.relname,
    pg_catalog.pg_get_userbyid(c.relowner) table_owner,t.tgname,t.tgenabled,t.tgtype,
    coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,
    pg_catalog.pg_get_triggerdef(t.oid,true) definition,pn.nspname function_schema,p.proname function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) function_args,
    case when (t.tgtype::int & 2)<>0 then 'BEFORE' when (t.tgtype::int & 64)<>0 then 'INSTEAD OF' else 'AFTER' end timing,
    case when (t.tgtype::int & 1)<>0 then 'ROW' else 'STATEMENT' end level,
    (select coalesce(jsonb_agg(event order by ordinal),'[]'::jsonb) from (values
      (1,'INSERT',(t.tgtype::int & 4)<>0),(2,'DELETE',(t.tgtype::int & 8)<>0),
      (3,'UPDATE',(t.tgtype::int & 16)<>0),(4,'TRUNCATE',(t.tgtype::int & 32)<>0)
    ) e(ordinal,event,present) where present) events,
    (select coalesce(jsonb_agg(a.attname order by a.attnum),'[]'::jsonb)
      from pg_catalog.pg_attribute a where a.attrelid=t.tgrelid and a.attnum=any(t.tgattr)) update_columns
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid=t.tgrelid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_proc p on p.oid=t.tgfoid
  join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
  where n.nspname='public' and c.relname='flags'
    and t.tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not t.tgisinternal
)
select jsonb_build_object(
  'receipt','phase03b_server_state_r6',
  'captured_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only',current_setting('transaction_read_only'),
  'candidate_backends',coalesce((select jsonb_agg(jsonb_build_object('pid',pid,'usename',usename,'application_name',application_name,'state',state,'wait_event_type',wait_event_type,'wait_event',wait_event,'xact_start',xact_start,'query_start',query_start) order by pid) from pg_catalog.pg_stat_activity where datname=current_database() and usename='postgres' and pid<>pg_backend_pid() and state<>'idle'),'[]'::jsonb),
  'ledger_count',(select count(*) from supabase_migrations.schema_migrations),
  'ledger_unique_count',(select count(distinct version) from supabase_migrations.schema_migrations),
  'ledger_latest_version',(select max(version) from supabase_migrations.schema_migrations),
  'ledger_ordered_version_name_sha256',(select encode(extensions.digest(coalesce(string_agg(version::text||E'\t'||name::text,E'\n' order by version)||E'\n',''),'sha256'),'hex') from supabase_migrations.schema_migrations),
  'phase03b_versions',(select coalesce(jsonb_agg(version order by version),'[]'::jsonb) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')),
  'table_oid','public.flags'::pg_catalog.regclass::oid,'table_schema','public','table_name','flags',
  'table_owner',(select pg_catalog.pg_get_userbyid(relowner) from pg_catalog.pg_class where oid='public.flags'::pg_catalog.regclass),
  'function_count',(select count(*) from f),'function_oid',(select oid from f),'function_schema',(select nspname from f),
  'function_name',(select proname from f),'function_identity_arguments',(select identity_args from f),
  'function_owner',(select owner_name from f),'function_language',(select lanname from f),
  'function_security_definer',(select prosecdef from f),'function_volatility',(select provolatile from f),
  'function_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'name',proname,'identity_args',identity_args,'owner',owner_name,'language',lanname,'security_definer',prosecdef,'volatility',provolatile,'config',config,'acl',acl,'definition',definition)::text,'sha256'),'hex') from f)
) || jsonb_build_object(
  'row_trigger_count',(select count(*) from row_t),'row_trigger_oid',(select oid from row_t),
  'row_trigger_schema',(select nspname from row_t),'row_trigger_table',(select relname from row_t),
  'row_trigger_table_oid',(select table_oid from row_t),'row_trigger_table_owner',(select table_owner from row_t),
  'row_trigger_name',(select tgname from row_t),'row_trigger_enabled',(select tgenabled from row_t),
  'row_trigger_tgtype',(select tgtype::int from row_t),'row_trigger_timing',(select timing from row_t),
  'row_trigger_level',(select level from row_t),'row_trigger_events',(select events from row_t),
  'row_trigger_update_columns',(select update_columns from row_t),'row_trigger_function_oid',(select function_oid from row_t),
  'row_trigger_function_identity',(select function_schema||'.'||function_name||'('||function_args||')' from row_t),
  'row_trigger_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') from row_t),
  'truncate_trigger_count',(select count(*) from truncate_t),'truncate_trigger_oid',(select oid from truncate_t),
  'truncate_trigger_schema',(select nspname from truncate_t),'truncate_trigger_table',(select relname from truncate_t),
  'truncate_trigger_table_oid',(select table_oid from truncate_t),'truncate_trigger_table_owner',(select table_owner from truncate_t),
  'truncate_trigger_name',(select tgname from truncate_t),'truncate_trigger_enabled',(select tgenabled from truncate_t),
  'truncate_trigger_tgtype',(select tgtype::int from truncate_t),'truncate_trigger_timing',(select timing from truncate_t),
  'truncate_trigger_level',(select level from truncate_t),'truncate_trigger_events',(select events from truncate_t),
  'truncate_trigger_update_columns',(select update_columns from truncate_t),'truncate_trigger_function_oid',(select function_oid from truncate_t),
  'truncate_trigger_function_identity',(select function_schema||'.'||function_name||'('||function_args||')' from truncate_t),
  'truncate_trigger_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') from truncate_t)
) || jsonb_build_object(
  'flags_id_status_count',(select count(*) from public.flags),
  'flags_id_status_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex'),
  'history_count',(select count(*) from public.flag_status_history),
  'history_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex'),
  'phase03b_constraint_index_sha256',(with objects as (
    select 'constraint' kind,n.nspname schema_name,c.relname relation_name,con.conname object_name,pg_catalog.pg_get_constraintdef(con.oid,true) definition
    from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and (c.relname in ('flag_moderation_events','flag_point_reward_claims','comment_reward_daily','comment_vote_reward_counts') or con.conname in ('flags_last_moderation_reason_code_vocabulary','feedback_moderation_resolution_vocabulary','feedback_moderation_action_intent_vocabulary','feedback_moderation_reason_code_vocabulary','feedback_moderation_review_pairing','feedback_reject_reason_pairing'))
    union all select 'index',schemaname,tablename,indexname,indexdef from pg_catalog.pg_indexes where schemaname='public' and (tablename in ('flag_moderation_events','flag_point_reward_claims','comment_reward_daily','comment_vote_reward_counts') or indexname in ('feedback_moderation_open_idx','flag_moderation_events_one_reversal_idx','flag_moderation_events_flag_created_idx','flag_moderation_events_report_reject_idx'))
  ) select encode(extensions.digest(coalesce(string_agg(kind||E'\t'||schema_name||E'\t'||relation_name||E'\t'||object_name||E'\t'||definition,E'\n' order by kind,schema_name,relation_name,object_name),''),'sha256'),'hex') from objects),
  'http_queue_count',(select count(*) from net.http_request_queue),
  'http_response_count',(select count(*) from net._http_response),
  'http_response_sha256',(select encode(extensions.digest(coalesce(string_agg(coalesce(id::text,'')||E'\t'||to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||E'\t'||coalesce(status_code::text,'')||E'\t'||coalesce(timed_out::text,'')||E'\t'||case when error_msg is null then 'NO_ERROR' else 'ERROR' end,E'\n' order by id nulls first,created),''),'sha256'),'hex') from net._http_response)
) as phase03b_server_state_r6;
rollback;
