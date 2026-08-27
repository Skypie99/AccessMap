# Flagstone E1 — R3 Deterministic Evidence Hardening

**Date:** 2026-08-27

**Worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`

**Branch:** `codex/presubmission-ui-polish`

**Starting SHA:** `478f2817e084573449fb3670d27728354cc5d437`

**Test evidence SHA:** `665355fa8f1d1cc9280c0fbfa758c18e083c6365` (`test(r3): expose deterministic evidence defect`)

**Documentation SHA:** created after this report is finalized; recorded in the final handoff because a commit cannot self-reference

**Classification:** **DEFECT-BLOCKED — H2A NOT READY — R5 HELD**

## DECISIONS FOR SKY

- [ ] **Authorize a narrow AuthProvider unmount repair packet, then require a fresh independent H2A.** E1 deterministically proved that an in-flight push-education eligibility read can outlive `AuthProvider` and still open the explanation boundary after unmount.
  - **Recommendation:** Authorize a source-repair packet limited to the lifecycle guard around `consumePendingPushEducation` in `src/lib/auth.tsx`, retain this regression test, rerun the full gates, then commission another independent H2A before R5.
  - **Why:** The defect crosses an async UI/prompt lifecycle boundary. E1 was explicitly test-only and therefore did not change production source.
  - **Alternative:** Defer the repair and keep H2A **NOT READY** and R5 held. Proceeding to R5 while the active deterministic regression fails is not recommended.
  - **Impact:** The branch is reviewable evidence, but it is not a green acceptance checkpoint. Sky remains the only person who may authorize the source-repair packet, merge, or push.
  - **Rollback:** The test evidence commit and this documentation commit are separate and can each be reverted independently.
  - **Owner:** Flagstone E1 / likely production owner `src/lib/auth.tsx:92-114`.

## BLOCKERS / FAIL_FAST

- **NEW VERIFIED PRODUCT DEFECT — push education can present after `AuthProvider` unmount.**
  - **Active regression:** `src/lib/__tests__/auth.pushSequencing.test.tsx:361-383`, `does not present education after the provider unmounts with eligibility in flight`.
  - **Controlled reproduction:** The test creates a real `AuthProvider`, makes the consumption-time `getPushEnabled` call wait on a controlled promise, starts `consumePendingPushEducation`, unmounts the provider, resolves eligibility as disabled, and awaits the real production callback.
  - **Observed result:** `showPushExplanation` is called once. Expected result is zero calls; token request and save remain uncalled.
  - **Independent reproduction:** The focused one-test invocation fails the same assertion with 1 failed test and 15 skipped tests. Checkpoint A and the full Jest gate fail at the same assertion.
  - **Likely owner:** `consumePendingPushEducation` at `src/lib/auth.tsx:92-114`. It rechecks current-user identity after the eligibility await, but provider unmount does not invalidate that identity or otherwise guard the subsequent explanation call.
  - **Quarantined:** Yes. The failing test remains active. No production repair, API change, privacy change, or test skip was introduced.
  - **Required next path:** Separately authorized narrow source repair, then full verification and a new independent H2A. R5 remains held.
- **Non-blocking test infrastructure:** The first sandboxed Checkpoint A invocation could not initialize Jest because restricted Watchman state returned an `fchmod ... Operation not permitted` error. The identical command was rerun in the approved host context. Host runs retained a non-failing Watchman warning for a protected CloudKit cache subtree. Watchman was not reset and repository configuration was not changed.

## Summary

E1 replaced missing or mirrored evidence for `H2A-F1` through `H2A-F4` with deterministic tests that execute the real production provider, navigator, hook, and screen callbacks. F2, F3, and F4 are green, and all F1 cases except the required provider-unmount case are green. That case converted the prior H2A inference into a reproducible product defect, so this packet is validly complete but **defect-blocked**, not green: 252 suites pass, one suite fails at one active regression, H2A remains **NOT READY**, and R5 remains held.

## Verified starting state and ownership

Read-only preflight was repeated before the first write:

- Target worktree: `/Users/skypie/AccessMap-codex/presubmission-ui-polish`.
- Branch: `codex/presubmission-ui-polish`.
- Clean starting HEAD: `478f2817e084573449fb3670d27728354cc5d437`.
- Starting divergence from local `main`: `0 behind / 21 ahead`.
- Local `main`: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`.
- Local `origin/main` tracking ref: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`; this is no-fetch local tracking-ref evidence only.
- `git merge-base --is-ancestor main HEAD` exited 0.
- `git worktree list --porcelain` assigned this branch only to the required Codex worktree. The primary checkout remained on `main`; three Claude worktrees were detached. No competing owner for this branch/worktree was found.
- No fetch, merge, push, rebase, PR, deployment, dependency change, production runtime, simulator, or device action occurred.

## What changed

All E1 implementation paths are tests. No production file changed.

| File | Purpose |
| --- | --- |
| `src/lib/__tests__/auth.pushSequencing.test.tsx` | Adds controlled preference, token, eligibility, explanation, user-replacement, sign-out, unmount, and “Not now” auth-cycle races through the real `AuthProvider`. Preserves the active provider-unmount regression. |
| `src/navigation/__tests__/RootNavigator.pushEducation.integration.test.tsx` | Renders the exported `RootNavigator`, captures the real tab listener, controls interaction tasks, and proves delayed execution, live rechecking, consumption, and complete cancellation on unmount. |
| `src/lib/__tests__/useUserLocation.permission.test.tsx` | Mounts the real passive location hook on web with controlled Permissions and Geolocation boundaries across unavailable, denied, prompt, rejected, granted-success, and granted-failure branches. |
| `src/components/__tests__/OnboardingCards.dynamicType.test.tsx` | Drives the real onboarding controls through location deferral, notification deferral, and completion while asserting the location request helper is never touched. |
| `src/screens/__tests__/TasksScreen.guestHandoff.test.tsx` | Renders the real default Tasks screen and invokes the production TaskCard/detail callbacks to prove iOS dismissal, non-iOS replacement/cancellation, unmount cleanup, and auth-loss selection/tool cleanup. |
| `src/screens/__tests__/MapScreen.guestHandoff.test.tsx` | Renders the real default Map screen and invokes `PlatformMap.onOpenDetails` plus the real detail callbacks to prove exact-once Profile handoff, non-iOS cancellation, unmount cleanup, and Profile priority over pending iOS camera restoration. |
| `src/hooks/__tests__/useNotificationPreferences.test.ts` | Deletes the test-local parser/loader/saver mirror and uses `renderHook` against the real exported hook for storage parsing, async lifecycle, user changes, optimistic writes, and write-failure behavior. |

## H2A-F1 through H2A-F4 evidence trace

### H2A-F1 — async auth sequencing and real navigator lifecycle

| Requirement | Real behavior exercised | Result |
| --- | --- | --- |
| Preference work invalidated by sign-out | Deferred `getPushEnabled` inside the real auth subscription flow; `SIGNED_OUT` occurs before resolution. | PASS — no pending state, explanation, token request, or save survives. |
| Token work invalidated by sign-out | Deferred real token-request boundary; sign-out occurs before resolution. | PASS — former user receives no save. |
| User A cannot contaminate User B | A and B preference work is independently deferred and resolved out of order. | PASS — A creates no current pending state, duplicate explanation, or B contamination. |
| Consumption eligibility invalidation | The real consumer waits on its eligibility read while sign-out or user replacement occurs. | PASS — no stale explanation. |
| Explanation completion invalidation | The real explanation boundary is held unresolved, then auth cycle is invalidated before an affirmative resolution. | PASS — no token request or save follows. |
| “Not now” semantics | The mocked production explanation boundary returns `false`; the same cycle is consumed twice, followed by a genuine sign-out/new-sign-in. | PASS — one opportunity is spent atomically and only the new cycle becomes eligible. |
| Provider unmount during eligibility | The real consumer starts, provider unmounts, and controlled eligibility then resolves disabled. | **FAIL — NEW VERIFIED PRODUCT DEFECT:** explanation is called once after unmount. |
| Real navigator registration and settling | The exported `RootNavigator` supplies its actual `Tab.Navigator.screenListeners`; the registered `tabPress` queues controlled interaction work. | PASS — registration, delayed execution, live auth/app/modal/drawer rechecks, and eligible consumption are proved. |
| Navigator task cancellation | Multiple real tasks are queued, the navigator unmounts, and each task's returned cancellation contract is observed before callbacks are flushed. | PASS — every task is cancelled and none reaches the auth consumer. |

The pure `postSignInPushGate` tests remain in the checkpoint and pass; the new integration suite proves that the production navigator actually uses that contract.

### H2A-F2 — passive web location privacy and onboarding deferral

| Requirement | Real behavior exercised | Result |
| --- | --- | --- |
| Missing browser geolocation | Real `useUserLocation({ requireExistingPermission: true })` on web. | PASS — graceful denied/no-location state; no Permissions query or native request. |
| Missing Permissions API | Geolocation exists but `navigator.permissions` does not. | PASS — no geolocation call and no native request. |
| `denied` or `prompt` | Controlled Permissions responses. | PASS — passive denied/no-location result; geolocation never called. |
| Permission query rejection | Controlled rejected query. | PASS — graceful no-location result; geolocation and native request untouched. |
| `granted` success | Controlled browser position callback. | PASS — one geolocation call, returned coordinates used, exact options preserved, native request untouched. |
| `granted` failure | Controlled browser error callback. | PASS — graceful denied/no-location result and no native permission API. |
| Onboarding “Not now” | Real onboarding controls advance through location deferral, unrelated notification deferral, and completion. | PASS — `Location.requestForegroundPermissionsAsync` remains untouched throughout. |

The test restores the original `navigator` descriptor and platform state after every case.

### H2A-F3 — guest detail handoff and auth-loss cleanup

| Requirement | Real behavior exercised | Result |
| --- | --- | --- |
| Tasks detail origin | A guest-visible flag is rendered and Details is opened through the production `TaskCard` callback. | PASS — detail opens and closes through screen state. |
| Tasks iOS handoff | Detail sign-in is requested twice; dismissal is emitted twice. | PASS — no early navigation and exactly one `Profile` navigation after dismissal. |
| Tasks non-iOS fallback | Two sign-in requests queue controlled interaction tasks. | PASS — second request cancels/replaces the first; only the survivor navigates once. |
| Tasks unmount and auth loss | A queued task is unmounted; separately, a signed-in user opens tools, enters selection, and becomes guest. | PASS — queued navigation is cancelled; tool sheet and bulk-selection state disappear. |
| Map detail origin | Detail opens through the real `PlatformMap.onOpenDetails` prop callback. | PASS. |
| Map iOS precedence | “View on Map” queues camera restoration, then guest sign-in is requested twice before dismissal. | PASS — Profile wins exactly once; no map animation or callout restoration consumes the superseded intent. |
| Map non-iOS and unmount | Repeated requests replace queued work; a separately queued request is unmounted. | PASS — one navigation from the survivor and none after unmount. |

The retained real `TaskCard`, `FlagDetailModal`, and map-detail suites also pass, preserving their guest-button, no-mutation, callback-forwarding, dismissal-wiring, and camera contract evidence.

### H2A-F4 — actual notification-preferences hook

The rewritten suite imports and invokes the real `useNotificationPreferences` export. It covers empty, complete, partial, malformed, and rejected reads; null-user defaults/no-write behavior; deferred unmount and User A/User B races; exact optimistic per-user persistence; rejected-write warning/no rollback; same-user rerender cardinality; user-change loading; and the exported default object's shape, immutability, and non-aliasing with mutable hook state. No test-local production parser, loader, or saver remains.

## Checkpoint results

### Checkpoint A

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/lib/__tests__/auth.pushSequencing.test.tsx src/navigation/__tests__/postSignInPushGate.test.ts src/navigation/__tests__/RootNavigator.pushEducation.integration.test.tsx
```

