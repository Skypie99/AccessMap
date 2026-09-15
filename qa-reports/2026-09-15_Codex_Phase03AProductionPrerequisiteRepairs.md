# Phase 03A production-prerequisite repairs

## Outcome

`PRODUCTION_PREFLIGHT: READY_FOR_OWNER_DECISION` for the bounded Phase 03A prerequisite scope. This status does not authorize a production dry-run, migration apply, configuration change, deployment, Stage B, push, or merge.

The production plan-only tooling and credential guard pass at the independently reviewed repair commit. A fresh read-only production re-preflight found the expected 71-row ledger and exact comparator-v3 state, generated an exact 14-migration Stage A plan, and excluded Stage B. The production forward-recovery packet is `PREPARED_REVIEWED`.

## What changed

- Added a target-bound production plan-only path that validates the exact production ref, frozen source and ledger identities, the 14-entry Stage A manifest, file hashes, and Stage B/recovery exclusion before returning only a local `--dry-run --skip-vault` command.
- Strengthened the repository credential guard so high-confidence credential labels scan raw source, including comments and text after URLs, while retaining the narrow finding-ID prose exception.
- Added and extended focused regression tests for target ambiguity, ledger/name tampering, unsafe flags, Stage B/recovery leakage, credential false positives, and credential blind spots.
- Updated only the schema snapshot input stamp required by the `package.json` script change; the schema snapshot output did not change.
- Banked fresh read-only production identity, catalog, comparator, ledger, prerequisite, exact pending-plan, and workspace-destruction evidence.
- Banked a validated 24-artifact forward-recovery packet and two independent PASS reviews. The two security crossings remain deliberately non-restorable.

No FDA-028 limiter implementation byte and no Phase 03A migration SQL byte changed.

## Branch and source identity

```text
BRANCH: codex/flagstone-p03a-takeover-20260914
REPAIR_SHA: 22e1db5aa7e58d7129551cb1325f921b37f95105
REPAIR_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
INDEPENDENT_CODE_REVIEW: PASS
```

This report and the final evidence packet are committed later on the same local branch. The repair SHA/tree above remain the frozen and reviewed source identity.

## Gates

```text
npm run typecheck
PASS

npm run lint
PASS — 0 errors, 91 warnings

npx jest --runInBand scripts/__tests__/productionPlanOnly.test.ts scripts/__tests__/targetTokenSafety.test.ts scripts/__tests__/canonicalMigrationIdentity.test.ts scripts/__tests__/canonicalApplyWorkspaceGuard.test.ts src/__tests__/noCredentialsInTree.guard.test.ts
PASS — 5 suites, 121 tests

npm run contract:check
PASS

npm run db:snapshot:check
PASS

npm run release:verify
PASS

npm run db:apply:plan
PASS — 9 Phase 03A candidates

independent code review at the frozen repair SHA/tree
PASS

bounded production SQL inspection
PASS — transaction_read_only=on; no credential bodies, endpoints, PII, or application-row identifiers selected

exact production planner invocation
PASS — 14 Stage A migrations; Stage B absent; apply unavailable; transient workspace destroyed; Supabase CLI dry-run not executed

independent production forward-recovery review
PASS — PREPARED_REVIEWED
```

Production re-preflight evidence:

- project ref `kldlwszpfkdmsjrjhjym`; identity verified
- ledger count 71; latest `20260830130000`
- ordered ledger digest `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b`
- canonical comparator digest `2c0bacf76c71924ffd8543852dc830f593058b8cb67a1016871f55908dae0443`
- structural comparator digest `1c4cdbc441d3747f56109955c7b31840720d4cd09373572d961e9638fcc255c8`
- production mutations: none
- staging mutations: none

## What's left

- MF-03 remains `OWNER_ACTION_REQUIRED`: production has zero `fda028_limiter_epoch_key` rows.
- MF-04 remains `OWNER_ACTION_REQUIRED`: production has zero `webhook_endpoint` rows.
- MF-05 remains `OWNER_DECISION_REQUIRED`: Stage A retains `S3_LIMITER_PRESENT_BYPASS_OPEN`.
- Production limiter thresholds and activation remain `INCOMPLETE` and unapproved.
- No production dry-run or apply has been performed or authorized.
- No recovery execution has been performed or authorized.

## DECISIONS FOR SKY

### Immediate prerequisite

- **Decision:** Provide the production webhook endpoint prerequisite.
- **Recommendation:** Securely create exactly one production Vault entry named `webhook_endpoint` with the correct production HTTPS endpoint, then record completion status only for later shape-only verification.
- **Why:** Fresh read-only evidence found zero matching rows, and migration `20260911120000` requires this production-specific prerequisite.
- **Alternative:** Leave the row absent and keep Phase 03A production work on hold.
- **Impact:** Completing this prerequisite closes MF-04 only. It does not authorize a dry-run, apply, migration, notification probe, deploy, push, or merge.

### Remaining owner decisions

- **MF-03:** Create exactly one production-only limiter epoch key through an owner-controlled secure interface, or keep the prerequisite unsatisfied.
- **MF-05:** Accept the documented Stage A legacy bypass temporarily for Build 33 compatibility, or hold Stage A. Applying Stage B early would break shipped caller contracts.
- **Production policy:** Choose evidence-backed allowances and window duration, then decide the exact activation posture. No value has been inferred from staging.
- **Security-crossing recovery:** If either forward-only security repair regresses, select application/release containment or authorize a new reviewed corrective migration. Do not recreate the retired credential, client grants, or hardcoded endpoint.
