-- =============================================================================
-- APPROVED — Option A (per-cycle reset). Sky approved 2026-05-30.
-- =============================================================================
--
-- FILE:    2026-05-30_flag_reopen_requests.sql
-- AUTHOR:  Dana (data engineering, 2026-05-30)
-- FEATURE: F10 — Flag Reopen Mechanism
-- STATUS:  APPROVED — Option A (per-cycle reset); applied 2026-05-30
--
-- PRIVACY NOTE (Jordan, 2026-05-29):
--   This migration intentionally stores NO user_id linkage for reopen
--   requests. Using a raw counter rather than a per-user log prevents
--   pattern-of-life inference: an adversary with read access to the DB
--   cannot reconstruct which users visited or requested reopening of
--   which locations. Jordan hard-condition: no user_id stored for
--   reopen votes, ever. The app-layer dedup (one request per user per
--   resolution cycle) is enforced client-side only — see OPEN QUESTIONS.
--
-- DESIGN (Quinn, 2026-05-29):
--   Threshold gated by reputation tier:
--     Bronze  → 3 reopen votes needed
--     Silver  → 2 reopen votes needed
--     Gold    → 1 reopen vote needed
--     Platinum→ 1 reopen vote needed
--   One reopen request per user per flag per resolution cycle (dedup).
--   Reopened flag returns to 'open' status.
--
-- IDEMPOTENCY:
--   All DDL uses IF NOT EXISTS / CREATE OR REPLACE — safe to re-run.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Add reopen_requests counter + reset timestamp to public.flags
-- -----------------------------------------------------------------------------
--
-- reopen_requests        — running count of reopen votes for the CURRENT
--                          resolution cycle. Resets to 0 whenever a flag
--                          transitions back to 'open' from 'resolved'.
--
-- reopen_requests_reset_at — timestamp of the last reset (i.e. when the
--                          current resolution cycle started). Used by the
--                          client layer to enforce per-cycle dedup without
--                          storing user_id.  NULL until the first reopen
--                          event occurs.
--
-- NOTE: Both columns are added with IF NOT EXISTS (Postgres 9.6+).  Running
--       this migration twice is a no-op.
-- -----------------------------------------------------------------------------
ALTER TABLE public.flags
  ADD COLUMN IF NOT EXISTS reopen_requests        integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopen_requests_reset_at timestamptz;


