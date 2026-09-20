# What to hand back after the live capture

This external tool should run exactly the two SQL files below against production
(`kldlwszpfkdmsjrjhjym`) as read-only, and one CLI/API call if it has that capability,
and **return raw captured JSON** — not its own PASS/HOLD verdict. All judging
(hashing, exclusion filtering, comparison against expected values) happens afterward,
locally, offline, using `compare_captured_results.mjs` in this same directory. This
split exists so the live tool's job is minimal (three reads, no interpretation) and
every comparison decision stays auditable and reviewable as a local diff.

Save the three results as plain JSON files in one new directory, e.g.
`qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/CAPTURED/`:

1. **`proof.json`** — the single JSON object returned by
   `01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql` (the row aliased
   `phase03b_quiescence_proof_r3`). Save it exactly as returned, no editing.

2. **`structure_catalog.json`** — the single JSON object returned by
   `02_FINAL_STRUCTURE_CAPTURE_READ_ONLY.sql` (the row aliased `catalog`, with keys
   `schemas`, `relations`, `columns`, `functions`, `policies`, `triggers`, `roles`,
   `defaultAcls`). Save the raw, unfiltered catalog — do **not** try to apply the
   temporary-gate or preexisting-table exclusions yourself; that happens locally.

3. **`edge_function.json`** — the raw JSON array/object returned by
   `supabase functions list --project-ref kldlwszpfkdmsjrjhjym --output-format json`.
   If this tool has no way to make that call (it is a Supabase Management API/CLI
   call, not a SQL query), skip it and say so plainly rather than guessing at a
   result — `compare_captured_results.mjs` will report `EDGE_FUNCTION_IDENTITY: NOT_RUN`
   when the file is absent.

Also record, in a short plain-text note alongside the JSON:
- the exact project ref the tool was connected to when it ran each query (must be
  `kldlwszpfkdmsjrjhjym` — refuse and stop if it is anything else, especially the
  staging ref `cepayqmsoqxshsiyqnvz`),
- confirmation both SQL files were run inside `begin transaction read only; ... rollback;`
  exactly as given, with no edits to the SQL,
- the wall-clock time each query ran,
- that no other statement was run against this target in the same session.

Do not run `PROPOSED_QUIESCENCE_ENTER.sql`, `PROPOSED_QUIESCENCE_EXIT_TEMPLATE.sql`,
`generate_exit_sql.mjs`, `execute_cutover_controller.mjs`, or anything with "restore",
"rollback" (as a recovery action, not the SQL keyword), "controller", or "exit" in its
name from the packet directory this was drawn from
(`qa-reports/phase03b/2026-09-19-production-apply-packet-r11/`). Those are proposals
for a later, separately authorized phase and are out of scope for this read-only check.
