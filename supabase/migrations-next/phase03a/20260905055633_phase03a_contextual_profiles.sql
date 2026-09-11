-- PHASE-03A LOCAL CANDIDATE: FDA-026 STAGE A (additive). NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Internal/admin authorization remains caller-scoped in the non-exposed schema.
ALTER POLICY "admin delete any flag" ON public.flags
USING ((SELECT private.current_user_is_admin()));
ALTER POLICY "admin delete any comment" ON public.flag_comments
USING ((SELECT private.current_user_is_admin()));
ALTER POLICY "flag-photos admin delete" ON storage.objects
USING (bucket_id = 'flag-photos' AND (SELECT private.current_user_is_admin()));

CREATE FUNCTION public.current_user_can_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $fn$ SELECT coalesce(private.current_user_is_admin(), false) $fn$;

CREATE FUNCTION private.list_public_leaderboard(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, display_name text, avatar_url text, points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users AS caller WHERE caller.id = (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Authenticated account required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT u.id, u.display_name, u.avatar_url, u.points
    FROM public.users AS u ORDER BY u.points DESC, u.id
    LIMIT greatest(0, least(coalesce(p_limit, 20), 20));
END $fn$;
CREATE FUNCTION public.list_public_leaderboard(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, display_name text, avatar_url text, points integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $fn$ SELECT * FROM private.list_public_leaderboard(p_limit) $fn$;

CREATE FUNCTION private.get_my_leaderboard_rank()
RETURNS TABLE(rank bigint, points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users AS caller WHERE caller.id = (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Authenticated account required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT 1 + (SELECT count(*) FROM public.users AS above WHERE above.points > me.points), me.points
    FROM public.users AS me WHERE me.id = (SELECT auth.uid());
END $fn$;
CREATE FUNCTION public.get_my_leaderboard_rank()
RETURNS TABLE(rank bigint, points integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $fn$ SELECT * FROM private.get_my_leaderboard_rank() $fn$;

CREATE FUNCTION private.get_comment_author_profiles(p_comment_ids uuid[])
RETURNS TABLE(comment_id uuid, display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users AS caller WHERE caller.id = (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Authenticated account required' USING ERRCODE = '42501';
  END IF;
  IF p_comment_ids IS NULL OR cardinality(p_comment_ids) > 200 THEN
    RAISE EXCEPTION 'At most 200 comment IDs are allowed' USING ERRCODE = '22023';
  END IF;
  -- Current authenticated comment SELECT policy is unconditional. This is a
  -- contextual author projection, not a user-ID lookup. Re-review this helper
  -- whenever comment visibility changes; no other profile data is returned.
  RETURN QUERY SELECT c.id, u.display_name FROM public.flag_comments AS c
    LEFT JOIN public.users AS u ON u.id = c.user_id WHERE c.id = ANY(p_comment_ids);
END $fn$;
CREATE FUNCTION public.get_comment_author_profiles(p_comment_ids uuid[])
RETURNS TABLE(comment_id uuid, display_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $fn$ SELECT * FROM private.get_comment_author_profiles(p_comment_ids) $fn$;

REVOKE ALL ON FUNCTION public.current_user_can_admin(),
  public.list_public_leaderboard(integer), public.get_my_leaderboard_rank(),
  public.get_comment_author_profiles(uuid[]), private.list_public_leaderboard(integer),
  private.get_my_leaderboard_rank(), private.get_comment_author_profiles(uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_admin(),
  public.list_public_leaderboard(integer), public.get_my_leaderboard_rank(),
  public.get_comment_author_profiles(uuid[]), private.list_public_leaderboard(integer),
  private.get_my_leaderboard_rank(), private.get_comment_author_profiles(uuid[])
  TO authenticated;

-- ---------------------------------------------------------------- STAGE A ONLY
-- The two statements that CLOSE FDA-026 deliberately do NOT live here:
--
--   DROP POLICY "users readable by authenticated" ON public.users;
--   REVOKE SELECT (is_admin) ON public.users FROM PUBLIC, anon, authenticated;
--
-- They moved to 20260911130000_phase03a_fda026_stage_b_cutover.sql because
-- applying them breaks the CURRENTLY SHIPPED clients, silently:
--   * admin.ts reads users.is_admin and would take 42501, and the shipped code
--     swallows that into isAdmin=false, so every admin loses the admin UI with
--     no error shown;
--   * listLeaderboard() and getUserLeaderboardRank() read other users' rows and
--     would silently return one row / rank 1 rather than failing loudly.
-- Neither shipped tree (f5594171 iOS, ebf091c2 web) references the four RPCs
-- created above -- they are additive today and become load-bearing at cutover.
--
-- THEREFORE: FDA-026 IS NOT CLOSED BY THIS MIGRATION. It remains OPEN until the
-- Stage B cutover, which requires objective proof that clients reading
-- public.users directly are no longer in the field.
COMMIT;
