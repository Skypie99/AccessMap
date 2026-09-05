-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: phase-three-disposable
-- Exact Phase03A local or independently verified/authorized hosted staging only.
-- No production rows. Synthetic fixtures roll back. Auth claim resolution and
-- webhook delivery are platform stubs in local replay; hosted/API proof is separate.
BEGIN;
SET LOCAL search_path = public, phase03a_tap, extensions;
SELECT plan(113);

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('30000000-0000-4000-8000-000000000001','phase03a-owner@example.invalid','{"display_name":"Owner"}'),
('30000000-0000-4000-8000-000000000002','phase03a-user@example.invalid','{"display_name":"Other"}'),
('30000000-0000-4000-8000-000000000003','phase03a-admin@example.invalid','{"display_name":"Admin"}');
INSERT INTO auth.users(id,email,raw_user_meta_data)
SELECT ('30000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'phase03a-fixture-'||n||'@example.invalid','{"display_name":"Fixture"}'::jsonb FROM generate_series(10,34) n;
INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open');
INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open');
INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open');
INSERT INTO public.flag_comments(id,flag_id,user_id,content) VALUES
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Synthetic byline fixture'),
('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Synthetic deleted-author fixture');
-- Model an already-deattributed stored comment after its original award.
UPDATE public.flag_comments SET user_id=NULL WHERE id='50000000-0000-4000-8000-000000000002';
UPDATE public.users SET display_name=CASE WHEN id='30000000-0000-4000-8000-000000000002' THEN 'Other' WHEN id='30000000-0000-4000-8000-000000000001' THEN 'Owner' ELSE 'Fixture' END,
 points=CASE WHEN id='30000000-0000-4000-8000-000000000002' THEN 200 WHEN id='30000000-0000-4000-8000-000000000001' THEN 100 ELSE 0 END,
 is_admin=(id='30000000-0000-4000-8000-000000000003')
-- Restrict setup to the exact synthetic accounts inserted above.
WHERE id IN ('30000000-0000-4000-8000-000000000001',
             '30000000-0000-4000-8000-000000000002',
             '30000000-0000-4000-8000-000000000003')
   OR id IN (SELECT ('30000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
             FROM generate_series(10,34) n);

SELECT ok((NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.flags'::regclass AND polcmd='*')), 'FDA009 no overlapping ALL flag policy');

SELECT ok((EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.flags'::regclass AND polname='flags authenticated insert open' AND NOT polpermissive)), 'FDA023 authenticated open INSERT restriction is restrictive');

SELECT ok((NOT has_table_privilege('authenticated','public.users','UPDATE')), 'FDA021 authenticated has no table-wide users UPDATE');

SELECT ok((has_column_privilege('authenticated','public.users','display_name','UPDATE')), 'profile display_name remains writable subject to guards');

SELECT ok((has_column_privilege('authenticated','public.users','avatar_url','UPDATE')), 'profile avatar_url remains writable subject to guards');

SELECT ok((has_column_privilege('authenticated','public.users','avatar_object_key','UPDATE')), 'profile avatar_object_key remains writable subject to guards');

SELECT ok((NOT has_column_privilege('authenticated','public.users','points','UPDATE')), 'forged points has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','email','UPDATE')), 'forged email has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','is_admin','UPDATE')), 'forged is_admin has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','created_at','UPDATE')), 'forged created_at has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','streak_days','UPDATE')), 'forged streak_days has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','longest_streak_days','UPDATE')), 'forged longest_streak_days has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','last_active_date','UPDATE')), 'forged last_active_date has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','id','UPDATE')), 'forged id has no UPDATE grant');

SELECT ok((NOT has_column_privilege('authenticated','public.users','is_admin','SELECT')), 'FDA026 admin column cannot be selected');

SELECT ok((NOT has_table_privilege('anon','public.flags','TRUNCATE') AND NOT has_table_privilege('authenticated','public.flags','TRUNCATE')), 'FDA012 flags has no client TRUNCATE');

SELECT ok((NOT has_table_privilege('anon','public.flag_comments','TRUNCATE') AND NOT has_table_privilege('authenticated','public.flag_comments','TRUNCATE')), 'FDA012 flag_comments has no client TRUNCATE');

SELECT ok((NOT has_table_privilege('anon','public.flag_photos','TRUNCATE') AND NOT has_table_privilege('authenticated','public.flag_photos','TRUNCATE')), 'FDA012 flag_photos has no client TRUNCATE');

