# Phase 03B — restoration closure report

**Mode:** local-only, offline-only. No Supabase CLI invoked by this session. No production/staging contact by this session.
**Reviewed by:** Claude (Sonnet 5), fresh session, independent of the session that ran the restoration.
**Authorization:** Sky personally authorized, in chat, exactly one Phase 03B production restoration attempt against `kldlwszpfkdmsjrjhjym` (removal of the three reviewed temporary quiescence-gate objects only; no migration apply; no retry; immediate post-exit verification; no Phase 03C) and personally ran the reviewed Terminal commands. This report only independently re-derives what the saved on-disk evidence shows about the outcome of that run — it does not itself authorize anything further.

## What I actually did

I did not take the incoming task's asserted PASS list on faith. I read the real files on disk in this worktree and, where possible, traced each predicate back to the script logic that produced it, cross-checked against the scripts actually referenced by `RESTORATION_RUNBOOK.md` (not a stale earlier packet variant that happens to share a filename), and checked for any second/duplicate attempt.

Evidence inspected:
- `qa-reports/phase03b/2026-09-20-restoration-runbook/EXIT_RUN_RECEIPT.json` (pre-exit quiescence checkpoint, captured 2026-09-21T02:20:42.313Z)
- `qa-reports/phase03b/2026-09-20-restoration-runbook/POST_EXIT_EVIDENCE_20260921T022040Z/POST_EXIT_VERIFIER_RECEIPT.json` (the authoritative post-exit comparator envelope, captured 2026-09-21T02:20:48.532Z)
- `.../POST_EXIT_EVIDENCE_20260921T022040Z/{BOUND_POST_EXIT_VERIFY.sql, STRUCTURAL_CAPTURE_READ_ONLY.sql, structure.stdout.log, NORMALIZED_STRUCTURE.json, post-exit-proof.stdout.log, edge-function.stdout.log}`
- `qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/CAPTURED_PRE_RESTORATION_20260921T021742Z/note.json`
- `qa-reports/phase03b/2026-09-19-production-apply-packet-r11/verify_post_exit.mjs` — the script `RESTORATION_RUNBOOK.md` §5 actually names as "the already-reviewed `verify_post_exit.mjs`", and its dependencies `r8_control_lib.mjs`, `phase03b_statement_identity.mjs`, `preexisting_structure_exclusions.mjs`
- `scripts/structural-catalog.mjs` (what the structural hash actually covers)
- `qa-reports/phase03b/CURRENT_RECOVERY_STATE.json` / `CURRENT_RECOVERY_HANDOFF.md` (last committed checkpoint, pre-restoration)
- `git status`, `git log`, `find` across the worktree for duplicate evidence or Phase03C artifacts

One thing worth flagging honestly: I initially diffed the observed receipt against `qa-reports/phase03b/2026-09-18-production-apply-packet-r8/verify_post_exit.mjs` and saw apparent mismatches (that script hardcodes `http_response_count: 6` and per-migration `statement_count: 1`, neither of which match the observed `3` and `68`/`23`). That r8 file is a **stale, superseded packet** — the runbook explicitly names the r11 copy as the reviewed script, which computes the ledger-row expectations dynamically from the frozen migration files on disk (`deriveExpectedPhase03bRows`) and checks pg_net/HTTP state relative to the run's own baseline (`validateRunRelativePgNetCheckpoint`) rather than against fixed constants. Checked against the correct (r11) script, there is no discrepancy. Noting this so the trail of what I checked and ruled out is visible, not just the conclusion.

## Predicate-by-predicate verification

