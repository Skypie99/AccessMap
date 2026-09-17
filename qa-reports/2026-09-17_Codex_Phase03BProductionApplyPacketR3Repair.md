# Phase 03B production apply packet R3 repair — 2026-09-17

## Four-blocker traceability matrix

| Blocker | Source | Review finding | Why R2 failed | Downstream HOLD fields | R3 acceptance condition | R3 repair | Candidate change required |
|---|---|---|---|---|---|---|---|
| R3-B1 | Independent review `fff266ba`, lines 13–18 and 63–69 | The row trigger did not fire for `TRUNCATE`; `postgres` retained an administrative path across the claimed whole-domain invariant. | R2 covered row DML but not PostgreSQL's distinct statement-level `TRUNCATE` event. | `R1_FINDING_1_ATOMIC_INVARIANT`, `QUIESCENCE_ENFORCEMENT`, `PRIMARY_STATE_INVARIANT`, `PRIMARY_INVARIANT_ATOMICITY`, `ENTRY_RECEIPT_DESIGN`, `PARTIAL_APPLY_FAILURE_MATRIX`, `WRITE_RESTORATION_VERIFICATION`, `TRANSIENT_BREAKAGE_RISK_AFTER_CORRECTED_PACKET` | A locally replayed, OID/owner/hash-pinned `BEFORE TRUNCATE FOR EACH STATEMENT` trigger is `ENABLE ALWAYS`, blocks `TRUNCATE ... CASCADE`, participates in entry/proof/monitor/exit, and is removed atomically with the row gate. | Keep the accepted row trigger and function identity name, extend the function's first branch to `TG_OP='TRUNCATE'`, add `aaa_flagstone_phase03b_truncate_quiescence_r3`, pin its OID/hash/enable state, and include both triggers in the one-transaction exit. | NO |
| R3-B2 | Independent review `fff266ba`, lines 20–24 and 79–87 | The 180-second boundary mixed database and host clocks, omitted child PID, weakly bound entry, and did not provide exact monitoring through post-apply. | R2 derived the deadline with `Date.now()` from a database timestamp and did not make the entry/proof/apply lifecycle one monotonic controller. | `R1_FINDING_3_TIMEOUT_POLICY`, `TOTAL_APPLY_TIMEOUT_POLICY`, `POST_APPLY_VERIFICATION_TIMEOUT_POLICY`, `MONITORING_CADENCE`, `PARTIAL_APPLY_FAILURE_MATRIX`, `ENTRY_RECEIPT_DESIGN`, `EVIDENCE_PACKAGE_R2` | One process starts a conservative monotonic clock before entry, bounds DB/host skew to 2 seconds, records every child/process-group PID, validates the full immediate post-commit proof, applies with 180-second entry-start budget, monitors every 5 seconds, uses `SIGINT`/10s/`SIGTERM`/10s/`SIGKILL`, and never treats local death as rollback. | `execute_apply_bounded.mjs` now owns entry, proof, apply, monitoring, timeout signals, 30-second unknown-state observation, and the 300-second verifier; 600 seconds is escalation-only. | NO |
| R3-B3 | Independent review `fff266ba`, lines 26–29, 71–77 and 96–100 | Full post-apply/restoration verification was prose, without a target-explicit runner, accepted final digest, comparator, schema, or bounded capture. | The compact exit guard was not a substitute for an executable full final-state comparison. | `POST_APPLY_VERIFICATION_WHILE_QUIESCED`, `WRITE_RESTORATION_VERIFICATION`, `PARTIAL_APPLY_FAILURE_MATRIX`, `EVIDENCE_PACKAGE_R2`, `TRANSIENT_BREAKAGE_RISK_AFTER_CORRECTED_PACKET` | A target-pinned read-only runner must prove exact +2 ledger, accepted full normalized structure excluding only the three exact temporary gate objects, authorization/semantic identities, Edge Function identity, HTTP baseline, both invariants, and gate identity inside 300 seconds; a separate post-exit runner must prove exact absence and the same accepted final structure. | Added `verify_post_apply.mjs`, `POST_EXIT_VERIFY.sql`, and `verify_post_exit.mjs`, bound to staging artifact `aca5fdb...`, catalog-query SHA-256 `7a88aa...`, accepted final structural SHA-256 `f1854953...`, final production ledger SHA-256 `b9fb3769...`, and production Edge identity SHA-256 `276dcb...`. | NO |
| R3-B4 | Independent review `fff266ba`, lines 31–34 and 102–106 | The committed 14-check JSON could not be regenerated from the committed validator, which emitted eight differently named checks. | Manifest integrity proved only that the JSON existed, not that the validator produced it. | `EVIDENCE_PACKAGE_R2` and the local gate-replay evidence supporting `QUIESCENCE_ENFORCEMENT` | The committed runner must generate the committed JSON directly and retain separate raw stdout, raw stderr, timestamps, numeric child exit, signal, PID, and monotonic duration; every asserted check must appear in stdout and JSON. | `run_local_validation.mjs` generated the checked-in JSON and raw streams. The receipt records exit `0`, PID `5176`, and 2,929 ms. The emitted 18 checks include `truncateBlocked`, exact constraint/index digest, executable post-exit proof, and every claimed entry/exit behavior. | NO |

