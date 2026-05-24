-- ===========================================================================
-- 2026-05-24 — Status history audit trail (Dana / Shamus — T1)
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — DO NOT APPLY YET. Sky applies this in the Supabase
--     dashboard after reviewing. The agent system NEVER writes to the
--     live DB (Const. Art. 5.3). !!!
--
-- Adds a `public.flag_status_history` table so the app can show "who
-- changed this flag's status, when, and from what to what". Foundational
-- for community trust — users can see the lifecycle of any flag.
--
-- How it works:
--   - A new table records one row per status change (and one row for the
--     initial 'open' creation, with from_status NULL).
--   - The existing `handle_flag_status_change` trigger is EXTENDED to
--     ALSO insert into this audit table. The trigger runs as
--     SECURITY DEFINER so it can write rows on behalf of any
--     authenticated user without needing per-user INSERT RLS.
--   - A second trigger fires on INSERT of a new flag to record the
--     initial 'open' entry (from_status = null, to_status = 'open').
--   - The client never INSERTs into this table directly. RLS blocks it
--     for everyone except the trigger (via SECURITY DEFINER).
--
-- Why optional / propose-only:
--   - The client (`src/lib/statusHistory.ts`) is defensive: if the table
--     doesn't exist, `listStatusHistory` returns []. The StatusHistoryModal
--     shows a friendly "not yet enabled" placeholder. So the app keeps
--     working without this migration.
--   - This is a NEW table with NEW RLS and a NEW trigger that piggybacks
--     on an existing security-definer function. Sky reviews before apply.
--
-- This file is IDEMPOTENT — running it twice is a no-op. Safe to re-run.
--
-- =========================================================================
-- HOW TO APPLY (Sky):
-- =========================================================================
--
-- Supabase Dashboard → Project → SQL Editor → New query →
--   paste this WHOLE file → Run.
--
-- Cost: ~1 sec on an empty table. No backfill (existing flags don't get
-- retroactive history rows — history starts at apply-time).
--
-- AFTER APPLYING:
--   1. Dashboard → Database → Tables → confirm `public.flag_status_history`
--      exists with columns:
--        id (uuid, pk), flag_id (uuid, fk to flags), user_id (uuid,
--        nullable, fk to auth.users), from_status (text, nullable),
--        to_status (text, not null), created_at (timestamptz).
--   2. Dashboard → Database → Policies → confirm 2 policies on
--      flag_status_history:
--        - "flag_status_history readable by authenticated" (SELECT)
--        - "flag_status_history no direct insert" (INSERT, denies all)
--      And no DELETE / UPDATE policies (default-deny).
--   3. Dashboard → Database → Triggers → confirm:
--        - `on_flag_status_change` is still on `public.flags` (existing).
--        - `on_flag_insert_history` is NEW, AFTER INSERT on public.flags.
--   4. App smoke test:
--        - Create a new flag → row should appear with from_status NULL,
--          to_status 'open'.
--        - Verify a flag → second row with from_status 'open', to_status
--          'verified'.
--        - Open FlagDetailModal → tap "History" → see both entries in the
--          StatusHistoryModal.
--
-- =========================================================================
-- ROLLBACK (only if smoke test fails or you change your mind):
-- =========================================================================
--
--   -- 1. Remove the new INSERT trigger (history won't be written for
--   --    new flags after this).
--   drop trigger if exists on_flag_insert_history on public.flags;
--   drop function if exists public.handle_flag_insert_history();
--
--   -- 2. Restore the ORIGINAL handle_flag_status_change function so it
--   --    no longer inserts into the history table. Paste the body from
--   --    supabase/schema.sql lines 75–113 to revert (or just keep the
--   --    extended version; it's safe — if the table doesn't exist the
--   --    insert will fail and the trigger will still complete the points
--   --    award... actually no, the insert raises and aborts the txn.
--   --    So you must restore the original version. See schema.sql.).
--
--   -- 3. Drop the table itself (cascades the RLS policies).
--   drop table if exists public.flag_status_history;
--
-- After rollback, the app continues to render the StatusHistoryModal
-- placeholder ("History not yet enabled") — `listStatusHistory` returns
-- [] gracefully.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. The audit table.
-- ---------------------------------------------------------------------------

create table if not exists public.flag_status_history (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.flags(id) on delete cascade,
  -- Nullable so the row survives if the user is later deleted (right-to-
  -- be-forgotten). We keep the audit row but lose the attribution.
  user_id uuid references auth.users on delete set null,
  -- NULL for the initial 'open' creation; non-null for every subsequent change.
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);

