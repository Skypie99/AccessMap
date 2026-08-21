# HANDOFF — Flagstone build prompt 00 · Phase 0 (PRE-SUBMISSION)

**Branch:** `design/gsp-00-phase0-2026-08-21` · **base:** `a27864be5e8a668ed384505dd4483f07d477f675`
**Scope:** exactly items 0.1–0.6 of `sections/13_phases.md`. Nothing more.
**Resume rule:** read this file first, continue from NEXT ACTION. Never restart. Never re-do a landed commit.

## Measured baselines at branch time (NOT quoted from docs)
- `npm run typecheck` — 0 errors
- `npx jest --ci -w 3` — **230 suites / 3297 passed / 32 todo / 0 failed**
- `npm run lint` — **0 errors / 82 warnings**

## State
- [x] Branch created off main `a27864b`
- [x] Baselines measured
- [x] 0.1 map bar title — `40272e1`
- [x] 0.2 Nearby description — `97a2a1d`
- [x] 0.3 ScreenHeader subtitle — `4bd2403`
- [x] 0.4 Report-form guest Sign in 44pt — `a71c706`
- [x] 0.5 FlagDetail filled verbs -> ctaFill — `b1eaf7a`
- [x] 0.6 Tab badge -> ctaFill — `936b2a9`
- [x] Full gate re-run — typecheck 0 · jest 231/3315/32/0 · lint 0 err/82 warn
- [x] Sim release rebuilt — Build Succeeded, .app 16:02:02
- [x] Sim re-walk (light/dark x medium/AXL) — 12 captures + 4 comparison strips in `after/`
- [x] BUILD_REPORT.md
- [x] COPY_LEDGER.md (no entries for Phase 0)

## Guards touched (re-pinned/extended, none deleted)
- `MapScreen.headerActions.test.ts` — RE-PINNED to the new title rule
- `hitTargetFrame.guard.test.ts` — 4 new rows (D11)
- `brandInkAA.guard.test.ts` — 2 new rows (D7/C1)
- `perceptionGuards.test.ts` — 1 new row (C7)
- new: `NearbyFlagsModal.description.test.tsx`; extended `ScreenHeader.test.tsx`,
  `accessibility.test.ts`, `ReportFlagModal.test.tsx`

## Behaviour change beyond the stated scope — FLAG FOR SKY
0.4 also adopts the anon-banner pattern's draft stash. The nudge called
`onClose` bare, discarding a guest's typed report; enlarging that target
without the stash would have made the data loss easier to hit. See BUILD_REPORT.

## Sim state (2026-08-21 16:05)
- iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC` BOOTED, iOS 26.5.
- Sim-release REBUILT from this branch: `Build Succeeded`, `.app` written 16:02:02.
- Location granted via `simctl privacy`. Appearance light, content size medium.
- **THE APP IS SIGNED IN AS SKY'S REAL ACCOUNT** (skylerhalisky@gmail.com,
  "Jarvis Mckneil", 124 pts) against the LIVE backend. Do not sign out — signing
  back in needs credentials no agent may handle. No writes of any kind: open
  FlagDetail but never press Verify / Resolved / Reject; open the report form
  but always cancel.
- CONSEQUENCE: two capture nodes are unreachable in this state —
  the GUEST Profile (0.3's before-capture) and the GUEST report form (0.4's
  nudge is `isAnon`-only). Both are covered by render tests; both are logged as
  NEEDS-GUEST-DEVICE in the build report. The signed-in Profile's long subtitle
  ("Signed in as skylerhalisky@gmail.com") stands in for D3 at AXL.
- Home place-search does not resolve here (the OpenStreetMap geocode returns
  nothing in this environment), so the "Near <place>" subtitle node is also
  unreachable.

## PHASE 0 IS COMPLETE — STOPPED FOR SKY

All six items landed, gated and walked. `main` untouched. Read `BUILD_REPORT.md`.

**Sky's decisions waiting:**
1. Merge (or drop) `design/gsp-00-phase0-2026-08-21`.
2. 0.4 stashes the guest's draft on sign-in as well as meeting the 44pt floor —
   a behaviour change beyond the item. Keep or revert that half.
3. 0.2 removed the Nearby line cap outright; at default size the cards are no
   longer uniform height. Keep, or restore the medium-size 2-line tidy.
4. Four NEEDS-DEVICE/GUEST rows — N-1..N-3 all clear in one signed-out pass.

**Do NOT re-run this prompt.** The next prompt in the series is
`build-prompts/01_phase1a_dynamic_type_rules.md`, and it should pick up residual
#1 (the long-email subtitle) as part of item 1.1.

## Sim left at
iPhone 17e booted, app relaunched, appearance **light**, content size **medium**,
still signed in as Sky (untouched), location granted. Nothing was written to the
backend at any point.
