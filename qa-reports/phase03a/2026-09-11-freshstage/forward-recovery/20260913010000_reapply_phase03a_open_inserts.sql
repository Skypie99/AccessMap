-- FORWARD RE-APPLICATION of 20260905055630_phase03a_open_inserts.sql.
-- STAGE-MF-08 forward-only recovery: re-applying a candidate that was deliberately
-- undone is ANOTHER new forward version (20260913010000), never a re-run of the original
-- and never a ledger edit. The ledger ends up reading: applied, undone, re-applied.
--
-- Staging rehearsal on disposable branch cepayqmsoqxshsiyqnvz.
-- PHASE-03A LOCAL CANDIDATE: FDA-023. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Restrictive composition prevents any permissive INSERT policy bypass.
CREATE POLICY "flags authenticated insert open" ON public.flags
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (status = 'open');
COMMIT;
