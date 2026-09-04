-- ============================================================================
-- FILE:    2026-07-27_drift_capture_live_flag_insert_throttles.sql
-- BANKED BY: SHIP-READY Phase-3 prep (2026-07-27), at Sky's direction after
--   the Job 1 pre-state check falsified 04b §A1-4 / SR-007.
--
-- WHAT: Captures the TWO un-versioned live rate-limit functions on
--   public.flags -- check_global_anon_rate_limit() and
--   check_flag_creation_rate_limit() -- plus their triggers, verbatim from
--   pg_proc / pg_trigger. This is NOT a behaviour change: the DDL below
--   reproduces exactly what is live today.
--
-- WHY: 04b §A1-4 graded SR-007 HIGH on the claim that "the rate-limit
--   trigger is a no-op for the entire anon cohort" and that anonymous
--   reporting therefore has NO server-side cap, only the clearable
--   AsyncStorage 5/24h in src/lib/anonRateLimit.ts. That finding was
--   explicitly tagged [repo-inferred] and was never checked against live.
--
--   IT IS FALSE. public.flags carries THREE BEFORE INSERT rate-limit
--   triggers, not one:
--     1. enforce_flag_creation_rate_limit -> check_flag_creation_rate_limit()
--          per-user 20/24h, keyed on NEW.user_id, skips anon. Repo-less.
--          (04b §A3-3 correctly predicted this function existed live with
--          no repo definition; §C-5's apply-order note flagged that it
--          would be missed. Both confirmed.)
--     2. enforce_flag_rate_limit -> check_flag_rate_limit()
--          per-user 20/24h, keyed on auth.uid(), skips anon. This is the
--          function 04b examined and the one §C-5 proposed to rewrite.
--          Captured separately in
--          2026-07-27_drift_capture_check_flag_rate_limit.sql.
--     3. enforce_global_anon_rate_limit -> check_global_anon_rate_limit()
--          GLOBAL ANON CAP, 100 inserts / 1 hour. Repo-less, and named in
--          NO audit document anywhere in design-reviews/. This is
--          functionally the artifact §C-5 proposed to build (same shape,
--          same 1h sliding window, same P0001 "temporarily paused" raise),
--          already live, with a more generous cap than §C-5's proposed 60.
--
--   CONSEQUENCE: §C-5 was NOT APPLIED. Applying it would have added a
--   second anon cap at 60/h alongside the existing 100/h; the tighter one
--   wins, so the real effect would have been a silent tightening of the
--   live cap from 100 to 60 -- not what the artifact claims to do, and not
--   what Sky consented to. Sky's decision (2026-07-27): skip the artifact,
--   bank these captures so the live throttles finally exist in version
--   control, and carry the finding to Phase 3.
--
-- OPEN ITEM FOR PHASE 3 (recorded, deliberately NOT fixed here):
--   Triggers 1 and 2 are REDUNDANT DUPLICATES -- both enforce 20 flags per
--   user per 24h, differing only in whether they key on NEW.user_id or
--   auth.uid(). Harmless today (both only RAISE; neither writes, so there
--   is no double-counting) but it is the same duplicate-trigger shape as
--   the duplicate-points incident of 2026-06-03. Deduplicating them is a
--   schema change and therefore out of scope for this Sky-triggered slate.
--   Note the semantic difference before choosing which to drop: trigger 1
--   (NEW.user_id) also caps service-role / dashboard inserts, which
--   trigger 2 (auth.uid()) does not.
--
-- ALSO SETTLED BY THE SAME READ (04b §E probe 4, effectively run):
--   * 04b §A4-2's "two webhook triggers => two push notifications per
--     status change" is FALSIFIED. Exactly ONE webhook trigger exists on
--     public.flags: flag_status_notify_trigger -> notify_flag_status_webhook.
--     There is no dashboard supabase_functions.http_request trigger, so
--     SR-018's "literal secret embedded in pg_trigger.tgargs" has no live
--     object on this table.
--   * 04b §A4-2's "two updated_at triggers" is CONFIRMED: on_flag_updated_at
--     -> set_flag_updated_at and update_flags_updated_at ->
--     update_flags_updated_at. Both bodies are identical
--     (new.updated_at := now()). Harmless, as predicted.
--
-- STATUS: Documentation / provenance artifact. Not run through the normal
--   apply pipeline (it would be a safe no-op if it were -- it reasserts
--   the identical objects verbatim).
-- ============================================================================

-- Captured verbatim via (read-only; nothing was modified to produce this):
--   select p.proname, pg_get_userbyid(p.proowner), p.prosecdef, p.proconfig,
--          p.proacl, p.prosrc
--     from pg_proc p where p.pronamespace='public'::regnamespace;
--   select c.relname, t.tgname, pg_get_triggerdef(t.oid)
--     from pg_trigger t join pg_class c on c.oid=t.tgrelid
--    where not t.tgisinternal and c.relname='flags';
--
-- Both functions: owner=postgres, SECURITY DEFINER, search_path=public,
-- grants {postgres=X/postgres,service_role=X/postgres} (no anon/authenticated
-- EXECUTE) -- all preserved below.

-- ---------------------------------------------------------------------------
-- 3. THE GLOBAL ANON CAP -- the object that falsifies SR-007
-- ---------------------------------------------------------------------------
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
