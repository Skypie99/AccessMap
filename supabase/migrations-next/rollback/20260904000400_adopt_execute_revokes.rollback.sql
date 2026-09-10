-- INTENTIONALLY UNSUPPORTED ROLLBACK for 20260904000400.
--
-- A baseline-restoring rollback would have to republish a retired credential
-- literal and re-open direct EXECUTE on trigger-only SECURITY DEFINER
-- functions. Both outcomes are security regressions. This artifact fails
-- closed. The rollback rehearsal expects this refusal and records the candidate
-- as NON_REVERSIBLE_SECURITY_REPAIR, never as successfully rolled back.
-- Recovery requires a separately reviewed compensating-forward migration.

do $$
begin
  raise exception 'ROLLBACK REFUSED: 20260904000400 is a non-reversible security repair';
end
$$;
