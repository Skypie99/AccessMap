# BUILD 02 — PHASE 1b · HANDOFF (resume protocol)

**Prompt:** `build-prompts/02_phase1b_flagdetail_and_sheets.md`
**Branch:** `design/gsp-02-flagdetail-2026-08-21`
**Base SHA:** `2c631e7a0ae7796d5e65ec18d6748bd110e5663a` (main, after Phase 0 + Phase 1a merges)
**Started:** 2026-08-21

## Measured baselines (at base SHA, before the first edit)
| Gate | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` | exit 0 |
| jest | `npx jest --ci -w 3` | **232 suites passed / 3370 passed / 32 todo / 0 failed** |
| lint | `npm run lint` | exit 0 — **0 errors, 82 warnings** |

## Decisions in force
- Q2 = **C** — `primaryIntent: 'triage' | 'read'`, default `'read'`; TasksScreen passes `'triage'`.
- Q16 — **unchanged** (owner self-verify stays allowed). No "block it" instruction received in this window.
- Q17 — coordinates behind "Copy coordinates"; raw coordinates no longer printed.
- Q11 — mission statement verbatim, About + guest Profile (Profile layout is Prompt 06).

## State
- [x] Handshake (clean tree, 3 stale worktrees from Aug 19/20, no live session)
- [x] Branch created
- [x] Baselines measured
- [x] Arbiter run — `build/02/gsp-bulk-stacks.json` -> exit 0, every ink PASS
- [x] **2.2a dense bulk floors + `BULK_FLOOR_CANDIDATE`** — `22c88e3`
- [x] **2.2b `ScreenStage strength` + Terms/Privacy on flat surface** — `087c8ae`
- [x] **2.1 the FlagDetail re-rank** (+ D13, D14, D15, 2 extra C1 fills) — `0d6d2ce`
- [x] **2.3 the mission statement** — `498d754`
- [x] COPY_LEDGER entries (W-03..W-11)
- [x] Sim re-walk (light/dark x medium/AXL, triage + read, Legend, Terms, About, Resources)
- [x] **2.4 the four defects the device found** — `359179e`
- [x] BUILD_REPORT.md

## COMPLETE — 2026-08-21. Sky merges.

## Final gates
typecheck 0 · jest **233 suites / 3376 passed / 32 todo / 0 failed** · lint 0 errors, 82 warnings.
Arbiter exit 0, every pair PASS. `dismissalStandard` B/B2/J pass unchanged.

## Guards re-pinned (never deleted) — 9
bp10SeverityGrammar · oneNameOneThing · disputeControl · brandInkAA ·
inertControlVisual · bp11PressVocab · hitTargetFrame · webResilience ·
MapScreen.detail. Each carries its reason inline. One guard ADDED:
`src/__tests__/mission.guard.test.ts`.

## Sim state
iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC`, sim-release, left on the
**`dense`** arm (the shipped default), light + medium. Both A/B arms were built
and captured; `blur40` was flipped back after its capture.

## Guards
9 re-pinned (bp10 · oneNameOneThing · disputeControl · brandInkAA ·
inertControlVisual · bp11PressVocab · hitTargetFrame · webResilience ·
MapScreen.detail), 1 added (`mission.guard`), none deleted.

## Next — Sky
1. Merge (or read `BUILD_REPORT.md` §10 first — seven decisions, two of them wording).
2. The floor A/B on real hardware (§5 has the one-line flip).
3. Ratify the COPY_LEDGER (W-03…W-11).
