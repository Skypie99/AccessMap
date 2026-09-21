-- PHASE 03C — FUTURE LIVE READ-ONLY ACCEPTANCE. NOT RUN BY ANY AGENT.
-- Owner-only: run it solely under Sky's explicit, separate live authorization, as a
-- read-only session. It is the catalog-only subset of
-- supabase/tests/phase03c-anon-contract.test.sql: no fixture, no write, no row content,
-- except one aggregate count in step 8. Expected values are the ones proven locally
-- on HEAD 97dd04c and seen in the 2026-09-20 accepted production capture. Any
-- difference is a finding to report, not something to "fix" live.
begin transaction read only;

-- 1. Ledger (expect 87 and 20260915210413, unless a later authorized apply is on record)
select count(*) as ledger_count, max(version) as ledger_tip from supabase_migrations.schema_migrations;

-- 2. C-3 anon table-level SELECT (expect exactly: flag_comments, flag_edit_history_public,
--    flag_photos, flag_status_history_public, flags, point_events)
select string_agg(c.relname, ',' order by c.relname) as anon_table_select
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','v','m','p') and has_table_privilege('anon', c.oid, 'SELECT');

-- 3. C-3 anon write surface (expect exactly: feedback, flags; and 0 for other_write)
select string_agg(c.relname, ',' order by c.relname) as anon_insert_tables
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','v','m','p') and has_any_column_privilege('anon', c.oid, 'INSERT');
select count(*) as other_write
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','v','m','p')
   and (has_any_column_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
        or has_table_privilege('anon', c.oid, 'TRUNCATE') or has_any_column_privilege('anon', c.oid, 'REFERENCES')
        or has_table_privilege('anon', c.oid, 'TRIGGER'));

-- 4. C-3 policies reaching anon/PUBLIC (expect exactly the eight listed in 09 §5 C-3)
select tablename, policyname, cmd, permissive, roles
  from pg_policies where schemaname = 'public' and roles && array['anon','public']::name[] order by 1, 2;

-- 5. C-5 views stay security_invoker; base history tables grant anon nothing
--    (expect both views 'security_invoker=true', and f, f)
select relname, reloptions from pg_class where oid in ('public.flag_status_history_public'::regclass, 'public.flag_edit_history_public'::regclass);
select has_any_column_privilege('anon', 'public.flag_status_history', 'SELECT') as status_base,
       has_any_column_privilege('anon', 'public.flag_edit_history', 'SELECT') as edit_base;

-- 6. C-6 functions fail closed (expect 0, f, f)
select count(*) as anon_exec_fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public','private','limiter') and has_function_privilege('anon', p.oid, 'EXECUTE');
select has_schema_privilege('anon', 'private', 'USAGE') as private_usage, has_schema_privilege('anon', 'limiter', 'USAGE') as limiter_usage;

-- 7. C-8 storage and C-9 realtime (expect: flag-photos public t; 0 anon/public storage
--    policies; flags publication 'id,status'; replica identity 'd' for all three).
--    Replica identity is the one C-9 fact absent from the accepted capture.
select id, public from storage.buckets where id = 'flag-photos';
select count(*) as anon_storage_policies from pg_policies where schemaname = 'storage' and roles && array['anon','public']::name[];
select array_to_string(attnames, ',') as flags_publication_columns from pg_publication_tables
 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'flags';
select relname, relreplident from pg_class where oid in ('public.flags'::regclass, 'public.flag_comments'::regclass, 'public.flag_photos'::regclass);

-- 8. C-4 data invariant, aggregate only (expect 0)
select count(*) as visible_rows_with_reject_reason from public.flags
 where status <> 'rejected'
   and last_moderation_reason_code in ('duplicate','not_accessibility_barrier','inaccurate','abusive_or_spam');

rollback;
