# FDA-028 hosted-harness repair proposal

**Status:** PROPOSED — NOT AUTHORIZED FOR IMPLEMENTATION

**Scope:** test harness and evidence path only

**Accepted limiter migration:** preserve byte-for-byte unless the repaired harness independently exposes an implementation defect

## Problem

The fresh-stage limiter behavior has named hosted evidence, including a 25-way concurrency run with no overshoot. The broader committed acceptance suite cannot reproduce a hosted run against the conforming schema and configuration:

1. `supabase/tests/fda028/acceptance3.sql:13` and 23 later calls use `ramp`; the real `public.flags` constraint requires a canonical category such as `no_ramp`.
2. `supabase/tests/fda028/acceptance3.sql:49` assumes a 600-second purge horizon while accepted staging uses `window_seconds = 86400`.
3. `supabase/tests/fda028/acceptance3.sql:71` updates `limiter.dev_key_material`, which exists only in `supabase/tests/fda028/fixture.sql` and is deliberately absent hosted.
4. `supabase/tests/fda028/acceptance3.sql:4` creates a helper before any rollback boundary, and no committed hosted runner guarantees rollback and residue verification.
5. `scripts/run-pgtap.mjs:73` executes only suites classified as `pgtap`; `acceptance3.sql` is classified as `raising-proof` and has no hosted execution lane.

## Smallest repair

Add one separate hosted FDA-028 suite and one target-explicit runner. Keep the existing local fixture suite for local-only failure modes.

### Hosted suite

- Use only categories accepted by the real `public.flags` constraint.
- Derive lifecycle timing from the active limiter configuration, or set a temporary test configuration only after draining the test ledger inside the rollback transaction.
- Omit `limiter.dev_key_material`. Keep that failure-mode proof explicitly local.
- Test the hosted Vault contract by byte length and behavior only. Never select, print, copy, or persist key material.
- Put helper creation, configuration changes, admissions, deletes, and cleanup in one transaction that ends in `ROLLBACK`.
- Include explicit plan accounting and a deliberate negative control whose failure must be detected by the runner.

### Hosted runner

- Require explicit `--project-ref` and `--branch-id` arguments, each exactly one token.
- Refuse the production ref, the old staging ref, default branches, mismatched parentage, unhealthy branches, and any branch whose identity cannot be proven.
- Refuse implicit or linked targets. Do not consult `supabase/.temp/linked-project.json` for target selection.
- Pin accepted CODE/INT identities, candidate hashes, and the pre-run migration-ledger identity before opening the test connection.
- Use one database connection so an assertion error or process exit closes and rolls back the transaction.
- Stream raw TAP, verify plan/ok/not-ok totals, prove the negative control fired, and fail on any unexpected diagnostic.
- Run a separate read-only post-check for zero flags, buckets, grants, helper functions, configuration drift, and queued HTTP residue.
- Bank a sanitized receipt with target identity, source hashes, ledger identity, assertion totals, negative-control result, rollback result, and residue counts.

## Acceptance sequence

1. Implement the two test-only files on a new Phase 03A CODE branch from the accepted lineage.
2. Run local discovery and isolated local tests; do not point the hosted runner at any remote target.
3. Obtain independent CODE review of the repair and target-safety refusals.
4. Bank a fresh pre-operation checkpoint.
5. Obtain separate authorization for one disposable fresh-staging mutation run.
6. Execute once, verify rollback and zero residue, and independently review the new receipt.

## Explicit exclusions

- No limiter migration or rollback change.
- No migration-ledger change.
- No production or old-staging contact.
- No Vault value disclosure or production secret/config work.
- No closing the MF-05 guest bypass.
- No Phase 03B work.

## Exit criteria

The repair is complete only when a reviewer can reproduce the hosted acceptance from committed files against an explicitly verified disposable branch, with raw assertion evidence, negative controls, rollback proof, and zero residue. Until then:

```text
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: HOLD
PHASE_03A_FRESH_STAGE_GATE: HOLD
```
