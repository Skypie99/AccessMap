-- ============================================================
-- Phase 7: Trust Score System
-- supabase/migrations/2026-05-30_trust_score_system.sql
-- PROPOSE-ONLY — apply via Supabase SQL Editor after Dana review.
-- See docs/TRUST_SCORE_SPEC.md for full rationale and rollback.
-- ============================================================

-- 1. Add streak columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_active_date date,
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak_days integer NOT NULL DEFAULT 0;

-- 2. point_events table — audit log of every point delta (owner-readable only)
CREATE TABLE IF NOT EXISTS public.point_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  delta       integer NOT NULL,
  flag_id     uuid REFERENCES public.flags(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT point_events_event_type_check CHECK (event_type IN (
    'flag_submitted',
    'flag_verified_reporter',
    'flag_resolved_reporter',
    'flag_verified_actor',
    'flag_resolved_actor',
    'flag_photo_added',
    'comment_added',
    'comment_upvoted',
    'flag_spam_penalty',
    'streak_bonus'
  ))
);

CREATE INDEX IF NOT EXISTS point_events_user_id_idx
  ON public.point_events(user_id, created_at DESC);

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_events owner select" ON public.point_events;
CREATE POLICY "point_events owner select"
  ON public.point_events FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
-- No INSERT/UPDATE/DELETE policies: all writes go through security definer triggers.

-- 3. flag_verifications table — records each community verification vote
CREATE TABLE IF NOT EXISTS public.flag_verifications (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id     uuid NOT NULL REFERENCES public.flags(id) ON DELETE CASCADE,
  verifier_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weight      numeric(3,1) NOT NULL DEFAULT 1.0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_id, verifier_id)
);

CREATE INDEX IF NOT EXISTS flag_verifications_flag_id_idx
  ON public.flag_verifications(flag_id);

ALTER TABLE public.flag_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flag_verifications readable" ON public.flag_verifications;
CREATE POLICY "flag_verifications readable"
  ON public.flag_verifications FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "flag_verifications own insert" ON public.flag_verifications;
CREATE POLICY "flag_verifications own insert"
  ON public.flag_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = verifier_id
    AND verifier_id <> (SELECT user_id FROM public.flags WHERE id = flag_id)
  );

-- 4. comment_votes table — thumbs-up on comments
CREATE TABLE IF NOT EXISTS public.comment_votes (
  comment_id  uuid NOT NULL REFERENCES public.flag_comments(id) ON DELETE CASCADE,
  voter_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, voter_id)
);

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_votes readable" ON public.comment_votes;
CREATE POLICY "comment_votes readable"
  ON public.comment_votes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "comment_votes insert own" ON public.comment_votes;
CREATE POLICY "comment_votes insert own"
  ON public.comment_votes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = voter_id);

DROP POLICY IF EXISTS "comment_votes delete own" ON public.comment_votes;
CREATE POLICY "comment_votes delete own"
  ON public.comment_votes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = voter_id);

-- 5. Trigger: award +5 points on flag INSERT (flag_submitted event)
CREATE OR REPLACE FUNCTION public.handle_flag_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW; -- anon submission: no points
  END IF;

  UPDATE public.users
    SET points = points + 5
    WHERE id = NEW.user_id;

  INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
    VALUES (NEW.user_id, 'flag_submitted', 5, NEW.id);

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_flag_submitted() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_flag_submitted ON public.flags;
CREATE TRIGGER on_flag_submitted
  AFTER INSERT ON public.flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_flag_submitted();

-- 6. Update handle_flag_status_change: new point values + write to point_events
--    New values: reporter +10 verified / +15 resolved; actor +3 verified / +7 resolved
--    (replaces original +5/+10 reporter, +2/+5 actor from schema.sql)
CREATE OR REPLACE FUNCTION public.handle_flag_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
REVOKE EXECUTE ON FUNCTION public.handle_flag_status_change() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_flag_status_change ON public.flags;
CREATE TRIGGER on_flag_status_change
  AFTER UPDATE OF status ON public.flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_flag_status_change();

-- 7. Trigger: award +3 on first photo added to a flag (one-time per flag)
CREATE OR REPLACE FUNCTION public.handle_flag_photo_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flag_owner       uuid;
  already_rewarded boolean;
