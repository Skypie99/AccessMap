# Phase 03B R11 history-support fail-closed repair

## Outcome

`PASS` for the bounded repair and permitted validation scope.

The 85 history-support migration files now preserve only the historical filename/version identities required by Supabase CLI reconciliation. Their historical SQL bodies are not copied into the apply workspace. Each support file is generated as an abort-first `DO` block whose first executable operation raises `PHASE03B_HISTORY_SUPPORT_SELECTED_PENDING`.

The controller also repeats the exact accepted production-ledger read immediately before apply dispatch, rejects any ledger change, revalidates the same tripwire workspace against that fresh ledger, and rejects any history-support version in the pending plan.

No production mutation, quiescence, controller execution, migration apply, migration repair, database pull, staging mutation, release, or Phase 03C action occurred.

## Fixed defect

The prior transport copied real historical SQL into support files. If production migration history changed after plan validation and the CLI reclassified a support file as pending, that historical SQL could have become executable. The repaired transport contains no historical bodies and aborts before any historical operation even under unexpected selection.

## Evidence

- Local receipt: `HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_EVIDENCE/HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_VALIDATION_RECEIPT.json`
  - Prior transport regressions: `22/22`.
  - New history-support fail-closed regressions: `22/22`.
  - Preserved R11 controller controls: `PASS`.
  - Preserved disposable PostgreSQL lifecycle replay: `PASS`.
  - All four child processes exited numerically with `0`; temporary infrastructure was destroyed.
- Live receipt: `HISTORY_SUPPORT_FAIL_CLOSED_LIVE_EVIDENCE/LIVE_TRANSPORT_VALIDATION_RECEIPT.json`
  - Supabase CLI: `2.116.0`.
  - Exact target: `kldlwszpfkdmsjrjhjym`.
  - Read-only production ledger: `85` rows, digest `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`.
  - History-support count: `85`; mode: `ABORT_FIRST_TRIPWIRE`.
  - Dry run: `dryRun=true`, `upToDate=false`, exactly two pending migrations, no seeds, no roles.
  - Production mutations: `NONE`; controller and apply were not executed.

## Frozen pending migrations

1. `20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql`
   - SHA-256: `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11`
2. `20260915210413_phase03b_points_integrity.sql`
   - SHA-256: `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`

Both files remain byte-identical to candidate `9d638456fa8e679678c54f131fe8f0db723eda72` / tree `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`.

## Boundary

This repair restores the required fail-closed transport property only. It does not authorize a production run. The next safe action is one genuinely fresh narrow independent review of the single repair evidence commit.
