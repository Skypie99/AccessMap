# Flagstone Wave 3 — Consolidated Release QA and Source Freeze

**Date:** 2026-08-26  
**Branch:** `codex/presubmission-ui-polish`  
**Wave 2 starting SHA:** `3718651dac12639094cbf41d67b5fa559273aa51`  
**Wave 3 test-repair SHA:** `9213587` (`test(ui): align Feedback keyboard guards`)  
**Approved main base:** `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`

## Source-freeze outcome

# ENVIRONMENT BLOCKED — SKY DECISION REQUIRED

All final automated gates pass and no known Wave 1–3 P0 source defect remains.
However, current-branch iOS runtime acceptance could not be completed: the local
CoreSimulator service has no reachable device set. This does **not** waive the
required visual/runtime acceptance. It means this branch is not a source-freeze
candidate until the missing current-binary evidence is collected.

## Preflight

- `main` resolved to the approved base `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`.
- The worktree was clean at the Wave 2 handoff SHA and on
  `codex/presubmission-ui-polish` before Wave 3 writes.
- The expected Wave 1–2 commits were present:
  `8410d72`, `845af8e`, `77482c5`, `63e0a59`, `ede6986`, `4e0e3cc`, and `3718651`.
- The primary checkout and all three registered Claude detached worktrees were
  clean. Their diffs relative to `main` were empty, so no active worktree
  overlapped the Wave 3 files.
- The Wave-owned changed-file set was limited to the existing Wave 1–2 source,
  tests, and QA reports. No location, privacy, auth, Supabase, database,
  dependency, identifier, or production configuration file was changed.
- Tooling recorded: Xcode `26.6 (17F113)` and Node `v24.15.0`.

## Wave 3 repair

### Finding — stale Feedback keyboard guard contracts

The initial full Jest run reached the suite but failed two source-scan guards:

1. `feedbackKeyboard.guard.test.ts` still required `FeedbackModal` to render a
   direct `KeyboardAvoidingView` and own the old bottom-padding expression.
2. `keyboardClass.guard.test.ts` omitted `FeedbackModal` from the live shared
   `Sheet` keyboard-avoidance delegate list.

This was a Wave 2 migration-test drift, not a runtime/source behavior defect.
`FeedbackModal` correctly supplies `presentation="expanded"` and
`keyboardAvoiding` to the shared `Sheet`; that primitive owns the real iOS
padding `KeyboardAvoidingView` and combines `minBottomPad` with the safe-area
inset. The targeted test-only repair updates those guards to protect the
approved shared-primitive architecture rather than the removed local layout.

**Files changed:**

- `src/__tests__/feedbackKeyboard.guard.test.ts`
- `src/__tests__/keyboardClass.guard.test.ts`

**Focused retest:**

```bash
npx --no-install jest --ci -w 3 \
  src/__tests__/feedbackKeyboard.guard.test.ts \
  src/__tests__/keyboardClass.guard.test.ts
```

Result: **2 suites passed, 28 tests passed**. Watchman emitted an unrelated
home-directory scan warning; no source or test result was affected.

## Automated verification

### Baseline

```bash
npm run typecheck
```

Passed: `tsc --noEmit` exited 0.

```bash
npm run lint
```

Passed: **0 errors, 83 existing warnings**. The warnings are outside this
Wave 3 repair and include existing hook-dependency, `any`, and legacy test
warnings.

```bash
npx --no-install jest --ci -w 3
```

Initial result: **2 failed suites, 243 passed suites; 3 failed tests, 3,619
passed tests, 32 todo**. The only failures were the two stale Feedback keyboard
guard contracts described above. The first sandboxed attempt was prevented by
Watchman state permissions before tests started; the recorded baseline result
was obtained using local Watchman state permission.

### Final gates

```bash
npm run typecheck
```

Passed: `tsc --noEmit` exited 0.

```bash
npm run lint
```

Passed: **0 errors, 83 warnings** (unchanged from baseline).

```bash
npx --no-install jest --ci -w 3
```

Passed: **245 suites passed, 3,622 tests passed, 32 todo, 0 failures**.
The suite emitted its existing Watchman scan warning, React `act()` warnings,
SafeAreaView deprecation warnings, and intentional failure-path logging. None
were introduced by this Wave 3 repair and none caused a failing test.

`git diff --check` passed with no whitespace errors.

## Static coverage retained

The final suite includes the Wave 1–2 regression coverage for:

- map arrival/settled-region behavior, native Reduce Motion handling, map
  heat/empty-state behavior, and Explore legend routing;
- touch-target, Dynamic Type, bottom-inset, and accessibility-parent guards;
- liquid-glass tab semantics, selection, dividers/underline, hidden tabs, and
  pressable accessibility behavior;
