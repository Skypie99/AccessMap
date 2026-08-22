# HANDOFF — Flagstone build prompt 01 · Phase 1a (Dynamic Type rules)

**Branch:** `design/gsp-01-type-rules-2026-08-21`
**Base:** `4dcc8f9a34b84bc733734408dfb8803942cc6ae1` — the tip of
`design/gsp-00-phase0-2026-08-21`, **STACKED on Phase 0 with Sky's say-so**
(2026-08-21), which is the alternative the prompt's PREREQUISITE line allows.
`main` is still `a27864b` and is not touched by either branch.

**Scope:** items 1.1–1.6 of `build-prompts/01_phase1a_dynamic_type_rules.md`. Nothing more.
**Resume rule:** read this file first, continue from NEXT ACTION. Never restart.

## Measured baselines at branch time
- `npm run typecheck` — 0 errors
- `npx jest --ci -w 3` — **231 suites · 3315 passed · 32 todo · 0 failed**
- `npm run lint` — **0 errors · 82 warnings**

(Identical to Phase 0's final, as expected for a stacked branch.)

## State
- [x] Branch created off the Phase 0 tip
- [x] Baselines measured
- [x] 1.1 `AppText` caps by container (`TypeBlock`) — `cdc166b`
- [x] 1.2 titles never truncate (numberOfLines={1} sweep) — `4e299d1`
- [x] 1.3 the width rule (minWidth + flexWrap sites) — `01ff321`
- [x] 1.4 Home row recomposition — `6c3b222`
- [x] 1.5 SignIn at large type — `42f5c81`
- [x] 1.6 Legend blocks — `647ae0b`
- [x] Sim re-walk (light/dark x medium/AXL) — 8 captures + 4 comparison strips
- [x] BUILD_REPORT.md

## Gates after 1.6
typecheck 0 · jest **232 suites / 3366 passed / 32 todo / 0 failed** (baseline
231 / 3315) · lint 0 errors.

## New primitive
`src/components/ui/TypeBlock.tsx` + `TYPE_BLOCK` (header 1.6 / chrome 1.3 /
content uncapped), exported from `@/components/ui`. Guard:
`src/__tests__/typeBlock.guard.test.tsx` (41 tests).

## Banked for Sky (do not implement without a ruling)
- **W-02** new string "See all {n} on the map" (Home) — placeholder from board 01.
- **Legend status paragraph** — item 1.6 asked to split it into three rows at the
  em dashes. That is ratified teaching copy, so it is banked, not done.

## Carried in from Phase 0
Residual #1 of `build/00/BUILD_REPORT.md`: the signed-in Profile subtitle still
truncates at AXL ("Signed in as skylerhalisky@g…") because two lines are not
enough for a long unbreakable email token. Item 1.1's header block is the fix
for the class — check that node in this phase's re-walk.

## Sim notes inherited from Phase 0 (still true)
- iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC`, left light + medium.
- **Signed in as Sky's real account against the LIVE backend.** No writes. Do not
  sign out. The guest Profile and guest report form remain unreachable.
- Home place-search does not resolve here (geocode returns nothing).

## PHASE 1a IS COMPLETE — STOPPED FOR SKY

Seven commits (`cdc166b`..`d55c78b`), gated and walked. `main` untouched.
Read `BUILD_REPORT.md`.

**Sky's decisions waiting:**
1. Merge (or drop) Phase 0 + Phase 1a. They stack, so Phase 0 merges first.
2. **W-02** — ratify "See all {n} on the map" (Home).
3. **Legend status paragraph** — split into three rows, or leave whole? Not done.
4. Device pass: SignIn and onboarding at AXL are the two nodes the signed-in
   simulator cannot reach.

**Do NOT re-run this prompt.** Next in the series is
`build-prompts/02_phase1b_flagdetail_and_sheets.md`.

## Sim left at
iPhone 17e booted, app relaunched, **light + medium**, still signed in as Sky
(untouched), location granted. No writes to the backend at any point: the report
form was opened and cancelled, and no Verify/Resolved/Reject was ever pressed.
