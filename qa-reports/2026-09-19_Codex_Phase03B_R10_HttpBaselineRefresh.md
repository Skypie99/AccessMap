# Flagstone Phase 03B R10 HTTP Baseline Refresh — 2026-09-19

## DECISIONS FOR SKY

- [ ] **Authorize a separate read-only pg_net provenance adjudication for `14d0...8dfd`** — the newly observed three-row HTTP response state is not accepted by this packet.
  - **Recommendation:** Authorize only a new, exact, read-only provenance adjudication for fingerprint `14d0617d38d7625f9470ed931c4c7e849bba5d9472bc8e39983dd1a359118dfd` and response count `3`.
  - **Why:** The owner-accepted `db09...9031` six-row baseline was correctly pinned from provenance commit `64ee3b24e270a590656590e55312a1dd7326ab88`, but the fresh read-only rerun observed a different row count and fingerprint. The cause of that later drift is not adjudicated here.
  - **Alternative:** Keep R10 on HOLD and perform no further action.
  - **Impact:** Until separately adjudicated and followed by a passing fresh read-only preflight, independent review is `NOT_READY` and production apply remains unauthorized.

## Outcome

`HOLD`.

The owner-supplied `CURRENT_ACCEPTED_HTTP_FINGERPRINT` and `PG_NET_PROVENANCE_EVIDENCE_COMMIT` were applied only to an append-only R10 continuation packet. The complete hermetic local replay passed 217 checks. The fresh target-pinned production query was transaction-read-only and confirmed no gate, no Phase 03B migration rows, no candidate backend, no apply, and an empty HTTP queue, but the HTTP response state had changed from the accepted count `6` / `db09...9031` fingerprint to count `3` / `14d0...8dfd`. No retry or repin was attempted.

No production or staging mutation, quiescence, gate creation, controller execution, migration apply, deploy, push, merge, release, or Phase 03C action occurred.

## What changed

- Added append-only continuation packet `qa-reports/phase03b/2026-09-19-production-apply-packet-r10-http-baseline-refresh/`.
- Pinned the owner-accepted six-row HTTP baseline and provenance commit within that continuation only.
- Replayed the complete R10 local validation suite against the refreshed baseline.
- Added append-only live evidence at `qa-reports/phase03b/2026-09-19-production-apply-packet-r10-http-baseline-refresh-live-readonly-preflight/`.
- Recorded the later count-and-fingerprint drift as `HOLD / NOT_READY` without changing the accepted baseline.
- Preserved the original R10 packet, original live HOLD evidence, candidate, and both frozen migration files unchanged.

## Branch + SHA

- Branch: `codex/flagstone-p03b-r10-preclassification-validation-20260919`
- R10 HTTP refresh evidence commit: `41184103505ae2af44cc2a506b7f485a19846f81`
- pg_net provenance evidence commit: `64ee3b24e270a590656590e55312a1dd7326ab88`
- Original R10 evidence commit: `0ba40b4ff027e043edf441ea24fe2be1eae5f9bc`
- Source R9 packet: `28f54e37ae018ab33fe8326a556cd1209794e484`
- Independent R9 review: `097e5a6acbf8d78e54d94032b9b2d5edc90760eb`
- Candidate: `9d638456fa8e679678c54f131fe8f0db723eda72`
- Candidate tree: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`

## Gates

### Complete local replay

Command: `node qa-reports/phase03b/2026-09-19-production-apply-packet-r10-http-baseline-refresh/run_local_validation.mjs`

Result: exit `0`; `PASS`; 217 total checks; 201 preserved R9 checks; 182 preserved R8 checks; 172 preserved R7 checks; preserved branch suites 30/30 and 40/40; R8 validator 35/35; R8 schema 10/10; R9 transport 19/19; R10 validation order 16/16; child exits `[0,0,0,0]`; disposable validation infrastructure destroyed.

Invalid-snapshot metrics: classifier calls `0`; comparator calls `0`; consumed results `0`; controller transitions `0`.

### Fresh live read-only preflight

Command: R10 `adjudicate_server_state.mjs` with a new run ID, receipt-free context, target pin `kldlwszpfkdmsjrjhjym`, and no apply-spawned flag.

Result: executable exit `0`; signal `null`; timeout `false`; `transaction_read_only=on`; ledger `85/85` with digest `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`; Phase 03B versions `[]`; candidate backends `0`; HTTP queue `0`; HTTP responses `3`; gate `GATE_ABSENT`; entry `ENTRY_CONFIRMED_NOT_COMMITTED`; apply `APPLY_NOT_STARTED`. Overall result `HOLD` because count `3` and fingerprint `14d0617d38d7625f9470ed931c4c7e849bba5d9472bc8e39983dd1a359118dfd` did not match the accepted six-row `db09...9031` baseline.

### Freeze, privacy, and integrity

- Exact two migration files present; SHA-256 values remained `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11` and `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`.
- Candidate migration diff: exit `0`.
- Continuation packet privacy scan: `PASS`; 60 files scanned; 0 findings.
- Live evidence privacy scan: `PASS`; 4 files scanned; 0 findings.
- Continuation manifest: 61 artifacts; every `shasum -a 256 -c` entry `OK`.
- Live evidence manifest: 5 artifacts; every `shasum -a 256 -c` entry `OK`.
- `git diff --check HEAD^ HEAD`: exit `0`.

## What's left

- The newly observed count `3` / `14d0...8dfd` state requires separate provenance adjudication before it can be accepted.
- Do not replace the baseline, retry the live preflight, enter quiescence, or apply production changes under this packet.
- A genuinely fresh independent R10 review remains deferred until a fresh live preflight passes.

## Process self-check

- **Efficiency:** Reused the independently captured provenance commit and original R10 packet; did not reopen the repaired R10 code path or historical artifacts.
- **Overlap:** The provenance work at `64ee3b2` was consumed as evidence, not repeated. This continuation records only the owner-authorized baseline refresh, local replay, and one fresh read-only preflight.
- **Simplification:** A silent repin to the newly observed fingerprint would be shorter, but would discard provenance and fail-open on production drift. The packet instead stops at HOLD.

## Next recommended action

Authorize only a separate read-only pg_net provenance adjudication for the observed three-row `14d0...8dfd` state, or leave R10 on HOLD.