- expanded `Sheet` standard/expanded geometry, keyboard-avoiding geometry,
  glass-card geometry, close behavior, and SheetPull;
- Feedback categories, dirty/discard flow, send-time dismissal behavior, focus,
  scroll, and expanded Sheet adoption;
- Flag Detail, Status History, Report Content, Tasks top/search composition,
  Home/Profile spacing, and Nearby description/focus regressions.

## Runtime and visual acceptance

### Attempted current-branch paths

1. **Documented Expo development path:** `npm start` started Metro for the
   current worktree at `http://localhost:8081`. The terminal session had no
   interactive stdin for the documented `i` shortcut, and the local Simulator
   service was already unavailable. The Computer Use route also could not
   acquire the host's pending Accessibility/Screen Recording permission.
2. **Documented local iOS development build:** `npm run ios` generated the
   ignored local `ios/` build directory, completed prebuild and CocoaPods, and
   began compiling the current branch. It did not reach install/launch within
   the bounded runtime attempt and was ended without modifying tracked project
   configuration. The generated directory is explicitly ignored by `.gitignore`
   and was never staged.

### Confirmed environment failure

Repeated `xcrun simctl list devices available` calls failed before a device list
could be read. The stable failure was:

```text
CoreSimulatorService connection became invalid
Unable to locate device set: ... Code=61 "Connection refused"
```

The command also reported that `simdiskimaged` was unavailable or not
registered. This is a host Simulator/runtime failure, not evidence of an app
launch failure. No simulator device, app screen, screenshot, real account,
production data, location data, report submission, upload, migration, EAS
build, merge, push, or deployment was used.

### Missing acceptance evidence

The following must be run against a current branch binary after the environment
is available; they remain **NOT VERIFIED — SAFE LOCAL ACCESS UNAVAILABLE**:

- Explore light/dark visual comparison: liquid-glass translucency over the map,
  dividers, edge/highlight, full segment underline, contrast, transparent safe
  area, capsule proportions, and touch-through around floating controls.
- Map pan, pinch, rapid +/- zoom, first-arrival cancellation, no snap-back,
  and absence of runtime errors on a real Simulator device.
- Feedback expanded-sheet keyboard, focus, scroll, close/dirty/discard, and
  sending-state behavior using safe local fixtures only.
- Flag Detail/History/Report presentation, Tasks/Home/Profile/Nearby layouts,
  VoiceOver focus order, accessibility text, Reduce Motion, and Reduce
  Transparency on at least a small supported iPhone and a Dynamic-Island-class
  iPhone.

## Real-iPhone / TestFlight follow-up checklist

When Sky chooses the authoritative current-binary route, verify on physical
iPhone/TestFlight or a repaired current local Simulator:

- Explore in light/dark, normal and Reduce Transparency; inspect liquid glass,
  map visibility, contrast, bottom safe area, and gesture pass-through.
- Map first fit, pan, pinch, repeated +/- taps, no snap-back, and haptics.
- Feedback keyboard, focus return, dirty confirmation, all close paths, and
  blocked dismissal while sending, without submitting real feedback.
- Expanded sheets and Flag Detail at default and accessibility Dynamic Type;
  safe-area, scrolling, pull dismissal, VoiceOver labels/order, and 44pt
  targets.
- Tasks search/filter/clear, Home and Profile top spacing, Nearby focus and
  descriptions, device rotation if supported, and production-like offline/error
  presentation without production writes.

## DECISIONS FOR SKY

### Current-binary visual/runtime gate

- **Decision:** choose the authoritative route for the missing current-binary
  runtime gate.
- **Recommendation:** first restore the local CoreSimulator service and grant
  the required local Computer Use accessibility/screen-recording permission,
  then rerun the existing local development build against this exact branch.
- **Alternative:** use the final EAS/TestFlight build and a physical iPhone as
  the authoritative runtime gate. Sky must perform or explicitly delegate that
  later release action; no EAS action was taken here.
- **Impact:** until one route supplies the listed runtime evidence, this branch
  is **ENVIRONMENT BLOCKED — SKY DECISION REQUIRED**, not a source-freeze
  candidate and not ready to merge.

### Existing warning baseline

- **Decision:** whether to address the 83 lint warnings and non-failing Jest
  console warnings after the source-freeze gate.
- **Recommendation:** leave them out of this Wave 1–3 scope because the lint
  gate passes with zero errors and none are introduced by this Wave 3 repair.
- **Alternative:** begin a separate warning-cleanup effort after visual/runtime
  acceptance.
- **Impact:** no release gate is blocked by these warnings, but they remain
  visible technical-debt follow-ups.

## Stop condition

Wave 3 is complete to the evidence available locally. No Wave 4 or
post-submission work was started.
