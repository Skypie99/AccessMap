# Flagstone Visual Fix Wave 2 — Live Closure

## Scope and evidence

This bounded repair responds to the valid targeted live-runtime evidence for FV-1, FV-3, and FV-4 at base commit `a1b40c288bea79dc57330d3c714adbcf11932e6c` (tree `daa8cd6aa9e475d0c5a8679acc9fda528fc8cef3`). All 15 images listed in `targeted-manifest.json` were inspected before product code was changed.

The product tree started clean. The worktree was not strictly clean because `qa-reports/FLAGSTONE_POST_RELEASE_VISUAL_AUDIT_BACKLOG.md` already existed as an untracked, explicitly authorized out-of-scope document. It was not read as implementation authority, modified, staged, moved, or deleted.

## What changed

### FV-1 — keyboard and focus visibility

- `src/components/AddressSearchModal.tsx`: makes the keyboard-avoiding view, card wrapper, and card spend a definite full-height viewport so the search input and results body can shrink and scroll above the keyboard.
- `src/components/FeedbackModal.tsx`: anchors focus reveal to each field label, re-runs reveal after viewport layout, and bounds only the two input controls to the local header multiplier.
- `src/screens/ReportFlagModal.tsx`: expands the keyboard/XXXL geometry chain, gives the form scroller the remaining height, and anchors description reveal to its label so the pinned footer cannot cover the focused editor.

### FV-3 — Dynamic Type hierarchy

- `src/screens/ProfileScreen.tsx`: puts recent point activity under one content type policy and recomposes each row into summary and metadata groups at accessibility sizes.
- `src/screens/LeaderboardScreen.tsx`: bounds the subtitle locally and makes the list own the remaining expanded-sheet viewport.
- `src/components/FeedbackModal.tsx`: keeps editable control text subordinate to the form hierarchy without globally capping Dynamic Type.
- `src/components/ui/Sheet.tsx`: adds an opt-in subtitle multiplier prop; default behavior for every non-opting consumer is unchanged.

### FV-4 — clipping and constrained containers

- `src/components/PlatformMap.tsx`: bounds native callout text as one local chrome block and derives camera clearance from the same bounded font scale while keeping the pin on-screen.
- `src/components/MyWatchedModal.tsx`: top-aligns tall empty/error/loading states only at accessibility sizes so their leading content remains reachable.
- `src/components/AchievementsModal.tsx` and `src/components/NotificationPrefsModal.tsx`: replace Profile-linked compact caps with expanded, shrinkable reading viewports and bound only their subtitles.

### Tests

- `src/__tests__/visualFreezeFixWave.guard.test.ts`
- `src/__tests__/sheetBodyScrolls.guard.test.ts`
- `src/__tests__/typeBlock.guard.test.tsx`
- `src/components/__tests__/PlatformMapNative.calloutClear.test.tsx`
- `src/components/ui/__tests__/Sheet.presentation.test.tsx`
- `src/screens/__tests__/ReportFlagModal.dynamicType.test.tsx`

These guards cover focused-label reveal ownership, post-layout viewport reveal, keyboard/XXXL flex chains, Profile row recomposition, Leaderboard list ownership, Profile-launched text-sheet geometry, watched-state reachability, and scale-aware native callout clearance.

## Branch and provenance

- Branch: `claude/prompt-c-final-accessibility-20260830`
- Base SHA: `a1b40c288bea79dc57330d3c714adbcf11932e6c`
- Base tree: `daa8cd6aa9e475d0c5a8679acc9fda528fc8cef3`
- Delivery SHA: the commit containing this report; the exact immutable SHA and tree are recorded in the VFW2 final receipt.

## Gates

Focused affected suites:

```text
npx --no-install jest --runInBand --watchman=false --silent [17 bounded suite paths]
Test Suites: 17 passed, 17 total
Tests:       276 passed, 276 total
Snapshots:   0 total
Exit:        0
```

Jest printed its generic asynchronous-open-handle advisory after reporting the successful exit; no suite or assertion failed. A final post-format focused rerun of the five directly touched Profile/map guards also passed: 5 suites and 88 tests.

```text
npm run typecheck
tsc --noEmit
Exit: 0
```

```text
npm run lint
92 warnings, 0 errors
Exit: 0
```

The 92 warnings are the repository's pre-existing warning set; the implementation introduced no new lint warning. The React quality pass caught and corrected the new map font-scale hook dependency before this final result.

```text
git diff --check
Exit: 0
```

Full Jest was not required. The only shared primitive change is an additive, opt-in Sheet subtitle prop with a direct primitive test and three bounded consumers; its defaults and unbounded consumers are unchanged.

## Scope audit

- Visible shipping copy: unchanged.
- Supabase/database/data: unchanged.
- Release, EAS, privacy, package-lock, and generated artifacts: unchanged.
- Simulator: not used.
- Network writes, push, and merge: none.
- Accepted/deferred FV-2, FV-5, FV-6, FV-7, ActivityFeed XXXL, ReportContentModal VF-23, severity XXXL, and P2 cosmetics: not reopened.

## What's left

Source-side closure is complete, but runtime closure still requires Terra verification of the dependencies actually changed: VF-04, VF-06 selected callout, VF-07 normal/max with keyboard, VF-10, VF-12 plus VF-13 lower-scroll proof, VF-15 with keyboard, and VF-17 open/keyboard. The Profile-linked Achievements and Updates sheets also need normal and XXXL comparison captures. Fable re-audit and UI freeze remain intentionally pending that live proof.

## DECISIONS FOR SKY

### Promote this candidate to final visual freeze only after Terra passes the bounded reverify set

- Decision: whether the source-side closure may advance to Fable and UI freeze.
- Recommendation: wait for the exact Terra states above to pass at the delivery SHA.
- Why: this wave exists because valid live evidence contradicted an earlier source-only pass; the same proof boundary must govern closure.
- Alternative: accept source inspection and automated guards alone.
- Impact of the alternative: FV-1/FV-3/FV-4 could remain live release P1s despite a green source tree.
