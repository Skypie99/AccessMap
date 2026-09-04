-- ============================================================================
-- FILE:    2026-07-27_drift_capture_check_flag_rate_limit.sql
-- BANKED BY: SHIP-READY Phase-3 prep (2026-07-27), at Sky's explicit direction
--   during the Job 1 SQL-slate review, in response to 04b §C-5 (SR-007).
--
-- WHAT: Captures the LIVE body of public.check_flag_rate_limit() verbatim,
--   read via pg_proc, BEFORE 04b §C-5's proposed anon-throttle fix is
--   applied. This is NOT a behaviour change -- the DDL below reproduces the
--   function exactly as it is live today.
--
-- WHY THIS ONE MATTERS MORE THAN MOST: 04b's SR-007 finding was explicitly
--   "repo-inferred" -- it assumed the function still matched the original
--   2026-05-30_flag_creation_rate_limit.sql migration file. It does not.
--
--   CONFIRMED DRIFT (investigated 2026-07-27, read-only):
--   * The committed migration file has exactly two commits touching it ever
--     -- the original (4de52a4) and a hardening pass (33a030e, "harden
--     Phase 4 migrations before apply", 2026-05-30 12:57 PT) that added
--     `SET search_path = public` and schema-qualified `flags` ->
--     `public.flags`. Neither added the anon early-return below.
--   * The live migration ledger carries an entry named
--     `flag_creation_rate_limit_hardened` (version 20260530192824, i.e.
--     ~12:28pm PT the same day -- about 29 minutes BEFORE the file-based
--     33a030e commit). NO file of that name, or any name implementing this
--     body, was ever committed to this repo, on any branch, at any point
--     in its history (verified: `git log --all --diff-filter=A -- '*rate_
--     limit*hardened*'` returns nothing).
--   * The distinctive live comment text ("No server-side per-user limit is
--     possible without IP or device ID (Jordan hard constraints)") appears
--     nowhere in the repo's tracked text (docs, code, or SQL).
--
--   Conclusion: this function was edited directly against the live
--   database -- CLI push of an uncommitted file, or a dashboard SQL-editor
--   edit -- and the change was never captured back into version control.
--   Same category of risk as 04b §F-1's `flags_user_scoped` (an
--   un-versioned live policy); this is the same pattern on a function.
--   WHO made the change is not recoverable from Postgres; WHEN is bounded
--   by the ledger timestamp above.
--
--   Functionally, this live version and the original bare NULL-collapsing
--   version behave identically for anonymous inserts (both let them
--   through uncapped) -- the drift is not a live safety regression, but it
--   IS a live behavior that no rollback text anywhere accounts for.
--
-- STATUS: Documentation / provenance artifact. Not run through the normal
--   apply pipeline (it would be a safe no-op if it were -- it reasserts
--   the identical function verbatim). C-5's actual fix, and its rollback
--   (which points back to this file), are tracked and gated separately --
--   same per-statement Sky's-yes discipline as every other Job 1 item.
-- ============================================================================

-- Captured verbatim via (read-only; nothing was modified to produce this):
--   select p.proname, p.proacl::text, p.prosrc from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname = 'check_flag_rate_limit';
--
-- Result (2026-07-27): grants = {postgres=X/postgres,service_role=X/postgres}
--   (no anon/authenticated EXECUTE grant live today -- preserved below).

create or replace function public.check_flag_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  flag_count INTEGER;
  rate_limit INTEGER := 20;
BEGIN
  -- Anon inserts (auth.uid() IS NULL) are rate-limited client-side via
  -- AsyncStorage (src/lib/anonRateLimit.ts). No server-side per-user
  -- limit is possible without IP or device ID (Jordan hard constraints).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO flag_count
  FROM public.flags
  WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours';

  IF flag_count >= rate_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum % flags per 24 hours', rate_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

revoke execute on function public.check_flag_rate_limit() from public, anon, authenticated;

-- ============================================================================
-- USE: this file IS the corrected rollback for 04b §C-5's proposed fix.
-- Re-running it restores the exact pre-fix state that was ACTUALLY live --
-- supersedes 04b's own rollback text, which restores the stale original
-- (pre-33a030e-and-pre-drift) body instead.
-- ============================================================================
