-- PHASE-03A LOCAL CANDIDATE: FDA-009. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
-- Forward restoration to the pre-03A posture; this restores known weaknesses.
-- Disposable rehearsal only until a separate exact production token authorizes it.
BEGIN;
CREATE POLICY flags_user_scoped ON public.flags
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
COMMIT;
