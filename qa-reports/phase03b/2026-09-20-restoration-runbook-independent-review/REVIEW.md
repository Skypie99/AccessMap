# Phase 03B restoration runbook — narrow independent review

**Reviewed artifact:** `qa-reports/phase03b/2026-09-20-restoration-runbook/RESTORATION_RUNBOOK.md`
(plus its bound SQL siblings and the evidence it cites)
**Mode:** Fresh independent review, local/offline only. No production or staging contact. No mutation. No execution.
**Verdict:** **HOLD**
**Reviewed at HEAD:** `3fe62ef2925690a66bd530028177aa41c82a2285` (branch `codex/flagstone-p03b-post-apply-recovery-20260919`, worktree clean)

## Ground truth independently established (not taken from the preparation summary)

- Branch/HEAD/clean: confirmed via `git status`/`git log` at session start.
- `INCIDENT_RUN_ID` (`ebdba703-2470-41fa-ac6d-44354203b8d1`) and `ORIGINAL_DATABASE_T0`
  (`2026-09-20T06:20:25.216974Z`) are consistent across `RESTORATION_RUNBOOK.md` §1,
  `CURRENT_RECOVERY_HANDOFF.md`, `CURRENT_RECOVERY_STATE.json`, and
  `ENTRY_RECEIPT.json`. `PRODUCTION_APPLY_ATTEMPT_COUNT = 1`,
  `ORIGINAL_ONE_RUN_AUTHORIZATION_STATUS = CONSUMED` in the state file, unchanged by
  this runbook (nothing in the runbook re-applies or authorizes a migration).
- Regenerated `PHASE03B_RESTORATION_EXIT.sql` myself from the committed
  `generate_exit_sql.mjs` (r11 packet) and the committed `ENTRY_RECEIPT.json`, writing
  to a scratch path (the generator refuses to overwrite an existing file, `wx` flag).
  **Byte-for-byte identical** (`sha256 0ae9662fee33765e614c03a8ba9b4363db12e55228ec13a5266aa127c1d6aecd`)
  to the committed `PHASE03B_RESTORATION_EXIT.sql`. Confirms: not hand-edited,
  deterministically generated, zero unresolved `__TOKEN__` placeholders (the generator
  itself asserts this and would have thrown).
- Read the generated SQL directly: it drops exactly the 3 named gate objects (truncate
  trigger, row-lifecycle trigger, gate function), in that order, inside one
  `begin ... commit` with a 5s lock timeout / 30s statement timeout. Its `do $guard$`
  block mechanically re-proves — **inside the same transaction, at write time, fail-closed
  via `raise exception ... P0001`** — owner identity, gate object OIDs/owner/enabled
  state/definition hashes, the `flags`/`flag_status_history` invariant, migration ledger
  count (87) and both Phase03B versions, moderation/points object and grant shape, and
  the `pg_net` quiescence invariant. A trailing `do $absence$` block refuses to commit
  unless all three objects are now provably gone. No `ALTER`/`UPDATE`/`INSERT`, no
  ledger write, no reference to any other product table. No wildcard/prefix matching
  anywhere in the drop list.
