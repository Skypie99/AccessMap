# Phase 03B evidence-aggregator repair — narrow independent review

**Reviewed artifact:** commit `c54bc2492039fd0e2c66c8f98c57f6e9b01d3729`
(`fix(phase03b): repair compare_captured_results.mjs NOT_RUN aggregation defect`)
**Mode:** Fresh independent review, local/offline only. No production or staging contact.
No mutation. No execution of the owner evidence-capture commands. No restoration.
**Verdict:** **PASS**
**Reviewed at HEAD:** `c54bc2492039fd0e2c66c8f98c57f6e9b01d3729` (branch
`codex/flagstone-p03b-post-apply-recovery-20260919`, worktree clean before this review
began; this review adds only this new report directory plus the matching checkpoint
update, mirroring every prior review in this saga)

## Ground truth independently established (not taken from the repair's own commit message)

- `git rev-parse --abbrev-ref HEAD` / `git rev-parse HEAD` at session start: HEAD **is**
  `c54bc2492039fd0e2c66c8f98c57f6e9b01d3729` itself (not merely an ancestor), branch
  `codex/flagstone-p03b-post-apply-recovery-20260919`, `git status` clean.
- Located the prior independent review this repair responds to:
  `qa-reports/phase03b/2026-09-20-restoration-runbook-independent-review/REVIEW.md`
  (commit `80fe3dd`, the direct parent of the repair commit) — verdict **HOLD**, blocking
  defect exactly as this repair's commit message states: `compare_captured_results.mjs`
  aggregated a `NOT_RUN` on `LIVE_GATE_AND_LEDGER`/`EDGE_FUNCTION_IDENTITY` into
  `overall: PASS`/exit `0`, reproduced live against the real on-disk evidence directory.
- Read the full diff of `c54bc24` myself (`git show`), not the summary: touches exactly 6
  files — 3 new (`CAPTURE_MISSING_EVIDENCE.md`, `verdict_aggregation.mjs`,
  `validate_verdict_aggregation.mjs`), 1 modified code file
  (`compare_captured_results.mjs`, +13/-19 lines, purely the aggregator-extraction swap),
  and the 2 checkpoint docs. No other file touched.
- Read `compare_captured_results.mjs` in full at HEAD. The change is exactly what the
  commit claims: one new import, `const aggregator = createAggregator(); const {
  report, fail, pass, hold, notRun } = aggregator;` replacing the five inline closures,
  and the final `console.log`/`process.exitCode` lines reading from `aggregator.overall`
  / `aggregator.exitCode` instead of local variables. Every other line — target-identity
  check, the quiescence/ledger/pg_net field-by-field comparison, the exact 3-object gate
  exclusion + `applyPreexistingStructureExclusions` + `normalizeCatalog`/`checksum` call
  for structure, the Edge Function identity hash comparison, and the
  `notRun('CLIENT_COMPATIBILITY', ...)` call — is byte-identical to what the prior HOLD
  review already read and did not fault.
- Read the new `verdict_aggregation.mjs` in full. `REQUIRED_LIVE_SECTIONS` is exactly the
  three sections the task specifies (`LIVE_GATE_AND_LEDGER`,
  `FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS`, `EDGE_FUNCTION_IDENTITY`), no more,
  no fewer. `fail()` unconditionally sets `overall = 'FAIL'`. `hold()` and `notRun()`
  each only raise `overall` from `'PASS'` to `'HOLD'` (guarded by `if (overall ===
  'PASS')`), so neither can ever downgrade an already-`'FAIL'` verdict back down —
  `fail()`'s unconditional assignment always wins regardless of call order. `notRun()`
  only affects `overall` when the section is in `REQUIRED_LIVE_SECTIONS`; a
  `CLIENT_COMPATIBILITY` `notRun()` is recorded in `report` but never touches `overall`.
  `exitCode` getter is `overall === 'PASS' ? 0 : 1` — there is no code path that leaves
  `overall` as the literal string `'NOT_RUN'`, so (unlike the pre-repair script) the old
  `overall === 'PASS' || overall === 'NOT_RUN' ? 0 : 1` ambiguity is structurally gone,
  not just patched around.

## Independent focused-test reproduction (re-run myself, not trusted from the commit)

Ran `node .../2026-09-20-third-live-verification-external-handoff/validate_verdict_aggregation.mjs`
myself: **16/16 PASS**, exit 0. Confirmed the JSON output covers, individually:

| # | Scenario (per the review brief) | Required | Observed |
|---|---|---|---|
| 1 | structure PASS + proof NOT_RUN + edge NOT_RUN | HOLD, non-zero | HOLD, non-zero — match |
| 2 | structure PASS + proof PASS + edge NOT_RUN | HOLD, non-zero | HOLD, non-zero — match |
| 3 | structure PASS + proof NOT_RUN + edge PASS | HOLD, non-zero | HOLD, non-zero — match |
| 4 | proof PASS + structure PASS + edge PASS | PASS, exit 0 | PASS, exit 0 — match |
| 5 | any required section FAIL (each of the 3, plus both call orders vs. a NOT_RUN) | FAIL, non-zero | FAIL, non-zero in all 5 sub-cases — match |
| 6 | any required section HOLD (each of the 3) | HOLD, non-zero | HOLD, non-zero in all 3 sub-cases — match |
| 7 | all required PASS + CLIENT_COMPATIBILITY NOT_RUN | PASS, exit 0 | PASS, exit 0, `CLIENT_COMPATIBILITY` still reported `NOT_RUN` — match |

Also present and passing: a direct regression guard reproducing the *original* defect
shape (a bare `notRun()` on `LIVE_GATE_AND_LEDGER` alone must not leave `overall`
`'PASS'`) and a check that a `TARGET_IDENTITY` `FAIL` (a section outside
`REQUIRED_LIVE_SECTIONS`) still unconditionally forces `overall: FAIL` — proving the
repair narrowed `NOT_RUN` handling without weakening `FAIL` handling anywhere else.

**Live reproduction against the real, still-incomplete evidence directory** (not a
synthetic fixture): ran the actual `compare_captured_results.mjs` against the actual
`CAPTURED_FINAL_STRUCTURE/` directory on disk, which today contains only
`structure_catalog.json` (no `proof.json`, no `edge_function.json` — confirmed by `ls`
before running). Result: `"overall": "HOLD"`, exit code `1`,
`LIVE_GATE_AND_LEDGER`/`EDGE_FUNCTION_IDENTITY` both `NOT_RUN`,
`FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS` `PASS` (hash
`f185495387290e1...` matches the accepted staging value). This is the exact inverse of
what the prior HOLD review reproduced against the same unmodified directory
(`PASS`/exit `0` before the fix) — the fix demonstrably changes real behavior on real
on-disk state, not only on synthetic fixtures.

## Independent regression reproduction (re-run myself, fresh)

| Suite | Result | Claimed in commit/handoff |
|---|---|---|
| `validate_preexisting_structure_exclusions.mjs` | 17/17 PASS | 17/17 — match |
| `replay_preexisting_structure_exclusion_offline.mjs` | 4/4 PASS, 0 residuals, hash `f185495387290e1...` | 4/4, 0 residuals — match |
| `validate_ledger_statement_identity.mjs` | 23/23 PASS | 23/23 — match |
| `validate_post_apply_recovery_transport.mjs` | 13/13 PASS | 13/13 — match |

None of these suites, their source files, or the modules they exercise were touched by
`c54bc24` (confirmed via `git diff c54bc24~1 c54bc24 --stat` scoped to those paths:
empty).

## Immutability — independently re-verified, not trusted

- `git diff c54bc24~1 c54bc24 --stat -- '*RESTORATION_EXIT.sql' '*verify_post_exit.mjs' '*CANDIDATE_FREEZE.json' '*RESTORATION_RUNBOOK.md' 'supabase/migrations*'` → **empty**. The repair touched none of these paths.
- `PHASE03B_RESTORATION_EXIT.sql` re-hashed myself: `sha256
  0ae9662fee33765e614c03a8ba9b4363db12e55228ec13a5266aa127c1d6aecd` — identical to the
  hash the prior restoration-runbook independent review already recorded.
- Both frozen Phase03B migration files re-hashed myself and compared against the pinned
  values in `CANDIDATE_FREEZE.json` (r11): `20260915210256_...bridge.sql` →
  `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11` (match);
  `20260915210413_...points_integrity.sql` →
  `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5` (match). Both
  identical to the values independently confirmed in the 2026-09-20 preexisting-drift
  independent review.
- `git diff <merge-base-with-main> HEAD -- supabase/migrations/ supabase/migrations-next/`
  shows only the two frozen candidate files plus their README/contract/rollback siblings
  being *added* on this branch — zero changes to `supabase/migrations/` (the applied
  directory), and no third migration file exists anywhere.
- No `phase03c`-named file exists anywhere in the tree; the only textual mentions of
  "phase03c" are historical/prose (`"phase03cStarted": false` in a scope-declaration
  artifact, and the literal string `"PHASE03C"` inside `DO_NOT_DO` lists) — not new work.

## Owner capture instructions (`CAPTURE_MISSING_EVIDENCE.md`) — reviewed, not executed