SELECT ok((NOT has_table_privilege('anon','public.feedback','TRUNCATE') AND NOT has_table_privilege('authenticated','public.feedback','TRUNCATE')), 'FDA012 feedback has no client TRUNCATE');

SELECT ok((NOT has_table_privilege('anon','public.users','TRUNCATE') AND NOT has_table_privilege('authenticated','public.users','TRUNCATE')), 'FDA012 users has no client TRUNCATE');

SELECT ok((NOT has_table_privilege('anon','public.point_events','TRUNCATE') AND NOT has_table_privilege('authenticated','public.point_events','TRUNCATE')), 'FDA012 point_events has no client TRUNCATE');

SELECT ok((NOT has_table_privilege('anon','public.push_tokens','TRUNCATE') AND NOT has_table_privilege('authenticated','public.push_tokens','TRUNCATE')), 'FDA012 push_tokens has no client TRUNCATE');

SELECT ok((NOT has_sequence_privilege('authenticated','public.point_events_id_seq','UPDATE')), 'client cannot setval the reward sequence');

SELECT ok((NOT has_function_privilege('anon','public.enforce_flag_photos_object_key_guard()','EXECUTE') AND NOT has_function_privilege('authenticated','public.enforce_flag_photos_object_key_guard()','EXECUTE')), 'FDA010 enforce_flag_photos_object_key_guard() is internal');

SELECT ok((NOT has_function_privilege('anon','public.enforce_flags_photo_object_key_guard()','EXECUTE') AND NOT has_function_privilege('authenticated','public.enforce_flags_photo_object_key_guard()','EXECUTE')), 'FDA010 enforce_flags_photo_object_key_guard() is internal');

SELECT ok((NOT has_function_privilege('anon','public.enforce_users_avatar_object_key_guard()','EXECUTE') AND NOT has_function_privilege('authenticated','public.enforce_users_avatar_object_key_guard()','EXECUTE')), 'FDA010 enforce_users_avatar_object_key_guard() is internal');

SELECT ok((NOT has_function_privilege('anon','public.handle_push_token_updated_at()','EXECUTE') AND NOT has_function_privilege('authenticated','public.handle_push_token_updated_at()','EXECUTE')), 'FDA010 handle_push_token_updated_at() is internal');

SELECT ok((NOT has_function_privilege('anon','public.set_flag_updated_at()','EXECUTE') AND NOT has_function_privilege('authenticated','public.set_flag_updated_at()','EXECUTE')), 'FDA010 set_flag_updated_at() is internal');

SELECT ok((NOT has_function_privilege('anon','public.update_flags_updated_at()','EXECUTE') AND NOT has_function_privilege('authenticated','public.update_flags_updated_at()','EXECUTE')), 'FDA010 update_flags_updated_at() is internal');

SELECT ok((has_function_privilege('authenticated','public.increment_dispute_request(uuid)','EXECUTE')), 'required RPC increment_dispute_request(uuid) remains callable');

SELECT ok((has_function_privilege('authenticated','public.increment_reopen_request(uuid)','EXECUTE')), 'required RPC increment_reopen_request(uuid) remains callable');

SELECT ok((has_function_privilege('authenticated','public.log_realtime_event(text,text)','EXECUTE')), 'required RPC log_realtime_event(text,text) remains callable');

SELECT ok((has_function_privilege('service_role','public.verify_webhook_secret(text)','EXECUTE') AND NOT has_function_privilege('authenticated','public.verify_webhook_secret(text)','EXECUTE')), 'webhook verification remains service only');

SELECT ok((EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='flag-photos admin delete' AND pg_get_expr(polqual,polrelid) LIKE '%private.current_user_is_admin%')), 'Storage admin policy uses the private helper (catalog proof only)');

RESET ROLE; SET LOCAL request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001'; SET LOCAL request.jwt.claim.role = 'authenticated'; SET LOCAL ROLE authenticated;

SELECT is((SELECT count(id) FROM public.users), 1::bigint, 'users SELECT returns only self');

SELECT is((SELECT count(id) FROM public.users WHERE id='30000000-0000-4000-8000-000000000002'), 0::bigint, 'known other user cannot be enumerated');

SELECT throws_ok($test$SELECT is_admin FROM public.users$test$, '42501', NULL, 'direct admin enumeration refused');

SELECT throws_ok($test$SELECT id FROM public.users WHERE is_admin$test$, '42501', NULL, 'filtering by private admin column refused');

SELECT is(public.current_user_can_admin(), false, 'normal caller is not admin');

