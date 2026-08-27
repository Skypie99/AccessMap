# Flagstone E1F AuthProvider async lifecycle repair - QA closeout

**Date:** 2026-08-27  
**Worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`  
**Branch:** `codex/presubmission-ui-polish`  
**Production repair under validation:** `c24f56ed80c3a06eaeb36d8f89a06c9dd57b601b` (`fix(auth): revalidate token refresh lifecycle generation`)

## Outcome

**E1F automated validation is green.** The original provider-unmount regression now passes in isolation, the complete E1 checkpoint suite is green, TypeScript and lint gates pass, and the full Jest corpus passes.

The repair is intentionally limited to `src/lib/auth.tsx`. The parent-to-`c24f56e` production diff changes only that file, adding a generation-and-active-user revalidation immediately before `requestExpoPushToken`; its existing post-request guard remains in place. This preserves the one-captured-generation invariant across the async token-refresh operation.

The branch itself is not an auth-only branch: it was already 23 commits ahead of local `main` before the E1F repair work. This closeout attests the narrow `c24f56e` commit diff, not all historic Flagstone work on the branch.

## Initial state verification

- Branch: `codex/presubmission-ui-polish`
- Initial HEAD: `c24f56ed80c3a06eaeb36d8f89a06c9dd57b601b`
- Tracked working tree: clean
- Staged paths: none
- Untracked paths: none
- Divergence from local `main`: `0 behind / 25 ahead`
- No fetch was performed.

## Production scope verification

Command:

```bash
git show --format=fuller --stat --name-status c24f56e
git diff --check c24f56e^ c24f56e
```

Result: `c24f56e` modifies only `src/lib/auth.tsx`; `git diff --check` produced no whitespace errors. No production source was changed during validation.

## Required regression and E1 evidence

### Original defect in isolation

```bash
npx --no-install jest --ci -w 1 --runTestsByPath src/lib/__tests__/auth.pushSequencing.test.tsx -t "does not present education after the provider unmounts with eligibility in flight"
```

Result: exit `0`; `1/1` selected test passed (`15` intentionally skipped by the name filter). This confirms the in-flight eligibility/unmount path does not present education; the test's zero token-request and zero-save assertions also pass.

### Checkpoint A - defect suite and auth sequencing

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/lib/__tests__/auth.pushSequencing.test.tsx src/navigation/__tests__/postSignInPushGate.test.ts src/navigation/__tests__/RootNavigator.pushEducation.integration.test.tsx
```

Result: exit `0`; `3/3` suites and `28/28` tests passed.

### Checkpoint B - passive location and onboarding

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/lib/__tests__/useUserLocation.permission.test.tsx src/components/__tests__/OnboardingCards.dynamicType.test.tsx
```

Result: exit `0`; `2/2` suites and `28/28` tests passed.

### Checkpoint C - guest handoff and detail presentation

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/screens/__tests__/TasksScreen.guestHandoff.test.tsx src/screens/__tests__/MapScreen.guestHandoff.test.tsx src/screens/__tests__/TasksScreenFlagCard.test.tsx src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx src/screens/__tests__/MapScreen.detailFocus.test.tsx
```

Result: exit `0`; `5/5` suites and `55/55` tests passed.

### Checkpoint D - notification preferences

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/hooks/__tests__/useNotificationPreferences.test.ts
```

Result: exit `0`; `1/1` suite and `13/13` tests passed.

## Full automated gates

```bash
npm run typecheck
```

Result: exit `0`; `tsc --noEmit` emitted no diagnostics.

```bash
npm run lint
```

Result: exit `0`; `90` warnings and `0` errors. This matches the established warning baseline. `src/lib/auth.tsx` did not appear in the warning output.

```bash
npx --no-install jest --ci -w 3
```

Result: exit `0`; `253/253` suites passed; `3,703/3,703` non-todo tests passed; `32` tests are explicitly marked todo; `0` snapshots.

## Non-blocking harness output

- Every Jest command emitted the known Watchman warning for a protected CloudKit cache subtree. Watchman was not reset or reconfigured.
- Checkpoint B retained existing React Native `Animated` `act(...)` console warnings.
- Checkpoint C retained existing `SafeAreaView` deprecation and asynchronous `act(...)` console warnings.
- The full corpus retained existing test-console logs and warnings for exercised fail-soft/error branches. No test failure resulted.

## Boundaries and remaining acceptance

- No dependency install, production configuration change, migration, network write, external send, merge, push, rebase, deploy, EAS action, or App Store action occurred.
- No runtime/device, VoiceOver, keyboard, Dynamic Type, theme, motion, or notification-permission acceptance was performed or claimed in this automated closeout.
- R5 or any separate independent-review process remains outside this E1F validation record.

## DECISIONS FOR SKY

**Decision:** Review and merge the validated E1F repair once the branch-level Flagstone change set is ready.  
**Recommendation:** Accept the `c24f56e` AuthProvider repair as automated-green and retain this closeout record with it.  
**Why:** The exact prior failure, all E1 checkpoints, TypeScript, lint, and the full Jest corpus pass; the commit scope is one approved production file.  
**Alternative:** Hold for a separately authorized runtime/device or independent review.  
**Impact:** Holding does not change the automated result, but delays final acceptance beyond the E1F scope.
