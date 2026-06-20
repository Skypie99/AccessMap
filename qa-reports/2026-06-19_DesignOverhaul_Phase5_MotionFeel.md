# AccessMap Overhaul — Phase 5: Motion & Interaction Feel

**Date:** 2026-06-19
**Branch:** `overhaul/phase5-motion-feel` (off merged `main` `9b2458c`)
**Scope:** PRESENTATION / MOTION / a11y. Zero data/auth/fence changes.
**Merge:** Sky-only. Core wave = 2 commits.

---

## Shipped (2 commits)

| Commit | Change | Gate |
|---|---|---|
| `0861041` | **One press language → the inert triage buttons.** New reusable `PressableScale` primitive (`src/components/ui/PressableScale.tsx`): the Button primitive's press feel as a drop-in `<Pressable>` — spring scale-down on press-in + spring-back + a light selection haptic, **gated behind `useReducedMotion()`**. Built on `Animated.createAnimatedComponent(Pressable)` so it's a true drop-in (no wrapper View — flex rows keep working). Applied to the Tasks card's Verify / Resolved / Reject buttons, which were inert on tap. | typecheck + 1721 tests |
| `c0c54ce` | **Reward pill entrance animation.** The "+N points" triage pill hard-appeared; now a spring slide-down + fade on each flash, reduced-motion gated (snaps to rest). Pairs with the FlashBanner animation (Phase 4) so both reward surfaces feel crafted. | typecheck + 1721 tests |

Together: the verify/resolve **reward now feels crafted** — the buttons respond to the press, and the points pill animates in.

## 🔒 Fence proof
Touched `TasksScreen.tsx` + the new `PressableScale.tsx`. Zero data/auth/EXIF/RLS/RPC changes; `updateFlagStatus` and the points trigger untouched.

## ⚠ NEEDS-SKY-DEVICE
Motion *feel* is the one thing only a device certifies: the press-scale spring + haptic, the pill entrance, 60fps, and the reduced-motion rest states. Verify on the TestFlight build.

## Remaining Phase 5 — wave-2 (the primitive is ready; this is mechanical adoption)
Apply `PressableScale` to the other prominent custom controls so the whole app shares one press language:
- **Report FAB** (`MapScreen`) — the primary action button.
- **OnboardingCards CTAs** — currently opacity-only (swap the function-style Pressables; the scale replaces the pressed-opacity).
- **Filter chips** (`MapScreen`) + **FlagDetailModal** triage actions.
Each is a `Pressable` → `PressableScale` swap (static style). Low-risk, but it's broad surface across dense files — recommend doing it as a focused pass, ideally after the device pass confirms the press feel is dialed in.

## Review / merge / rollback
- **Review:** `git diff main..overhaul/phase5-motion-feel`.
- **Merge:** Sky-only. Full `npm test` first.
- **Rollback:** per-commit revert; presentation/motion only — fully reversible. (Reverting the triage-button commit also removes `PressableScale` usage; the primitive file can stay.)
