-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: phase-three-b-disposable
-- Build 33 / pinned-web direct status bridge proof. All rows roll back.
begin;
set local search_path = public, phase03b_tap, extensions;
select plan(30);

insert into auth.users(id,email,raw_user_meta_data) values
('bc000000-0000-4000-8000-000000000001','p03b-bridge-owner@example.invalid','{}'),
('bc000000-0000-4000-8000-000000000002','p03b-bridge-user@example.invalid','{}'),
('bc000000-0000-4000-8000-000000000003','p03b-bridge-admin@example.invalid','{}'),
('bc000000-0000-4000-8000-000000000004','p03b-bridge-other@example.invalid','{}');
update public.users set is_admin = (id='bc000000-0000-4000-8000-000000000003'), points=0
where id::text like 'bc000000-%';

insert into public.flags(id,user_id,lat,lng,category,severity,description,status,last_moderation_reason_code) values
('bd000000-0000-4000-8000-000000000001','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'legacy verify','open',null),
('bd000000-0000-4000-8000-000000000002','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'legacy resolve','open',null),
('bd000000-0000-4000-8000-000000000003','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'legacy verified resolve','verified',null),
('bd000000-0000-4000-8000-000000000004','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'legacy reopen','resolved',null),
('bd000000-0000-4000-8000-000000000005','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'invalid transition','verified',null),
('bd000000-0000-4000-8000-000000000006','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'direct reject','open',null),
('bd000000-0000-4000-8000-000000000007','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'direct restore','rejected','duplicate'),
('bd000000-0000-4000-8000-000000000008','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'rpc transitions','open',null),
('bd000000-0000-4000-8000-000000000009','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'rpc moderation','open',null),
('bd000000-0000-4000-8000-000000000010','bc000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'owner direct','open',null);
update public.users set points=0 where id::text like 'bc000000-%';
delete from public.point_events where user_id::text like 'bc000000-%';

select ok(has_column_privilege('authenticated','public.flags','status','UPDATE'),'authenticated has only the required direct status capability');
select ok(not has_column_privilege('anon','public.flags','status','UPDATE'),'anon has no direct status capability');
select ok(not has_column_privilege('authenticated','public.flags','last_moderation_reason_code','UPDATE'),'direct clients cannot write moderation reasons');
select ok(exists(select 1 from pg_policy where polrelid='public.flags'::regclass and polname='flags status update by any authenticated'),'community status RLS policy is retained');
select ok((select position('public.flags' in pg_get_expr(polqual,polrelid))=0 from pg_policy where polrelid='public.flags'::regclass and polname='flags owner edit open'),'owner edit policy is non-recursive');

reset role; set local request.jwt.claim.sub='bc000000-0000-4000-8000-000000000002'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
with changed as (update public.flags set status='verified' where id='bd000000-0000-4000-8000-000000000001' and status='open' returning id) select is((select count(*) from changed),1::bigint,'Build 33 direct open-to-verified CAS updates one row');
select is((select status from public.flags where id='bd000000-0000-4000-8000-000000000001'),'verified','direct verification persists');
with changed as (update public.flags set status='resolved' where id='bd000000-0000-4000-8000-000000000002' and status='open' returning id) select is((select count(*) from changed),1::bigint,'pinned-web direct open-to-resolved CAS updates one row');
select is((select status from public.flags where id='bd000000-0000-4000-8000-000000000002'),'resolved','direct resolution persists');
with changed as (update public.flags set status='resolved' where id='bd000000-0000-4000-8000-000000000003' and status='verified' returning id) select is((select count(*) from changed),1::bigint,'direct verified-to-resolved remains compatible');
with changed as (update public.flags set status='open' where id='bd000000-0000-4000-8000-000000000004' and status='resolved' returning id) select is((select count(*) from changed),1::bigint,'threshold-decided direct resolved-to-open remains compatible');
with changed as (update public.flags set status='resolved' where id='bd000000-0000-4000-8000-000000000001' and status='open' returning id) select is((select count(*) from changed),0::bigint,'stale direct expected status changes zero rows');
select throws_ok($sql$update public.flags set status='open' where id='bd000000-0000-4000-8000-000000000005' and status='verified'$sql$,'P0001','illegal flag status transition: verified -> open','invalid direct transition is rejected by the authoritative trigger');
select throws_ok($sql$update public.flags set status='rejected' where id='bd000000-0000-4000-8000-000000000006' and status='open'$sql$,'42501','Reject and restore require the audited status RPC.','non-admin direct reject is denied');
select lives_ok($sql$update public.flags set description='tampered', status='verified' where id='bd000000-0000-4000-8000-000000000006' and status='open'$sql$,'legacy non-owner status write may include only the already-granted columns');
select is((select description from public.flags where id='bd000000-0000-4000-8000-000000000006'),'direct reject','non-owner trigger preserves unrelated content during a status write');
select throws_ok($sql$update public.flags set last_moderation_reason_code='other' where id='bd000000-0000-4000-8000-000000000006'$sql$,'42501',null,'authenticated client cannot write server-owned reason column');
select lives_ok($sql$select * from public.transition_flag_status('bd000000-0000-4000-8000-000000000008','open','verified',null,null)$sql$,'new RPC verify path remains available');
select lives_ok($sql$select * from public.transition_flag_status('bd000000-0000-4000-8000-000000000008','verified','resolved',null,null)$sql$,'new RPC resolve path remains available');
select throws_ok($sql$select * from public.transition_flag_status('bd000000-0000-4000-8000-000000000009','open','rejected','duplicate',null)$sql$,'42501','Only Flagstone admins can reject reports.','new RPC still denies non-admin rejection');

reset role; set local request.jwt.claim.sub='bc000000-0000-4000-8000-000000000003'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select throws_ok($sql$update public.flags set status='rejected' where id='bd000000-0000-4000-8000-000000000009' and status='open'$sql$,'42501','Reject and restore require the audited status RPC.','admin direct reject cannot bypass reason and audit');
select throws_ok($sql$update public.flags set status='open' where id='bd000000-0000-4000-8000-000000000007' and status='rejected'$sql$,'42501','Reject and restore require the audited status RPC.','admin direct restore cannot bypass reason and audit');
select lives_ok($sql$select * from public.transition_flag_status('bd000000-0000-4000-8000-000000000009','open','rejected','inaccurate',null)$sql$,'admin audited RPC reject succeeds');
select lives_ok($sql$select * from public.transition_flag_status('bd000000-0000-4000-8000-000000000009','rejected','open','new_evidence',null)$sql$,'admin audited RPC restore succeeds');

reset role;
select is((select count(*) from public.flag_moderation_events where flag_id='bd000000-0000-4000-8000-000000000009'),2::bigint,'RPC reject and restore append two audit rows');
select is((select count(*) from public.flag_moderation_events where flag_id='bd000000-0000-4000-8000-000000000007'),0::bigint,'denied direct restore appends no audit row');
select is((select user_id from public.flag_status_history where flag_id='bd000000-0000-4000-8000-000000000001' and to_status='verified' order by created_at desc limit 1),'bc000000-0000-4000-8000-000000000002'::uuid,'legacy direct status history binds the authenticated actor');

set local request.jwt.claim.sub='bc000000-0000-4000-8000-000000000001'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select lives_ok($sql$update public.flags set status='verified' where id='bd000000-0000-4000-8000-000000000010' and status='open'$sql$,'owner direct verification remains compatible');
reset role;
select is((select status from public.flags where id='bd000000-0000-4000-8000-000000000010'),'verified','owner direct verification persists');

set local request.jwt.claim.sub=''; set local request.jwt.claim.role='anon'; set local role anon;
select throws_ok($sql$update public.flags set status='verified' where id='bd000000-0000-4000-8000-000000000006'$sql$,'42501',null,'anon direct status update is denied');

reset role;
select * from finish();
rollback;
