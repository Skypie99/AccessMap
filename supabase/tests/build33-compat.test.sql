-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: phase-three-disposable
-- STAGE-MF-06 — Build 33 client compatibility contract.
--
-- Phase 03A staging passed 217 hosted pgTAP assertions and STILL silently broke
-- every shipped client, because every assertion was written against the INTENDED
-- new posture and none against what the SHIPPED client actually asks for. This
-- suite closes that gap: it exercises the exact query shapes in the submitted
-- iOS tree f5594171 and the pinned web tree ebf091c2.
--
--   src/lib/admin.ts:31         .from('users').select('is_admin').eq('id', uid).single()
--   src/lib/flags.ts:1682       listLeaderboard()      select id, display_name, avatar_url, points
--                                                      order by points desc limit n
--   src/lib/flags.ts:1702       getUserLeaderboardRank() select points where id = uid
--   src/lib/flags.ts:1717       getUserLeaderboardRank() count(*) where points > mine
--   comment author hydration    users joined to flag_comments for display_name
--
-- The final section applies Stage B INSIDE this transaction to prove the split is
-- load-bearing rather than decorative: every shipped shape above must break there,
-- and the bounded replacements must keep working. Everything rolls back.
BEGIN;
SET LOCAL search_path = public, phase03a_tap, extensions;
SELECT plan(25);

-- ------------------------------------------------------------------ fixtures
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('33000000-0000-4000-8000-000000000001','b33-admin@example.invalid','{"display_name":"B33 Admin"}'),
('33000000-0000-4000-8000-000000000002','b33-user@example.invalid','{"display_name":"B33 User"}'),
('33000000-0000-4000-8000-000000000003','b33-third@example.invalid','{"display_name":"B33 Third"}');
UPDATE public.users SET
  display_name = CASE id WHEN '33000000-0000-4000-8000-000000000001' THEN 'B33 Admin'
                         WHEN '33000000-0000-4000-8000-000000000002' THEN 'B33 User'
                         ELSE 'B33 Third' END,
  points   = CASE id WHEN '33000000-0000-4000-8000-000000000001' THEN 300
                     WHEN '33000000-0000-4000-8000-000000000002' THEN 200 ELSE 100 END,
  is_admin = (id = '33000000-0000-4000-8000-000000000001')
WHERE id IN ('33000000-0000-4000-8000-000000000001',
             '33000000-0000-4000-8000-000000000002',
             '33000000-0000-4000-8000-000000000003');

-- ============================================================ STAGE A posture
-- What the shipped client needs, stated as privileges and policies.

SELECT ok(has_column_privilege('authenticated','public.users','is_admin','SELECT'),
  'B33 admin.ts: authenticated can still SELECT users.is_admin (no 42501)');

SELECT ok(EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.users'::regclass
                 AND polname='users readable by authenticated'),
  'B33 leaderboard: the broad authenticated read policy is still present in Stage A');

SELECT ok(has_column_privilege('authenticated','public.users','points','SELECT'),
  'B33 leaderboard: points remains selectable');
SELECT ok(has_column_privilege('authenticated','public.users','display_name','SELECT'),
  'B33 leaderboard: display_name remains selectable');
SELECT ok(has_column_privilege('authenticated','public.users','avatar_url','SELECT'),
  'B33 leaderboard: avatar_url remains selectable');

-- The bounded replacements exist and are callable, but are NOT yet load-bearing.
SELECT has_function('public','current_user_can_admin','{}'::text[],
  'Stage A adds public.current_user_can_admin()');
SELECT has_function('public','list_public_leaderboard','{integer}'::text[],
  'Stage A adds public.list_public_leaderboard(integer)');
SELECT has_function('public','get_my_leaderboard_rank','{}'::text[],
  'Stage A adds public.get_my_leaderboard_rank()');
SELECT has_function('public','get_comment_author_profiles','{uuid[]}'::text[],
  'Stage A adds public.get_comment_author_profiles(uuid[])');
SELECT ok(has_function_privilege('authenticated','public.list_public_leaderboard(integer)','EXECUTE'),
  'Stage A grants the leaderboard replacement to authenticated');
SELECT ok(has_function_privilege('authenticated','public.current_user_can_admin()','EXECUTE'),
  'Stage A grants the admin replacement to authenticated');

