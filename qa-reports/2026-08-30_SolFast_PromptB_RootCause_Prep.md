# Flagstone Prompt B Reliability Root-Cause Prep

## Audited Source

- Repository: `Skypie99/AccessMap`
- Source branch: `claude/ui-polish-fix4b-sheet-scroll-hardening-20260829`
- Exact audited SHA: `2762a5447600e8de55be912ccb26e95456484945`
- Source verification: `origin/claude/ui-polish-fix4b-sheet-scroll-hardening-20260829` resolved exactly to the audited SHA after a fresh fetch.
- Scope: product source read-only; no simulator, native build, deployment, Supabase mutation, migration execution, or broad test run.

## Executive Summary

- **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** The observed reliability failures are **2 shared data-contract clusters plus 2 separate presentation/error issues**, not six independent screen defects.
- **[CONFIRMED FROM SOURCE]** Home, Tasks, Map, and Nearby all consume one `FlagsProvider`; Nearby performs no fetch of its own.
- **[CONFIRMED FROM SOURCE]** My Reports, Recent Activity, and Admin's flag queue reuse the same full `flags` projection as the shared provider through helpers in `src/lib/flags.ts`.
- **[CONFIRMED FROM SOURCE]** Every full flag read selects `photo_object_key` and `photo_uploader_id`; the audited managed migration chain does not create those columns. They appear in `supabase/nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql` only.
- **[CONFIRMED FROM SOURCE]** Profile independently selects `users.avatar_object_key`; the audited managed migration chain does not create it, while the same non-managed proposed SQL does.
- **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** A missing-column response for either projection would map to `FEATURE_UNAVAILABLE` and deterministically fail again on every Retry until the client/backend contract is aligned.
- **[CONFIRMED FROM SOURCE]** The apparently global flag error is shared provider state rendered by Home, Tasks, and Map. Navigation, theme changes, and unrelated successful requests do not clear it; a successful provider refresh does.
- **[SEPARATE CONFIRMED ISSUE]** Visible `yet.. Tap to retry` is punctuation concatenation: `FEATURE_UNAVAILABLE` already ends in `.` and `failureBannerText()` appends another `.`.
- **[SEPARATE CONFIRMED ISSUE]** Native location exceptions reach `Alert.alert` through generic `errorMessage()`, whose intended unmatched-error behavior is raw pass-through; this explains visible `kCLErrorDomain` text.
- **[ALREADY CORRECT]** Account-deletion receipt retention on unavailable status is deliberate recovery behavior. The receipt is written before the network request, retained across ambiguity/outage, and removed only by explicit receipt dismissal; do not weaken this without contrary runtime proof.

## Failure Dependency Map

**Confidence for every dependency row:** **CONFIRMED FROM SOURCE**.

| Surface | Hook/store/callback | Client data access | Supabase dependency / selected shape | Error state and UI | Retry/refresh path |
|---|---|---|---|---|---|
| Home | `useFlags()` | `FlagsProvider.refresh()` -> `listFlagsPage()` for default statuses, else `listFlags()` | `flags`: `id,user_id,lat,lng,category,description,severity,photo_url,photo_object_key,photo_uploader_id,photo_alt,status,created_at` | Shared provider `error`; empty error card or stale-data banner | Button and pull-to-refresh call shared `refresh()` |
| Tasks | `useFlags()` | Same shared provider path | Same full `flags` projection | Shared provider `error`; top red banner plus error empty state | Banner and pull-to-refresh call shared `refresh()` |
| Explore / Map | `useFlags()` | Same shared provider path | Same full `flags` projection | Shared provider `error`; red pressable banner | Banner calls shared `refresh()` |
| Nearby | Props from `MapScreen` | No request; sorts/filters Map's provider `flags` locally | Inherits the Map/provider `flags` result | No local data error state | Inherits Map banner/provider Retry |
| Profile | `useAuth()` + local `load()` | Direct `users` and `flags` calls; point-event helpers degrade independently | `users`: `id,display_name,avatar_url,avatar_object_key,points,created_at`; `flags`: `status` filtered by `user_id` | Local `loadError`; inline profile card | Try again and pull-to-refresh call local `load()` |
| My Reports | `useAuth()` + local `load()` | `listFlagsByUser(user.id)` | Same full `flags` projection, filtered by `user_id` | Local `loadError`; modal banner | Button and pull-to-refresh call local `load()` |
| Recent Activity | `useAuth()` + local `load()` | `Promise.all([listRecentFlags(100), loadWatched(user.id)])` | Same full `flags` projection; watched IDs are best-effort AsyncStorage | Local `loadError`; modal banner | Button and pull-to-refresh call local `load()` |

