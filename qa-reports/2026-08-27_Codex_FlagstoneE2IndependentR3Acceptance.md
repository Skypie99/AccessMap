# Flagstone E2 — Independent R3 Evidence Recheck and Conditional Acceptance

- **Date:** 2026-08-27
- **Worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`
- **Branch:** `codex/presubmission-ui-polish`
- **Reviewed HEAD:** `8e8003ffead973e2c672476549d4810982a195a9` (`docs(qa): close E1F lifecycle repair validation`)
**Classification:** **R3 AUTOMATED EVIDENCE ACCEPTED — M1 MAY PROCEED**

## Outcome

E2 independently rechecked the four evidence findings raised by H2A. The E1/E1F reports were used as leads only: this review inspected the cited production paths, test imports and mocks, callback wiring, assertions, repair commits, and fresh automated-gate results.

All four findings are **CLOSED**. The tests exercise the relevant production provider, navigator, location hook, onboarding component, screens, and notification-preferences hook through controlled external boundaries; they do not rely on test-local reimplementations or source-text ordering for the claims below. The provider-unmount regression that E1 exposed passes in isolation and within Checkpoint A.

Therefore the automated R3 evidence gate is accepted and the separate, focused M1 map audit may begin. This is not runtime, simulator, device, VoiceOver, keyboard, Dynamic Type, theme, motion, notification-permission, release, or production acceptance.

## Verified preflight and ownership

- Branch: `codex/presubmission-ui-polish`.
- Reviewed HEAD: `8e8003ffead973e2c672476549d4810982a195a9`, matching the required E1F closeout.
- Local `main` and local `origin/main` tracking ref: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`. No fetch occurred; `origin/main` is local tracking-ref evidence only.
- Divergence from local `main`: `0 behind / 26 ahead`; `main` is an ancestor of the reviewed HEAD.
- Before this report was created: no tracked, staged, untracked, or unmerged paths; `git diff --check` was clean.
- Registered worktrees: the target branch belongs only to this Codex worktree. The primary checkout remains on `main`; the three registered Claude worktrees are detached and clean. This is Git ownership evidence only; no process or environment inspection was performed.
- E1 `665355f`, E1 report `bb20a46`, repair commits `e7a70b5` and `c24f56e`, and E1F closeout `8e8003f` all resolve in the reviewed ancestry.
- No fetch, merge, rebase, push, deployment, EAS action, simulator/device control, production-data access, credential access, or external action occurred.

## Repair-scope verification

The requested named-commit check and the complete post-E1 range were verified separately.

| Range | Independently observed scope | Result |
| --- | --- | --- |
| `c24f56e^..c24f56e` | One insertion in `src/lib/auth.tsx`: generation-and-active-user revalidation immediately before `requestExpoPushToken`; the existing post-token guard remains. | **VERIFIED** — one production file; whitespace check clean. |
| `665355f..8e8003f` | Two documentation reports plus two production commits. The only non-document production path is `src/lib/auth.tsx`: `e7a70b5` adds generation-aware async lifecycle checks and increments the provider generation on cleanup; `c24f56e` adds the pre-token guard. | **VERIFIED** — repair production scope is one approved file; full-range whitespace check clean. |

The E1F closeout accurately describes the named `c24f56e` commit, but E2 records the complete repair range to avoid representing the broader `e7a70b5` lifecycle repair as a one-line change. This is a documentation-provenance clarification, not a newly found product defect.

## Independent H2A finding recheck

