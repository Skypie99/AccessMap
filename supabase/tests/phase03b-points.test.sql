-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: phase-three-b-disposable
-- Synthetic local-only Phase03B reward-integrity proof. All rows roll back.
begin;
set local search_path = public, phase03b_tap, extensions;
select plan(22);

insert into auth.users(id,email,raw_user_meta_data)
select ('b7000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
       'p03b-points-' || n || '@example.invalid', '{}'
from generate_series(1,15) n;
update public.users set points=0, is_admin=(id='b7000000-0000-4000-8000-000000000015')
where id::text like 'b7000000-%';

insert into public.flags(id,user_id,lat,lng,category,severity,status) values
('b8000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open'),
('b8000000-0000-4000-8000-000000000002','b7000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open');
update public.users set points=0 where id::text like 'b7000000-%';
delete from public.point_events where user_id::text like 'b7000000-%';

reset role; set local request.jwt.claim.sub='b7000000-0000-4000-8000-000000000001'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
insert into public.flag_comments(flag_id,user_id,content)
select 'b8000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','Synthetic ' || n
from generate_series(1,6) n;
reset role;
select is((select points from public.users where id='b7000000-0000-4000-8000-000000000001'),5,'only first five UTC-day comments earn points');
select is((select reward_count from public.comment_reward_daily where user_id='b7000000-0000-4000-8000-000000000001' and reward_date=(now() at time zone 'UTC')::date),5::smallint,'daily reward counter caps at five');
select is((select count(*) from public.point_events where user_id='b7000000-0000-4000-8000-000000000001' and event_type='comment_added'),5::bigint,'only five comment reward events append');

update public.users set points=0 where id='b7000000-0000-4000-8000-000000000001';
do $do$
declare n integer;
begin
  for n in 2..12 loop
    insert into public.comment_votes(comment_id,voter_id)
    values (
      (select id from public.flag_comments where content='Synthetic 1'),
      ('b7000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
    );
  end loop;
end
$do$;
select is((select points from public.users where id='b7000000-0000-4000-8000-000000000001'),20,'only first ten comment votes earn points');
select is((select count(*) from public.point_events where user_id='b7000000-0000-4000-8000-000000000001' and event_type='comment_upvoted'),10::bigint,'only ten vote reward events append');
select is((select reward_count from public.comment_vote_reward_counts where comment_id=(select id from public.flag_comments where content='Synthetic 1')),10::smallint,'atomic vote reward counter caps at ten');
select ok(not has_table_privilege('authenticated','public.comment_votes','DELETE'),'authenticated vote deletion privilege is absent');

reset role; set local request.jwt.claim.sub='b7000000-0000-4000-8000-000000000002'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select throws_ok($sql$delete from public.comment_votes where voter_id='b7000000-0000-4000-8000-000000000002'$sql$,'42501',null,'vote deletion is refused');
select throws_ok(format($sql$insert into public.comment_votes(comment_id,voter_id) values (%L,%L)$sql$,(select id from public.flag_comments where content='Synthetic 1'),'b7000000-0000-4000-8000-000000000002'),'23505',null,'same voter cannot earn through reinsertion');

select lives_ok($sql$update public.flags set status='verified' where id='b8000000-0000-4000-8000-000000000001' and status='open'$sql$,'legacy non-owner direct verification succeeds');
select is((select points from public.users where id='b7000000-0000-4000-8000-000000000001'),30,'reporter receives one verification reward');
select is((select points from public.users where id='b7000000-0000-4000-8000-000000000002'),3,'actor receives one verification reward');

reset role; set local request.jwt.claim.sub='b7000000-0000-4000-8000-000000000015'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select lives_ok($sql$select * from public.transition_flag_status('b8000000-0000-4000-8000-000000000001','verified','rejected','inaccurate',null)$sql$,'admin rejection succeeds without penalty');
select lives_ok($sql$select * from public.transition_flag_status('b8000000-0000-4000-8000-000000000001','rejected','open','new_evidence',null)$sql$,'admin restoration succeeds without reward');
select is((select count(*) from public.point_events where flag_id='b8000000-0000-4000-8000-000000000001' and event_type='flag_spam_penalty'),0::bigint,'rejection appends no spam penalty');

reset role; set local request.jwt.claim.sub='b7000000-0000-4000-8000-000000000003'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select lives_ok($sql$select * from public.transition_flag_status('b8000000-0000-4000-8000-000000000001','open','verified',null,null)$sql$,'post-restore verification remains legal');
select is((select points from public.users where id='b7000000-0000-4000-8000-000000000001'),30,'reporter verification reward is once per flag');
select is((select points from public.users where id='b7000000-0000-4000-8000-000000000003'),0,'second actor cannot re-earn claimed verification award');
reset role;
select is((select count(*) from public.flag_point_reward_claims where flag_id='b8000000-0000-4000-8000-000000000001' and event_type like 'flag_verified_%'),2::bigint,'reporter and actor claims persist once');

set local request.jwt.claim.sub='b7000000-0000-4000-8000-000000000001'; set local request.jwt.claim.role='authenticated'; set local role authenticated;
select lives_ok($sql$select * from public.transition_flag_status('b8000000-0000-4000-8000-000000000002','open','resolved',null,null)$sql$,'owner may resolve own report');
reset role;
select is((select count(*) from public.flag_point_reward_claims where flag_id='b8000000-0000-4000-8000-000000000002'),0::bigint,'owner action consumes no milestone claims');
select is((select count(*) from public.point_events where flag_id='b8000000-0000-4000-8000-000000000002' and event_type like 'flag_%'),0::bigint,'owner resolution creates no reporter or actor points');

reset role;
select * from finish();
rollback;