SELECT throws_ok($test$UPDATE public.users SET points=99999 WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'FDA021 actual points forgery refused');

SELECT throws_ok($test$UPDATE public.users SET email='forged@example.invalid' WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'FDA021 actual email forgery refused');

SELECT throws_ok($test$UPDATE public.users SET is_admin=true WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'FDA021 actual is_admin forgery refused');

SELECT throws_ok($test$UPDATE public.users SET created_at=now()-interval '1 year' WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'FDA021 actual created_at forgery refused');

SELECT throws_ok($test$UPDATE public.users SET streak_days=99 WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'FDA021 actual streak_days forgery refused');

SELECT throws_ok($test$UPDATE public.users SET longest_streak_days=99 WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'FDA021 actual longest_streak_days forgery refused');

SELECT throws_ok($test$UPDATE public.users SET last_active_date=current_date WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'FDA021 actual last_active_date forgery refused');

SELECT lives_ok($test$UPDATE public.users SET display_name='Owner Edited',avatar_url='https://example.invalid/avatar.jpg',avatar_object_key=NULL WHERE id='30000000-0000-4000-8000-000000000001' RETURNING id,display_name,avatar_url,avatar_object_key,points,created_at$test$, 'normal profile update and returning projection succeed');

SELECT throws_ok($test$UPDATE public.users SET avatar_object_key='forged/key' WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'media-key mutation remains refused');

SELECT is((SELECT display_name FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'), 'Owner Edited', 'profile update persists');

SELECT throws_ok($test$UPDATE public.users SET display_name='Mixed Forgery',points=999 WHERE id='30000000-0000-4000-8000-000000000001'$test$, '42501', NULL, 'mixed allowed/private profile patch is refused atomically');

SELECT is((SELECT display_name FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'), 'Owner Edited', 'mixed patch did not change the allowed column');

SELECT is((SELECT count(*) FROM public.list_public_leaderboard()),20::bigint,'leaderboard returns top20 beyond self-only users RLS');

SELECT is((SELECT count(*) FROM public.list_public_leaderboard(3)),3::bigint,'leaderboard honors smaller limit');

SELECT is((SELECT count(*) FROM public.list_public_leaderboard(10000)),20::bigint,'leaderboard oversized request cannot enumerate everyone');

SELECT is((SELECT count(*) FROM public.list_public_leaderboard(-1)),0::bigint,'negative leaderboard limit exposes nothing');

SELECT is((SELECT rank FROM public.get_my_leaderboard_rank()),2::bigint,'own rank counts strictly greater points');

SELECT is((SELECT points FROM public.get_my_leaderboard_rank()),100,'own rank returns own points');

SELECT throws_ok($test$SELECT is_admin FROM public.list_public_leaderboard()$test$, '42703', NULL, 'leaderboard cannot expose private admin field');

SELECT throws_ok($test$SELECT email FROM public.list_public_leaderboard()$test$, '42703', NULL, 'leaderboard cannot expose email');

SELECT is((SELECT display_name FROM public.get_comment_author_profiles(ARRAY['50000000-0000-4000-8000-000000000001']::uuid[])), 'Other', 'other author byline survives self-only user visibility');

SELECT is((SELECT display_name FROM public.get_comment_author_profiles(ARRAY['50000000-0000-4000-8000-000000000002']::uuid[])), NULL::text, 'deleted author remains null');

SELECT is((SELECT count(*) FROM public.get_comment_author_profiles(ARRAY['30000000-0000-4000-8000-000000000002']::uuid[])),0::bigint,'user UUID cannot be used as author-directory lookup');

SELECT is((SELECT count(*) FROM public.get_comment_author_profiles(ARRAY['50000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001']::uuid[])),1::bigint,'duplicate comment IDs do not amplify output');

SELECT is((SELECT count(*) FROM public.get_comment_author_profiles(ARRAY[]::uuid[])),0::bigint,'empty author request returns no rows');

SELECT throws_ok($test$SELECT * FROM public.get_comment_author_profiles(array_fill('50000000-0000-4000-8000-000000000001'::uuid,ARRAY[201]))$test$, '22023', NULL, 'oversized author request refused');

SELECT throws_ok($test$SELECT * FROM public.get_comment_author_profiles(NULL)$test$, '22023', NULL, 'null author request refused');

SELECT lives_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open')$test$, 'owner open flag INSERT succeeds');

SELECT is((SELECT points FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'),105,'trusted flag trigger still awards exactly five points');

SELECT lives_ok($test$UPDATE public.flags SET description='Synthetic owner edit' WHERE id='40000000-0000-4000-8000-000000000004'$test$, 'normal flag edit and timestamp triggers survive ALL-policy removal');

SELECT throws_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'verified')$test$, '42501', NULL, 'authenticated verified INSERT refused');

SELECT throws_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'resolved')$test$, '42501', NULL, 'authenticated resolved INSERT refused');

SELECT throws_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'rejected')$test$, '42501', NULL, 'authenticated rejected INSERT refused');

