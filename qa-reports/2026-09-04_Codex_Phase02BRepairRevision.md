# Codex QA report — Prompt 02B repair revision

## Outcome

Prompt 02B revision 2 is **PASS** after two independent read-only falsification reviews. Full
Phase 02 is **PASS**. FDA-027 source reproducibility and disposable replay parity are **PASS**;
production-ledger closure is **NOT_CLOSED** because five forward candidates remain intentionally
inert. No Phase 03 work began.

## What changed

- Replaced the incomplete comparator with catalog comparator v3 covering the declared
  authorization/schema surface. Policy, trigger and function definitions are compared by hashes.
- Rebuilt replay isolation around socket-only temporary PostgreSQL, an explicit child environment,
  `psql -X`, temporary-only pg_net adaptation and before/after global-file fingerprints.
- Corrected four production-adoption candidates and their rollback artifacts without changing any
  of the 71 applied migrations.
- Added exact forward-state pins, four real baseline round-trips and one atomic fail-closed
  non-reversible security rollback.
- Repaired MOD1R includes and added a 19-case disposable runner.
- Corrected pgTAP classification and honest `UNAVAILABLE` execution behavior.
- Expanded snapshot provenance to 87 ordered inputs and added a nine-class tamper rehearsal.
- Added approved catalog-only production/replay captures and separate applied-only/with-next
  comparison artifacts.
- Updated CI to run the new gates and fetch full ancestry for capture validation.
- Appended revision-2 acceptance to
  `qa-reports/2026-09-03_Phase02B_CanonicalMigrationSource.md` without removing revision-1 HOLD
  evidence.

## Branch + SHA

```text
BRANCH: codex/p02b-repair-rev2-20260904
WORKTREE: /Users/skypie/AccessMap-codex/p02b-repair-rev2-20260904
BASE: 68aaf711c2023dd4aa1d6b9324f30e2b4e4b3bc1
IMPLEMENTATION_SHA: 1682bebdeafedc9b3b0f83a5d24ff07a303ef890
IMPLEMENTATION_TREE: 2be6ce7fc156b65f7b542558d6884c7c54411546
ACCEPTANCE_SHA: commit containing this report; intentionally not self-embedded
PRODUCTION_MUTATIONS: NONE
REMOTE_MUTATIONS: NONE
```

## Gates

| Command | Actual result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0; 0 errors, 91 inherited warnings |
| `npm run contract:check` | exit 0; crosswalk current |
| focused canonical/lineage/credential Jest | exit 0; 3 suites / 46 tests |
| `npm run db:snapshot:check` | exit 0; 87 inputs |
| `npm run db:snapshot:negative` | exit 0; 9 tamper classes rejected |
| pgTAP discovery | exit 0; 3 suites, 1 fixture, 1 raising proof |
| pgTAP execution | exit 2; **UNAVAILABLE**, extension absent |
| `npm run db:mod1r-proof` | exit 0; 19/19 |
| applied-only local replay | exit 0; 71 migrations |
| applied-only production comparison | exit 1; expected `DRIFT`, exact deltas retained |
| with-next production comparison | exit 0; 71 + 5, comparator-v3 parity |
| `npm run db:rollback:verify` | exit 0; 5/5 declared contracts |
| full Jest | exit 1; 272 passed / 12 inherited failed suites; 4,174 pass / 14 fail / 32 todo |
| `git diff --check 68aaf711..1682beb` | exit 0 |

All disposable database runs destroyed temporary state and reported global PostgreSQL files
unchanged. Evidence inspection found only approved catalog metadata/hashes and no prohibited
production data or credential material.

## What's left

- pgTAP execution is unavailable and required before any later authorized candidate apply.
- The five candidates remain inert; production ledger remains at 71 entries.
- Twelve UI/copy suites, fourteen tests, 91 lint warnings and repo-wide formatting debt are
  inherited and outside Prompt 02B.
- Two revision-1 pg_net stub files remain in the Homebrew PostgreSQL 17 shared extension directory.
  Rev2 did not create or change them; host cleanup was prohibited in this task.

## DECISIONS FOR SKY

### Candidate application

- **Decision:** authorize a later staging/production apply or retain source-only closure.
- **Recommendation:** retain inert until pinned pgTAP executes in an authorized disposable/staging
  environment.
- **Why:** catalog parity does not prove behavioral/runtime correctness.
- **Alternative:** authorize the apply without that gate.
- **Impact:** the alternative weakens the accepted apply boundary; current production-ledger
  closure remains `NOT_CLOSED`.

### Host cleanup

- **Decision:** separately authorize removal of the two exact revision-1 pg_net stubs.
- **Recommendation:** remove them under a dedicated hash-checked host-hygiene action.
- **Why:** this task forbade global PostgreSQL mutation.
- **Alternative:** leave them untouched.
- **Impact:** no effect on rev2 source acceptance; the host remains not clean.