- Initial sandbox invocation: Jest did not initialize because Watchman state access failed with `fchmod ... Operation not permitted`.
- Identical host-context invocation: exit 1 — 3 suites total, 2 passed and 1 failed; 28 tests total, 27 passed and 1 failed; 0 todo; 0 snapshots.
- Only failure: the active provider-unmount regression at `auth.pushSequencing.test.tsx:361-383`.

Isolated reproduction:

```bash
npx --no-install jest --ci -w 1 --runTestsByPath src/lib/__tests__/auth.pushSequencing.test.tsx -t "does not present education after the provider unmounts with eligibility in flight"
```

- Exit 1 — 1 failed suite; 1 failed test and 15 skipped tests. `showPushExplanation` received one call instead of zero.

### Checkpoint B

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/lib/__tests__/useUserLocation.permission.test.tsx src/components/__tests__/OnboardingCards.dynamicType.test.tsx
```

- Exit 0 — 2/2 suites passed; 28/28 tests passed; 0 failures; 0 snapshots.
- The suite retained non-failing Animated `act(...)` console warnings from the existing onboarding harness.

### Checkpoint C

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/screens/__tests__/TasksScreen.guestHandoff.test.tsx src/screens/__tests__/MapScreen.guestHandoff.test.tsx src/screens/__tests__/TasksScreenFlagCard.test.tsx src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx src/screens/__tests__/MapScreen.detailFocus.test.tsx
```

