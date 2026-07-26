# ROUND 2 AUDIT — RUN ORDER (operator note)

**What this is:** the AccessMap Round-2 design-audit set — the sequel to `design-reviews/fable-audit/2026-07-04_AccessMap_Design_Review.md`. Round 1 made the app correct and its slate is fully closed (S1–S20 via uplift P0–P5; B1–B11 via BENCH 1–4). Round 2 asks a new question against that good baseline: **"Disabled users deserve beautiful software — one material, one voice, one hand."** Three parts, strictly read-only, reports + specs only — never code changes.

**Authored:** 2026-07-09, on Fable 5 max effort, against the working tree at `bench/4-quality` @ `a8549ff` (main `01f7392` + the four bench tiers, stacked). Each part verifies the baseline by content markers, not by hash — if Sky merges bench→main before firing, the parts adapt; if a marker is missing, they STOP.

## How to fire

Each part runs ALONE in a FRESH window, in order, on **Fable 5 at max effort** (the halt-and-Sky-chooses fallback protocol is inside each prompt). State carries between parts ONLY as files under `design-reviews/r2-audit/`. Every part is resume-safe (re-fire the same prompt after a stall; it continues from the first gap) and ends with a hard **STOP + report** — no part ever starts the next one.

1. `r2_part1_feel.md` — THE FEEL AUDIT (craft + signature-deepening; 7 blinded personas incl. Reduce Transparency + VoiceOver)
2. `r2_part2_material.md` — THE MATERIAL CONTINUITY AUDIT (the census + the unified system + the migration spec, arbiter-proven at spec time)
3. `r2_part3_synthesis.md` — SYNTHESIS (one report in the Round-1 format + the Round-2 slate `T1…Tn`)

## What each part needs and banks

| Part | Consumes | Banks (all under `design-reviews/r2-audit/`) |
|---|---|---|
| 1 — Feel | The repo at HEAD · the Round-1 report + ledgers · Round-1 harness (`fable-audit/tools/`, adapted) | `01_feel_orientation.md` · `01_feel_render-index.md` · `01_feel_persona-reads.md` · `02_feel_findings.md` · `partials/F1–F6` · `assets/` |
| 2 — Material | The repo at HEAD · GLASS.md + lab law + the stack-declaration corpus · (reuses Part 1's §0 baseline + harness IF banked; self-establishes if not — Part 2 does not need Part 1's findings) | `03_material_census.md` · `04_material_migration_spec.md` · `tools/r2-material-stacks.json` · `assets/arbiter/` output |
| 3 — Synthesis | **Hard-requires** everything Parts 1–2 banked (missing → STOP) · the Round-1 report as format + law | `05_r2-slate.md` (working file + process log) · **`<date>_AccessMap_R2_Design_Review.md`** — the deliverable Sky opens |

## Standing notes

- **The migration spec becomes its own build train.** Part 2's `04_material_migration_spec.md` packages the material migration as phases `MP0…MPn` — each arbiter-gated, one-Opus-window sized, stop-on-branch, **Sky merges**. Part 3 mounts the train INTACT into the slate as one proposal. **No audit part ever executes it.** It runs later as its own Sky-fired uplift (execution may be Opus 4.8 — the spec is written so a different model executes without re-deriving design).
- **The D9 record note.** Sky's device reads stand as of 2026-07-09: D10 (B6 light bulk sheet — recorded in `bench-assets/BENCH-3-verification-evidence.md` §B6) **and** D9 (the ≥500 on-glass weight — Sky's direct read, which post-dates the bench docs; the on-disk ledgers still say NEEDS-SKY-DEVICE). The parts treat both as settled; **Part 3's refreshed device-gate ledger is where the D9 closure gets its paper record.**
- **Never re-litigate:** Forks 1–9 and the open bench discoveries are Sky's; the parts frame them, only their UI/read halves may be referenced. Nothing closed (S1–S20, B1–B11) gets re-found without regression evidence.
- **Known env boundary:** the expo-web dev preview crashes Map/Tasks (+ their lazy heavy-lucide modals) — pre-existing, named in every part; evidence tags carry the honesty. A one-shot static-export workaround is permitted per part.
- **Fence:** each part ends with `git status` == its banked baseline + `design-reviews/r2-audit/` additions only. Nothing tracked is ever touched; no commits, no pushes, no branch moves, no builds, zero Supabase writes.

*Set authored and saved 2026-07-09 · Fable 5 max effort · fire Part 1 in a fresh window when ready.*
