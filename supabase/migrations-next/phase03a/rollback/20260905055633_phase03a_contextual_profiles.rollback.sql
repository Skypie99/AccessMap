-- PHASE-03A LOCAL CANDIDATE: FDA-026. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
-- Forward restoration to the pre-03A posture; this restores known weaknesses.
-- Disposable rehearsal only until a separate exact production token authorizes it.
BEGIN;
GRANT SELECT (is_admin) ON public.users TO authenticated;
CREATE POLICY "users readable by authenticated" ON public.users FOR SELECT TO authenticated USING (true);
ALTER POLICY "admin delete any flag" ON public.flags
USING ((SELECT users.is_admin FROM public.users WHERE users.id = (SELECT auth.uid())));
ALTER POLICY "admin delete any comment" ON public.flag_comments
USING ((SELECT users.is_admin FROM public.users WHERE users.id = (SELECT auth.uid())));
ALTER POLICY "flag-photos admin delete" ON storage.objects
USING (bucket_id = 'flag-photos' AND (SELECT is_admin FROM public.users WHERE id = (SELECT auth.uid())));
DROP FUNCTION public.current_user_can_admin(), public.list_public_leaderboard(integer),
  public.get_my_leaderboard_rank(), public.get_comment_author_profiles(uuid[]);
DROP FUNCTION private.list_public_leaderboard(integer), private.get_my_leaderboard_rank(),
  private.get_comment_author_profiles(uuid[]);
COMMIT;
