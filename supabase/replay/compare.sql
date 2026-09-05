-- PHASE-02B rev2 catalog comparator.
-- This exact read-only query runs against replay and production. Function
-- source is represented by a hash of complete pg_get_functiondef() output so
-- evidence cannot republish a credential embedded in historical source.
with
role_catalog as (
  select r.rolname as name, r.rolsuper as superuser, r.rolinherit as inherit,
         r.rolcreaterole as create_role, r.rolcreatedb as create_db,
         r.rolcanlogin as can_login, r.rolbypassrls as bypass_rls
  from pg_roles r where r.rolname in ('anon', 'authenticated', 'service_role')
  order by r.rolname
),
schemas as (
  select n.nspname as schema,
         exists (
           select 1 from aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) x
           where x.grantee = 0 and x.privilege_type = 'USAGE'
         ) as public_usage,
         case when exists (select 1 from pg_roles where rolname = 'anon')
              then has_schema_privilege('anon', n.oid, 'USAGE') else false end as anon_usage,
         case when exists (select 1 from pg_roles where rolname = 'authenticated')
              then has_schema_privilege('authenticated', n.oid, 'USAGE') else false end as authenticated_usage
  from pg_namespace n where n.nspname in ('public', 'private', 'storage')
  order by n.nspname
),
tables as (
  select n.nspname as schema, c.relname as name, c.relkind::text as kind,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  order by n.nspname, c.relname
),
columns as (
  select a.table_schema as schema, a.table_name, a.ordinal_position,
         a.column_name, a.data_type, a.udt_schema, a.udt_name,
         a.is_nullable, a.column_default, a.is_identity,
         a.identity_generation, a.is_generated, a.generation_expression
  from information_schema.columns a where a.table_schema = 'public'
  order by a.table_schema, a.table_name, a.ordinal_position
),
policies as (
  select n.nspname as schema, c.relname as table_name, p.polname as name,
         case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
              when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as command,
         case when p.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end as permissiveness,
         coalesce((select jsonb_agg(case when u.role_oid = 0 then 'public' else r.rolname end
                                    order by case when u.role_oid = 0 then 'public' else r.rolname end)
                   from unnest(p.polroles) u(role_oid)
                   left join pg_roles r on r.oid = u.role_oid), '[]'::jsonb) as roles,
         case when p.polqual is null then null
              else md5(pg_get_expr(p.polqual, p.polrelid, true)) end as using_expression_md5,
         case when p.polwithcheck is null then null
              else md5(pg_get_expr(p.polwithcheck, p.polrelid, true)) end as check_expression_md5
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'storage')
  order by n.nspname, c.relname, p.polname
),
triggers as (
  select n.nspname as schema, c.relname as table_name, t.tgname as name,
         t.tgenabled::text as enabled, pn.nspname as function_schema,
         pr.proname || '(' || pg_get_function_identity_arguments(pr.oid) || ')' as function_signature,
         md5(pg_get_triggerdef(t.oid, true)) as definition_md5
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc pr on pr.oid = t.tgfoid
  join pg_namespace pn on pn.oid = pr.pronamespace
  where not t.tgisinternal and n.nspname = 'public'
  order by n.nspname, c.relname, t.tgname
),
functions as (
  select n.nspname as schema,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
         l.lanname as language, pg_get_function_result(p.oid) as result_type,
         p.prosecdef as security_definer, p.provolatile::text as volatility,
         p.proparallel::text as parallel_safety,
         coalesce(p.proconfig, array[]::text[]) as configuration,
         md5(pg_get_functiondef(p.oid)) as definition_md5
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname in ('public', 'private') and p.prokind = 'f'
  order by n.nspname, signature
),
function_grants as (
  select n.nspname as schema,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
         case when x.grantee = 0 then 'public' else grantee.rolname end as grantee,
         x.privilege_type, x.is_grantable
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
  left join pg_roles grantee on grantee.oid = x.grantee
  where n.nspname in ('public', 'private')
    and (x.grantee = 0 or grantee.rolname in ('anon', 'authenticated', 'service_role'))
  order by n.nspname, signature, grantee, x.privilege_type
),
table_grants as (
  select n.nspname as schema, c.relname as table_name,
         case when x.grantee = 0 then 'public' else grantee.rolname end as grantee,
         x.privilege_type, x.is_grantable
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
  left join pg_roles grantee on grantee.oid = x.grantee
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
    and (x.grantee = 0 or grantee.rolname in ('anon', 'authenticated', 'service_role'))
  order by n.nspname, c.relname, grantee, x.privilege_type
),
migration_history as (
  select version::text as version, name::text as name
  from supabase_migrations.schema_migrations order by version
)
select jsonb_build_object(
  'comparatorVersion', 3,
  'scope', jsonb_build_object(
    'applicationSchemas', jsonb_build_array('public', 'private'),
    'policySchemas', jsonb_build_array('public', 'storage'),
    'columnSchemas', jsonb_build_array('public'),
    'triggerSchemas', jsonb_build_array('public'),
    'tableGrantSchemas', jsonb_build_array('public'),
    'platformManagedExclusions', jsonb_build_array('storage triggers', 'storage table grants'),
    'applicationDataRead', false,
    'functionDefinitions', 'complete pg_get_functiondef represented by md5',
    'policyExpressions', 'complete pg_get_expr represented by md5 to avoid publishing embedded identifiers'
  ),
  'roles', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from role_catalog x), '[]'::jsonb),
  'schemas', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from schemas x), '[]'::jsonb),
  'tables', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from tables x), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from columns x), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from policies x), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from triggers x), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from functions x), '[]'::jsonb),
  'functionGrants', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from function_grants x), '[]'::jsonb),
  'tableGrants', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from table_grants x), '[]'::jsonb),
  'migrationHistory', coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from migration_history x), '[]'::jsonb)
);
