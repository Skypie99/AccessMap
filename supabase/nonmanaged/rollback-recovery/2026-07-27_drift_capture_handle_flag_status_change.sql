-- ============================================================================
-- FILE:    2026-07-27_drift_capture_handle_flag_status_change.sql
-- BANKED BY: SHIP-READY Phase-3 prep (2026-07-27), at Sky's explicit direction
--   during the Job 1 SQL-slate review, before applying Fork-2/OA (SR-008)
--   merged with 04b §C-9(ii)'s history-insert fold-in.
--
-- WHAT: Captures the LIVE body of public.handle_flag_status_change()
--   verbatim, read via pg_proc, immediately before the OA+history-fold
--   merge is applied. This is NOT a behaviour change -- the DDL below
--   reproduces the function exactly as it is live today.
--
-- WHY: this function's own header (in the fork-briefs OA spec) says it
--   "has bitten prod twice" -- duplicate-trigger double-points (fixed
--   2026-06-03) and an is_admin reference error. The statement about to
--   replace it is also the most "constructed" one in this batch (OA's
--   guard-line change merged with C-9(ii)'s 3-line history insert, per
--   04b §C-1's own splice instruction) rather than a verbatim artifact
--   copy -- extra provenance discipline felt warranted. Banked at Sky's
--   direction, same reasoning as the C-2 and C-5 captures.
--
--   VERIFIED (read-only, 2026-07-27): this body matches the fork-briefs
--   OA spec's stated "before" text exactly (its own header: "the schema.sql
--   mirror, 'matches live as of 2026-06-07', pg_get_functiondef-verified,
--   with ONLY the guard line changed") -- no drift found for this function,
--   unlike C-5's sibling case.
--
-- STATUS: Documentation / provenance artifact. Not run through the normal
--   apply pipeline (it would be a safe no-op if it were -- it reasserts
--   the identical function verbatim). The OA+history-fold fix, and its
--   rollback (which points back to this file), are tracked and gated
--   separately -- same per-statement Sky's-yes discipline as every other
--   Job 1 item.
-- ============================================================================

-- Captured verbatim via (read-only; nothing was modified to produce this):
--   select p.proname, p.proacl::text, p.prosrc from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname = 'handle_flag_status_change';
--
-- Result (2026-07-27): grants = {postgres=X/postgres,service_role=X/postgres}
--   (no anon/authenticated EXECUTE grant live today -- preserved below).

create or replace function public.handle_flag_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  reporter_bonus    int := 0;
  reporter_event    text;
  actor_bonus       int := 0;
  actor_event       text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'verified' AND OLD.status = 'open' THEN
    reporter_bonus  := 10;
    reporter_event  := 'flag_verified_reporter';
    actor_bonus     := 3;
    actor_event     := 'flag_verified_actor';
  ELSIF NEW.status = 'resolved' AND OLD.status IN ('open', 'verified') THEN
    reporter_bonus  := 15;
    reporter_event  := 'flag_resolved_reporter';
    actor_bonus     := 7;
    actor_event     := 'flag_resolved_actor';
  ELSIF NEW.status = 'rejected' AND auth.uid() IN (
      SELECT id FROM public.users WHERE is_admin = true
    ) THEN
    -- Spam penalty: only when admin explicitly rejects
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.users
        SET points = GREATEST(0, points - 20)
        WHERE id = NEW.user_id;
      INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
        VALUES (NEW.user_id, 'flag_spam_penalty', -20, NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  IF reporter_bonus > 0 AND NEW.user_id IS NOT NULL THEN
    UPDATE public.users
      SET points = points + reporter_bonus
      WHERE id = NEW.user_id;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (NEW.user_id, reporter_event, reporter_bonus, NEW.id);
  END IF;

  IF actor_bonus > 0
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> NEW.user_id THEN
    UPDATE public.users
      SET points = points + actor_bonus
      WHERE id = auth.uid();
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (auth.uid(), actor_event, actor_bonus, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

revoke execute on function public.handle_flag_status_change() from public, anon, authenticated;

-- ============================================================================
-- USE: this file IS the corrected rollback for the Fork-2/OA + C-9(ii)
-- history-fold merge. Re-running it restores the exact pre-fix state.
-- ============================================================================
