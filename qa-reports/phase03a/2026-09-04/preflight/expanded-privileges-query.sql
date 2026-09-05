with column_acls as (
 select n.nspname as schema, c.relname as table_name, a.attname as column_name,
 case when x.grantee=0 then 'public' else r.rolname end as grantee,
 x.privilege_type, x.is_grantable
 from pg_attribute a join pg_class c on c.oid=a.attrelid
 join pg_namespace n on n.oid=c.relnamespace
 cross join lateral aclexplode(a.attacl) x
 left join pg_roles r on r.oid=x.grantee
 where n.nspname='public' and a.attnum>0 and not a.attisdropped
 and (x.grantee=0 or r.rolname in ('anon','authenticated','service_role'))
), defaults as (
 select owner.rolname as owner_role,
 coalesce(n.nspname,'ALL_SCHEMAS') as schema, d.defaclobjtype::text as object_type,
 case when x.grantee=0 then 'public' else r.rolname end as grantee,
 x.privilege_type,x.is_grantable
 from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole
 left join pg_namespace n on n.oid=d.defaclnamespace
 cross join lateral aclexplode(d.defaclacl) x
 left join pg_roles r on r.oid=x.grantee
 where (d.defaclnamespace=0 or n.nspname in ('public','private','storage'))
 and (x.grantee=0 or r.rolname in ('anon','authenticated','service_role'))
), sequence_acls as (
 select n.nspname as schema,c.relname as sequence_name,
 case when x.grantee=0 then 'public' else r.rolname end as grantee,
 x.privilege_type,x.is_grantable
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join lateral aclexplode(coalesce(c.relacl,acldefault('S',c.relowner))) x
 left join pg_roles r on r.oid=x.grantee
 where n.nspname in ('public','private') and c.relkind='S'
 and (x.grantee=0 or r.rolname in ('anon','authenticated','service_role'))
), function_owners as (
 select n.nspname as schema,p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as signature,
 r.rolname as owner_role,r.rolbypassrls as owner_bypass_rls,r.rolsuper as owner_superuser,
 p.prosecdef as security_definer
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner
 where n.nspname in ('public','private') and p.prokind='f'
), effective_users_columns as (
 select a.attname as column_name, r.role_name,
 has_column_privilege(r.role_name,c.oid,a.attnum,'SELECT') as can_select,
 has_column_privilege(r.role_name,c.oid,a.attnum,'UPDATE') as can_update,
 has_column_privilege(r.role_name,c.oid,a.attnum,'INSERT') as can_insert
 from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
 cross join (values ('anon'),('authenticated'),('service_role')) r(role_name)
 where n.nspname='public' and c.relname='users' and a.attnum>0 and not a.attisdropped
), table_owners as (
 select n.nspname as schema,c.relname as table_name,r.rolname as owner_role
 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner
 where n.nspname in ('public','private','storage') and c.relkind in ('r','p','v','m','S')
), role_settings as (
 select r.rolname as role_name, split_part(setting,'=',1) as setting_name,
 nullif(substring(setting from position('=' in setting)+1),'') is not null as nonempty_value,
 md5(setting) as setting_md5
 from pg_roles r cross join lateral unnest(coalesce(r.rolconfig,array[]::text[])) setting
 where r.rolname='authenticator' and split_part(setting,'=',1) in ('pgrst.db_pre_request','pgrst.db_schemas')
)
select jsonb_build_object(
 'captured_at_utc',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'application_data_read',false,
 'column_acls',coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from column_acls x),'[]'::jsonb),
 'default_acls',coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from defaults x),'[]'::jsonb),
 'sequence_acls',coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from sequence_acls x),'[]'::jsonb),
 'function_owners',coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from function_owners x),'[]'::jsonb),
 'effective_users_columns',coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from effective_users_columns x),'[]'::jsonb),
 'table_owners',coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from table_owners x),'[]'::jsonb),
 'authenticator_settings_metadata',coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text) from role_settings x),'[]'::jsonb)
);
