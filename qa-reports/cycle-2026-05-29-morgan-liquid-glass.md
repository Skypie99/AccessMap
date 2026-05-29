---
report: cycle-2026-05-29-morgan-liquid-glass
project: AccessMap
date: 2026-05-29
type: ROADMAP_ADDITION
authored_by: Morgan
model_tier: Sonnet
coherence_score: 0.95
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
---

# Morgan — Roadmap Addition: Liquid Glass TasksScreen

**Date:** 2026-05-29
**Trigger:** Sky direct request — "task window should look kinda translucent over the map and like liquid glass"
**Scope:** TasksScreen UI polish (visual only — no data, no schema, no auth changes)
**Priority:** HIGH — queued for next available design cycle after Monday merge wave

---

## LEARNINGS consulted

- `LEARNINGS:2026-05-25 — back-to-back sequential feature pattern` — creative-polish / Tasks polish / address search each landed clean using sequential dispatch; liquid glass must build on `design/creative-polish-2026-05-27` tokens already on-disk. Apply same pattern: spec on separate branch, build on separate branch.
- `LEARNINGS:2026-05-25 — design token system categories` — blur/opacity will need new tokens in the `shadow` or a new `overlay` category. Dani owns this call.
- `LEARNINGS:2026-05-25 — concurrent agent branch collision` — Morgan must not dispatch Dani + Shamus to the same branch simultaneously. Spec branch first, build branch second.

---

## §1 Dependency Graph

```
nodes:
  - morgan/roadmap-liquid-glass#step-1 (Morgan, log + route — COMPLETE this report)
  - dani/liquid-glass-spec#step-1 (Dani, platform strategy + token proposal)
  - dani/liquid-glass-spec#step-2 (Dani, component spec deliverable)
  - shamus/liquid-glass-build#step-1 (Shamus, install expo-blur + impl)
  - shamus/liquid-glass-build#step-2 (Shamus, web CSS fallback + dark mode)
  - design-compiler/liquid-glass#step-1 (Dani, Design Compiler 7-layer gate)
  - gary/liquid-glass-check#step-1 (Gary, tsc + test suite gate)
  - merge/liquid-glass (Rory, merge to main)

  PRE-REQUISITE (existing):
  - design/creative-polish-2026-05-27 → must be on main BEFORE dani/liquid-glass-spec starts
  - a11y-perf/wave3-2026-05-27 → must be on main BEFORE shamus builds

edges:
  - morgan/roadmap-liquid-glass#step-1 → dani/liquid-glass-spec#step-1 (gate: Monday merge wave complete)
  - dani/liquid-glass-spec#step-1 → dani/liquid-glass-spec#step-2 (gate: token proposal complete)
  - dani/liquid-glass-spec#step-2 → shamus/liquid-glass-build#step-1 (gate: Sky approves spec OR Morgan standing approval)
  - shamus/liquid-glass-build#step-1 → shamus/liquid-glass-build#step-2 (gate: iOS BlurView rendering confirmed)
  - shamus/liquid-glass-build#step-2 → design-compiler/liquid-glass#step-1 (gate: build PR ready)
  - design-compiler/liquid-glass#step-1 → gary/liquid-glass-check#step-1 (gate: Design Compiler COMMIT verdict)
  - gary/liquid-glass-check#step-1 → merge/liquid-glass (gate: tsc 0 errors + all tests pass)
```

---

## §2 Reason for Ordering

- **Merge wave first (Const. Art. 2.4 + LEARNINGS:2026-05-25 sequential pattern):** `design/creative-polish-2026-05-27` already modifies TasksScreen tokens (opacity, overlay, spacing). Liquid glass builds on those tokens. Starting spec before creative-polish is on `main` risks a design branch that conflicts with or duplicates the token work already done.

- **Dani spec before Shamus builds (Const. Art. 2.4 — Design Compiler mandate):** UI-touching changes pass a 7-layer compile gate. Layer 1 (Tokenization) requires that blur intensity, tint, and opacity be expressed as named tokens before implementation begins. If Shamus hard-codes values, Design Compiler Layer 1 blocks the merge. Spec-first eliminates that rework cycle.

- **Jordan NOT triggered (Const. Art. 7.6):** Six-trigger check passed:
  - Location data: ✅ No — visual blur does not touch location handling
  - Disability data: ✅ No
  - PII beyond auth: ✅ No
  - RLS/auth/session: ✅ No
  - External API sending user data: ✅ No
  - New data persistence: ✅ No — blur intensity is a static UI property (no AsyncStorage needed)
  → Jordan review NOT required. No Phase-0 hold.

- **expo-blur is NOT installed (ASSUMPTION — verified):** `package.json` has no `expo-blur` entry. Shamus must `npx expo install expo-blur` before building. Sky may need to rebuild the dev client if using Expo Go (expo-blur uses a native module).

- **Design Compiler gate mandatory (Const. Art. 2.4):** Luxury UI Score must hit ≥75 on Layer 5. A glass effect is exactly the kind of polish Layer 5 was designed to evaluate — Dani has final call on whether the result feels premium enough.

- **Gary typecheck gate:** TasksScreen is a complex screen (SectionList, 6 imports, typed theme tokens). BlurView wrap must not break `tsc --noEmit`.

---

## §3 Blocked Nodes

- `{node: dani/liquid-glass-spec#step-1, why: creative-polish-2026-05-27 and wave3 not yet on main; spec must build on those token foundations, unblock: Monday merge wave completes (Sky merges creative-polish then wave3), type: BLOCKER}`
- `{node: shamus/liquid-glass-build#step-1, why: awaiting Dani spec + expo-blur not installed, unblock: Dani spec complete + Sky confirms native module rebuild is acceptable (Expo Go vs dev client), type: MISSING_INPUT}`
- `{node: shamus/liquid-glass-build#step-2, why: Android BlurView hardware acceleration not guaranteed on older devices, unblock: Dani spec must include explicit Android fallback strategy (opacity-only overlay), type: MISSING_INPUT}`

