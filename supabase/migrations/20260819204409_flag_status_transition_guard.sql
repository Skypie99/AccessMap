-- ============================================================================
-- APPLIED TO LIVE 2026-08-19 (via Supabase MCP, QA deep-sweep follow-up).
-- Supersedes 2026-06-09_status_transition_guard_PROPOSED.sql with ONE
-- amendment (see below). Self-tested against production immediately after
-- apply: 3 legal transitions allowed, 2 illegal blocked, test row cleaned up
-- (0 leftover rows, 0 point events).
-- ============================================================================
--
-- WHAT: server-side guard on flag status transitions. The triage RLS policy
-- intentionally lets any authenticated user write any status value (community
-- triage); the client compare-and-set (F53) protects the shipped app, but a
-- hand-rolled REST client could still write arbitrary transitions (e.g.
-- resolved -> verified) or farm awards by flipping statuses. This enforces the
-- legal state machine where it can't be bypassed.
--
-- LEGAL TRANSITIONS:
--   open      -> verified | resolved | rejected
--   verified  -> resolved | rejected
--   resolved  -> open                    (community reopen via threshold)
--   resolved  -> rejected  ADMIN ONLY    << 2026-08-19 AMENDMENT
--   any       -> same status             (idempotent no-op writes allowed)
--   rejected  -> (terminal; admin delete only)
--
-- WHY THE AMENDMENT: the June proposal made 'rejected' reachable only from
-- open/verified. But AdminScreen's dismiss acts on listRecentFlags(200) —
-- which includes RESOLVED flags — via updateFlagStatus(id,'rejected',status).
-- Applying the proposal verbatim would have broken the shipped admin flow.
-- resolved -> rejected is therefore legal, gated to admins (same subselect the
-- points trigger uses for the spam penalty).
--
-- STILL OPEN (documented, not fixed here): increment_reopen_request has no
-- per-user server-side dedup, so a scripted caller can reach the reopen
-- threshold alone and cycle open->verified->resolved->open; each cycle
-- re-awards points. The guard narrows the attack to that RPC. Rate-limiting
-- the RPC (or persisting per-user reopen votes) is a product decision — see
-- qa-reports/qa-2026-08-18-deep-sweep.md P2/P12.
--
-- ROLLBACK:
--   drop trigger if exists flag_status_transition_guard on public.flags;
--   drop function if exists public.enforce_flag_status_transition();
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
  if old.status = 'resolved' and new.status = 'rejected'
     and auth.uid() in (select id from public.users where is_admin = true)
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
