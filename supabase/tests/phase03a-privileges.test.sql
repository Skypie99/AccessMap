-- PGTAP_KIND: pgtap

-- PGTAP_EXECUTION: phase-three-disposable

-- FDA012 actual client/server capability proof. Synthetic rows; transaction rollback.

-- Local auth.users deletion models FK behavior only; hosted Auth API proof is separate.

BEGIN;

SET LOCAL search_path = public, phase03a_tap, extensions;

SELECT plan(79);

-- Give each role an isolated place to create its referencing table, so the
-- negative check tests REFERENCES on flags rather than schema CREATE denial.
CREATE SCHEMA phase03a_ref_probes;
GRANT USAGE, CREATE ON SCHEMA phase03a_ref_probes TO anon, authenticated, service_role;

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('31000000-0000-4000-8000-000000000001','fda012-owner@example.invalid','{}'),('31000000-0000-4000-8000-000000000002','fda012-other@example.invalid','{}');

INSERT INTO public.flags(id,user_id,lat,lng,category,severity) VALUES ('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001',0,0,'no_ramp',1),('41000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000002',0,0,'no_ramp',1);

INSERT INTO public.flag_comments(id,flag_id,user_id,content) VALUES ('51000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000002','Synthetic vote target');

RESET ROLE; SET LOCAL request.jwt.claim.role='authenticated'; SET LOCAL request.jwt.claim.sub='31000000-0000-4000-8000-000000000001'; SET LOCAL ROLE authenticated;

SELECT lives_ok($sql$UPDATE public.flags SET description='Owner description',category='other',severity=2,photo_url=NULL,photo_alt='Synthetic alt',context_tags=ARRAY['mobility'] WHERE id='41000000-0000-4000-8000-000000000001' RETURNING *$sql$, 'owner content and legacy media/tag payload is writable');