- **[CONFIRMED FROM SOURCE]** Home, Tasks, Map, and Nearby share one upstream query/store. One provider failure fans out to all four.
- **[CONFIRMED FROM SOURCE]** Profile, My Reports, and Recent Activity share the authenticated `user.id` gate, but they do **not** share one profile query. My Reports and Recent Activity converge on the full flag projection; Profile has its own `users` projection and a source-consistent status-only flag query.
- **[CONFIRMED FROM SOURCE]** `getPointEventHistory()` and `getLifetimeReportOutcomes()` cannot cause the main Profile failure in this path because Profile catches and degrades their failures before evaluating the two required query results.

## Root-Cause Clusters

### B-RC-001

- **ID:** B-RC-001
- **CONFIDENCE:** **STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED**
- **AFFECTED SURFACES:** Home, Tasks, Explore/Map, Nearby, My Reports, Recent Activity; Admin flag queue shares the dependency.
- **FILES:** `src/lib/flags.ts`, `src/lib/flagsStore.tsx`, `src/screens/HomeScreen.tsx`, `src/screens/TasksScreen.tsx`, `src/screens/MapScreen.tsx`, `src/components/MyReportsModal.tsx`, `src/components/ActivityFeedModal.tsx`.
- **SHARED DEPENDENCY:** Full reads of `public.flags`.
- **SOURCE EVIDENCE:** **[CONFIRMED FROM SOURCE]** `listFlags`, `listFlagsPage`, `listFlagsByUser`, `fetchFlagById`, `fetchFlagsByIds`, and `listRecentFlags` all select `photo_object_key` and `photo_uploader_id`. The managed base creates neither. Managed migration `20260819214410_photo_alt_text.sql` creates `photo_alt`; only non-managed proposed D1F4 SQL creates the two provenance columns.
- **LIKELY ROOT CAUSE:** **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** The real-iOS backend rejects the explicit projection because one or both provenance columns are unavailable or absent from the PostgREST schema cache. The resulting missing-column error maps to `FEATURE_UNAVAILABLE`.
- **RUNTIME PROOF REQUIRED:** Capture the exact failing `/rest/v1/flags` response body (`code`, `message`, `details`, `hint`), request projection, auth role, and status. Perform an approved read-only runtime schema/cache comparison for `photo_object_key`, `photo_uploader_id`, and `photo_alt`. Correlate any HTTP 200 evidence to the exact request; unrelated 200s do not prove this call succeeded.
- **SMALLEST SAFE FIX DIRECTION:** Align the shared full-read projection with the proven runtime contract once, in `src/lib/flags.ts`. Prefer one exact capability/legacy projection path shared by all flag readers over six screen catch blocks. Do not remove canonical photo provenance blindly: if the runtime has canonical-only rows (`photo_url` null, object key present), a legacy-only projection could hide photos.

### B-RC-002

- **ID:** B-RC-002
- **CONFIDENCE:** **STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED**
- **AFFECTED SURFACES:** Profile main data load.
- **FILES:** `src/screens/ProfileScreen.tsx`, `src/types/database.ts`.
- **SHARED DEPENDENCY:** Direct full-profile read from `public.users`.
- **SOURCE EVIDENCE:** **[CONFIRMED FROM SOURCE]** Profile selects `avatar_object_key`; the managed base creates `avatar_url` but not `avatar_object_key`. Only the non-managed proposed D1F4 SQL creates that column. The concurrent `flags.select('status')` path is source-consistent.
- **LIKELY ROOT CAUSE:** **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** The Profile `users` projection is rejected for an unavailable `avatar_object_key`, causing the whole required `Promise.all` load to fail.
- **RUNTIME PROOF REQUIRED:** Capture the exact failing `/rest/v1/users` request/response and perform an approved read-only comparison for `users.avatar_object_key`. Confirm the authenticated subject still has/read-access to its `users` row.
- **SMALLEST SAFE FIX DIRECTION:** Add an exact, tested compatibility path for the profile projection only after runtime proof. Preserve object-key-derived avatar display when the column exists; do not convert this into a broad auth/session rewrite.

### B-RC-003