All four source findings were taken from the detailed independent review, not its summary labels. The accepted R2 controls remain closed unless explicitly extended above.

## Verdict and authority

`PHASE03B_PRODUCTION_APPLY_PACKET_R3_REPAIR: PASS`

This is a non-applying operational-packet repair only. It authorizes no production or staging mutation, quiescence, lock, migration apply, function deployment, Vault/config/auth change, push, merge, release, recovery, or Phase 03C action.

- R2 packet: `3c9aa3b7cdb36a4bdfda5bdfcbb028371a9a691d`
- Independent R2 review: `fff266ba2ced85e912406622c53058ad9065ebb4`
- Frozen candidate/tree: `9d638456fa8e679678c54f131fe8f0db723eda72` / `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`
- Production target: `kldlwszpfkdmsjrjhjym`
- Forbidden staging target: `cepayqmsoqxshsiyqnvz`
- Migration SHA-256: `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11`, then `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`

R1 and R2 are `SUPERSEDED_NOT_APPLY_READY`. Their evidence is preserved unchanged.

## Atomic entry boundary

R3 selects ordering **C**: capture the primary and history invariants both before and after gate installation inside the same locked transaction.

1. Begin a normal read-write transaction with `lock_timeout='5s'` and `statement_timeout='30s'`.
2. Record the backend PID and entry start, prove executor/owner/baseline identity and reserved-object absence.
3. Acquire `LOCK TABLE public.flags IN SHARE ROW EXCLUSIVE MODE`. This conflicts with existing/new `ROW EXCLUSIVE` DML; acquisition is the exact point at which prior DML writers have drained.
4. While the lock remains held, capture pre-install ordered `public.flags(id,status)` count/SHA-256 and the corroborating history count/SHA-256.
5. Create the exact function, accepted row trigger, and new statement-level truncate trigger; make both `ENABLE ALWAYS`.
6. Verify function/trigger OIDs, owners, full normalized hashes, and enable states.
7. Re-capture both invariants and require exact pre/post equality.
8. Emit the complete entry receipt and commit. The successful commit is `QUIESCENCE_ENTRY_BOUNDARY`.
9. The same controller immediately runs `PROPOSED_QUIESCENCE_VERIFY.sql` in `transaction_read_only=on` and requires OID/hash/table/invariant/ledger/HTTP equality before apply can spawn.

No prohibited transaction can cross this boundary: the writer-draining lock is acquired before the first baseline; it is held through both trigger creation and the second baseline; the gates become durable at the same commit that releases the lock. Row DML then meets the `ENABLE ALWAYS` row trigger, while `TRUNCATE` meets the `ENABLE ALWAYS` statement trigger. An administrative session can drop/disable a gate, but monitoring and every pre-exit check pin exact OIDs/hashes/enable state and fail closed; the packet does not claim protection against an independently authorized superuser deliberately dismantling its controls.

The R3 entry receipt schema includes UTC boundary, backend PID, transaction ID, lock start/end/wait/mode, table OID, function OID/owner/grants/hash, both trigger OIDs/table OIDs/enable modes/hashes, pre/post primary and history invariants, ledger count/unique/latest/digest, and HTTP queue/count/fingerprint.

