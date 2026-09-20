# Phase 03B — third live read-only post-apply verification: external execution handoff

**Prepared:** 2026-09-20, local-only, by Claude (Sonnet 5) in worktree
`flagstone-p03b-post-apply-recovery-20260919`, reviewing commit `386d363` (independent
review PASS of repair commit `3420d87`).

**This preparation made zero contact with any Supabase project, staging or production.**
Nothing here executes anything. It is a package of exact SQL, exact expected values, and
an offline comparator, so a *different* trusted tool with its own connected Supabase
access (referred to below as "the executing tool") can run the live read-only portion
that this session was told not to run itself, and so that tool's job is as small and
mechanical as possible: run two read-only queries, run one CLI list command if it can,
and hand the raw JSON back — no interpretation, no judgment calls, nothing installed
or changed.

## Why this exists

`CURRENT_RECOVERY_HANDOFF.md` (in the parent `qa-reports/phase03b/` directory) records
that a structural-comparator repair (commit `3420d87`) has passed one fresh, narrow,
local/offline-only independent review (commit `386d363`), and that the review's own
verdict is: *"Ready for Sky to separately authorize exactly one fresh live read-only
post-apply verification — this review does not authorize or run it."* Sky separately
authorized exactly that one run. This package is the read-only content of that run,
extracted so it can be executed by a tool other than this session.

**This package does not itself consume that authorization.** Consumption happens only
when the two SQL files below are actually executed against `kldlwszpfkdmsjrjhjym`.
Preparing this handoff is authorization-neutral.

## Hard constraints carried over unchanged

- Target: `kldlwszpfkdmsjrjhjym` only. Never `cepayqmsoqxshsiyqnvz` (staging — forbidden
  for this check).
- Both SQL files are already wrapped `begin transaction read only; ... rollback;`.
  **Do not remove that wrapper. Do not edit either file.** If a tool's Supabase
  connector refuses to run a query containing `begin transaction read only`, that is a
  signal to stop and report the limitation — not a reason to strip the wrapper.
- No mutation. No `INSERT`/`UPDATE`/`DELETE`/`ALTER`/`DROP`/`CREATE`/`TRUNCATE`,
  anywhere, for any reason, including "just to test."
- No retry beyond exactly one execution of each of the two SQL files and the one CLI
  call. If a query errors or times out, capture the error and stop — do not re-run it
  hoping for a different result.
- No exit SQL, no restoration, no rollback-as-recovery-action, no production
  controller, no Phase 03C. Those live in the R11 packet directory as *proposals* for a
  separately authorized later phase; this handoff does not include or reference their
  execution.
- The 7 backup-table exclusions in `PHASE03B_PREEXISTING_PRODUCTION_STRUCTURE_EXCLUSIONS.json`
  are exact-name, non-wildcard, and already approved for structure-equivalence scope
  only. Nothing in this package widens them.

## What's in this directory

| File | Purpose |
|---|---|
| `01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql` | Read-only proof of the quiescence gate (function+2 triggers), the migration ledger (count/versions/statement identity), and the pg_net quiescence invariant. `__DATABASE_T0__` is already bound to `2026-09-20T06:20:25.216974Z` — no template tokens remain. |
| `02_FINAL_STRUCTURE_CAPTURE_READ_ONLY.sql` | The single structural-catalog query covering schemas/relations/columns/functions/policies/triggers/roles/defaultAcls across `public`, `private`, `storage`, `limiter`. This one artifact is the final-structure check **and** the permissions/RLS check **and** the moderation-definitions check **and** the points-definitions check — see `EXPECTED_VALUES.json` → `finalStructure.note` for why there is no separate query for those. |
| `PHASE03B_PREEXISTING_PRODUCTION_STRUCTURE_EXCLUSIONS.json` | The exact 7 pre-existing `bk_2026_08_22_*` backup tables already approved for exclusion from structure-equivalence comparison only. Copied verbatim from the R11 packet. |
| `EXPECTED_VALUES.json` | Every expected value, hash, and comparison rule needed to judge the captures — including why Edge Function identity needs a CLI call (not SQL) and why client compatibility is `NOT_RUN` by design. |
| `RETURN_FORMAT.md` | Exactly what the executing tool should hand back, and in what filenames. |
| `compare_captured_results.mjs` | The **local, offline** comparator. Takes the returned JSON, reuses this repo's own exclusion/normalization/hash modules (imported, not reimplemented), and prints a PASS/HOLD/FAIL/NOT_RUN verdict per section. Runs on this machine after the live capture comes back — makes no network call itself. Already syntax-checked and dry-run-tested against a stub fixture in this session; not run against any real capture. |

## Sequence

1. Give the executing tool `01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql`,
   `02_FINAL_STRUCTURE_CAPTURE_READ_ONLY.sql`, and `RETURN_FORMAT.md`. Confirm it is
   connected to `kldlwszpfkdmsjrjhjym` before it runs anything.
2. It runs both SQL files once each, and the `supabase functions list` call once if it
   can, and returns the raw JSON per `RETURN_FORMAT.md` — no verdicts, no edits.
3. Save that JSON locally as `CAPTURED/proof.json`, `CAPTURED/structure_catalog.json`,
   `CAPTURED/edge_function.json` (whichever exist) under this directory.
4. Run, on this machine, with no network access required:
   ```
   node qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/compare_captured_results.mjs \
     --captured=/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/CAPTURED
   ```
5. The printed `overall` is the real verdict — `PASS`, `HOLD`, `FAIL`, or `NOT_RUN` per
   section. `CLIENT_COMPATIBILITY` will always read `NOT_RUN`; that's by design, not a
   gap in this handoff (see `EXPECTED_VALUES.json`).
6. If `overall` is anything but `PASS`, stop and report — per the existing saga
   discipline (`DO_NOT_DO` in `CURRENT_RECOVERY_STATE.json`), a HOLD or FAIL here is not
   retried automatically and is not grounds for widening any exclusion.

## What this package deliberately does not do

- It does not run anything against Supabase itself.
- It does not judge PASS/FAIL on the executing tool's own say-so — every comparison is
  re-derived locally from the raw capture.
- It does not touch, reference, or enable exit SQL, restoration, rollback, or Phase 03C.
- It does not change `EXPECTED_FINAL_STRUCTURE_SHA256`, the frozen migration bytes, or
  either exclusion list.