- **ID:** B-RC-003
- **CONFIDENCE:** **CONFIRMED FROM SOURCE**
- **AFFECTED SURFACES:** Home, Tasks, Map; any observation made while their shared provider remains mounted.
- **FILES:** `src/lib/errors.ts`, `src/lib/copy.ts`, `src/lib/flagsStore.tsx`, the three rendering screens.
- **SHARED DEPENDENCY:** Provider-level `error` plus shared error-copy mapping.
- **SOURCE EVIDENCE:** Missing-feature codes `42P01`, `42883`, `PGRST202`, `PGRST204`, or any message matching `/does not exist/i` map to `FEATURE_UNAVAILABLE`. Provider `error` clears only on empty-status handling, successful network refresh, or provider unmount. `failureBannerText()` unconditionally inserts `.` before Retry when the message lacks the retry words.
- **LIKELY ROOT CAUSE:** This is not the data failure. It explains why one old flag failure survives navigation/theme changes, why unrelated success does not clear it, and why visible copy reads `yet.. Tap to retry.`
- **RUNTIME PROOF REQUIRED:** **[ALREADY CORRECT]** None to prove the source behavior. Real-iOS acceptance must prove the banner clears after an actual provider success and does not overlay unrelated successful surfaces.
- **SMALLEST SAFE FIX DIRECTION:** Fix the upstream shared read first. Then normalize sentence joining and, if acceptance still shows stale cross-surface presentation, scope/clear the provider error without duplicating it per screen.

### B-RC-004

- **ID:** B-RC-004
- **CONFIDENCE:** **SEPARATE CONFIRMED ISSUE**
- **AFFECTED SURFACES:** Native Map location request and the Report sheet's delegated “Use my location” action.
- **FILES:** `src/screens/MapScreen.tsx`, `src/lib/location.ts`, `src/lib/errors.ts`.
- **SHARED DEPENDENCY:** `expo-location` exception -> Map catch -> generic `errorMessage()` -> native `Alert.alert`.
- **SOURCE EVIDENCE:** `ReportFlagModal` delegates `onRequestLocation` to Map's `requestLocation()`. Its native catch calls `Alert.alert("Couldn't find your location", errorMessage(e))`. Generic `errorMessage()` intentionally returns unmatched raw messages, so native Core Location text such as `kCLErrorDomain` passes through.
- **LIKELY ROOT CAUSE:** A missing location-specific presentation boundary, independent of Supabase data failures.
- **RUNTIME PROOF REQUIRED:** Reproduce one denied/unavailable native location exception and confirm stable human copy is visible while diagnostic code remains internal only.
- **SMALLEST SAFE FIX DIRECTION:** Add a location-specific normalizer at the location boundary: native exception -> internal diagnostic log -> stable location error class/copy. Do not broaden generic `errorMessage()` or redesign location architecture.

## FEATURE_UNAVAILABLE + GLOBAL BANNER

- **[CONFIRMED FROM SOURCE] Exact implementation:** `src/lib/errors.ts::friendlyMessage()` returns exported `FEATURE_UNAVAILABLE` (`That feature isn't available yet.`).
- **[CONFIRMED FROM SOURCE] Exact code mappings:** `42P01` (undefined table), `42883` (undefined function), `PGRST202` (function absent from PostgREST schema cache), and `PGRST204` (column absent from schema cache).
- **[CONFIRMED FROM SOURCE] Exact message mapping:** any unmatched code whose message matches `/does not exist/i` also maps to `FEATURE_UNAVAILABLE`. Codes take precedence over message regexes.
- **[CONFIRMED FROM SOURCE] Flag state storage:** `FlagsProvider` owns one shared React `error` state above the tab navigator in `RootNavigator.tsx`. Home, Tasks, and Map consume it; Nearby consumes Map's rows and has no local request/error state.
- **[CONFIRMED FROM SOURCE] Local state storage:** Profile, My Reports, Recent Activity, and both Admin queues each own separate local load-error state. They can independently render the same mapped sentence without sharing the same state object.
- **[CONFIRMED FROM SOURCE] Clearing:** a provider success calls `setError(null)`; an empty status selection also clears it; provider unmount resets it. A retry start does not clear it. My Reports, Recent Activity, and Profile clear their local errors at load start; Admin clears its local errors only on success.
- **[CONFIRMED FROM SOURCE] Successful requests:** a successful shared flag refresh clears the provider error. A successful Admin/Profile/modal request cannot clear the provider error because it does not own that state.
- **[CONFIRMED FROM SOURCE] Old failure persistence:** one provider failure can remain visible across Home/Tasks/Map navigation and theme changes until provider success/unmount. It cannot directly render `FEATURE_UNAVAILABLE` through the app-root `LiveStatusRegion`; that channel receives only the flag-read “Still trying” timeout message, not the settled provider error.
- **[CONFIRMED FROM SOURCE] Admin coexistence:** Admin's flag queue calls `listRecentFlags()` and therefore shares B-RC-001's projection while storing its own error. The Reports queue has a separate request. Both Admin list empty components render whenever rows are empty and loading has settled, without suppressing themselves when an error exists. Therefore “No open reports” beside a red error is not proof that the request succeeded.
- **[SEPARATE CONFIRMED ISSUE] `yet..` source:** literal-plus-concatenation. `FEATURE_UNAVAILABLE` ends with `.`, then `failureBannerText()` returns ``${providerMessage}. ${RETRY_VERB}``. Existing tests cover retry-verb deduplication but not terminal-punctuation normalization.
- **[ALREADY CORRECT] Retry callback identity:** Tasks and Map call the shared provider `refresh`; the provider's own “Still trying” action calls the current stable `refreshRef` and catches rejection.

