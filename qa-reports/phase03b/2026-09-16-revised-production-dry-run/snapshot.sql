begin transaction read only;

with
ledger_rows as (
  select
    version::text as version,
    name::text as name,
    coalesce(array_length(statements, 1), 0) as statement_count,
    encode(
      extensions.digest(
        coalesce(array_to_string(statements, E'\n--statement-boundary--\n'), ''),
        'sha256'
      ),
      'hex'
    ) as statements_sha256
  from supabase_migrations.schema_migrations
  order by version
),
schema_items as (
  select jsonb_build_object(
    'schema', n.nspname,
    'owner', pg_get_userbyid(n.nspowner),
    'acl', coalesce(n.nspacl::text, '')
  ) as item
  from pg_namespace n
  where n.nspname in ('public', 'private', 'limiter', 'net')
  order by n.nspname
),
relation_items as (
  select jsonb_build_object(
    'schema', n.nspname,
    'name', c.relname,
    'kind', c.relkind,
    'owner', pg_get_userbyid(c.relowner),
    'rls', c.relrowsecurity,
    'forceRls', c.relforcerowsecurity,
    'acl', coalesce(c.relacl::text, ''),
    'options', coalesce(array_to_string(c.reloptions, ','), '')
  ) as item
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private', 'limiter')
    and c.relkind in ('r', 'p', 'v', 'm', 'S')
  order by n.nspname, c.relname, c.relkind
),
column_items as (
  select jsonb_build_object(
    'schema', n.nspname,
    'table', c.relname,
    'column', a.attname,
    'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
    'notNull', a.attnotnull,
    'generated', a.attgenerated,
    'identity', a.attidentity,
    'acl', coalesce(a.attacl::text, ''),
    'defaultSha256', case
      when d.adbin is null then null
      else encode(extensions.digest(pg_get_expr(d.adbin, d.adrelid), 'sha256'), 'hex')
    end
  ) as item
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname in ('public', 'private', 'limiter')
    and c.relkind in ('r', 'p', 'v', 'm')
    and a.attnum > 0
    and not a.attisdropped
  order by n.nspname, c.relname, a.attnum
),
constraint_items as (
  select jsonb_build_object(
    'schema', n.nspname,
    'table', c.relname,
    'name', con.conname,
    'type', con.contype,
    'definitionSha256', encode(
      extensions.digest(pg_get_constraintdef(con.oid, true), 'sha256'),
      'hex'
    )
  ) as item
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private', 'limiter')
  order by n.nspname, c.relname, con.conname
),
index_items as (
  select jsonb_build_object(
    'schema', schemaname,
    'table', tablename,
    'name', indexname,
    'definitionSha256', encode(extensions.digest(indexdef, 'sha256'), 'hex')
  ) as item
  from pg_indexes
  where schemaname in ('public', 'private', 'limiter')
  order by schemaname, tablename, indexname
),
policy_items as (
  select jsonb_build_object(
    'schema', schemaname,
    'table', tablename,
    'name', policyname,
    'permissive', permissive,
    'roles', roles,
    'command', cmd,
    'usingSha256', case when qual is null then null else encode(extensions.digest(qual, 'sha256'), 'hex') end,
    'checkSha256', case when with_check is null then null else encode(extensions.digest(with_check, 'sha256'), 'hex') end
  ) as item
  from pg_policies
  where schemaname in ('public', 'private', 'limiter')
  order by schemaname, tablename, policyname
),
trigger_items as (
  select jsonb_build_object(
    'schema', n.nspname,
    'table', c.relname,
    'name', t.tgname,
    'enabled', t.tgenabled,
    'definitionSha256', encode(extensions.digest(pg_get_triggerdef(t.oid, true), 'sha256'), 'hex')
  ) as item
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private', 'limiter')
    and not t.tgisinternal
  order by n.nspname, c.relname, t.tgname
),
routine_items as (
  select jsonb_build_object(
    'schema', n.nspname,
    'name', p.proname,
    'identityArgs', pg_get_function_identity_arguments(p.oid),
    'kind', p.prokind,
    'owner', pg_get_userbyid(p.proowner),
    'securityDefiner', p.prosecdef,
    'leakproof', p.proleakproof,
    'volatility', p.provolatile,
    'parallel', p.proparallel,
    'acl', coalesce(p.proacl::text, ''),
    'config', coalesce(array_to_string(p.proconfig, ','), ''),
    'definitionSha256', encode(extensions.digest(pg_get_functiondef(p.oid), 'sha256'), 'hex')
  ) as item
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private', 'limiter')
    and p.prokind in ('f', 'p')
  order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
),
flags_table_grants as (
  select jsonb_build_object(
    'grantor', grantor,
    'grantee', grantee,
    'privilege', privilege_type,
    'grantable', is_grantable,
    'hierarchy', with_hierarchy
  ) as item
  from information_schema.table_privileges
  where table_schema = 'public' and table_name = 'flags'
  order by grantee, privilege_type, grantor
),
flags_column_grants as (
  select jsonb_build_object(
    'grantor', grantor,
    'grantee', grantee,
    'column', column_name,
    'privilege', privilege_type,
    'grantable', is_grantable
  ) as item
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'flags'
  order by grantee, column_name, privilege_type, grantor
),
structure as (
  select jsonb_build_object(
    'schemas', jsonb_build_object('count', (select count(*) from schema_items), 'items', coalesce((select jsonb_agg(item) from schema_items), '[]'::jsonb)),
    'relations', jsonb_build_object('count', (select count(*) from relation_items), 'items', coalesce((select jsonb_agg(item) from relation_items), '[]'::jsonb)),
    'columns', jsonb_build_object('count', (select count(*) from column_items), 'items', coalesce((select jsonb_agg(item) from column_items), '[]'::jsonb)),
    'constraints', jsonb_build_object('count', (select count(*) from constraint_items), 'items', coalesce((select jsonb_agg(item) from constraint_items), '[]'::jsonb)),
    'indexes', jsonb_build_object('count', (select count(*) from index_items), 'items', coalesce((select jsonb_agg(item) from index_items), '[]'::jsonb)),
    'policies', jsonb_build_object('count', (select count(*) from policy_items), 'items', coalesce((select jsonb_agg(item) from policy_items), '[]'::jsonb)),
    'triggers', jsonb_build_object('count', (select count(*) from trigger_items), 'items', coalesce((select jsonb_agg(item) from trigger_items), '[]'::jsonb)),
    'routines', jsonb_build_object('count', (select count(*) from routine_items), 'items', coalesce((select jsonb_agg(item) from routine_items), '[]'::jsonb)),
    'flagsTableGrants', coalesce((select jsonb_agg(item) from flags_table_grants), '[]'::jsonb),
    'flagsColumnGrants', coalesce((select jsonb_agg(item) from flags_column_grants), '[]'::jsonb)
  ) as value
),
http_rows as (
  select
    id,
    to_char(created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_utc,
    status_code,
    timed_out,
    case when error_msg is null then 'NO_ERROR' else 'ERROR' end as error_state
  from net._http_response
  order by id nulls first, created
),
http_serialized as (
  select coalesce(
    string_agg(
      coalesce(id::text, '') || E'\t' || created_utc || E'\t' ||
      coalesce(status_code::text, '') || E'\t' || coalesce(timed_out::text, '') ||
      E'\t' || error_state,
      E'\n' order by id nulls first, created_utc
    ),
    ''
  ) as value
  from http_rows
)
select jsonb_build_object(
  'schemaVersion', 1,
  'capturedAt', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'projectRef', 'kldlwszpfkdmsjrjhjym',
  'forbiddenStagingRef', 'cepayqmsoqxshsiyqnvz',
  'database', current_database(),
  'transactionReadOnly', current_setting('transaction_read_only'),
  'ledger', jsonb_build_object(
    'rowCount', (select count(*) from ledger_rows),
    'uniqueVersionCount', (select count(distinct version) from ledger_rows),
    'latestVersion', (select max(version) from ledger_rows),
    'orderedVersionNameSha256', encode(
      extensions.digest(
        coalesce((select string_agg(version || E'\t' || name, E'\n' order by version) || E'\n' from ledger_rows), ''),
        'sha256'
      ),
      'hex'
    ),
    'phase03bFrozenRowsPresent', (select count(*) from ledger_rows where version in ('20260915210256', '20260915210413')),
    'rows', coalesce((select jsonb_agg(to_jsonb(ledger_rows) order by version) from ledger_rows), '[]'::jsonb)
  ),
  'structure', (select value from structure),
  'http', jsonb_build_object(
    'requestQueueCount', (select count(*) from net.http_request_queue),
    'responseCount', (select count(*) from http_rows),
    'responseFingerprint', encode(extensions.digest((select value from http_serialized), 'sha256'), 'hex'),
    'rows', coalesce((select jsonb_agg(to_jsonb(http_rows) order by id nulls first, created_utc) from http_rows), '[]'::jsonb)
  )
) as phase03b_snapshot;

rollback;
