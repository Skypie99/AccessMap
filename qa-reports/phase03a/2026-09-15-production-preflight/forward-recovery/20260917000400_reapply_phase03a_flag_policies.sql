-- FORWARD REAPPLICATION of 20260905055629_phase03a_flag_policies.
-- Prepared as production Phase 03A preflight evidence only.
-- This later canonical version preserves the original ledger row and reapplies the exact accepted source body.
-- Execution requires a separate exact owner authorization, fresh version-availability proof, and independent security review.
-- PHASE-03A LOCAL CANDIDATE: FDA-009. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Explicit existing SELECT/INSERT/UPDATE and owner/admin DELETE policies remain.
DROP POLICY flags_user_scoped ON public.flags;
COMMIT;
