-- PHASE-03A LOCAL CANDIDATE: FDA-026 STAGE B (cutover). NOT AUTHORIZED FOR APPLY.
-- NOT PART OF THE STAGE A APPLY SET. Requires a SEPARATE owner authorization that
-- names release-capability proof, not merely a migration-apply token.
--
-- This migration is the whole of FDA-026's closure. It was split out of
-- 20260905055633_phase03a_contextual_profiles.sql because applying it while
-- legacy clients are in the field breaks them SILENTLY:
--
--   src/lib/admin.ts:31   .from('users').select('is_admin').eq('id', user.id)
--        -> 42501 once the column grant is revoked. The shipped catch degrades
--           to isAdmin=false, so an admin simply stops seeing the admin UI.
--   src/lib/flags.ts:1682 listLeaderboard()
--        -> succeeds and returns <=1 row once own-row RLS is the only policy.
--   src/lib/flags.ts:1702/1717 getUserLeaderboardRank()
--        -> the exact-count over public.users sees one row, so rank is always 1.
--   comment author hydration
--        -> authors fall back to "anonymous".
--
-- None of those surface an error to the user. That is what makes this a cutover
-- rather than an ordinary tightening.
--
-- ------------------------------------------------------------------ PRECONDITION
-- Stage A (20260905055633) created the bounded replacements and granted them to
-- authenticated:
--     public.current_user_can_admin()
--     public.list_public_leaderboard(integer)
--     public.get_my_leaderboard_rank()
--     public.get_comment_author_profiles(uuid[])
--
-- DO NOT APPLY THIS MIGRATION until there is OBJECTIVE evidence that no client
-- still reading public.users directly is in the field. "We shipped an update" is
-- not evidence; some fraction of installs is always behind. The owner must state
-- which proof is accepted -- for example a minimum supported build enforced
-- server-side, or telemetry showing the legacy read path has gone quiet -- and
-- record it in the release control plane. The measured state at authoring time
-- was: shipped iOS f5594171 and pinned web ebf091c2 both read public.users
-- directly and reference NONE of the four replacement RPCs.
BEGIN;

-- Closes the broad authenticated read of every profile row (FDA-026 proper).
DROP POLICY "users readable by authenticated" ON public.users;

-- Closes the is_admin column read. Admin capability is answered from then on by
-- public.current_user_can_admin(), which returns a boolean about the CALLER and
-- never exposes another account's flag.
REVOKE SELECT (is_admin) ON public.users FROM PUBLIC, anon, authenticated;

-- Own-profile columns and the own-user INSERT returning embeds are preserved:
-- the "users own row full select" policy still covers the caller's own row.
COMMIT;