-- -----------------------------------------------------------------------------
-- 2. RPC: increment_reopen_request(p_flag_id uuid) → integer
-- -----------------------------------------------------------------------------
--
-- SECURITY DEFINER: runs as the function owner (postgres/service role).
-- This is necessary because:
--   a) The "flags status update by any authenticated" RLS policy allows
--      non-owners to change ONLY the status column.  The reopen_requests
--      column is not in that allowlist, so a direct UPDATE would be blocked.
--   b) We deliberately do NOT want to widen the RLS UPDATE policy, as that
--      would open a door to unintended counter manipulation.
--
-- The function:
--   1. Atomically increments reopen_requests by 1 on the target flag.
--   2. Only succeeds if the flag's current status is 'resolved' — votes on
--      flags that aren't resolved are silently no-ops (returns 0).
--   3. Returns the new counter value so the caller can compare against the
--      tier threshold without a separate SELECT.
--   4. Does NOT record auth.uid() or any per-user information.
--
-- Callers: authenticated users only (see GRANT below).  Anon and service-role
-- callers do not need direct RPC access (service role can UPDATE directly).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_reopen_request(p_flag_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE public.flags
    SET reopen_requests = reopen_requests + 1
    WHERE id = p_flag_id
      AND status = 'resolved'
    RETURNING reopen_requests INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- Revoke from public/anon; grant only to authenticated.
REVOKE EXECUTE ON FUNCTION public.increment_reopen_request(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.increment_reopen_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_reopen_request(uuid) IS
  'F10: Atomically increments the reopen_requests counter on a resolved flag. '
  'SECURITY DEFINER — no user_id stored (Jordan privacy requirement). '
  'Returns the new counter value, or 0 if the flag was not in resolved status.';


-- -----------------------------------------------------------------------------
-- 3. Trigger: reset counter when a flag transitions back to 'open'
-- -----------------------------------------------------------------------------
--
-- handle_flag_reopen_reset fires AFTER UPDATE OF status on public.flags.
-- It resets reopen_requests = 0 and stamps reopen_requests_reset_at = now()
-- whenever a flag moves from 'resolved' to 'open'.
--
-- Why BEFORE (not AFTER)? This function modifies NEW.reopen_requests and
-- NEW.reopen_requests_reset_at, which is only legal in a BEFORE trigger.
--
-- Why only 'resolved' → 'open'?  A 'verified' → 'open' path doesn't exist
-- in the normal workflow; only resolved flags accumulate reopen votes.  If the
-- workflow ever adds that path, extend the condition below.
--
-- Idempotency: DROP TRIGGER IF EXISTS + CREATE TRIGGER is safe to re-run.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_flag_reopen_reset()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'resolved' AND NEW.status = 'open' THEN
    NEW.reopen_requests          := 0;
    NEW.reopen_requests_reset_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-only function: not callable directly via the REST API.
REVOKE EXECUTE ON FUNCTION public.handle_flag_reopen_reset() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_flag_reopen_reset ON public.flags;
CREATE TRIGGER on_flag_reopen_reset
  BEFORE UPDATE OF status ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_flag_reopen_reset();

COMMENT ON FUNCTION public.handle_flag_reopen_reset() IS
  'F10: Resets reopen_requests to 0 and stamps reopen_requests_reset_at '
  'whenever a flag transitions from resolved → open. Trigger-only; not '
  'directly callable via REST API.';


-- -----------------------------------------------------------------------------
-- 4. Index: speed up threshold checks
-- -----------------------------------------------------------------------------
--
-- The UI will query: flags WHERE status = 'resolved' AND reopen_requests >= threshold
-- The existing flags_status_idx covers the status predicate; this partial index
-- handles the counter lookup efficiently for the small subset of resolved flags
-- that have accumulated any votes.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS flags_reopen_requests_idx
  ON public.flags (reopen_requests)
  WHERE status = 'resolved';


-- =============================================================================
-- OPEN QUESTIONS (for Sky / Quinn to decide before application)
-- =============================================================================
--
-- Q1: Should vote counts reset per resolution cycle or accumulate?
--
--   The migration as written implements PER-CYCLE RESET (Option A):
--     • reopen_requests resets to 0 whenever the flag goes back to 'open'.
--     • reopen_requests_reset_at records when each new cycle started.
--     • A user who voted in cycle 1 can vote again in cycle 2 (client dedup
--       uses reopen_requests_reset_at to know when a new cycle started).
--
--   OPTION B — ACCUMULATE:
--     • Never reset reopen_requests; drop handle_flag_reopen_reset trigger.
--     • Votes from all time count toward the threshold — a flag that was
--       repeatedly resolved/reopened would get easier to reopen over time.
--     • Simpler schema but risks "vote fatigue inflation" on contentious flags.
--
--   DANA RECOMMENDATION: Option A (per-cycle reset, as implemented).
--   Rationale:
--     1. Matches Quinn's "per resolution cycle" language exactly.
--     2. reopen_requests_reset_at is essential for client-side dedup without
--        storing user_id — it lets the client know when the current cycle
--        started and refuse a second vote in the same cycle.
--     3. Prevents accumulated vote debt from inflating reopen rates on old,
--        repeatedly-contested flags.
--     4. If Option B is chosen instead: remove the trigger, remove the
--        reopen_requests_reset_at column (or leave it NULL), and update
--        the client dedup logic accordingly.
--
-- Q2: Client-side dedup (one vote per user per flag per cycle)
--
--   Because we store no user_id, dedup is enforced at the application layer:
--   the client persists { flag_id, voted_at } in AsyncStorage and refuses to
--   call increment_reopen_request if voted_at >= reopen_requests_reset_at.
--   This is soft enforcement only — a determined user could clear storage and
--   vote again.  Acceptable for this use case (accessibility community is
--   cooperative); a future hardening option is a server-side bloom filter or
--   hashed token scheme that still doesn't expose user_id to the DB layer.
--   Jordan approved this tradeoff (2026-05-29).
--
-- =============================================================================


-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- To undo this migration entirely, run the following in the Supabase SQL Editor
-- (IN ORDER — triggers/functions must be dropped before columns):
--
--   -- 1. Drop trigger and its function
--   DROP TRIGGER  IF EXISTS on_flag_reopen_reset         ON public.flags;
--   DROP FUNCTION IF EXISTS public.handle_flag_reopen_reset();
--
--   -- 2. Drop the RPC function
--   DROP FUNCTION IF EXISTS public.increment_reopen_request(uuid);
--
--   -- 3. Drop the index
--   DROP INDEX IF EXISTS flags_reopen_requests_idx;
--
--   -- 4. Remove the columns
--   ALTER TABLE public.flags
--     DROP COLUMN IF EXISTS reopen_requests,
--     DROP COLUMN IF EXISTS reopen_requests_reset_at;
--
-- Rollback is non-destructive beyond the column data itself (which will be
-- 0 / NULL for all rows until the first reopen vote lands).
--
-- =============================================================================
