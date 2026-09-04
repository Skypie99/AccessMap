# Flagstone R3 — Prompt Sequencing, Location Consent, and Guest Review Gating

**Date:** 2026-08-27

**Worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`

**Branch:** `codex/presubmission-ui-polish`

**Starting SHA:** `ff80c0f32f5a6a54d72c38d876185828047211f1` (`docs(qa): record Flagstone R2 verification`)

**Final implementation SHA:** `215ef1062724db3df9b36d3b353a3e0afe9c91de`

**Classification:** **READY FOR H2A WITH RESTRICTIONS**

## Scope and outcome

R3 implemented only the approved three behavior groups:

1. Push education is now a pending, per-auth-cycle opportunity consumed only after an eligible explicit signed-in tab interaction settles.
2. Tasks uses the existing-permission-only location path and therefore cannot initiate an OS location prompt on passive arrival.
3. Task cards and detail sheets expose an explicit guest sign-in boundary instead of guest verdict or selection controls; detail-to-Profile navigation closes the sheet first and is consumed once.

All source findings are resolved and the required automated gates pass. No runtime/device claim is made. H2A may begin only under the restrictions in this report; H2A, R5, merge, push, deployment, and release work were not started here.

## Repeated preflight and ownership evidence

Preflight was repeated immediately before the first write, without fetching and without opening `.env`:

- Target worktree: clean `codex/presubmission-ui-polish` at the required `ff80c0f32f5a6a54d72c38d876185828047211f1`.
- Local `main`: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`.
- Local `origin/main` tracking ref: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`. No fetch was performed, so this is local tracking-ref evidence only.
- Starting divergence: `0 behind / 16 ahead` of local `main`.
- Target had no staged, unstaged, untracked, or unmerged paths and no conflict markers.
- Primary checkout `/Users/skypie/AccessMap` remained on `main` and dirty with pre-existing untracked material. It was read only and was never cleaned, staged, or modified.
- Claude worktrees `angry-yonath-947bbc`, `reverent-matsumoto-7afec6`, and `xenodochial-ptolemy-4d959e` were detached and clean. No overlapping source owner was identified.
- `git check-ignore -v .env` resolved to `.gitignore:12:.env`; `.env` was not opened, printed, or inferred.
- `git ls-files -u` and `git diff --name-only --diff-filter=U` were empty.
- The R1 report records the independent audit as stopped, and the R2 report preserves that stopped state. R3 did not restart or expand the audit.

Final ownership evidence before this report was written:

- Target source worktree was clean at `215ef1062724db3df9b36d3b353a3e0afe9c91de`.
- Target was `0 behind / 19 ahead` of local `main`; local `main...origin/main` remained `0 / 0`.
- The primary checkout was still dirty only in its existing lane, and all three Claude worktrees were still detached and clean.
- There were still no unmerged paths.

## R1/R2 dependency

R3 is intentionally cumulative on the verified R1/R2 packet:

- R1 started at `1201b69d0b5593295143c4cab5234f12b032c7e9`, ended source work at `40fe17cf805cf2ad06e19b86e8b0686e4d649537`, and was documented by `ba62599dee30a756c251f1db52f8b6b8eaa250df`.
- R2 source ended at `e4164d100d5d48dada650b656866eb8e5668c2a5` and was documented by the R3 starting SHA, `ff80c0f32f5a6a54d72c38d876185828047211f1`.
- R3 preserved R2's denied-location banner and Report typography/draft-protection work. No R1/R2 commit was rewritten.

## Finding classifications and verified root causes

| Classification | Finding | Resolution |
| --- | --- | --- |
| VERIFIED | R3-A1 push education was initiated from the Supabase auth-state callback, so it could race platform-owned post-sign-in UI and duplicate auth events. | Auth now records per-user cycle state. `SIGNED_IN` creates pending eligibility for users without the preference; `INITIAL_SESSION` never prompts. The navigator consumes eligibility only after an explicit visible-tab press and `InteractionManager.runAfterInteractions`. |
| VERIFIED | R3-A2 asynchronous preference/token work could outlive sign-out or user replacement. | Cycle identity and generation checks guard preference reads and token work. Null session, sign-out, or user removal clears the cycle and pending attempt. Consumption clears pending state before education begins and rechecks the stored preference. |
| VERIFIED | R3-L1 Tasks used the default `useUserLocation()` path, which may request foreground permission during passive screen arrival. | Tasks now passes `{ requireExistingPermission: true }`. Native denied/undetermined states use the read-only permission check; web checks the Permissions API before attempting geolocation. Granted users retain a one-shot location and distance/ETA decoration. |
| VERIFIED | R3-G1 `TaskCard` inferred review availability from surrounding behavior and guests could encounter verdict/selection affordances. | `TaskCard` now receives explicit `canReview` and `onSignInToReview` inputs. Guests receive exactly one filled review boundary plus independent Details, no verdict segment, no long press, and no selection hint. Tasks hides signed-in-only tools and bulk UI and clears selection if auth disappears. |
| VERIFIED | R3-G2 detail sheets exposed verdict controls without an explicit read-versus-review guest boundary. | `FlagDetailModal` now accepts optional `onSignInToReview`. Guest read intent keeps Directions primary and replaces verdicts with one sign-in boundary; guest triage intent uses one primary sign-in boundary while preserving guest-safe reading, mapping, directions, sharing, and history. |
| VERIFIED | R3-G3 navigating directly from a presented detail sheet could race dismissal and, on Map, conflict with pending camera restoration. | Tasks and Map record a pending Profile handoff, close first, complete on iOS dismissal, and use an interaction-settled fallback where `onDismiss` is unavailable. The ref is consumed once. Map prioritizes Profile handoff and skips camera-focus restoration for that dismissal. |
| PRESERVED | Existing mutation defense, confirmation, optimistic reconciliation, haptics, points copy, push token helpers/schema, Supabase authorization, and RLS were not findings requiring redesign. | Existing `if (!user)` guards remain before `updateFlagStatus` in Tasks and `FlagDetailModal`; regression guards pin them. No production mutation helper or backend contract changed. |
| DEFERRED | Real iOS credential UI, prompt timing, VoiceOver focus, Dynamic Type, themes, motion/transparency, and device navigation cannot be accepted from unit/source tests. | Held for R5 exactly as listed under Runtime holds. |

## Implementation commits and file map

| SHA | Commit | Files and purpose |
| --- | --- | --- |
| `43792ab` | `fix(auth): sequence post-sign-in prompts safely` | `src/lib/auth.tsx`; `src/navigation/RootNavigator.tsx`; new `src/navigation/postSignInPushGate.ts`; new auth and navigation tests. Adds the internal pending/consume context contract, auth-cycle invalidation, silent refresh behavior, and interaction-settled navigator gate. |
| `c185ead` | `fix(location): respect deferred permission intent` | `src/screens/TasksScreen.tsx`; `src/lib/location.ts`; new hook tests; extended geo-privacy guard. Selects the existing-permission-only Tasks path and makes the passive web path read permission before geolocation. |
| `215ef10` | `fix(tasks): make guest review actions explicitly auth-gated` | `TaskCard`/Tasks, `MapScreen`, `FlagDetailModal`, presentation/card/source guards, and the updated historic selection/spinner guards. Adds explicit review capability, guest boundaries, auth-loss cleanup, and close-then-route handoffs. |
| report commit | `docs(qa): record Flagstone R3 verification` | This report only. |

### Exact files changed before the QA report

- `src/__tests__/geoPrivacyFence.test.ts`
- `src/__tests__/inertControlVisual.guard.test.ts`
- `src/components/FlagDetailModal.tsx`
- `src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx`
- `src/lib/__tests__/auth.pushSequencing.test.tsx`
- `src/lib/__tests__/useUserLocation.permission.test.tsx`
- `src/lib/auth.tsx`
- `src/lib/location.ts`
- `src/navigation/RootNavigator.tsx`
- `src/navigation/__tests__/postSignInPushGate.test.ts`
- `src/navigation/postSignInPushGate.ts`
- `src/screens/MapScreen.tsx`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/TasksScreenFlagCard.test.tsx`
- `src/screens/__tests__/guestReviewGating.guard.test.ts`
- `src/screens/__tests__/tasksHeaderReclaim.guard.test.ts`

