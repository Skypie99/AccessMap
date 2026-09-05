-- =============================================================================
-- FORWARD-ONLY CANDIDATE — not applied anywhere. PHASE-02B.
--
-- Version 20260904000300 is strictly after the ledger head 20260830130000.
--
-- PURPOSE: adopt the three live BEFORE INSERT rate-limit triggers on
-- public.flags. The PHASE-02B replay reproduced only one of them from the
-- applied lineage; production has three. The other two were applied out of band
-- and captured verbatim from pg_proc/pg_trigger on 2026-07-27:
--
--   enforce_flag_creation_rate_limit -> check_flag_creation_rate_limit()
--   enforce_global_anon_rate_limit   -> check_global_anon_rate_limit()
--   enforce_flag_rate_limit          -> check_flag_rate_limit()
--
-- This matters beyond parity. The 2026-07-27 capture records that a prior audit
-- graded SR-007 HIGH on the [repo-inferred] claim that anonymous reporting has
-- no server-side cap — a conclusion drawn from the repository, which was
-- missing two of the three throttles. Reading a defence out of an incomplete
-- lineage produced a false HIGH. Adopting them is what stops that recurring.
--
-- Statements are transcribed VERBATIM from the two banked captures:
--   nonmanaged/rollback-recovery/2026-07-27_drift_capture_live_flag_insert_throttles.sql
--   nonmanaged/live-out-of-band/2026-05-30_flag_rate_limit_check_flag_rate_limit_variant.sql
--
-- EFFECT AGAINST PRODUCTION: none — production already has all three.
-- EFFECT ON A REBUILT DATABASE: restores the full server-side insert throttle.
--
-- CAVEAT recorded rather than hidden: FDA-028 already flags the GLOBAL anon cap
-- as a denial-of-service switch. Adopting it reproduces production faithfully;
-- it does not endorse the design. Phase 03A owns replacing it with per-client
-- limits.
--
-- NOT AUTHORIZED FOR APPLY.
-- =============================================================================

create or replace function public.check_global_anon_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  anon_count INTEGER;
  global_cap INTEGER := 100;
BEGIN
  -- Only applies to anon inserts (authenticated users have their own limit).
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO anon_count
  FROM public.flags
  WHERE user_id IS NULL
    AND created_at > NOW() - INTERVAL '1 hour';

  IF anon_count >= global_cap THEN
    RAISE EXCEPTION 'Anonymous reporting is temporarily paused. Try again in a bit.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

revoke execute on function public.check_global_anon_rate_limit()
  from public, anon, authenticated;

drop trigger if exists enforce_global_anon_rate_limit on public.flags;
create trigger enforce_global_anon_rate_limit
  before insert on public.flags
  for each row execute function public.check_global_anon_rate_limit();

-- ---------------------------------------------------------------------------
-- 1. THE SECOND PER-USER CAP -- redundant with check_flag_rate_limit()
-- ---------------------------------------------------------------------------
create or replace function public.check_flag_creation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  flag_count integer;
  rate_limit constant integer := 20;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO flag_count
  FROM public.flags
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF flag_count >= rate_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded: you can only create % flags per 24-hour period. Try again later.', rate_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

revoke execute on function public.check_flag_creation_rate_limit()
  from public, anon, authenticated;

drop trigger if exists enforce_flag_creation_rate_limit on public.flags;
create trigger enforce_flag_creation_rate_limit
  before insert on public.flags
  for each row execute function public.check_flag_creation_rate_limit();

CREATE OR REPLACE FUNCTION check_flag_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flag_count INTEGER;
  rate_limit INTEGER := 20; -- max flags per 24 hours
BEGIN
  -- Count flags created by this user in the last 24 hours
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

-- Create the trigger on flags table
DROP TRIGGER IF EXISTS enforce_flag_rate_limit ON public.flags;
CREATE TRIGGER enforce_flag_rate_limit
  BEFORE INSERT ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION check_flag_rate_limit();

-- Add a comment for future maintainers
COMMENT ON FUNCTION check_flag_rate_limit() IS
  'Rate limit: max 20 flags per user per 24 hours. Adjust rate_limit variable to change threshold.';
