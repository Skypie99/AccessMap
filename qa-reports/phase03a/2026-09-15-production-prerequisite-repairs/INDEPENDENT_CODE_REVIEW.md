# Phase 03A production-prerequisite repairs — independent code review

```text
REVIEWED_COMMIT: 3a0235395b484fdbdf2aee9023ee5ab976fe648e
REVIEWED_TREE: 2e2b9698c251e71b9a7fdcff42e76ab2f84b13aa
DIFF_PARENT: c706449a81e844f2cccf13df92ce700f82ddeda1
INDEPENDENT_CODE_REVIEW: HOLD
PRODUCTION_PLAN_ONLY_REPAIR: HOLD
CREDENTIAL_GUARD_REPAIR: HOLD
PRODUCTION_MUTATIONS: NONE
STAGING_MUTATIONS: NONE
```

## Verdict

The exact commit and parent/tree identities match the review request, the focused suites pass, and the change does not alter Phase 03A migration SQL. The review remains `HOLD` because two local adversarial probes produced false green results in safety-critical gates. Neither finding requires a migration change or hosted rerun.

## Blocking findings

### 1. [High] The production planner does not bind the supplied ledger to the frozen ordered digest

`validateProductionPlanEvidence()` validates that `productionPreApplyContract.ledgerOrderedSha256` merely looks like 64 hexadecimal characters. It then compares only ledger row count and latest version. It never computes an ordered digest from the supplied ledger or compares the ledger file bytes with a retained hash. The downstream ledger audit checks unknown and duplicate versions, but canonical name checking is limited to the Phase 03A `declared` candidates; it does not bind baseline or Phase 02 adoption names.

Local falsification used the retained 71-row ledger and exact evidence, changed only the first baseline row's name while preserving its version, count, latest version, and the unchanged frozen contract digest, then called `buildProductionPlan()`. The result was:

```text
ok: true
refusals: 0
plan: 14
command present: true
workspace cleanup: PASS
```

This is a false executable plan: the supplied ledger no longer matches the frozen production ledger identity, yet the tool emits the production dry-run command.

**Required correction:** Before creating a workspace, compute the canonical ordered ledger digest from every supplied `{version,name}` row and require exact equality with `productionPreApplyContract.ledgerOrderedSha256`. Also bind version/name identity across the complete baseline, Phase 02 adoption, and Phase 03A declared sets. Add negative tests that alter a baseline name, alter an adoption name, reorder/duplicate rows, and alter a row while preserving count/latest; every case must return `ok=false`, `workspace=null`, and `command=null`. Include the verified ledger digest in successful plan output.

Relevant code: `scripts/canonical-apply-workspace.mjs:417-470`, `scripts/canonical-apply-workspace.mjs:505-552`, and `scripts/canonical-migration-identity.mjs:95-154`.

### 2. [High] The tree-resident credential gate still misses common credential shapes

The scanner's password detector runs only when the entire file contains reviewer/demo/test-account language. The new always-on secret-label detector does not include password labels. As a result, an ordinary tracked assignment such as `DATABASE_PASSWORD=<credential-shaped value>` outside reviewer prose produces zero findings. This breaks the stated residence guarantee for a credential that predates the hook or enters through `--no-verify`; the staged-diff hook catches this class, but the whole-tree guard does not.

Source preprocessing creates another blind spot. The test strips JavaScript/TypeScript comments using regular expressions before all detectors run. It therefore removes high-confidence credential assignments in source comments and mistakes `//` inside a URL string for a comment opener, blanking a later secret assignment on the same line.

Local probes used invented runtime-assembled values and printed only finding counts/shapes:

```text
uncontextualized DATABASE_PASSWORD assignment: 0 findings
TypeScript URL followed by api_key assignment on the same line: 0 findings
TypeScript comment containing api_key assignment: 0 findings
QA markdown api_key assignment: 1 finding
```

**Required correction:** Make password-style assignments, including underscore-prefixed environment names such as `DATABASE_PASSWORD` and `POSTGRES_PASSWORD`, part of an always-on high-confidence detector. Run high-confidence label and format detectors on raw source text, or replace regex comment removal with lexer-aware processing that cannot treat URL content as a comment. Decide explicitly whether high-confidence assignments in source comments are permitted; for a no-credentials-in-tree gate they should remain detectable. Add direct regression cases for all three zero-finding probes and require redacted output.

