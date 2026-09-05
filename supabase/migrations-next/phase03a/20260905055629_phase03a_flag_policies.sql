-- PHASE-03A LOCAL CANDIDATE: FDA-009. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Explicit existing SELECT/INSERT/UPDATE and owner/admin DELETE policies remain.
DROP POLICY flags_user_scoped ON public.flags;
COMMIT;
