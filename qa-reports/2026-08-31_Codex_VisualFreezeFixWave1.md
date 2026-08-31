# Flagstone Visual Freeze Fix Wave 1

Date: 2026-08-31
Worker: VF-FIX-WAVE-1
Branch: `claude/prompt-c-final-accessibility-20260830`
Base SHA: `9930bc45ba5275c5d0553707965153c68552984d`
Accepted client ancestor: `92b89b7b368f784d55563deedef7975dd6080dc7`
Delivery SHA: this report's containing commit; the exact immutable SHA is recorded in the final receipt because a commit cannot embed its own hash.

## What changed

This bounded wave addresses only FV-1 through FV-4.

- Added `src/hooks/useFocusedInputScroll.ts`, a small shared hook that scrolls a focused field into context immediately and repeats after the keyboard changes the available viewport.
- Wired that behavior into Address Search, Feedback, and Report description fields while retaining their existing keyboard dismissal, focus styling, form state, and accessibility labels.
- Made Address Search one shrinkable body scroller. Its recent and search result collections are each capped at five items, so they now render inside that owner rather than nesting a virtualized list inside a scroller.
- Measured the denied-location banner and added only its conditional height to the map callout clearance. The banner uses the existing `TYPE_BLOCK.chrome` scaling contract so its sentence and Settings action stay inside the overlay while selected callouts clear it.
- Applied one uncapped content policy to the two Profile navigation groups, scaled their fixed chevrons within the existing header cap, and recomposed leaderboard name/points into a vertical block at the existing accessibility threshold. Leaderboard avatars scale within the existing chrome cap.
- Gave the Watched Flags non-list scroller and the affected Feedback/Report scrollers a definite shrinkable viewport so accessibility text remains reachable rather than being clipped by sheet geometry or pinned actions.
- Added or updated targeted hook, source-contract, render, Dynamic Type, map-overlay, and sheet-containment tests.

Files changed:

- `src/hooks/useFocusedInputScroll.ts`
- `src/components/AddressSearchModal.tsx`
- `src/components/FeedbackModal.tsx`
- `src/components/MyWatchedModal.tsx`
- `src/screens/LeaderboardScreen.tsx`
- `src/screens/MapScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/ReportFlagModal.tsx`
- `src/hooks/__tests__/useFocusedInputScroll.test.tsx`
- `src/__tests__/visualFreezeFixWave.guard.test.ts`
- `src/__tests__/sheetBodyScrolls.guard.test.ts`
- `src/screens/__tests__/MapScreen.openSettings.test.ts`
- `src/screens/__tests__/ReportFlagModal.dynamicType.test.tsx`
- `src/screens/__tests__/ReportFlagModal.test.tsx`
- This report.

No user-facing shipping copy changed. No navigation, backend, schema, location-data handling, permission behavior, global typography primitive, or evidence artifact changed.

## Root causes

1. Keyboard avoidance resized the modal viewport, but the forms did not consistently scroll the active field into the resized viewport. Address Search also kept the focused input outside its only body scroller.
2. Map callout clearance measured persistent command chrome but not the conditional denied-location banner. At large text the uncapped overlay content also consumed enough map area to obscure controls, pins, and popup context.
3. Per-variant scaling let uncapped descriptions overtake capped titles. The leaderboard retained a one-line name/points allocation at accessibility sizes, squeezing names into mid-word fragments while fixed avatars and chevrons stayed visually tiny.
4. Several scrollers could shrink but did not own a definite remaining viewport, allowing a clipping parent or pinned footer to cut accessibility text.

## Gates

### Targeted Jest

Final command:

```bash
npx jest --runInBand --watchman=false --silent src/hooks/__tests__/useFocusedInputScroll.test.tsx src/__tests__/visualFreezeFixWave.guard.test.ts src/__tests__/sheetBodyScrolls.guard.test.ts src/__tests__/feedbackKeyboard.guard.test.ts src/components/__tests__/FeedbackModal.test.tsx src/screens/__tests__/ReportFlagModal.test.tsx src/screens/__tests__/ReportFlagModal.dynamicType.test.tsx src/screens/__tests__/MapScreen.openSettings.test.ts src/screens/__tests__/MapScreen.calloutRhythm.test.ts src/screens/__tests__/LeaderboardScreen.monogram.test.tsx src/screens/__tests__/profileHeroGrammar.guard.test.ts src/__tests__/dynamicTypeGuard.test.ts
```

Result: PASS — 12 suites, 195 tests, 0 failures, 0 snapshots; exit 0. Jest emitted its post-run open-handle advisory after reporting the passing result.

A preliminary targeted run had 1 failure because the existing Report test still required fixed-glyph recovery controls to be uncapped. The implementation intentionally moved only those controls to the existing `TYPE_BLOCK.chrome` contract; the test was updated to assert that bounded scaling while keeping title/location reading content uncapped. The final run above passed.

Full Jest was not run: no global/shared UI primitive was changed, and the render dependency set remained bounded.

### Typecheck

```bash
npm run typecheck
```

Result: PASS — `tsc --noEmit`, exit 0.

### Lint

```bash
npm run lint
```

Result: PASS — exit 0, 0 errors, 92 repository warnings. The warnings are on unchanged lines and were not expanded in this bounded wave.

### Diff check

```bash
git diff --check
```

Result: PASS — exit 0, no output.

### React quality check

PASS — hooks remain unconditional with complete new dependency lists; accessibility names and roles remain intact; normal-size icon geometry is clamped to its existing baseline; list recomposition releases row-only flex at accessibility sizes; no new unbounded render loop or global styling rule was introduced.

## What is left

Source-side work for FV-1 through FV-4 is complete. Runtime visual proof is intentionally not claimed because this task prohibited Simulator and recapture.

Smallest dependency-derived Terra recapture set:

- `VF-04`
- `VF-06`
- `VF-07`
- `VF-10`
- `VF-11` — the lower Watched Flags endpoint shares the changed non-list scroller and was previously incomplete at largest text.
- `VF-12`
- `VF-13`
- `VF-15`
- `VF-17`
- `VF-23`

`VF-09`, `VF-19`, `VF-21`, and `VF-25` were not invalidated: none of their render dependencies changed. Their earlier lower-content limitations remain independent evidence work, not a reason to broaden this fix wave.

The same ten states are the smallest Fable targeted re-audit set after fresh capture.

## DECISIONS FOR SKY

Decision: whether to declare UI Freeze after this source-side handoff.
Recommendation: wait for the ten-state Terra recapture and targeted Fable re-audit above.
Why: the bounded source and automated gates are green, but keyboard, overlay, and largest-text layout outcomes require fresh rendered evidence.
Alternative: accept source-side evidence alone.
Impact: that would leave the runtime visual result unproven and should not be labeled UI Freeze PASS.
