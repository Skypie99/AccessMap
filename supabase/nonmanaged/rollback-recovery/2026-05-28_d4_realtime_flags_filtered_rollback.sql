-- =============================================================================
-- D4: Realtime Flags — Option 2 Rollback
-- =============================================================================
-- Reverts the column-filtered publication and drops the observability log.
-- Run this ONLY if D4 needs to be turned off after the apply migration ran.
--
-- Apply file: 2026-05-28_d4_realtime_flags_filtered.sql
-- =============================================================================

-- STEP 1: Remove public.flags from the realtime publication entirely.
-- After this runs, existing client subscriptions go silent immediately —
-- they don't error; they simply stop receiving events. The client falls
-- back to its existing "fetch on tab focus" behavior.
do $$
begin
  execute 'alter publication supabase_realtime drop table public.flags';
  raise notice 'public.flags removed from supabase_realtime.';
exception
  when undefined_object then
    raise notice 'public.flags was not in supabase_realtime; nothing to drop.';
end $$;

-- STEP 2: Drop the observability log infrastructure.
-- Drop policy first (Postgres requires it before dropping the table).
drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
drop function if exists public.log_realtime_event(text, text);
drop table if exists public.realtime_subscribe_log;

-- =============================================================================
-- Post-rollback state
-- =============================================================================
-- supabase_realtime publication: public.flags not present (no broadcast).
-- realtime_subscribe_log table: dropped. Historical log data is lost.
-- Client code: Shamus should disable the useRealtimeFlags hook guard so the
--   channel subscription is not attempted (avoid noisy console errors).
--
-- Verify rollback:
--   SELECT pubname, schemaname, tablename
--   FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND schemaname = 'public'
--     AND tablename = 'flags';
--   -- Expected: 0 rows