## Verification

All commands ran in the dedicated target worktree. Elapsed values below include Jest's own reported `Time` and, where useful, the command wall time recorded by the runner.

### Focused checkpoints

| Checkpoint | Command | Final result |
| --- | --- | --- |
| A — push sequencing | `npx --no-install jest --ci -w 3 --silent src/lib/__tests__/auth.pushSequencing.test.tsx src/navigation/__tests__/postSignInPushGate.test.ts src/lib/__tests__/pushNotifications.test.ts src/hooks/__tests__/useNotificationPreferences.test.ts` | Exit 0 — 4/4 suites, 37/37 tests, 0 todo, 0 snapshots; Jest 0.934 s, wall 2.447 s. |
| B — location deferral/privacy | `npx --no-install jest --ci -w 3 --silent src/lib/__tests__/useUserLocation.permission.test.tsx src/lib/__tests__/location.test.ts src/__tests__/geoPrivacyFence.test.ts src/components/__tests__/OnboardingCards.dynamicType.test.tsx src/screens/__tests__/MapScreen.openSettings.test.ts src/screens/__tests__/HomeScreen.locatingState.test.ts` | Exit 0 — 6/6 suites, 60/60 tests, 0 todo, 0 snapshots; Jest 2.2 s, wall 3.105 s. |
| C — guest review/detail handoff and preservation guards | `npx --no-install jest --ci -w 3 --silent src/screens/__tests__/TasksScreenFlagCard.test.tsx src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx src/screens/__tests__/MapScreen.detailFocus.test.tsx src/screens/__tests__/guestReviewGating.guard.test.ts src/screens/__tests__/bp3TrustEngineGuards.test.ts src/__tests__/inertControlVisual.guard.test.ts src/screens/__tests__/tasksHeaderReclaim.guard.test.ts` | Exit 0 — 7/7 suites, 109/109 tests, 0 todo, 0 snapshots; Jest 3.35 s, wall 4.311 s. |

