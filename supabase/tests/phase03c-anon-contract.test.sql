-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: phase-three-c-disposable
-- Phase 03C anonymous public-read privacy contract. Synthetic, local-only proof run by
-- scripts/replay-phase03c.mjs on the production-equivalent replay (71 + next + Stage A + 03B).
-- All rows roll back. Invariants C-1..C-10 are defined in
-- qa-reports/phase03c/20260921T053411Z-opus-core/09_PRIVACY_ARCHITECTURE_DECISION.md.
-- An exact-set failure here means the anon surface changed: update the contract deliberately
-- (Jordan review) instead of editing the expected set to match.
begin;
set local search_path = public, phase03b_tap, extensions;
select plan(85);

-- ------------------------------------------------------------------ C-3 exact anon surface
select set_eq(
  $$select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','v','m','p')
       and has_table_privilege('anon', c.oid, 'SELECT')$$,
  array['flags','flag_comments','flag_photos','point_events','flag_status_history_public','flag_edit_history_public'],
  'C-3: anon table-level SELECT is exactly flags + the five Stage-A compatibility grants');
select set_eq(
  $$select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','v','m','p')
       and has_any_column_privilege('anon', c.oid, 'SELECT')$$,
  array['flags','flag_comments','flag_photos','point_events','flag_status_history_public','flag_edit_history_public'],
  'C-3: anon holds no column-level SELECT beyond the table-level set');
select set_eq(
  $$select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','v','m','p')
       and has_any_column_privilege('anon', c.oid, 'INSERT')$$,
  array['flags','feedback'],
  'C-3: anon may INSERT only into flags and feedback');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v','m','p')
      and (has_any_column_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
           or has_table_privilege('anon', c.oid, 'TRUNCATE') or has_any_column_privilege('anon', c.oid, 'REFERENCES')
           or has_table_privilege('anon', c.oid, 'TRIGGER'))),
  0, 'C-3: anon holds no UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on any public relation');
select set_eq(
  $$select a.attname::text from pg_attribute a
     where a.attrelid = 'public.flags'::regclass and a.attnum > 0 and not a.attisdropped
       and has_column_privilege('anon', a.attrelid, a.attnum, 'INSERT')$$,
  array['category','context_tags','description','lat','lng','photo_alt','photo_url','severity','status','user_id'],
  'C-3: anon flags INSERT columns are exact (no id, created_at, photo_object_key, counters, moderation)');
select set_eq(
  $$select a.attname::text from pg_attribute a
     where a.attrelid = 'public.feedback'::regclass and a.attnum > 0 and not a.attisdropped
       and has_column_privilege('anon', a.attrelid, a.attnum, 'INSERT')$$,
  array['body','category','contact_email','platform','user_id'],
  'C-3: anon feedback INSERT columns are exact (no moderation columns)');
select set_eq(
  $$select tablename || '|' || policyname || '|' || cmd || '|' || permissive from pg_policies
     where schemaname = 'public' and roles && array['anon','public']::name[]$$,
  array[
    'feedback|feedback_delete_own|DELETE|PERMISSIVE',
    'feedback|feedback_insert_self_or_anon|INSERT|PERMISSIVE',
    'feedback|feedback_select_maintainer|SELECT|PERMISSIVE',
    'feedback|feedback_select_own|SELECT|PERMISSIVE',
    'flags|flags anon insert|INSERT|PERMISSIVE',
    'flags|flags insert status open only|INSERT|RESTRICTIVE',
    'flags|flags readable by anon|SELECT|PERMISSIVE',
    'flags|flags rejected hidden from anon|SELECT|RESTRICTIVE'],
  'C-3: policies reaching anon or PUBLIC are exactly the ratified eight (no anon policy on compat tables)');
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public' and tablename = 'flags' and (roles && array['public']::name[] or cmd = 'ALL')),
  0, 'C-3: no flags policy targets PUBLIC or ALL (legacy flags_user_scoped stays gone)');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S'
      and (has_sequence_privilege('anon', c.oid, 'USAGE') or has_sequence_privilege('anon', c.oid, 'SELECT')
           or has_sequence_privilege('anon', c.oid, 'UPDATE'))),
  0, 'C-3: anon holds no privilege on any public sequence');

