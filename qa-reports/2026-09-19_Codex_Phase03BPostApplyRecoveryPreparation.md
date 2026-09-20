# Phase 03B post-apply recovery preparation

## Outcome

`PHASE03B_POST_APPLY_RECOVERY_PREPARATION: HOLD`

The concrete CLI transport defect is repaired and locally verified. The new read-only production post-apply check accepted the live rows wrapper, then stopped fail-closed on a separate migration-ledger identity mismatch before structural capture. No restoration runbook was prepared or executed.

## What changed

- `qa-reports/phase03b/2026-09-19-production-apply-packet-r11/verify_post_apply.mjs`: removed the weak local parser/extractor and reused the strict canonical `parseCliJson` and `resultRow` helpers.
- `qa-reports/phase03b/2026-09-19-production-apply-packet-r11/verify_post_exit.mjs`: removed the same weak local parser/extractor and reused the same canonical helpers for proof and catalog transport.
- Added `validate_post_apply_recovery_transport.mjs` with 13 focused transport/schema/freeze regressions.
- Added `run_post_apply_recovery_local_validation.mjs` to preserve focused and existing R11 child results with numeric exits.
- Preserved immutable incident inputs, local validation outputs, and the one new read-only production verification under `qa-reports/phase03b/2026-09-19-post-apply-recovery-evidence/`.
- Updated the required current recovery handoff and state files.

No candidate migration, envelope schema, controller, adjudicator, SQL gate, product schema, or production object was changed.

## Root-cause confirmation

1. `verify_post_apply.mjs` used `payload.rows?.[0]?.[key] ?? payload[key] ?? payload`, which returns a whole array for the valid one-row array transport.
2. Retained production output is exactly a one-row array containing `phase03b_quiescence_proof_r3`.
3. `r8_control_lib.mjs` already accepts the exact array and exact rows-wrapper transports, enforces one row, and rejects missing/extra keys and ambiguous shapes.
4. The original comparator created only its bound proof SQL plus proof stdout/stderr. It created no structural SQL or normalized structure artifact, and strict envelope construction rejected `observed.proof` because it was an array.
5. The later `structureExact: false` / `LEDGER_STRUCTURE_DISAGREE` classification therefore reflects the failed comparator result, not an independently completed structural comparison.
6. `verify_post_exit.mjs` duplicated the same weak fallback and was repaired in the same bounded change. The controller and server adjudicator already used the strict canonical helper and required no repair.

## Local gates

- `node --check` passed for both repaired verifiers and both new validation scripts.
- Recovery transport regressions: `13/13` PASS.
- Preserved transport regressions: `22/22` PASS.
- Preserved history fail-closed regressions: `22/22` PASS.
- Preserved R11 controls: PASS.
- Disposable PostgreSQL gate replay: PASS.
- Numeric child exits: `[0, 0, 0, 0, 0]`.
- Validation infrastructure destroyed: `true`.
- `git diff --check`: PASS.
- Strict schema SHA-256 remained `0fe78b2a306fba77d1741fa57eb2591dba2762dfdc53e4d9f00e81d84dead517`.
- Candidate migration SHA-256 values remained `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11` and `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`.
- Evidence privacy scans: PASS with zero findings.

## Live read-only verification

Command class: exact target `kldlwszpfkdmsjrjhjym`, original `ENTRY_RECEIPT.json`, original database T0, corrected post-apply verifier, and a new evidence directory. The verifier's database queries use explicit read-only transactions. No controller, apply, exit, restoration, rollback, migration repair, or `db pull` command ran.

Observed:

- Transport: exact one-row `boundary` / `rows` / `warning` wrapper accepted by the canonical helper.
- `transaction_read_only`: `on`.
- Ledger count/latest: `87` / `20260915210413`.
- Phase 03B versions: `[20260915210256, 20260915210413]`.
- Gate: one exact function, one exact row trigger, one exact truncate trigger, both trigger enable states `A`.
- HTTP queue: `0`.
- New pg_net responses since original T0: `0`.
- pg_net TTL: `6 hours` (`21600` seconds).
- Comparator: `HOLD`, numeric exit `1`.
- Hold reason: `Applied migration statement bytes do not match the frozen pair`.
- Live ledger representation: `68` and `23` statements, with hashes of the first stored statement.
- Frozen verifier contract: one whole-file statement and the two frozen migration file hashes.
- Structural capture: not reached; normalized structure digest remains `null`.

This result does not prove a production structure mismatch. It also does not satisfy the required `PASS_WHILE_QUIESCED`, so restoration preparation is prohibited by the prompt.

## Branch and commits

- Branch: `codex/flagstone-p03b-post-apply-recovery-20260919`
- Worktree: `/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919`
- Recovery repair commit: `f374e17db673fe755ca197bdd110c1d7bd01a9e7`
- Base: `6afe2e56c820c46e4729b125284c2fed2ffa9078`
- No push or merge performed.

## What's left

- The live migration-ledger statement representation must be reconciled with a separately authorized exact identity contract before a corrected post-apply verifier can reach structural capture.
- Because live verification did not pass, no restoration runbook exists and narrow recovery independent review is not ready.
- Production remains intentionally fail-closed with the exact temporary gate present.

## Required status

```text
PHASE03B_POST_APPLY_RECOVERY_PREPARATION: HOLD
ROOT_CAUSE_CONFIRMED: YES
POST_APPLY_ARRAY_WRAPPER_BUG: CONFIRMED
POST_EXIT_SAME_BUG_PRESENT: YES
CANONICAL_RESULT_ROW_REUSED: YES
STRICT_SCHEMA_WEAKENED: NO
RECOVERY_TRANSPORT_TESTS: 13/13
CANDIDATE_BYTES_CHANGED: NO
LIVE_CORRECTED_POST_APPLY_VERIFICATION: HOLD
LIVE_LEDGER_COUNT: 87
LIVE_PHASE03B_VERSIONS: [20260915210256, 20260915210413]
LIVE_GATE_STATE: EXACT_PRESENT
LIVE_HTTP_QUEUE_COUNT: 0
LIVE_NEW_HTTP_RESPONSES_SINCE_ORIGINAL_T0: 0
PRODUCTION_MUTATIONS_DURING_RECOVERY_PREPARATION: NONE
MIGRATION_APPLY_RETRIED: NO
ORIGINAL_ONE_RUN_AUTHORIZATION_STATUS: CONSUMED
RECOVERY_RESTORATION_RUNBOOK: NOT_READY
RECOVERY_RESTORATION_EXECUTED: NO
PHASE_03C_STARTED: NO
RECOVERY_REPAIR_COMMIT: f374e17db673fe755ca197bdd110c1d7bd01a9e7
RECOVERY_RUNBOOK_PATH: NONE
RECOVERY_EVIDENCE_PATH: qa-reports/phase03b/2026-09-19-post-apply-recovery-evidence
NARROW_RECOVERY_INDEPENDENT_REVIEW: NOT_READY
NEXT_SAFE_ACTION: Sky decides whether to authorize a separate bounded correction of the verifier's migration-ledger statement identity contract; until then keep the exact gate present and do not prepare restoration.
```

## DECISIONS FOR SKY

Decision: whether to authorize a separate, narrow local-only repair of the `phase03b_rows` migration-ledger identity contract.

Recommendation: authorize that bounded repair and a fresh narrow independent review without changing the strict envelope schema, candidate migrations, temporary gate, database, or production state. The current query measures Supabase's split-statement ledger representation, while the verifier compares it to whole-file migration identity.

Alternative: leave the verifier unchanged.

Impact: with the alternative, the fail-closed gate remains installed and no restoration runbook can be prepared.
