# Flagstone Phase 03A — final closure receipt

```text
PROMPT_ID: FLAGSTONE-P03A-PRODUCTION-APPLY-VERIFY-20260914-R1
TARGET_PROJECT: kldlwszpfkdmsjrjhjym
AUTHORIZED_REPAIR_SOURCE: 22e1db5aa7e58d7129551cb1325f921b37f95105
AUTHORIZED_REPAIR_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
FROZEN_PRODUCTION_EVIDENCE_COMMIT: 17dfe0c076817ac519ab0afea0962192b7499b22
FROZEN_PRODUCTION_EVIDENCE_TREE: 56807dc4cff6b1617906c024e25a3f2731a506e5
INDEPENDENT_REVIEW_SHA256: 5a7ffe32a80fda5fef7743018cdc37fd936f6fcd7ab2f4f6ce1232c0dedc32e6

PRODUCTION_APPLY: PASS
INDEPENDENT_PRODUCTION_REVIEW: PASS
PHASE_03A_PRODUCTION_GATE: PASS
PHASE_03A_CLOSURE: READY
STAGE_B_INCLUDED: NO
MF05_ROLLOUT_STATE: S3_LIMITER_PRESENT_BYPASS_OPEN
PUSHES: NONE
MAIN_MERGES: NONE
PHASE_03B_STARTED: NO
MAIN_MERGE_AUTHORIZED: NO
```

## Closure basis

The one owner-authorized Stage A production apply completed against the exact target and exact 14-file plan. The canonical production ledger moved from 71 to 85 rows, with the authorized versions present exactly once and Stage B and recovery versions absent. The sanitized post-apply production structure reconciles to the independently accepted fresh-stage Stage A structure after removing only the seven documented inherited production backup relations and their 48 columns.

MF-03 and MF-04 remain shape-valid without exposing their values. The limiter policy is exactly `5 / 50 / 86400 / 32 / 64 / 1 / 7 / 32`. Build 33 compatibility, the FDA-028 object/grant contract, notification metadata, zero limiter spend rows, zero queued HTTP rows, local gates, the credential gate, and forward-recovery readiness all pass within the recorded limits. One independent reviewer recomputed all 72 frozen artifact hashes and returned PASS without contacting a hosted target.

## Finding disposition

| Finding | Closure state | Evidence and boundary |
|---|---|---|
| FDA-009 | **CLOSED** | The overlapping `flags_user_scoped` policy is absent and the accepted Stage A flag policy set is installed. |
| FDA-010 | **CLOSED** | Client and PUBLIC execution is revoked from the six reviewed trigger functions while accepted callable contracts remain. |
| FDA-012 | **OPEN — PLATFORM DEFAULT-PRIVILEGE RESIDUAL** | The Stage A client/effective-privilege narrowing is installed and verified. Defaults owned by managed `supabase_admin` remain outside the `postgres` migration owner's control and were explicitly preserved as a residual. |
| FDA-021 | **CLOSED** | Authenticated profile UPDATE is narrowed to `display_name`, `avatar_url`, and `avatar_object_key`; broad table UPDATE is absent. |
| FDA-023 | **CLOSED** | The restrictive authenticated open-status INSERT policy is installed and reconciles to accepted Stage A. |
| FDA-026 | **OPEN — STAGE B CUTOVER REQUIRED** | Stage A installs the four bounded replacement RPCs and preserves Build 33 compatibility. The broad authenticated profile-read and legacy anonymous read cutover is entirely in excluded migration `20260911130000`; it requires separate client-retirement evidence and owner authorization. |
| FDA-028 | **OPEN — ROLLOUT BYPASS RESIDUAL** | The accepted limiter infrastructure, Vault-backed epoch-key contract, policy, isolation, lifecycle, and service-role entry points are installed. Legacy direct guest inserts remain available under the owner-approved S3 posture, so universal guest rate limiting is not claimed. |

This disposition closes the Phase 03A Stage A production gate without relabeling carried residuals as repaired findings.

## Carried rollout residuals

1. **MF-05 / Stage B:** `S3_LIMITER_PRESENT_BYPASS_OPEN` remains the accepted temporary posture. Stage B, legacy-path removal, forced upgrades, pinned-web cutover, and client release remain unstarted and unauthorized.
2. **IPv6 transport:** normalization is accepted, including IPv6 `/64` behavior, but no deployed end-to-end IPv6 guest-ingest transport path has been proven.
3. **FDA-012 managed defaults:** broad defaults owned by `supabase_admin` remain a platform-owned residual. The applied migrations do not claim authority over them.
4. **Production behavior scope:** Build 33 and FDA-028 behavior claims reuse exact-artifact fresh-stage evidence plus production catalog/privilege verification. No production application function, limiter admission, webhook, synthetic write, or client traffic was invoked.
5. **Evidence retention:** the immediate pre-apply aggregate values were observed and match the post-apply values, but the original raw wrapper for that immediate observation was not retained. Earlier and post-apply raw captures corroborate the values. The first post-apply verifier failed read-only with `22P02`; the retained corrected query completed with `transaction_read_only=on`. The failed error wrapper was not retained.
6. **Comparator scope:** structural equality covers the recorded `public`, `private`, `storage`, and `limiter` schemas and documented catalog surfaces. It excludes volatile object identifiers, planner statistics, and objects outside that capture scope.
7. **Recovery:** 24 forward-recovery artifacts are prepared and hash-verified. `READY` does not authorize their execution. Each future use requires current-state adjudication and a new exact owner token.

## Authority boundary

No further production mutation, recovery action, Vault/config change, function or webhook invocation, production traffic, push, main merge, deployment, release, Stage B, or Phase 03B action is authorized by this receipt. The next allowed step is owner review of a separately prepared exact main-merge authorization packet.
