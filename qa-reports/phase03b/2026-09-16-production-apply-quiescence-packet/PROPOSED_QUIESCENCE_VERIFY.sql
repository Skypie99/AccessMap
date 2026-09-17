-- PROPOSAL ONLY. READ-ONLY proof query for a future separately authorized run.
-- Compare the status count/fingerprints byte-for-byte with the entry receipt.

begin transaction read only;

select jsonb_build_object(
  'receipt', 'phase03b_quiescence_proof',
  'captured_at_utc', to_char(pg_catalog.clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only', current_setting('transaction_read_only'),
  'trigger_count', (
    select count(*)
    from pg_catalog.pg_trigger
    where tgrelid = 'public.flags'::pg_catalog.regclass
      and tgname = 'aaa_phase03b_status_write_quiescence'
      and not tgisinternal
  ),
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
  'function_count', (
    select count(*)
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'phase03b_block_flag_status_writes'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
  ),
  'function_definition_sha256', case
    when to_regprocedure('private.phase03b_block_flag_status_writes()') is null then null
    else encode(
      extensions.digest(
        pg_catalog.pg_get_functiondef('private.phase03b_block_flag_status_writes()'::pg_catalog.regprocedure),
        'sha256'
      ),
      'hex'
    )
  end,
  'function_public_execute', case
    when to_regprocedure('private.phase03b_block_flag_status_writes()') is null then null
    else exists (
      select 1
      from pg_catalog.pg_proc p,
           lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
      where p.oid = 'private.phase03b_block_flag_status_writes()'::pg_catalog.regprocedure
        and acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    )
  end,
  'function_anon_execute', case
    when to_regprocedure('private.phase03b_block_flag_status_writes()') is null then null
    else has_function_privilege('anon', 'private.phase03b_block_flag_status_writes()', 'EXECUTE')
  end,
  'function_authenticated_execute', case
    when to_regprocedure('private.phase03b_block_flag_status_writes()') is null then null
    else has_function_privilege('authenticated', 'private.phase03b_block_flag_status_writes()', 'EXECUTE')
  end,
  'function_service_role_execute', case
    when to_regprocedure('private.phase03b_block_flag_status_writes()') is null then null
    else has_function_privilege('service_role', 'private.phase03b_block_flag_status_writes()', 'EXECUTE')
  end,
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
) as phase03b_quiescence_proof;

rollback;
