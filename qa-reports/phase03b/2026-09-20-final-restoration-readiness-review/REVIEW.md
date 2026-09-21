# Phase 03B — final restoration-runbook readiness review

Fresh, independent, local-only review. No production or staging contact. No Supabase
CLI commands run. No migrations applied. No restoration executed. Reviewed at branch
`codex/flagstone-p03b-post-apply-recovery-20260919`, HEAD `8fdbd2dd332d023602cebf30c278f45a3b9b0cad`.

## Step 1 — ground truth (all confirmed)

- Branch: `codex/flagstone-p03b-post-apply-recovery-20260919`. HEAD: `8fdbd2dd332d023602cebf30c278f45a3b9b0cad`.
- Worktree clean except the two intended new evidence files (`proof.json`, `edge_function.json`, both untracked).
- Commits `c54bc249…`, `7e51efb3…`, `51c03a4b…`, `8fdbd2dd…` all exist and are ancestors of HEAD, in that order.
- `CURRENT_RECOVERY_HANDOFF.md` and `CURRENT_RECOVERY_STATE.json` exist.
- `INCIDENT_RUN_ID` = `ebdba703-2470-41fa-ac6d-44354203b8d1`, `ORIGINAL_DATABASE_T0` = `2026-09-20T06:20:25.216974Z`, `PRODUCTION_APPLY_ATTEMPT_COUNT` = `1`, `ORIGINAL_ONE_RUN_AUTHORIZATION_STATUS` = `CONSUMED` — all match the task binding exactly.
- Restoration not executed; Phase 03C not started (no such files/commits exist).

## Step 2 — saved-evidence comparator re-run (independent)

Ran `compare_captured_results.mjs --captured=.../CAPTURED_FINAL_STRUCTURE` myself, fresh,
against the three saved files. Reproduced:

- `overall`: **PASS**
- `LIVE_GATE_AND_LEDGER`: **PASS**
- `FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS`: **PASS**, hash `f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7` (matches)
- `EDGE_FUNCTION_IDENTITY`: **PASS**, hash `276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70` (matches)
- `CLIENT_COMPATIBILITY`: `NOT_RUN`, documented and correctly non-blocking (confirmed the fixed `verdict_aggregation.mjs` does not let this section affect `overall`)
- `TARGET_IDENTITY`: PASS-with-caveat — "no note.json supplied -- unverified, treat as HOLD manually" (see finding F3 below)

This independently confirms Sky's reported result and closes the specific evidence gap
the runbook's own §2/§10 flagged (proof.json/edge_function.json now exist and reproduce PASS).

## Step 3-4 — runbook binding and scope

- Runbook is bound to the correct Run ID / T0 / production target (`kldlwszpfkdmsjrjhjym`).
- Runbook authorizes exactly one restoration attempt; does not authorize another migration apply.
- Restoration SQL's only `drop` statements (lines 94–96) are the exact 3 gate objects: the
  truncate trigger, the row-lifecycle trigger, and the gate function. No `alter table`,
  `update`, `insert`, `delete`, or `truncate` statements anywhere in the file (the one
  `UPDATE` substring match is `has_column_privilege(...,'UPDATE')`, a read-only privilege
  check, not a mutation).

## Step 5 — regenerated restoration SQL

Regenerated `PHASE03B_RESTORATION_EXIT.sql` from the committed `ENTRY_RECEIPT.json` using
the committed `generate_exit_sql.mjs` (r11 packet) into a scratch file and diffed against
the committed copy: **byte-identical**. Zero unresolved `__ENTRY_*__`/`__DATABASE_T0__`
tokens in the committed file.

## Step 8 — post-exit verifier

`verify_post_exit.mjs`: fail-closed (`status` starts `'HOLD'`, only reaches `'PASS_RESTORED'`
if every check passes; any mismatch throws and is caught, setting `process.exitCode = 1`);
no retry loop (only `for...of` over fixed key lists); writes a receipt unconditionally via
`finally`; calls `assertInstalledSupabaseCliVersion()` before doing anything live.

## Findings

### F1 — No fail-fast shell behavior in the §8 owner preflight command block (Step 9 requirement)

The runbook's §8 step-1 bash block (`mkdir`, three `supabase ... | jq ... >` redirections,
then the comparator) has no `set -euo pipefail` and the commands are not chained with `&&`.
A failed `supabase db query` (auth expiry, network blip) does not halt the sequence —
subsequent commands still run, and a piped failure can still leave a truncated/empty file
behind via the `>` redirection regardless of the left-hand command's exit status. The block
relies entirely on a human reading the final printed `overall` value rather than the shell
itself stopping. Step 9 explicitly requires "fail-fast shell behavior"; this block does not
have it.

### F2 — No CLI version guard on the preflight/comparator path (Step 9 requirement)

`assertInstalledSupabaseCliVersion()` exists and is enforced inside `verify_post_exit.mjs`
(the post-exit script), but the raw `supabase db query` / `supabase functions list` calls in
§8 step 1, and `compare_captured_results.mjs` itself, never call it (confirmed by grep — zero
matches for `cliVersion`/`--version` in the comparator). The pinned CLI version (`2.116.0`)
named in the runbook's prose is asserted, not enforced, on the preflight/evidence-judging
path — only on the post-exit path.

### F3 — TARGET_IDENTITY check is structurally never satisfied (Step 6/9, lower severity)

`compare_captured_results.mjs`'s `TARGET_IDENTITY` section only reads a genuine PASS when a
`note.json` with `projectRef` is present in the captured directory. §8's preflight commands
never produce a `note.json`, so this automated check will always read the softened
"no note.json supplied — unverified, treat as HOLD manually" message rather than a real
confirmation, both for the historical evidence and for any future pre-restoration reproof.
The real protection against a wrong-target run is the explicit `--project-ref
kldlwszpfkdmsjrjhjym` flag on each CLI call, not this automated check, which currently
contributes nothing.

### F4 — RESTORATION_RUNBOOK.md §2 evidence-status table is stale (documentation only, non-blocking)

§2 and §10 of the committed runbook still say the ledger/gate/pg_net and Edge Function PASS
claims are "ASSERTED ONLY, NOT INDEPENDENTLY VERIFIED FROM A SAVED ARTIFACT." That was true
when the runbook was authored (`proof.json`/`edge_function.json` did not exist yet). Both
files now exist and this session's independent comparator run confirms PASS against them.
The document text has not been updated to reflect this. This does not weaken actual
execution-time safety — §3/§8 already require a *fresh* reproof immediately before the write
regardless of any historical evidence — but the document should be corrected before being
represented as fully closed.

## Verdict

F1 and F2 are literal, verified gaps against Step 9's explicit "Require" list. Both are
operator/tooling hygiene gaps, not gaps in the restoration SQL's own live guard (the
`do $guard$`/`do $absence$` blocks re-verify every invariant atomically at write time,
independent of what the preflight script did or didn't check), and the actual write (§8
step 2) is separately gated behind a manual file edit plus explicit Sky authorization. So
production is not at risk today. But as literal findings against an explicit checklist
requirement, they are reported as blocking for the purposes of this readiness review rather
than waved through.

**INDEPENDENT_FINAL_RESTORATION_READINESS_REVIEW: HOLD**
**RESTORATION_RUNBOOK: NOT_READY_FOR_OWNER_AUTHORIZATION**

First blocking defect: F1 — the §8 owner preflight command block lacks fail-fast shell
behavior (no `set -euo pipefail`, no `&&` chaining), so a failed read-only capture command
does not automatically halt the sequence and depends on a human correctly reading the final
printed verdict.

Not repaired by this session, per instructions.