SELECT throws_ok($sql$UPDATE public.flags SET id=gen_random_uuid() WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.id');

SELECT throws_ok($sql$UPDATE public.flags SET user_id='31000000-0000-4000-8000-000000000002' WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.user_id');

SELECT throws_ok($sql$UPDATE public.flags SET lat=1 WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.lat');

SELECT throws_ok($sql$UPDATE public.flags SET lng=1 WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.lng');

SELECT throws_ok($sql$UPDATE public.flags SET created_at=now() WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.created_at');

SELECT throws_ok($sql$UPDATE public.flags SET updated_at=now() WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.updated_at');

SELECT throws_ok($sql$UPDATE public.flags SET reopen_requests=99 WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.reopen_requests');

SELECT throws_ok($sql$UPDATE public.flags SET dispute_requests=99 WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.dispute_requests');

SELECT throws_ok($sql$UPDATE public.flags SET photo_object_key='forged/key' WHERE id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'authenticated cannot overwrite flags.photo_object_key');

SELECT throws_ok($sql$INSERT INTO public.flags(id,user_id,lat,lng,category,severity) VALUES(gen_random_uuid(),'31000000-0000-4000-8000-000000000001',0,0,'no_ramp',1)$sql$, '42501', NULL, 'client cannot choose server flag ID');

SELECT throws_ok($sql$INSERT INTO public.flags(user_id,lat,lng,category,severity,created_at) VALUES('31000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,now()-interval '1 hour')$sql$, '42501', NULL, 'client cannot backdate rate-limit input');

SELECT lives_ok($sql$INSERT INTO public.flag_photos(flag_id,url,position,alt_text) VALUES('41000000-0000-4000-8000-000000000001','https://example.invalid/flag-photos/31000000-0000-4000-8000-000000000001/fda012.jpg',0,'Synthetic photo') RETURNING id,url,alt_text$sql$, 'legacy owner photo insertion and returning succeeds');

SELECT lives_ok($sql$UPDATE public.flag_photos SET position=1,alt_text='Revised alt' WHERE flag_id='41000000-0000-4000-8000-000000000001'$sql$, 'legacy owner photo update survives narrowed columns');

SELECT is((SELECT position FROM public.flag_photos WHERE flag_id='41000000-0000-4000-8000-000000000001'), 1, 'legacy photo update persists');

SELECT throws_ok($sql$UPDATE public.flag_photos SET flag_id='41000000-0000-4000-8000-000000000002' WHERE flag_id='41000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'client cannot reassign photo parent');

SELECT lives_ok($sql$INSERT INTO public.comment_votes(comment_id,voter_id) VALUES('51000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001') RETURNING *$sql$, 'own vote payload and reward trigger succeed');

SELECT is((SELECT count(*) FROM public.comment_votes WHERE voter_id='31000000-0000-4000-8000-000000000001'), 1::bigint, 'own vote is readable');

SELECT throws_ok($sql$INSERT INTO public.comment_votes(comment_id,voter_id) VALUES('51000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000002')$sql$, '42501', NULL, 'forged voter is refused by RLS');

SELECT lives_ok($sql$DELETE FROM public.comment_votes WHERE comment_id='51000000-0000-4000-8000-000000000001' AND voter_id='31000000-0000-4000-8000-000000000001'$sql$, 'own vote delete remains available');

SELECT lives_ok($sql$INSERT INTO public.flag_verifications(flag_id,verifier_id) VALUES('41000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000001') RETURNING weight$sql$, 'verification payload uses server weight default');

SELECT is((SELECT weight FROM public.flag_verifications WHERE flag_id='41000000-0000-4000-8000-000000000002'), 1.0::numeric, 'verification weight remains server default');

SELECT throws_ok($sql$INSERT INTO public.flag_verifications(flag_id,verifier_id,weight) VALUES('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001',99)$sql$, '42501', NULL, 'client cannot forge verification weight');

SELECT throws_ok($sql$DELETE FROM public.flag_verifications WHERE verifier_id='31000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'unneeded verification DELETE is denied');

SELECT lives_ok($sql$INSERT INTO public.notification_preferences(user_id,nearby_flags) VALUES('31000000-0000-4000-8000-000000000001',false) ON CONFLICT(user_id) DO UPDATE SET user_id=excluded.user_id,nearby_flags=excluded.nearby_flags RETURNING *$sql$, 'preference upsert preserves its own-row contract');

SELECT is((SELECT nearby_flags FROM public.notification_preferences WHERE user_id='31000000-0000-4000-8000-000000000001'), false, 'preference payload persists');

SELECT throws_ok($sql$UPDATE public.notification_preferences SET updated_at=now() WHERE user_id='31000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'preference timestamp is not client writable');

SELECT lives_ok($sql$INSERT INTO public.push_tokens(user_id,token,platform) VALUES('31000000-0000-4000-8000-000000000001','synthetic-token-one','ios') ON CONFLICT(user_id) DO UPDATE SET user_id=excluded.user_id,token=excluded.token,platform=excluded.platform$sql$, 'push-token upsert submits the actual client conflict-key payload');

SELECT lives_ok($sql$INSERT INTO public.push_tokens(user_id,token,platform) VALUES('31000000-0000-4000-8000-000000000001','synthetic-token-two','ios') ON CONFLICT(user_id) DO UPDATE SET user_id=excluded.user_id,token=excluded.token,platform=excluded.platform$sql$, 'push-token conflict update succeeds after trigger EXECUTE revoke');

SELECT is((SELECT token FROM public.push_tokens WHERE user_id='31000000-0000-4000-8000-000000000001'), 'synthetic-token-two', 'push-token conflict update persists');

SELECT throws_ok($sql$INSERT INTO public.push_tokens(user_id,token,platform) VALUES('31000000-0000-4000-8000-000000000002','synthetic-forged','ios') ON CONFLICT(user_id) DO UPDATE SET token=excluded.token$sql$, '42501', NULL, 'another token owner cannot be selected');

SELECT lives_ok($sql$INSERT INTO public.feedback(user_id,body) VALUES('31000000-0000-4000-8000-000000000001','Synthetic own feedback') RETURNING id,body$sql$, 'authenticated feedback insertion and returning succeeds');

SELECT lives_ok($sql$DELETE FROM public.feedback WHERE user_id='31000000-0000-4000-8000-000000000001'$sql$, 'own feedback deletion remains available');

SELECT lives_ok($sql$INSERT INTO public.flag_edit_history(flag_id,user_id,changed_fields,old_values,new_values) VALUES('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001',ARRAY['description'],'{}','{}')$sql$, 'owner append-only edit history payload succeeds');

SELECT lives_ok($sql$SELECT id,flag_id,changed_fields,old_values,new_values,created_at FROM public.flag_edit_history_public WHERE flag_id='41000000-0000-4000-8000-000000000001'$sql$, 'invoker edit-history view retains underlying safe columns');

SELECT lives_ok($sql$SELECT id,flag_id,from_status,to_status,created_at FROM public.flag_status_history_public WHERE flag_id='41000000-0000-4000-8000-000000000001'$sql$, 'invoker status-history view retains underlying safe columns');

SELECT throws_ok($sql$SELECT user_id FROM public.flag_edit_history$sql$, '42501', NULL, 'edit-history byline column stays private');

SELECT throws_ok($sql$INSERT INTO public.flag_status_history(flag_id,to_status) VALUES('41000000-0000-4000-8000-000000000001','verified')$sql$, '42501', NULL, 'status history is trigger-owned');

SELECT throws_ok($sql$INSERT INTO public.point_events(user_id,event_type,delta) VALUES('31000000-0000-4000-8000-000000000001','flag_submitted',999)$sql$, '42501', NULL, 'reward ledger is trigger-owned');

SELECT throws_ok($sql$INSERT INTO public.realtime_subscribe_log(user_id,event,channel) VALUES('31000000-0000-4000-8000-000000000001','subscribe','forged')$sql$, '42501', NULL, 'realtime writes must use the bounded RPC');

SELECT throws_ok($sql$INSERT INTO public.users(id,display_name) VALUES(gen_random_uuid(),'forged')$sql$, '42501', NULL, 'public user rows are Auth-trigger-owned');

SELECT throws_ok($sql$DELETE FROM public.users WHERE id='31000000-0000-4000-8000-000000000001'$sql$, '42501', NULL, 'direct application user DELETE is not a client route');

SELECT lives_ok($sql$SELECT public.log_realtime_event('subscribe','fda012-synthetic')$sql$, 'realtime RPC retains its owner-held sequence and write rights');

RESET ROLE; SET LOCAL request.jwt.claim.role='authenticated'; SET LOCAL request.jwt.claim.sub='31000000-0000-4000-8000-000000000002'; SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*) FROM public.push_tokens WHERE user_id='31000000-0000-4000-8000-000000000001'), 0::bigint, 'other client cannot enumerate token owner');

SELECT lives_ok($sql$DELETE FROM public.push_tokens WHERE user_id='31000000-0000-4000-8000-000000000001'$sql$, 'other token delete exposes no row');

SELECT is((SELECT count(*) FROM public.notification_preferences WHERE user_id='31000000-0000-4000-8000-000000000001'), 0::bigint, 'preference RLS remains own-row');

RESET ROLE; SET LOCAL request.jwt.claim.role='service_role'; SET LOCAL request.jwt.claim.sub=''; SET LOCAL ROLE service_role;

SELECT is((SELECT token FROM public.push_tokens WHERE user_id='31000000-0000-4000-8000-000000000001'), 'synthetic-token-two', 'deployed notification lookup works with column SELECT only');

SELECT throws_ok($sql$SELECT platform FROM public.push_tokens$sql$, '42501', NULL, 'notification service cannot read unneeded token fields');

SELECT lives_ok($sql$UPDATE public.flags SET user_id=NULL WHERE user_id='31000000-0000-4000-8000-000000000001'$sql$, 'deployed v4 account deletion can deattribute flags using its exact filter');

SELECT is((SELECT count(user_id) FROM public.flags WHERE user_id='31000000-0000-4000-8000-000000000001'), 0::bigint, 'deployed deletion actually clears attribution');

SELECT is((SELECT public.verify_webhook_secret('synthetic-nonmatching-input')), false, 'trusted webhook verifier remains callable without exposing a secret');

SELECT throws_ok($sql$SELECT * FROM public.flags$sql$, '42501', NULL, 'service cannot enumerate flag content');

SELECT throws_ok($sql$SELECT * FROM public.users$sql$, '42501', NULL, 'service cannot enumerate private profiles');

SELECT throws_ok($sql$DELETE FROM public.flags WHERE user_id IS NULL$sql$, '42501', NULL, 'service cannot broadly delete flags');

SELECT throws_ok($sql$INSERT INTO public.feedback(body) VALUES('service bypass')$sql$, '42501', NULL, 'service cannot inject feedback');

SELECT throws_ok($sql$SELECT public.current_user_can_admin()$sql$, '42501', NULL, 'service cannot use client admin wrapper');

SELECT throws_ok($sql$SELECT public.handle_new_user()$sql$, '42501', NULL, 'service cannot invoke Auth trigger directly');

RESET ROLE; SET LOCAL request.jwt.claim.role='anon'; SET LOCAL request.jwt.claim.sub=''; SET LOCAL ROLE anon;

SELECT throws_ok($sql$TRUNCATE TABLE public.flags$sql$, '42501', NULL, 'anon cannot bypass RLS using TRUNCATE');

SELECT throws_ok($sql$CREATE TABLE phase03a_ref_probes.anon_probe(flag_id uuid REFERENCES public.flags(id))$sql$, '42501', NULL, 'anon cannot create REFERENCES to application data');

SELECT throws_ok($sql$SELECT nextval('public.point_events_id_seq')$sql$, '42501', NULL, 'anon cannot allocate reward IDs directly');

SELECT throws_ok($sql$SELECT setval('public.realtime_subscribe_log_id_seq',999)$sql$, '42501', NULL, 'anon cannot overwrite log sequence');

RESET ROLE; SET LOCAL request.jwt.claim.role='authenticated'; SET LOCAL request.jwt.claim.sub='31000000-0000-4000-8000-000000000001'; SET LOCAL ROLE authenticated;

SELECT throws_ok($sql$TRUNCATE TABLE public.flags$sql$, '42501', NULL, 'authenticated cannot bypass RLS using TRUNCATE');

SELECT throws_ok($sql$CREATE TABLE phase03a_ref_probes.authenticated_probe(flag_id uuid REFERENCES public.flags(id))$sql$, '42501', NULL, 'authenticated cannot create REFERENCES to application data');

SELECT throws_ok($sql$SELECT nextval('public.point_events_id_seq')$sql$, '42501', NULL, 'authenticated cannot allocate reward IDs directly');

SELECT throws_ok($sql$SELECT setval('public.realtime_subscribe_log_id_seq',999)$sql$, '42501', NULL, 'authenticated cannot overwrite log sequence');

RESET ROLE; SET LOCAL request.jwt.claim.role='service_role'; SET LOCAL request.jwt.claim.sub=''; SET LOCAL ROLE service_role;

SELECT throws_ok($sql$TRUNCATE TABLE public.flags$sql$, '42501', NULL, 'service_role cannot bypass RLS using TRUNCATE');

SELECT throws_ok($sql$CREATE TABLE phase03a_ref_probes.service_probe(flag_id uuid REFERENCES public.flags(id))$sql$, '42501', NULL, 'service_role cannot create REFERENCES to application data');

SELECT throws_ok($sql$SELECT nextval('public.point_events_id_seq')$sql$, '42501', NULL, 'service_role cannot allocate reward IDs directly');

SELECT throws_ok($sql$SELECT setval('public.realtime_subscribe_log_id_seq',999)$sql$, '42501', NULL, 'service_role cannot overwrite log sequence');

RESET ROLE; SET LOCAL request.jwt.claim.role='anon'; SET LOCAL request.jwt.claim.sub=''; SET LOCAL ROLE anon;

SELECT throws_ok($sql$INSERT INTO public.flags(user_id,lat,lng,category,severity,created_at) VALUES(NULL,0,0,'no_ramp',1,now()-interval '1 hour')$sql$, '42501', NULL, 'guest cannot backdate report input to defeat emergency cap');

SELECT throws_ok($sql$SELECT body FROM public.feedback$sql$, '42501', NULL, 'guest feedback remains write-only');

SELECT throws_ok($sql$UPDATE public.feedback SET body='forged'$sql$, '42501', NULL, 'guest feedback UPDATE is unavailable');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.push_tokens WHERE user_id='31000000-0000-4000-8000-000000000001'), 1::bigint, 'unrelated token deletion had no effect');

SELECT lives_ok($sql$DELETE FROM auth.users WHERE id='31000000-0000-4000-8000-000000000001'$sql$, 'local Auth-parent deletion executes FK actions without service child DELETE grants');

SELECT is((SELECT count(*) FROM public.users WHERE id='31000000-0000-4000-8000-000000000001'), 0::bigint, 'Auth cascade removes its public profile');

SELECT is((SELECT count(*) FROM public.push_tokens WHERE user_id='31000000-0000-4000-8000-000000000001'), 0::bigint, 'Auth cascade removes tokens without service child rights');

SELECT is((SELECT count(*) FROM public.notification_preferences WHERE user_id='31000000-0000-4000-8000-000000000001'), 0::bigint, 'Auth cascade removes preferences without service child rights');

SELECT is((SELECT count(*) FROM public.point_events WHERE user_id='31000000-0000-4000-8000-000000000001'), 0::bigint, 'Auth cascade removes reward events without service child rights');

SELECT is((SELECT count(*) FROM public.flags WHERE id='41000000-0000-4000-8000-000000000001' AND user_id IS NULL), 1::bigint, 'deattributed contribution survives account cascade');

SELECT * FROM finish();

ROLLBACK;