SELECT throws_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000015','30000000-0000-4000-8000-000000000002',0,0,'no_ramp',1,'open')$test$, '42501', NULL, 'another account cannot be selected as new flag owner');

SELECT lives_ok($test$INSERT INTO public.flag_comments(id,flag_id,content) VALUES('50000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000004','Synthetic new comment')$test$, 'own comment INSERT still succeeds');

SELECT is((SELECT points FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'),106,'comment trigger awards exactly once');

SELECT is((SELECT u.display_name FROM public.flag_comments c LEFT JOIN public.users u ON u.id=c.user_id WHERE c.id='50000000-0000-4000-8000-000000000010'), 'Owner Edited', 'own comment returning embed can still resolve own name');

SELECT lives_ok($test$INSERT INTO public.flag_photos(flag_id,url) VALUES('40000000-0000-4000-8000-000000000004','https://example.invalid/flag-photos/30000000-0000-4000-8000-000000000001/photo.jpg')$test$, 'trusted media trigger still accepts ordinary photo');

SELECT is((SELECT points FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'),109,'trusted photo trigger still awards three points');

SELECT throws_ok($test$INSERT INTO public.flag_photos(flag_id,url,object_key) VALUES('40000000-0000-4000-8000-000000000004','https://example.invalid/photo.jpg','forged/key')$test$, '42501', NULL, 'photo object-key forgery refused');

SELECT lives_ok($test$SELECT public.log_realtime_event('subscribe','phase03a-fixture')$test$, 'realtime RPC and its sequence still work');

SELECT throws_ok($test$SELECT public.enforce_flags_photo_object_key_guard()$test$, '42501', NULL, 'direct trigger helper invocation refused');

SELECT lives_ok($test$DELETE FROM public.flags WHERE id='40000000-0000-4000-8000-000000000002'$test$, 'owner direct flag DELETE succeeds');

SELECT is((SELECT count(*) FROM public.flags WHERE id='40000000-0000-4000-8000-000000000002'),0::bigint,'owner deletion actually removed the flag');

RESET ROLE; SET LOCAL request.jwt.claim.sub = '30000000-0000-4000-8000-000000000002'; SET LOCAL request.jwt.claim.role = 'authenticated'; SET LOCAL ROLE authenticated;

SELECT lives_ok($test$DELETE FROM public.flags WHERE id='40000000-0000-4000-8000-000000000003'$test$, 'unauthorized DELETE returns without leaking a row');

SELECT is((SELECT count(*) FROM public.flags WHERE id='40000000-0000-4000-8000-000000000003'),1::bigint,'unrelated user cannot delete owner flag');

SELECT lives_ok($test$UPDATE public.users SET display_name='Must Not Change' WHERE id='30000000-0000-4000-8000-000000000001'$test$, 'other profile UPDATE has no visible target');

RESET ROLE; SET LOCAL request.jwt.claim.sub = '30000000-0000-4000-8000-000000000003'; SET LOCAL request.jwt.claim.role = 'authenticated'; SET LOCAL ROLE authenticated;

SELECT is(public.current_user_can_admin(),true,'admin caller is authorized through private helper');

SELECT lives_ok($test$DELETE FROM public.flags WHERE id='40000000-0000-4000-8000-000000000003'$test$, 'admin direct flag DELETE succeeds');

SELECT is((SELECT count(*) FROM public.flags WHERE id='40000000-0000-4000-8000-000000000003'),0::bigint,'admin deletion actually removed the flag');

SELECT lives_ok($test$DELETE FROM public.flag_comments WHERE id='50000000-0000-4000-8000-000000000001'$test$, 'admin direct comment DELETE survives helper migration');

SELECT is((SELECT count(*) FROM public.flag_comments WHERE id='50000000-0000-4000-8000-000000000001'),0::bigint,'admin comment deletion actually removed the comment');

RESET ROLE; SET LOCAL request.jwt.claim.sub = '30000000-0000-4000-8000-000000000004'; SET LOCAL request.jwt.claim.role = 'authenticated'; SET LOCAL ROLE authenticated;

SELECT is(public.current_user_can_admin(),false,'missing account cannot gain admin authority');

SELECT throws_ok($test$SELECT * FROM public.list_public_leaderboard()$test$, '42501', NULL, 'missing account cannot read leaderboard');

SELECT throws_ok($test$SELECT * FROM public.get_my_leaderboard_rank()$test$, '42501', NULL, 'missing account cannot get fabricated rank');

SELECT throws_ok($test$SELECT * FROM public.get_comment_author_profiles(ARRAY['50000000-0000-4000-8000-000000000002']::uuid[])$test$, '42501', NULL, 'missing account cannot resolve author names');

RESET ROLE; SET LOCAL request.jwt.claim.sub = ''; SET LOCAL request.jwt.claim.role = 'anon'; SET LOCAL ROLE anon;

SELECT lives_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000020',NULL,0,0,'no_ramp',1,'open')$test$, 'anonymous open guest report remains allowed');

SELECT throws_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000021',NULL,0,0,'no_ramp',1,'verified')$test$, '42501', NULL, 'anonymous preverified report refused');

SELECT lives_ok($test$INSERT INTO public.feedback(body) VALUES('Synthetic anonymous feedback')$test$, 'anonymous feedback insertion remains allowed');

SELECT throws_ok($test$SELECT public.current_user_can_admin()$test$, '42501', NULL, 'anonymous cannot call current_user_can_admin');

SELECT throws_ok($test$SELECT public.list_public_leaderboard()$test$, '42501', NULL, 'anonymous cannot call list_public_leaderboard');

SELECT throws_ok($test$SELECT public.get_my_leaderboard_rank()$test$, '42501', NULL, 'anonymous cannot call get_my_leaderboard_rank');

SELECT throws_ok($test$SELECT public.get_comment_author_profiles(ARRAY[]::uuid[])$test$, '42501', NULL, 'anonymous cannot call get_comment_author_profiles');

SELECT throws_ok($test$SELECT id FROM public.users$test$, '42501', NULL, 'anonymous has no users enumeration');

RESET ROLE; SET LOCAL request.jwt.claim.sub = ''; SET LOCAL request.jwt.claim.role = 'service_role'; SET LOCAL ROLE service_role;

SELECT is((SELECT last_active_date FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'),current_date,'trusted reward trigger updated activity date');

SELECT ok(((SELECT streak_days >= 1 FROM public.users WHERE id='30000000-0000-4000-8000-000000000001')), 'trusted reward trigger maintained the streak');

SELECT lives_ok($test$UPDATE public.users SET points=321,streak_days=8,longest_streak_days=8 WHERE id='30000000-0000-4000-8000-000000000001'$test$, 'trusted service reputation writes remain allowed');

SELECT is((SELECT points FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'),321,'service update actually persists');

SELECT lives_ok($test$INSERT INTO public.flags(id,user_id,lat,lng,category,severity,status) VALUES('40000000-0000-4000-8000-000000000022',NULL,0,0,'no_ramp',1,'verified')$test$, 'service insert behavior remains unchanged');

RESET ROLE;

SELECT is((SELECT display_name FROM public.users WHERE id='30000000-0000-4000-8000-000000000001'), 'Owner Edited', 'unauthorized profile edit had no effect');

CREATE TABLE public.phase03a_default_probe(id integer); CREATE SEQUENCE public.phase03a_default_seq;
CREATE FUNCTION public.phase03a_default_function() RETURNS integer LANGUAGE sql AS 'SELECT 1';

SELECT ok((NOT has_table_privilege('anon','public.phase03a_default_probe','SELECT') AND NOT has_table_privilege('authenticated','public.phase03a_default_probe','TRUNCATE')), 'postgres future-table defaults deny clients');

SELECT ok((NOT has_sequence_privilege('authenticated','public.phase03a_default_seq','UPDATE')), 'postgres future-sequence defaults deny client mutation');

SELECT ok((NOT has_function_privilege('anon','public.phase03a_default_function()','EXECUTE') AND NOT has_function_privilege('authenticated','public.phase03a_default_function()','EXECUTE')), 'postgres future functions are not public by default');

SELECT ok((has_table_privilege('service_role','public.phase03a_default_probe','SELECT') AND has_function_privilege('service_role','public.phase03a_default_function()','EXECUTE')), 'service defaults are preserved');

SELECT * FROM finish();
ROLLBACK;