Read in full, not run. Confirmed: hardcoded `PROJECT_REF="kldlwszpfkdmsjrjhjym"` passed
explicitly to every CLI call (never relies on `--linked` alone), an explicit refusal if
that ever equalled the named forbidden staging ref, `set -euo pipefail`, an explicit
`supabase --version` check against the pinned `2.116.0` before any live call, explicit
pre-existence checks refusing to overwrite `proof.json`/`edge_function.json`, `.tmp` +
`mv -n` (no-clobber) writes, every live call a `SELECT`/`list` read with no `ALTER`,
`INSERT`, `UPDATE`, migration apply, or restoration statement anywhere in the file, and
output redirected straight to file (only short confirmation lines echoed — no large
payload printed). The closing rerun command and its surrounding prose correctly require
a genuine `overall: PASS`/exit `0` from `proof.json` + `structure_catalog.json` +
`edge_function.json` together, and explicitly says `CLIENT_COMPATIBILITY` staying
`NOT_RUN` must not be treated as a blocker.

**One non-blocking observation, not present in the commit's own claims:** the capture
script's two live-data extraction lines —
`jq '.[0].phase03b_quiescence_proof_r3' > "$PROOF_OUT.tmp"` and the unfiltered
`supabase functions list ... > "$EDGE_OUT.tmp"` — do not use `jq -e` or any explicit
post-capture content check (non-null, non-empty, expected shape) before the `mv -n`.
`jq`'s null-propagating field access means a query that returns zero rows would write
literal `null` (valid JSON, not "malformed") to `proof.json` without a non-zero exit,
and a misconfigured/expired-token `functions list` that returns `[]` without an API
error would do the same for `edge_function.json`. I traced this forward into
`compare_captured_results.mjs`, which this repair does not change in this regard:
`readJson()` returns `null` for a file containing literal `null`, and `if (!proof)`
routes that to `notRun('LIVE_GATE_AND_LEDGER', ...)`; an empty-array `edgeRaw` is
truthy in JS, so it proceeds past `if (!edgeRaw)`, but then
`selected.length !== EXPECTED.edgeFunctionIdentity.expectedSelectedCount` (0 !== 1)
routes it to `hold('EDGE_FUNCTION_IDENTITY', ...)`. Both of those pre-existing,
unmodified code paths already resolve to a non-`PASS` section status, which — under
this repair's own new aggregation rule — forces `overall` to at least `HOLD` with a
non-zero exit either way. So the missing `jq -e`/content check in the *capture* script
is a real gap against the review brief's literal checklist item ("do not silently
accept malformed JSON"), but it does not translate into a false `overall: PASS` given
the comparator logic as it stands today, because the comparator's pre-existing (and
still unweakened) per-section logic already fails closed on `null`/empty content. Not
blocking for this review's primary goal (the aggregation defect), but worth tightening
before the capture script is actually run by an owner.

## Checkpoint safety — independently re-checked

`CURRENT_RECOVERY_HANDOFF.md` and `CURRENT_RECOVERY_STATE.json` at HEAD still carry,
unchanged in value from before this repair: `CURRENT_BRANCH` /
`CURRENT_WORKTREE`; `INCIDENT_RUN_ID` (`ebdba703-2470-41fa-ac6d-44354203b8d1`);
`ORIGINAL_DATABASE_T0` (`2026-09-20T06:20:25.216974Z`);
`ORIGINAL_ONE_RUN_AUTHORIZATION_STATUS: CONSUMED`;
`PRODUCTION_APPLY_ATTEMPT_COUNT: 1`; the current blocker (evidence-aggregator repair
done but not yet reviewed — this review closes that half); `CURRENT_EVIDENCE_PATHS` /
`EXTERNAL_HANDOFF_PACKAGE_PATH`; `NEXT_EXACT_ACTION`; `DO_NOT_REPEAT`; `DO_NOT_DO`. All
present, all internally consistent with the prior two independent reviews in this saga.

One pre-existing, previously-flagged, still-open minor gap (unchanged by this repair,
not newly introduced, and not blocking per the prior review's own classification):
neither checkpoint file records an explicit git HEAD/tree SHA — only branch and
worktree path. `git log`/`git status` trivially recover the same fact, and the
`DO_NOT_DO`/`DO_NOT_REPEAT` list additions in this repair's checkpoint update do not
touch this gap either way.

## What was not needed to reach this verdict

The prepared owner-capture commands and the fixed-comparator rerun command were read
and reasoned about, never executed — no Supabase CLI call, no network call, no
production or staging contact was made at any point in this review. Restoration itself,
gate removal, migration re-apply, and Phase 03C were not touched, attempted, or started.
This review does not authorize the owner to run `CAPTURE_MISSING_EVIDENCE.md`, does not
authorize restoration, and does not by itself change `RESTORATION_STATUS` from
`NOT_EXECUTED`.