- Exit 0 — 5/5 suites passed; 55/55 tests passed; 0 failures; 0 snapshots; Jest time 1.816 s.
- Retained `FlagDetailModal` suites emitted their existing non-failing `SafeAreaView` deprecation and async `act(...)` warnings. The two new host suites passed cleanly in isolation and in the checkpoint.

### Checkpoint D

```bash
npx --no-install jest --ci -w 3 --runTestsByPath src/hooks/__tests__/useNotificationPreferences.test.ts
```

- Exit 0 — 1/1 suite passed; 13/13 tests passed; 0 failures; 0 snapshots; Jest time 1.577 s.

## Prescribed full gates

```bash
npm run typecheck
```

- Exit 0. `tsc --noEmit` emitted no diagnostics.

```bash
npm run lint
```

- Exit 0. **90 warnings, 0 errors**; 11 warnings were reported as potentially auto-fixable.
- The established baseline is 90 warnings / 0 errors. The total is unchanged, and none of the seven E1-modified test files appears in the warning list. No lint cleanup or auto-fix was run.

```bash
npx --no-install jest --ci -w 3
```

- Exit 1. **253 suites total: 252 passed, 1 failed. 3,735 tests total: 3,702 passed, 1 failed, 32 todo. 0 snapshots.** Jest time 31.25 s.
- The sole failed suite/test is the preserved provider-unmount regression. No other E1 or existing test failed.
- Compared with the established pre-E1 baseline of 250 suites / 3,673 passed / 32 todo / 0 failed, E1 adds three suites and 29 passing tests plus the one active defect regression.
- Host output retained the non-failing Watchman CloudKit warning and existing expected console warnings from failure-path and React Native tests.