-- ------------------------------------------------------------------ C-5 structural
select ok((select reloptions from pg_class where oid = 'public.flag_status_history_public'::regclass) @> array['security_invoker=true'],
  'C-5: flag_status_history_public is security_invoker (anon grant cannot bypass base-table checks)');
select ok((select reloptions from pg_class where oid = 'public.flag_edit_history_public'::regclass) @> array['security_invoker=true'],
  'C-5: flag_edit_history_public is security_invoker');
select ok(not has_any_column_privilege('anon', 'public.flag_status_history', 'SELECT'),
  'C-5: anon holds no SELECT on base table flag_status_history');
select ok(not has_any_column_privilege('anon', 'public.flag_edit_history', 'SELECT'),
  'C-5: anon holds no SELECT on base table flag_edit_history');

-- ------------------------------------------------------------------ C-6 functions fail closed
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private','limiter') and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0, 'C-6: anon can EXECUTE no function in public, private or limiter');
select ok(not has_schema_privilege('anon', 'private', 'USAGE'), 'C-6: anon has no USAGE on schema private');
select ok(not has_schema_privilege('anon', 'limiter', 'USAGE'), 'C-6: anon has no USAGE on schema limiter');
create function public.phase03c_default_acl_probe() returns integer language sql as 'select 1';
select ok(not has_function_privilege('anon', 'public.phase03c_default_acl_probe()', 'EXECUTE'),
  'C-6: a function newly created by postgres is not anon-executable (future RPCs, incl. account deletion, fail closed)');
create table public.phase03c_default_acl_probe_t(id integer);
select ok(not has_any_column_privilege('anon', 'public.phase03c_default_acl_probe_t', 'SELECT')
          and not has_any_column_privilege('anon', 'public.phase03c_default_acl_probe_t', 'INSERT'),
  'C-6: a table newly created by postgres grants anon nothing');

-- ------------------------------------------------------------------ C-8 storage, C-9 realtime
select ok(exists(select 1 from storage.buckets where id = 'flag-photos' and public),
  'C-8: flag-photos bucket is public by documented design (bytes by URL only)');
select is(
  (select count(*)::int from pg_policies where schemaname = 'storage' and roles && array['anon','public']::name[]),
  0, 'C-8: no storage policy targets anon or PUBLIC (no listing, no anon upload/delete)');
select is(
  (select coalesce(array_to_string(attnames, ','), '<all>') from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'flags'),
  'id,status', 'C-9: flags realtime publication carries only id,status');
select is(
  (select count(*)::int from pg_class
    where oid in ('public.flags'::regclass, 'public.flag_comments'::regclass, 'public.flag_photos'::regclass)
      and relreplident = 'f'),
  0, 'C-9: no published client table uses REPLICA IDENTITY FULL (DELETE events carry only the key)');

-- ------------------------------------------------------------------ C-4 structural
select ok(exists(
  select 1 from pg_policy
   where polrelid = 'public.flags'::regclass and polname = 'flags rejected hidden from anon'
     and not polpermissive and polroles = array['anon'::regrole]::oid[]
     and pg_get_expr(polqual, polrelid) = '(status <> ''rejected''::text)'),
  'C-4: restrictive anon policy hides rejected flags');

