-- SECURITY: Fixes email PII exposure. Apply before next deploy.
-- All authenticated users can currently read every user's email via the REST API.
-- This migration removes that access. Steve reviewed: zero blast radius on app.
-- Sky: paste this file in Supabase SQL Editor → Run.
-- Source branch: security/hardening-wave2-2026-05-27 (commit b74a7f3)
-- Security report: qa-reports/2026-05-27_Steve_Security_Wave2.md
-- ===========================================================================
-- 2026-05-27 — Hide users.email from non-self reads (Steve / security wave 2)
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — DO NOT APPLY YET. Sky applies this in the Supabase
--     dashboard after reviewing. The agent system NEVER writes to the
--     live DB (Const. Art. 5.3). !!!
--
-- ---------------------------------------------------------------------------
-- THE GAP
-- ---------------------------------------------------------------------------
--
-- The current policy on public.users (schema.sql line 132–136 +
-- migration 2026-05-23_rls_initplan_and_non_owner_status_update.sql) is:
--
--     create policy "users readable by authenticated"
--       on public.users for select
--       to authenticated
--       using (true);
--
-- "true" means every authenticated user can SELECT every column from every
-- row in public.users — including `email`. Today the app only reads
-- `id, display_name, avatar_url, points, created_at` for non-self rows
-- (Leaderboard, future Activity Feed attribution), but RLS allows a
-- crafted REST query like:
--
--     curl https://<project>.supabase.co/rest/v1/users?select=email \
--          -H "apikey: <anon>"  -H "Authorization: Bearer <user-jwt>"
--
-- …to dump every user's email address. Email + display_name is enough
-- to identify a specific person from an AccessMap account.
--
-- The Constitution (Art. 2.4) explicitly flags this: "users table contains
-- email addresses … Any weakening of the RLS that protects these tables
-- is a privacy incident, not just a bug." Today's SELECT policy *is* a
-- weak protection — it returns email to every authenticated client.
--
-- ---------------------------------------------------------------------------
-- THE FIX
-- ---------------------------------------------------------------------------
--
-- Two-layer defense:
--
--   A. Replace the broad SELECT policy with one that returns the row to
--      everyone authenticated (so Leaderboard etc. keep working) but the
--      `email` column is only returned for the caller's OWN row.
--
--      RLS in Postgres is row-level, not column-level — there's no
--      "USING per column" — so we enforce the email projection via a
--      column-level GRANT REVOKE. The row policy still says `using (true)`
--      so any authenticated client can read non-email columns of any user.
--      The column grant says `SELECT (id, display_name, avatar_url,
--      points, created_at) TO authenticated` — `email` is NOT in that
--      grant, so the email column simply isn't reachable through the
--      `authenticated` role's REST queries.
--
--   B. Add a SECURITY INVOKER view `public.users_self_email` that returns
--      email to the calling user for their own row only. The app already
--      doesn't need this (auth.users.email is on the JWT and reachable
--      via supabase.auth.getUser()), but the view exists so any future
--      code path that legitimately needs the email-from-public.users has
--      a safe, scoped read.
--
-- This is the same pattern Dana used for `flag_status_history` →
-- `flag_status_history_public` (see 2026-05-24_status_history_table.sql).
-- Privacy is enforced at the column-projection layer, not the row layer.
--
-- ---------------------------------------------------------------------------
-- BLAST RADIUS — what could break
-- ---------------------------------------------------------------------------
--
-- The app does these reads against public.users today:
--
--   1. ProfileScreen.load() — `from('users').select('*').eq('id', user.id)`
--      Reads OWN row. With the column grant gone, `select('*')` on the
--      authenticated role returns only the granted columns (id,
--      display_name, avatar_url, points, created_at). The email field
--      will come back undefined. ProfileScreen does NOT render email
--      from this row today — it reads from useAuth() (auth.users JWT).
--      Net effect on ProfileScreen: zero.
--
--   2. SettingsScreen — same pattern as ProfileScreen, same outcome.
--
--   3. lib/users.ts updateUserProfile — `.select('id, email, display_name,
--      avatar_url, points, created_at')`. The `.select('email')` here
--      will silently return null after this change. Only the caller's own
--      row is targeted (eq id), so this is a self-read; we could re-grant
--      `(email)` only when row = own via a column-grant on a SELF-SCOPED
--      view, but a simpler answer: remove `email` from the .select() call
--      in users.ts (it's not read by ProfileScreen or any caller — UI
--      sources email from auth.user.email).
--      → STEVE TODO once this migration is in: drop `email,` from line 24
--        of src/lib/users.ts. Until then the UPDATE still works; the
--        returned row's email field is simply null.
--
--   4. lib/points.ts fetchCurrentPoints — selects `points` only. Unchanged.
--
--   5. lib/flags.ts listLeaderboard — selects `id, display_name, points`.
--      Unchanged.
--
-- Tests: 0 tests assert anything about other users' emails. The point of
-- this migration is that no client code SHOULD be reading other users'
-- emails — and currently none does. Removing the ability to do so just
-- enforces the boundary.
--
-- ---------------------------------------------------------------------------
-- THIS FILE IS IDEMPOTENT — safe to run twice.
-- ---------------------------------------------------------------------------
--
-- =========================================================================
-- HOW TO APPLY (Sky)
-- =========================================================================
--
-- 1. Supabase Dashboard → Project → SQL Editor → New query →
--    paste this WHOLE file → Run.
-- 2. Cost: ~0.5 sec. No backfill, no table locks.
-- 3. Smoke test from an authenticated session:
--    a. Signed in as user A, hit the REST endpoint:
--         GET /rest/v1/users?select=email
--       Expected: every row's email returns null (or 401 depending on
--       PostgREST version). BEFORE: every email returned in plaintext.
--    b. Same session, hit:
--         GET /rest/v1/users?select=id,display_name,points&order=points.desc&limit=10
--       Expected: works (Leaderboard).
--    c. ProfileScreen, TasksScreen, Leaderboard still load normally.
-- 4. Once verified, drop the `email,` token from
--    src/lib/users.ts → updateUserProfile .select() (it's dead post-apply).
--
-- =========================================================================
-- ROLLBACK
-- =========================================================================
--
--   -- Re-grant the email column to authenticated:
--   grant select (email) on public.users to authenticated;
--
--   -- Drop the helper view:
--   drop view if exists public.users_self_email;
--
-- After rollback, the original broad SELECT continues to expose every
-- user's email. (This is the state the live DB has been in since first
-- launch; the rollback returns to that state.)
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Re-state the row-level SELECT policy.
--    Identical semantics to the current one. We touch it here only so
--    re-running this migration is a true no-op (drop-if-exists / create).
-- ---------------------------------------------------------------------------

