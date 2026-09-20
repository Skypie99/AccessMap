# Phase 03B R11 final owner runbook regeneration — 2026-09-19

## DECISIONS FOR SKY

- [ ] **Execute or hold the unused one-run authorization**
  - **Recommendation:** Execute only from a fresh macOS Terminal by copying the complete compact block from the final runbook, and only if every automatic preflight passes and every human-checkpoint statement is true.
  - **Why:** The runbook now preserves the accepted 85-tripwire transport and fresh pre-apply ledger reconciliation, while the canonical controller remains the only mutation path.
  - **Alternative:** Hold. Production remains unchanged and the authorization remains unused.
  - **Impact:** Typing the runbook's exact confirmation phrase launches the first and only authorized R11 production attempt. Any outcome forbids retry without new explicit owner authority.

## Outcome

`FINAL_R11_OWNER_RUNBOOK: READY`.

The final runbook was regenerated from history-support repair `3dd4e47dc35580c3b907daa9631b1db4c536cda6` and independent review `4459327012432a52c2ce72bdc4589fc76dd6520e`. It fixes the zsh commit:path expansion defect, removes the obsolete two-file-only transport, preserves the accepted R11 safety contract, and retains one exact human-gated controller invocation.

No production or staging contact, controller launch, quiescence, migration apply, migration repair, database pull, push, merge, release, or Phase 03C action occurred.

## What changed

- Added `qa-reports/2026-09-19_Codex_Phase03B_R11_Final_Owner_Runbook.md`.
- Added this QA report.
- Did not modify the accepted packet, controller, validators, migrations, candidate, application source, backend source, or prior evidence.

## Branch + SHA

- Preparation branch: `codex/flagstone-p03b-r11-final-owner-runbook-20260919`
- Preparation worktree: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-runbook-20260919`
- Preparation base: `3dd4e47dc35580c3b907daa9631b1db4c536cda6`
- Base tree: `933e9194525a2c843a184656197031d76065f639`
- Independent review: `4459327012432a52c2ce72bdc4589fc76dd6520e`
- Runbook artifact commit: the commit containing this report; recorded exactly in the final handoff.

## Runbook identities

- Final owner branch created only when Sky runs the compact block: `owner/flagstone-p03b-r11-final-production-execution-20260919`
- Final owner worktree created only when Sky runs the compact block: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-production-execution-20260919`
- Runbook: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-runbook-20260919/qa-reports/2026-09-19_Codex_Phase03B_R11_Final_Owner_Runbook.md`
- Canonical controller after the final worktree is created: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-production-execution-20260919/qa-reports/phase03b/2026-09-19-production-apply-packet-r11/execute_cutover_controller.mjs`

## Gates

### Compact block syntax

The exact block was extracted from the heredoc opener through its terminator and passed to `zsh -n`.

Result: exit `0`; `RUNBOOK_SHELL_SYNTAX: PASS`.

### Commit:path expansion smoke test

All three Git commit:path expressions use the braced form:

```text
"${R11_REVIEW_SHA}:qa-reports/2026-09-19_Codex_Phase03B_R11_History_Support_Independent_Review.md"
```

The exact path was checked with `git cat-file -e` and both required review predicates were read with `git show` from commit `4459327012432a52c2ce72bdc4589fc76dd6520e`.

Result: exit `0`; `COMMIT_PATH_EXPANSION_SMOKE_TEST: PASS`. No unbraced `$VARIABLE:path` expression exists in the compact block.

### Accepted repair paths and parsers

- Every script, SQL file, accepted receipt, manifest, and migration referenced by the block exists at `3dd4e47dc35580c3b907daa9631b1db4c536cda6`.
- `node --check` passed for the controller, adjudicator, builder, control library, local history validator, live transport validator, and privacy scanner.
- Supabase CLI is exactly `2.116.0`; `db push --help` and `db query --help` expose every flag used by the block.
- The final owner branch and worktree path are unused. No R7 or earlier R11 owner execution path appears in the compact block.

### History-support transport

```bash
node qa-reports/phase03b/2026-09-19-production-apply-packet-r11/run_history_support_fail_closed_local_validation.mjs --evidence=/tmp/flagstone-r11-final-runbook-local.qrjGY0
```

Result: exit `0`; prior transport `22/22`; new history fail-closed `22/22`; all child checks true; numeric child exits `[0,0,0,0]`; temporary validation infrastructure destroyed; production inputs accepted `false`; production mutations `NONE`; quiescence `false`; controller execution `false`; apply `false`.

This proves the generated 85 history-support files are exact abort-first tripwires, contain no real historical bodies, fail before later marker SQL, cannot become silently applied, and remain bound to the repaired controller's fresh pre-apply ledger check.

### Candidate freeze

```bash
git diff --exit-code 9d638456fa8e679678c54f131fe8f0db723eda72 3dd4e47dc35580c3b907daa9631b1db4c536cda6 -- supabase/migrations-next/phase03b/20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql supabase/migrations-next/phase03b/20260915210413_phase03b_points_integrity.sql
```

Result: exit `0`; `CANDIDATE_BYTES_CHANGED: NO`.

### Negative/static checks

- Prior broken unbraced variable-colon expansion: absent.
- Obsolete R7 or earlier R11 owner paths: absent.
- Obsolete two-file-only workspace construction or migration-copy command: absent.
- Repaired `run_live_transport_validation.mjs`, local fail-closed validator, `ABORT_FIRST_TRIPWIRE` manifest, and post-quiescence pre-apply ledger/workspace checks: present.
- Obsolete historical pg_net fingerprints as an authorization predicate: absent; the block requires the committed `DIAGNOSTIC_HISTORY_ONLY` classification.
- Controller invocation count in the block: exactly one.
- Exact typed owner confirmation: exactly one.
- Live target-pinned dry run during generation: `NOT_RUN`.
- Production controller during generation: not launched.

### Harness correction

The first referenced-path test harness used `path` as a zsh loop variable. In zsh that special variable mirrors `PATH`, so the harness made commands temporarily unresolvable and tested nothing. The runbook uses `required_path`, was unaffected, and the corrected harness passed all checks. This was a self-validation harness error, not a runbook or packet failure.

### Patch hygiene

```bash
git diff --check
```

Result: exit `0`; no whitespace errors.

## What's left

- Sky may hold or personally run the single compact block.
- The block itself will create the fresh final owner worktree, rerun local and target-pinned read-only gates, print the human checkpoint, and require the exact phrase before the controller can launch.
- If launched, any controller outcome must be preserved without retry.
- A successful evidence tree still requires a genuinely fresh independent post-apply reviewer.

## Final safety state

```text
PRODUCTION_MUTATIONS: NONE
QUIESCENCE_ENTERED: NO
PRODUCTION_APPLY_EXECUTED: NO
ONE_RUN_AUTHORIZATION_STATUS: UNUSED
PHASE_03C_STARTED: NO
```
