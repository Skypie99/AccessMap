# Phase 03B R11 execution-transport repair

## What changed

- Repaired the R11 Supabase CLI workspace builder so it reconciles the exact accepted 85-row production history and includes exactly the two frozen pending Phase 03B migrations.
- Added a target-pinned read-only production-ledger capture and exact ledger validator.
- Updated the actual controller so its dry run and apply dispatch use the same repaired workspace, with a fresh manifest guard immediately before apply.
- Added 22 focused transport regressions and captured the permitted live read-only/dry-run evidence.
- Added no product or migration semantic changes. The two candidate migration files are byte-identical.

## Branch + SHA

- Branch: `codex/flagstone-p03b-r11-execution-transport-repair-20260919`
- Base / independent R11 review evidence: `e957f781ef5e52ace234d25dd808a05d6032ea77`
- R11 packet evidence: `cf683eac2f50a284d8dc897db98a91290e9b6bc0`
- Repair evidence SHA: the single commit containing this report; recorded exactly in the task handoff after commit creation.

## Gates

- `node --check` for every changed or added `.mjs`: PASS.
- `node validate_transport_repair.mjs`: PASS, 22/22.
- `node validate_r8_controls.mjs`: PASS; all preserved R11/R10/R9/R8/R7/R6/R5 control groups remain green.
- `node validate_quiescence_local.mjs`: PASS against disposable socket-only PostgreSQL 17; temporary infrastructure destroyed.
- `supabase --version`: `2.116.0`.
- Target-pinned `PRODUCTION_MIGRATION_LEDGER_READ_ONLY.sql`: exit 0; transaction read-only `on`; exact accepted 85 rows.
- Target-pinned `supabase db push --dry-run --skip-vault --include-all --output-format json`: exit 0; exact two pending migrations, no seeds, no roles.
- `git diff --check`: PASS.
- Candidate SHA-256 checks: PASS for both frozen Phase 03B migration files.
- Credential-pattern scan over all new transport evidence and code: no matches.

## What's left

One genuinely fresh independent reviewer must review only this transport repair commit. No production controller run or apply is authorized by this work.

## DECISIONS FOR SKY

Decision: whether to accept the narrow transport repair after a genuinely fresh independent review.

Recommendation: review and accept the single repair evidence commit if the reviewer independently confirms the live dry-run evidence, exact history reconciliation, exact-two-pending guard, and same-workspace controller path.

Why: the live Supabase CLI 2.116.0 dry run now succeeds with the exact two frozen pending migrations while all accepted R11 safety controls remain unchanged and green.

Alternative: hold R11 without production execution.

Impact: acceptance restores an executable transport path but does not itself authorize quiescence, controller launch, or production apply.