| Finding | Production owner and independently observed behavior | Independently observed test path | Result | Classification |
| --- | --- | --- | --- | --- |
| **H2A-F1** async authentication sequencing and navigator lifecycle | `src/lib/auth.tsx` captures a provider generation for async work, invalidates it on provider cleanup, rechecks it after preference/explanation work, and guards token work before and after request. `RootNavigator.tsx` registers its real `tabPress` listener, queues only an eligible visible-tab action, live-rechecks state, and cancels queued interaction tasks on unmount. | `auth.pushSequencing.test.tsx` renders the real `AuthProvider` and invokes its actual context callback with deferred preference, token, eligibility, and explanation boundaries; it asserts sign-out and user-replacement invalidation, atomic consumption, `Not now`, and the provider-unmount regression. `RootNavigator.pushEducation.integration.test.tsx` renders the exported navigator, captures its actual listener, flushes controlled interaction tasks, and asserts live rechecks plus cancellation. | The former unmount path now makes no explanation, token request, or token save. Checkpoint A passed `3/3` suites and `28/28` tests. | **CLOSED** |
| **H2A-F2** passive web-location privacy behavior | `src/lib/location.ts` checks browser geolocation and the Permissions API before a passive read, fails closed unless permission is already granted, and uses no native request in this path. `OnboardingCards.tsx` advances its `Not now` path without calling the foreground location-request helper. | `useUserLocation.permission.test.tsx` imports and renders the real hook on web with controlled browser APIs. It asserts no query/read/request for unavailable boundaries; no geolocation read for `prompt`, `denied`, or rejected queries; and correct granted success/failure behavior. `OnboardingCards.dynamicType.test.tsx` renders the real component and asserts `requestForegroundPermissionsAsync` is never called after location deferral or the remaining flow. | Negative permission-call assertions execute against production hook/component behavior, not source order. Checkpoint B passed `2/2` suites and `28/28` tests. | **CLOSED** |
| **H2A-F3** guest handoff and auth-loss cleanup | `TasksScreen.tsx` and `MapScreen.tsx` close detail before Profile navigation, spend iOS dismissal intent exactly once, replace non-iOS interaction tasks, cancel them on unmount, and give Profile intent priority over pending Map camera restoration. Tasks clears signed-in tool/selection state on auth loss. | `TasksScreen.guestHandoff.test.tsx` renders the default screen, opens a real screen-owned detail flow, invokes the captured production detail callbacks, and asserts iOS exact-once navigation, Android replacement/cancellation, and auth-loss cleanup. `MapScreen.guestHandoff.test.tsx` renders the default screen, opens detail through the real `PlatformMap.onOpenDetails` prop, and asserts iOS Profile-over-camera priority, Android replacement, and unmount cancellation. | The state transitions are executed through production screens and callbacks, not source scans. Checkpoint C passed `5/5` suites and `55/55` tests. | **CLOSED** |
| **H2A-F4** notification-preferences hook | `useNotificationPreferences.ts` owns storage loading, parsing/defaulting, cancellation, user changes, optimistic state, and failure handling. | `useNotificationPreferences.test.ts` imports `useNotificationPreferences` itself and uses `renderHook`; it asserts empty, complete, partial, malformed, and rejected reads; null-user no-op behavior; deferred unmount and User A/User B races; user-change load cardinality; optimistic writes; and rejected-write behavior. The test has no local parser, loader, or saver copy. | The named test now reaches the exported production hook. Checkpoint D passed `1/1` suite and `13/13` tests. | **CLOSED** |

## Fresh automated gates

