-- Read-only application privilege capture. No application rows or secret values.
-- PUBLIC is the PostgreSQL pseudo-role, not a real login. Privilege inquiry
-- functions include PUBLIC, inherited and table-implied column permissions.
WITH roles(name, inquiry_name) AS (
  VALUES ('PUBLIC','public'),('anon','anon'),('authenticated','authenticated'),('service_role','service_role')
), relations AS (
  SELECT c.*, n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p','f','v','m','S')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
      AND d.objid=c.oid AND d.deptype='e' AND d.refclassid='pg_extension'::regclass)
), routines AS (
  SELECT p.*, n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','private')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass
      AND d.objid=p.oid AND d.deptype='e' AND d.refclassid='pg_extension'::regclass)
), default_rows AS (
  SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl FROM pg_default_acl
  UNION ALL
  -- The absence of a global ACL means PostgreSQL's implicit defaults apply.
  -- In particular PUBLIC function EXECUTE must not disappear from the check.
  SELECT r.oid,0::oid,k,acldefault(k,r.oid) FROM pg_roles r
  CROSS JOIN unnest(ARRAY['r'::"char",'S'::"char",'f'::"char"]) k
  WHERE r.rolname='postgres' AND NOT EXISTS (SELECT 1 FROM pg_default_acl d
    WHERE d.defaclrole=r.oid AND d.defaclnamespace=0 AND d.defaclobjtype=k)
)
SELECT jsonb_build_object(
  'version',1,
  'relations',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'schema',c.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
    'rls',c.relrowsecurity,'securityInvoker',coalesce('security_invoker=true'=ANY(c.reloptions),false),
    'columns',(SELECT jsonb_agg(a.attname ORDER BY a.attname) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'roles',(SELECT jsonb_object_agg(r.name,jsonb_build_object(
      'tablePrivileges',(SELECT coalesce(jsonb_agg(p ORDER BY p),'[]'::jsonb) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p WHERE has_table_privilege(r.inquiry_name,c.oid,p)),
      'tableGrantOptions',(SELECT coalesce(jsonb_agg(p ORDER BY p),'[]'::jsonb) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p WHERE has_table_privilege(r.inquiry_name,c.oid,p||' WITH GRANT OPTION')),
      'columnPrivileges',(SELECT jsonb_object_agg(p,(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname),'[]'::jsonb) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND has_column_privilege(r.inquiry_name,c.oid,a.attnum,p))) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p),
      'columnGrantOptions',(SELECT jsonb_object_agg(p,(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname),'[]'::jsonb) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND has_column_privilege(r.inquiry_name,c.oid,a.attnum,p||' WITH GRANT OPTION'))) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p)
    )) FROM roles r)
  ) ORDER BY c.nspname,c.relname) FROM relations c WHERE c.relkind<>'S'),'[]'::jsonb),
  'sequences',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'schema',c.nspname,'name',c.relname,'owner',pg_get_userbyid(c.relowner),
    'roles',(SELECT jsonb_object_agg(r.name,jsonb_build_object(
      'privileges',(SELECT coalesce(jsonb_agg(p ORDER BY p),'[]'::jsonb) FROM unnest(ARRAY['SELECT','UPDATE','USAGE']) p WHERE has_sequence_privilege(r.inquiry_name,c.oid,p)),
      'grantOptions',(SELECT coalesce(jsonb_agg(p ORDER BY p),'[]'::jsonb) FROM unnest(ARRAY['SELECT','UPDATE','USAGE']) p WHERE has_sequence_privilege(r.inquiry_name,c.oid,p||' WITH GRANT OPTION'))
    )) FROM roles r)
  ) ORDER BY c.nspname,c.relname) FROM relations c WHERE c.relkind='S'),'[]'::jsonb),
  'functions',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'schema',p.nspname,'signature',p.proname||'('||oidvectortypes(p.proargtypes)||')',
    'owner',pg_get_userbyid(p.proowner),'kind',p.prokind,'securityDefiner',p.prosecdef,
    'roles',(SELECT jsonb_object_agg(r.name,jsonb_build_object(
      'execute',has_function_privilege(r.inquiry_name,p.oid,'EXECUTE'),
      'grantOption',has_function_privilege(r.inquiry_name,p.oid,'EXECUTE WITH GRANT OPTION')
    )) FROM roles r)
  ) ORDER BY p.nspname,p.proname,oidvectortypes(p.proargtypes)) FROM routines p),'[]'::jsonb),
  'schemas',(SELECT jsonb_object_agg(n.nspname,(SELECT jsonb_object_agg(r.name,jsonb_build_object(
    'privileges',(SELECT coalesce(jsonb_agg(p ORDER BY p),'[]'::jsonb) FROM unnest(ARRAY['USAGE','CREATE']) p WHERE has_schema_privilege(r.inquiry_name,n.oid,p)),
    'grantOptions',(SELECT coalesce(jsonb_agg(p ORDER BY p),'[]'::jsonb) FROM unnest(ARRAY['USAGE','CREATE']) p WHERE has_schema_privilege(r.inquiry_name,n.oid,p||' WITH GRANT OPTION'))
  )) FROM roles r)) FROM pg_namespace n WHERE n.nspname IN ('public','private')),
  'roleAttributes',(SELECT jsonb_object_agg(rolname,jsonb_build_object('superuser',rolsuper,'bypassRls',rolbypassrls,'createRole',rolcreaterole,'createDb',rolcreatedb,'canLogin',rolcanlogin)) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')),
  'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('member',pg_get_userbyid(member),'role',pg_get_userbyid(roleid),'inherit',inherit_option,'set',set_option,'admin',admin_option) ORDER BY member,roleid) FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))),'[]'::jsonb),
  'defaults',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'owner',pg_get_userbyid(d.defaclrole),'schema',coalesce(n.nspname,'GLOBAL'),'kind',d.defaclobjtype,
    'grantee',CASE WHEN z.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(z.grantee) END,
    'privilege',z.privilege_type,'grantable',z.is_grantable,
    'reachableBy',CASE WHEN z.grantee=0 THEN '["PUBLIC","anon","authenticated","service_role"]'::jsonb
      ELSE (SELECT coalesce(jsonb_agg(r.name ORDER BY r.name),'[]'::jsonb) FROM roles r WHERE r.name<>'PUBLIC' AND pg_has_role(r.inquiry_name,z.grantee,'USAGE')) END
  ) ORDER BY d.defaclrole,d.defaclnamespace,d.defaclobjtype,z.grantee,z.privilege_type)
  FROM default_rows d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) z
  WHERE n.nspname IN ('public','private','storage') OR d.defaclnamespace=0),'[]'::jsonb)
);
