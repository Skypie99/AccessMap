-- PHASE-02B replay fingerprint.
-- Policies carry their PREDICATES, not just their names: comparing names alone
-- reported "47 identical" while production's admin-escalation guard used a
-- private SECURITY DEFINER helper the repository lineage never creates.
select json_build_object(
  'tables', (select json_agg(t order by t) from (
     select c.relname as t from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind in ('r','v')) s),
  'functions', (select json_agg(f order by f) from (
     select p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as f
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')) s),
  'policies', (select json_agg(p order by p) from (
     select c.relname||'.'||pol.polname as p from pg_policy pol
     join pg_class c on c.oid=pol.polrelid join pg_namespace n on n.oid=c.relnamespace
     where n.nspname in ('public','storage')) s),
  'policyPredicates', (select json_agg(p order by p) from (
     select c.relname||'.'||pol.polname||' USING '||coalesce(pg_get_expr(pol.polqual,pol.polrelid),'-')
            ||' CHECK '||coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),'-') as p
     from pg_policy pol join pg_class c on c.oid=pol.polrelid
     join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage')) s),
  'triggers', (select json_agg(tg order by tg) from (
     select c.relname||'.'||t.tgname as tg from pg_trigger t
     join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
     where not t.tgisinternal and n.nspname='public') s),
  'columns', (select json_agg(col order by col) from (
     select table_name||'.'||column_name as col from information_schema.columns
     where table_schema='public') s),
  'publicExecuteFunctions', (select json_agg(distinct p.proname order by p.proname)
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
          aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
     where n.nspname='public' and a.privilege_type='EXECUTE'
       and (a.grantee=0 or a.grantee=(select oid from pg_roles where rolname='anon')))
)