Checkpoint static verification also ran after each implementation group: `npm run typecheck`, changed-file ESLint, and `git diff --check` all exited 0. The only changed-file ESLint warning was the pre-existing `FlagDetailModal` exhaustive-deps warning documented below.

### Corrective invocations recorded honestly

- The first sandboxed auth Jest invocation stopped before tests because Watchman could not update its state. It was rerun with the approved host permission and passed. No Watchman reset command was run.
- An early guest-card test attempted to find React Native's composite `Pressable` type after the renderer had flattened it. Product behavior was already correct; the assertion was redirected to the accessible summary's actual host-parent chain. The corrected focused suite passed.
- The first complete Jest invocation exited 1: 248 suites passed and 2 failed; 3,667 tests passed, 6 failed, 32 todo, 3,705 total; Jest 27.832 s, wall 29.528 s. Both failures were stale source-guard assumptions: `tasksHeaderReclaim.guard.test.ts` searched for the old exact `visible={toolSheetOpen}` and signed-in-only truth-table syntax, while `inertControlVisual.guard.test.ts` used a fixed 900-character window that ended before the unchanged primary spinner after guest accessibility branches were added. The guards were made boundary/auth aware, 43/43 focused guard tests passed, checkpoint C was amended, and the required full-gate sequence was restarted from typecheck.

### Required full gates — final restarted sequence

```bash
npm run typecheck
```

Exit 0. `tsc --noEmit` emitted no diagnostics. Wall time: 5.575 s.

```bash
npm run lint
```

Exit 0. **90 warnings, 0 errors**; 11 warnings were reported as potentially auto-fixable. No formatter or auto-fix was run. Wall time: 10.534 s.

```bash
npx --no-install jest --ci -w 3
```

Exit 0. **250/250 suites passed; 3,673 tests passed; 32 todo; 3,705 total; 0 failures; 0 snapshots.** Jest time: 25.709 s; command wall time: 27.027 s.

```bash
git diff --check
```

Exit 0. No whitespace errors. Recorded wall time was below 0.001 s.

The final Jest output retained non-failing warnings instead of suppressing them: one Watchman `opendir` permission warning for a CloudKit cache subtree, existing React test `act(...)` warnings, existing React Native `SafeAreaView` deprecation warnings, and expected console warnings from tests exercising failure paths. Jest does not emit an aggregate warning count. No warning was treated as a test failure, and the final summary contained zero failed suites/tests.

## Lint reconciliation and final warning inventory

R1 documented 83 warnings. R2 added exactly seven `import/first` warnings in `src/screens/__tests__/ReportFlagModal.test.tsx`, reconciling 83 to 90. R3 ends at the same **90 warnings and 0 errors**. No R3-created file reports a warning.

`src/components/FlagDetailModal.tsx` is modified by R3 and reports one `react-hooks/exhaustive-deps` warning at final line 392. Running the R3 starting version directly from `ff80c0f...` through ESLint reproduced the same warning at its former line 389, proving it is not new. R3 did not perform unrelated cleanup.

Final per-file warning counts:

| File | Count | Rule family/families |
| --- | ---: | --- |
| `src/__tests__/noCredentialsInTree.guard.test.ts` | 1 | `array-type` |
| `src/__tests__/stripComments.guard.test.ts` | 2 | `no-require-imports` |
| `src/components/ActivityFeedModal.tsx` | 1 | `exhaustive-deps` |
| `src/components/FilterPresetsModal.tsx` | 1 | `exhaustive-deps` |
| `src/components/FlagDetailModal.tsx` | 1 | `exhaustive-deps` — pre-existing |
| `src/components/MyWatchedModal.tsx` | 1 | `exhaustive-deps` |
| `src/components/PhotoGallery.tsx` | 1 | `exhaustive-deps` |
| `src/components/PlatformMap.tsx` | 2 | `no-explicit-any` |
| `src/components/__tests__/CachedTileLayer.test.ts` | 1 | `no-unused-vars` |
| `src/lib/__tests__/comments.test.ts` | 1 | `no-unused-vars` |
| `src/lib/__tests__/confirm.test.ts` | 14 | `no-explicit-any`, `no-require-imports` |
| `src/lib/__tests__/copy.test.ts` | 1 | `array-type` |
| `src/lib/__tests__/flags.supabase.test.ts` | 2 | `no-explicit-any` |
| `src/lib/__tests__/flags.test.ts` | 1 | `no-require-imports` |
| `src/lib/__tests__/flagsStore.d4.test.tsx` | 12 | `no-unused-vars`, `no-explicit-any` |
| `src/lib/__tests__/flagsStoreSwr.test.tsx` | 1 | `no-require-imports` |
| `src/lib/__tests__/focusOnOpen.test.tsx` | 4 | duplicate imports, unused disable, `no-require-imports` |
| `src/lib/__tests__/helpSearch.test.ts` | 10 | `no-explicit-any` |
| `src/lib/__tests__/pushNotifications.test.ts` | 2 | `no-unused-vars` |
| `src/lib/__tests__/realtimeLog.test.ts` | 4 | `no-explicit-any`, `no-unused-vars` |
| `src/lib/__tests__/regionFittingPoints.test.ts` | 2 | `no-require-imports` |
| `src/lib/__tests__/savedPlaces.test.ts` | 2 | `no-explicit-any` |
| `src/lib/__tests__/sharedModalsContext.test.tsx` | 1 | `no-require-imports` |
| `src/lib/__tests__/theme.test.ts` | 1 | `no-require-imports` |
| `src/lib/__tests__/tileCache.test.ts` | 1 | `no-unused-vars` |
| `src/lib/__tests__/watchedFlagsFilter.test.ts` | 1 | `no-unused-vars` |
| `src/lib/featureFlags.ts` | 1 | `no-unused-vars` |
| `src/lib/flags.ts` | 10 | `no-console`, `no-explicit-any` |
| `src/screens/NearbyFlagsModal.tsx` | 1 | `exhaustive-deps` |
| `src/screens/__tests__/ReportFlagModal.test.tsx` | 7 | `import/first` — R2 inventory |
| **Total** | **90** | **0 errors** |

## Privacy and production-boundary attestation

- Location remains one-shot and presentation-only. R3 added no watcher, continuous tracking, history, persistence key, background permission, database field, server query, or transmission path.
- Passive Tasks/Profile/tab arrival remains no-prompt. Onboarding's labelled Allow action and existing explicit Map/Home location actions remain the request boundaries.
- Push eligibility is internal React state/ref state for the current auth cycle. There is no persisted consent/session format, credential field, token shape, notification capability, native entitlement, database, or API payload change.
- Token refresh/save remains best-effort and uses the existing helpers. Session handling continues even if token work fails.
- Guest routing reuses Profile. No new sign-in screen, auth coordinator, modal system, production mutation helper, Supabase authorization change, or RLS change was introduced.
- No credential, `.env`, keychain, real account, real location, real token, real status mutation, direct Supabase access, external send, simulator, EAS build, dependency install, deployment, submission, merge, push, or formatter action occurred.
- R2's Map denied-location banner and Report draft/typography changes remain unchanged.

## Unfinished or provisional work

No R3 source finding remains unfinished or provisional. Automated coverage cannot replace the R5 runtime/device checks below. The known lint and Jest warning baselines are recorded rather than expanded into unrelated cleanup.

## R5 runtime holds

R5 retains all of the following:

- the real iOS Save Password surface;
- post-sign-in push prompt timing, dismissal, and repeat behavior;
- foreground/background transitions around pending education;
- deferred-location navigation and explicit locate after deferral;
- guest and signed-in card/detail review presentation;
- sheet dismissal followed by one-time Profile routing on iOS;
- Map camera-focus restoration versus intentional Profile handoff;
- VoiceOver focus order, labels, hints, and modal dismissal behavior;
- Dynamic Type;
- light and dark mode;
- Reduce Motion;
- Reduce Transparency.

## H2A readiness

**READY FOR H2A WITH RESTRICTIONS.** The three R3 source findings are resolved and every final automated gate passes. H2A must treat the R5 matrix above as unresolved runtime acceptance, must preserve this branch and ownership boundary, and must not infer release readiness. Sky alone decides whether to start H2A/R5 and whether to merge or push.

## DECISIONS FOR SKY

None. R3 stayed fully inside the approved architecture and requires no privacy, security, backend, dependency, production, or release decision for branch review.
