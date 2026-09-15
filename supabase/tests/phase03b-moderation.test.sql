-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: phase-three-b-disposable
-- Synthetic local-only Phase03B moderation proof. All rows roll back.
begin;
set local search_path = public, phase03b_tap, extensions;
select plan(49);

insert into auth.users(id,email,raw_user_meta_data) values
('b3000000-0000-4000-8000-000000000001','p03b-owner@example.invalid','{}'),
('b3000000-0000-4000-8000-000000000002','p03b-user@example.invalid','{}'),
('b3000000-0000-4000-8000-000000000003','p03b-admin@example.invalid','{}'),
('b3000000-0000-4000-8000-000000000004','p03b-other@example.invalid','{}');
update public.users set is_admin = (id='b3000000-0000-4000-8000-000000000003'), points=0
where id::text like 'b3000000-%';

insert into public.notification_preferences(user_id, flag_status_updates)
values ('b3000000-0000-4000-8000-000000000001', false)
on conflict (user_id) do update set flag_status_updates = excluded.flag_status_updates;

insert into public.flags(id,user_id,lat,lng,category,severity,status,photo_url,photo_object_key) values
('b4000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open',null,null),
('b4000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open',null,null),
('b4000000-0000-4000-8000-000000000003','b3000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'rejected',null,null),
('b4000000-0000-4000-8000-000000000004','b3000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open','https://example.invalid/photo.jpg',null),
('b4000000-0000-4000-8000-000000000005','b3000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open',null,null);
insert into public.flag_comments(id,flag_id,user_id,content) values
('b5000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000005','b3000000-0000-4000-8000-000000000002','Synthetic report target'),
('b5000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000005','b3000000-0000-4000-8000-000000000002','Parentless report target'),
('b5000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000005','b3000000-0000-4000-8000-000000000002','Mismatched parent target');
update public.users set points=0 where id::text like 'b3000000-%';
delete from public.point_events where user_id::text like 'b3000000-%';

insert into public.feedback(id,user_id,body) values
('b6000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000002','[REPORT] v2 target=flag id=b4000000-0000-4000-8000-000000000001 cat=spam' || E'\n\nSynthetic'),
('b6000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000002','[REPORT] future malformed' || E'\n\nSynthetic'),
('b6000000-0000-4000-8000-000000000003','b3000000-0000-4000-8000-000000000002','[REPORT] v2 target=flag id=b4000000-0000-4000-8000-000000000002' || E'\n\nSynthetic'),
('b6000000-0000-4000-8000-000000000004','b3000000-0000-4000-8000-000000000002','[REPORT] v2 target=flag id=b4000000-0000-4000-8000-000000000004' || E'\n\nSynthetic'),
('b6000000-0000-4000-8000-000000000005','b3000000-0000-4000-8000-000000000002','[REPORT] v2 target=comment id=b5000000-0000-4000-8000-000000000001 flag=b4000000-0000-4000-8000-000000000005' || E'\n\nSynthetic'),
('b6000000-0000-4000-8000-000000000006','b3000000-0000-4000-8000-000000000002','[REPORT] v1 target=comment id=b5000000-0000-4000-8000-000000000002' || E'\n\nSynthetic'),
('b6000000-0000-4000-8000-000000000007','b3000000-0000-4000-8000-000000000002','[REPORT] v2 target=comment id=b5000000-0000-4000-8000-000000000003 flag=b4000000-0000-4000-8000-000000000001' || E'\n\nSynthetic');

select ok(not has_column_privilege('authenticated','public.flags','status','UPDATE'), 'authenticated has no direct status UPDATE grant');
select ok(not has_column_privilege('authenticated','public.flags','last_moderation_reason_code','UPDATE'), 'moderation reason is server managed');
select ok(has_function_privilege('authenticated','public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)','EXECUTE'), 'authenticated can use status RPC');
select ok(not has_function_privilege('anon','public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)','EXECUTE'), 'anon cannot use status RPC');
select ok(not has_function_privilege('service_role','public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)','EXECUTE'), 'service role cannot call actor-bound status RPC');
select ok(not has_table_privilege('service_role','public.notification_preferences','SELECT'), 'service role retains no direct preference table read');
select ok(has_function_privilege('service_role','public.flag_status_notifications_enabled(uuid)','EXECUTE'), 'service role can read only the status-notification decision');
select ok(not has_function_privilege('authenticated','public.flag_status_notifications_enabled(uuid)','EXECUTE'), 'authenticated cannot query another user preference through service RPC');
select ok(not has_function_privilege('anon','public.flag_status_notifications_enabled(uuid)','EXECUTE'), 'anon cannot call service preference RPC');
select ok(has_function_privilege('authenticated','public.moderate_report(uuid,text,public.flag_status,text)','EXECUTE'), 'authenticated can reach admin-checked moderation RPC');
select ok(not has_function_privilege('anon','public.moderate_report(uuid,text,public.flag_status,text)','EXECUTE'), 'anon cannot call moderation RPC');
select ok(exists(select 1 from pg_policy where polrelid='public.flags'::regclass and polname='flags rejected hidden from nonadmins' and not polpermissive), 'rejected hiding is restrictive');

reset role; set local role service_role;
select is(public.flag_status_notifications_enabled('b3000000-0000-4000-8000-000000000001'),false,'service preference RPC returns explicit opt-out');
select is(public.flag_status_notifications_enabled('b3000000-0000-4000-8000-000000000004'),true,'service preference RPC applies enabled default for missing row');

reset role; set local request.jwt.claim.sub='b3000000-0000-4000-8000-000000000002'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select throws_ok($sql$update public.flags set status='verified' where id='b4000000-0000-4000-8000-000000000001'$sql$,'42P17',null,'direct status UPDATE cannot execute (legacy recursive owner policy also blocks before write)');
select throws_ok($sql$select * from public.transition_flag_status('b4000000-0000-4000-8000-000000000001','open','rejected','duplicate',null)$sql$,'42501','Only Flagstone admins can reject reports.','non-admin reject is denied');
select lives_ok($sql$select * from public.transition_flag_status('b4000000-0000-4000-8000-000000000005','open','verified',null,null)$sql$,'community legal transition uses CAS RPC');
select is((select status from public.flags where id='b4000000-0000-4000-8000-000000000005'),'verified','community transition persisted');
select is((select count(*) from public.flags where id='b4000000-0000-4000-8000-000000000003'),0::bigint,'non-admin cannot see legacy rejected row');
select throws_ok($sql$update public.flag_moderation_events set reason_code='other'$sql$,'42501',null,'client cannot mutate moderation ledger');

reset role;
update public.users set points=0 where id='b3000000-0000-4000-8000-000000000001';
reset role; set local request.jwt.claim.sub='b3000000-0000-4000-8000-000000000003'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select is((select count(*) from public.list_open_moderation_reports()),7::bigint,'admin queue returns only seven open report rows');
select lives_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000002','no_action',null,null)$sql$,'admin can close malformed report as no_action');
reset role;
select is((select moderation_resolution from public.feedback where id='b6000000-0000-4000-8000-000000000002'),'no_action','malformed report closed without fabricated target');
set local request.jwt.claim.sub='b3000000-0000-4000-8000-000000000003'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select lives_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000001','flag_rejected','open','duplicate')$sql$,'admin atomically rejects and closes report');
select is((select status from public.flags where id='b4000000-0000-4000-8000-000000000001'),'rejected','rejection persisted');
select is((select last_moderation_reason_code from public.flags where id='b4000000-0000-4000-8000-000000000001'),'duplicate','approved reject reason persisted');
reset role;
select is((select moderation_resolution from public.feedback where id='b6000000-0000-4000-8000-000000000001'),'flag_rejected','report closure persisted atomically');
set local request.jwt.claim.sub='b3000000-0000-4000-8000-000000000003'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select is((select count(*) from public.flag_moderation_events where flag_id='b4000000-0000-4000-8000-000000000001' and action='reject'),1::bigint,'one rejection audit row appended');
select is((select points from public.users where id='b3000000-0000-4000-8000-000000000001'),0,'rejection is points neutral');
select throws_ok($sql$select * from public.transition_flag_status('b4000000-0000-4000-8000-000000000001','open','verified',null,null)$sql$,'P0001','This flag changed since you opened it. Refresh and try again.','stale CAS is refused');
select lives_ok($sql$select * from public.transition_flag_status('b4000000-0000-4000-8000-000000000001','rejected','open','moderator_error',null)$sql$,'admin restores rejected report');
select is((select last_moderation_reason_code from public.flags where id='b4000000-0000-4000-8000-000000000001'),'moderator_error','restore reason persisted');
select ok((select reverses_event_id is not null from public.flag_moderation_events where flag_id='b4000000-0000-4000-8000-000000000001' and action='restore'),'new restore links its rejection event');
select lives_ok($sql$select * from public.transition_flag_status('b4000000-0000-4000-8000-000000000003','rejected','open','new_evidence',null)$sql$,'legacy rejected row is recoverable');
select ok((select reverses_event_id is null from public.flag_moderation_events where flag_id='b4000000-0000-4000-8000-000000000003' and action='restore'),'legacy restore is explicitly unlinked');
select throws_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000003','flag_rejected','open',null)$sql$,'22023','A valid rejection reason is required.','reject reason is mandatory');
select is((select moderation_reviewed_at from public.feedback where id='b6000000-0000-4000-8000-000000000003'),null::timestamptz,'failed rejection leaves report open');
select throws_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000004','flag_removed',null,null)$sql$,'55000','Flag removal requires the canonical storage-safe deletion route.','storage-associated flag removal fails closed');
select is((select count(*) from public.flags where id='b4000000-0000-4000-8000-000000000004'),1::bigint,'storage-associated flag remains');
select lives_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000003','flag_removed',null,null)$sql$,'storage-free flag removal and report close are atomic');
select is((select count(*) from public.flags where id='b4000000-0000-4000-8000-000000000002'),0::bigint,'storage-free flag was removed');
select lives_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000005','comment_removed',null,null)$sql$,'comment removal and report close are atomic');
select is((select count(*) from public.flag_comments where id='b5000000-0000-4000-8000-000000000001'),0::bigint,'reported comment was removed');
select lives_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000006','comment_removed',null,null)$sql$,'supported parentless comment report remains actionable');
select is((select count(*) from public.flag_comments where id='b5000000-0000-4000-8000-000000000002'),0::bigint,'parentless reported comment was removed');
select throws_ok($sql$select public.moderate_report('b6000000-0000-4000-8000-000000000007','comment_removed',null,null)$sql$,'22023','Comment report parent flag does not match target.','supplied comment parent must match the target row');
select is((select count(*) from public.flag_comments where id='b5000000-0000-4000-8000-000000000003'),1::bigint,'mismatched parent leaves comment and report untouched');
select throws_ok($sql$delete from public.flag_moderation_events$sql$,'42501',null,'admin cannot delete immutable moderation events');

reset role; set local request.jwt.claim.sub=''; set local request.jwt.claim.role='anon'; set local role anon;
select is((select count(*) from public.flags where status='rejected'),0::bigint,'anon default reads hide rejected rows');

reset role;
select * from finish();
rollback;
