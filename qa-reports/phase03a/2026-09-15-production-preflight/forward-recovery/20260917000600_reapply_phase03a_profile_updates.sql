-- FORWARD REAPPLICATION of 20260905055632_phase03a_profile_updates.
-- Prepared as production Phase 03A preflight evidence only.
-- This later canonical version preserves the original ledger row and reapplies the exact accepted source body.
-- Execution requires a separate exact owner authorization, fresh version-availability proof, and independent security review.
-- PHASE-03A LOCAL CANDIDATE: FDA-021. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
REVOKE UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, email, display_name, avatar_url, points, created_at,
  is_admin, streak_days, longest_streak_days, last_active_date, avatar_object_key)
  ON public.users FROM PUBLIC, anon, authenticated;
-- avatar_object_key remains necessary for the existing null-key fallback.
-- Its existing trigger rejects actual key changes; trusted reward writers retain rights.
GRANT UPDATE (display_name, avatar_url, avatar_object_key) ON public.users TO authenticated;
COMMIT;
