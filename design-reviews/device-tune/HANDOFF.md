# Device-Tune Train — HANDOFF

**Resume rule: read this file first, then DECISIONS.md, then the phase plan (`~/.claude/plans/accessmap-device-tune-phase-optimized-rabbit.md`).**
Untracked working-tree governance (R2 convention). Never `git clean -fd` in this repo.

## Completed

- **Phase 1 (D1 — dead drawer destinations): BUILT + VERIFIED, STOPPED on `devicetune/1-drawer-function`** (base `d43f867` → tip `067864e`). Awaiting Sky's ff-merge + TestFlight pass. Detail in the git history and `qa-reports/2026-07-25_DeviceTune_Phase1_Drawer.md`.

- **Phase 2 (D2 — drawer material): D2a BUILT + VERIFIED, STOPPED on `devicetune/2-drawer-material`** (base `067864e` → tip `8cded0b`). **Phase 2 contains Phase 1** — merging it brings both.
  - `c30f062` C1 footer retires · `737ce8d` C2 the scheme rebind (the fix Sky asked for) · `32c4987` C3 scrim/focus · `ee8821d` C4 fixes a regression C3 shipped (§F F-14) · `8cded0b` C5 lint hygiene.
  - Gates at tip: typecheck 0 · lint 0 err / 77 warn · jest **152 suites / 2116 pass / 0 fail** · arbiter **exit 0, 32/32** · 13/13 stacks 0-diff · **30/30 browser captures**.
  - **D2b gate CLOSED 2026-07-26 — Sky picked A** (the drawer as built). No further work; the live-glass budget amendment is moot. **Phase 2 is fully closed** pending only her device pass.

## Current

- **THE WHOLE TRAIN IS MERGED TO LOCAL `main` @ `7887ce3` (2026-07-26, on Sky's explicit approval). NOT PUSHED — `origin/main` is still `d43f867`.**
  - `d43f867` → `f41def4` (device-tune Phases 1+2+3, 17 commits) → `7887ce3` (the CRITICAL photo-privacy fix, rebased on top).
  - Gates on merged main: typecheck 0 · jest **158 suites / 2222 pass / 0 fail** · lint 0 err / **79** warn (77 from the train + 2 that the photo-fix branch already carried on its own — verified pre-merge, not a regression).
  - **Rollback: `git reset --hard d43f867`.**
  - Authority + full detail: DECISIONS **§M**. This rests on Sky's spoken approval, NOT on the Art. 17 grant (which is Prompt-Library-only). No precedent set.
- **All gates on the train are CLOSED.** D2b = A (no work). A-4 = candidate B + `TASKS` eyebrow (built). A-5 = copy option 3 (shipped).
- **ONE open decision: F-20, the banner slim.** Recommendation is **leave it alone** (F-21) — the banner is the list's header, not fixed chrome, so it scrolls away and its ~14pt is a one-time cost, not a permanent tax.

## Remaining (train)

1. **Sky:** open `D2b_mockup_gate.html` → record the pick in DECISIONS §A (A-2). Phase 2's only blocker.
2. **Sky:** open `Phase3_mockup_gate.html` → record picks in §A (**A-4** D3 candidate, **A-5** D4 empty-local placement + copy). No pick ⇒ Phase 3 closes with C1 + all of D4 shipped correct.
3. **Sky:** ff-merge the train (Phase 3 contains Phases 1+2) → build → run the consolidated device list in the Phase 3 report §8.
4. **Sky's call:** merge order vs `fix/photo-privacy-sanitize` @ `64342e1` (CRITICAL, unmerged, no file overlap).
5. BP16 copy-gate still owns all drawer-surface strings (S-1). Phase 3 adds no string to a fenced surface — its new strings are on Home, which is not fenced.

## Tooling built this phase (reusable)

- `tools/measure-header.mjs` — **verify-first layout measurement.** Enumerates the chrome pane's rows and the list's slots against a live static export and prints web-frame, analytic addends, and device-adjusted numbers separately. Two traps it now avoids, learned the hard way: a card's `aria-label` sits 16pt INSIDE the card (measuring it overstates the first-card top and mis-reads pitch), and `[role="tablist"]` on Tasks matches the SORT ROW, not the tab bar.
- `tools/capture.mjs` + the R2 original both gained a per-job **`geo`** override (added in R2 first per that file's header law, then mirrored) so a job can stand somewhere with no reported flags.
- `tools/manifests/phase3-*.json` · `tools/build-board-p3.mjs` · `Phase3_mockup_gate.html`.

**Capture rule (inherited, still true):** the bundle is BAKED into the export. Every candidate needs its own fresh `expo export` before its captures mean anything.

## Device list

The **consolidated** list — Phases 1 + 2 + 3 as ONE numbered TestFlight pass, with a provenance column — lives in the Phase 3 report §8 (`qa-reports/2026-07-26_DeviceTune_Phase3_HeaderMapPolish.md`). Use that, not the per-phase lists.
