-- PROPOSAL ONLY. DO NOT EXECUTE WITHOUT A SEPARATE PRODUCTION-WRITE AUTHORIZATION.
-- Target when separately authorized: kldlwszpfkdmsjrjhjym only.
-- This transaction drains pre-existing public.flags writers before installing
-- an ALWAYS-enabled, status-change-only trigger. Its final SELECT is the
-- privacy-safe quiescence-boundary receipt; command success must also include
-- the COMMIT that follows it.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $guard$
begin
  if to_regnamespace('private') is null then
    raise exception 'Phase 03B quiescence precondition failed: private schema is absent.'
      using errcode = 'P0001';
  end if;
  if to_regprocedure('private.phase03b_block_flag_status_writes()') is not null then
    raise exception 'Phase 03B quiescence precondition failed: reserved function already exists.'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.flags'::pg_catalog.regclass
      and tgname = 'aaa_phase03b_status_write_quiescence'
      and not tgisinternal
  ) then
    raise exception 'Phase 03B quiescence precondition failed: reserved trigger already exists.'
      using errcode = 'P0001';
  end if;
end
$guard$;

-- SHARE ROW EXCLUSIVE conflicts with the ROW EXCLUSIVE lock taken by INSERT,
-- UPDATE, and DELETE. Acquiring it proves earlier writers have committed or
-- rolled back and prevents a new writer from crossing the installation gap.
lock table public.flags in share row exclusive mode;

create function private.phase03b_block_flag_status_writes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  raise exception 'Flag status changes are temporarily paused for maintenance. Retry after maintenance completes.'
    using errcode = 'P0001';
end
$function$;

revoke all on function private.phase03b_block_flag_status_writes()
  from public, anon, authenticated, service_role;

create trigger aaa_phase03b_status_write_quiescence
before update of status on public.flags
for each row
when (old.status is distinct from new.status)
execute function private.phase03b_block_flag_status_writes();

-- ALWAYS also covers sessions using session_replication_role = replica.
alter table public.flags
  enable always trigger aaa_phase03b_status_write_quiescence;

do $verify$
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
    raise exception 'Phase 03B quiescence installation verification failed.'
      using errcode = 'P0001';
  end if;
end
$verify$;

select jsonb_build_object(
  'receipt', 'phase03b_quiescence_boundary',
  'transaction_id', pg_catalog.txid_current(),
  'boundary_at_utc', to_char(pg_catalog.transaction_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'trigger_enabled', (
    select tgenabled
    from pg_catalog.pg_trigger
    where tgrelid = 'public.flags'::pg_catalog.regclass
      and tgname = 'aaa_phase03b_status_write_quiescence'
      and not tgisinternal
  ),
  'trigger_definition_sha256', (
    select encode(extensions.digest(pg_catalog.pg_get_triggerdef(oid, true), 'sha256'), 'hex')
    from pg_catalog.pg_trigger
    where tgrelid = 'public.flags'::pg_catalog.regclass
      and tgname = 'aaa_phase03b_status_write_quiescence'
      and not tgisinternal
  ),
  'function_definition_sha256', encode(
    extensions.digest(
      pg_catalog.pg_get_functiondef('private.phase03b_block_flag_status_writes()'::pg_catalog.regprocedure),
      'sha256'
    ),
    'hex'
  ),
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
) as phase03b_quiescence_entry;

commit;
