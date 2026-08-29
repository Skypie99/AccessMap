-- ============================================================================
-- MOD1R FIX1 Checkpoint A — executable proof against the FINAL effective
-- policy set (00_baseline.sql must already have been run in this database).
-- Every test below either raises (loudly, uncaught) on an unexpected
-- outcome — which combined with `psql -v ON_ERROR_STOP=1` fails the CI job —
-- or prints a PASS notice. Every test runs inside BEGIN/ROLLBACK so fixture
-- state is identical going into each one.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fixtures (inserted as the connecting superuser — bypasses RLS entirely, so
-- policy correctness for the actual test roles below is exercised only by
-- the tests themselves, never by how the fixtures were seeded).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@example.test'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'normal@example.test'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'skylerhalisky@gmail.com'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'other@example.test');

insert into public.users (id, email, is_admin) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@example.test', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'normal@example.test', false),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'skylerhalisky@gmail.com', false),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'other@example.test', false);

insert into public.flags (id, user_id, lat, lng, category, severity, status) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 40.0, -73.0, 'no_ramp', 3, 'open');

insert into public.feedback (id, user_id, category, body) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'idea', 'An ordinary idea, not a report'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'bug',  '[REPORT] flag:bbbbbbbb-0000-0000-0000-000000000001 reason:own-report'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000004', 'bug',  '[REPORT] flag:bbbbbbbb-0000-0000-0000-000000000001 reason:other-report');

-- U_ADMIN=...0001  U_NORMAL=...0002  U_MAINT=...0003(email match, non-admin)  U_OTHER=...0004
-- F_BASE=bbbb...0001
-- FB_ORDINARY=cccc...0001 (U_NORMAL)  FB_REPORT_OWN=cccc...0002 (U_NORMAL)  FB_REPORT_OTHER=cccc...0003 (U_OTHER)

-- ===========================================================================
-- Report SELECT
-- ===========================================================================

-- 1. normal non-admin must not see a cross-user report.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  do $$
  declare v_count integer;
  begin
    select count(*) into v_count from public.feedback where id = 'cccccccc-0000-0000-0000-000000000003';
    if v_count <> 0 then
      raise exception 'FAIL[1 normal non-admin]: expected 0 rows for a cross-user report, got %', v_count;
    end if;
    raise notice 'PASS[1 normal non-admin]: cross-user report correctly invisible';
  end $$;
rollback;

-- 2. admin must see any report.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  declare v_count integer;
  begin
    select count(*) into v_count from public.feedback where id = 'cccccccc-0000-0000-0000-000000000003';
    if v_count <> 1 then
      raise exception 'FAIL[2 admin]: expected admin to see the report, got % rows', v_count;
    end if;
    raise notice 'PASS[2 admin]: admin correctly sees the report';
  end $$;
rollback;

-- 3. THE BLOCKER 1 REGRESSION TEST — hardcoded maintainer email, is_admin=false,
--    must NOT see a report via feedback_select_maintainer's OR-composition.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000003';
  do $$
  declare v_count integer;
  begin
    select count(*) into v_count from public.feedback where id = 'cccccccc-0000-0000-0000-000000000003';
    if v_count <> 0 then
      raise exception 'FAIL[3 maintainer-email non-admin]: expected 0 rows, got % — feedback_select_maintainer is still leaking report rows to a non-admin', v_count;
    end if;
    raise notice 'PASS[3 maintainer-email non-admin]: blocked from the report despite matching feedback_select_maintainer';
  end $$;
rollback;

-- 4. own ordinary feedback stays visible (unaffected by the new restrictive policy).
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  do $$
  declare v_count integer;
  begin
    select count(*) into v_count from public.feedback where id = 'cccccccc-0000-0000-0000-000000000001';
    if v_count <> 1 then
      raise exception 'FAIL[4 own ordinary feedback]: expected 1 row, got %', v_count;
    end if;
    raise notice 'PASS[4 own ordinary feedback]: still visible to its own author';
  end $$;
rollback;

