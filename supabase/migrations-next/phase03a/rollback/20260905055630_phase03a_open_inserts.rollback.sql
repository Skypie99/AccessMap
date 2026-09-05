-- PHASE-03A LOCAL CANDIDATE: FDA-023. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
-- Forward restoration to the pre-03A posture; this restores known weaknesses.
-- Disposable rehearsal only until a separate exact production token authorizes it.
BEGIN;
DROP POLICY "flags authenticated insert open" ON public.flags;
COMMIT;
