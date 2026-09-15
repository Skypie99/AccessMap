# Codex Phase 03A Takeover Report — 2026-09-14

## 1. DECISIONS FOR SKY

- [ ] **Authorize one bounded FDA-028 hosted-harness CODE repair** — the implementation evidence passes, but the committed hosted acceptance harness is not reproducible.
  - Option A (Recommended) — authorize only the test suite and explicit hosted runner described in `qa-reports/phase03a/2026-09-14-takeover/FDA028_HOSTED_HARNESS_REPAIR_PROPOSAL.md`; preserve limiter migration bytes.
  - Option B — defer the repair and keep Phase 03A on HOLD.
  - **Why deferred:** this is the next source-writing unit, and the takeover brief requires a stop before source mutation without governing authorization.
  - **Owner:** Sky.

- [ ] **Carry MF-05 into the later production decision** — staging remains `S3_LIMITER_PRESENT_BYPASS_OPEN` for Build 33 compatibility.
  - Option A (Recommended) — keep the legacy guest bypass until a separately accepted ingest path and compatible clients exist.
  - Option B — plan a coordinated Stage B cutover later.
  - **Impact:** no production packet is ready while the FDA-028 evidence gate is held.

## 2. BLOCKERS / FAIL_FAST

- **BLOCKER — FDA028-HOSTED-HARNESS-REPRODUCIBILITY** — the committed suite uses an invalid hosted category, assumes a 600-second purge horizon, depends on a fixture-only key table, and has no rollback-enforced hosted runner.
  - **Quarantined?** Yes. The defect is limited to the test/evidence path; the accepted limiter migration was not changed.
  - **Recommended path:** authorize the bounded harness-only repair proposal, then independently review it before any new disposable-staging run.

## 3. Summary

The Claude-to-Codex takeover reconciled Git, the checkpoint history, the fresh and old staging branches, and the interrupted independent reviewer. The fresh branch remains healthy at a 103-row forward-only ledger, and production remains at its 71-row baseline with no Phase 03A ledger or principal objects. Independent Step 13 review returns HOLD solely because the committed FDA-028 hosted harness cannot reproduce the broader hosted acceptance claim.

## 4. What Changed

- `e630fa2` — banked the read-only takeover reconciliation before resuming the long-running independent review.
- `0c9b876` — banked the resumed independent fresh-stage review and its HOLD verdict.
- Added a bounded test-harness repair proposal and final takeover result; no implementation file changed.

**Branch:** `codex/flagstone-p03a-takeover-20260914`

**Base:** `9a0af4c88b5b00898e405992cfd44ba7dfd689fc` (verified Step 12 integration)

**Latest committed checkpoint before this report:** `0c9b876f9758c6cf7c6e94b0ca019fffea1a9c55`

## 5. What's Proposed (Not Applied)

| Proposal | File | Impact | Applied? |
|---|---|---|---|
| FDA-028 hosted-harness repair | `qa-reports/phase03a/2026-09-14-takeover/FDA028_HOSTED_HARNESS_REPAIR_PROPOSAL.md` | Adds a schema-valid, config-aware, rollback-enforced hosted suite and target-explicit runner | No |

## 6. Findings by Domain

### Data / Schema

- Fresh staging `cepayqmsoqxshsiyqnvz` is `ACTIVE_HEALTHY`, `with_data=false`, with 103 migration rows, the limiter schema, one Vault row, and zero app rows.
- Old staging remains at 82 rows, max version `20260910162409`.
- Production remains at 71 rows, max version `20260830130000`, with no Phase 03A ledger rows, limiter schema, or Stage A RPCs.
- FIRST_APPLY and REAPPLY_CLEAN share catalog checksum `1cb772c877a25b87f5e1870301e974a5d23e938e9ed412d2a57b8d9fa3dd45d3`; their diff has zero residuals.

### Security / Evidence

- `FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PASS`, bounded to the named probes and recorded concurrency run.
- `FDA028_HOSTED_HARNESS_REPRODUCIBILITY: HOLD` is the sole fresh-stage blocker.
- `supabase/.temp/linked-project.json` is tracked and names production. Reviewed Phase 03A runners require explicit targets and passed their target-safety checks, but the tracked link remains a hazard for broader CLI workflows.
- No real credential material was found or printed.

### Compatibility

- Authenticated Build 33: PASS.
- Anonymous Build 33: PASS. Stage A establishes the tested guest posture from canonical source; this does not prove preservation of production's out-of-band anon posture.
- Hosted composed pgTAP: 254/254 PASS, zero failures.
- MF-04: CLOSED_FOR_STAGE. Production still needs a production-scoped endpoint prerequisite before activation.
- MF-05: OPEN_ROLLOUT_DECISION; rollout stage remains `S3_LIMITER_PRESENT_BYPASS_OPEN`.

## 6.5 Process Self-Check

### Efficiency Check

The takeover preserved Steps 1–12 and the interrupted reviewer transcript. It did not repeat the canonical apply, Vault provisioning, concurrency test, restoration/reapply, or other completed hosted mutation.

### Overlap Check

One prior independent reviewer had partially completed Step 13 before its session limit. The resumed reviewer used that transcript and continued from the first unfinished domain rather than discarding its work.

### Simplification Opportunities

The proposed repair adds a separate hosted lane instead of editing the local fixture suite until it passes. This keeps local-only failure proofs intact and gives the hosted claim a clear target and rollback contract.

## 7. Gates

| Check | Result |
|---|---|
| Git main/origin identity | `70b52a30`, tree `847f39f`, divergence `0/0` |
| Accepted CODE / INT trees | exact match; both ancestors of frozen Step 12 |
| Remote Phase 03A branches | none |
| Current operation scan | no `RUNNING`, `APPLIED_NOT_VERIFIED`, or `OUTCOME_UNKNOWN` records |
| Fresh staging ledger | 103 rows; live ordered digest matches committed capture |
| Old staging ledger | 82 rows; unchanged historical maximum |
| Production boundary | 71 rows; no Phase 03A ledger or principal objects |
| Receipt SHA-256 verification | all checkpointed hashes match |
| Independent review | HOLD solely on committed FDA-028 hosted-harness reproducibility |
| Documentation validation | JSON parse and `git diff --check` PASS |

No app build or full Jest run was needed because this takeover changed documentation and receipts only.

## 8. What's Left

- Source implementation of the FDA-028 hosted harness is not authorized and was not started.
- A new disposable-staging test run requires a repaired, independently accepted harness plus a fresh authorization and checkpoint.
- Production packet remains `NOT_READY`; no Phase 03B work may begin.

## 9. Next Recommended Action

Sky decides whether to authorize the single bounded FDA-028 hosted-harness CODE repair. Phase 03A remains on HOLD until that repair is independently accepted and reproducibly passes on an explicitly verified disposable branch.
