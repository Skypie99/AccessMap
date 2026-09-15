BEGIN TRANSACTION READ ONLY;

WITH
ledger AS (
  SELECT version::text AS version, name::text AS name
  FROM supabase_migrations.schema_migrations
),
ledger_summary AS (
  SELECT count(*)::integer AS row_count,
    min(version) AS first_version,
    max(version) AS latest_version,
    encode(extensions.digest(
      string_agg(version || E'\t' || name || E'\n', '' ORDER BY version, name)::bytea,
      'sha256'
    ), 'hex') AS ordered_sha256,
    jsonb_agg(jsonb_build_object('version', version, 'name', name)
      ORDER BY version, name) AS rows
  FROM ledger
),
prereqs AS (
  SELECT
    (SELECT count(*)::integer FROM vault.decrypted_secrets
      WHERE name = 'fda028_limiter_epoch_key') AS mf03_rows,
    (SELECT COALESCE(bool_and(
      CASE WHEN decrypted_secret ~ '^[0-9A-Fa-f]{64}$'
        THEN octet_length(decode(decrypted_secret, 'hex')) = 32
        ELSE false
      END
    ), false) FROM vault.decrypted_secrets
      WHERE name = 'fda028_limiter_epoch_key') AS mf03_shape_valid,
    (SELECT count(*)::integer FROM vault.decrypted_secrets
      WHERE name = 'webhook_endpoint') AS mf04_rows,
    (SELECT COALESCE(bool_and(
      decrypted_secret ~ '^https://[a-z0-9.-]+(:[0-9]+)?(/|$)'
    ), false) FROM vault.decrypted_secrets
      WHERE name = 'webhook_endpoint') AS mf04_shape_valid,
    (SELECT count(*)::integer FROM vault.decrypted_secrets
      WHERE name = 'webhook_secret') AS webhook_secret_rows,
    (SELECT COALESCE(bool_and(length(decrypted_secret) > 0), false)
      FROM vault.decrypted_secrets
      WHERE name = 'webhook_secret') AS webhook_secret_nonempty
),
safe_counts AS (
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.users),
    'flags', (SELECT count(*) FROM public.flags),
    'feedback', (SELECT count(*) FROM public.feedback),
    'flag_comments', (SELECT count(*) FROM public.flag_comments),
    'flag_photos', (SELECT count(*) FROM public.flag_photos),
    'point_events', (SELECT count(*) FROM public.point_events),
    'flag_status_history', (SELECT count(*) FROM public.flag_status_history),
    'flag_edit_history', (SELECT count(*) FROM public.flag_edit_history),
    'flag_verifications', (SELECT count(*) FROM public.flag_verifications),
    'comment_votes', (SELECT count(*) FROM public.comment_votes),
    'storage_objects', (SELECT count(*) FROM storage.objects),
    'queued_http', (SELECT count(*) FROM net.http_request_queue)
  ) AS value
),
functions AS (
  SELECT n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_result(p.oid) AS result_type,
    pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef AS security_definer,
    p.provolatile AS volatility,
    p.proconfig AS config,
    p.proacl AS acl,
    encode(extensions.digest(convert_to(pg_get_functiondef(p.oid), 'UTF8'), 'sha256'), 'hex') AS definition_sha256,
    CASE WHEN n.nspname = 'public' AND p.proname = 'notify_flag_status_webhook'
      THEN pg_get_functiondef(p.oid) ~ 'https://' END AS contains_https_literal,
    CASE WHEN n.nspname = 'public' AND p.proname = 'notify_flag_status_webhook'
      THEN pg_get_functiondef(p.oid) ~ 'webhook_endpoint' END AS references_webhook_endpoint,
    CASE WHEN n.nspname = 'public' AND p.proname = 'notify_flag_status_webhook'
      THEN pg_get_functiondef(p.oid) ~ 'webhook_secret' END AS references_webhook_secret
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE (n.nspname = 'private' AND p.proname IN (
      'current_user_is_admin', 'list_public_leaderboard',
      'get_my_leaderboard_rank', 'get_comment_author_profiles'
    ))
    OR (n.nspname = 'public' AND p.proname IN (
      'current_user_can_admin', 'list_public_leaderboard',
      'get_my_leaderboard_rank', 'get_comment_author_profiles',
      'notify_flag_status_webhook', 'verify_webhook_secret',
      'check_global_anon_rate_limit', 'check_flag_creation_rate_limit',
      'check_flag_rate_limit', 'increment_reopen_request',
      'increment_dispute_request', 'enforce_flag_status_transition'
    ))
    OR n.nspname = 'limiter'
),
policies AS (
  SELECT schemaname AS schema_name,
    tablename AS table_name,
    policyname AS policy_name,
    permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE (schemaname = 'public' AND tablename IN (
      'users', 'flags', 'feedback', 'flag_comments', 'flag_photos',
      'point_events', 'flag_status_history', 'flag_edit_history',
      'flag_verifications', 'comment_votes'
    ))
    OR (schemaname = 'storage' AND tablename = 'objects')
    OR schemaname = 'limiter'
),
triggers AS (
  SELECT n.nspname AS schema_name,
    c.relname AS table_name,
    t.tgname AS trigger_name,
    t.tgenabled AS enabled,
    pg_get_triggerdef(t.oid, true) AS definition
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal
    AND ((n.nspname = 'public' AND c.relname IN (
      'users', 'flags', 'feedback', 'flag_comments', 'flag_photos',
      'point_events', 'flag_status_history', 'flag_edit_history',
      'flag_verifications', 'comment_votes'
    )) OR (n.nspname = 'storage' AND c.relname = 'objects')
       OR n.nspname = 'limiter')
),
table_caps AS (
  SELECT n.nspname AS schema_name,
    c.relname AS relation_name,
    r.role_name,
    has_table_privilege(r.role_name, c.oid, 'SELECT') AS select_ok,
    has_table_privilege(r.role_name, c.oid, 'INSERT') AS insert_ok,
    has_table_privilege(r.role_name, c.oid, 'UPDATE') AS update_ok,
    has_table_privilege(r.role_name, c.oid, 'DELETE') AS delete_ok,
    c.relrowsecurity AS rls,
    c.relforcerowsecurity AS force_rls,
    pg_get_userbyid(c.relowner) AS owner,
    c.relacl AS acl,
    c.reloptions AS options
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
  WHERE c.relkind IN ('r', 'v', 'm', 'p')
    AND ((n.nspname = 'public' AND c.relname IN (
      'users', 'flags', 'feedback', 'flag_comments', 'flag_photos',
      'point_events', 'flag_status_history', 'flag_edit_history',
      'flag_verifications', 'comment_votes', 'flag_status_history_public',
      'flag_edit_history_public', 'bk_2026_08_22_flags',
      'bk_2026_08_22_flag_comments', 'bk_2026_08_22_flag_photos',
      'bk_2026_08_22_flag_status_history', 'bk_2026_08_22_flag_edit_history',
      'bk_2026_08_22_flag_verifications', 'bk_2026_08_22_point_links'
    )) OR (n.nspname = 'storage' AND c.relname = 'objects')
       OR n.nspname = 'limiter')
),
schema_caps AS (
  SELECT n.nspname AS schema_name,
    r.role_name,
    has_schema_privilege(r.role_name, n.oid, 'USAGE') AS use_ok,
    has_schema_privilege(r.role_name, n.oid, 'CREATE') AS create_ok
  FROM pg_namespace n
  CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
  WHERE n.nspname IN ('public', 'private', 'limiter', 'vault', 'storage', 'net')
),
routine_caps AS (
  SELECT n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    r.role_name,
    has_function_privilege(r.role_name, p.oid, 'EXECUTE') AS execute_ok
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
  WHERE (n.nspname = 'private' AND p.proname IN (
      'current_user_is_admin', 'list_public_leaderboard',
      'get_my_leaderboard_rank', 'get_comment_author_profiles'
    ))
    OR (n.nspname = 'public' AND p.proname IN (
      'current_user_can_admin', 'list_public_leaderboard',
      'get_my_leaderboard_rank', 'get_comment_author_profiles',
      'notify_flag_status_webhook', 'verify_webhook_secret',
      'check_global_anon_rate_limit', 'check_flag_creation_rate_limit',
      'check_flag_rate_limit', 'increment_reopen_request',
      'increment_dispute_request', 'enforce_flag_status_transition'
    ))
    OR n.nspname = 'limiter'
),
roles AS (
  SELECT m.rolname AS member,
    t.rolname AS target,
    pg_has_role(m.oid, t.oid, 'MEMBER') AS is_member,
    pg_has_role(m.oid, t.oid, 'USAGE') AS has_usage
  FROM pg_roles m
  CROSS JOIN pg_roles t
  WHERE m.rolname IN ('anon', 'authenticated', 'service_role')
    AND t.rolname IN (
      'anon', 'authenticated', 'service_role',
      'authenticator', 'postgres', 'supabase_admin'
    )
),
defaults AS (
  SELECT pg_get_userbyid(d.defaclrole) AS owner,
    COALESCE(n.nspname, '*') AS schema_name,
    d.defaclobjtype AS object_type,
    d.defaclacl AS acl
  FROM pg_default_acl d
  LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
  WHERE COALESCE(n.nspname, '*') IN (
    '*', 'public', 'private', 'limiter', 'storage', 'vault', 'net'
  )
),
views AS (
  SELECT n.nspname AS schema_name,
    c.relname AS view_name,
    pg_get_userbyid(c.relowner) AS owner,
    c.reloptions AS options,
    encode(extensions.digest(pg_get_viewdef(c.oid, true)::bytea, 'sha256'), 'hex') AS definition_sha256
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('v', 'm')
    AND n.nspname = 'public'
    AND c.relname IN ('flag_status_history_public', 'flag_edit_history_public')
)
SELECT jsonb_build_object(
  'capture_version', 'production-preflight-v1',
  'captured_at_utc', to_char(
    clock_timestamp() AT TIME ZONE 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ),
  'transaction_read_only', current_setting('transaction_read_only'),
  'session_role', current_user,
  'ledger', (SELECT to_jsonb(ledger_summary) FROM ledger_summary),
  'schema_presence', jsonb_build_object(
    'private', to_regnamespace('private') IS NOT NULL,
    'limiter', to_regnamespace('limiter') IS NOT NULL,
    'vault', to_regnamespace('vault') IS NOT NULL,
    'net', to_regnamespace('net') IS NOT NULL
  ),
  'object_presence', jsonb_build_object(
    'limiter_config', to_regclass('limiter.config') IS NOT NULL,
    'limiter_bucket', to_regclass('limiter.bucket') IS NOT NULL,
    'limiter_grant', to_regclass('limiter.grant') IS NOT NULL,
    'limiter_key_state', to_regclass('limiter.key_state') IS NOT NULL,
    'private_current_user_is_admin', to_regprocedure('private.current_user_is_admin()') IS NOT NULL,
    'public_current_user_can_admin', to_regprocedure('public.current_user_can_admin()') IS NOT NULL,
    'public_list_public_leaderboard', to_regprocedure('public.list_public_leaderboard(integer)') IS NOT NULL,
    'public_get_my_leaderboard_rank', to_regprocedure('public.get_my_leaderboard_rank()') IS NOT NULL,
    'public_get_comment_author_profiles', to_regprocedure('public.get_comment_author_profiles(uuid[])') IS NOT NULL,
    'public_notify_flag_status_webhook', to_regprocedure('public.notify_flag_status_webhook()') IS NOT NULL
  ),
  'prerequisites', (SELECT to_jsonb(prereqs) FROM prereqs),
  'safe_aggregate_counts', (SELECT value FROM safe_counts),
  'functions', COALESCE((SELECT jsonb_agg(to_jsonb(functions)
    ORDER BY schema_name, function_name, identity_arguments) FROM functions), '[]'::jsonb),
  'policies', COALESCE((SELECT jsonb_agg(to_jsonb(policies)
    ORDER BY schema_name, table_name, policy_name) FROM policies), '[]'::jsonb),
  'triggers', COALESCE((SELECT jsonb_agg(to_jsonb(triggers)
    ORDER BY schema_name, table_name, trigger_name) FROM triggers), '[]'::jsonb),
  'table_privileges', COALESCE((SELECT jsonb_agg(to_jsonb(table_caps)
    ORDER BY schema_name, relation_name, role_name) FROM table_caps), '[]'::jsonb),
  'schema_privileges', COALESCE((SELECT jsonb_agg(to_jsonb(schema_caps)
    ORDER BY schema_name, role_name) FROM schema_caps), '[]'::jsonb),
  'routine_privileges', COALESCE((SELECT jsonb_agg(to_jsonb(routine_caps)
    ORDER BY schema_name, function_name, identity_arguments, role_name) FROM routine_caps), '[]'::jsonb),
  'role_memberships', COALESCE((SELECT jsonb_agg(to_jsonb(roles)
    ORDER BY member, target) FROM roles), '[]'::jsonb),
  'default_privileges', COALESCE((SELECT jsonb_agg(to_jsonb(defaults)
    ORDER BY owner, schema_name, object_type) FROM defaults), '[]'::jsonb),
  'views', COALESCE((SELECT jsonb_agg(to_jsonb(views)
    ORDER BY schema_name, view_name) FROM views), '[]'::jsonb)
);

COMMIT;