## Retry Truth

| Surface | Classification | Source truth |
|---|---|---|
| Home | **RETRY WORKS BUT REPEATS SAME DETERMINISTIC FAILURE** | **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** Button and pull-to-refresh call `FlagsProvider.refresh()`. It reissues the full projection. If B-RC-001 is the live error, it must fail again. **[CONFIRMED FROM SOURCE]** Home uses bare `void refresh()` even though the no-cache failure path rethrows; this may produce an unhandled rejection but does not prevent the request from running. |
| Tasks | **RETRY WORKS BUT REPEATS SAME DETERMINISTIC FAILURE** | **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** Banner and pull-to-refresh call the same provider `refresh()` and catch rejection. Loading resets; success clears provider error; the same schema error repeats. |
| Nearby | **RETRY WORKS BUT REPEATS SAME DETERMINISTIC FAILURE** | **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** Nearby has no fetch or Retry. It inherits Map's provider rows and Map's banner Retry, which reissues the same projection. |
| My Reports | **RETRY WORKS BUT REPEATS SAME DETERMINISTIC FAILURE** | **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** Button and pull-to-refresh call local `load()`. It clears `loadError`, sets loading, and calls `listFlagsByUser()` again; B-RC-001 would deterministically recur. |
| Recent Activity | **RETRY WORKS BUT REPEATS SAME DETERMINISTIC FAILURE** | **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** Button and pull-to-refresh call local `load()`. It clears `loadError`, sets loading, and reruns `Promise.all([listRecentFlags(), loadWatched()])`; watched storage is best-effort, so the full flag read is the high-confidence repeat failure. |

- **[CONFIRMED FROM SOURCE]** No inspected retry is blocked by a focus guard or stale closure. Shared first-page refresh uses a sequence counter; modal loaders use mounted refs; Admin uses request sequence tags.
- **[CONFIRMED FROM SOURCE]** Provider error is cleared on success, not at the beginning of Retry. Tasks/Map render `Retrying…` over the old state while loading. Home keeps the error card until success. This is presentation state, not evidence that Retry did not fire.
- **[CONFIRMED FROM SOURCE]** Pull-to-refresh uses the same path as the visible Retry for Home, Tasks, My Reports, Recent Activity, and Profile. Nearby has neither; Map's error banner is its recovery control.
- **[POSSIBLE — LOW CONFIDENCE]** If runtime proves the exact failing requests differ between attempts, reclassify the affected surface. Do not label wiring defective solely because the same backend contract error persists.

## Client Expectations vs Repo Schema

| Dependency | Client expectation | Audited repo schema evidence | Classification |
|---|---|---|---|
| `flags` base read fields | `id,user_id,lat,lng,category,description,severity,photo_url,status,created_at` | Created by managed base migration; later managed migrations alter constraints/policies | **SOURCE-CONSISTENT** |
| `flags.photo_alt` | Selected by all full flag readers | Created by managed `20260819214410_photo_alt_text.sql` | **SOURCE-CONSISTENT** |
| `flags.photo_object_key` | Selected by all full flag readers; used to derive canonical display URL | Not created by the audited managed chain; created in non-managed proposed D1F4 SQL | **SOURCE DEFECT** in the audited repository contract; **STRONG DRIFT HYPOTHESIS — RUNTIME PROOF REQUIRED** for the deployed backend |
| `flags.photo_uploader_id` | Selected by all full flag readers | Not created by the audited managed chain; created in non-managed proposed D1F4 SQL | **SOURCE DEFECT** in the audited repository contract; **STRONG DRIFT HYPOTHESIS — RUNTIME PROOF REQUIRED** for the deployed backend |
| `users` base profile fields | `id,display_name,avatar_url,points,created_at` | Created by managed base/trust-score migrations | **SOURCE-CONSISTENT** |
| `users.avatar_object_key` | Selected by Profile; used to derive canonical avatar URL | Not created by the audited managed chain; created in non-managed proposed D1F4 SQL | **SOURCE DEFECT** in the audited repository contract; **STRONG DRIFT HYPOTHESIS — RUNTIME PROOF REQUIRED** for the deployed backend |
| Profile `flags.status` by `user_id` | Status-only rows for counts | Both columns exist in managed base | **SOURCE-CONSISTENT** |
| `point_events` profile enhancements | History and lifetime counts | Client explicitly degrades missing/failed ledger reads before required Profile results are checked | **ALREADY CORRECT** for main-load isolation |
| Activity watched IDs | Per-user AsyncStorage | `loadWatched()` catches read failures and returns `[]` | **ALREADY CORRECT** for main-load isolation |

