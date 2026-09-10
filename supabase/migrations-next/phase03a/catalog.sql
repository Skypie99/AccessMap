-- Catalog-only supplemental comparison. No application rows, secret values or timestamps.
SELECT jsonb_build_object(
  'columnAcls', coalesce((SELECT jsonb_agg(x ORDER BY x::text) FROM (
    SELECT jsonb_build_object('schema',n.nspname,'table',c.relname,'column',a.attname,
      'grantor',pg_get_userbyid(z.grantor),'grantee',CASE WHEN z.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(z.grantee) END,
      'privilege',z.privilege_type,'grantable',z.is_grantable) x
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(a.attacl) z
    WHERE a.attnum>0 AND NOT a.attisdropped AND n.nspname IN ('public','private','storage')
  ) q),'[]'::jsonb),
  'defaultAcls', coalesce((SELECT jsonb_agg(x ORDER BY x::text) FROM (
    SELECT jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',coalesce(n.nspname,'GLOBAL'),
      'kind',d.defaclobjtype,'grantor',pg_get_userbyid(z.grantor),
      'grantee',CASE WHEN z.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(z.grantee) END,
      'privilege',z.privilege_type,'grantable',z.is_grantable) x
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) z
    WHERE n.nspname IN ('public','private','storage') OR d.defaclnamespace=0
  ) q),'[]'::jsonb),
  'sequenceAcls', coalesce((SELECT jsonb_agg(x ORDER BY x::text) FROM (
    SELECT jsonb_build_object('schema',n.nspname,'sequence',c.relname,'owner',pg_get_userbyid(c.relowner),
      'grantor',pg_get_userbyid(z.grantor),'grantee',CASE WHEN z.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(z.grantee) END,
      'privilege',z.privilege_type,'grantable',z.is_grantable) x
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('S',c.relowner))) z
    WHERE c.relkind='S' AND n.nspname IN ('public','private','storage')
  ) q),'[]'::jsonb),
  'owners', coalesce((SELECT jsonb_agg(x ORDER BY x::text) FROM (
    SELECT jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) x
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','v','m','S') AND n.nspname IN ('public','private','storage')
    UNION ALL
    SELECT jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'kind','function','owner',pg_get_userbyid(p.proowner)) x
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','private','storage')
  ) q),'[]'::jsonb)
);