```bash
git diff --check
```

- Exit 0. No whitespace errors.

## Defect classification and narrow repair recommendation

The failure meets every supplied defect criterion:

- It reaches the production `AuthProvider` export and production `consumePendingPushEducation` callback.
- A controlled promise establishes the ordering: consume starts, the provider unmounts, then eligibility resolves.
- The same assertion fails in a one-test invocation, Checkpoint A, and the full corpus.
- The expected behavior comes directly from E1's required provider-unmount contract; it is not a new product semantic.

The verified symptom is a late explanation presentation. The likely source-level gap is that auth user identity remains equal after provider unmount, so the post-eligibility `isCurrent()` check at `src/lib/auth.tsx:102-109` does not represent provider liveness. The repair packet should add the smallest lifecycle/generation invalidation needed to stop post-unmount education while preserving the existing sign-out, replacement, “Not now,” and token-refresh semantics already covered here. That recommendation is intentionally not an implementation design approval.

## Production and privacy boundary attestation

- E1 changed tests only. No production `.ts`/`.tsx`, type, export, navigation interface, storage format, API, configuration, dependency, native, Supabase, canonical-state, or identifier file changed.
- `NavInner` remains unexported. No production controller extraction or test seam was added.
- No location watcher, continuous tracking, history, persistence, background permission, real geolocation, device service, or transmission path was accessed or added.
- No credential, `.env`, keychain, real account, real session, real token, production API, production data, Supabase, simulator, browser runtime, notification permission, or device service was accessed.
- No external send, network write, dependency install, Watchman reset, merge, push, rebase, PR, deploy, EAS/App Store action, or release action occurred.
- R1/R2 production work and R3 production semantics were not reopened or modified.

## Unfinished work and held acceptance

- The verified provider-unmount defect is not repaired because E1 is test-only. Its regression remains active and the full Jest gate remains honestly failed.
- A fresh independent H2A has not run and cannot be green until a separately authorized repair lands and all gates pass.
- R5 remains held. No simulator, browser, VoiceOver, keyboard, Dynamic Type, theme, motion/transparency, notification-permission, or real-device acceptance was attempted or claimed.
- Merge, push, PR, deployment, and review-worktree removal remain Sky's decisions and were not performed.

## How to review

Inspect the two E1 commits after this report is committed:

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish log --oneline -2
```

Inspect only the test evidence commit:

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish show --stat 665355fa8f1d1cc9280c0fbfa758c18e083c6365
```

Change to the review worktree:

```bash
cd /Users/skypie/AccessMap-codex/presubmission-ui-polish
```

Reproduce the verified defect:

```bash
npx --no-install jest --ci -w 1 --runTestsByPath src/lib/__tests__/auth.pushSequencing.test.tsx -t "does not present education after the provider unmounts with eligibility in flight"
```

Confirm the final branch is clean:

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish status --short --branch
```

## Next recommended action

Sky should review the defect evidence and authorize a narrow `src/lib/auth.tsx` lifecycle repair packet; after that repair passes the retained regression and full gates, commission a fresh independent H2A before considering R5.
