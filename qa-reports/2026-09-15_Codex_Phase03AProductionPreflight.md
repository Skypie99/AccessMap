# Codex QA report — Phase 03A production preflight

## Outcome

`PRODUCTION_PREFLIGHT: HOLD`. The accepted fresh-stage gate remains PASS, and one independent reviewer passed the accuracy and conservatism of this preflight packet. No production or staging mutation, remote dry-run, commit, ref change, push, merge, build, deployment, or release occurred.

## What changed

Only uncommitted local evidence and planning artifacts were added under `qa-reports/phase03a/2026-09-15-production-preflight/`:

- sanitized read-only production ledger/catalog captures and exact comparator diff;
- exact 14-entry pending Stage A plan, with Stage B excluded;
- production apply plan and post-apply verification plan;
- one consolidated owner decision sheet;
- 12 unsafe forward-restoration and 12 exact-source reapplication artifacts plus manifest and static validation;
- generation checkpoints G01 through G04;
- one independent preflight review.

No migration source, product code, runner, test, package file, tracked selector, or historical receipt was edited.

## Branch and SHA

```text
repository: https://github.com/Skypie99/AccessMap.git
worktree: /Users/skypie/AccessMap-codex/flagstone-p03a-takeover-20260914
branch: codex/flagstone-p03a-takeover-20260914
HEAD: 949c11093922d0b7d7b8665eda84dfde710f0d1c
tree: a8ee59aac0e86239370aa55e14d897bed39c1a65
report commit: NONE — commits were prohibited by the controlling prompt
```

The proposed release identity is accepted frozen integration `9a0af4c88b5b00898e405992cfd44ba7dfd689fc`, tree `4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5`, verified as an ancestor of current HEAD. All 14 migration hashes match that Git identity.

## Production read-only result

Production project `kldlwszpfkdmsjrjhjym` was captured through project-scoped Supabase read tools. Every SQL capture used an explicit read-only transaction, and the database returned `transaction_read_only=on`.

- Ledger: 71 rows, latest `20260830130000`, ordered SHA-256 `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b`.
- Comparator: canonical SHA-256 `2c0bacf76c71924ffd8543852dc830f593058b8cb67a1016871f55908dae0443`; non-ledger structural SHA-256 `1c4cdbc441d3747f56109955c7b31840720d4cd09373572d961e9638fcc255c8`.
- Exact drift from the accepted Phase 02 production contract: zero lines.
- MF-03 production limiter key: absent.
- MF-04 webhook endpoint: absent; existing webhook secret shape present.
- Limiter schema: absent; Stage A replacement RPCs: absent.

No raw application row, personal identifier, coordinate, IP, endpoint value, secret value, key fingerprint, or credential was selected or retained.

## Exact pending operation

The accepted isolated-workspace builder reported 71 baseline, five adoption, and nine Phase 03A Stage A files, with exactly 14 `wouldPush` entries. The machine-readable order and hashes are in `PENDING_MIGRATION_PLAN.json`. Stage B is excluded.

The accepted local plan command reports only the nine Phase 03A entries, while the workspace builder correctly shows all 14 files the push would include. The accepted command builder refuses production under its staging-only path. The remote dry-run was therefore `NOT_RUN`; no safety guard was bypassed.

## Build 33 compatibility scope

`BUILD33_PRODUCTION_COMPATIBILITY_PREFLIGHT: SUPPORTED` within a bounded scope: current production exactly matches the accepted pre-apply catalog, and the accepted fresh-stage suite exercised 37/37 shipped authenticated/anonymous caller shapes with Stage B as a negative control. No client-role execution occurred on production in this run. The post-apply plan requires role-context verification and prohibits treating superuser success as client proof.

## Recovery

The local recovery validator passed 24/24 generated artifacts: source and rollback hashes, exact regeneration, exact reapply source bodies, unique unused-at-capture versions, dependency order, and Stage B exclusion.

Overall recovery remains `HOLD`. All 12 prepared restorations are `UNSAFE_BASELINE_RESTORE`. Two security repairs have no production restoration artifact:

- `20260904000400_adopt_execute_revokes.sql`;
- `20260911120000_phase03a_webhook_target_env_scoped.sql`.

Recreating either baseline would restore a known security weakness. A later regression across either boundary requires a new corrective migration or owner-selected application/release containment.

## Gates

