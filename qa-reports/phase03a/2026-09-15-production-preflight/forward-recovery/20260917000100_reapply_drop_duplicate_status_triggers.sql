-- FORWARD REAPPLICATION of 20260904000100_drop_duplicate_status_triggers.
-- Prepared as production Phase 03A preflight evidence only.
-- This later canonical version preserves the original ledger row and reapplies the exact accepted source body.
-- Execution requires a separate exact owner authorization, fresh version-availability proof, and independent security review.
-- =============================================================================
-- FORWARD-ONLY CANDIDATE — not applied anywhere. PHASE-02B.
--
-- Version 20260904000100 is strictly after the ledger head 20260830130000.
--
-- THE DEFECT THIS CLOSES, found by the PHASE-02B replay:
-- `20260528180527_d3_flag_status_trigger.sql` creates
--   trigger_flag_status_change  AFTER UPDATE OF status ON flags
--                               EXECUTE handle_flag_status_change()
-- and a later migration ALSO creates `on_flag_status_change` on the same table
-- for the same function. Nothing in the applied lineage ever drops the first.
--
-- `20260602060359_flags_close_nonowner_delete_and_fix_triage.sql` names this
-- exactly, in its own FOLLOW-UPS section:
--   "Duplicate triggers: TWO AFTER UPDATE OF status -> handle_flag_status_change
--    (on_flag_status_change + trigger_flag_status_change) = DOUBLE points per
--    status change."
-- It was recorded as propose-only and never fixed in the repository.
--
-- Production was fixed out of band: a read-only catalog query on 2026-09-04
-- confirms production has `on_flag_status_change` and NOT
-- `trigger_flag_status_change`. The REPOSITORY was never fixed — so a staging
-- database rebuilt from source awards DOUBLE points on every verify and every
-- resolve. The replay reproduced precisely that.
--
-- EFFECT AGAINST PRODUCTION: none — `if exists` on a trigger production does
-- not have. EFFECT ON A REBUILT DATABASE: removes the double award.
--
-- NOT AUTHORIZED FOR APPLY.
-- =============================================================================

drop trigger if exists trigger_flag_status_change on public.flags;

-- Assert the surviving trigger set. Fails loudly rather than leaving a database
-- that silently double-pays, which is the failure mode this file exists for.
do $$
declare
  n integer;
begin
  select count(*) into n
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  where ns.nspname = 'public'
    and c.relname = 'flags'
    and p.proname = 'handle_flag_status_change'
    and not t.tgisinternal;

  if n <> 1 then
    raise exception
      'Expected exactly 1 handle_flag_status_change trigger on public.flags, found %. Points would be awarded % times per status change.', n, n;
  end if;
end
$$;
