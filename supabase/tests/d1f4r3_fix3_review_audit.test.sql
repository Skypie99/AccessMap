-- Staging-only pgTAP proof for D1F4R3-FIX3. Run after an authorized migration
-- apply against the real catalog. It proves on the persisted resolver that a
-- two-item review writes exactly one privacy-audit row per FIRST resolution
-- (with that request's exact evidence digest), that identical and conflicting
-- replays add no audit rows, and that the final resolution requeues through
-- the accepted FIX2 phase mapping. Everything rolls back.
begin;

select plan(26);

-- Seeded held operation with two null-object acknowledge items, so this test
-- needs no storage.objects fixture. Digests distinguish the two audit rows.
insert into public.account_deletion_operations (
  operation_id, subject_id, receipt_hash, status,
  review_resume_from, review_reason, review_opened_at,
  worker_lease_token, worker_lease_expires_at
) values (
  'dddddddd-0000-4000-8000-000000000001',
  '44444444-4444-4444-8444-444444444444',
  repeat('00', 32),
  'FAILED_REVIEW_REQUIRED',
  'CLEANING',
  'storage_review_required',
  now(),
  'dddddddd-0000-4000-8000-00000000000c',
  now() + interval '1 hour'
);
insert into public.account_deletion_review_items (
  review_item_id, operation_id, kind, source_ref, reason
) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
   'LEGACY_AVATAR', 'users:avatar:fix3-item-1', 'legacy_avatar_object_unmapped'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001',
   'AUTH_OUTCOME_AMBIGUOUS', 'auth:dddddddd-0000-4000-8000-000000000001', 'auth_outcome_ambiguous');

create temp table fix3_probe (step text primary key, v jsonb);

-- ITEM 1 — FIRST EXECUTION ---------------------------------------------------
insert into fix3_probe
  select 'item1_first', public.resolve_account_deletion_review_item(
    'dddddddd-0000-4000-8000-000000000001', repeat('1a', 32),
    'eeeeeeee-0000-4000-8000-000000000001', 'ACKNOWLEDGE');

select is((select v ->> 'status' from fix3_probe where step = 'item1_first'),
  'waiting_for_review', 'first non-final resolution reports waiting_for_review');
select is((select v ->> 'operation_status' from fix3_probe where step = 'item1_first'),
  'FAILED_REVIEW_REQUIRED', 'operation stays truthfully held for review');
select is((select resolution from public.account_deletion_review_items
    where review_item_id = 'eeeeeeee-0000-4000-8000-000000000001'),
  'ACKNOWLEDGE', 'item 1 is resolved');
select is((select resolution from public.account_deletion_review_items
    where review_item_id = 'eeeeeeee-0000-4000-8000-000000000002'),
  'UNRESOLVED', 'item 2 remains unresolved');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001' and action like 'review_item_%'),
  1, 'first resolution wrote exactly one privacy-audit row');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001'
      and action = 'review_item_ACKNOWLEDGE'
      and actor_kind = 'privacy_reviewer' and actor_id = 'sky'
      and evidence_digest = repeat('1a', 32)),
  1, 'audit row carries item 1 request''s exact evidence digest');

-- ITEM 1 — IDENTICAL REPLAY --------------------------------------------------
insert into fix3_probe
  select 'item1_replay', public.resolve_account_deletion_review_item(
    'dddddddd-0000-4000-8000-000000000001', repeat('1a', 32),
    'eeeeeeee-0000-4000-8000-000000000001', 'ACKNOWLEDGE');

select is((select v ->> 'status' from fix3_probe where step = 'item1_replay'),
  'waiting_for_review', 'identical replay stays truthful');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001' and action like 'review_item_%'),
  1, 'identical replay writes no duplicate audit row');

-- ITEM 1 — CONFLICTING REPLAY ------------------------------------------------
select throws_ok(
  $$ select public.resolve_account_deletion_review_item(
       'dddddddd-0000-4000-8000-000000000001', repeat('1a', 32),
       'eeeeeeee-0000-4000-8000-000000000001', 'DELETE') $$,
  'P0001',
  'Review item already has a different resolution.',
  'conflicting replay fails closed');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001' and action like 'review_item_%'),
  1, 'conflicting replay writes no audit row');