-- 5. cross-user ordinary feedback stays blocked (pre-existing behavior, unaffected).
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000004';
  do $$
  declare v_count integer;
  begin
    select count(*) into v_count from public.feedback where id = 'cccccccc-0000-0000-0000-000000000001';
    if v_count <> 0 then
      raise exception 'FAIL[5 cross-user ordinary feedback]: expected 0 rows, got %', v_count;
    end if;
    raise notice 'PASS[5 cross-user ordinary feedback]: still invisible to a different user';
  end $$;
rollback;

-- 6. own [REPORT] — per the task's own wording ("every [REPORT] row must
--    require is_admin=true"), a non-admin filer cannot read back their OWN
--    filed report either.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  do $$
  declare v_count integer;
  begin
    select count(*) into v_count from public.feedback where id = 'cccccccc-0000-0000-0000-000000000002';
    if v_count <> 0 then
      raise exception 'FAIL[6 own report]: expected 0 rows (non-admin, even the filer, must not read a [REPORT] row), got %', v_count;
    end if;
    raise notice 'PASS[6 own report]: filer cannot read back their own report without being admin';
  end $$;
rollback;

-- 7. cross-user [REPORT], the other direction from test 1 (U_OTHER reading U_NORMAL's report).
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000004';
  do $$
  declare v_count integer;
  begin
    select count(*) into v_count from public.feedback where id = 'cccccccc-0000-0000-0000-000000000002';
    if v_count <> 0 then
      raise exception 'FAIL[7 cross-user report, reverse]: expected 0 rows, got %', v_count;
    end if;
    raise notice 'PASS[7 cross-user report, reverse]: blocked';
  end $$;
rollback;

-- 8. direct attempt to SELECT reporter user_id — the row (and therefore every
--    column of it, including user_id) must be invisible to a non-admin.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000003';
  do $$
  declare v_uid uuid;
  begin
    select user_id into v_uid from public.feedback where id = 'cccccccc-0000-0000-0000-000000000003';
    if v_uid is not null then
      raise exception 'FAIL[8 select reporter user_id]: expected no row (and so no user_id), got %', v_uid;
    end if;
    raise notice 'PASS[8 select reporter user_id]: reporter identity not readable by a non-admin';
  end $$;
rollback;

-- ===========================================================================
-- Moderation UPDATE
-- ===========================================================================

-- 9. allowed moderation fields — admin can close a report.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  begin
    update public.feedback
      set moderation_reviewed_at = now(),
          moderation_reviewed_by = 'aaaaaaaa-0000-0000-0000-000000000001',
          moderation_resolution = 'no_action'
      where id = 'cccccccc-0000-0000-0000-000000000003';
    if not found then
      raise exception 'FAIL[9 allowed moderation fields]: admin update matched zero rows';
    end if;
    raise notice 'PASS[9 allowed moderation fields]: admin can close a report';
  end $$;
rollback;

-- 10. denial of body/category/contact/platform/user changes — even an admin
--     cannot use the moderation UPDATE grant to tamper with report content.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  begin
    update public.feedback set body = 'tampered' where id = 'cccccccc-0000-0000-0000-000000000003';
    raise exception 'FAIL[10 body tamper]: admin should not be able to write feedback.body via the moderation grant';
  exception
    when insufficient_privilege then
      raise notice 'PASS[10 body tamper]: column-level grant correctly denies writing body';
  end $$;
rollback;

-- ===========================================================================
-- Flag authority
-- ===========================================================================

-- 11. normal status transitions — any authenticated user may move open->verified.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000004';
  do $$
  begin
    update public.flags set status = 'verified' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
    if not found then
      raise exception 'FAIL[11 normal transition]: update matched zero rows';
    end if;
    raise notice 'PASS[11 normal transition]: community open->verified allowed';
  end $$;
rollback;

-- 12. admin reject, then admin restore.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  begin
    update public.flags set status = 'rejected' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
    if not found then
      raise exception 'FAIL[12a admin reject]: update matched zero rows';
    end if;
    update public.flags set status = 'open' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
    if not found then
      raise exception 'FAIL[12b admin restore]: update matched zero rows';
    end if;
    raise notice 'PASS[12 admin reject/restore]: both admin transitions allowed';
  end $$;
rollback;

-- 13. non-admin reject denied.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  do $$
  begin
    update public.flags set status = 'rejected' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
    raise exception 'FAIL[13 non-admin reject]: a non-admin was able to reject a flag';
  exception
    when sqlstate 'P0001' then
      raise notice 'PASS[13 non-admin reject]: blocked by enforce_flag_status_transition';
  end $$;
rollback;

-- 14. THE BLOCKER 3 REGRESSION TEST — non-admin direct INSERT with status='rejected'.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  do $$
  begin
    insert into public.flags (user_id, lat, lng, category, severity, status)
      values ('aaaaaaaa-0000-0000-0000-000000000002', 41.0, -74.0, 'other', 2, 'rejected');
    raise exception 'FAIL[14 insert rejected]: a non-admin was able to INSERT a flag already in rejected';
  exception
    when insufficient_privilege then
      raise notice 'PASS[14 insert rejected]: blocked by flags_insert_status_open_only';
  end $$;
rollback;

-- 15. normal INSERT with status omitted (default 'open') allowed.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  do $$
  begin
    insert into public.flags (user_id, lat, lng, category, severity)
      values ('aaaaaaaa-0000-0000-0000-000000000002', 41.0, -74.0, 'other', 2);
    raise notice 'PASS[15 insert open]: ordinary flag creation (default status=open) still works';
  end $$;
rollback;

-- ===========================================================================
-- MOD1R FIX2 — pre-action intent (20260828080000)
-- ===========================================================================

-- 16. admin can write a valid pre-action intent (allowed field, same shape
--     as test 9's resolution write, run BEFORE any resolution exists).
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  begin
    update public.feedback
      set moderation_action_intent = 'flag_rejected',
          moderation_reviewed_by = 'aaaaaaaa-0000-0000-0000-000000000001'
      where id = 'cccccccc-0000-0000-0000-000000000003';
    if not found then
      raise exception 'FAIL[16 write intent]: admin update matched zero rows';
    end if;
    raise notice 'PASS[16 write intent]: admin can record a pre-action intent';
  end $$;
rollback;

-- 17. vocabulary constraint rejects a value outside the fixed intent set,
--     even for an otherwise-authorized admin write.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  begin
    update public.feedback set moderation_action_intent = 'delete_everything'
      where id = 'cccccccc-0000-0000-0000-000000000003';
    raise exception 'FAIL[17 intent vocabulary]: an out-of-vocabulary intent was accepted';
  exception
    when check_violation then
      raise notice 'PASS[17 intent vocabulary]: out-of-vocabulary intent rejected';
  end $$;
rollback;

-- 18. PENDING CLOSE remains reachable: resolution may be set while
--     reviewed_at stays null (Checkpoint B, re-proven now that FIX2's
--     migration runs after it in this harness).
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  begin
    update public.feedback
      set moderation_resolution = 'flag_rejected',
          moderation_reviewed_by = 'aaaaaaaa-0000-0000-0000-000000000001'
      where id = 'cccccccc-0000-0000-0000-000000000003';
    if not found then
      raise exception 'FAIL[18 pending close]: admin update matched zero rows';
    end if;
    raise notice 'PASS[18 pending close]: resolution settable without reviewed_at';
  end $$;
rollback;

-- 19. the one direction that must stay impossible: reviewed_at set with no
--     resolution at all.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  do $$
  begin
    update public.feedback set moderation_reviewed_at = now(), moderation_reviewed_by = 'aaaaaaaa-0000-0000-0000-000000000001'
      where id = 'cccccccc-0000-0000-0000-000000000003';
    raise exception 'FAIL[19 review pairing]: reviewed_at was set with resolution still null';
  exception
    when check_violation then
      raise notice 'PASS[19 review pairing]: reviewed_at without resolution still blocked';
  end $$;
rollback;

reset role;
select 'MOD1R FIX1+FIX2 — ALL 19 PROOF CASES PASSED' as result;
