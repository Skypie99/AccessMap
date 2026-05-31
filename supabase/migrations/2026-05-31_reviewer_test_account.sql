-- ============================================================
-- App Store Reviewer Test Account
-- supabase/migrations/2026-05-31_reviewer_test_account.sql
-- PROPOSE-ONLY — apply via Supabase SQL Editor before App Store submission.
-- ============================================================
--
-- STEP 1 (manual — Supabase Auth dashboard):
--   Authentication → Users → "Add user" → "Create new user"
--     Email:    reviewer@accessmap.app
--     Password: AccessMap2026!
--   (The handle_new_user trigger auto-creates the public.users row.)
--
-- STEP 2 (this script):
--   Run the block below in the SQL Editor AFTER the auth user exists.
--   It sets a display name, seeds 25 points, and inserts 5 sample flags
--   near downtown Vancouver so the reviewer sees a realistic map.
--
-- ROLLBACK:
--   DELETE FROM public.flags  WHERE user_id = (SELECT id FROM public.users WHERE email = 'reviewer@accessmap.app');
--   UPDATE public.users SET display_name = NULL, points = 0 WHERE email = 'reviewer@accessmap.app';
--   (To fully remove: delete the auth user from Authentication → Users.)
-- ============================================================

DO $$
DECLARE
  reviewer_id uuid;
BEGIN
  SELECT id INTO reviewer_id
    FROM public.users
   WHERE email = 'reviewer@accessmap.app';

  IF reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Reviewer auth user not found. Complete Step 1 first.';
  END IF;

  -- Set profile
  UPDATE public.users
     SET display_name = 'App Reviewer',
         points       = 25
   WHERE id = reviewer_id;

  -- 5 sample flags — downtown Vancouver, mix of categories and severities
  INSERT INTO public.flags (user_id, lat, lng, category, severity, description, status)
  VALUES
    (reviewer_id, 49.2827, -123.1207, 'no_ramp',         4, 'Corner cut-out missing at this intersection — no way to cross from the south side.',   'open'),
    (reviewer_id, 49.2831, -123.1195, 'broken_sidewalk', 3, 'Large crack and sunken panel, about 5 cm drop. Difficult for wheelchair users.',          'verified'),
    (reviewer_id, 49.2819, -123.1220, 'blocked_path',    5, 'Construction scaffolding fully blocks the sidewalk with no accessible detour marked.',    'open'),
    (reviewer_id, 49.2845, -123.1180, 'missing_signal',  2, 'Pedestrian audible signal at this crosswalk is broken — silent on both cycles.',          'open'),
    (reviewer_id, 49.2810, -123.1240, 'steep_grade',     3, 'Ramp grade is far steeper than ADA 1:12 ratio. Hard to self-propel without assistance.', 'resolved')
  ON CONFLICT DO NOTHING;
END;
$$;