select is((select resolution from public.account_deletion_review_items
    where review_item_id = 'eeeeeeee-0000-4000-8000-000000000001'),
  'ACKNOWLEDGE', 'existing resolution is unchanged by the conflict');

-- ITEM 2 — FINAL RESOLUTION --------------------------------------------------
insert into fix3_probe
  select 'item2_final', public.resolve_account_deletion_review_item(
    'dddddddd-0000-4000-8000-000000000001', repeat('2b', 32),
    'eeeeeeee-0000-4000-8000-000000000002', 'ACKNOWLEDGE');

select is((select v ->> 'status' from fix3_probe where step = 'item2_final'),
  'requeued', 'final resolution requeues the operation');
select is((select v ->> 'operation_status' from fix3_probe where step = 'item2_final'),
  'CLEANING', 'stored CLEANING resume phase maps to CLEANING (accepted FIX2 mapping)');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001' and action like 'review_item_%'),
  2, 'review-resolution audit rows total exactly 2');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001'
      and evidence_digest = repeat('2b', 32)),
  1, 'item 2 audit row carries its exact evidence digest');
select is((select status from public.account_deletion_operations
    where operation_id = 'dddddddd-0000-4000-8000-000000000001'),
  'CLEANING', 'operation durably resumed CLEANING');
select is((select review_resume_from from public.account_deletion_operations
    where operation_id = 'dddddddd-0000-4000-8000-000000000001'),
  null::text, 'review resume phase cleared on requeue');
select is((select worker_lease_token from public.account_deletion_operations
    where operation_id = 'dddddddd-0000-4000-8000-000000000001'),
  null::uuid, 'stale worker lease cleared on requeue');

-- FINAL ITEM — IDENTICAL REPLAY AFTER LATER WORKER PROGRESS -------------------
update public.account_deletion_operations set status = 'VERIFYING'
  where operation_id = 'dddddddd-0000-4000-8000-000000000001';
insert into fix3_probe
  select 'item2_replay', public.resolve_account_deletion_review_item(
    'dddddddd-0000-4000-8000-000000000001', repeat('2b', 32),
    'eeeeeeee-0000-4000-8000-000000000002', 'ACKNOWLEDGE');

select is((select v ->> 'status' from fix3_probe where step = 'item2_replay'),
  'requeued', 'replay after worker progress reports the durable state');
select is((select v ->> 'operation_status' from fix3_probe where step = 'item2_replay'),
  'VERIFYING', 'replay reports the later durable phase, not a stale claim');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001' and action like 'review_item_%'),
  2, 'replay after progress adds no audit row');

-- REPLAY AFTER COMPLETE / SUBJECT REDACTION -----------------------------------
update public.account_deletion_operations
  set status = 'COMPLETE', subject_id = null, completed_at = now()
  where operation_id = 'dddddddd-0000-4000-8000-000000000001';
insert into fix3_probe
  select 'complete_replay', public.resolve_account_deletion_review_item(
    'dddddddd-0000-4000-8000-000000000001', repeat('2b', 32),
    'eeeeeeee-0000-4000-8000-000000000002', 'ACKNOWLEDGE');

select is((select v ->> 'status' from fix3_probe where step = 'complete_replay'),
  'complete', 'replay after COMPLETE reports complete truthfully');
select is((select count(*)::int from public.account_deletion_review_audit
    where operation_id = 'dddddddd-0000-4000-8000-000000000001' and action like 'review_item_%'),
  2, 'replay after COMPLETE adds no audit row');
select is((select subject_id from public.account_deletion_operations
    where operation_id = 'dddddddd-0000-4000-8000-000000000001'),
  null::uuid, 'subject redaction survives replay — no PII restoration');

-- Resolver privilege boundary stays service-role-only ------------------------
select ok(
  not has_function_privilege('anon',
    'public.resolve_account_deletion_review_item(uuid, text, uuid, text)', 'EXECUTE')
  and not has_function_privilege('authenticated',
    'public.resolve_account_deletion_review_item(uuid, text, uuid, text)', 'EXECUTE'),
  'anon and authenticated cannot execute the resolver');
select ok(
  has_function_privilege('service_role',
    'public.resolve_account_deletion_review_item(uuid, text, uuid, text)', 'EXECUTE'),
  'service_role retains resolver execute authority');

select * from finish();
rollback;
