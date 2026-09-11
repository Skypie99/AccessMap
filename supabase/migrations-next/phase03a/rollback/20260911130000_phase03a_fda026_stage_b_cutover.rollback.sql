-- PHASE-03A LOCAL CANDIDATE: FDA-026 STAGE B rollback. NOT AUTHORIZED FOR APPLY.
-- Forward restoration to the Stage A posture; this deliberately RESTORES the
-- known weakness FDA-026 describes (any authenticated caller can read every
-- profile row, including is_admin).
--
-- This is the incident path for a Stage B cutover that turns out to be premature
-- -- i.e. legacy clients were still in the field and admin/leaderboard went
-- silently wrong. It restores exactly what Stage B removed and nothing else; the
-- four replacement RPCs from Stage A are untouched and keep working.
BEGIN;
CREATE POLICY "users readable by authenticated" ON public.users FOR SELECT TO authenticated USING (true);
GRANT SELECT (is_admin) ON public.users TO authenticated;
GRANT SELECT ON TABLE public.flag_comments TO anon;
GRANT SELECT ON TABLE public.flag_photos TO anon;
GRANT SELECT ON TABLE public.flag_status_history_public TO anon;
GRANT SELECT ON TABLE public.flag_edit_history_public TO anon;
GRANT SELECT ON TABLE public.point_events TO anon;
COMMIT;
