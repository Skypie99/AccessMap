begin transaction read only;
with s as (select unnest(array['public','private','storage','limiter']) as nspname)
select jsonb_build_object(
  'schemas', coalesce((select jsonb_agg(jsonb_build_object(
      'n', nspname, 'owner', pg_get_userbyid(nspowner), 'acl', nspacl::text)
      order by nspname) from pg_namespace where nspname in (select nspname from s)), '[]'::jsonb),
  'relations', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 'n', c.relname, 'kind', c.relkind, 'rls', c.relrowsecurity,
      'owner', pg_get_userbyid(c.relowner), 'acl', c.relacl::text,
      'forcerls', c.relforcerowsecurity,
      'reloptions', array_to_string(c.reloptions, '|'))
      order by n.nspname, c.relname, c.relkind)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (select nspname from s) and c.relkind in ('r','v','m','S','p')), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 't', c.relname, 'c', a.attname,
      'type', format_type(a.atttypid, a.atttypmod), 'notnull', a.attnotnull,
      'acl', a.attacl::text,
      'default', pg_get_expr(ad.adbin, ad.adrelid), 'generated', a.attgenerated)
      order by n.nspname, c.relname, a.attname)
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
    where n.nspname in (select nspname from s) and a.attnum>0 and not a.attisdropped
      and c.relkind in ('r','v','m','p')), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 'n', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
      'secdef', p.prosecdef, 'kind', p.prokind, 'body', md5(coalesce(p.prosrc,'')),
      'acl', p.proacl::text,
      'config', array_to_string(p.proconfig, '|'), 'leakproof', p.proleakproof,
      'owner', pg_get_userbyid(p.proowner),
      -- prosrc is EMPTY for SQL-standard BEGIN ATOMIC bodies, so hashing it alone
      -- misses a body inversion entirely. Round 4 demonstrated exactly that.
      'sqlbody', md5(coalesce(pg_get_function_sqlbody(p.oid)::text, '')))
      order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in (select nspname from s)), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(jsonb_build_object(
      's', schemaname, 't', tablename, 'p', policyname, 'cmd', cmd,
      'permissive', permissive, 'roles', roles::text,
      'qual', coalesce(qual,''), 'withcheck', coalesce(with_check,''))
      order by schemaname, tablename, policyname)
    from pg_policies where schemaname in (select nspname from s)), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 't', c.relname, 'g', tg.tgname,
      'fn', tg.tgfoid::regprocedure::text, 'type', tg.tgtype,
      'enabled', tg.tgenabled, 'when', pg_get_triggerdef(tg.oid))
      order by n.nspname, c.relname, tg.tgname)
    from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (select nspname from s) and not tg.tgisinternal), '[]'::jsonb),
  'roles', coalesce((select jsonb_agg(jsonb_build_object(
      'n', r.rolname, 'super', r.rolsuper, 'bypassrls', r.rolbypassrls,
      'createrole', r.rolcreaterole, 'canlogin', r.rolcanlogin, 'inherit', r.rolinherit,
      -- Membership OPTIONS, not just membership. inherit_option in particular turns
      -- a denied read into a permitted one without changing who is a member, and
      -- produced an identical checksum until round 4 demonstrated it.
      'memberof', (select coalesce(string_agg(
                     g.rolname || ':a=' || m.admin_option || ',i=' || m.inherit_option || ',s=' || m.set_option,
                     ',' order by g.rolname), '')
                   from pg_auth_members m join pg_roles g on g.oid = m.roleid
                   where m.member = r.oid))
      order by r.rolname)
    from pg_roles r
    where r.rolname in ('anon','authenticated','service_role','authenticator','postgres')), '[]'::jsonb),
  'defaultAcls', coalesce((select jsonb_agg(jsonb_build_object(
      'owner', pg_get_userbyid(d.defaclrole), 's', coalesce(n.nspname,'GLOBAL'),
      'kind', d.defaclobjtype, 'acl', d.defaclacl::text)
      order by pg_get_userbyid(d.defaclrole), coalesce(n.nspname,'GLOBAL'), d.defaclobjtype)
    from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
    where n.nspname in (select nspname from s) or d.defaclnamespace=0), '[]'::jsonb)
) as catalog;;
rollback;
