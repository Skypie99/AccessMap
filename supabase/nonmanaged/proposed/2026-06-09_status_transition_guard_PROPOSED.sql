-- ============================================================================
-- SUPERSEDED — applied 2026-08-19 (Sky-approved) with one amendment:
-- resolved -> rejected is legal for ADMINS (AdminScreen dismiss acts on the
-- recent-200 list, which includes resolved flags; the verbatim proposal would
-- have broken that shipped flow). Source of truth is now
-- 2026-08-19_flag_status_transition_guard_APPLIED.sql. Kept for history.
-- ============================================================================
-- PROPOSED — NOT APPLIED (re-sweep audit 2026-06-09, finding F53 hardening)
-- Requires Sky's approval before running. Propose-only per Constitution Art. 5.
-- ============================================================================
--
-- WHAT: a server-side guard on flag status transitions.
--
-- WHY: the triage RLS policy intentionally lets any authenticated user write
-- any status value (community triage), and the points trigger awards but never
-- blocks. The client now does a compare-and-set (F53: updateFlagStatus only
-- commits when the status it saw is still current), which closes the
-- stale-snapshot overwrite for the shipped app — but a hand-rolled REST client
-- can still write arbitrary transitions (e.g. resolved -> verified), silently
-- reverting another user's resolution. This trigger enforces the legal state
-- machine at the database, where it can't be bypassed.
--
-- LEGAL TRANSITIONS (matches the app's own gating + the points trigger):
--   open      -> verified | resolved | rejected
--   verified  -> resolved | rejected
--   resolved  -> open                      (community reopen via threshold)
--   rejected  -> (terminal; admin delete only)
--   any       -> same status              (idempotent no-op writes allowed)
--
-- NOTE: increment_reopen_request + the reopen flow drive resolved -> open.
-- Admin moderation uses 'rejected' and delete; both remain legal above.
--
-- ROLLBACK: see bottom — drops the trigger + function; no data change either way.
-- ============================================================================

create or replace function public.enforce_flag_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new; -- idempotent writes are fine
  end if;
  if (old.status = 'open'     and new.status in ('verified', 'resolved', 'rejected'))
  or (old.status = 'verified' and new.status in ('resolved', 'rejected'))
  or (old.status = 'resolved' and new.status = 'open')
  then
    return new;
  end if;
  raise exception 'illegal flag status transition: % -> %', old.status, new.status
    using errcode = 'P0001';
end;
$$;

drop trigger if exists flag_status_transition_guard on public.flags;
create trigger flag_status_transition_guard
  before update of status on public.flags
  for each row
  execute function public.enforce_flag_status_transition();

-- ============================================================================
-- ROLLBACK (run to undo):
--   drop trigger if exists flag_status_transition_guard on public.flags;
--   drop function if exists public.enforce_flag_status_transition();
-- ============================================================================