- **[CONFIRMED FROM SOURCE]** The audited tree also contains source-level D1F4 guards that refer to managed D1F4 migration filenames absent at this SHA. This reinforces that the audited client/schema snapshot is internally incomplete; it still does not prove deployed production state.
- **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** The most efficient proof is exact response capture plus a read-only runtime schema/cache comparison. Do not browse migration history further unless those two artifacts contradict the table above.
- **[POSSIBLE — LOW CONFIDENCE]** A stale PostgREST schema cache could produce the same missing-column shape even if the physical column exists. Exact runtime error fields and a read-only schema check distinguish cache staleness from physical absence.

## Location Error

- **[SEPARATE CONFIRMED ISSUE] Call path:** Report sheet “Use my location” -> `ReportFlagModal` calls its `onRequestLocation` prop -> `MapScreen.requestLocation()` -> `Location.requestForegroundPermissionsAsync()` -> cached position or `getCurrentPositionWithTimeout()` -> catch.
- **[CONFIRMED FROM SOURCE] Native presentation:** the catch calls `Alert.alert("Couldn't find your location", errorMessage(e))`.
- **[CONFIRMED FROM SOURCE] Why native text leaks:** `errorMessage()` maps only known database/network/permission patterns, then deliberately returns any unmatched raw `message`. A Core Location exception containing `kCLErrorDomain` is unmatched and is therefore shown verbatim.
- **[ALREADY CORRECT]** Permission denial is a non-throwing branch with purpose-built user copy; the web exception branch has stable `LOCATE_FAILED_MSG` plus Retry. The leak is the native exception branch only.
- **[CONFIRMED FROM SOURCE] Smallest safe pattern:** `native exception -> location-specific classifier -> internal diagnostic logging -> stable human-facing location copy`. Keep `errorMessage()` generic for non-location callers, preserve permission handling and timeout architecture, and do not put native domain/code text into visible copy.
- **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** On real iOS, trigger the previously observed failure class and prove: no `kCLErrorDomain`/native code is visible or announced; a stable recovery sentence appears; a subsequent successful location attempt updates the report/map; diagnostic detail remains available internally.

## Account Deletion Receipt

- **[CONFIRMED FROM SOURCE] Written:** `deleteAccount(userId)` first calls `getOrCreateAccountDeletionReceipt(userId)`. A new 256-bit secret and operation ID are written to native SecureStore and indexed before `delete-account` is invoked. Concurrent same-subject calls reuse one pending/existing receipt.
- **[CONFIRMED FROM SOURCE] Checked:** Profile loads the receipt for the signed-in subject on mount and on explicit “Check deletion status.” SignIn loads the first recoverable native receipt on mount and on explicit status retry.
- **[CONFIRMED FROM SOURCE] Intentionally retained:** lost initial request response, rejected/unrecognized acknowledgement, temporary `account-deletion-status` failure, post-request sign-out failure, and all nonterminal statuses. A server acknowledgement signs out locally but explicitly retains the receipt for signed-out completion recovery.
- **[CONFIRMED FROM SOURCE] Cleared:** only `clearAccountDeletionReceipt()` removes secure records. Product UI calls it from SignIn after explicit “Dismiss confirmation” for `COMPLETE` or explicit “Dismiss unavailable receipt.” Clearing one operation preserves other indexed receipts.
- **[CONFIRMED FROM SOURCE] Unavailable status meaning:** a receipt exists, but `getAccountDeletionStatus()` threw because the function invocation errored, returned no data, or returned an unrecognized status. Source does not distinguish transient outage, missing endpoint, invalid/expired capability, or unexpected response shape in UI state.
- **[ALREADY CORRECT] Recovery versus stale state:** the observed retained receipt/unavailable card is recovery semantics by design, not enough evidence of a stale-state defect. Profile intentionally offers Retry and does not discard an ambiguous destructive-operation capability.
- **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** Change lifecycle semantics only if real runtime evidence proves a terminal invalid/expired receipt state that can never recover and can be distinguished safely from outage/ambiguity. Do not clear on generic status failure.
- **[POSSIBLE — LOW CONFIDENCE]** Signed-in Profile has no explicit receipt-dismiss action, unlike SignIn. That may be intentionally conservative because the original request can be retried with the same receipt. Escalate rather than adding dismissal if Prompt B cannot prove a safe terminal condition.

