# Phase 03B R11 history-support fail-closed repair

## Outcome

`PASS / READY FOR ONE FRESH NARROW INDEPENDENT REVIEW`.

The exact transport defect reported at independent-review commit `0da47c7f4928743af431d50e8d486897d3f681be` is repaired. History-support files now contain purpose-built abort-first tripwires rather than executable historical migration bodies. A support file selected as pending raises a dedicated Phase 03B violation before any historical DDL, DML, privilege change, function creation, trigger creation, data mutation, or migration-ledger insertion can occur.

No production mutation, quiescence, controller execution, migration apply, migration repair, database pull, staging mutation, push, merge, release, or Phase 03C work occurred.

## What changed

- Replaced copied historical SQL bodies in the hermetic CLI workspace with deterministic `ABORT_FIRST_TRIPWIRE` files while preserving all 85 exact historical filename/version identities.
- Bound each generated support file's exact filename, size, and SHA-256 to the workspace inventory and manifest; substitution of a real historical body now fails verification.
- Added explicit rejection when any historical-support version appears in a dry-run pending plan.
- Added a fresh target-pinned, read-only production-ledger query immediately before apply dispatch. The controller requires exact equality with the accepted preflight ledger and revalidates the same workspace against the fresh ledger before its existing apply command.
- Added 22 focused fail-closed regressions, including executable disposable-PostgreSQL proof, and reran the prior 22 transport regressions.
- Captured permitted live target-pinned read-only ledger and dry-run evidence.
- Kept both frozen Phase 03B migration files byte-identical.

## Branch + SHA

- Branch: `codex/flagstone-p03b-r11-history-support-fail-closed-repair-20260919`
- Base / independent transport review: `0da47c7f4928743af431d50e8d486897d3f681be`
- Source transport repair: `b50759af723d0b1c1008ca78f3e169d1ffbe08e0`
- Source R11 packet: `cf683eac2f50a284d8dc897db98a91290e9b6bc0`
- Candidate: `9d638456fa8e679678c54f131fe8f0db723eda72`
- Candidate tree: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`
- Repair evidence SHA: the single commit containing this report; recorded exactly in the task handoff after commit creation.

## Gates

### Focused transport and fail-closed validation

```bash
node qa-reports/phase03b/2026-09-19-production-apply-packet-r11/run_history_support_fail_closed_local_validation.mjs --evidence=qa-reports/phase03b/2026-09-19-production-apply-packet-r11/HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_EVIDENCE
```

Result: exit `0`; overall `PASS`; prior transport tests `22/22`; new history fail-closed tests `22/22`; preserved R11 control validator `PASS`; preserved disposable PostgreSQL lifecycle validator `PASS`; numeric child exits `[0,0,0,0]`; temporary infrastructure destroyed.

The new executable tripwire test appended marker DDL and a migration-ledger insert after a selected history-support tripwire. PostgreSQL returned nonzero with `PHASE03B_HISTORY_SUPPORT_SELECTED_PENDING`; the marker relation was absent and the ledger row count remained zero.

### Fresh live read-only ledger and target-pinned dry run

```bash
node qa-reports/phase03b/2026-09-19-production-apply-packet-r11/run_live_transport_validation.mjs --evidence=qa-reports/phase03b/2026-09-19-production-apply-packet-r11/HISTORY_SUPPORT_FAIL_CLOSED_LIVE_EVIDENCE
```

Result: exit `0`; `PASS`; Supabase CLI `2.116.0`; exact production target `kldlwszpfkdmsjrjhjym`; transaction read-only `on`; exact accepted `85`-row ledger and digest `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`; `85` tripwire support files; dry run reported exactly the two frozen migrations in order with `dryRun=true`, `upToDate=false`, `seeds=[]`, and `roles=[]`; all three child exits `0`; temporary workspace destroyed; production mutations `NONE`.

### Candidate freeze

```bash
git diff --exit-code 9d638456fa8e679678c54f131fe8f0db723eda72 -- supabase/migrations-next/phase03b/20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql supabase/migrations-next/phase03b/20260915210413_phase03b_points_integrity.sql
```

Result: exit `0`. SHA-256 values remain `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11` and `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`.

### Repository gates

- `node --check` over all six changed or added modules: `PASS`.
- `npm run typecheck`: exit `0`, `PASS`, using an existing dependency tree whose `package-lock.json` SHA-256 exactly matched this worktree.
- `npm run lint`: exit `0`; `0` errors and `90` existing warnings.
- `npx --no-install jest --ci -w 3`: exit `1`; `12/297` suites and `14/4422` tests failed, while `285` suites and `4376` tests passed with `32` todo. Failures were in existing UI/source-pinning suites such as `dismissalStandard.guard.test.ts`, `TasksScreenFlagCard.test.tsx`, `visualFreezeFixWave.guard.test.ts`, and `Wave2ScreenGeometry.test.ts`; this repair changes only `qa-reports/**` transport code and evidence. These unrelated failures were not modified under the narrow authority.
- `git diff --check`: `PASS`.
- Credential-pattern scan over the repair code and captured evidence: no matches.

The first typecheck attempt used the primary checkout's incomplete dependency tree and failed to resolve three declared packages. Re-running with the existing exact-lockfile-matching dependency tree passed; the temporary `node_modules` symlink was removed before commit.

## What's left

- One genuinely fresh reviewer must independently examine only this repair evidence commit and return the narrow history-support transport verdict.
- Production apply remains unexecuted and unauthorized.
- One-run authorization remains unused.
- Phase 03C has not started.
- The unrelated repository-wide Jest baseline remains outside this bounded repair.

## DECISIONS FOR SKY

- **Decision:** Whether to commission the one permitted fresh narrow independent review of this exact repair evidence commit.
  - **Recommendation:** Review this single commit next, checking the abort-first tripwire bytes, fresh pre-apply ledger ordering, executable PostgreSQL proof, and fresh live dry-run receipt.
  - **Why:** All required focused regressions and permitted live checks pass, and the frozen candidate did not change.
  - **Alternative:** Hold Phase 03B with production unchanged.
  - **Impact:** Review readiness does not authorize quiescence, controller launch, or production apply.
