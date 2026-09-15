-- PGTAP_KIND: fixture
-- FDA-028 hosted harness read-only pre/post state. Never returns Vault material.
SELECT json_build_object(
  'ledger_count', (SELECT count(*) FROM supabase_migrations.schema_migrations),
  'ledger_latest', (SELECT max(version) FROM supabase_migrations.schema_migrations),
  'ledger_sha256', (
    SELECT encode(
      extensions.digest(
        string_agg(version || E'\t' || name || E'\n', '' ORDER BY version, name)::bytea,
        'sha256'
      ),
      'hex'
    )
    FROM supabase_migrations.schema_migrations
  ),
  'flags', (SELECT count(*) FROM public.flags),
  'buckets', (SELECT count(*) FROM limiter.bucket),
  'grants', (SELECT count(*) FROM limiter.grant),
  'helpers', (
    SELECT count(*)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'pass'
  ),
  'queued_http', (SELECT count(*) FROM net.http_request_queue),
  'vault_secret_rows', (
    SELECT count(*) FROM vault.secrets WHERE name = 'fda028_limiter_epoch_key'
  ),
  'vault_key_bytes', octet_length(limiter.read_epoch_key()),
  'dev_key_material_exists', to_regclass('limiter.dev_key_material') IS NOT NULL,
  'key_state', (
    SELECT json_build_object(
      'id', id,
      'epoch', epoch,
      'reseed_anchor', reseed_anchor,
      'window_seconds', window_seconds
    )
    FROM limiter.key_state
    WHERE id
  ),
  'config', (
    SELECT json_build_object(
      'id', id,
      'enabled', enabled,
      'catchup_cap', catchup_cap,
      'ipv4_prefix', ipv4_prefix,
      'ipv6_prefix', ipv6_prefix,
      'window_seconds', window_seconds,
      'reseed_interval', reseed_interval,
      'bucket_allowance', bucket_allowance,
      'normal_allowance', normal_allowance,
      'require_public_ip', require_public_ip,
      'retention_windows', retention_windows
    )
    FROM limiter.config
    WHERE id
  ),
  'function_contract', json_build_object(
    'clockless_flag', to_regprocedure(
      'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)'
    ) IS NOT NULL,
    'clocked_flag', to_regprocedure(
      'limiter.admit_guest_flag_at(text,uuid,double precision,double precision,text,integer,text,timestamptz)'
    ) IS NOT NULL,
    'purge', to_regprocedure('limiter.purge()') IS NOT NULL,
    'purge_at', to_regprocedure('limiter.purge_at(timestamptz)') IS NOT NULL
  )
) AS fda028_state;