## Safety-object identity

- Function: `private.flagstone_phase03b_block_row_lifecycle_r2()`; `postgres`; `plpgsql`; `VOLATILE`; `SECURITY INVOKER`; empty search path; owner-only execution.
- R3 function SHA-256: `16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac`.
- Accepted row trigger: `aaa_flagstone_phase03b_row_lifecycle_quiescence_r2`; `ENABLE ALWAYS`; SHA-256 `e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf`.
- Added truncate trigger: `aaa_flagstone_phase03b_truncate_quiescence_r3`; `BEFORE TRUNCATE FOR EACH STATEMENT`; `ENABLE ALWAYS`; SHA-256 `54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a`.

The function hash changes only because detailed review proved that the accepted R2 function could not serve a statement-level truncate trigger. Candidate application and migration bytes remain unchanged.

## Executable timing and monitoring policy

- Entry/exit `lock_timeout`: 5 seconds; timeout rolls back that transaction. Apply does not start after entry failure.
- Entry/exit `statement_timeout`: 30 seconds per statement.
- Apply wall clock: 180 seconds measured conservatively from the controller's monotonic timestamp immediately before it spawns the entry command, not from a database timestamp. Entry time consumes the budget.
- Clock skew: database boundary time must fall within the local entry-command interval expanded by at most 2 seconds on either side. A mismatch is HOLD while the committed gate remains active.
- Apply PID evidence: `childPid` and detached `processGroupId` are recorded with command, target, workdir, monotonic/wall timestamps, stdout, stderr, exit, and signal.
- Timeout signals: `SIGINT`; after exactly 10 seconds `SIGTERM`; after another 10 seconds `SIGKILL` if still local.
- Server monitoring: exact target-explicit `MONITOR_READ_ONLY.sql` every 5 seconds across apply and post-apply verification. It captures privacy-safe backend state/waits/times, ledger state, and both gate OIDs/enable states. Overlapping/missed cadence is HOLD.
- Local timeout: CLI outcome becomes `UNKNOWN`; no retry; no exit. Monitoring continues for 30 seconds, then owner escalation is mandatory if any correlated backend may remain.
- Post-apply verification: 300 seconds. Timeout is HOLD; no automatic exit.
- Maximum quiescence: 600 seconds is an operator-escalation threshold only. There is no timer-driven trigger drop or write restoration.

The preserved inner command is exactly:

```text
supabase db push --workdir /tmp/flagstone-p03b-production-apply-9d638456 --linked --project-ref kldlwszpfkdmsjrjhjym --skip-vault --include-all --yes --output-format json
```

## Exact post-apply verification while quiesced

`verify_post_apply.mjs` is target-explicit and read-only. It requires:

1. ledger 87/87, latest `20260915210413`, exact versions `20260915210256` then `20260915210413`, exact final ledger digest `b9fb376947238c4bd3dc3d164337d6b9294df9084eab9008530ba9fd4d4603b5`, and no third Phase 03B version;
2. the published structural-catalog query SHA-256 `7a88aa...`;
3. exact accepted normalized final-state SHA-256 `f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7` from staging evidence commit `aca5fdb...` after excluding only the exact temporary function and two exact temporary triggers;
4. therefore exact public/private/storage/limiter relations, columns/defaults, grants, RLS/FORCE RLS, roles/memberships, policies, triggers, routines/bodies/config/owners/ACLs, plus a separately pinned digest `cdcf1cb1...` for every Phase 03B-created/changed constraint and index;
5. unchanged production Edge Function metadata identity SHA-256 `276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70`;
6. pg_net `0/6` and fingerprint `709e04c...`;
7. exact entry primary/history invariants;
8. exact temporary gate OIDs/owners/hashes/enable states.

Any mismatch or timeout is HOLD while quiescence remains active. No mutating production smoke test is required.

## Partial-apply failure matrix

In every state: automatic retry `NO`; rollback authorized `NO`; owner decision required `YES` except clean entry rollback still requires a new authorization before retry.

