-- FORWARD RE-APPLICATION of 20260905055636_phase03a_client_privileges.sql.
-- STAGE-MF-08 forward-only recovery: re-applying a candidate that was deliberately
-- undone is ANOTHER new forward version (20260913050000), never a re-run of the original
-- and never a ledger edit. The ledger ends up reading: applied, undone, re-applied.
--
-- Staging rehearsal on disposable branch cepayqmsoqxshsiyqnvz.
-- PHASE-03A LOCAL CANDIDATE: FDA-012 (partial; managed supabase_admin defaults remain HOLD). NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
BEGIN;
-- Remove schema/maintenance capabilities from exact application objects.
-- Existing per-table DML and column grants remain governed by their RLS/contracts.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."comment_votes",
  public."feedback",
  public."flag_comments",
  public."flag_edit_history",
  public."flag_photos",
  public."flag_status_history",
  public."flag_verifications",
  public."flags",
  public."notification_preferences",
  public."point_events",
  public."push_tokens",
  public."realtime_subscribe_log",
  public."users",
  public."flag_edit_history_public",
  public."flag_status_history_public",
  public."users_self_email"
FROM PUBLIC, anon, authenticated;
-- Neither sequence requires client setval(). Keep USAGE/SELECT for existing callers.
REVOKE UPDATE ON SEQUENCE public.point_events_id_seq, public.realtime_subscribe_log_id_seq
FROM PUBLIC, anon, authenticated;

-- New postgres-owned API objects require explicit, reviewed client grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, storage
REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, storage
REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, storage
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
-- PostgreSQL's implicit PUBLIC function privilege is global, so a schema-only
-- revoke does not remove it. Existing functions and service grants are untouched.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Deliberate residual: hosted postgres cannot manage supabase_admin defaults.
-- No SET ROLE, escalation, support action or silent "all defaults fixed" claim.
COMMIT;
