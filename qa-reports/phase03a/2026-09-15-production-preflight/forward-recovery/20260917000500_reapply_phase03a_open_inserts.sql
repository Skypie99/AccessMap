-- FORWARD REAPPLICATION of 20260905055630_phase03a_open_inserts.
-- Prepared as production Phase 03A preflight evidence only.
-- This later canonical version preserves the original ledger row and reapplies the exact accepted source body.
-- Execution requires a separate exact owner authorization, fresh version-availability proof, and independent security review.
-- PHASE-03A LOCAL CANDIDATE: FDA-023. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Restrictive composition prevents any permissive INSERT policy bypass.
CREATE POLICY "flags authenticated insert open" ON public.flags
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (status = 'open');
COMMIT;