| State | Trigger condition | Expected ledger | Quiescence | CLI | Required read-only checks | Automatic action | May exit? |
|---|---|---|---|---|---|---|---|
| S1 | Entry lock timeout | 85, no Phase 03B | Transaction rolled back; no gate | Not started | gate absence; ledger/HTTP baseline | Record/escalate | NO |
| S2 | Entry transaction error/rollback | 85 | No committed gate | Not started | function/two-trigger absence; baseline | Record/escalate | NO |
| S3 | Gate committed; apply not started | 85 | Both gates active | Not started | complete entry/proof | Continue only inside unexpired authorized controller; otherwise escalate | Only exact verified exit with owner authority |
| S4 | CLI failure; migration 1 absent | 85 | Active | Failed/unknown | backends, 85 ledger, structure, gate, invariants, HTTP | Observe 30s/escalate | NO |
| S5 | Migration 1 present; migration 2 absent | 86, only `20260915210256` | Active | Failed/unknown | exact intermediate ledger/structure plus all gate/invariants/HTTP | Escalate | NO |
| S6 | Both rows present; CLI ambiguous | 87, exact pair | Active | Unknown | full post-apply verifier; backend state | Verify/escalate; never retry | Only after full PASS and owner-authorized exit |
| S7 | Both rows present; structural mismatch | 87 | Active | Any | normalized residual artifact plus all invariants/gate/HTTP | Escalate | NO |
| S8 | Primary/history invariant mismatch | Any | Active if identity exact | Any | exact counts/hashes and gate identity | Escalate | NO |
| S9 | HTTP mismatch | Any | Active | Any | queue/count/fingerprint and ledger/structure | Escalate | NO |
| S10 | Gate OID/owner/hash/enable/cardinality mismatch | Any | Compromised/unknown | Any | fresh catalogs; do not drop | Escalate | NO |
| S11 | Post-apply verifier exceeds 300s | 85/86/87 proven separately | Active | Apply may have exited | monitor, backend, ledger, structure, invariants, HTTP | Escalate | NO |
| S12 | Quiescence reaches 600s | Any | Remains active | Any | capture complete current state | Escalate only | NO |
| S13 | Exit transaction errors/rolls back | 87 expected | Both objects remain because drops are one transaction | Complete | gate identity/cardinality plus final state | Escalate | NO |
| S14 | One drop succeeds and another fails inside transaction | 87 | Transaction rollback restores both; no partial committed drop | Complete | prove both exact objects still present | Escalate | NO |
| S15 | Post-exit proof mismatch | 87 expected | Unknown until read | Complete | exact absence, structure, grants/RLS, ledger, HTTP, invariants, Edge identity | Escalate; never recreate automatically | NO |

## Write restoration

Before exit, reacquire `SHARE ROW EXCLUSIVE`, prove exact 87-row ledger/final structure/authorization/semantics/HTTP/invariants, and prove exact function plus both triggers by cardinality, OID, owner, hash, table, and `ENABLE ALWAYS` state. A mismatch does not drop anything.

One transaction drops the truncate trigger, row trigger, then function and commits only after exact absence inside the transaction. There is no state in which trigger-drop success/function-drop failure can commit separately.

After commit, `verify_post_exit.mjs` runs target-explicit read-only checks for exact gate absence, exact accepted final structural digest with no exclusions, final grants/RLS/triggers/functions, 87-row ledger/digest, HTTP baseline, Edge identity, and unchanged primary/history invariants. Failure is HOLD; no automatic gate recreation is authorized.

## User impact during quiescence

| Path | Classification | Client retry |
|---|---|---|
| Report creation / `public.flags` INSERT | `TEMPORARILY_FAILS_ATOMICALLY` | No automatic retry established |
| Flag/report deletion, including admin delete | `TEMPORARILY_FAILS_ATOMICALLY` | No |
| Verify / Resolve / Reopen / Reject / Restore | `TEMPORARILY_FAILS_ATOMICALLY` | No |
| Actual `id` change | `TEMPORARILY_FAILS_ATOMICALLY` | No |
| `TRUNCATE public.flags`, direct or cascaded | `TEMPORARILY_FAILS_ATOMICALLY` | Not applicable to clients |
| Unrelated-column flag update | `AVAILABLE` | Normal behavior |
| Reads, map/list loading | `READ_ONLY` / `AVAILABLE` | Normal read retry behavior only |
| Comments, votes, photos on existing flags, profile reads/updates | `AVAILABLE` | Normal behavior |
| Notifications/webhooks | `NOT_APPLICABLE` to this non-applying repair; future apply sends none by design | No packet retry |

