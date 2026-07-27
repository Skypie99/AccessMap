-- ============================================================================
-- BANKED BY: SHIP-READY Phase 2 (2026-07-26), copied VERBATIM from
--   design-reviews/fork-briefs/2026-07-16_AccessMap_Fork_Decision_Briefs.md
--   (BRIEF 2 / Fork 5, "Build-ready spec — W1").
--
-- WHY IT IS HERE AND NOT APPLIED: Sky decided BUILD W1
-- (design-reviews/ship-ready/DECISIONS.md §SKY). Banking the artifact as a
-- file is not applying it — SHE applies, always. Verified against the live
-- database on 2026-07-26 (read-only): public.flags has NO dispute_requests
-- column and no increment_dispute_request function, and the applied-migration
-- ledger ends at 20260603002810. The client half shipped alongside this file
-- is gated OFF (DISPUTE_ENABLED in src/lib/disputes.ts) precisely because
-- this has not run.
--
-- APPLY ORDER: standalone. It touches only new columns, a new function and a
-- new trigger on public.flags; it does not fold into the Fork-2/OA body.
--
-- AFTER APPLYING: flip DISPUTE_ENABLED to true in src/lib/disputes.ts. The
-- fork-discipline guard in src/lib/__tests__/disputes.test.ts asserts it is
-- false, so that flip is a deliberate two-line change and cannot happen by
-- accident.
-- ============================================================================

-- ============================================================================
-- FILE:    2026-07-16_fork5_dispute_counter_PROPOSED.sql
-- FEATURE: Fork 5 / W1 — "flag as wrong" dispute counter (authenticated)
-- STATUS:  PROPOSED — *** NOT YET APPLIED — SKY APPLIES, NEVER AUTO-RUN ***
--
-- PRIVACY NOTE: mirrors F10 (2026-05-30_flag_reopen_requests.sql) exactly —
--   a raw counter, NO user_id stored, ever (Jordan hard-condition; prevents
--   pattern-of-life inference). Dedup is client-side per cycle (F10 Q2's
--   accepted "soft enforcement" trade — bounded here by account friction,
--   since only authenticated may call the RPC).
--
-- W2 (guest/anon writes) IS DELIBERATELY NOT GRANTED. Preconditions before
-- anyone proposes `grant execute ... to anon`:
--   (a) Fork 3 (guest contract) decided; (b) a real server-side anon
--   throttle exists (edge function / Turnstile-class); (c) Jordan sign-off.
-- ============================================================================

alter table public.flags
  add column if not exists dispute_requests          integer     not null default 0,
  add column if not exists dispute_requests_reset_at timestamptz;

create or replace function public.increment_dispute_request(p_flag_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_new_count integer;
begin
  update public.flags
    set dispute_requests = dispute_requests + 1
    where id = p_flag_id
      and status in ('open', 'verified')   -- doubt targets live reports only
    returning dispute_requests into v_new_count;
  return coalesce(v_new_count, 0);
end;
$$;
revoke execute on function public.increment_dispute_request(uuid) from public, anon;
grant  execute on function public.increment_dispute_request(uuid) to authenticated;

-- Reset on ANY status change: a transition starts a new evidentiary cycle.
create or replace function public.handle_flag_dispute_reset()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.dispute_requests          := 0;
    new.dispute_requests_reset_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_flag_dispute_reset()
  from public, anon, authenticated;

drop trigger if exists on_flag_dispute_reset on public.flags;
create trigger on_flag_dispute_reset
  before update of status on public.flags
  for each row execute function public.handle_flag_dispute_reset();

comment on function public.increment_dispute_request(uuid) is
  'Fork 5/W1: doubt counter on live flags. SECURITY DEFINER; no user_id
   stored (Jordan). Authenticated-only; W2 anon grant is gated - see header.';

-- ROLLBACK (in order):
--   drop trigger if exists on_flag_dispute_reset on public.flags;
--   drop function if exists public.handle_flag_dispute_reset();
--   drop function if exists public.increment_dispute_request(uuid);
--   alter table public.flags
--     drop column if exists dispute_requests,
--     drop column if exists dispute_requests_reset_at;
