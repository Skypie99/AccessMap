# R11 execution-transport repair

Prompt: `FLAGSTONE-P03B-R11-EXECUTION-TRANSPORT-REPAIR-20260919`

## Scope

This commit supersedes only the R11 assumption that the Supabase CLI workdir may contain only the two pending Phase 03B migration files. The accepted R11 safety design and the frozen migration bytes are unchanged.

The accepted R11 `ARTIFACT_MANIFEST.*` remains historical evidence for packet commit `cf683eac2f50a284d8dc897db98a91290e9b6bc0`; it is not a manifest of this later transport-repair commit. Git commit identity is the immutable boundary for this narrow repair review.

## Root cause

Supabase CLI 2.116.0 reconciles local migration versions with the remote `supabase_migrations.schema_migrations` ledger before producing a db-push plan. A workdir containing only the two new migrations omitted all 85 already-applied remote versions, so the CLI returned `LegacyDbPushMissingLocalError` before it could produce the exact pending plan.

## Repair

- Capture the production migration ledger in a target-pinned read-only transaction before workspace construction.
- Require the live ledger to equal the committed accepted 85-row ledger, including row order and SHA-256.
- Build a disposable workspace from the 85 real historical migration files in accepted packet commit `cf683eac2f50a284d8dc897db98a91290e9b6bc0` plus the two frozen pending Phase 03B files.
- Classify and validate all 85 earlier files as `HISTORY_SUPPORT` and exactly two files as `PENDING_PHASE03B`; fail closed on missing, extra, duplicate, seed, role, helper SQL, order, or hash drift.
- Use this same workspace for the controller's internal dry run and single apply dispatch. Re-inventory it against its manifest immediately before the apply dispatch.

Historical files are not selected by this run: the accepted remote ledger contains all 85 history-support versions, and the authoritative target-pinned dry run returns only the two frozen Phase 03B filenames with `seeds=[]` and `roles=[]`.

## Evidence

- Live target-pinned ledger: 85 rows, latest `20260911120000`, ordered digest `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`, transaction read-only `on`.
- Live target-pinned Supabase CLI 2.116.0 dry run: PASS; `dryRun=true`, `upToDate=false`, exact two pending files in order, no seeds, no roles.
- Focused transport regression suite: 22/22 PASS.
- Preserved R11 control suite: PASS.
- Preserved disposable PostgreSQL 17 SQL gate suite: PASS.
- Numeric child exits: all zero.
- Candidate migration hashes remain:
  - `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11`
  - `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`

## Safety boundary

Production mutations: none. Quiescence entered: no. Controller executed: no. Production apply executed: no. One-run authorization remains unused. Phase 03C was not started.

Disposition: ready for one genuinely fresh, narrow independent review of this transport diff only. This is not production-apply authority.