## Regression-Test Map

| Test ID | Surface | Failure it prevents | Source file / test file |
|---|---|---|---|
| B-T-001 | Shared flag data access | One unavailable optional provenance column taking down every flag reader; proves exact compatibility/fallback behavior and normalized row shape | `src/lib/flags.ts` / `src/lib/__tests__/flags.supabase.test.ts` |
| B-T-002 | Shared flag data access | Compatibility handling swallowing network, RLS, or unrelated PostgREST errors; only the proven missing-column shape may take the compatibility path | `src/lib/flags.ts` / `src/lib/__tests__/flags.supabase.test.ts` |
| B-T-003 | FlagsProvider | Failed first read -> user Retry -> successful read must rerun network, clear `error`, clear offline markers, and publish fresh rows | `src/lib/flagsStore.tsx` / `src/lib/__tests__/flagsStoreSwr.test.tsx` |
| B-T-004 | Home/Tasks/Map failure voice | `FEATURE_UNAVAILABLE` composing as `yet.. Tap to retry.`; assert exactly one sentence boundary | `src/lib/copy.ts` / `src/screens/__tests__/bp13FailureVoice.test.ts` |
| B-T-005 | Profile | Missing optional avatar provenance must not take down base profile/status data once the proven compatibility path exists; unrelated errors still surface | `src/screens/ProfileScreen.tsx` (or extracted profile helper) / new focused Profile data-loader test |
| B-T-006 | My Reports | First load failure then Retry success clears the local banner and renders returned rows | `src/components/MyReportsModal.tsx` / `src/components/__tests__/MyReportsModal.test.tsx` |
| B-T-007 | Recent Activity | First full-flag read failure then Retry success clears local error; watched-storage fallback remains nonfatal | `src/components/ActivityFeedModal.tsx` / new `src/components/__tests__/ActivityFeedModal.test.tsx` |
| B-T-008 | Native location | `kCLErrorDomain`/native exception maps to stable copy while diagnostic detail is logged internally | `src/lib/location.ts`, `src/screens/MapScreen.tsx` / `src/lib/__tests__/location.test.ts` plus `src/screens/__tests__/MapScreenLocateFailure.test.ts` |
| B-T-009 | Account deletion recovery | Status outage retains receipt; later recognized status clears unavailable UI state without deleting the receipt | `src/lib/accountDeletionReceipt.ts`, `src/screens/ProfileScreen.tsx`, `src/screens/SignInScreen.tsx` / focused receipt-status UI test plus `src/lib/__tests__/accountDeletionReceipt.test.ts` |
| B-T-010 | Account deletion isolation | Explicit terminal/unavailable dismissal deletes only the chosen receipt and never another account's receipt | `src/lib/accountDeletionReceipt.ts`, `src/screens/SignInScreen.tsx` / `src/lib/__tests__/accountDeletionReceipt.test.ts` |

- **[CONFIRMED FROM SOURCE]** Existing tests already cover error-code mapping, generic flag helper propagation, store offline recovery, timeout Retry, and receipt isolation. The tests above target the uncovered cross-surface contract and recovery transitions rather than duplicating six happy-path screen tests.

## Prompt B Implementation Contract

### B-STEP-01

- **OBJECTIVE:** Capture the exact real-iOS `/rest/v1/flags` failure, revalidate against the Prompt-B base, then repair the shared full-flag read contract once so Home, Tasks, Map/Nearby, My Reports, Recent Activity, and Admin flag reads recover together.
- **FILES LIKELY TO CHANGE:** `src/lib/flags.ts`; possibly a small dedicated flag-projection helper; `src/lib/__tests__/flags.supabase.test.ts`.
- **CHANGE TYPE:** Shared data-access compatibility/projection alignment, narrowly gated to the proven missing-column shape.
- **REGRESSION TEST:** B-T-001, B-T-002.
- **REAL-IOS PROOF:** Record pre-fix exact error payload; after fix, load Home, Tasks, Map/Nearby, My Reports, and Recent Activity with correct rows/photos and no feature-unavailable error.
- **BLAST RADIUS:** Every full flag reader and canonical/legacy photo display.
- **DO NOT TOUCH:** Writes, uploads, migrations, RLS, moderation actions, account deletion, Sheet gestures, or production schema.