-- ------------------------------------------- behaviour as a real authenticated caller
RESET ROLE; SET LOCAL request.jwt.claim.sub = '33000000-0000-4000-8000-000000000002'; SET LOCAL request.jwt.claim.role = 'authenticated'; SET LOCAL ROLE authenticated;

-- admin.ts's own-row read must not raise.
SELECT lives_ok(
  $$ SELECT is_admin FROM public.users WHERE id = '33000000-0000-4000-8000-000000000002' $$,
  'B33 admin.ts: the shipped own-row is_admin read does not raise');

-- listLeaderboard(): the shipped shape must see more than the caller.
SELECT cmp_ok(
  (SELECT count(*) FROM (
     SELECT id, display_name, avatar_url, points FROM public.users
     ORDER BY points DESC LIMIT 20) q),
  '>=', 3::bigint,
  'B33 listLeaderboard: the shipped query returns all three fixture users, not just the caller');

-- getUserLeaderboardRank(): the count of higher-scoring users must not collapse.
SELECT is(
  (SELECT 1 + count(*) FROM public.users WHERE points > 200),
  2::bigint,
  'B33 rank: the shipped count sees the higher-scoring user, so rank is 2 not 1');

-- comment author hydration must resolve a name for another user's row.
SELECT is(
  (SELECT display_name FROM public.users WHERE id='33000000-0000-4000-8000-000000000001'),
  'B33 Admin',
  'B33 comment authors: another account''s display_name resolves');

RESET ROLE;

-- ================================================= STAGE B cutover, applied here
-- Negative control. If these do NOT flip, the split is not load-bearing and this
-- whole compatibility contract would be worthless.
DROP POLICY "users readable by authenticated" ON public.users;
REVOKE SELECT (is_admin) ON public.users FROM PUBLIC, anon, authenticated;

SELECT ok(NOT has_column_privilege('authenticated','public.users','is_admin','SELECT'),
  'STAGE B: the is_admin column grant is gone');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.users'::regclass
                     AND polname='users readable by authenticated'),
  'STAGE B: the broad authenticated read policy is gone');

RESET ROLE; SET LOCAL request.jwt.claim.sub = '33000000-0000-4000-8000-000000000002'; SET LOCAL request.jwt.claim.role = 'authenticated'; SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT is_admin FROM public.users WHERE id = '33000000-0000-4000-8000-000000000002' $$,
  '42501',
  NULL,
  'STAGE B: the shipped admin.ts read now raises 42501 — this is the silent admin-UI loss');

SELECT is(
  (SELECT count(*) FROM (
     SELECT id, display_name, points FROM public.users
     ORDER BY points DESC LIMIT 20) q),
  1::bigint,
  'STAGE B: the shipped leaderboard query silently collapses to the caller alone');

SELECT is(
  (SELECT 1 + count(*) FROM public.users WHERE points > 200),
  1::bigint,
  'STAGE B: the shipped rank count silently reports rank 1 for everyone');

SELECT is(
  (SELECT display_name FROM public.users WHERE id='33000000-0000-4000-8000-000000000001'),
  NULL,
  'STAGE B: another account''s display_name silently disappears');

-- The bounded replacements must survive the cutover — that is the whole point.
SELECT cmp_ok(
  (SELECT count(*) FROM public.list_public_leaderboard(20)),
  '>=', 3::bigint,
  'STAGE B: list_public_leaderboard() still returns every user after the cutover');

SELECT is(
  (SELECT rank FROM public.get_my_leaderboard_rank()),
  2::bigint,
  'STAGE B: get_my_leaderboard_rank() still reports the true rank after the cutover');

SELECT ok(NOT public.current_user_can_admin(),
  'STAGE B: current_user_can_admin() answers for a non-admin caller without reading is_admin');

RESET ROLE; SET LOCAL request.jwt.claim.sub = '33000000-0000-4000-8000-000000000001'; SET LOCAL request.jwt.claim.role = 'authenticated'; SET LOCAL ROLE authenticated;
SELECT ok(public.current_user_can_admin(),
  'STAGE B: current_user_can_admin() still returns true for the admin — capability is preserved, only the column read is closed');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
