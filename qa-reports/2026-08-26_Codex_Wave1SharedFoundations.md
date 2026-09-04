# Codex Report — Wave 1 Shared Foundations — 2026-08-26

## Historic Authorization Record — Resolved

- [x] **Authorize the location-sensitive Map foundation and Explore Simulator QA** — Sky supplied narrow written authorization in the follow-up task. The resulting work is recorded in the addendum below.

## Historic Blocker — Resolved for Implementation

- The requested Map foundation touched location-sensitive behavior in `src/components/PlatformMap.tsx` and `src/screens/MapScreen.tsx`. The estate's global Rule 5 required explicit authorization, which Sky supplied before the scoped patch was made. The remaining visual-acceptance limitation is an environment issue, not an authorization issue.

## Summary

The independent Wave 1 foundations are implemented on `codex/presubmission-ui-polish` at implementation commit `8410d72`. The bottom navigation now has a true iOS liquid-glass capsule, refined decorative segment treatment, preserved Android/Reduce Transparency material fallbacks, and focused accessibility/material tests. `Sheet` now supports an opt-in expanded presentation while every existing screen remains on unchanged standard geometry.

At this original-report snapshot, the Map foundation was still blocked. The authorized implementation, its tests, and the Simulator availability result are recorded in the addendum below. Wave 2 was not started; no dependency, EAS, merge, push, or production action occurred.

## What Shipped (Checkpoints)

- `8410d72` — `src/navigation/RootNavigator.tsx`, `src/navigation/TabBarGlass.tsx`, and `src/navigation/TabBarButton.tsx`
  - Normal iOS uses an inset `spacing.md`, clipped 68pt crystal-material capsule with map-crystal floor tokens and a subtle specular edge.
  - The map remains visible beneath the capsule and the lower safe area is transparent only for the normal liquid path. Android retains the prior blur + opaque-floor material, and Reduce Transparency retains the full-band opaque fallback.
  - Existing routes, badges, haptics, selection semantics, and `PlatformPressable` prop forwarding remain intact. Home and Tasks receive the only two decorative dividers; the selected segment receives a decorative full-width 2pt underline.
- `8410d72` — `src/components/ui/Sheet.tsx`
  - Added `presentation?: 'standard' | 'expanded'`, defaulting to `standard`.
  - Expanded geometry fills from `insets.top + spacing.sm` to the existing bottom-safe-area padding across opaque/glass and KAV/non-KAV paths, without opting in a production screen.
- `8410d72` — targeted navigation and Sheet tests
  - Added material-path coverage for iOS liquid glass, light/dark contrast-safe ink roles, Android, and Reduce Transparency fallbacks.
  - Extended tab-button coverage for semantic forwarding, decorative dividers, and the full-segment underline.
  - Added Sheet presentation coverage for standard/default, expanded geometry, KAV, glass, close, and SheetPull behavior.

## Findings by Domain

### Accessibility

- 🟢 Decorative dividers and underline are hidden from assistive technology; all supplied navigation accessibility props remain on the real `PlatformPressable`.
- 🟢 The liquid path uses the existing contrast-safe `brandTextAlt`/`inkSelect` active inks and `textStrong` inactive ink; fallbacks retain their existing tab inks.
- 🟡 Device visual contrast and map-interaction evidence is outstanding only because the Explore Simulator checkpoint is blocked.

### Privacy (original snapshot)

- ⚪ Map callbacks, region tracking, and Explore Simulator work were still pending. See the addendum for the authorized completion and the remaining visual acceptance limitation.

### Tests / CI

- 🟢 Targeted checkpoint: `npx --no-install jest --ci -w 3 src/navigation/__tests__/tabBarButton.a11y.test.tsx src/navigation/__tests__/tabBarGlass.test.tsx src/components/ui/__tests__/Sheet.dismissal.test.tsx src/components/ui/__tests__/Sheet.presentation.test.tsx src/screens/__tests__/bp11PressVocabGuards.test.ts src/__tests__/sheetBodyScrolls.guard.test.ts` — 6 suites, 46 tests passed.
- 🟢 `npm run typecheck` — passed.
- 🟢 `npm run lint` — passed with 83 pre-existing warnings and no errors.
- 🟢 `npx --no-install jest --ci -w 3` — passed (exit 0) after the targeted checkpoint; no test failures.

## Process Self-Check

### Efficiency Check

No prior project QA report was used. A temporary local `node_modules` symlink was used only to run the approved gates and removed afterward; no dependency changed.

### Overlap Check

No overlap detected: the no-fetch preflight found `main` at `a0bf4d0`, `main...origin/main` at `0 0`, and no conflicting registered worktree.

### Simplification Opportunities

Keeping the existing full-band fallback rather than forcing the capsule shape through Android and Reduce Transparency preserves their approved opaque material paths. Extracting `TabBarGlass` made that material split unit-testable without adding a dependency or changing navigation structure.

