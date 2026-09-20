# Phase 03B recovery ledger statement identity repair

## Outcome

`HOLD`. The bounded verifier repair is locally complete and committed, but the
single authorized live read-only attempt stopped before structural and Edge
Function capture. No restoration runbook was prepared, and no restoration,
migration retry, database write, gate removal, staging action, or Phase 03C work
occurred.

## What changed

- Replaced the one-whole-file ledger assumption with the exact Supabase CLI
  `2.116.0` `SplitAndTrim` statement representation derived from the two frozen
  migration files.
- Added an unambiguous ordered-array digest: SHA-256 over each exact statement
  prefixed by its UTF-8 byte length and a colon, in ordinal order.
- Updated both post-apply and post-exit read-only SQL captures to hash every
  ledger statement through `unnest(statements) with ordinality`.
- Updated the strict comparator path to require exact versions, names, counts,
  ordering, and full ordered-array identity while preserving the existing R8
  envelope schema byte-for-byte.
- Added focused fail-closed tests and reproducible parser provenance/identity
  artifacts.
- After the one live attempt, corrected a local validator defect that treated
  JSON object member order as identity. The live capture itself contained the
  exact expected fields and values; the corrected local validator accepts it.
  This offline reconciliation is not elevated to a live PASS.

Frozen migration files were not changed.

## Branch and SHA

- Branch: `codex/flagstone-p03b-post-apply-recovery-20260919`
- Base before this repair: `783e0b8e01a4a7ef8b43e86f7cec782bb73883fc`
- Repair/evidence commit: `25452b72fedc1ca7777a343f57704e80a4e4b675`
- Repair tree: `8403e343e32f87dac1f75be5677f8a20ba99fa6e`
- No push or merge was performed.

## Root-cause confirmation

Official Supabase CLI tag `v2.116.0` resolves to source commit
`997a1e69a4a83466964ed874d3a604c88a7b3866`. Its migration path parses files
through `parser.SplitAndTrim`, stores the resulting ordered string slice in
`schema_migrations.statements`, and applies the same statements. The retained
execution lineage pins CLI `2.116.0` and the exact two frozen files. Independent
parsing produced `68` and `23` statements, exactly matching the read-only live
ledger capture and both ordered-array digests.

The old verifier instead expected `1/1` and hashed only the first array element.
The migration version/name identity was not the defect.

## Gates

- `node validate_ledger_statement_identity.mjs`: PASS, `23/23`.
- `node validate_post_apply_recovery_transport.mjs`: PASS, prior recovery
  transport `13/13`.
- `node run_post_apply_recovery_local_validation.mjs ...-v2`: PASS; six numeric
  child exits were `0`; preserved transport `22/22`; preserved history
  fail-closed `22/22`; preserved R11 controls PASS; disposable PostgreSQL replay
  PASS; validation infrastructure destroyed.
- `shasum -a 256` on the migrations: exact accepted hashes
  `b1d7b5a...` and `0b8ad388...`.
- `git diff --exit-code 9d638456... -- <two frozen migrations>`: exit `0`.
- Strict schema SHA-256: unchanged
  `0fe78b2a306fba77d1741fa57eb2591dba2762dfdc53e4d9f00e81d84dead517`.
- Privacy scans: PASS with zero findings for both local checkpoints and the live
  evidence directory.
- Ledger-identity repair manifest: PASS, `50` artifacts, zero digest mismatches.
- `git diff --cached --check`: PASS before the repair commit.

The application typecheck, lint, and Jest suite were not run because this task
changed only recovery verifier/evidence artifacts and used the dedicated
recovery control suites instead.

## Live read-only result

- Target: `kldlwszpfkdmsjrjhjym`
- Run count: exactly `1`; no retry.
- Transaction: read-only.
- Ledger: `87/87`, latest `20260915210413`.
- Phase 03B versions: exact two expected versions.
- Migration 1: `68`, ordered-array digest `cbc17a5164...086c`.
- Migration 2: `23`, ordered-array digest `72f8faf6c2...9569`.
- Exact temporary gate: present.
- HTTP queue: `0`; new responses since original T0: `0`; TTL: `6 hours`.
- Verifier disposition: `HOLD` because JSON member order was compared before
  structural capture.
- Final structure, permissions/RLS, moderation, points, client compatibility,
  and Edge Function identity: `NOT_RUN` in this live attempt.

## What's left

The repair is not ready for restoration review because the required live
`PASS_WHILE_QUIESCED` was not obtained. A second live verifier run would require
new, explicit owner authorization. Until then the exact gate remains present and
restoration remains prohibited.

## DECISIONS FOR SKY

Decision: whether to authorize one separate second live read-only verifier run
after a fresh narrow review of repair commit `25452b72fedc1ca7777a343f57704e80a4e4b675`.

Recommendation: require the narrow review first, then issue a new one-run
authorization only if the key-order correction and evidence boundary are
accepted.

Why: the captured ledger statement identity is exact, but the single run did
not reach the remaining structural or Edge Function gates.

Alternative: leave the exact temporary gate installed and recovery on HOLD.

Impact: no restoration runbook is ready and no restoration may execute.
