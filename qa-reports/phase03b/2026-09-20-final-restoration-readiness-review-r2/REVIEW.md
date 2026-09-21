# Phase 03B — final independent restoration-readiness review (r2)

**Mode:** fresh independent review, local-only, offline. No production or staging
contact. No mutation of any kind. Restoration not executed. Phase 03C not started.

Reviewed the hardening commit `a134cbb4a08103c5c28a3af140b67847cbcb22e2`
("fix(phase03b): harden restoration-runbook preflight (F1/F2), close stale evidence
text (F3/F4)"), which claims to repair the two blocking findings (F1, F2) and both
non-blocking findings (F3, F4) from the prior review at
`qa-reports/phase03b/2026-09-20-final-restoration-readiness-review/REVIEW.md`
(status HOLD, reviewed at `8fdbd2d`). This review does not trust that prior repair's
own summary of itself — every claim below was re-derived from disk in this session.

## 1. Ground truth

- Branch: `codex/flagstone-p03b-post-apply-recovery-20260919`
- HEAD: `a134cbb4a08103c5c28a3af140b67847cbcb22e2` (the commit under review — current)
- Worktree: clean (`git status` — nothing to commit)
- `CURRENT_RECOVERY_STATE.json` / `CURRENT_RECOVERY_HANDOFF.md` confirmed, verbatim:
  - `INCIDENT_RUN_ID`: `ebdba703-2470-41fa-ac6d-44354203b8d1`
  - `ORIGINAL_DATABASE_T0`: `2026-09-20T06:20:25.216974Z`
  - `PRODUCTION_APPLY_ATTEMPT_COUNT`: `1`
  - `ORIGINAL_ONE_RUN_AUTHORIZATION_STATUS`: `CONSUMED`
  - Restoration: **NOT_EXECUTED**
  - Phase 03C: **NOT_STARTED** (no matching file, directory, or branch found anywhere
    in the tree; `phase03c` only appears as prose inside historical report filenames
    discussing the topic, never as an artifact)

## 2. Saved evidence — comparator re-run

Ran `compare_captured_results.mjs --captured=.../CAPTURED_FINAL_STRUCTURE/` directly
against the on-disk evidence (`proof.json`, `structure_catalog.json`,
`edge_function.json` — all three present):

```
overall: PASS
LIVE_GATE_AND_LEDGER: PASS
FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: PASS (hash f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7)
EDGE_FUNCTION_IDENTITY: PASS (hash 276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70)
CLIENT_COMPATIBILITY: NOT_RUN (documented in the tool's own output as expected/non-blocking — only provable via local disposable-cluster pgTAP replay, never live)
```

Also re-ran `validate_verdict_aggregation.mjs` (the aggregation-bug regression suite
from the prior repair cycle): 16/16 passed, confirming a `NOT_RUN` on a required
section still forces `HOLD`, `CLIENT_COMPATIBILITY` `NOT_RUN` does not block `PASS`,
and any `FAIL` still forces overall `FAIL` — aggregation semantics unchanged.

Independently confirmed malformed/empty JSON fails closed: pointed the comparator at
a directory with a syntactically invalid `proof.json` — it threw and exited non-zero
rather than reporting a false PASS.

## 3. F1–F4 verification (re-derived from `RESTORATION_RUNBOOK.md` §8 as it exists on disk today)

- **F1 (fail-fast preflight) — CLOSED.** §8 step-1 opens with `set -euo pipefail`.
  Every previous `supabase ... | jq ...` construct is now a separate checked capture
  command followed by a separate checked `jq -e` extraction — no pipe can mask a
  failed upstream command. Verified by reading the block directly (lines 193–279 of
  `RESTORATION_RUNBOOK.md`).
- **F2 (CLI version guard) — CLOSED.** `ACTUAL_CLI_VERSION="$(supabase --version)"`
  is checked against the pinned `2.116.0` and refuses before any live-capable command
  (the ref-pin check runs first, then the CLI-version check, then the file-existence
  checks, then and only then the three `supabase db query` / `supabase functions list`
  calls).
- **F3 (target identity) — CLOSED, correctly caveated rather than fabricated.**
  Production ref pinned exactly `kldlwszpfkdmsjrjhjym`; staging ref
  `cepayqmsoqxshsiyqnvz` explicitly rejected. Documented production identity:
  `Accessable City App`, region `us-west-2`, Postgres `17` — from the 2026-09-19
  `LIVE_TARGET_IDENTITY.json` capture, not refreshed live in this review, per
  instructions. §2 honestly documents that `TARGET_IDENTITY` reads a caveat for the
  *historical* evidence directory (no `note.json` was ever written by the external
  capture tool) rather than fabricating one after the fact — this is correct
  behavior, not a defect.
- **F4 (evidence documentation) — CLOSED.** §2 and §10 no longer describe
  `proof.json` / `edge_function.json` as missing or asserted-only; all three
  live-evidence rows are now documented as INDEPENDENTLY VERIFIED, matching what
  this review's own comparator re-run reproduced in §2 above.

## 4. Restoration runbook

`qa-reports/phase03b/2026-09-20-restoration-runbook/RESTORATION_RUNBOOK.md` binds
exactly to Run ID `ebdba703-2470-41fa-ac6d-44354203b8d1` and T0
`2026-09-20T06:20:25.216974Z` (§1 table, confirmed against `ENTRY_RECEIPT.json`).
Authorizes exactly one restoration attempt (`attemptsAuthorized: 1`,
`automaticRetryOnFailureOrAmbiguity: false` per `CURRENT_RECOVERY_STATE.json`
`RESTORATION_RUNBOOK.restorationScope`). §8 steps 2–3 (the actual write and the
post-exit verify) are commented out; no migration-apply command anywhere in the
document. §7 states any ambiguous outcome is a HOLD, never an automatic retry.

## 5. Restoration SQL — independent regeneration

Ran `generate_exit_sql.mjs --entry=.../ENTRY_RECEIPT.json --output=<fresh temp path>`
using the same generator and the same committed entry receipt, then diffed the
output against the committed `PHASE03B_RESTORATION_EXIT.sql`:

```
diff: (no output — byte-identical)
```

- Zero unresolved `__ENTRY_*__` / `__DATABASE_T0__` tokens (grep found none).
- No hand-editing evidence — the file is a mechanical `generate_exit_sql.mjs` product.
- Exact incident binding confirmed: `database_t0` embedded in the SQL
  (`2026-09-20T06:20:25.216974Z`) and `runId` in the source entry receipt
  (`ebdba703-2470-41fa-ac6d-44354203b8d1`) both match.
- Enumerated every DDL-capable statement in the file (`drop|alter|create|truncate|
  delete|update|insert|grant|revoke`, case-insensitive): exactly three matches, all
  `drop`, and no others:
  ```
  drop trigger aaa_flagstone_phase03b_truncate_quiescence_r3 on public.flags;
  drop trigger aaa_flagstone_phase03b_row_lifecycle_quiescence_r2 on public.flags;
  drop function private.flagstone_phase03b_block_row_lifecycle_r2();
  ```
  These are the exact three named objects (2 exact-named triggers on `public.flags`,
  1 exact-named private function) — no wildcard, no prefix match. No changes to the
  migration ledger, any product table/column, RLS policy, grant, other function, or
  Edge Function — the guard block only *reads* these to verify invariants, the write
  section touches nothing but the three named objects, and the file contains no
  `ALTER`/`INSERT`/`UPDATE`/`GRANT`/`REVOKE` anywhere.

## 6. Owner preflight safety (§8 step 1, re-read directly)

- `set -euo pipefail` present. ✅
- Exact absolute paths (`HANDOFF`, `RUNBOOK` readonly vars, hardcoded to this
  worktree). ✅
- Exact production ref pinned + staging ref explicitly rejected (double-checked, not
  just "trust the constant"). ✅
- CLI version guard (`2.116.0`) runs before any of the three live-capable commands. ✅
- Required-file existence checks (all three inputs) before any live call. ✅
- Evidence/output-path collision refusal (`if [ -e "$OUT" ]; then ... exit 1`). ✅
- Malformed/empty JSON fails closed: each capture uses `jq -e '<condition> != null'`
  immediately after capture, which exits non-zero (triggering `set -e`) on
  null/missing/malformed content; independently reproduced the same fail-closed
  behavior in the standalone `compare_captured_results.mjs` (§2 above). ✅
- No migration-apply command anywhere in step 1. ✅
- No controller rerun. ✅
- No automatic retry — every failure path is a single `exit 1`. ✅
- Steps 2–3 (the actual write, and the post-exit verify) are commented out in the
  same script block — not a separate file, so restoration and its immediate
  post-exit verification stay in one owner execution session by construction. ✅

## 7. Restoration semantics

- Exactly one restoration attempt authorized (confirmed in both the runbook prose
  and the checkpoint JSON).
- No automatic retry anywhere in the exit SQL, the runbook, or `verify_post_exit.mjs`.
- §7 of the runbook explicitly classifies every ambiguous outcome (dropped
  connection, ambiguous CLI exit code, exception mid-transaction) as HOLD, and
  requires re-running only the read-only proofs to find out what happened — never
  re-running the exit SQL itself.
- Restoration (§8 step 2) and post-exit verification (§8 step 3) live in the same
  commented block of the same script — one owner sitting, not split across sessions.

## 8. Post-exit verifier (`verify_post_exit.mjs`, read directly)

Confirmed it requires, after restoration: temporary gate function absent
(`function_count = 0`), row-lifecycle trigger and truncate trigger both absent
(`reserved_trigger_count = 0`), ledger remains 87 rows
(`ledger_count`/`ledger_unique_count`), exact Phase03B migration versions present
(`phase03b_versions === ['20260915210256','20260915210413']`), migration statement
identity unchanged (`ledger_ordered_version_name_sha256` pinned constant,
`validateExactLedgerRows`), final normalized structure hashes to the accepted
constant (`f185495387290e1...`, after applying only the 7-table preexisting-backup
exclusion — the 3-object gate exclusion no longer applies since the objects are
actually gone), Edge Function identity hash matches (`276dcb14c85ca79...`), and
pg_net/HTTP safety (`validateRunRelativePgNetCheckpoint`, read-only transaction
required). Fail-closed: `status` starts at `'HOLD'` and is only set to
`'PASS_RESTORED'` if every check passes; the single `catch` block records the error
and sets a non-zero exit code without ever flipping status away from `HOLD`. No
retry loop — one `try/catch/finally`, no loop construct anywhere. No migration-apply
command. No mutation beyond what §5's exit SQL itself performs (this script is
read-only: structural capture SQL is explicitly wrapped
`begin transaction read only; ...; rollback;`, and the post-exit proof query is
required to report `transaction_read_only: 'on'`).

