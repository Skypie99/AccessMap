-- ============================================================================
-- 2026-06-18 — Monthly leaderboard RPC  (UX #8, Sky-approved 2026-06-18)
-- ============================================================================
-- STATUS: PROPOSED — *** NOT YET APPLIED to the live database ***
-- Apply it yourself via the Supabase SQL editor. Exact steps:
--   qa-reports/2026-06-18_AccessMap_MonthlyLeaderboard.md
--
-- WHAT IT DOES
-- Adds ONE read-only function that ranks contributors by points earned in the
-- CURRENT CALENDAR MONTH — but only from contributions that were VALIDATED BY
-- OTHER PEOPLE. Concretely it sums the existing `point_events` ledger deltas for
-- event types `flag_verified_reporter` and `flag_resolved_reporter` (a user's own
-- report that SOMEONE ELSE verified/resolved). It deliberately EXCLUDES:
--   • flag_submitted  — raw self-submission (the farmable one), not peer-validated
--   • flag_*_actor     — points for verifying/resolving others' flags (the
--                        rubber-stamp-grind risk Sky flagged)
--   • photo/comment/streak/penalty — not "verified by other people"
-- So the monthly board rewards peer-validated impact only and can't be farmed by
-- volume. (Sky's decision, 2026-06-18: "only count contributions verified by
-- OTHER people, monthly.")
--
-- WHY A SECURITY-DEFINER FUNCTION
-- `point_events` is owner-read-only (RLS: auth.uid() = user_id), so a normal
-- client CANNOT aggregate across users to build a leaderboard. This function runs
-- as definer to read the ledger, BUT returns ONLY aggregate points + already-public
-- profile fields (display_name, avatar_url) — never individual events, deltas, event
-- types, or flag_ids. That preserves the trust-score audit-privacy constraint
-- (point_events detail stays owner-only) and exposes nothing the existing all-time
-- leaderboard (which already shows user + points publicly) doesn't already expose.
-- search_path is pinned to `public` to match the 2026-05-29 / 2026-06-01 function
-- hardening migrations.
--
-- ROLLBACK
--   DROP FUNCTION IF EXISTS public.list_monthly_leaderboard(integer);
-- (The UI degrades gracefully if the function is absent — see
--  src/lib/users.ts listMonthlyLeaderboard, which catches the missing-function
--  error and returns [], so removing this never breaks the app.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_monthly_leaderboard(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id             uuid,
  display_name   text,
  avatar_url     text,
  monthly_points bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.display_name,
    u.avatar_url,
    COALESCE(SUM(pe.delta), 0)::bigint AS monthly_points
  FROM public.point_events pe
  JOIN public.users u ON u.id = pe.user_id
  WHERE pe.event_type IN ('flag_verified_reporter', 'flag_resolved_reporter')
    AND pe.created_at >= date_trunc('month', now())
    AND pe.delta > 0
  GROUP BY u.id, u.display_name, u.avatar_url
  HAVING COALESCE(SUM(pe.delta), 0) > 0
  ORDER BY monthly_points DESC, u.display_name ASC
  -- Clamp the caller-supplied limit to a sane 1..100 window.
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

-- Only signed-in users can call it (same access posture as the rest of the app's data).
REVOKE ALL ON FUNCTION public.list_monthly_leaderboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_monthly_leaderboard(integer) TO authenticated;

-- Optional (only if the monthly query ever feels slow as point_events grows — the
-- existing point_events_user_id_idx already covers most of it; uncomment to add a
-- window-tuned partial index):
-- CREATE INDEX IF NOT EXISTS point_events_reporter_month_idx
--   ON public.point_events (created_at DESC)
--   WHERE event_type IN ('flag_verified_reporter', 'flag_resolved_reporter');
