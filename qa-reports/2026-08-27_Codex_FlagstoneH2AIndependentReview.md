# Flagstone H2A — Independent Source Handoff Review and R5 Readiness

**Date:** 2026-08-27
**Worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`
**Branch:** `codex/presubmission-ui-polish`
**Starting and reviewed checkpoint:** `0f2bd9cc9f19ecbdb9f76f821bab3cdc621cf184` (`docs(qa): record Flagstone R3 verification`)
**Reviewed implementation SHA:** `215ef1062724db3df9b36d3b353a3e0afe9c91de`
**Primary R3 range:** `ff80c0f32f5a6a54d72c38d876185828047211f1..215ef1062724db3df9b36d3b353a3e0afe9c91de`
**H2A classification:** **NOT READY**

## 1. DECISIONS FOR SKY

- [ ] **Hold R5 and decide whether to authorize a test-evidence repair pass.** The R3 source is structurally consistent with the intended behavior, but the current test packet does not adequately prove several async auth, privacy-sensitive web-location, and cross-platform detail-handoff claims.
  - **Action:** Keep this branch out of R5 acceptance and authorize a separate, tightly scoped test-only repair pass for `H2A-F1` through `H2A-F4`, followed by a fresh independent H2A review. Source changes should occur only if a new test exposes an actual defect.
  - **Recommendation:** Authorize the smallest test-only pass. Prioritize deferred-promise auth tests, passive web-location branch tests, explicit Onboarding “Not now” negative assertions, and deterministic Tasks/Map handoff tests.
  - **Alternative:** Proceed directly to R5 and treat device evidence as a substitute for the missing automated evidence. This is not recommended because it leaves repeatable race, privacy, and cross-platform assertions unproved.
  - **Impact:** R5 remains on hold. No source repair is requested or applied by H2A.
  - **Rollback:** A future test-only commit can be reverted independently. This H2A commit is documentation only.
  - **Why deferred:** The approved H2A lane forbids source or test edits, and location/auth behavior requires Sky's explicit next-phase authorization.
  - **Owner:** Flagstone H2A.

## 2. BLOCKERS / FAIL_FAST

- **BLOCKER — VERIFIED inadequate automated evidence (`H2A-F1` through `H2A-F4`).** The strict H2A rule says a material claim without adequate behavioral or structural proof is a finding and forces **NOT READY**. Source inspection did not confirm a product defect, but passing tests cannot close the missing branches described below.
  - **Quarantined?** Yes. H2A changed no source, test, configuration, dependency, native, schema, or runtime file.
  - **Recommended path:** Add only the smallest deterministic tests, then repeat H2A before R5.
- **No preflight ownership blocker.** The target lane, ancestry, local refs, and worktree ownership remained valid immediately before this report was written.
- **Non-blocking infrastructure retry.** The first required Jest invocation was prevented from starting by sandboxed Watchman state access. The identical command passed in the approved host context; both invocations are recorded under Automated gates.

## 3. Summary

H2A independently reviewed the complete three-commit R3 source range, traced it through callers and cleanup paths, inspected all 17 named test files, and rechecked R1/R2 preservation. The source implementation appears internally coherent and no source defect, privacy expansion, production mutation expansion, schema change, or ownership conflict was verified. However, material R3 claims rely on unexercised async branches or source-text guards that do not prove the claimed behavior. Under the supplied classification rules, the exact result is **NOT READY** and R5 remains held.

## 4. What Shipped (Checkpoint)

- `0f2bd9cc9f19ecbdb9f76f821bab3cdc621cf184` — reviewed cumulative R1–R3 checkpoint and R3 report.
- `215ef1062724db3df9b36d3b353a3e0afe9c91de` — reviewed R3 implementation endpoint.
- `ff80c0f32f5a6a54d72c38d876185828047211f1..215ef1062724db3df9b36d3b353a3e0afe9c91de` — complete primary source-review range: 16 files, 1,005 insertions, and 108 deletions.
- This report is the sole H2A artifact. Its resulting documentation commit is necessarily created after the report content and is recorded in the final handoff rather than self-referenced here.

### R1/R2/R3 dependency and ancestry

- R1 source ended at `40fe17cf805cf2ad06e19b86e8b0686e4d649537` and was documented by `ba62599dee30a756c251f1db52f8b6b8eaa250df` in `qa-reports/2026-08-27_Codex_FlagstoneR1SafeAreasFloatingChrome.md`.
- R2 source ended at `e4164d100d5d48dada650b656866eb8e5668c2a5` and was documented by `ff80c0f32f5a6a54d72c38d876185828047211f1` in `qa-reports/2026-08-27_Codex_FlagstoneR2FormsAccessibility.md`.
- R3 consists of `43792ab` (auth sequencing), `c185ead` (deferred location), and `215ef10` (guest review gating), then the reviewed R3 report commit `0f2bd9c`.
- `git merge-base --is-ancestor` exited 0 for the R1 documentation SHA, R2 documentation SHA, and R3 implementation SHA against the reviewed checkpoint.
- The R1 report records the independent audit as formally stopped at line 14; the R2 report preserves the stop at line 17; the R3 report says it was not restarted at line 38. H2A did not restart or widen it.

## 5. What's Proposed (Not Applied)

| Proposal | File area | What it proves | Impact | Rollback documented? |
| --- | --- | --- | --- | --- |
| Deferred-promise auth tests | `src/lib/__tests__/auth.pushSequencing.test.tsx` | Sign-out/user replacement during preference and token work cannot create stale eligibility or a stale save; “Not now” spends only the current cycle. | Test-only unless a defect is exposed. | Yes |
| Navigator lifecycle tests | `src/navigation/**/__tests__` | Real tab-listener wiring, queued callbacks, cancellation, and no AppState-only presentation. | Test-only or a tiny extracted controller seam. | Yes |
| Passive web-location tests | `src/lib/__tests__/useUserLocation.permission.test.tsx` | Granted, prompt/denied, missing Permissions API, query rejection, and no-geolocation branches never prompt passively. | Privacy-sensitive evidence only; no new capability. | Yes |
| Onboarding negative assertion | `src/components/__tests__/OnboardingCards.dynamicType.test.tsx` or a focused consent test | “Not now” never calls the OS request helper. | Test-only. | Yes |
| Detail handoff tests | Tasks/Map focused tests | iOS dismissal, non-iOS settled fallback, exact-once consumption, cancellation, auth-loss cleanup, and Map focus priority. | Test-only or a small pure helper if needed for deterministic testing. | Yes |

## 6. Findings by Domain

### Tests / CI

#### H2A-F1 — HIGH — VERIFIED — auth sequencing and navigator lifecycle are under-proved

The source has current-user checks around preference and token work (`src/lib/auth.tsx:65-114`), per-cycle deduplication (`src/lib/auth.tsx:132-152`), atomic pending consumption (`src/lib/auth.tsx:92-110`), and navigator task cancellation (`src/navigation/RootNavigator.tsx:293-330`). The existing provider tests cover queueing, duplicate `SIGNED_IN`, enabled refresh, `INITIAL_SESSION`, two direct consume calls, a Settings preference recheck, and a sign-out followed by a new cycle (`src/lib/__tests__/auth.pushSequencing.test.tsx:78-170`).

They do not hold `getPushEnabled`, `requestExpoPushToken`, or `showPushExplanation` in flight and then sign out or replace the user. The sign-out test clears an already-created pending flag and invokes consumption afterward; it does not exercise the stated in-flight invalidation contract. There is no user-replacement case and no `showPushExplanation(false)` case. The gate unit tests exercise the pure scheduler but never mount `NavInner`, never call the returned task's `cancel`, and never prove that multiple scheduled callbacks or unmount cleanup reach the atomic consumer (`src/navigation/__tests__/postSignInPushGate.test.ts:14-87`). These are material race and attribution claims, not device-only presentation details.

**Smallest recommended correction:** add controlled deferred promises for preference/token/explanation work; emit sign-out and replacement while each is pending; assert no stale pending state, education, or token save; test “Not now” plus a genuine later sign-in; and exercise cancellation/queued callbacks through the real navigator seam or a narrowly extracted controller.

#### H2A-F2 — HIGH — VERIFIED — passive web-location privacy branches are not behaviorally tested

The source correctly places the passive Permissions API check before browser geolocation and degrades when permission is not already granted or the query fails (`src/lib/location.ts:175-224`). Tasks opts into the no-prompt mode (`src/screens/TasksScreen.tsx:341-346`). Native granted, undetermined, and denied behavior is exercised (`src/lib/__tests__/useUserLocation.permission.test.tsx:26-55`).

No test executes the web branch for granted, prompt/denied, missing `navigator.permissions`, rejected `permissions.query`, absent geolocation, success, or failure. The only web evidence is an `indexOf` ordering assertion against source text (`src/__tests__/geoPrivacyFence.test.ts:97-103`); it can show that two strings occur in one order, but not that the passive branch gates the call. Onboarding's suite presses “Not now,” but its permission request mocks never settle and it never asserts that `requestForegroundPermissionsAsync` was not called (`src/components/__tests__/OnboardingCards.dynamicType.test.tsx:55-67,266-276,313-325`). A regression that called the never-resolving mock could escape those assertions.

**Smallest recommended correction:** add web `renderHook` cases with controlled `navigator.permissions` and `navigator.geolocation` objects, including negative call assertions; add an explicit Onboarding request-helper non-call assertion after “Not now.”

#### H2A-F3 — HIGH — VERIFIED — guest handoff and auth-loss cleanup are mostly source-scanned

TaskCard and FlagDetail presentation tests adequately prove the immediate guest versus signed-in control surfaces (`src/screens/__tests__/TasksScreenFlagCard.test.tsx:312-347`; `src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx:215-276`). The production source also contains a plausible close-then-route implementation for Tasks (`src/screens/TasksScreen.tsx:818-843`) and Map (`src/screens/MapScreen.tsx:1806-1894`).

The remaining evidence is primarily `readFileSync` plus `toContain`/slice checks (`src/screens/__tests__/guestReviewGating.guard.test.ts:13-71`). It does not execute auth-loss cleanup, iOS `onDismiss`, the non-iOS `InteractionManager` fallback, cancellation on unmount, exact-once Profile navigation, repeated taps, or Map's Profile-over-camera priority. `MapScreen.detailFocus.test.tsx:145-184` tests the older camera-restoration path and only checks that the dismissal handler is wired; it does not invoke the new Profile handoff. These are cross-platform state-transition claims required by H2A, even though their visual/focus acceptance remains in R5.

**Smallest recommended correction:** add deterministic tests that invoke each platform path, fire dismissal/fallback more than once, unmount with a queued task, remove auth while selection/tools are active, and assert that intentional Profile navigation suppresses camera restoration.

#### H2A-F4 — MEDIUM — VERIFIED — the named notification-preference hook test tests a local copy

`src/hooks/__tests__/useNotificationPreferences.test.ts:28-32` imports only the default constant and type. Lines 59-84 reimplement the storage prefix, parser, loader, and saver inside the test and the remaining cases call those local helpers. The real hook's lifecycle, user switch, cancellation, optimistic state, and persistence behavior live at `src/hooks/useNotificationPreferences.ts:73-157` and are never invoked by this test. Passing this file therefore cannot substantiate its own stated hook-behavior claims or the handoff's broader Settings-preservation evidence.

**Smallest recommended correction:** render the real hook with controlled AsyncStorage, change users, unmount during a deferred read, and call the returned setter. Delete the mirrored helpers after equivalent real-hook coverage exists.

### Source review outcome

- **VERIFIED:** No source defect was confirmed in the reviewed R3 implementation. The auth pending/consume contract, passive native/web branches, explicit guest capabilities, mutation guards, and close-first handoffs are present in source.
- **VERIFIED:** R3 did not change `src/lib/pushNotifications.ts`, `src/screens/SettingsScreen.tsx`, Supabase helpers/schema/RLS, package files, app/native configuration, notification entitlements, credential/session formats, token schema, frozen identifiers, or production mutation helpers.
- **VERIFIED:** R1/R2 behavior touched by shared files remains in source: Tasks still derives bottom reserve from `getFloatingTabBarContentInset` plus signed-in bulk-bar height (`src/screens/TasksScreen.tsx:1434-1445`); the Map denied-location banner remains stacked and stretched (`src/screens/MapScreen.tsx:2759-2786,3888-3922`); Report draft close routing and typography remain at `src/screens/ReportFlagModal.tsx:436-470,831-869,918`; signed-in haptics, points copy, and optimistic reconciliation remain at `src/screens/TasksScreen.tsx:695-788`.
- **WITHDRAWN:** The review considered whether the surviving source-text guards themselves demonstrated a source failure. They do not; the supported conclusion is inadequate proof, not a verified product defect.
- **INFERRED:** None. No material inference is being used to claim readiness.
- **DEFERRED:** Only the explicit R5 device/runtime matrix listed below.

## 6.1 Requirement-by-requirement source/test traceability

Assessment key: **VERIFIED** means the source and available evidence adequately establish the non-device claim. **SOURCE VERIFIED / TEST GAP** means the implementation is present but the evidence gap is a finding. **DEFERRED** is reserved for an explicitly device-only R5 item.

### A. Post-sign-in push sequencing

| ID | Requirement | Exact source evidence | Exact test evidence | Assessment |
| --- | --- | --- | --- | --- |
| A01 | Auth callback never presents education directly. | `src/lib/auth.tsx:76-90,132-152` only checks preference/sets pending. | `auth.pushSequencing.test.tsx:78-87` asserts no explanation/token call. | VERIFIED |
| A02 | `INITIAL_SESSION` is silent. | `src/lib/auth.tsx:140-145`. | `auth.pushSequencing.test.tsx:112-123`. | VERIFIED |
| A03 | Persisted enabled session refreshes silently. | `src/lib/auth.tsx:65-74,140-145`. | `auth.pushSequencing.test.tsx:112-123`. | VERIFIED |
| A04 | First genuine `SIGNED_IN` checks stored preference. | `src/lib/auth.tsx:76-90,146-151`. | `auth.pushSequencing.test.tsx:79-110`. | VERIFIED |
| A05 | Already-enabled user uses the existing token path without education. | `src/lib/auth.tsx:79-83`; helpers `src/lib/pushNotifications.ts:84-110,168-180`. | `auth.pushSequencing.test.tsx:100-110`. | VERIFIED |
| A06 | Not-enabled user becomes pending without a prompt/token request. | `src/lib/auth.tsx:85-86`. | `auth.pushSequencing.test.tsx:79-87`. | VERIFIED |
| A07 | Duplicate `SIGNED_IN` is deduplicated per user/cycle. | `src/lib/auth.tsx:57,146-151`. | `auth.pushSequencing.test.tsx:89-98`. | VERIFIED |
| A08 | Sign-out and user replacement invalidate pending work. | `src/lib/auth.tsx:135-151` changes current user and clears null-session pending state. | `auth.pushSequencing.test.tsx:155-170` covers sign-out/new cycle, not replacement or in-flight work. | SOURCE VERIFIED / TEST GAP — F1 |
| A09 | A stale preference read cannot create eligibility. | `src/lib/auth.tsx:77-86` rechecks current user after the await. | No deferred preference-read test. | SOURCE VERIFIED / TEST GAP — F1 |
| A10 | A stale token request cannot save for the former user. | `src/lib/auth.tsx:31-38,66-70,77-83,102-110`. | No delayed-token plus sign-out/replacement test. | SOURCE VERIFIED / TEST GAP — F1 |
| A11 | Only an explicit visible-tab activation schedules education. | `src/navigation/RootNavigator.tsx:293-322,345-348`. | Helper tests do not mount the navigator or its `screenListeners`. | SOURCE VERIFIED / TEST GAP — F1 |
| A12 | Foreground/background change alone cannot present education. | No AppState listener invokes the scheduler; current state is read only on tab press at `RootNavigator.tsx:293-316`. | `postSignInPushGate.test.ts:15-22` rejects background state but does not test integration. | SOURCE VERIFIED / TEST GAP — F1 |
| A13 | App must be active. | `postSignInPushGate.ts:15-22`. | `postSignInPushGate.test.ts:15-25`. | VERIFIED |
| A14 | No shared modal may be open. | `postSignInPushGate.ts:20`. | `postSignInPushGate.test.ts:18-22,44-67`. | VERIFIED |
| A15 | Drawer must be closed. | `postSignInPushGate.ts:21`. | `postSignInPushGate.test.ts:19-22,28-42`. | VERIFIED |
| A16 | Presentation waits for interactions to settle. | `postSignInPushGate.ts:30-41`. | `postSignInPushGate.test.ts:44-87`. | VERIFIED |
| A17 | No fixed millisecond delay drives presentation. | Reviewed `RootNavigator.tsx:293-330` and complete `postSignInPushGate.ts:1-42`; no timer exists. | Structural absence verified in the complete two-file path. | VERIFIED |
| A18 | Eligibility is rechecked after interactions. | `postSignInPushGate.ts:38-40`. | `postSignInPushGate.test.ts:44-67`. | VERIFIED |
| A19 | Consumption spends pending state before async work. | `src/lib/auth.tsx:92-110`. | `auth.pushSequencing.test.tsx:125-140`. | VERIFIED |
| A20 | Rapid or queued attempts cannot double-present/save. | Atomic ref clear at `src/lib/auth.tsx:93-100`; scheduler comment/contract at `postSignInPushGate.ts:25-40`. | Two direct consumers are tested at `auth.pushSequencing.test.tsx:125-140`; multiple queued scheduler callbacks are not. | SOURCE VERIFIED / TEST GAP — F1 |
| A21 | Pending interaction tasks are cancelled on unmount. | `RootNavigator.tsx:310-330`. | Returned `cancel` is created but never called/asserted in `postSignInPushGate.test.ts:44-87`. | SOURCE VERIFIED / TEST GAP — F1 |
| A22 | Consumption rechecks the stored preference. | `src/lib/auth.tsx:102-107`. | `auth.pushSequencing.test.tsx:142-153`. | VERIFIED |
| A23 | “Not now” spends the current cycle without registration. | Pending is cleared before `showPushExplanation` and false returns at `src/lib/auth.tsx:96-110`; button is defined at `pushNotifications.ts:48-57`. | No false-explanation test. | SOURCE VERIFIED / TEST GAP — F1 |
| A24 | A genuine later sign-in receives fresh eligibility. | Null session resets cycle at `src/lib/auth.tsx:137-151`. | `auth.pushSequencing.test.tsx:155-170`. | VERIFIED |
| A25 | Existing save/delete/manual Settings paths remain intact. | Helpers `pushNotifications.ts:13-25,84-110,168-217,227-241`; Settings `SettingsScreen.tsx:397-428`; none changed in R3. | `pushNotifications.test.ts:51-157` covers preference/save/delete; enable UI remains preservation evidence. | VERIFIED preservation, with F4 noted separately |
| A26 | No credential/session/token/schema/native capability contract changed. | Complete R3 name-status and diff review; changed auth API is internal React context only (`auth.tsx:19-27`). | Static scope evidence; full type/lint/Jest gates pass. | VERIFIED |
| A27 | Real iOS Save Password and OS-owned prompt behavior are not claimed. | No native/runtime action occurred. | No simulator/device evidence. | DEFERRED — R5 |

### B. Deferred location permission

| ID | Requirement | Exact source evidence | Exact test evidence | Assessment |
| --- | --- | --- | --- | --- |
| L01 | Tasks explicitly requires existing permission. | `src/screens/TasksScreen.tsx:341-346`; option contract `src/lib/location.ts:133-150`. | `geoPrivacyFence.test.ts:88-95`. | VERIFIED |
| L02 | Passive Tasks mount never calls the native request helper. | `src/lib/location.ts:227-239`. | `useUserLocation.permission.test.tsx:26-55` asserts request non-call for granted/undetermined/denied. | VERIFIED native |
| L03 | Granted permission retains one-shot/cached location and distance decoration. | `src/lib/location.ts:241-254`; Tasks consumer `TasksScreen.tsx:341-355`. | `useUserLocation.permission.test.tsx:27-40`; TaskCard distance cases `TasksScreenFlagCard.test.tsx:397-412`. | VERIFIED native |
| L04 | Denied/undetermined degrades to location-free UI. | `src/lib/location.ts:231-240`. | `useUserLocation.permission.test.tsx:42-55`. | VERIFIED native |
| L05 | Passive web checks permission before geolocation. | `src/lib/location.ts:175-224`. | `geoPrivacyFence.test.ts:97-103` is source-order only. | SOURCE VERIFIED / TEST GAP — F2 |
| L06 | Missing Permissions API or rejected query degrades without geolocation/prompt. | Optional query and failure returns at `src/lib/location.ts:187-203`. | No web execution or negative geolocation assertion. | SOURCE VERIFIED / TEST GAP — F2 |
| L07 | Onboarding “Not now” never requests location. | `OnboardingCards.tsx:438-447` only tracks and advances; request is isolated at `404-436`. | `OnboardingCards.dynamicType.test.tsx:266-276,313-325` presses decline but never asserts request non-call. | SOURCE VERIFIED / TEST GAP — F2 |
| L08 | Passive Home, Tasks, Profile, guest sheet, and tab navigation remain no-prompt. | Home gating `HomeScreen.tsx:110-123,336`; Tasks `TasksScreen.tsx:341-346`; Profile `ProfileScreen.tsx:264`; no new guest/modal location caller. | `geoPrivacyFence.test.ts:64-103`; `HomeScreen.locatingState.test.ts` verifies honest passive copy, not every web branch. | SOURCE VERIFIED / web TEST GAP — F2 |
| L09 | Explicitly initiated request paths remain available. | Onboarding primary `OnboardingCards.tsx:401-436`; Map explicit locate `MapScreen.tsx:1232-1260`; Home opts out after user action `HomeScreen.tsx:336`. | `geoPrivacyFence.test.ts:64-95` pins the allowed request sites. | VERIFIED structural preservation |
| L10 | No watcher, history, persistence, background permission, server work, transmission, DB field, or coordinator was added. | Complete R3 diff plus no watcher call; `src/lib/location.ts:149-275` is local one-shot state only. | `geoPrivacyFence.test.ts:106-112` pins no watchers; changed-file scope contains no backend/schema/native file. | VERIFIED |
| L11 | R2 denied banner and Report draft/typography behavior remain. | Map `MapScreen.tsx:2759-2786,3888-3922`; Report `ReportFlagModal.tsx:436-470,831-869,918`; neither Report nor its tests changed in R3. | `MapScreen.openSettings.test.ts:55-84`; `ReportFlagModal.test.tsx:1550-1817`. | VERIFIED preservation |

### C. Guest review gating and detail handoff

| ID | Requirement | Exact source evidence | Exact test evidence | Assessment |
| --- | --- | --- | --- | --- |
| G01 | `TaskCard` receives explicit review capability and sign-in callback. | `TasksScreen.tsx:873-903,1744-1784`. | `TasksScreenFlagCard.test.tsx:312-347`; guard `guestReviewGating.guard.test.ts:40-45`. | VERIFIED |
| G02 | Guest card shows exactly one sign-in action plus Details. | `TasksScreen.tsx:1888-1946`. | `TasksScreenFlagCard.test.tsx:313-324`. | VERIFIED |
| G03 | Guest card exposes no verdict segment/actions. | `TasksScreen.tsx:1888-1946`. | `TasksScreenFlagCard.test.tsx:318-324`. | VERIFIED |
| G04 | Guest card accessibility text names the sign-in boundary. | `TasksScreen.tsx:1929-1933,2175-2185`. | `TasksScreenFlagCard.test.tsx:335-347`. | VERIFIED |
| G05 | Guest card has no long-press selection entry. | `TasksScreen.tsx:885,2090-2093`. | `TasksScreenFlagCard.test.tsx:335-347`. | VERIFIED |
| G06 | Guest summary hint does not advertise long press. | `TasksScreen.tsx:2175-2185`. | `TasksScreenFlagCard.test.tsx:335-347`. | VERIFIED |
| G07 | Guest cannot see Select multiple. | `TasksScreen.tsx:1112-1131,1305-1320`. | Source string assertions `guestReviewGating.guard.test.ts:32-38`; no Tasks runtime mount. | SOURCE VERIFIED / TEST GAP — F3 |
| G08 | Guest without active filters has no empty task-tools trigger/sheet. | `TasksScreen.tsx:1112-1131,1287-1321`. | `tasksHeaderReclaim.guard.test.ts` is source-structural only. | SOURCE VERIFIED / TEST GAP — F3 |
| G09 | Guest with active filters retains Clear filters. | `TasksScreen.tsx:1116-1127,1287-1304`. | `tasksHeaderReclaim.guard.test.ts` is source-structural only. | SOURCE VERIFIED / TEST GAP — F3 |
| G10 | Guest cannot enter or retain selection. | Entry guards `TasksScreen.tsx:455-473`; card tap `850-860`; auth cleanup `433-440`. | `guestReviewGating.guard.test.ts:32-38` scans source; no auth-transition behavior test. | SOURCE VERIFIED / TEST GAP — F3 |
| G11 | Auth loss clears selection and closes the tools sheet. | `TasksScreen.tsx:433-440`. | Only `toContain` assertions at `guestReviewGating.guard.test.ts:32-38`. | SOURCE VERIFIED / TEST GAP — F3 |
| G12 | Bulk bar and reserve are signed-in-only. | `TasksScreen.tsx:1434-1445,1580-1601`. | `guestReviewGating.guard.test.ts:32-38` pins source conditions. | VERIFIED structural boundary |
| G13 | `FlagDetailModal` accepts one optional host sign-in callback. | `FlagDetailModal.tsx:118-170`. | `FlagDetailModal.sheetPresentation.test.tsx:215-268`; guard `guestReviewGating.guard.test.ts:65-71`. | VERIFIED |
| G14 | Signed-in verdict order, labels, handlers, confirmation, mutation, and busy state remain. | Controls `FlagDetailModal.tsx:1269-1294`; guarded mutation `813-862`; existing Tasks path `741-788`. | Signed-in labels `FlagDetailModal.sheetPresentation.test.tsx:270-276`; `bp3TrustEngineGuards.test.ts` and `inertControlVisual.guard.test.ts` provide preservation guards. | VERIFIED preservation |
| G15 | Guest read intent keeps Directions primary and one sign-in boundary. | `FlagDetailModal.tsx:1180-1321,1725-1778`. | `FlagDetailModal.sheetPresentation.test.tsx:241-249`. | VERIFIED |
| G16 | Guest triage intent makes sign-in primary and keeps Directions. | `FlagDetailModal.tsx:1725-1850`. | `FlagDetailModal.sheetPresentation.test.tsx:251-268`. | VERIFIED immediate presentation |
| G17 | Guest-safe Map, Directions, Share, History, and content remain available. | `FlagDetailModal.tsx:1789-1850` plus unchanged content body. | Presentation test asserts Directions only; no full guest-safe action inventory assertion. | SOURCE VERIFIED / TEST GAP — F3 |
| G18 | Tasks and Map record Profile intent and close detail first. | Tasks `TasksScreen.tsx:818-837`; Map `MapScreen.tsx:1810-1827`. | `guestReviewGating.guard.test.ts:47-63` scans sliced source. | SOURCE VERIFIED / TEST GAP — F3 |
| G19 | iOS completes Profile handoff from modal dismissal. | Tasks wiring `TasksScreen.tsx:1717-1738`; Map wiring `MapScreen.tsx:3223-3240`. | FlagDetail forwards `onDismiss` at `MapScreen.detailFocus.test.tsx:121-142`; Profile navigation is not invoked. | SOURCE VERIFIED / TEST GAP — F3 |
| G20 | Non-iOS completes through an interaction-settled fallback. | Tasks `TasksScreen.tsx:828-837`; Map `MapScreen.tsx:1816-1827`. | Source string checks only at `guestReviewGating.guard.test.ts:47-63`. | SOURCE VERIFIED / TEST GAP — F3 |
| G21 | Handoff is consumed once and queued task is cancelled on unmount. | Tasks `TasksScreen.tsx:821-843`; Map `MapScreen.tsx:1807-1834`. | No repeated-dismissal/repeated-fallback/cancellation test. | SOURCE VERIFIED / TEST GAP — F3 |
| G22 | Existing Map camera restoration remains exact-once. | `MapScreen.tsx:1836-1845,1883-1894`. | `MapScreen.detailFocus.test.tsx:145-184`. | VERIFIED |
| G23 | Intentional Profile handoff outranks pending Map focus restoration. | `MapScreen.tsx:1816-1827,1883-1894`. | No test invokes both pending states. | SOURCE VERIFIED / TEST GAP — F3 |
| G24 | Both mutation paths retain `if (!user)` before `updateFlagStatus`. | Tasks `TasksScreen.tsx:741-770`; detail `FlagDetailModal.tsx:813-835`. | Bounded handler checks `guestReviewGating.guard.test.ts:18-30`. | VERIFIED defense in depth |
| G25 | Guest sign-in controls do not call mutation callbacks. | Same guards plus explicit guest actions. | TaskCard `TasksScreenFlagCard.test.tsx:326-333`; detail `FlagDetailModal.sheetPresentation.test.tsx:261-268`. | VERIFIED |
| G26 | Supabase/RLS, points, haptics, optimistic reconciliation, token shape, and production helpers remain unchanged. | R3 diff scope; Tasks preservation `TasksScreen.tsx:695-788`; unchanged backend/helper files. | Full gates and preservation guards pass; no backend/native/package file in range. | VERIFIED preservation |

## 6.2 Named-test adequacy inventory

All 17 required files were read, not merely counted.

| Named file | Evidence type | Independent adequacy conclusion |
| --- | --- | --- |
| `src/lib/__tests__/auth.pushSequencing.test.tsx` | Provider behavior | Useful happy-path/dedup/atomic coverage; inadequate for deferred async invalidation, replacement, and “Not now” (`H2A-F1`). |
| `src/navigation/__tests__/postSignInPushGate.test.ts` | Pure helper behavior | Adequate for gate truth table and settled recheck; does not prove real navigator wiring, cancellation, or multiple queued tasks (`H2A-F1`). |
| `src/lib/__tests__/pushNotifications.test.ts` | Helper behavior | Adequate for preference reads and token save/delete shape/error handling; does not execute education/token-request/enable flow. R3 did not modify the helper. |
| `src/hooks/__tests__/useNotificationPreferences.test.ts` | Mirrored test-local implementation | Vacuous for the real hook lifecycle and setter (`H2A-F4`). |
| `src/lib/__tests__/useUserLocation.permission.test.tsx` | Native hook behavior | Adequate for native granted/undetermined/denied existing-permission mode; no web branch (`H2A-F2`). |
| `src/lib/__tests__/location.test.ts` | Pure Map/peek states | Adequate for its legacy decision helpers; does not exercise `useUserLocation` web behavior. |
| `src/__tests__/geoPrivacyFence.test.ts` | Repository/source guard | Useful asker/watcher fence; the web check is only first-occurrence string ordering (`H2A-F2`). |
| `src/components/__tests__/OnboardingCards.dynamicType.test.tsx` | Rendered UI with never-settling permission mocks | Adequate for layout/funnel copy; missing the request-helper negative assertion after “Not now” (`H2A-F2`). |
| `src/screens/__tests__/MapScreen.openSettings.test.ts` | Source guard | Adequate R2 preservation guard for the denied-location route; not passive Tasks/web evidence. |
| `src/screens/__tests__/HomeScreen.locatingState.test.ts` | Source/decision guard | Adequate for honest Home locating copy; not a no-prompt integration test. |
| `src/screens/__tests__/TasksScreenFlagCard.test.tsx` | Rendered isolated TaskCard | Adequate immediate guest/signed-in card controls and accessibility; bypasses Tasks auth-transition/tool-sheet state (`H2A-F3`). |
| `src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx` | Rendered detail modal | Adequate immediate read/triage controls; does not test host dismissal/navigation lifecycle (`H2A-F3`). |
| `src/screens/__tests__/MapScreen.detailFocus.test.tsx` | Rendered callback forwarding plus source guard | Adequate existing camera restoration; not the new Profile-priority path (`H2A-F3`). |
| `src/screens/__tests__/guestReviewGating.guard.test.ts` | Bounded source slices/strings | Useful non-vacuity for guard order and wiring; cannot prove runtime cleanup, fallback, cancellation, or exact-once behavior (`H2A-F3`). |
| `src/screens/__tests__/bp3TrustEngineGuards.test.ts` | Preservation source guard | Adequate to pin existing verdict/haptic/points structure; not an end-to-end mutation test. |
| `src/__tests__/inertControlVisual.guard.test.ts` | Bounded source guard | Its R3 semantic boundary avoids the former fixed-window truncation; adequate only as visual-structure preservation evidence. |
| `src/screens/__tests__/tasksHeaderReclaim.guard.test.ts` | Source structure/geometry guard | Adequate for header/tool truth-table structure; does not mount Tasks as a guest or across auth loss (`H2A-F3`). |

## 6.3 Repeated preflight, ownership, and ancestry evidence

The complete fail-fast preflight was repeated without fetching at the start of H2A and again immediately before this report write.

- Target absolute path and branch: `/Users/skypie/AccessMap-codex/presubmission-ui-polish`, `codex/presubmission-ui-polish`.
- Target HEAD remained `0f2bd9cc9f19ecbdb9f76f821bab3cdc621cf184` before the report write.
- `git status --porcelain=v2 --branch --untracked-files=all` printed only the target branch headers. Unstaged names, staged names, unmerged index entries, unmerged diff names, and untracked target paths were all empty.
- Correctly anchored conflict-marker search exited 1 with no matches. An earlier intentionally broad diagnostic pattern also matched long historical `====` separator lines; those were not conflict markers, and the anchored rerun resolved the false positives.
- Local `main` and the local `origin/main` tracking ref both remained `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`. No fetch occurred.
- Both `main...HEAD` and `origin/main...HEAD` were `0 behind / 20 ahead`; `main...origin/main` was `0 / 0`.
- Primary checkout `/Users/skypie/AccessMap` remained on `main` at `a0bf4d0`, with no tracked or staged changes and only its pre-existing untracked material. It was read only and was not cleaned.
- Claude worktrees remained detached and clean: `angry-yonath-947bbc` at `9a4361d1c6515636ea4f40caf5479f6f0eea3738`, `reverent-matsumoto-7afec6` at `d43f8672de2ff06650d034f24d5165a7a44bd29e`, and `xenodochial-ptolemy-4d959e` at `d5df8adcd79be09013cec96958a40d3e2bda9d85`. Each had no tracked, staged, untracked, or unmerged path.
- No overlapping R3/H2A source owner was identified.
- `git check-ignore -v .env` returned `.gitignore:12:.env`; `.env` was never opened, printed, or inferred.

## 6.4 Automated gates and exact invocations

The required commands ran in the exact prescribed order. No auto-fix or formatter ran.

1. `npm run typecheck` — **exit 0**, wall time **6.559135167 s**. `tsc --noEmit` emitted no diagnostic.
2. `npm run lint` — **exit 0**, wall time **11.313426625 s**. **0 errors, 90 warnings, 11 potentially auto-fixable**; no fix was requested or applied.
3. `npx --no-install jest --ci -w 3`:
   - First invocation: **exit 1 before suite initialization**; the command runner reported **0.000 s**. Watchman could not `fchmod` its existing user-state path under the restricted sandbox (`Operation not permitted`). No suite or test ran.
   - Identical approved host-context retry: **exit 0**, command wall time **28.718310666 s**, Jest time **27.234 s**. **250/250 suites passed; 3,673 passed, 32 todo, 3,705 total; 0 failed; 0 snapshots.** Jest reported no per-test retry; there was one manual infrastructure retry of the complete command.
4. `git diff --check` — **exit 0**, wall time **0.000002917 s**. No output.

### Jest comparison and warning classes

- The successful result exactly matches the R3 comparison point: 250 suites, 3,673 passed, 32 todo, 3,705 total, and zero snapshots.
- Non-failing output retained: Watchman `opendir` denial for a CloudKit cache subtree; existing React state-update-not-wrapped-in-`act(...)` messages; React Native `SafeAreaView` deprecation warnings; and expected `console.warn`/`console.error`/`console.log`/`console.debug` output from tests that deliberately exercise storage, network, parsing, reconciliation, or sanitization failure paths. Jest emits no aggregate console-warning count.
- The host retry did not reset Watchman and did not modify repository files.

### Lint reconciliation

- R1 recorded 83 warnings. R2 introduced exactly seven `import/first` warnings in `src/screens/__tests__/ReportFlagModal.test.tsx:37-43`, reconciling 83 to 90.
- H2A independently observed the same 90 warnings and zero errors. Warning families were `@typescript-eslint/array-type`, `@typescript-eslint/no-require-imports`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `react-hooks/exhaustive-deps`, `import/no-duplicates`, `import/first`, `no-console`, and one unused ESLint-disable warning.
- `src/components/FlagDetailModal.tsx:392` still reports the pre-existing `react-hooks/exhaustive-deps` warning for `shownFlag`. `git blame` attributes that line to older commit `abf18c69`; the R3 starting source has the same dependency list at line 389. It is not R3-created.
- No R3-created file (`auth.pushSequencing.test.tsx`, `useUserLocation.permission.test.tsx`, `postSignInPushGate.ts`, `postSignInPushGate.test.ts`, or `guestReviewGating.guard.test.ts`) appears in the lint output. R3 added no warning beyond the R2 baseline.

## 6.5 Privacy and production-boundary attestation

- Location remains local, one-shot, presentation-only state. R3 added no continuous watcher, history, persistence key, background permission, DB field, server query, transmission, analytics payload containing location, or centralized location coordinator.
- H2A made no change to privacy-sensitive location behavior. The identified gap is evidence coverage, not permission to widen the architecture.
- Push eligibility remains ephemeral React state/refs for the current auth cycle. No credential, session format, token schema, logging shape, native entitlement, notification capability, or database/API contract changed.
- Guest review changes do not alter Supabase authorization, RLS, production mutation helpers, points calculations, or backend schema. Existing pre-write `if (!user)` guards remain.
- No credential, `.env`, keychain, shell history, real user/session/token, real location, real status mutation, direct Supabase access, server write, dependency install, native build, external send, or production action occurred.
- No merge, push, rebase, pull request, fetch, simulator, device, EAS/cloud build, deployment, App Store submission, release, or formatter action occurred.

## 6.6 R5 hold list

R5 remains fully held and must include every item below after the H2A evidence blockers are resolved:

- Real iOS Save Password surface.
- Push education timing, cancellation, acceptance, denial, repeat sign-in, and foreground/background behavior.
- Onboarding “Not now” followed by passive Tasks/Profile/tab navigation.
- Explicit locate after location deferral.
- Guest and signed-in card/detail presentation.
- One-time detail dismissal to Profile.
- Map camera restoration versus intentional Profile handoff.
- VoiceOver focus, labels, hints, and modal behavior.
- Dynamic Type.
- Light and dark mode.
- Reduce Motion.
- Reduce Transparency.

## 6.7 Unresolved and provisional work

- The four verified evidence findings are unresolved because H2A was documentation-only.
- No source correction is provisionally recommended until the missing tests execute the implementation and expose a behavior mismatch.
- All runtime/device judgments remain **DEFERRED** to R5; none was inferred from unit tests.
- Exact H2A classification remains **NOT READY**.

## 6.8 Process Self-Check

### Efficiency Check

The review used the R1, R2, and R3 reports as a navigation index but rechecked every claim against git, the complete R3 range, current source, callers, cleanup paths, and all 17 named tests. The cumulative diff was reviewed commit-by-commit and as one range; targeted line traces were then used to avoid repeatedly rereading unrelated files. The full suite was run once successfully after the required sandbox retry; no redundant focused suite was needed to establish the coverage gaps.

### Overlap Check

No concurrent source overlap was detected. The target was the sole active branch lane; the primary checkout had no tracked changes, and all three registered Claude worktrees were detached and clean. No subagent or secondary worktree was used for this documentation-only H2A pass.

### Simplification Opportunities

Accepting the R3 report's green gate summary would have been shorter but would not have been independent. The smallest valid path was the one used: inspect the full range and named evidence, run the exact gates, document gaps, and avoid repairs. A future repair should prefer deterministic tests over architecture changes.

## 7. How to Review

Inspect the documentation-only H2A commit:

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish show --stat --oneline HEAD
```

Read the report diff:

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish show --format=fuller -- qa-reports/2026-08-27_Codex_FlagstoneH2AIndependentReview.md
```

Confirm the branch contains no uncommitted path:

```bash
git -C /Users/skypie/AccessMap-codex/presubmission-ui-polish status --short --branch
```

## 8. Next Recommended Action

Sky should review this report and decide whether to authorize the smallest test-only evidence repair pass; do not start R5, merge, or push this branch until that decision and a clean repeated H2A result.
