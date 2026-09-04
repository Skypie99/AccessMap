-- Staging-only pgTAP proof for D1F4R3-FIX2. Run after an authorized migration
-- apply against the real catalog. It verifies both effective grants and RLS
-- policies; Jest cannot establish Data API role behavior without PostgreSQL.
begin;

select plan(7);

select ok(
  not has_table_privilege('anon', 'public.flags', 'DELETE'),
  'anon has no direct flags DELETE table privilege'
);

select ok(
  not has_table_privilege('authenticated', 'public.flags', 'DELETE'),
  'authenticated has no direct flags DELETE table privilege'
);

select ok(
  has_table_privilege('service_role', 'public.flags', 'DELETE'),
  'service_role retains server-only flags DELETE authority'
);

select is_empty(
  $$
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'flags'
      and cmd in ('DELETE', 'ALL')
  $$,
  'no public.flags DELETE or ALL RLS policy remains to authorize a client path'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select throws_ok(
  $$ delete from public.flags where user_id = '11111111-1111-4111-8111-111111111111' $$,
  '42501',
  null,
  'authenticated owner direct DELETE is denied before RLS row matching'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select throws_ok(
  $$ delete from public.flags where id = '33333333-3333-4333-8333-333333333333' $$,
  '42501',
  null,
  'authenticated admin direct DELETE is denied before RLS row matching'
);

reset role;
select ok(
  has_table_privilege('authenticated', 'public.flags', 'SELECT, INSERT, UPDATE'),
  'legitimate authenticated read/create/update table grants remain available'
);

select * from finish();
rollback;
