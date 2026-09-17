-- PROPOSAL ONLY. DO NOT EXECUTE WITHOUT A SEPARATE PRODUCTION-WRITE AUTHORIZATION.
-- Run only after every post-apply gate passes and the final quiescence proof's
-- status count/fingerprints exactly equal the entry receipt.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

lock table public.flags in share row exclusive mode;

do $guard$
declare
  v_trigger_count integer;
  v_function_count integer;
begin
  select count(*) into v_trigger_count
  from pg_catalog.pg_trigger
  where tgrelid = 'public.flags'::pg_catalog.regclass
    and tgname = 'aaa_phase03b_status_write_quiescence'
    and not tgisinternal
    and tgenabled = 'A';

  select count(*) into v_function_count
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'phase03b_block_flag_status_writes'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
    and not p.prosecdef
    and p.proconfig = array['search_path=""'];

  if v_trigger_count <> 1 or v_function_count <> 1 then
    raise exception 'Phase 03B quiescence exit refused: gate identity is not exact.'
      using errcode = 'P0001';
  end if;
end
$guard$;

-- Fail closed on the minimum independently checkable post-apply contract. The
-- fuller catalog/authorization comparison and Edge Function identity check are
-- external prerequisites to invoking this file; this block prevents an
-- accidental gate removal when the core database result or HTTP baseline is
-- visibly wrong.
do $post_apply_guard$
declare
  v_http_fingerprint text;
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 87
     or (select count(*) from supabase_migrations.schema_migrations
         where version in ('20260915210256', '20260915210413')) <> 2
     or (select max(version) from supabase_migrations.schema_migrations) <> '20260915210413' then
    raise exception 'Phase 03B quiescence exit refused: migration ledger mismatch.'
      using errcode = 'P0001';
  end if;

  if not has_column_privilege('authenticated', 'public.flags', 'status', 'UPDATE')
     or has_column_privilege('anon', 'public.flags', 'status', 'UPDATE')
     or not has_function_privilege(
       'authenticated',
       'public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.moderate_report(uuid,text,public.flag_status,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.moderate_report(uuid,text,public.flag_status,text)',
       'EXECUTE'
     ) then
    raise exception 'Phase 03B quiescence exit refused: status authorization mismatch.'
      using errcode = 'P0001';
  end if;

  if to_regclass('public.flag_moderation_events') is null
     or to_regclass('public.flag_point_reward_claims') is null
     or to_regclass('public.comment_reward_daily') is null
     or to_regclass('public.comment_vote_reward_counts') is null
     or not exists (
       select 1 from pg_catalog.pg_trigger
       where tgrelid = 'public.flags'::pg_catalog.regclass
         and tgname = 'flag_status_transition_guard'
         and not tgisinternal and tgenabled in ('O', 'A')
     )
     or not exists (
       select 1 from pg_catalog.pg_trigger
       where tgrelid = 'public.flags'::pg_catalog.regclass
         and tgname = 'flag_status_compatibility_bridge_guard'
         and not tgisinternal and tgenabled in ('O', 'A')
     )
     or position(
       'flag_point_reward_claims' in
       pg_catalog.pg_get_functiondef('public.handle_flag_status_change()'::pg_catalog.regprocedure)
     ) = 0
     or position(
       'flag_spam_penalty' in
       pg_catalog.pg_get_functiondef('public.handle_flag_status_change()'::pg_catalog.regprocedure)
     ) <> 0 then
    raise exception 'Phase 03B quiescence exit refused: moderation/points structure mismatch.'
      using errcode = 'P0001';
  end if;

  if not exists (
       select 1 from pg_catalog.pg_policy
       where polrelid = 'public.flags'::pg_catalog.regclass
         and polname = 'flags rejected hidden from anon'
     )
     or not exists (
       select 1 from pg_catalog.pg_policy
       where polrelid = 'public.flags'::pg_catalog.regclass
         and polname = 'flags rejected hidden from nonadmins'
         and not polpermissive
     )
     or position(
       'photo_alt' in
       pg_catalog.pg_get_functiondef('public.enforce_flag_status_only_for_non_owner()'::pg_catalog.regprocedure)
     ) = 0 then
    raise exception 'Phase 03B quiescence exit refused: visibility/photo_alt boundary mismatch.'
      using errcode = 'P0001';
  end if;

  select encode(
    extensions.digest(
      coalesce(string_agg(
        coalesce(id::text, '') || E'\t' ||
        to_char(created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || E'\t' ||
        coalesce(status_code::text, '') || E'\t' ||
        coalesce(timed_out::text, '') || E'\t' ||
        case when error_msg is null then 'NO_ERROR' else 'ERROR' end,
        E'\n' order by id nulls first, created
      ), ''),
      'sha256'
    ),
    'hex'
  ) into v_http_fingerprint
  from net._http_response;

  if (select count(*) from net.http_request_queue) <> 0
     or (select count(*) from net._http_response) <> 6
     or v_http_fingerprint <> '709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8' then
    raise exception 'Phase 03B quiescence exit refused: accepted HTTP baseline changed.'
      using errcode = 'P0001';
  end if;
end
$post_apply_guard$;

-- Capture the last still-quiesced state while the draining lock is held.
select jsonb_build_object(
  'receipt', 'phase03b_quiescence_pre_exit',
  'captured_at_utc', to_char(pg_catalog.clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'flags_status_count', (select count(*) from public.flags),
  'flags_status_fingerprint', encode(
    extensions.digest(
      coalesce((
        select string_agg(id::text || E'\t' || status::text, E'\n' order by id)
        from public.flags
      ), ''),
      'sha256'
    ),
    'hex'
  ),
  'status_history_count', (select count(*) from public.flag_status_history),
  'status_history_fingerprint', encode(
    extensions.digest(
      coalesce((
        select string_agg(
          id::text || E'\t' || flag_id::text || E'\t' ||
          coalesce(from_status, '') || E'\t' || to_status || E'\t' ||
          to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          E'\n' order by created_at, id
        )
        from public.flag_status_history
      ), ''),
      'sha256'
    ),
    'hex'
  )
) as phase03b_quiescence_pre_exit;

drop trigger aaa_phase03b_status_write_quiescence on public.flags;
drop function private.phase03b_block_flag_status_writes();

do $verify$
begin
  if exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.flags'::pg_catalog.regclass
      and tgname = 'aaa_phase03b_status_write_quiescence'
      and not tgisinternal
  ) or to_regprocedure('private.phase03b_block_flag_status_writes()') is not null then
    raise exception 'Phase 03B quiescence exit verification failed.'
      using errcode = 'P0001';
  end if;
end
$verify$;

commit;
