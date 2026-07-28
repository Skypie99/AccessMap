-- Flag comments: allow authenticated users to discuss accessibility flags.
-- FK points to public.users (not auth.users) so PostgREST can resolve the
-- users(display_name) join in listComments without a cast.
--
-- user_id is NULLABLE with ON DELETE SET NULL, deliberately (SR-117, Option A,
-- ratified 2026-07-27). Deleting an account leaves that account's comments in
-- place with the author anonymised, rather than deleting them. Two reasons:
--
--   1. THE PUBLISHED TERMS DEPEND ON IT. `14_MODERATION_TEXTS_v1.md` §1 "Your
--      account" tells users "Anything you've contributed may stay in the app,
--      with your name removed, so the community's record of barriers stays
--      whole." ON DELETE CASCADE here would delete those contributions and make
--      that published sentence false. Do not "restore" CASCADE.
--   2. It matches the app's anonymise-don't-erase posture elsewhere (SR-010),
--      and it closes an abuse hole: under CASCADE a user could erase reports of
--      their own abuse by deleting their account (collides with C-8).
--
-- This line was corrected FROM `NOT NULL ... ON DELETE CASCADE` on 2026-07-27.
-- Live had already been nullable/SET NULL since before that date; the repo text
-- was the half that was wrong. Full provenance, the read-only verification, and
-- the foreclosed Option B are in
-- `2026-07-27_drift_capture_flag_comments_user_id.sql`. Nothing was applied to
-- the live database to make this true — it already was.

CREATE TABLE IF NOT EXISTS public.flag_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id     UUID        NOT NULL REFERENCES public.flags(id)  ON DELETE CASCADE,
  user_id     UUID                 REFERENCES public.users(id)  ON DELETE SET NULL,
  content     TEXT        NOT NULL
                          CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flag_comments ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read comments on any flag.
CREATE POLICY "flag_comments: authenticated read"
  ON public.flag_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Users insert only comments where user_id matches their own session.
CREATE POLICY "flag_comments: own insert"
  ON public.flag_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users delete only their own comments.
CREATE POLICY "flag_comments: own delete"
  ON public.flag_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Composite index: most queries filter by flag_id and sort by time.
CREATE INDEX IF NOT EXISTS flag_comments_flag_id_created_at_idx
  ON public.flag_comments (flag_id, created_at DESC);

-- Realtime support so the useComments hook gets live INSERT/DELETE events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.flag_comments;
