# Flagstone R1 QA — Safe Areas, Floating Content Reserve, and Capsule Indicator

**Date:** 2026-08-27  
**Branch:** `codex/presubmission-ui-polish`  
**Starting SHA:** `1201b69d0b5593295143c4cab5234f12b032c7e9`  
**Final implementation SHA:** `40fe17cf805cf2ad06e19b86e8b0686e4d649537`  
**Local `main` at precheck:** `a0bf4d04d0d2`  
**Precheck divergence:** release-candidate branch was `0 behind / 9 ahead` of local `main`.

## Precheck

Verified immediately before implementation:

- The independent audit handoff is formally stopped by Sky, rather than active.
- The requested worktree was checked out at `codex/presubmission-ui-polish`, at the specified starting SHA, and clean.
- `src/screens/MapScreen.tsx` was restored to its starting state in this lane. The separate map-banner branch remains outside R1.
- No unmerged paths were reported.

## Root causes

### Verified

- Home and both Profile variants applied `insets.top` through scroll-content padding. That protection scrolled with content instead of remaining at the fixed viewport boundary.
- `TabBarGlass` clips the liquid material capsule, but tab-button underlines are foreground siblings in the full tab row. A selected exterior segment could therefore paint into the capsule's outside margin.
- Profile and Tasks used local tab-clearance literals while guest Profile used another rule. There was no shared rule that treats navigator-reported tab-bar height as the primary bottom reserve.
- Tasks has separate fixed chrome-pane ownership for its top region and keyboard behavior; that behavior was intentionally retained.

### Inferred

The precise device-specific manifestation depends on navigator layout timing and viewport dimensions. R1 removes the documented structural causes: the top exclusion remains fixed, and bottom reserve is derived from the larger of navigator height or safe-area inset without double-counting the inset.

## What changed

### Fixed viewport safe areas

- Home, signed-in Profile, and guest Profile now use non-scrolling viewport wrappers that own `insets.top` exactly once.
- Their scroll bodies retain the pre-existing editorial rhythm beneath that fixed protection rather than repeating the safe-area inset.
- Home's decorative status ledge now derives its height from the actual top inset instead of a fixed 47 pt value.

### Shared bottom reserve

- Added the internal `getFloatingTabBarContentInset(tabBarHeight, safeAreaBottom)` helper, defined as `Math.max(tabBarHeight, safeAreaBottom) + spacing.xl`.
- Signed-in Profile, guest Profile, and Tasks now use that helper. Tasks preserves its selection bulk-action reserve on top of the shared tab reserve.
- Home keeps its intentionally larger existing reserve for its floating report action; its reserve remains larger than the shared navigation clearance.

### Floating capsule indicator

- Added one internal floating-tab geometry module for the existing 68 pt capsule, token-derived side inset/corner radius, control bottom padding, and content reserve.
- `TabBarGlass` consumes those shared capsule dimensions without changing its material ownership or fallback behavior.
- On liquid iOS only, Home and Profile receive leading/trailing decorative, pointer-inert rounded masks for their selected 2 pt underline. The masks clip paint at the capsule exterior edge only; they do not alter pressable bounds or accessibility semantics.
- Tasks remains an unmasked full internal segment. Android, web, and Reduce Transparency fallback paths retain their existing full-band material behavior.

## Files changed

- `src/navigation/tabBarGeometry.ts`
- `src/navigation/RootNavigator.tsx`
- `src/navigation/TabBarGlass.tsx`
- `src/navigation/TabBarButton.tsx`
- `src/navigation/__tests__/tabBarGeometry.test.ts`
- `src/navigation/__tests__/tabBarButton.a11y.test.tsx`
- `src/navigation/__tests__/tabBarCount.guard.test.ts`
- `src/screens/HomeScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/GuestProfile.tsx`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/GuestProfile.test.tsx`
- `src/screens/__tests__/Wave2ScreenGeometry.test.ts`

`src/screens/MapScreen.tsx` was not changed.

## Verification

### Focused tests

Passed with the following focused command:

```bash
npx --no-install jest --ci -w 3 src/navigation/__tests__/tabBarGeometry.test.ts src/navigation/__tests__/tabBarButton.a11y.test.tsx src/navigation/__tests__/tabBarGlass.test.tsx src/navigation/__tests__/tabBarCount.guard.test.ts src/screens/__tests__/Wave2ScreenGeometry.test.ts src/screens/__tests__/GuestProfile.test.tsx
```

Result: **6 suites passed, 47 tests passed.**

The first sandboxed invocation could not update Watchman's user state directory because of its local filesystem permissions. The same read-only test command then passed in the approved local execution context. Watchman continued to emit an unrelated permission warning for a Safari worker directory; it did not affect test results.

### Required full gates

```bash
npm run typecheck
```

Result: **passed**.

```bash
npm run lint
```

Result: **passed with 83 warnings and 0 errors**. The warnings are in existing unrelated files; no lint error was introduced by R1.

```bash
npx --no-install jest --ci -w 3
```

Result: **passed — 246 suites passed, 3,631 tests passed, 32 todo, 3,663 total.** Existing test-console and Watchman warnings remained non-failing.

```bash
git diff --check
```

Result: **passed** before commit.

## Commits

- `b89d6e3 fix(layout): respect safe areas around floating chrome`
- `40fe17c fix(nav): clip selected indicator to glass capsule`

## Map-chrome decision

Map top chrome is deliberately deferred. `MapScreen` has independent measured-chrome, camera, callout, and marker geometry and is adjacent to location-sensitive behavior. It was also the file previously dirty in the shared worktree. R1 did not inspect or modify it beyond confirming it was absent from this lane's diff.

## Runtime checks still required

No EAS build, simulator boot, additional device session, merge, or push was performed. Consolidated R5 visual validation still needs to verify on a conflict-free already-running local device, if available:

- Home/Profile top content cannot scroll behind the status region.
- Profile, guest Profile, and Tasks final content clears the floating tab chrome on relevant safe-area devices.
- Home/Profile exterior liquid-iOS underline paint remains inside the rounded capsule edge, while Tasks keeps its internal segment behavior.
- Reduce Transparency, light/dark material, touch targets, haptics, long-press forwarding, hidden routes, and keyboard behavior remain correct at runtime.

## Deferred

- Map/top-chrome repair, including camera/callout/marker geometry, remains out of R1.
- Runtime visual validation remains consolidated for R5.
- R2-R5 work was not started.

## DECISIONS FOR SKY

### Keep MapScreen as a separate, approved repair

**Decision:** whether to schedule the deferred MapScreen chrome work after R1.  
**Recommendation:** keep it as a map-specific, separately approved phase.  
**Why:** its overlay and measured-chrome geometry are independent of the shared scroll/tab rules and live next to location-sensitive behavior.  
**Alternative:** fold it into a follow-up UI batch.  
**Impact:** folding it in would blur R1's validated scope and increases overlap risk; deferral leaves R1 focused and preserves the separate map-banner branch for its own verification.

## R2 readiness

R1 source changes and automated gates are complete. R2 has not been started and should remain independently scoped. R5 runtime validation is still required before a release-readiness claim.
