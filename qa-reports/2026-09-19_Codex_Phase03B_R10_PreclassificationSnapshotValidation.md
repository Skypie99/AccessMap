# Flagstone Phase 03B R10 Pre-classification Snapshot Validation Repair

## Outcome

`HOLD`.

The authorized R10 code repair passes locally: every extracted server-state snapshot now returns `VALIDATED_R10` before entry classification, comparator dispatch, apply classification, or policy derivation. The full local replay passed 217 checks, including all 201 preserved R9 checks and 16/16 new R10 ordering cases. Invalid snapshots produced zero classifier calls, zero comparator calls, zero consumed results, and zero controller transitions.

The required live read-only reproduction was transaction-read-only and the canonical adjudicator exited 0, but the pinned six-row pg_net fingerprint changed from `709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8` to `db09cd0f61b4405a2540be7541b690df4fa52bd7697c98c1e7e88d37a3f99031`. The migration ledger still matched 85 rows and digest `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`. R10 therefore remains `NOT_READY` for independent review until the fingerprint drift is separately adjudicated.

No production or staging mutation, quiescence, gate creation, controller execution, migration apply, deploy, push, merge, release, or Phase 03C action occurred.

## What changed

- Added the append-only R10 packet under `qa-reports/phase03b/2026-09-19-production-apply-packet-r10/`.
- Added `validateServerStateSnapshot` and the `classifyValidatedServerState` boundary to enforce exact pre-classification validation.
- Routed the executable adjudicator through that boundary and removed its direct entry/apply classifier calls.
- Added 16 R10 validation-order regressions, call-graph evidence, raw-bypass audit, zero-call receipt, traceability, cleanup, privacy scans, and manifests.
- Added the read-only live evidence bundle under `qa-reports/phase03b/2026-09-19-production-apply-packet-r10-live-readonly-preflight/`.
- Did not change the candidate, either frozen migration, R9 artifacts, controller, SQL gates, restoration logic, or application code.

## Branch + SHA

- Branch: `codex/flagstone-p03b-r10-preclassification-validation-20260919`
- Base/source R9 packet: `28f54e37ae018ab33fe8326a556cd1209794e484`
- Independent R9 review: `097e5a6acbf8d78e54d94032b9b2d5edc90760eb`
- R10 packet evidence commit: `0ba40b4ff027e043edf441ea24fe2be1eae5f9bc`
- Candidate: `9d638456fa8e679678c54f131fe8f0db723eda72`
- Candidate tree: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`

## Gates

### Focused R10 controls

Command: `node qa-reports/phase03b/2026-09-19-production-apply-packet-r10/validate_r8_controls.mjs`

Result: exit 0; `PASS`; R10 validation-order cases 16/16; invalid snapshot classifier/comparator/consumed-result/controller-transition counts all 0; disposable temp root destroyed.

### Full preserved packet replay

Command: `node qa-reports/phase03b/2026-09-19-production-apply-packet-r10/run_local_validation.mjs`

Result: exit 0; `PASS`; 217 local checks; 201 preserved R9 checks; 182 preserved R8 checks; 172 preserved source-R7 checks; child exits `[0,0,0,0]`; validation infrastructure destroyed `true`.

### Live read-only reproduction

Command: R10 `adjudicate_server_state.mjs` with a new evidence directory, receipt-free run context, and target-pinned Supabase CLI query.

Result: executable exit 0; `transaction_read_only=on`; target `kldlwszpfkdmsjrjhjym`; ledger 85/85 with exact pinned digest; no Phase 03B rows; queue 0; six pg_net responses; no candidate backend; gate absent; entry confirmed not committed; apply not started. Overall preflight `HOLD` because the six-row pg_net digest drifted from the pinned fingerprint.

### Freeze, privacy, and artifact integrity

- Both migration SHA-256 values matched the frozen hashes; exactly two top-level Phase 03B SQL migrations; candidate diff exit 0.
- R10 packet privacy scan: `PASS`, 58 files scanned, 0 findings.
- Live evidence privacy scan: `PASS`, 4 files scanned, 0 findings.
- Packet artifact manifest: 59 artifacts, all hash checks `OK`.
- Live evidence manifest: 5 artifacts, all hash checks `OK`.
- `git diff --cached --check`: exit 0.

TypeScript remains a non-blocking environment limitation. The executable R10 path is Node `.mjs` plus SQL and does not import the unrelated TypeScript application surface; no dependency install was performed.

## What's left

- Separately adjudicate the changed production pg_net fingerprint without mutation.
- If that independent provenance check accepts the current fingerprint, regenerate or explicitly re-freeze the live baseline under separate owner authority, then rerun the R10 read-only preflight.
- Only after the live preflight passes should a genuinely fresh reviewer inspect the exact R10 packet commit.

## DECISIONS FOR SKY

- **Decision:** Whether to authorize a separate read-only production pg_net fingerprint-provenance adjudication for observed digest `db09cd0f61b4405a2540be7541b690df4fa52bd7697c98c1e7e88d37a3f99031`.
  - **Recommendation:** Authorize that narrow read-only adjudication; do not authorize baseline replacement, production apply, or any mutation yet.
  - **Why:** The R10 code repair is locally complete, but the pinned six-row production safety fingerprint no longer matches current read-only evidence.
  - **Alternative:** Keep R10 on HOLD with no further action.
  - **Impact:** Until the drift is explained and a fresh read-only preflight passes, `PHASE03B_R10_PACKET_INDEPENDENT_REVIEW` remains `NOT_READY` and production apply remains unauthorized.