BEGIN
  SELECT user_id INTO flag_owner FROM public.flags WHERE id = NEW.flag_id;
  IF flag_owner IS NULL OR flag_owner <> auth.uid() THEN
    RETURN NEW; -- only reward the flag owner for adding a photo
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.point_events
    WHERE user_id = flag_owner
      AND event_type = 'flag_photo_added'
      AND flag_id = NEW.flag_id
  ) INTO already_rewarded;

  IF NOT already_rewarded THEN
    UPDATE public.users
      SET points = points + 3
      WHERE id = flag_owner;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (flag_owner, 'flag_photo_added', 3, NEW.flag_id);
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_flag_photo_added() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_flag_photo_added ON public.flag_photos;
CREATE TRIGGER on_flag_photo_added
  AFTER INSERT ON public.flag_photos
  FOR EACH ROW EXECUTE FUNCTION public.handle_flag_photo_added();

-- 8. Trigger: award +1 on comment insert
CREATE OR REPLACE FUNCTION public.handle_comment_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
    SET points = points + 1
    WHERE id = NEW.user_id;

  INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
    VALUES (NEW.user_id, 'comment_added', 1, NEW.flag_id);

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_comment_added() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_comment_added ON public.flag_comments;
CREATE TRIGGER on_comment_added
  AFTER INSERT ON public.flag_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_added();

-- 9. Trigger: award +2 on comment vote (capped at 10 votes per comment)
CREATE OR REPLACE FUNCTION public.handle_comment_vote_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_author  uuid;
  total_votes     int;
BEGIN
  SELECT user_id INTO comment_author
    FROM public.flag_comments WHERE id = NEW.comment_id;

  IF comment_author = NEW.voter_id THEN
    RAISE EXCEPTION 'Cannot vote on your own comment'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO total_votes
    FROM public.comment_votes WHERE comment_id = NEW.comment_id;

  IF total_votes <= 10 THEN
    UPDATE public.users
      SET points = points + 2
      WHERE id = comment_author;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (
        comment_author,
        'comment_upvoted',
        2,
        (SELECT flag_id FROM public.flag_comments WHERE id = NEW.comment_id)
      );
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_comment_vote_added() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_comment_vote_added ON public.comment_votes;
CREATE TRIGGER on_comment_vote_added
  AFTER INSERT ON public.comment_votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_vote_added();

-- 10. Trigger: streak update on point_events insert
CREATE OR REPLACE FUNCTION public.handle_point_event_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today          date := current_date;
  user_last_date date;
  user_streak    int;
BEGIN
  IF NEW.event_type = 'streak_bonus' THEN
    RETURN NEW; -- avoid recursion
  END IF;

  SELECT last_active_date, streak_days
    INTO user_last_date, user_streak
    FROM public.users WHERE id = NEW.user_id;

  IF user_last_date = today THEN
    RETURN NEW; -- already updated today
  ELSIF user_last_date = today - 1 THEN
    user_streak := user_streak + 1;
  ELSE
    user_streak := 1;
  END IF;

  UPDATE public.users
    SET last_active_date = today,
        streak_days = user_streak,
        longest_streak_days = GREATEST(longest_streak_days, user_streak)
    WHERE id = NEW.user_id;

  -- Award streak bonus at each completed 7-day multiple
  IF user_streak > 0 AND user_streak % 7 = 0 THEN
    UPDATE public.users
      SET points = points + 5
      WHERE id = NEW.user_id;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (NEW.user_id, 'streak_bonus', 5, NULL);
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_point_event_streak() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_point_event_streak ON public.point_events;
CREATE TRIGGER on_point_event_streak
  AFTER INSERT ON public.point_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_point_event_streak();

-- ============================================================
-- ROLLBACK (run in reverse order if needed):
--
-- DROP TRIGGER IF EXISTS on_point_event_streak ON public.point_events;
-- DROP FUNCTION IF EXISTS public.handle_point_event_streak();
-- DROP TRIGGER IF EXISTS on_comment_vote_added ON public.comment_votes;
-- DROP FUNCTION IF EXISTS public.handle_comment_vote_added();
-- DROP TRIGGER IF EXISTS on_comment_added ON public.flag_comments;
-- DROP FUNCTION IF EXISTS public.handle_comment_added();
-- DROP TRIGGER IF EXISTS on_flag_photo_added ON public.flag_photos;
-- DROP FUNCTION IF EXISTS public.handle_flag_photo_added();
-- DROP TRIGGER IF EXISTS on_flag_submitted ON public.flags;
-- DROP FUNCTION IF EXISTS public.handle_flag_submitted();
-- DROP TABLE IF EXISTS public.comment_votes;
-- DROP TABLE IF EXISTS public.flag_verifications;
-- DROP TABLE IF EXISTS public.point_events;
-- ALTER TABLE public.users
--   DROP COLUMN IF EXISTS last_active_date,
--   DROP COLUMN IF EXISTS streak_days,
--   DROP COLUMN IF EXISTS longest_streak_days;
-- Re-apply original handle_flag_status_change from schema.sql
-- ============================================================
