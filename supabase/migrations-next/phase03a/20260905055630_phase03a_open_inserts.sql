-- PHASE-03A LOCAL CANDIDATE: FDA-023. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Restrictive composition prevents any permissive INSERT policy bypass.
CREATE POLICY "flags authenticated insert open" ON public.flags
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (status = 'open');
COMMIT;