## Evidence package R3

- `PRE-ENTRY`: authorization, candidate/tree, target, exact-two inventory/hashes, baseline ledger/structure/HTTP, reserved-object absence.
- `ENTRY`: exact SQL, local and DB timing, PID/xid, lock/table identity, function/two-trigger OIDs/owners/hashes/enables, both pre/post invariants, full receipt and SHA-256.
- `APPLY`: exact workspace manifest, CLI version/command, child/process group, monotonic deadline, separate stdout/stderr, numeric exit/signal, 5-second local/server samples, timeout state.
- `POST-APPLY WHILE QUIESCED`: exact ledger/structural/authorization/moderation/points/Edge/HTTP/invariant/gate comparator output and receipt.
- `EXIT`: generated receipt-bound SQL, pre-drop evidence, exact transaction output/exit.
- `POST-EXIT`: exact absence/full-structure/ledger/HTTP/invariant/Edge restoration comparator.
- `GLOBAL`: mutation inventory, privacy scan, artifact manifest, SHA-256 manifest, final receipt.

## Local self-check and gates

- R3-B1 source/repair/acceptance/evidence/no-candidate-change/no-production-mutation: PASS.
- R3-B2 source/repair/acceptance/evidence/no-candidate-change/no-production-mutation: PASS.
- R3-B3 source/repair/acceptance/evidence/no-candidate-change/no-production-mutation: PASS by executable design; no hosted execution was authorized.
- R3-B4 source/repair/acceptance/evidence/no-candidate-change/no-production-mutation: PASS.
- Disposable PostgreSQL 17 validation: exit `0`; 18/18 emitted checks true; raw stdout/stderr, PID, timestamps, monotonic duration, numeric exit retained; temporary cluster destroyed.
- `TRUNCATE ... CASCADE` adversarial test: blocked with the gate's `P0001` error.
- Frozen migrations: exact hashes; candidate diff: none.
- JavaScript syntax checks and manifest verification: recorded in the final receipt.
- Product typecheck/lint/Jest/build were not rerun because no product or migration byte changed.

Previously PASS R2 controls remain preserved: target/candidate identity, DML semantics, lock policy, function owner/security/search path/ACL, accepted row-trigger identity, unknown-state/no-retry policy, exact inner apply command, exact-two workspace, compatibility/authorization/photo-alt/admin/moderation/points conclusions, no mutating smoke test, and HTTP baseline.

## What changed

Only this QA report and the new R3 packet directory were added. R1/R2 artifacts, candidate migrations, application source, and all remote state remain unchanged.

## Branch + SHA

- Branch: `codex/flagstone-p03b-production-apply-packet-r3-20260917`
- Base: `3c9aa3b7cdb36a4bdfda5bdfcbb028371a9a691d`
- R3 packet evidence commit: recorded in the final owner receipt after the artifact commit is created.

## What's left

A genuinely fresh independent reviewer must inspect the exact R3 evidence commit. Even a PASS review would not authorize production apply; Sky must separately authorize a future target-specific executor.

## DECISIONS FOR SKY

- [ ] Commission a genuinely fresh independent R3 packet review.
  - Recommendation: review this exact evidence commit before considering any apply authorization.
  - Why: R3 is executable by design and locally replayed, but its production-facing runners have intentionally not been executed.
  - Alternative: leave production apply on HOLD.
  - Impact: no production behavior changes either way.

Governance: `CANDIDATE_BYTES_CHANGED: NO`; `PRODUCTION_MUTATIONS: NONE`; `STAGING_MUTATIONS: NONE`; `QUIESCENCE_ENTERED: NO`; `PRODUCTION_APPLY_EXECUTED: NO`; `PUSHES: NONE`; `MAIN_MERGES: NONE`; `CLIENT_RELEASE: NONE`; `ACCESSIBILITY_DEVICE_RESIDUAL: ACCEPTED_LATER_GATE`; `PHASE_03C_STARTED: NO`.