| Predicate | Result | Evidence |
|---|---|---|
| Temporary gate function absent | **ABSENT** | `POST_EXIT_VERIFIER_RECEIPT.json` → `observed.proof.function_count: 0` (query directly counts `private.flagstone_phase03b_block_row_lifecycle_r2` in `BOUND_POST_EXIT_VERIFY.sql`) |
| Row-lifecycle quiescence trigger | **ABSENT** | Same receipt → `observed.proof.reserved_trigger_count: 0` (counts both `aaa_flagstone_phase03b_row_lifecycle_quiescence_r2` and the truncate trigger by name against `public.flags`) |
| Truncate quiescence trigger | **ABSENT** | Same field as above — the SQL counts both named triggers together and both are gone; pre-exit checkpoint (`EXIT_RUN_RECEIPT.json`) confirms both trigger OIDs (20773, 20774) still existed seconds before the exit ran, so this is a real before/after, not an artifact of a query that always reads zero |
| Ledger count remains 87 | **CONFIRMED** | `ledger_count: 87`, `ledger_unique_count: 87` in the post-exit proof |
| Exact Phase 03B migration identity unchanged | **CONFIRMED** | `phase03b_versions: ["20260915210256","20260915210413"]`; the comparator (`verify_post_exit.mjs` r11) recomputes the expected statement hashes live from the frozen migration files under `supabase/migrations-next/phase03b/` and throws on any mismatch — the receipt shows no `comparatorError` and `status: PASS_RESTORED`, so this comparison passed |
| Final structure PASS | **CONFIRMED** | `observed.normalizedStructureSha256` = `f185495387290e1...` = `expected.finalStructureSha256`, the same accepted hash pinned throughout this saga since before the incident |
| Permissions/RLS PASS | **CONFIRMED (structural)** | `scripts/structural-catalog.mjs` explicitly includes `relrowsecurity`/`relforcerowsecurity`, `pg_policies` (RLS policies), and ACL/grants at table/column/function/schema/role level in the hashed catalog; since the whole-catalog hash matched exactly, RLS and permissions state is byte-identical to the accepted final state |
| Moderation PASS | **CONFIRMED** | `phase03b_constraint_index_sha256` in the post-exit proof matches the value hardcoded in the reviewed comparator; that hash is scoped (per `BOUND_POST_EXIT_VERIFY.sql`) to exactly the moderation-related tables/constraints/indexes (`flag_moderation_events`, the moderation vocabulary/pairing constraints, etc.) |
| Points PASS | **CONFIRMED** | Same `phase03b_constraint_index_sha256` scope also covers `flag_point_reward_claims`, `comment_reward_daily`, `comment_vote_reward_counts` and their indexes |
| pg_net / HTTP safety PASS | **CONFIRMED** | `validateRunRelativePgNetCheckpoint()` in `r8_control_lib.mjs` requires `http_queue_count: 0`, `http_response_new_since_t0_count: 0` (both observed), `transaction_read_only: 'on'` (observed), and `pg_net_ttl_seconds > 600`s (observed `21600`s / 6h) — all satisfied; zero new outbound HTTP since the original incident T0 |
| Restoration attempt count exactly 1 | **CONFIRMED (structurally, not from a named counter)** | Exactly one `POST_EXIT_EVIDENCE_*` directory, one `EXIT_RUN_RECEIPT.json`, one `CAPTURED_PRE_RESTORATION_*` directory exist anywhere in this worktree (`find` across the whole tree); the script refuses to reuse or overwrite an existing evidence directory, and a single `controllerPid`/`controllerMonotonicOrigin`/`runId` (`27068` / `217463476` / `ebdba703-...`) appears everywhere it's recorded, with no second value anywhere |
| No migration apply retry | **CONFIRMED** | Ledger stayed at exactly 87 rows with the same latest version (`20260915210413`); the restoration SQL's own scope (per `RESTORATION_RUNBOOK.md`) is DROP-only against 3 named objects, no `INSERT`/migration-table write |
| No production controller rerun | **CONFIRMED** | Same single `controllerPid`/`controllerMonotonicOrigin` as above appears in every receipt that carries it; no second/different value found anywhere in the worktree |
| Phase 03C not started | **CONFIRMED** | `find . -iname "*phase03c*"` (and the `_03c` variant) returns nothing anywhere in the worktree |

## Overall

Every required predicate is independently confirmed from saved, on-disk evidence — not from the incoming task's assertions and not from re-contacting production. I did not run any live command in the course of this verification.

**PHASE_03B_CLOSURE_STATUS: CLOSED**

## What closure does and does not mean

This closes the Phase 03B **restoration** (undoing the temporary quiescence gate left over from the original incident) as verified-safe. It does **not** decide the separate question of whether/when the underlying Phase 03B migrations should be merged into `main`/canonical — that is explicitly Sky's own separate decision, per this repo's standing Constitution rule that no agent merges to `main`, and per Sky's own instruction in this conversation not to have this session decide that.

NEXT_SAFE_ACTION: Await Sky's separate owner decision and authorization for the Phase 03B merge into main/canonical.
