# Flagstone Wave 2 — Screen-Specific Implementation

**Date:** 2026-08-26  
**Branch:** `codex/presubmission-ui-polish`  
**Implementation SHA:** `4e0e3cc` (`feat(ui): implement Wave 2 screen polish`)

## What changed

- **Explore:** removed the obsolete large in-map `HeatmapLegend` component and
  its unit test after confirming no tracked source consumer remained. The compact
  Legend action and full `LegendModal` route remain. Added local/session-only
  dismissals for the compact shortcut and the empty-heat outcome notice, each
  with an independent labelled 44pt close target. The k-anonymity notice,
  heat-map preference behavior, map touch-through wrappers, and Wave 1 region
  interaction work remain intact.
- **Feedback:** adopted the Wave 1 expanded shared Sheet, including bulk glass,
  keyboard avoidance, scroll/pull coordination, safe-area geometry, focus
  handling, and a pinned action row. Added a Feedback-local dirty-close flow:
  body text or a changed opening email prompts with the approved destructive
  copy; category-only and untouched prefilled email do not. Sending blocks all
  dismissals; successful send clears the body and closes without prompting.
- **Barrier sheets:** opted Status History and Report Content into expanded
  Sheet presentation and removed only their obsolete local height caps. Flag
  Detail remains hand-built, now filling from `insets.top + spacing.sm` to its
  existing safe bottom treatment while preserving pinned header, scrolling body,
  pull behavior, and nested History/Report mounts.
- **Review Barriers and spacing:** moved the Tasks magnifier into a normal-flow,
  wrapper-owned search field with border/material/radius/46pt ownership; the
  TextInput is intentionally borderless. Applied the approved Home, Tasks,
  signed-in Profile, and guest Profile top-safe-area spacing values without
  changing shared `ScreenHeader` or Nearby source.

## Tests and gates

### Targeted checkpoints A–E — PASS

```bash
npx --no-install jest --ci --watchman=false -w 3 \
  src/components/__tests__/FeedbackModal.test.tsx \
  src/screens/__tests__/Wave2ScreenGeometry.test.ts \
  src/screens/__tests__/MapScreen.legendButton.test.tsx \
  src/screens/__tests__/MapScreenHeatEmpty.test.ts \
  src/components/__tests__/StatusHistoryModal.test.tsx \
  src/components/__tests__/ReportContentModal.test.tsx \
  src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx \
  src/components/ui/__tests__/Sheet.presentation.test.tsx \
  src/screens/__tests__/NearbyFlagsModal.focus.test.tsx \
  src/screens/__tests__/NearbyFlagsModal.description.test.tsx
```

Result: **10 suites passed, 62 tests passed**. Existing Nearby and modal test
warnings about deprecated `SafeAreaView` and asynchronous `act()` updates were
emitted, but no test failed and no Nearby code was changed.

### Canonical gates — PASS

```bash
npm run typecheck
```

Result: passed (`tsc --noEmit`).

```bash
npm run lint
```

Result: passed with **0 errors** and the repository’s existing warning set
(83 warnings; no Wave 2 lint errors).

```bash
npx --no-install jest --ci -w 3
```

Result: passed. Watchman emitted an environment-level permission warning while
scanning an unrelated Siri Vocabulary directory under the home folder; the test
run completed successfully and made no repository changes.

## Runtime and visual verification

The approved consolidated iOS Simulator/runtime gate for Waves 1–3 remains
**deferred to Wave 3**. It is not waived. No Simulator, EAS, production service,
real location, real user data, migration, merge, or push action was performed
in Wave 2.

Wave 3 must visually verify the combined build, including Explore in light and
dark mode, liquid-glass transparency, compact-map controls, no map gesture dead
zones, expanded-sheet safe geometry and keyboard behavior, Feedback discard
flow, and the revised screen spacing.

## Remaining work

- Wave 3 only; do not begin it from this commit.
- Run the approved consolidated synthetic/local iOS Simulator visual gate before
  Sky merges the Wave 1–3 branch.

## DECISIONS FOR SKY

### Consolidated visual gate

- **Decision:** retain the single Waves 1–3 runtime/visual gate in Wave 3.
- **Recommendation:** keep the approved deferral and require that gate before
  merge.
- **Why:** Wave 2 changes shared visual geometry and Explore controls; evaluating
  all three waves together avoids duplicate simulator cycles while preserving the
  final acceptance requirement.
- **Alternative:** run a separate Wave 2 Simulator pass now.
- **Impact:** no Wave 2 runtime evidence exists independently; the combined
  Wave 3 gate is a merge prerequisite.