-- ------------------------------------------------------------------ fixture (postgres)
insert into auth.users(id, email, raw_user_meta_data) values
('c3000000-0000-4000-8000-000000000001', 'p03c-owner@example.invalid', '{}'),
('c3000000-0000-4000-8000-000000000002', 'p03c-commenter@example.invalid', '{}'),
('c3000000-0000-4000-8000-000000000003', 'p03c-admin@example.invalid', '{}');
update public.users set is_admin = (id = 'c3000000-0000-4000-8000-000000000003') where id::text like 'c3000000-%';
insert into public.flags(id, user_id, lat, lng, category, severity, status, description) values
('c4000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 49.88, -119.49, 'no_ramp', 2, 'open', 'open flag'),
('c4000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000001', 49.89, -119.48, 'no_ramp', 2, 'open', 'rejected flag'),
('c4000000-0000-4000-8000-000000000003', 'c3000000-0000-4000-8000-000000000001', 49.87, -119.47, 'no_ramp', 2, 'open', 'restored flag');
insert into public.flag_comments(id, flag_id, user_id, content) values
('c5000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000002', 'synthetic comment');
insert into public.flag_photos(flag_id, url, position, alt_text) values
('c4000000-0000-4000-8000-000000000001', 'https://example.invalid/extra.jpg', 1, 'synthetic extra photo');
insert into public.flag_edit_history(flag_id, user_id, changed_fields, old_values, new_values) values
('c4000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', array['description'], '{"description":"old"}', '{"description":"new"}');
insert into public.feedback(user_id, body, contact_email) values
('c3000000-0000-4000-8000-000000000002', '[REPORT] v2 target=flag id=c4000000-0000-4000-8000-000000000001 cat=spam', 'reporter@example.invalid'),
(null, 'synthetic guest feedback', 'guest@example.invalid');
insert into public.push_tokens(user_id, token, platform) values
('c3000000-0000-4000-8000-000000000001', 'ExponentPushToken[p03c-synthetic]', 'ios');

-- admin moderation through the audited RPC: reject #2, reject then restore #3
set local request.jwt.claim.sub = 'c3000000-0000-4000-8000-000000000003';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.email = 'p03c-admin@example.invalid';
set local role authenticated;
select is((select status::text from public.transition_flag_status('c4000000-0000-4000-8000-000000000002', 'open', 'rejected', 'abusive_or_spam', null)),
  'rejected', 'fixture: admin rejects #2 with a reject-class reason via the audited RPC');
select is((select status::text from public.transition_flag_status('c4000000-0000-4000-8000-000000000003', 'open', 'rejected', 'duplicate', null)),
  'rejected', 'fixture: admin rejects #3');
select is((select status::text from public.transition_flag_status('c4000000-0000-4000-8000-000000000003', 'rejected', 'open', 'moderator_error', null)),
  'open', 'fixture: admin restores #3 with a restore-class reason');
select throws_ok(
  $$update public.flags set status = 'resolved' where id = 'c4000000-0000-4000-8000-000000000002'$$,
  'P0001', null, 'C-4: even an admin cannot move a rejected flag to a visible status outside the audited restore');
reset role;

select ok((select count(*) from public.point_events
            where user_id::text like 'c3000000-%' and user_id <> 'c3000000-0000-4000-8000-000000000002') > 0,
  'fixture: other accounts hold point events (makes the owner-scope check below non-vacuous)');
select is(
  (select count(*)::int from public.flags
    where status <> 'rejected'
      and last_moderation_reason_code in ('duplicate','not_accessibility_barrier','inaccurate','abusive_or_spam')),
  0, 'C-4: no non-rejected row carries a reject-only reason code');

-- ------------------------------------------------------------------ as ANON (no JWT subject)
set local request.jwt.claim.sub = '';
set local request.jwt.claim.role = 'anon';
set local request.jwt.claim.email = '';
set local role anon;

-- C-1 positive read
select is(
  (select string_agg(right(id::text, 2), ',' order by id) from public.flags where id::text like 'c4000000-%'),
  '01,03', 'C-1: anon reads exactly the non-rejected fixture flags');
select is((select count(*)::int from public.flags where status = 'rejected'), 0, 'C-1: anon sees no rejected flag at all');
select lives_ok(
  $$select id, user_id, lat, lng, category, description, severity, photo_url, photo_object_key, photo_alt, status, created_at
      from public.flags where status in ('open','verified') order by created_at desc limit 500$$,
  'C-1: the shipped FLAG_READ_SELECT guest projection works');
select lives_ok($$select * from public.flags$$, 'C-1: select-star works (shipped RETURNING */select=* compatibility)');

-- C-4 moderation labels visible to anon
select is(
  (select string_agg(right(id::text, 2) || ':' || coalesce(last_moderation_reason_code, '-'), ',' order by id)
     from public.flags where id::text like 'c4000000-%'),
  '01:-,03:moderator_error', 'C-4: anon sees only the restore-class label on the restored flag');
select is(
  (select count(*)::int from public.flags
    where last_moderation_reason_code in ('duplicate','not_accessibility_barrier','inaccurate','abusive_or_spam')),
  0, 'C-4: anon can see no reject-class reason code');

-- C-5 compatibility surfaces yield nothing
select is((select count(*)::int from public.flag_comments), 0, 'C-5: anon reads 0 comments (compat grant, no anon policy)');
select is((select count(*)::int from public.flag_photos), 0, 'C-5: anon reads 0 additional photos');
select is((select count(*)::int from public.point_events), 0, 'C-5: anon reads 0 point events');
select throws_ok($$select * from public.flag_status_history_public$$, '42501', null,
  'C-5: anon cannot read the status-history view (security_invoker, no base grant)');
select throws_ok($$select * from public.flag_edit_history_public$$, '42501', null,
  'C-5: anon cannot read the edit-history view');

-- C-7 private tables
select throws_ok($$select * from public.users$$, '42501', null, 'C-7: anon cannot read users');
select throws_ok($$select * from public.users_self_email$$, '42501', null, 'C-7: anon cannot read users_self_email');
select throws_ok($$select * from public.feedback$$, '42501', null, 'C-7: anon cannot read feedback (incl. contact_email)');
select throws_ok($$select * from public.flag_moderation_events$$, '42501', null, 'C-7: anon cannot read moderation events');
select throws_ok($$select * from public.push_tokens$$, '42501', null, 'C-7: anon cannot read push tokens');
select throws_ok($$select * from public.notification_preferences$$, '42501', null, 'C-7: anon cannot read notification preferences');
select throws_ok($$select * from public.realtime_subscribe_log$$, '42501', null, 'C-7: anon cannot read realtime_subscribe_log');
select throws_ok($$select * from public.flag_verifications$$, '42501', null, 'C-7: anon cannot read flag_verifications');
select throws_ok($$select * from public.comment_votes$$, '42501', null, 'C-7: anon cannot read comment_votes');
select throws_ok($$select * from public.flag_point_reward_claims$$, '42501', null, 'C-7: anon cannot read reward claims');
select throws_ok($$select * from public.comment_reward_daily$$, '42501', null, 'C-7: anon cannot read comment_reward_daily');
select throws_ok($$select * from public.comment_vote_reward_counts$$, '42501', null, 'C-7: anon cannot read comment_vote_reward_counts');
select throws_ok($$select * from public.flag_status_history$$, '42501', null, 'C-7: anon cannot read raw status history');
select throws_ok($$select * from public.flag_edit_history$$, '42501', null, 'C-7: anon cannot read raw edit history');
select throws_ok($$select * from public.bk_2026_08_22_flags$$, '42501', null, 'C-7: anon cannot read the contained backup table');

-- C-6 representative RPCs
select throws_ok($$select * from public.get_comment_author_profiles(array['c5000000-0000-4000-8000-000000000001']::uuid[])$$, '42501', null,
  'C-6: anon cannot resolve comment author profiles');
select throws_ok($$select * from public.list_public_leaderboard(10)$$, '42501', null, 'C-6: anon cannot read the leaderboard RPC');
select throws_ok($$select public.get_my_leaderboard_rank()$$, '42501', null, 'C-6: anon cannot call get_my_leaderboard_rank');
select throws_ok($$select public.current_user_can_admin()$$, '42501', null, 'C-6: anon cannot call current_user_can_admin');
select throws_ok($$select public.increment_reopen_request('c4000000-0000-4000-8000-000000000001')$$, '42501', null, 'C-6: anon cannot increment reopen requests');
select throws_ok($$select public.increment_dispute_request('c4000000-0000-4000-8000-000000000001')$$, '42501', null, 'C-6: anon cannot increment dispute requests');
select throws_ok($$select public.log_realtime_event('a', 'b')$$, '42501', null, 'C-6: anon cannot log realtime events');
select throws_ok($$select * from public.transition_flag_status('c4000000-0000-4000-8000-000000000001', 'open', 'verified', null, null)$$, '42501', null,
  'C-6: anon cannot call the status RPC');
select throws_ok($$select * from public.moderate_report('c6000000-0000-4000-8000-000000000001', 'no_action', null, null)$$, '42501', null,
  'C-6: anon cannot call the moderation RPC');
select throws_ok($$select * from public.list_open_moderation_reports(10)$$, '42501', null, 'C-6: anon cannot list moderation reports');
select throws_ok($$select private.current_user_is_admin()$$, '42501', null, 'C-6: anon cannot reach private.current_user_is_admin');

-- C-2 writes
select lives_ok(
  $$insert into public.flags(lat, lng, category, severity, description, context_tags, status)
    values (49.9, -119.4, 'no_ramp', 1, 'synthetic guest report', array['after_dark'], 'open') returning *$$,
  'C-2: anonymous report with RETURNING * works (shipped createAnonFlag)');
select throws_ok($$insert into public.flags(user_id, lat, lng, category, severity, status)
    values ('c3000000-0000-4000-8000-000000000001', 1, 1, 'no_ramp', 1, 'open')$$, '42501', null,
  'C-2: anon cannot attribute a report to an account');
select throws_ok($$insert into public.flags(lat, lng, category, severity, status) values (1, 1, 'no_ramp', 1, 'rejected')$$, '42501', null,
  'C-2: anon cannot insert a non-open report');
select throws_ok($$insert into public.flags(lat, lng, category, severity, status, photo_url)
    values (1, 1, 'no_ramp', 1, 'open', 'https://example.invalid/x.jpg')$$, '42501', null,
  'C-2: anon cannot attach a photo URL');
select throws_ok($$update public.flags set description = 'x' where id = 'c4000000-0000-4000-8000-000000000001'$$, '42501', null,
  'C-2: anon cannot update flags');
select throws_ok($$delete from public.flags where id = 'c4000000-0000-4000-8000-000000000001'$$, '42501', null,
  'C-2: anon cannot delete flags');
select lives_ok($$insert into public.feedback(category, body, contact_email, platform)
    values ('bug', 'synthetic guest body', 'g@example.invalid', 'ios')$$,
  'C-2: anonymous feedback insert works (shipped return=minimal)');
select throws_ok($$insert into public.feedback(user_id, body) values ('c3000000-0000-4000-8000-000000000002', 'spoof')$$, '42501', null,
  'C-2: anon cannot file feedback as another account');
select throws_ok($$insert into public.feedback(body) values ('x') returning *$$, '42501', null,
  'C-2: anon cannot read feedback back through RETURNING');
reset role;

-- ------------------------------------------------------------------ C-10 authenticated (non-admin)
set local request.jwt.claim.sub = 'c3000000-0000-4000-8000-000000000002';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.email = 'p03c-commenter@example.invalid';
set local role authenticated;
select is((select count(*)::int from public.flags where id::text like 'c4000000-%'), 2, 'C-10: authenticated non-admin sees no rejected flag');
select is((select count(*)::int from public.flag_comments where flag_id::text like 'c4000000-%'), 1, 'C-10: authenticated reads comments (anon 0 is the role, not the data)');
select is((select count(*)::int from public.flag_photos where flag_id::text like 'c4000000-%'), 1, 'C-10: authenticated reads additional photos');
select ok((select count(*) from public.flag_status_history_public where flag_id::text like 'c4000000-%') > 0, 'C-10: authenticated reads the status-history view');
select is((select count(*)::int from public.flag_edit_history_public where flag_id::text like 'c4000000-%'), 1, 'C-10: authenticated reads the edit-history view');
select is((select count(*)::int from public.point_events where user_id is distinct from 'c3000000-0000-4000-8000-000000000002'), 0,
  'C-10: authenticated sees only its own point events');
select throws_ok($$select email from public.users$$, '42501', null, 'C-10: authenticated cannot read any email column');
select is((select count(*)::int from public.users where id::text like 'c3000000-%'), 3, 'C-10: authenticated reads public profile columns');
reset role;

-- ------------------------------------------------------------------ C-10 admin
set local request.jwt.claim.sub = 'c3000000-0000-4000-8000-000000000003';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.email = 'p03c-admin@example.invalid';
set local role authenticated;
select is((select count(*)::int from public.flags where id::text like 'c4000000-%'), 3, 'C-10: admin sees rejected flags');
select is((select count(*)::int from public.flag_moderation_events where flag_id::text like 'c4000000-%'), 3, 'C-10: admin reads moderation events');
reset role;

select * from finish();
rollback;
