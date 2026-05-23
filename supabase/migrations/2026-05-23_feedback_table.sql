-- ===========================================================================
-- 2026-05-23 — Feedback table (Dana / backend & database)
-- ===========================================================================
--
-- Adds a `public.feedback` table so user feedback can be tracked server-side
-- as a complement to the existing mailto: flow. The app's FeedbackModal
-- dual-writes: it tries the INSERT (best-effort, swallows errors) AND opens
-- the OS mail composer. The user always gets the mail composer; if this
-- table exists, we also get a server-side copy.
--
-- Why optional / propose-only:
--   - The mailto: flow has been live since fastloop v2 and works without
--     any DB changes. This table is additive; not running it costs nothing
--     beyond losing server-side tracking.
--   - Migration touches public schema + adds RLS policies. Per the
--     Constitution Art. 5.3, Sky applies live-DB changes — never the agent.
--
-- This file is IDEMPOTENT — running it twice is a no-op.
--
-- =========================================================================
-- HOW TO APPLY (Sky):
-- =========================================================================
--
-- Supabase Dashboard → Project → SQL Editor → New query →
--   paste this whole file → Run.
--
-- Cost: ~0.5 sec on an empty table. No backfill, no locking of existing
-- tables.
--
-- AFTER APPLYING:
--   1. Dashboard → Database → Tables → confirm public.feedback exists with
--      columns: id, user_id, category, body, contact_email, platform,
--      created_at.
--   2. Dashboard → Database → Policies → confirm 4 policies on
--      public.feedback (one INSERT, one SELECT-owner, one SELECT-maintainer,
--      one DELETE-owner).
--   3. Open the app → Header → Feedback → fill in and Send. The mail
--      composer opens AND a row should appear in
--      Dashboard → Database → Table editor → feedback.
--   4. Profile → My Feedback → confirm the row you just inserted shows
--      up in the list.
--
-- ROLLBACK (if needed):
--   DROP TABLE public.feedback; -- cascades the RLS policies.
--   (Also remove the `feedback` block in src/types/database.ts.)
-- ===========================================================================

-- 1. Category enum — matches FEEDBACK_CATEGORIES in src/lib/feedback.ts.
-- DO block makes the CREATE TYPE idempotent (CREATE TYPE has no IF NOT EXISTS).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'feedback_category') then
    create type public.feedback_category as enum ('bug', 'idea', 'love', 'other');
  end if;
end $$;

-- 2. The table itself.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Nullable on purpose: a signed-out user (or a future "send anonymously"
  -- toggle) can still post feedback. The default RLS allows that insert.
  user_id uuid references auth.users on delete set null,
  category public.feedback_category not null default 'idea',
  body text not null check (length(body) between 1 and 5000),
  contact_email text check (
    contact_email is null
    or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  -- 'ios' / 'android' / 'web' — set by the client so the maintainer can
  -- correlate reports with platform-specific issues without identifying
  -- the user.
  platform text,
  created_at timestamptz not null default now()
);

-- 3. Indexes — only the ones we actually query against.
create index if not exists feedback_user_created_at_idx
  on public.feedback (user_id, created_at desc);
create index if not exists feedback_category_idx
  on public.feedback (category);

-- 4. Row-level security. Default-deny, then opt in.
alter table public.feedback enable row level security;

-- Anyone (signed in OR anonymous) can insert their own feedback. If user_id
-- is set, it MUST match auth.uid() so a signed-in user can't ghost-write as
-- someone else. Anonymous inserts have user_id IS NULL.
drop policy if exists "feedback_insert_self_or_anon" on public.feedback;
create policy "feedback_insert_self_or_anon"
  on public.feedback for insert
  with check (
    user_id is null
    or user_id = (select auth.uid())
  );

-- A signed-in user can read their own past feedback (for the My Feedback
-- screen). Anonymous inserts are not retrievable by anyone but the
-- maintainer — the right tradeoff for "send and forget".
drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own"
  on public.feedback for select
  using (
    user_id is not null
    and user_id = (select auth.uid())
  );

-- The maintainer's account can read everything for triage / replies.
-- Wraps auth.email() in a subselect so the policy is initplan-safe (same
-- pattern as the RLS hardening migration). If you change the maintainer
-- email, update this policy AND src/lib/feedback.ts → FEEDBACK_EMAIL in
-- the same change.
drop policy if exists "feedback_select_maintainer" on public.feedback;
create policy "feedback_select_maintainer"
  on public.feedback for select
  using (
    (select auth.email()) = 'skylerhalisky@gmail.com'
  );

-- A user can delete their own feedback (right-to-be-forgotten). The
-- maintainer can also delete via the dashboard (service role bypasses RLS).
drop policy if exists "feedback_delete_own" on public.feedback;
create policy "feedback_delete_own"
  on public.feedback for delete
  using (
    user_id is not null
    and user_id = (select auth.uid())
  );

-- No UPDATE policy on purpose — feedback is intentionally append-only
-- from the client. If the maintainer needs to "fix" something they can do
-- it via the dashboard (service role bypasses RLS).

comment on table public.feedback is
  'User feedback submitted from the FeedbackModal — dual-write companion to the mailto: flow.';
