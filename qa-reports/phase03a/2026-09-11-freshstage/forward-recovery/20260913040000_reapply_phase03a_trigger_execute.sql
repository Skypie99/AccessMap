-- FORWARD RE-APPLICATION of 20260905055635_phase03a_trigger_execute.sql.
-- STAGE-MF-08 forward-only recovery: re-applying a candidate that was deliberately
-- undone is ANOTHER new forward version (20260913040000), never a re-run of the original
-- and never a ledger edit. The ledger ends up reading: applied, undone, re-applied.
--
-- Staging rehearsal on disposable branch cepayqmsoqxshsiyqnvz.
-- PHASE-03A LOCAL CANDIDATE: FDA-010. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Revoke exact signatures, not all functions. Owners/triggers/service access remain.
REVOKE EXECUTE ON FUNCTION public.enforce_flag_photos_object_key_guard(),
  public.enforce_flags_photo_object_key_guard(),
  public.enforce_users_avatar_object_key_guard(),
  public.handle_push_token_updated_at(),
  public.set_flag_updated_at(),
  public.update_flags_updated_at()
FROM PUBLIC, anon, authenticated;
COMMIT;