## How to Review

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish show 8410d72
```

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish status --short
```

```bash
cd /Users/skypie/AccessMap-codex/presubmission-ui-polish
npm run typecheck
```

```bash
cd /Users/skypie/AccessMap-codex/presubmission-ui-polish
npm run lint
```

```bash
cd /Users/skypie/AccessMap-codex/presubmission-ui-polish
npx --no-install jest --ci -w 3
```

## Next Recommended Action (superseded)

See the addendum's current `## DECISIONS FOR SKY` entry.

---

## Addendum — Authorized Map Foundation Execution

Sky supplied narrow written authorization for the location-sensitive portion of the already-approved Wave 1 plan. That resolves the earlier authorization blocker only; the implementation below does not change location permission, collection, persistence, transmission, backend, authentication, or map architecture.

### What changed

- `src/components/PlatformMap.tsx`
  - Replaced native `getCamera().zoom` reads with an uncontrolled settled-region ref seeded from `initialRegion`.
  - Every imperative region movement updates that ref before calling `animateToRegion`; `zoomBy` scales both deltas by 0.5/2 and uses `motion.duration.base`, or `0` under Reduce Motion.
  - Added direct-map-touch and settled-region callbacks. Native `onRegionChangeComplete` replaces the optimistic ref with the settled native region.
- `src/screens/MapScreen.tsx`
  - Retires the one-time initial/fallback arrival fits immediately on a direct map touch, search, or saved-place move.
  - Updates `currentRegionRef` only from the settled-region callback: no controlled `region`, per-frame state, or custom gesture handler was introduced.
  - Made only transparent bottom/FAB layout wrappers `pointerEvents="box-none"`; the legend and FAB controls retain their own touch targets.
- `src/components/__tests__/PlatformMapNative.reduceMotion.test.tsx` and `src/screens/__tests__/MapScreen.arrival.test.ts`
  - Added coverage for region-space zoom, rapid compounding +/- taps, motion durations, callback forwarding, settled-region use, direct-interaction fit retirement, and touch-through wrappers.

### Gates run after the authorized Map changes

- 🟢 Targeted Map checkpoint:
  ```bash
  npx --no-install jest --ci -w 3 src/components/__tests__/PlatformMapNative.reduceMotion.test.tsx src/components/__tests__/PlatformMapNative.calloutClear.test.tsx src/components/__tests__/PlatformMapCluster.reduceMotion.test.tsx src/screens/__tests__/MapScreen.arrival.test.ts src/screens/__tests__/MapScreen.headerActions.test.ts src/screens/__tests__/MapScreen.legendButton.test.tsx
  ```
  Result: 6 suites, 59 tests passed.
- 🟢 `npm run typecheck` — passed.
- 🟢 `npm run lint` — passed with the existing 83 warnings and no errors.
- 🟢 `npx --no-install jest --ci -w 3` — passed (exit 0). Watchman emitted a non-fatal host warning for a protected Apple Maps container; Jest also emitted existing test-console warnings. No test suite failed.

### Simulator evidence

- ⚪ No production service, real account, or real location was used.
- ⚪ The supported iPhone 17 Pro (`C2D22684-2D71-44DC-90A7-AFC826429A54`) could not boot: its local Simulator data migration failed.
- ⚪ The alternate iPhone 17e (`9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC`) booted, but `simctl listapps` found neither Expo Go nor a current Flagstone development build. This managed Expo checkout has no checked-in `ios/` directory. I did not generate an unreviewed native project or substitute a stale release binary, and I did not start the app against any backend.
- ⚪ Consequently, current-branch visual validation of Explore gestures and the liquid-glass light/dark checkpoint could not be performed in this environment. It is not represented as passed.

## DECISIONS FOR SKY — Addendum

- [ ] **Complete the required visual acceptance before merge.**
  - Recommendation — Run the current `codex/presubmission-ui-polish` branch in a fresh local development build (or Expo Go, if installed) on a healthy iPhone Simulator or a real iPhone, with local/synthetic data only.
  - Why — Automated Map behavior and all repository gates are green, but the required Explore light/dark visual comparison needs the current binary. The available Simulator device either failed data migration or lacked a current compatible runtime.
  - Alternative — Merge based on the automated gates alone.
  - Impact — The alternative leaves the approved liquid-glass visual direction and physical gesture-path acceptance unproven; it does not meet the stated Simulator acceptance requirement.
  - Rollback — Revert scoped Map commit `77482c5` if review finds a problem; no privacy architecture or backend change is involved.
  - Owner — Sky.

## Current handoff

Implementation and automated Wave 1 gates are complete on `codex/presubmission-ui-polish` at map commit `77482c5`; Wave 2 was not started. The only outstanding acceptance item is the current-branch iPhone visual run described above. No EAS build, merge, push, dependency change, or production action occurred.