### B-STEP-02

- **OBJECTIVE:** Capture the exact Profile `/rest/v1/users` failure, then align only the base profile read with the proven runtime avatar-provenance contract.
- **FILES LIKELY TO CHANGE:** `src/screens/ProfileScreen.tsx`; preferably an extracted profile reader if needed for focused testing; `src/types/database.ts` only if runtime shape proves the type wrong; new focused test.
- **CHANGE TYPE:** Narrow profile read compatibility; preserve status counts and optional point-event degradation.
- **REGRESSION TEST:** B-T-005.
- **REAL-IOS PROOF:** Profile identity, avatar, points, report counts, and pull-to-refresh load; retry after one induced transient failure succeeds.
- **BLAST RADIUS:** Signed-in Profile header/data only.
- **DO NOT TOUCH:** Auth/session architecture, avatar upload/write RPCs, points rules, account-deletion lifecycle, or Supabase schema.

### B-STEP-03

- **OBJECTIVE:** After data reads recover, make shared failure presentation truthful: one punctuation boundary, explicit retry transition, success-cleared shared error, and handled retry promises.
- **FILES LIKELY TO CHANGE:** `src/lib/copy.ts`, `src/lib/flagsStore.tsx`, `src/screens/HomeScreen.tsx`; inspect Tasks/Map wiring but change only if acceptance proves a gap.
- **CHANGE TYPE:** Error-state/copy hardening, not a new data architecture.
- **REGRESSION TEST:** B-T-003, B-T-004, B-T-006, B-T-007.
- **REAL-IOS PROOF:** Force one transient flag read failure; Retry visibly enters loading, reissues the request, clears the banner on success, stays cleared through navigation/theme changes, and never renders `yet..`.
- **BLAST RADIUS:** Shared read-error UI on Home/Tasks/Map plus modal recovery assertions.
- **DO NOT TOUCH:** `LiveStatusRegion` architecture unless runtime proves it is the actual settled-error renderer; do not add six independent screen error stores.

### B-STEP-04

- **OBJECTIVE:** Put a location-specific presentation boundary around native Core Location exceptions while retaining diagnostic evidence internally.
- **FILES LIKELY TO CHANGE:** `src/lib/location.ts`, `src/screens/MapScreen.tsx`, `src/lib/__tests__/location.test.ts`, `src/screens/__tests__/MapScreenLocateFailure.test.ts`.
- **CHANGE TYPE:** Exception normalization and internal logging; stable native user copy.
- **REGRESSION TEST:** B-T-008.
- **REAL-IOS PROOF:** Reproduce the native failure from Map and the Report sheet; visible/announced copy contains no native domain text; Retry can later acquire a location.
- **BLAST RADIUS:** Native location exception presentation only.
- **DO NOT TOUCH:** Permission prompts, privacy gates, GPS accuracy/timeouts, map camera behavior, manual pin placement, or web locate flow.

### B-STEP-05

- **OBJECTIVE:** Preserve account-deletion recovery semantics and pin them with focused status-outage/recovery tests; change product lifecycle only if runtime proves a distinct terminal invalid-receipt state.
- **FILES LIKELY TO CHANGE:** Tests around `src/lib/accountDeletionReceipt.ts`, `src/screens/ProfileScreen.tsx`, and `src/screens/SignInScreen.tsx`; no product file expected without escalation evidence.
- **CHANGE TYPE:** Verification/regression hardening; conditional product change only after Sol Max escalation.
- **REGRESSION TEST:** B-T-009, B-T-010.
- **REAL-IOS PROOF:** A temporary unavailable status keeps the receipt and recovers on Retry; COMPLETE remains dismissible; explicit dismissal removes only the selected receipt.
- **BLAST RADIUS:** Destructive-operation recovery capability and signed-in/signed-out status UI.
- **DO NOT TOUCH:** Receipt-before-request ordering, secure native storage, multi-operation isolation, post-acknowledgement sign-out ordering, or generic-failure retention.

## Sol Max Escalation Triggers

