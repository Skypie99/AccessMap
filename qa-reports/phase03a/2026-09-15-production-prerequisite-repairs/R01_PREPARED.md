# Phase 03A production-prerequisite repairs — generation 01

```text
PROMPT_ID: FLAGSTONE-P03A-PRODUCTION-PREREQUISITE-REPAIRS-20260914-R1
RUN_UNIT: P03A_PRODUCTION_PREREQUISITE_REPAIRS
GENERATION: 01
STATUS: PREPARED
BANKED_AT_UTC: 2026-09-15T03:56:04Z
REPAIR_1: PRODUCTION_PLAN_TOOLING
REPAIR_2: CREDENTIAL_GUARD_FALSE_POSITIVE
PRODUCTION_AUTHORITY: NONE
STAGING_AUTHORITY: NONE
```

## Verified starting identity

```text
repository: https://github.com/Skypie99/AccessMap.git
worktree: /Users/skypie/AccessMap-codex/flagstone-p03a-takeover-20260914
branch: codex/flagstone-p03a-takeover-20260914
HEAD: 949c11093922d0b7d7b8665eda84dfde710f0d1c
tree: a8ee59aac0e86239370aa55e14d897bed39c1a65
main...origin/main: 0/0
```

The only pre-existing uncommitted files are the accepted production-preflight packet and its root QA report. Its 52-entry freeze manifest revalidated exactly. No operation is `RUNNING`, `APPLIED_NOT_VERIFIED`, or `OUTCOME_UNKNOWN`.

## Recovered repair boundaries

### Repair 1 — production plan only

Affected source is expected to be `scripts/canonical-apply-workspace.mjs` plus directly required tests. The current builder correctly materializes 71 baseline, five Phase 02 adoption, and nine Phase 03A Stage A files and reports exactly 14 `wouldPush` entries. Its command function is staging-only and exposes both dry-run and apply argv; the CLI hardcodes the staging expectation. The repair must add an explicit production plan mode that emits only target-bound `--dry-run --skip-vault` argv and never enables production apply. Existing staging behavior and production refusal remain.

### Repair 2 — credential finding IDs

Affected source is expected to be `src/__tests__/noCredentialsInTree.guard.test.ts` plus directly required fixtures/tests. The whole tracked-tree census must remain. The current contextual detector can treat `STAGE-MF-03`, `STAGE-MF-04`, and `STAGE-MF-05` as credential-shaped tokens when they follow credential vocabulary in prose. The repair must classify only the narrow known finding-ID grammar in non-credential prose; an exact identifier used as a password/secret value must still fail. QA and design-review surfaces remain scanned, long-hex credential labels remain detected, normal SHA-256 digests remain non-findings, and failure output remains shape-only.

## Preserved bytes

The accepted FDA-028 limiter, hosted harness, every Stage A migration, Stage B, Build 33 client behavior, thresholds, and production configuration are outside the repair scope and must remain byte-identical.

```text
NEXT_SAFE_ACTION: checkpoint the accepted preflight and this PREPARED generation, then implement only the two bounded local repairs and focused tests
```