| Gate | Command | Independently observed result |
| --- | --- | --- |
| Provider-unmount regression | `npx --no-install jest --ci -w 1 --runTestsByPath src/lib/__tests__/auth.pushSequencing.test.tsx -t "does not present education after the provider unmounts with eligibility in flight"` | Exit `0`; `1/1` selected test passed, `15` intentionally skipped by the name filter. |
| Checkpoint A | `npx --no-install jest --ci -w 3 --runTestsByPath src/lib/__tests__/auth.pushSequencing.test.tsx src/navigation/__tests__/postSignInPushGate.test.ts src/navigation/__tests__/RootNavigator.pushEducation.integration.test.tsx` | Exit `0`; `3/3` suites, `28/28` tests passed. |
| Checkpoint B | `npx --no-install jest --ci -w 3 --silent --runTestsByPath src/lib/__tests__/useUserLocation.permission.test.tsx src/components/__tests__/OnboardingCards.dynamicType.test.tsx` | Exit `0`; `2/2` suites, `28/28` tests passed. |
| Checkpoint C | `npx --no-install jest --ci -w 3 --silent --runTestsByPath src/screens/__tests__/TasksScreen.guestHandoff.test.tsx src/screens/__tests__/MapScreen.guestHandoff.test.tsx src/screens/__tests__/TasksScreenFlagCard.test.tsx src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx src/screens/__tests__/MapScreen.detailFocus.test.tsx` | Exit `0`; `5/5` suites, `55/55` tests passed. |
| Checkpoint D | `npx --no-install jest --ci -w 3 --silent --runTestsByPath src/hooks/__tests__/useNotificationPreferences.test.ts` | Exit `0`; `1/1` suite, `13/13` tests passed. |
| TypeScript | `npm run typecheck` | Exit `0`. |
| Lint | `npm run lint` | Exit `0`; established `90` warnings and `0` errors. No lint fixes were run. |
| Full Jest | `npx --no-install jest --ci -w 3 --silent` | Exit `0`; `253/253` suites passed, `3,703/3,703` non-todo tests passed, `32` explicit todo, `0` failures, `0` snapshots. |
| Whitespace | `git diff --check` | Exit `0`; no whitespace errors before the E2 documentation write. |

### Non-blocking harness output

- Sandboxed Jest cannot initialize Watchman because its state directory is protected (`fchmod ... Operation not permitted`), so no sandboxed command reached test execution.
- The identical test commands ran in the normal host context and passed. Host output retained the non-failing Watchman CloudKit subtree warning.
- Non-silent focused runs also retained the established React Native `Animated act(...)` and `SafeAreaView` harness warnings. They did not cause a test failure. Watchman was not reset and repository configuration was not changed.

## Scope and remaining limits

- E2 changes only this QA report. It changes no production source, test, fixture, mock, dependency, configuration, canonical state file, schema, storage format, native setting, credential, privacy policy, or public interface.
- The finding classifications prove the listed automated claims only. They do not prove real OS permission presentation, actual notification registration, browser/device service behavior, VoiceOver, keyboard navigation, Dynamic Type visual fit, light/dark appearance, Reduce Motion/Transparency, map gesture feel, or physical-device behavior.
- Those runtime and device checks remain outside E2. M1 is a separate focused map audit; it is not started by this review.

## What's left

- No E2 repair packet is required: all four H2A findings are closed and all required automated gates are green.
- The next eligible activity is the separately scoped M1 focused map audit. R5 and release acceptance remain separate gates.

## DECISIONS FOR SKY

- [ ] **Allow the independently scoped M1 focused map audit to proceed.**
  - **Recommendation:** Accept this E2 automated-evidence result and retain E1’s deterministic regression coverage and the E1F AuthProvider repair unchanged.
  - **Why:** Each original H2A gap now has behavioral evidence through the relevant production path, the verified provider-unmount defect is green in isolation and in the checkpoint, and all required automated gates pass.
  - **Alternative:** Hold M1 for another independent evidence review.
  - **Impact:** Advancing allows only M1 planning/audit work. It does not authorize merge, push, deployment, runtime/device acceptance, TestFlight, EAS, or App Store activity.
- [ ] **Keep E2’s scope distinction in future handoffs.**
  - **Recommendation:** Refer to `e7a70b5` plus `c24f56e` as the complete E1F production repair range, while describing the named `c24f56e` change precisely as its one-line pre-token guard.
  - **Why:** This preserves an accurate audit trail without overstating or understating the production scope.
  - **Alternative:** Describe only `c24f56e` as the repair.
  - **Impact:** The alternative could obscure the earlier generation-based lifecycle repair even though both production commits stay within `src/lib/auth.tsx`.
