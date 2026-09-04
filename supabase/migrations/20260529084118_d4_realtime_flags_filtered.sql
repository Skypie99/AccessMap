-- =============================================================================
-- D4: Realtime Flags — Option 2 (Filtered Broadcast)
-- =============================================================================
-- Policy: Supabase Realtime publishes ONLY {id, status} from public.flags.
-- Clients receive the change notification then re-fetch the full row via the
-- existing RLS-gated SELECT endpoint. lat/lng, category, severity, user_id,
-- photo_url, and description NEVER leave the server inside a broadcast payload.
--
-- Option 1 (full-row broadcast) files at:
--   supabase/realtime.sql
--   supabase/migrations/2026-05-24_realtime_flags.sql
-- Those files must NOT be applied if this Option-2 file is applied.
-- This file supersedes both.
--
-- Approved by Sky (2026-05-28). See qa-reports/2026-05-28_Dana_D4-RealtimeFlags-Filtered-SQL.md.
--
-- Apply in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Rollback:  supabase/migrations/2026-05-28_d4_realtime_flags_filtered_rollback.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop any Option-1 publication state that may already be live.
-- =============================================================================
-- If public.flags was previously added to supabase_realtime without a column
-- filter (Option 1 style), we remove it first so we can re-add it with the
-- column-level restriction below.
-- Wrapped in DO/EXCEPTION so re-running is safe even if the table was never
-- in the publication.
do $$
begin
  execute 'alter publication supabase_realtime drop table public.flags';
  raise notice 'Removed public.flags from supabase_realtime (clearing Option-1 state).';
exception
  when undefined_object then
    raise notice 'public.flags was not in supabase_realtime; nothing to drop.';
  when sqlstate '42P17' then
    -- some Postgres versions raise a different code for "not a member"
    raise notice 'public.flags was not in supabase_realtime (alt code); nothing to drop.';
end $$;

-- =============================================================================
-- STEP 2: Add public.flags back with a column-level filter (id, status only).
-- =============================================================================
-- Postgres 15+ supports column-level publication lists:
--   ALTER PUBLICATION <name> ADD TABLE <schema>.<table> (<col1>, <col2>)
-- Supabase uses Postgres 15 on all projects created after Dec 2023.
-- This means the Realtime broadcast payload contains ONLY {id, status}.
--
-- NOTE: Supabase Realtime's postgres_changes channel does NOT support
-- server-side row filters (WHERE clauses) in the publication itself —
-- the `filter` parameter on the client channel is a server-evaluated WAL
-- filter for equality checks only (e.g. filter="status=eq.open"), not a
-- geospatial filter. Geographic bounding is therefore a client-side concern.
-- See: Notes for Shamus section in the qa-report.
alter publication supabase_realtime add table public.flags (id, status);

-- =============================================================================
-- STEP 3: Observability log table (Safeguard #3)
-- =============================================================================
-- Logs each client subscribe/unsubscribe event to a server table.
-- Design choice: function-based (clients call an RPC on connect/disconnect)
-- rather than a trigger, because the publication itself has no subscribe event
-- hook in Postgres. A trigger on pg_subscription would require superuser.
-- Rationale documented in qa-report Safeguards section.

create table if not exists public.realtime_subscribe_log (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references public.users(id) on delete cascade,
  event       text        not null check (event in ('subscribe', 'unsubscribe')),
  channel     text        not null,
  logged_at   timestamptz not null default now()
);

-- Append-only: clients can insert their own rows; nobody reads via client.
-- Reads are restricted to the service_role (owner). This lets us audit
-- subscription patterns without exposing other users' subscribe history.
alter table public.realtime_subscribe_log enable row level security;

drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
create policy "subscribe_log insert own"
  on public.realtime_subscribe_log for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- No SELECT policy for authenticated users — service_role bypasses RLS.
-- To query logs, use the Supabase dashboard or a service_role key query.

-- RPC wrapper: Shamus calls this from the client on subscribe/unsubscribe.
-- Using SECURITY DEFINER allows the function to insert into the log table
-- regardless of who calls it, but the with check above is the actual guard.
create or replace function public.log_realtime_event(
  p_event   text,
  p_channel text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'log_realtime_event requires an authenticated user';
  end if;

  if p_event not in ('subscribe', 'unsubscribe') then
    raise exception 'event must be ''subscribe'' or ''unsubscribe''';
  end if;

  insert into public.realtime_subscribe_log (user_id, event, channel)
  values (auth.uid(), p_event, p_channel);
end;
$$;

-- Callable by authenticated users only (not anon).
revoke execute on function public.log_realtime_event(text, text) from public, anon;
grant  execute on function public.log_realtime_event(text, text) to authenticated;

-- =============================================================================
-- STEP 4: Verification query (run after apply to confirm correct state)
-- =============================================================================
-- Expected result: one row with columns listing "id, status" (or similar).
-- See qa-report Verification Queries section for exact expected output.
--
--   SELECT pubname, schemaname, tablename, attnames
--   FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND schemaname = 'public'
--     AND tablename = 'flags';