## 9. Immutability

`git show --stat a134cbb` touches exactly three files: `RESTORATION_RUNBOOK.md`,
`CURRENT_RECOVERY_HANDOFF.md`, `CURRENT_RECOVERY_STATE.json`. Independently confirmed
untouched by this commit (and by this review):

- `PHASE03B_RESTORATION_EXIT.sql` — regenerated fresh from the entry receipt this
  session, byte-identical to the committed copy.
- `verify_post_exit.mjs` — `git log` shows its last touch is `3420d87` (the
  already-reviewed structural-exclusion repair); no commits since.
- Frozen Phase03B migration files (`20260915210256`, `20260915210413`) — `git log`
  shows both last touched 2026-09-15, days before the incident T0
  (`2026-09-20T06:20:25Z`); current file hashes match the same pinned constants
  referenced continuously in reports dating back to 2026-09-03.
- The 7-table exclusion contract/module — last touched at `3420d87`, same as above;
  content re-read directly confirms exact `(schema, table)` equality matching, no
  wildcard or prefix logic, and an assertion that exactly 7 relations are removed.
- Comparator aggregation semantics — `verdict_aggregation.mjs` re-read directly;
  `REQUIRED_LIVE_SECTIONS` is still exactly the three sections from the prior repair,
  `CLIENT_COMPATIBILITY` still excluded from that list, `fail()` still unconditionally
  forces `FAIL`.
- No Phase 03C file, directory, commit, or branch exists anywhere in the tree.

## Verdict

All items in the original task's checklist (§§1–9) were independently re-derived
from disk and pass. The two blocking findings (F1, F2) from the prior review are
genuinely closed, not just asserted closed — this review re-read the actual bash
block and did not rely on the repair commit's own description of itself. The two
non-blocking findings (F3, F4) are also closed, and closed honestly (no fabricated
`note.json`, no retroactive evidence).

**INDEPENDENT_FINAL_RESTORATION_READINESS_REVIEW: PASS**
**RESTORATION_RUNBOOK: READY_FOR_OWNER_AUTHORIZATION**

No production or staging contact was made at any point in this review. No file
outside `qa-reports/phase03b/` was modified. Restoration has not been executed.
Phase 03C has not started.
