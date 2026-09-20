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
), row_t as (
  select t.oid,n.nspname,c.relname,pg_catalog.pg_get_userbyid(c.relowner) table_owner,t.tgname,t.tgenabled,t.tgtype,
    coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,pg_catalog.pg_get_triggerdef(t.oid,true) definition,
    pn.nspname function_schema,p.proname function_name,pg_catalog.pg_get_function_identity_arguments(p.oid) function_args
  from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
  where t.tgrelid='public.flags'::pg_catalog.regclass and t.tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not t.tgisinternal
), truncate_t as (
  select t.oid,n.nspname,c.relname,pg_catalog.pg_get_userbyid(c.relowner) table_owner,t.tgname,t.tgenabled,t.tgtype,
    coalesce(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,true),'') condition,pg_catalog.pg_get_triggerdef(t.oid,true) definition,
    pn.nspname function_schema,p.proname function_name,pg_catalog.pg_get_function_identity_arguments(p.oid) function_args
  from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
  where t.tgrelid='public.flags'::pg_catalog.regclass and t.tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not t.tgisinternal
)
select jsonb_build_object(
  'receipt','phase03b_quiescence_proof_r3','transaction_read_only',current_setting('transaction_read_only'),
  'captured_at_utc',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'backend_pid',pg_catalog.pg_backend_pid(),'table_oid','public.flags'::pg_catalog.regclass::oid,
  'function_count',(select count(*) from f),'function_oid',(select oid from f),'function_owner',(select owner_name from f),
  'function_execute_grants',(select acl from f),
  'function_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'name',proname,'identity_args',identity_args,'owner',owner_name,'language',lanname,'security_definer',prosecdef,'volatility',provolatile,'config',config,'acl',acl,'definition',definition)::text,'sha256'),'hex') from f),
  'trigger_count',(select count(*) from row_t),'trigger_oid',(select oid from row_t),'trigger_table_owner',(select table_owner from row_t),'trigger_enabled',(select tgenabled from row_t),
  'trigger_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') from row_t),
  'truncate_trigger_count',(select count(*) from truncate_t),'truncate_trigger_oid',(select oid from truncate_t),'truncate_trigger_table_oid','public.flags'::pg_catalog.regclass::oid,'truncate_trigger_enabled',(select tgenabled from truncate_t),
  'truncate_trigger_definition_sha256',(select encode(extensions.digest(jsonb_build_object('schema',nspname,'table',relname,'table_owner',table_owner,'name',tgname,'enabled',tgenabled,'type',tgtype,'condition',condition,'definition',definition,'function_schema',function_schema,'function_name',function_name,'function_args',function_args)::text,'sha256'),'hex') from truncate_t),
  'flags_id_status_count',(select count(*) from public.flags),
  'flags_id_status_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||status::text,E'\n' order by id) from public.flags),''),'sha256'),'hex'),
  'history_count',(select count(*) from public.flag_status_history),
  'history_sha256',encode(extensions.digest(coalesce((select string_agg(id::text||E'\t'||flag_id::text||E'\t'||coalesce(from_status,'')||E'\t'||to_status||E'\t'||to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),E'\n' order by created_at,id) from public.flag_status_history),''),'sha256'),'hex'),
  'ledger_count',(select count(*) from supabase_migrations.schema_migrations),'ledger_unique_count',(select count(distinct version) from supabase_migrations.schema_migrations),'ledger_latest_version',(select max(version) from supabase_migrations.schema_migrations),
  'ledger_ordered_version_name_sha256',(select encode(extensions.digest(coalesce(string_agg(version::text||E'\t'||name::text,E'\n' order by version)||E'\n',''),'sha256'),'hex') from supabase_migrations.schema_migrations),
  'phase03b_versions',(select coalesce(jsonb_agg(version order by version),'[]'::jsonb) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')),
  'phase03b_rows',(select coalesce(jsonb_agg(jsonb_build_object(
    'version',version,
    'name',name,
    'statement_count',cardinality(statements),
    'statement_sha256',case
      when statements is null or array_position(statements,null) is not null then null
      else encode(extensions.digest(coalesce((
        select string_agg(octet_length(convert_to(statement,'UTF8'))::text||':'||statement,'' order by ordinality)
        from unnest(statements) with ordinality as ordered_statement(statement,ordinality)
      ),''),'sha256'),'hex')
    end
  ) order by version),'[]'::jsonb) from supabase_migrations.schema_migrations where version in ('20260915210256','20260915210413')),
  'phase03b_constraint_index_sha256',(with objects as (
    select 'constraint' kind,n.nspname schema_name,c.relname relation_name,con.conname object_name,pg_catalog.pg_get_constraintdef(con.oid,true) definition
    from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and (c.relname in ('flag_moderation_events','flag_point_reward_claims','comment_reward_daily','comment_vote_reward_counts') or con.conname in ('flags_last_moderation_reason_code_vocabulary','feedback_moderation_resolution_vocabulary','feedback_moderation_action_intent_vocabulary','feedback_moderation_reason_code_vocabulary','feedback_moderation_review_pairing','feedback_reject_reason_pairing'))
    union all select 'index',schemaname,tablename,indexname,indexdef from pg_catalog.pg_indexes where schemaname='public' and (tablename in ('flag_moderation_events','flag_point_reward_claims','comment_reward_daily','comment_vote_reward_counts') or indexname in ('feedback_moderation_open_idx','flag_moderation_events_one_reversal_idx','flag_moderation_events_flag_created_idx','flag_moderation_events_report_reject_idx'))
  ) select encode(extensions.digest(coalesce(string_agg(kind||E'\t'||schema_name||E'\t'||relation_name||E'\t'||object_name||E'\t'||definition,E'\n' order by kind,schema_name,relation_name,object_name),''),'sha256'),'hex') from objects),
  'database_t0',to_char('2026-09-20T06:20:25.216974Z'::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'pg_net_ttl',current_setting('pg_net.ttl', true),
  'pg_net_ttl_seconds',extract(epoch from current_setting('pg_net.ttl')::interval)::bigint,
  'http_queue_count',(select count(*) from net.http_request_queue),'http_response_count',(select count(*) from net._http_response),
  'http_response_sha256',(select encode(extensions.digest(coalesce(string_agg(coalesce(id::text,'')||E'\t'||to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||E'\t'||coalesce(status_code::text,'')||E'\t'||coalesce(timed_out::text,'')||E'\t'||case when error_msg is null then 'NO_ERROR' else 'ERROR' end,E'\n' order by id nulls first,created),''),'sha256'),'hex') from net._http_response),
  'http_response_new_since_t0_count',(select count(*) from net._http_response where created >= '2026-09-20T06:20:25.216974Z'::timestamptz)
) as phase03b_quiescence_proof_r3;
rollback;