1. **[STRONG HYPOTHESIS — RUNTIME PROOF REQUIRED]** Stop if the exact runtime schema/cache and captured PostgREST error contradict B-RC-001 or B-RC-002.
2. **[CONFIRMED FROM SOURCE]** Stop if required provenance columns/functions are absent at runtime and the repair would require a production DB migration, schema-cache operation, deploy, or other backend mutation.
3. **[POSSIBLE — LOW CONFIDENCE]** Stop if the exact failing request returns HTTP 200 with an unexpected data/body shape and the client-side decode/error origin is unclear after one focused trace.
4. **[POSSIBLE — LOW CONFIDENCE]** Stop if authenticated subject/role or RLS behavior differs across the same flag query on Home, Profile, and Admin, indicating an auth/session contradiction rather than a projection failure.
5. **[CONFIRMED FROM SOURCE]** Stop if the proposed compatibility read would hide canonical-only photos/avatars, weaken provenance, or require changes to upload/write/deletion contracts.
6. **[POSSIBLE — LOW CONFIDENCE]** Stop if clearing/scoping the settled flag error requires replacing the shared provider or app-root status architecture rather than a narrow state transition.

## Prompt B Real-iOS Acceptance Matrix

| Check | Acceptance |
|---|---|
| B-IOS-01 | Prompt-B base is compared against this audited SHA; every changed relevant projection/state path is revalidated before editing. |
| B-IOS-02 | Exact pre-fix `flags` and `users` request URLs/projections plus response status/body are captured and correlated; unrelated HTTP 200 traffic is excluded. |
| B-IOS-03 | Home loads barriers; a forced transient failure shows recovery UI and Retry returns to fresh data. |
| B-IOS-04 | Tasks primary open/verified list loads; pull-to-refresh and banner Retry reissue and recover. |
| B-IOS-05 | Map markers and Nearby list render from the same provider data; Nearby sort behavior reflects location availability. |
| B-IOS-06 | Profile base identity/avatar/points/status counts load and recover after Retry without changing auth session. |
| B-IOS-07 | My Reports loads user-owned rows and clears its local error after Retry success. |
| B-IOS-08 | Recent Activity loads rows and watched decoration; local storage failure remains nonfatal. |
| B-IOS-09 | Settled feature-unavailable banner does not persist after provider success, reappear on unrelated Admin success, or render `yet..`; navigation/theme/app relaunch remain clean. |
| B-IOS-10 | Native Report “Use my location” failure exposes stable human copy, no `kCLErrorDomain`; subsequent retry can succeed. |
| B-IOS-11 | Account-deletion unavailable status retains its receipt and recovers on a later successful status check. |
| B-IOS-12 | COMPLETE/unavailable receipt dismissal is explicit and removes only the chosen receipt; no deletion request is duplicated. |

## PROMPT B INGEST BLOCK

```text
PROMPT B INPUT

ROOT CAUSES:
B-RC-001 — shared full-flags projection expects provenance columns absent from the audited managed schema; exact runtime error/schema proof required.
B-RC-002 — Profile users projection expects avatar_object_key absent from the audited managed schema; exact runtime proof required.
B-RC-003 — provider error persistence + sentence joining explain cross-screen red state and `yet..`; not the data failure.
B-RC-004 — native location catch leaks unmatched Core Location text through generic errorMessage.

IMPLEMENT:
B-STEP-01 — prove and repair the shared flag read contract once.
B-STEP-02 — prove and repair only the Profile base read contract.
B-STEP-03 — harden shared retry/error clearing and punctuation after reads work.
B-STEP-04 — add location-specific exception normalization/logging.
B-STEP-05 — preserve deletion receipts; add recovery tests; change lifecycle only after escalation evidence.

TEST:
B-T-001, B-T-002, B-T-003, B-T-004, B-T-005, B-T-006, B-T-007, B-T-008, B-T-009, B-T-010

REAL IOS:
B-IOS-01 through B-IOS-12. Highest priority: exact request/response capture, shared flag recovery, Profile recovery, banner clearing, location copy, receipt retention.

SOL MAX ESCALATE IF:
Runtime schema contradicts the captured error; backend mutation is required; exact HTTP 200 body shape is unexpectedly failing; auth/RLS conflicts across screens; compatibility risks canonical photo/avatar provenance; shared error fix requires architecture redesign.

PRESERVE / DO NOT TOUCH:
Sheet-scroll work; migrations/backend/Supabase/production; writes/uploads/RLS; auth architecture; canonical provenance; account-deletion receipt-before-request and retention; permission/privacy gates; unrelated UI.

SOURCE STALENESS RULE:

"This report audited SHA 2762a5447600e8de55be912ccb26e95456484945.

Prompt B begins from a newer independently accepted candidate.

Before editing, compare each relevant file and dependency with the exact Prompt-B base.

Revalidate changed findings.

Do not blindly implement stale recommendations."
```

## FUTURE AGENT RETRIEVAL

```bash
git fetch origin
git show origin/codex/solfast-prompt-b-root-cause-prep-20260830:qa-reports/2026-08-30_SolFast_PromptB_RootCause_Prep.md
```
