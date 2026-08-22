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
- [ ] 1.1 `AppText` caps by container (`TypeBlock`)
- [ ] 1.2 titles never truncate (numberOfLines={1} sweep)
- [ ] 1.3 the width rule (minWidth + flexWrap sites)
- [ ] 1.4 Home row recomposition
- [ ] 1.5 SignIn at large type
- [ ] 1.6 Legend blocks
- [ ] Sim re-walk + BUILD_REPORT.md

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

## NEXT ACTION
Build `src/components/ui/TypeBlock.tsx` + wire `AppText`, then adopt it.