| Gate / command | Result |
|---|---|
| Git identity, tree, ancestry, candidate Git-object hashes | PASS |
| Read-only production project/ledger/catalog capture | PASS |
| Comparator-v3 against accepted pre-apply production contract | PASS; zero diff |
| `npm run db:apply:plan -- --ledger .../PRODUCTION_LEDGER.json` | PASS for its declared nine-entry plan; also exposes the five-entry reporting omission |
| `node scripts/canonical-apply-workspace.mjs build --ledger .../PRODUCTION_LEDGER.json` | PASS; 85 materialized, exactly 14 pending; marked temp workspace safely destroyed |
| Production command generation | REFUSED_AS_DESIGNED; exit 2 |
| Remote production dry-run | NOT_RUN |
| Local recovery static validator | PASS; 24/24 files, recovery status still HOLD |
| `shasum -a 256 -c ARTIFACT_SHA256.txt` | PASS; 52/52 |
| Focused Jest tool tests | NOT_RUN; `npx` found no installed Jest and failed while accessing the local npm cache; no retry |
| Credential guard | KNOWN_FALSE_POSITIVE_UNRESOLVED |
| Independent packet review | PASS; report SHA-256 `bc5724ccc766ab274722b3d06369bb1e5ceb1df0ba4ef78877967a13c683ddf1` |

The exact-source fresh-stage R7 31/31, negative control, cleanup, 25-way concurrency, 254/254 pgTAP, and Build 33 37/37 results were reused as accepted evidence and were not rerun.

## What's left

- Implement and independently review the narrow production plan/dry-run-only tool mode. It must bind the exact target, release SHA/tree, all 14 `wouldPush` hashes, `--dry-run`, and `--skip-vault`, while keeping apply unavailable.
- Repair or precisely document the credential scanner so structured finding IDs do not false-positive and real credential-shaped negative controls still fail without printing values.
- Sky provisions MF-03 and MF-04 through owner-controlled secure interfaces after the local repairs are accepted.
- Sky decides MF-05, the first three traffic-dependent limiter values, the remaining proposed values, activation behavior, and the two forward-only recovery implications.
- A separately authorized production dry-run and a later exact production mutation token would still be required.

## DECISIONS FOR SKY

**Decision:** Whether to authorize only the two bounded local source prerequisites: the production plan/dry-run-only tooling repair and the credential-guard repair.

**Recommendation:** Authorize those local repairs, focused tests, and one independent patch review. Keep production on HOLD until the secret/config, bypass, policy, recovery, dry-run, and final operation-token requirements are separately satisfied.

**Alternative:** Request changes to the repair proposal or retain the current production state.

**Impact:** This decision authorizes no production/staging action, provisioning, merge, push, deployment, release, Stage B, or Phase 03B work.

```text
PRODUCTION_PREFLIGHT: HOLD
ACCEPTED_STAGE_GATE: PASS
CURRENT_SOURCE_AND_TREE: 949c11093922d0b7d7b8665eda84dfde710f0d1c / a8ee59aac0e86239370aa55e14d897bed39c1a65
PROPOSED_RELEASE_IDENTITY: 9a0af4c88b5b00898e405992cfd44ba7dfd689fc / 4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5 — verified ancestor
PRODUCTION_IDENTITY_VERIFIED: YES
PENDING_MIGRATIONS: 14
STAGE_B_INCLUDED: NO
BUILD33_PRODUCTION_COMPATIBILITY_PREFLIGHT: SUPPORTED — bounded pre-apply comparator plus accepted fresh-stage role evidence
MF03_SECRET_PREREQUISITE: OWNER_ACTION_REQUIRED
MF04_ENDPOINT_PREREQUISITE: OWNER_ACTION_REQUIRED
MF05_BYPASS_DECISION: OWNER_DECISION_REQUIRED
PRODUCTION_POLICY: INCOMPLETE
CREDENTIAL_GATE: KNOWN_FALSE_POSITIVE_UNRESOLVED
PRODUCTION_FORWARD_RECOVERY: HOLD
INDEPENDENT_PREFLIGHT_REVIEW: PASS
SOURCE_CHANGES_REQUIRED: YES — bounded production-plan-only tooling repair plus bounded credential-guard repair
OWNER_DECISIONS: qa-reports/phase03a/2026-09-15-production-preflight/OWNER_DECISION_SHEET.md
PRODUCTION_MUTATIONS: NONE
STAGING_MUTATIONS: NONE
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
PUSHES: NONE
NEXT_SAFE_ACTION: Sky authorizes only the two bounded local source prerequisite repairs, or requests changes
```
