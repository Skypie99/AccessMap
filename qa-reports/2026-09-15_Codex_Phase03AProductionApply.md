# Flagstone Phase 03A production apply and closure

## What changed

The exact 14-file Stage A production plan was applied once to Supabase project `kldlwszpfkdmsjrjhjym` from repair source `22e1db5aa7e58d7129551cb1325f921b37f95105` / tree `657f1b6ce01d3fdbb27102b5aa33616c918feade`, using the target-explicit guarded workspace and `--skip-vault`. No migration source, application source, Vault value, configuration value, client, webhook, or release artifact was changed in this operation branch after that repair source. This session added production operation, verification, independent-review, and closure evidence under `qa-reports/phase03a/2026-09-15-production-apply/`.

The production ledger moved from 71 to 85 rows. All 14 authorized versions appear exactly once in the approved order. Stage B, recovery files, seeds, and roles were excluded. The isolated workspace and apply worktree were destroyed after use; the provenance branch remains.

## Branch and evidence identities

- Branch: `codex/flagstone-p03a-takeover-20260914`
- Repair source: `22e1db5aa7e58d7129551cb1325f921b37f95105`
- Repair tree: `657f1b6ce01d3fdbb27102b5aa33616c918feade`
- Accepted dry-run evidence: `c9c3ece64d30bc6154521bc3c8d9812754fa673b`
- Production apply receipt: `527c56e`
- Production verification: `81ad38d`
- Frozen evidence: `17dfe0c076817ac519ab0afea0962192b7499b22`
- Frozen evidence tree: `56807dc4cff6b1617906c024e25a3f2731a506e5`
- Independent review SHA-256: `5a7ffe32a80fda5fef7743018cdc37fd936f6fcd7ab2f4f6ce1232c0dedc32e6`

No push or main merge was performed.

## Gates

| Gate | Result |
|---|---|
| Target, source, tree, plan, and pre-ledger reconciliation | PASS |
| Exact target-explicit production apply | PASS; one attempt, exit 0 |
| Canonical production ledger | PASS; 71 to 85, digest `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec` |
| Structural catalog reconciliation | PASS within comparator scope |
| MF-03 / MF-04 shape prerequisites | SATISFIED / SATISFIED |
| Approved limiter policy | PASS: `5 / 50 / 86400 / 32 / 64 / 1 / 7 / 32` |
| Build 33 production compatibility | PASS within the recorded no-invocation boundary |
| FDA-028 production contract | PASS within the accepted S3 rollout boundary |
| Forward-recovery verification | PASS; 24 artifacts, all hashes and unused versions verified |
| Typecheck | PASS |
| Lint | PASS; 0 errors, 91 inherited warnings |
| Contract and schema snapshot | PASS |
| Canonical plan and verification | PASS |
| Rollback/forward-recovery verifier | PASS; local-only |
| Release verifier | PASS; optional live remote check skipped by the verifier |
| FDA-028 hosted-harness unit suite | PASS; 20/20 |
| Focused Jest guards | PASS; 234/234 across 11 suites |
| Credential guard | PASS; 10/10 |
| Git diff check | PASS |
| Independent production acceptance | PASS; all 72 frozen artifact hashes matched |

## What's left

Phase 03A is ready to close at the owner-approved Stage A boundary. FDA-012's managed `supabase_admin` defaults, FDA-026's Stage B client cutover, FDA-028's legacy guest bypass, and end-to-end IPv6 transport proof remain explicitly carried forward. Prepared recovery remains unexecuted. Main merge, push, deployment, release, Stage B, and Phase 03B remain unstarted.

The immediate pre-apply aggregate values were observed and equal the post-apply values, but their original immediate raw wrapper was not retained. Earlier and post-apply raw captures corroborate the values. The first post-apply verifier failed in a read-only transaction with `22P02` because of a text-to-`bytea` digest cast; a retained corrected read-only query completed successfully. The failed error wrapper was not retained.

## DECISIONS FOR SKY

**Decision:** whether to authorize the exact main-merge packet that follows this closure checkpoint.

**Recommendation:** review the packet's exact candidate commit, base identity, full changed-file inventory, and carried residuals before giving a new merge token. The production gate is PASS, but the branch contains a broad accumulated program history relative to current `main`, so the Git integration deserves a separate explicit decision.

**Alternative:** hold the merge and request a narrower integration candidate. Production remains in the verified Stage A state either way; no database rollback or additional production action is implied.
