# Codex Report — Wave 1 Shared Foundations — 2026-08-26

## DECISIONS FOR SKY

- [ ] **Authorize the location-sensitive Map foundation and Explore Simulator QA** — PlatformMap/MapScreen region, gesture, and arrival-fit behavior is privacy-sensitive under the estate rule.
  - Option A (Recommended) — Explicitly authorize the already-approved Wave 1 Map foundation and local/synthetic-data Explore Simulator QA after this warning.
  - Option B — Defer the Map foundation and its Simulator checkpoint to a separate Sky-directed task.
  - Impact — Until Option A, the settled-region/zoom/interaction-retired-fit changes and the required visual Explore proof in light and dark mode cannot be completed.
  - Rollback — No Map or MapScreen files were changed in this commit.
  - Owner — Codex.

## BLOCKERS / FAIL_FAST

- **BLOCKER** — The requested Map foundation touches location-sensitive behavior in `src/components/PlatformMap.tsx` and `src/screens/MapScreen.tsx`.
  - The estate's global Rule 5 requires Sky's explicit decision after warning; the attempted scoped patch was refused by that safety control.
  - Quarantined? Yes. Navigation and Sheet work proceeded; Map/MapScreen and their tests remain untouched.
  - Recommended path — Approve Option A in `## DECISIONS FOR SKY`, then resume only the blocked Map checkpoint and Explore Simulator QA.

## Summary

The independent Wave 1 foundations are implemented on `codex/presubmission-ui-polish` at implementation commit `8410d72`. The bottom navigation now has a true iOS liquid-glass capsule, refined decorative segment treatment, preserved Android/Reduce Transparency material fallbacks, and focused accessibility/material tests. `Sheet` now supports an opt-in expanded presentation while every existing screen remains on unchanged standard geometry.

The Map foundation, its targeted tests, and the required Explore light/dark Simulator comparison are not complete because of the privacy-sensitive location blocker above. Wave 2 was not started; no dependency, EAS, merge, push, or production action occurred.

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

### Privacy

- 🔴 Map callbacks, region tracking, and Explore Simulator work were not performed. See the blocker and Sky decision above.

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

## Next Recommended Action

Sky should decide whether to authorize the blocked location-sensitive Map work; otherwise review and merge only the independently complete navigation and Sheet foundation commit.