- Diffed `PHASE03B_POST_EXIT_VERIFY_READ_ONLY.sql` against `POST_EXIT_VERIFY.sql`
  (r11 packet, the template it's supposed to be a T0-bound copy of): only the two
  `__DATABASE_T0__` tokens differ, both correctly bound to the incident T0. No other
  change.
- Read `verify_post_exit.mjs` (r11 packet) in full: `status` defaults to `'HOLD'` and is
  only set to `'PASS_RESTORED'` if every check succeeds without throwing; any missing
  field, CLI failure, or mismatch throws, is caught, and forces `process.exitCode = 1`
  while `status` stays `'HOLD'`. No retry loop (`grep` for `retry|while(|for(|setTimeout`
  found nothing). This script is fail-closed by construction and matches the runbook's
  §5/§7 claims about it.
- Confirmed commit `3420d87` (the structural-comparator repair the runbook depends on)
  is an ancestor of HEAD, touched exactly the 2 new files + 2 modified verifier files +
  2 checkpoint docs the handoff claims (`git show --stat`), and that its diff on
  `verify_post_exit.mjs` is the 8-line addition of a single filter call — nothing else.
  Read `preexisting_structure_exclusions.mjs` in full: exact `(schema,table)` equality
  against a frozen 7-entry array, cardinality-asserted, no wildcard/prefix.
- Migration immutability: located both frozen Phase03B migration files under
  `supabase/migrations-next/phase03b/`, hashed them myself with `shasum -a 256`, and
  both match the pinned hashes in `CANDIDATE_FREEZE.json` exactly. `git diff
  --stat <merge-base>..HEAD -- supabase/migrations/` is empty; no new migration file
  exists anywhere on this branch; no `phase03c`-named file exists anywhere in the tree
  outside historical prose in `qa-reports/`.

## The blocking defect

**Requirement 4 (pre-restoration gates) / the evidence-gap question posed by the task.**

The runbook itself (§2, §10) and the checkpoint files are honest that the
ledger/gate/pg_net/Edge-Function rows of the third live verification are
**asserted-only** (no `proof.json` / `edge_function.json` ever saved), and its own §3
preflight item 6 correctly says this must read `INDEPENDENTLY VERIFIED` before
proceeding to §5. `CURRENT_RECOVERY_STATE.json` nonetheless characterizes this as
"recommend closing before review, **not blocking on it**" — the task asked me not to
accept that characterization at face value, so I tested the actual mechanism the
runbook names as the fix (§8 step 1: re-capture fresh, then run
`compare_captured_results.mjs`, "read the printed `overall`... if it is not PASS on
every non-`NOT_RUN` section, STOP HERE").

I ran that exact comparator, unmodified, locally, offline (it makes no network call —
confirmed by reading it), against the real evidence directory that exists on disk right
now (`CAPTURED_FINAL_STRUCTURE/`, which only contains `structure_catalog.json` — exactly
the state described in §2):

```
node qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/compare_captured_results.mjs \
  --captured=.../CAPTURED_FINAL_STRUCTURE
```

Result: **`"overall": "PASS"`, exit code 0**, while `LIVE_GATE_AND_LEDGER` and
`EDGE_FUNCTION_IDENTITY` both read `NOT_RUN` (missing `proof.json` /
`edge_function.json`).

Root cause, read directly from the script
(`compare_captured_results.mjs:37-38,144`): `hold()` only downgrades `overall` away
from `'PASS'`; `notRun()` never touches `overall` at all. The exit-code line is
`process.exitCode = overall === 'PASS' || overall === 'NOT_RUN' ? 0 : 1;` — a
`NOT_RUN` **section** is correctly distinguished from `PASS` in the per-section report,
but a `NOT_RUN` section has **zero effect on the aggregate `overall` field**, so
"overall PASS" does not mean "everything was independently verified"; it can mean
"the one thing that happened to have a saved file passed, and the rest were silently
never captured."

This directly falsifies the safety property option (A) in the task depends on
("regenerates equivalent read-only evidence immediately before the write and binds
that evidence to the execution"). The regeneration step exists and is real (§8 step 1
does run live read-only SQL/CLI calls), but the **binding** — "a failure to capture or
verify must stop the write" — is not enforced by the tool; it is enforced only by a
human reading a JSON blob and noticing that two sections say `NOT_RUN` instead of
`PASS`, despite `overall` reading `PASS`. That is exactly the class of failure this saga
has repeatedly and explicitly guarded against elsewhere (the `do $guard$`/`do $absence$`
blocks in the SQL itself never trust human reading of output — they raise a hard
exception). The external-handoff comparator does not meet that same bar.

This is **not** a hypothetical: it is the actual, current, reproducible behavior of the
actual tool the runbook names as the way to close its own acknowledged gap, run against
the actual evidence that exists on disk today.

## Classification

**EVIDENCE_GAP_CLASSIFICATION: BLOCKING** — not "safely closed by pre-restoration
reproof." The reproof mechanism exists but its pass/fail aggregation is broken in a way
that lets missing critical evidence (ledger/gate/pg_net proof, Edge Function identity)
pass silently as part of an `overall: PASS` verdict. This must be fixed (e.g. `notRun`
for `LIVE_GATE_AND_LEDGER` or `EDGE_FUNCTION_IDENTITY` should force `overall` to at
least `HOLD`, and/or the exit-code line should not treat `NOT_RUN` on a required
section the same as `PASS`) and then actually re-run against saved `proof.json` +
`edge_function.json` artifacts, before this runbook goes to a reviewer who might rely on
"the comparator said PASS" as sufficient evidence.

Per the review's own governing instruction, this defect is reported and the review
stops here rather than being repaired in this window.

## Other findings noted, not separately blocking (did not need to be reached to produce a HOLD)

- Neither `CURRENT_RECOVERY_HANDOFF.md` nor `CURRENT_RECOVERY_STATE.json` records an
  explicit git HEAD/tree SHA (only branch and worktree path). Minor gap against
  checkpoint-safety requirement 8; independently confirmable but not itself unsafe,
  since `git log`/`git status` recover the same fact trivially. Worth closing alongside
  the comparator fix.
- The `§8` owner-execution bash block has no `set -euo pipefail` and no scripted
  post-check on `compare_captured_results.mjs`'s exit code before the (already
  commented-out) write step — everything currently rests on a human reading the
  step-1 JSON output correctly, which compounds the comparator defect above rather than
  independently mitigating it.

## What was not needed to reach this verdict

Requirements 8 (session/checkpoint content beyond the HEAD/tree note above), 9
(candidate/migration immutability — independently confirmed clean, see above), and 10
(local validation — the SQL regeneration diff and the comparator run above are exactly
that) were checked and did not themselves block. Requirements on session-splitting,
Phase 03C, and candidate-byte tampering were checked via `git` history and file search
and found clean. This review did not need to, and did not, reach a full item-by-item
sign-off on every remaining sub-bullet, because the task instructs stopping at the first
blocking defect.
