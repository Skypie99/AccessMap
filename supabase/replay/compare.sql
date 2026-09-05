-- PHASE-02B — the same normalised aggregate the production capture uses, so a
-- replayed database and production produce directly comparable md5s.
with p as (
  select regexp_replace(
    c.relname||'.'||pol.polname||' USING '||coalesce(pg_get_expr(pol.polqual,pol.polrelid),'-')
    ||' CHECK '||coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),'-'), '\s+', ' ', 'g') as sig
  from pg_policy pol join pg_class c on c.oid=pol.polrelid
  join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage')
), t as (
  select regexp_replace(c.relname||'.'||tg.tgname||':'||pr.proname, '\s+', ' ', 'g') as sig
  from pg_trigger tg join pg_class c on c.oid=tg.tgrelid
  join pg_namespace n on n.oid=c.relnamespace join pg_proc pr on pr.oid=tg.tgfoid
  where not tg.tgisinternal and n.nspname='public'
)
select json_build_object(
  'policyCount', (select count(*) from p),
  'policyPredicateMd5', (select md5(string_agg(sig, e'\n' order by sig)) from p),
  'triggerCount', (select count(*) from t),
  'triggerMd5', (select md5(string_agg(sig, e'\n' order by sig)) from t)
)
