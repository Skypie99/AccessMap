# Codex QA Report — Wave 1 Current-Binary Acceptance — 2026-08-26

## Scope and outcome

This is the separately requested current-binary acceptance checkpoint for Wave 1. No Wave 2 work, source correction, dependency change, EAS build, merge, push, production service, real account, real location, or production data use occurred.

**Outcome: ENVIRONMENT BLOCKED.** The repository-supported Expo Go and local Simulator-build paths were each attempted safely, but neither produced a launchable current-branch binary. Therefore no Simulator visual assertion is represented as passed.

## Live precheck

- Branch: `codex/presubmission-ui-polish`
- HEAD at precheck: `63e0a596dc72364f21576a9715e5d7d9de5baa8e`
- Local `main`: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`
- Local divergence (`main...HEAD`): `0 4`; no fetch was performed and `origin/main` was not treated as live truth.
- This worktree: clean tracked state before runtime setup, no unresolved (`U`) files, no conflict state.
- Registered worktrees: primary `main`, this Codex lane, and three detached Claude worktrees. Their tracked working-tree states were clean and their `main...HEAD` diffs named no Wave 1 files. No active-lane overlap was found.

## Current-binary runtime attempts

### 1. Documented Expo Go workflow — blocked

The repository documents `npm start` / Expo Go for Simulator (`CLAUDE.md` and `docs/CONTRIBUTING.md`). The iPhone 17e Simulator (`9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC`) booted, but had neither Expo Go nor Flagstone installed.

The current branch was launched with only process-level synthetic placeholders:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
EXPO_PUBLIC_SUPABASE_ANON_KEY=synthetic-local-only \
npx expo start --ios
```

Metro started but then waited indefinitely for Watchman `watch-project` after protected home-directory paths could not be opened. The attempt was interrupted cleanly. It did not launch Expo Go or the app. No location, account, or backend request was made.

### 2. Documented local Simulator build — blocked

The repository also documents local `npx expo run:ios --configuration Release --no-bundler` as the no-EAS Simulator workflow. `ios/` was absent and has no tracked files before the attempt.

The first invocation regenerated only ignored local native artifacts and installed CocoaPods, but a temporary dependency symlink caused Expo's `AppEntry` to resolve from the primary checkout and fail to find the current worktree's `App` root. That was a local harness error, not app evidence.

I replaced only that temporary symlink with the documented `npm install` setup. It normalized two version fields in `package-lock.json`; that installer-only change was immediately restored, leaving no package or source diff. The corrected one-time build invocation was:

```bash
LANG=en_US.UTF-8 \
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
EXPO_PUBLIC_SUPABASE_ANON_KEY=synthetic-local-only \
npx expo run:ios --configuration Release --no-bundler --device 'iPhone 17e'
```

After a bounded wait it produced neither Xcode compilation output nor a launched app. It was stopped rather than debugged further. The generated ignored `ios/` directory was removed immediately; no generated native file was retained or committed.

Simulator OS: **not verified**. The current `simctl` runtime query did not return after the build session; no older log was used as proof of current runtime state.

## Acceptance matrix

### Explore map interaction

| Check | Result | Evidence |
| --- | --- | --- |
| Map renders normally | NOT VERIFIED | No current binary launched. |
| One-finger pan | NOT VERIFIED | No current binary launched. |
| Pinch-to-zoom | NOT VERIFIED | No current binary launched. |
| Rapid `+` | NOT VERIFIED | No current binary launched. |
| Rapid `-` | NOT VERIFIED | No current binary launched. |
| Reduce Motion movement | NOT VERIFIED | Native reduced-motion unit coverage is green; no runtime proof. |
| Direct-interaction snap-back prevention | NOT VERIFIED | Targeted Map tests are green; no runtime proof. |
| Settled viewport | NOT VERIFIED | Targeted Map tests are green; no runtime proof. |
| Touch-through around transparent UI | NOT VERIFIED | Source and targeted guard are green; no runtime proof. |
| Controls remain touchable | NOT VERIFIED | No current binary launched. |
| New runtime errors | NOT VERIFIED | No app process reached the UI. |

### Liquid-glass navigation

| Check | Result | Evidence |
| --- | --- | --- |
| Explore light mode | NOT VERIFIED | No current binary launched. |
| Explore dark mode | NOT VERIFIED | No current binary launched. |
| Translucency and map visibility | NOT VERIFIED | Unit material paths are green; visual direction needs runtime evidence. |
| Contrast, divider refinement, underline geometry | NOT VERIFIED | Semantics/material tests are green; visual comparison remains outstanding. |
| Safe area and capsule proportions | NOT VERIFIED | No current binary launched. |
| Route, badge, haptic behavior | NOT VERIFIED | Existing targeted tests cover props and semantics; haptics need runtime. |
| Accessibility semantics | AUTOMATED TEST VERIFIED | Existing TabBarGlass/TabBarButton tests preserve semantic forwarding and decorative hiding. |
| Android / Reduce Transparency fallbacks | AUTOMATED TEST VERIFIED | Existing material-path tests preserve their opaque fallback routes. |

### Expanded Sheet foundation

No production screen was opted into expanded presentation. Existing Wave 1 Sheet tests verify the standard default, expanded safe-top geometry (`insets.top + spacing.sm`), bottom-safe padding, opaque/glass and KAV/non-KAV paths, focus/escape behavior, and SheetPull preservation. Runtime demonstration is correctly deferred to Wave 2 adoption.

## Corrections made

None. The current-binary runtime did not identify a Wave 1 implementation defect. Temporary setup artifacts were removed or restored and are not source corrections.

## Tests and gates

No source file changed during this acceptance checkpoint, so the full automated estate was not rerun merely for ceremony. The existing green Wave 1 gates at `63e0a59` remain applicable:

- Targeted Map checkpoint: 6 suites, 59 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 83 existing warnings and no errors.
- `npx --no-install jest --ci -w 3`: passed (exit 0).

## Visual evidence

No valid current-binary Simulator screenshots exist from this checkpoint, so none were captured or committed. The report distinguishes the automated proofs above from the unavailable Simulator proof; it does not use a stale Flagstone binary as evidence.

## Smallest human setup step

Repair or reset the local Watchman/Simulator development environment, then run the current branch on Sky's physical iPhone through the documented Expo Go workflow with the same non-production placeholder environment values above. The exact practical sequence is: install official Expo Go on the iPhone, start Metro from this worktree after Watchman can create a project watch, and scan the Expo QR code while using only a local/fixture backend. This is the smallest path that avoids EAS, a stale binary, and production data.

## Remaining real-iPhone checks

- Native glass/material quality in light and dark mode.
- Real map feel, pinch focal behavior, and rapid zoom feel.
- Touch-through around floating controls and safe-area/device rendering.
- Final screenshot readiness.

## Wave 2 readiness

Wave 1 source and automated gates remain ready for code review, but the current-binary visual acceptance is blocked. Do not begin Wave 2 or merge this branch until a healthy Simulator or physical-iPhone run completes the matrix.
