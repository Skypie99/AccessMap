-- PHASE-03A LOCAL CANDIDATE: FDA-021. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
-- Forward restoration to the pre-03A posture; this restores known weaknesses.
-- Disposable rehearsal only until a separate exact production token authorizes it.
BEGIN;
REVOKE UPDATE (display_name, avatar_url, avatar_object_key) ON public.users FROM authenticated;
GRANT UPDATE ON TABLE "public"."users" TO "anon";
GRANT UPDATE ON TABLE "public"."users" TO "authenticated";
COMMIT;
