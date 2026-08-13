# CLOSEOUT — Map + Sheet Gestures Spec Run (2026-08-12)

**Status: COMPLETE — spec + proposals only. Zero app code changed, zero commits. Build is gated on Sky's ruling (QUESTIONS.md, especially Q3).**
Run: Fable 5 max effort, single phase · repo audited at `main` @ `07f82bc` · output: this directory.

## The three headline verdicts

1. **Pinch-to-zoom already exists.** react-native-maps (Apple Maps) and Leaflet both ship it enabled, the camera is uncontrolled so nothing fights the gesture, and the box-none overlay law means the chrome can't eat the touches. The honest deliverable is a device-pass checklist plus two optional taste knobs (min-zoom clamp, rotate/pitch) — **not a build**. If pinch ever felt missing, blame the iOS Simulator's ⌥-drag two-finger emulation, not the app.

2. **Pull-to-dismiss splits into two tiers, and Tier 1 is one prop.** RN 0.81 blocks the native iOS sheet swipe by default (`modalInPresentation = YES`) but wires the unlock: **`allowSwipeDismissal={true}` on Nearby's pageSheet delivers real UIKit finger-tracking dismissal with state sync through the existing `onClose`** — no custom gesture code, and it satisfies guard law F as written. Today that sheet resists-then-closes (janky but state-safe). Tier 2 — Report and the other five transparent half-sheets — needs one new primitive (`SheetPull`: RNGH `PanGestureHandler` + core Animated, native driver, no Reanimated needed) with the dismiss-vs-scroll rule stated precisely: **pan arms only at top-of-scroll, ≥16pt deliberate downward travel; commit at max(120pt, 30% of card) or a 700pt/s flick; everything else scrolls the form.** Diagrams: `diagrams/gesture-flows.html`.

3. **The build is gated by a guard law, by design.** `dismissalStandard.guard.test.ts` law F bans custom gesture code repo-wide ("swipe stays UIKit-only") — the sibling chrome run's SPEC §8 explicitly warned this run about it. Tier 2 therefore requires a **deliberate, Sky-signed amendment** (single-file exception with drain discipline + a new non-vacuous guard suite). **Approving Q3-A is that sign-off.** Q3-B (Tier 1 only, no amendment) is the legitimate cheap ruling if the amendment feels heavy.

## Sky's rules, honored structurally
- **Every close button stays** — INVENTORY §5 censuses all of them; the new guard makes removing one a test failure (SPEC §3.4-1).
- **Accidental drags spring back harmlessly** — threshold + velocity + 16pt activation; the state machine has an explicit cancel path.
- **Reduce Motion:** tracking (direct manipulation) stays; every settle goes instant.
- **VoiceOver:** gestures stand aside; the escape scrub + close buttons remain the AT doors, focus-return choreography untouched (law B/J parity).
- **The map never dismisses** — a downward drag on the map is a pan, full stop; the grabber pill every sheet already wears finally stops being a decorative lie.

## Read in this order
1. `QUESTIONS.md` — 9 rulings, Q3 is the gate.
2. `SPEC.md` — the build contract (§1 pinch · §2 pull per class + numbers · §3 a11y/laws/guards).
3. `diagrams/gesture-flows.html` — the two interaction diagrams.
4. `00_INVENTORY.md` — Step-0 ground truth: map stack, gesture infra, the 16-surface dismissible census, the guard-law landscape, the pageSheet finding.
5. `INTEGRATION-MAP.md` — commit slices G0–G6, file:line touch list, chrome-overlap flags, PROTECT union, device-pass checklist.

## Corrections to prior briefings (verify-first payoff)
- The map-chrome build is **MERGED** (`07f82bc`); memory's "Sky fires the chrome build next" was stale. The gesture branch cuts from current `main` — the two-run branch-stacking law is satisfied by history.
- react-native-gesture-handler is installed with **zero live consumers** and **no `GestureHandlerRootView`** at the root — any RNGH gesture would silently no-op today. G0 fixes that in one line.
- No Reanimated exists in this app; the spec deliberately avoids requiring it.

## What happens next (all Sky-gated)
Sky answers QUESTIONS.md → if Q3-A: fire the build per INTEGRATION-MAP commit slices (G0 amendment+rails first, guards before code) → device pass per the checklist → Sky merges. If Q3-B: build shrinks to G0-partial + G1 (Nearby + optional pageSheet ride-alongs) and Report keeps buttons-only.

*This run built nothing and STOPS here.*