---

## §4 Checkpoint References

- `{name: creative-polish branch, role: Shamus/Dani, artifact: branch:design/creative-polish-2026-05-27, qa-report: qa-reports/2026-05-28_Design_Polish_Loop_Trigger.md:1}` — contains TasksScreen token sweep that liquid glass will build on
- `{name: Monday merge wave plan, role: Morgan, artifact: branch:n/a, qa-report: qa-reports/2026-05-29_Morgan_Team_Coordination.md:1}` — determines when liquid glass can START (after wave completes)
- `{name: Design Compiler policy, role: Dani/Morgan, artifact: branch:n/a, qa-report: qa-reports/2026-05-28_Design_Polish_Loop_Trigger.md:1}` — 7-layer gate applies to this feature

---

## §5 Duplication Report

No duplications detected this cycle. The creative-polish branch touches TasksScreen style/tokens; liquid glass is an additive visual effect layer that does not duplicate any existing work. After creative-polish lands, there is no overlap.

---

## §6 STATE SNAPSHOT

**New backlog item added:** `feat/liquid-glass-tasks` — STATUS: QUEUED, awaiting Monday merge wave.

**Priority rationale:** Sky requested "ASAP." Given Monday merge wave must land first, earliest start is Tuesday 2026-06-03. Not a blocker for any in-flight work. Classifying as HIGH (user-visible delight, Sky-initiated, no dependencies from other features).

**No PROJECT_STATE.md update needed this cycle** — existing state is current; this report appends to backlog only. Morgan will update PROJECT_STATE.md during the Monday merge wave dispatch.

---

## §7 Execution Plan (Liquid Glass Feature)

```
Phase 0 — PREREQUISITE (Monday 2026-06-02)
  Monday merge wave: creative-polish → wave3 → security-hardening-wave2

Phase 1 — SPEC (Tuesday 2026-06-03, ~2h, Dani)
  READY after: Phase 0
  Tasks:
    - Decide platform strategy (BlurView on native, backdrop-filter on web)
    - Propose token additions: overlay.blur.intensity, overlay.tint.light, overlay.tint.dark
    - Specify reduced-motion fallback (accessibility gate)
    - Specify Android fallback for devices without hw blur acceleration
    - Scope: TasksScreen container (header + list area) vs list-only
  Deliverable: qa-reports/2026-06-03_Dani_LiquidGlassSpec.md

Phase 2 — BUILD (Tuesday–Wednesday 2026-06-03/04, ~4–6h, Shamus)
  READY after: Phase 1 spec approved
  Tasks:
    - npx expo install expo-blur
    - Wrap TasksScreen list container in BlurView (iOS/Android)
    - Web: CSS backdrop-filter via StyleSheet (React Native Web)
    - Dark mode tint variation via useColor()
    - useReducedMotion() fallback (opacity-only, no blur) — Alex gate
    - Android fallback: semi-opaque overlay if BlurView unavailable
  Branch: feat/liquid-glass-tasks-2026-06-03

Phase 3 — DESIGN COMPILER (Wednesday 2026-06-04, ~1h, Dani)
  READY after: Phase 2 PR
  7-layer gate; expect Layer 5 Luxury UI Score to be the focus.
  COMMIT → proceed | POLISH → 1 iteration max | BLOCK → escalate to Morgan

Phase 4 — QA GATE (Wednesday 2026-06-04, ~30min, Gary)
  tsc --noEmit (0 errors) + full test suite pass (922+ tests)

Phase 5 — MERGE (Wednesday 2026-06-04, Rory)
  READY after: Phase 4 pass

TOTAL ESTIMATED CALENDAR TIME: ~3 days from Phase 0 complete
PARALLELIZABLE: Phases 1 and existing Monday work are independent. Phases 3+4 can overlap (Gary checks types while Dani runs compiler).
CRITICAL PATH: Phase 0 (merge wave) → Phase 1 (spec) → Phase 2 (build)
ACYCLIC: true ✅
BACKGROUND CONSTRAINTS: N/A (all phases require judgment roles)
```

---

## Technical Notes for Dani's Spec

**expo-blur:** `BlurView` from `expo-blur` (~14.x compatible with SDK 54). Native UIVisualEffectView on iOS. On Android, hardware-accelerated blur is available API 31+ only; older devices need a graceful fallback.

**Current TasksScreen structure:** Uses `SectionList` (not FlatList). The screen has a fixed header row (sort/filter controls) + the scrollable flag list. The most natural glass treatment is a full-screen blur behind the entire panel (positioned absolutely over the map) rather than wrapping just the SectionList.

**Web:** React Native Web renders `BlurView` as a `div` with inline styles. CSS `backdrop-filter: blur(Xpx)` + `background: rgba(...)` is the idiomatic web fallback — works in all modern browsers. Wrap in a `Platform.select` if needed.

**Existing tokens:** `shadow`, `radius`, `spacing` already imported in TasksScreen. A new `overlay` token category (or extending `shadow` to include blur/opacity values) is the cleanest approach and passes Design Compiler Layer 1.

**Accessibility:** `useReducedMotion()` is already used elsewhere in AccessMap (Wave 5 a11y). If motion is reduced, render a plain semi-opaque overlay instead of animated blur — WCAG 2.3.3 (Animation from Interactions) best practice. Alex gate will catch this.