-- Hot path: "show me the history for THIS flag, oldest first" — the
-- composite index covers both the WHERE and the ORDER BY.
create index if not exists flag_status_history_flag_idx
  on public.flag_status_history (flag_id, created_at desc);

comment on table public.flag_status_history is
  'Append-only audit trail of every status change on public.flags. Written by trigger only — no direct client INSERTs.';


-- ---------------------------------------------------------------------------
-- 2. Row-level security: default-deny, opt in for SELECT.
-- ---------------------------------------------------------------------------

alter table public.flag_status_history enable row level security;

-- SELECT: anyone authenticated can read. Mirrors the flags policy — if
-- you can see the flag, you can see its history. Privacy-wise this is
-- equivalent to seeing the status itself.
drop policy if exists "flag_status_history readable by authenticated"
  on public.flag_status_history;
create policy "flag_status_history readable by authenticated"
  on public.flag_status_history for select
  to authenticated
  using (true);

-- INSERT: blocked for everyone via "with check (false)". The trigger
-- writes rows under SECURITY DEFINER, which bypasses RLS — so the trigger
-- still works. Without this explicit deny policy, postgres would default-
-- deny anyway (RLS is enabled, no permissive INSERT policy exists), but
-- spelling it out makes the intent loud and clear in the dashboard view.
drop policy if exists "flag_status_history no direct insert"
  on public.flag_status_history;
create policy "flag_status_history no direct insert"
  on public.flag_status_history for insert
  to authenticated
  with check (false);

-- No UPDATE / DELETE policies on purpose — append-only audit log.
-- (Service role bypasses RLS, so the maintainer can still clean up via
-- the dashboard if needed.)


-- ---------------------------------------------------------------------------
-- 3. Extend the existing status-change trigger to ALSO write to history.
-- ---------------------------------------------------------------------------
--
-- This REPLACES the existing handle_flag_status_change function from
-- supabase/schema.sql. The points-award behavior is preserved exactly —
-- the only addition is the INSERT into flag_status_history at the top.
--
-- Order matters: insert the history row FIRST, then award points. If the
-- history insert raises, the whole transaction aborts and the status
-- change is rolled back (we'd rather refuse a write than lose an audit
-- entry). In practice the insert can only fail if the table is gone, in
-- which case we're in the middle of a rollback anyway.

create or replace function public.handle_flag_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_bonus int := 0;
  actor_bonus    int := 0;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  -- Audit row first — so the history is faithful even if a later
  -- statement in this txn raises.
  insert into public.flag_status_history (
    flag_id, user_id, from_status, to_status
  ) values (
    new.id, auth.uid(), old.status, new.status
  );

  -- Existing points logic — UNCHANGED from schema.sql.
  if new.status = 'verified' and old.status = 'open' then
    reporter_bonus := 5;
    actor_bonus    := 2;
  elsif new.status = 'resolved' and old.status in ('open', 'verified') then
    reporter_bonus := 10;
    actor_bonus    := 5;
  end if;

  if reporter_bonus > 0 then
    update public.users
      set points = points + reporter_bonus
      where id = new.user_id;
  end if;

  if actor_bonus > 0
     and auth.uid() is not null
     and auth.uid() <> new.user_id then
    update public.users
      set points = points + actor_bonus
      where id = auth.uid();
  end if;

  return new;
end;
$$;

-- The existing trigger `on_flag_status_change` already binds to this
-- function — re-binding here would be a no-op. Leave it as-is.

-- Re-revoke direct REST RPC access (CREATE OR REPLACE doesn't drop grants,
-- but this is belt-and-suspenders idempotent).
revoke execute on function public.handle_flag_status_change()
  from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. New trigger: record the initial 'open' history row on flag CREATE.
-- ---------------------------------------------------------------------------
--
-- The status-change trigger above fires on UPDATE, not INSERT. To capture
-- the lifecycle from the very start, we need a separate AFTER INSERT
-- trigger that writes a from_status=NULL, to_status='open' row.

create or replace function public.handle_flag_insert_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.flag_status_history (
    flag_id, user_id, from_status, to_status
  ) values (
    new.id, new.user_id, null, new.status
  );
  return new;
end;
$$;

drop trigger if exists on_flag_insert_history on public.flags;
create trigger on_flag_insert_history
  after insert on public.flags
  for each row execute function public.handle_flag_insert_history();

revoke execute on function public.handle_flag_insert_history()
  from public, anon, authenticated;

-- ===========================================================================
-- End of file.
-- ===========================================================================
