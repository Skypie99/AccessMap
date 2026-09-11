-- FORWARD RE-APPLICATION of 20260905055629_phase03a_flag_policies.sql.
-- STAGE-MF-08 forward-only recovery: re-applying a candidate that was deliberately
-- undone is ANOTHER new forward version (20260913000000), never a re-run of the original
-- and never a ledger edit. The ledger ends up reading: applied, undone, re-applied.
--
-- Staging rehearsal on disposable branch cepayqmsoqxshsiyqnvz.
-- PHASE-03A LOCAL CANDIDATE: FDA-009. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Explicit existing SELECT/INSERT/UPDATE and owner/admin DELETE policies remain.
DROP POLICY flags_user_scoped ON public.flags;
COMMIT;
