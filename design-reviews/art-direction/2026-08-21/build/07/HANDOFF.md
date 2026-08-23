# PROMPT 07 — HANDOFF (resume protocol)

**Branch:** `design/gsp-07-modals-2026-08-22`
**Base SHA:** `15cf262d01c96a8e0966784d2ed908dd4265618d` (tip of `design/gsp-06-forms-2026-08-22`)

> ⚠ **PREREQUISITE DEVIATION, RECORDED.** The prompt says "PREREQUISITE: Prompt 06 merged".
> At start of this window `design/gsp-06-forms-2026-08-22` was NOT merged into `main`
> (`main` = `1984c3e`, 15 commits behind the 06 tip). 07 rewrites the same modal estate 06
> touched, so branching off `main` would have produced a guaranteed conflict on the same files
> and on COPY_LEDGER.md. Branched off the 06 tip instead — the same chaining every prior prompt
> in this series used. Sky merges 06 then 07, in order.

## Measured baselines (before the first edit)
| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npx jest --ci -w 3` | **241 suites / 3560 passed / 32 todo / 0 failed** |
| `npm run lint` | **0 errors, 82 warnings** |

## State
- [x] Branch cut, baselines measured, HANDOFF created
- [x] **7.1 DONE** — two shells, no third
  - 7.1a `474c022` Sheet grew 8 seams; SegmentedControl created
  - 7.1b `dd3f406` ten sheets adopted; 5 guards re-pinned
  - 7.1c `298677a` About -> pageSheet
  - 7.1d `d73d347` PrefsRow for the two notification twins
  - 7.1e `fcaad42` Settings + FlagDetail -> SegmentedControl; 3 guards re-pinned
- [x] **7.2 DONE** `1486b92` announcement parity (+23 assertions)
- [x] **7.3 DONE** `4f2...` SW-36 class (+6 assertions)
- [x] **7.4 DONE** `43ee0be` dead styles · `bf83e63` tokens · `9403c59` the rest
- [x] **7.1f** `6f72907` the grabber's gesture — found on the SIMULATOR, not in review
- [x] Sim-release built + re-walked (light/dark, medium/AXL)
- [x] BUILD_REPORT + COPY_LEDGER written

**PHASE 3 COMPLETE. STOP — Sky merges 06, then 07.**

Gate after 7.1: **241 suites / 3566 passed / 32 todo / 0 fail** (+6 assertions
over baseline). Lint 0 errors / 82 warnings (= baseline). Typecheck clean.

## Sim state
iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC`, Release build installed
2026-08-22 20:35 and again after `6f72907`. Left at light / medium.

## Next
Sim-release build on the iPhone 17e, then the re-walk (light/dark, medium/AXL)
and captures into `build/07/after/`. Then BUILD_REPORT.

Gate after 7.4: **241 suites / 3597 passed / 32 todo / 0 fail** (+37 over
baseline). Lint 0 errors / 82 warnings (= baseline). Typecheck clean.