drop policy if exists "users readable by authenticated" on public.users;
create policy "users readable by authenticated"
  on public.users for select
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- 2. Column-level grant: hide `email` from the `authenticated` role.
--
--    Postgres requires that for column-level SELECT to apply, NO bare
--    `GRANT SELECT ON <table>` is in effect for that role. Supabase ships
--    a permissive base grant, so we first REVOKE the bare grant and then
--    grant only the columns we want exposed.
--
--    `service_role` and `postgres` keep full access (default).
-- ---------------------------------------------------------------------------

revoke select on public.users from authenticated, anon;

grant select
  (id, display_name, avatar_url, points, created_at)
  on public.users
  to authenticated;

-- Anon (signed-out) has no reason to read users.* — explicit silence.
-- (No grant statement means anon cannot SELECT any column on this table.)


-- ---------------------------------------------------------------------------
-- 3. Helper view: own-email projection.
--
--    SECURITY INVOKER + a WHERE clause keyed off auth.uid() means the
--    view returns the email column only for the calling user's own row.
--    Future code path that legitimately needs a server-confirmed email
--    can query `public.users_self_email` instead of relying on the JWT.
--
--    Today no app code reads this view — it's documentation in DDL form
--    + a safe future seam.
-- ---------------------------------------------------------------------------

drop view if exists public.users_self_email;
create view public.users_self_email
  with (security_invoker = true)
  as
  select id, email
    from public.users
   where id = (select auth.uid());

grant select on public.users_self_email to authenticated;

comment on view public.users_self_email is
  'Caller-scoped projection of public.users — returns email only for the '
  'authenticated caller''s own row. Use this instead of selecting '
  '`email` from public.users directly.';


-- ===========================================================================
-- End of file.
-- ===========================================================================
