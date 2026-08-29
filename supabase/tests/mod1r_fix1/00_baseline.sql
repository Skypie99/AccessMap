-- ============================================================================
-- MOD1R FIX1 — disposable PostgreSQL test harness (Checkpoint A proof).
-- TEST INFRASTRUCTURE ONLY. Never applied to any hosted project. Runs only
-- inside the ephemeral postgres:16 service container started by
-- .github/workflows/mod1r-fix1-rls-proof.yml.
--
-- SCOPE: this reconstructs, on a bare postgres:16 image, exactly the tables/
-- functions/policies the three FIX1 blockers touch (public.users,
-- public.feedback, public.flags) plus a minimal Supabase auth compatibility
-- shim (schema auth, auth.uid()/auth.email(), the anon/authenticated/
-- service_role roles, and the platform-level baseline grants every real
-- Supabase project bootstraps before any migration runs). It deliberately
-- does NOT stand up the rest of the schema (storage, flag_comments,
-- flag_verifications, push_tokens, account-deletion machinery, ...) — none of
-- it is read by the policies under test, and pulling it in would just add
-- failure surface unrelated to what this proof exists to check.
--
-- Everything that IS one of the three blockers' actual policies is applied
-- from the REAL repository files below via \i, verbatim — never
-- hand-transcribed — so what runs here is provably the shipped SQL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Minimal Supabase-compatible auth shim.
-- ---------------------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key,
  email text
);

create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function auth.email() returns text
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.email', true), '') $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- Every real Supabase project grants this baseline before any product
-- migration runs; individual migrations in this repo only ever narrow it
-- (explicit REVOKEs), never establish it from scratch.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create extension if not exists "uuid-ossp";

-- Harness-only stand-in for public.current_account_can_write(), introduced by
-- the D1F4 account-deletion-hold migrations (out of scope for MOD1R FIX1 —
-- none of that lane's tables/migrations are part of this proof). The real
-- "flags insert own" / "flags anon insert" policies below call it; a hold
-- account is never part of these three blockers, so it always returns true
-- here — every seeded fixture user is a normal, non-held account.
create or replace function public.current_account_can_write() returns boolean
  language sql stable
  as $$ select true $$;

-- ---------------------------------------------------------------------------
-- 2. public.users / public.flags — verbatim from supabase/schema.sql
--    (create table public.users ... / create table public.flags ...,
--    lines ~55-91), which already reconciled is_admin into the users CREATE.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null unique,
  display_name         text,
  avatar_url           text,
  points               integer not null default 0,
  created_at           timestamptz not null default now(),
  last_active_date     date,
  streak_days          integer not null default 0,
  longest_streak_days  integer not null default 0,
  is_admin             boolean not null default false
);

create table if not exists public.flags (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid references public.users(id) on delete cascade,
  lat                      double precision not null,
  lng                      double precision not null,
  category                 text not null check (category in (
    'no_ramp', 'broken_sidewalk', 'blocked_path',
    'missing_signal', 'steep_grade', 'other'
  )),
  description              text,
  severity                 smallint not null check (severity between 1 and 5),
  photo_url                text,
  status                   text not null default 'open' check (status in (
    'open', 'verified', 'resolved', 'rejected'
  )),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  context_tags             text[] not null default '{}',
  reopen_requests          integer not null default 0,
  reopen_requests_reset_at timestamptz
);

-- RLS: users + the flags policies that stay untouched by FIX1 (verbatim from
-- schema.sql). "flags insert own" / "flags anon insert" are intentionally
-- NOT taken from schema.sql here — schema.sql's own copies are stale (predate
-- 2026-08-27_d1f4_async_account_deletion.sql); the current effective
-- versions are applied in section 3 below instead.
alter table public.users enable row level security;
alter table public.flags enable row level security;

create policy "users readable by authenticated"
  on public.users for select
  to authenticated
  using (true);

create policy "users update own row"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke delete on table public.flags from public, anon, authenticated;
grant select, insert, update on table public.flags to authenticated;
grant select, insert, update, delete on table public.flags to service_role;

create policy "flags readable by authenticated"
  on public.flags for select
  to authenticated
  using (true);

create policy "flags readable by anon"
  on public.flags for select
  to anon
  using (true);

create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using (true)
  with check (
    user_id     is not distinct from (select user_id     from public.flags where id = flags.id)
    and lat         = (select lat         from public.flags where id = flags.id)
    and lng         = (select lng         from public.flags where id = flags.id)
    and category    = (select category    from public.flags where id = flags.id)
    and severity    = (select severity    from public.flags where id = flags.id)
    and description is not distinct from (select description from public.flags where id = flags.id)
    and photo_url   is not distinct from (select photo_url   from public.flags where id = flags.id)
    and created_at  = (select created_at  from public.flags where id = flags.id)
  );

-- ---------------------------------------------------------------------------
-- 3. "flags insert own" / "flags anon insert" — verbatim, current effective
--    text, from supabase/migrations/2026-08-27_d1f4_async_account_deletion.sql
--    (that file also touches flag_comments/flag_verifications/comment_votes/
--    push_tokens/notification_preferences/storage, none of which this harness
--    creates — so the two flags policy statements are lifted out rather than
--    running that whole file).
-- ---------------------------------------------------------------------------
alter table public.flags add column if not exists photo_object_key text;
alter table public.flags add column if not exists photo_uploader_id uuid;

create policy "flags anon insert" on public.flags for insert to anon
  with check (
    user_id is null
    and photo_url is null
    and photo_object_key is null
    and photo_uploader_id is null
  );
create policy "flags insert own" on public.flags for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and photo_url is null and photo_object_key is null and photo_uploader_id is null
    and (select public.current_account_can_write())
  );

-- ---------------------------------------------------------------------------
-- 4. The real migrations, applied verbatim, in shipped order.
-- ---------------------------------------------------------------------------
\i supabase/migrations/2026-05-23_feedback_table.sql
\i supabase/migrations/20260828040000_mod1_moderation_release_safety.sql
\i supabase/migrations/20260828050000_mod1_admin_report_queue.sql
\i supabase/migrations/20260828060000_mod1r_fix1_report_and_insert_authz.sql
-- MOD1R FIX2 (this proof was originally scoped to Checkpoint A only; these
-- two extend it rather than stand up a second harness, per the FIX2 task's
-- own instruction) — pending-close-state constraint, then the pre-action
-- intent column + vocabulary + grant it depends on being able to close.
\i supabase/migrations/20260828070000_mod1r_fix1_pending_close_state.sql
\i supabase/migrations/20260828080000_mod1r_fix2_action_intent.sql

-- Sanity: nothing above should have left RLS disabled.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.feedback'::regclass) then
    raise exception 'harness error: RLS not enabled on public.feedback';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.flags'::regclass) then
    raise exception 'harness error: RLS not enabled on public.flags';
  end if;
end $$;