Relevant code: `src/__tests__/noCredentialsInTree.guard.test.ts:61-88`, `src/__tests__/noCredentialsInTree.guard.test.ts:214-223`, and `src/__tests__/noCredentialsInTree.guard.test.ts:297-378`.

## Falsification areas that held

- **Target authority:** Production plan generation requires the exact production ref, rejects whitespace and flag-shaped values, and rejects `--linked`, `--local`, `--db-url`, `--stage`, and `--apply` at the CLI boundary.
- **Mutation authority:** The production path creates a local disposable workspace and returns only `supabase db push ... --dry-run --skip-vault`. It exposes no production apply argv or apply field and does not invoke Supabase itself. Existing staging command helpers still refuse the production ref even when callers pass the removed `expectStaging:false` property.
- **Implicit targeting:** Returned argv contains exactly one `--project-ref` selector and no linked or database-URL selector.
- **Stage B and recovery leakage:** Evidence validation rejects non-Stage-A entries, the named Stage B file/pattern, restore files, and reapply files. The exact retained plan contains 14 Stage A entries and no Stage B or recovery artifact.
- **Candidate bytes:** The workspace rehashes adoption and planned candidate bytes and compares the final ordered `wouldPush` set with the evidence entries. Candidate hash tampering is refused.
- **Phantom/duplicate candidate handling:** Existing focused tests cover phantom versions, wall-clock substitution, duplicate canonical versions, wrong candidate names, impossible ordering, and already-applied canonical rows. Finding 1 identifies the remaining baseline/adoption name and frozen-digest gap.
- **Finding-ID exception:** `STAGE-MF-03/04/05` suppression is limited to comma-delimited prose with a recognized finding ID, multiple IDs, and decision/status language. Assignment and SQL header/value contexts remain detected.
- **QA/design-review coverage:** Tracked files are collected with `git ls-files`, and direct synthetic QA/design-review probes are detected.
- **SHA treatment:** A bare 64-hex digest remains ignored, while a 64-hex value under a secret label remains conservatively red. The change did not add a broad SHA allowlist.
- **Failure disclosure:** Main census failures use only path, line number, length, and character classes. The matched credential body is retained internally for classification/allowlist checks but is not included in the normal failure message.

## Verification

```text
git identity and parent/tree verification: PASS
git diff --check c706449..3a02353: PASS
ARTIFACT_SHA256_R02.txt: PASS, 12/12
node --check changed .mjs files: PASS
npm run typecheck: PASS
focused Jest suites: PASS, 5 suites / 115 tests
production-plan altered-baseline-name adversarial probe: FAIL-CLOSED EXPECTATION FAILED
credential scanner adversarial probes: FAIL-CLOSED EXPECTATION FAILED for 3 cases
hosted calls: NONE
source edits: NONE
```

The focused Jest command covered:

- `scripts/__tests__/productionPlanOnly.test.ts`
- `scripts/__tests__/targetTokenSafety.test.ts`
- `scripts/__tests__/canonicalMigrationIdentity.test.ts`
- `scripts/__tests__/canonicalApplyWorkspaceGuard.test.ts`
- `src/__tests__/noCredentialsInTree.guard.test.ts`

## Scope and next action

The smallest repair is confined to the two changed safety tools and their focused tests:

1. Bind the actual ledger to its frozen ordered digest and full canonical version/name map before workspace creation.
2. Close the credential census's always-on password and source-preprocessing blind spots while preserving redacted failure output and the narrow finding-ID exception.
3. Freeze the new source, rerun the same local focused suites plus the adversarial cases above, and obtain one independent code review.

Do not run a production dry-run or generate new production authority from commit `3a0235395b484fdbdf2aee9023ee5ab976fe648e`.

## DECISIONS FOR SKY

No production decision is ready. The recommendation is to authorize only the bounded local corrections above. The alternative is to retain the current production-preflight HOLD without changing the tools. The impact is limited to local planning and credential-gate reliability; accepted fresh-stage behavior and all production/staging state remain unchanged.
