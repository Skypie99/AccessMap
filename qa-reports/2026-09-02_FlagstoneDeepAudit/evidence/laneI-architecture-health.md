# Lane I — Architecture health (source-level, CURRENT_MAIN)

**Scope:** `/Users/skypie/AccessMap-deep-audit-20260902` (worktree), locked at `origin/main` SHA `70b52a30` per task brief. **NOTE:** `git rev-parse HEAD` in this worktree actually resolves to `019a0a86` (2026-09-02 17:03:08 -0700), not `70b52a30`. This discrepancy is recorded as a coverage-gap item below; all findings in this document are against the checked-out tree as it exists on disk, whatever its true SHA is. Comparisons against the submitted iOS Build 33 source (`f5594171`) use `git show f5594171:<path>` / `git diff --stat origin/main f5594171 -- src` without checking out that commit.

Status: **COMPLETE.** All 11 scoped sections plus Candidate findings and Coverage gaps are written below.

---

## Metrics table

| Metric | Value | Command used |
|---|---|---|
| Total `.ts`/`.tsx` files (src/ + App.tsx) | 417 | `find src App.tsx -name "*.ts" -o -name "*.tsx" \| wc -l` |
| Non-test `.ts`/`.tsx` files | 177 | as above, `grep -v "__tests__" \| grep -v "\.test\."` |
| Test `.ts`/`.tsx` files | 240 | as above, `grep -E "__tests__\|\.test\."` |
| Total lines, all ts/tsx (src+App.tsx, incl. tests) | 107,220 | `find src App.tsx -name "*.ts" -o -name "*.tsx" \| xargs wc -l` |
| Total lines, non-test ts/tsx only | 57,843 | same, filtered to exclude `__tests__`/`.test.` |
| App.tsx lines | 270 | `wc -l App.tsx` |
| `: any` occurrences (src+App.tsx, all files) | 72 | `grep -rn ": any" src App.tsx --include="*.ts" --include="*.tsx" \| wc -l` |
| `: any` occurrences (non-test files only) | 11 | same + `grep -v "__tests__" \| grep -v "\.test\."` |
| `as any` occurrences (all files) | 36 | `grep -rn "as any" src App.tsx --include="*.ts" --include="*.tsx" \| wc -l` |
| `as any` occurrences (non-test files only) | 9 | same, filtered |
| `as unknown as` occurrences (all files) | 91 | `grep -rn "as unknown as" src App.tsx ...` |
| `as unknown as` occurrences (non-test files only) | 5 | same, filtered |
| `@ts-ignore` occurrences | 0 | `grep -rn "@ts-ignore" src App.tsx ...` |
| `@ts-expect-error` occurrences | 1 | `grep -rn "@ts-expect-error" src App.tsx ...` (test file, documented intentional-shape test) |
| `eslint-disable*` occurrences (all files) | 48 | `grep -rn "eslint-disable" src App.tsx ...` |
| `eslint-disable*` occurrences (non-test files only) | 23 | same, filtered |
| Risky non-null `!` assertions (heuristic, non-test files) | 0 | `grep -rnE '[a-zA-Z0-9_]!(\.\|;\|\)\|,\|\])' src App.tsx --include="*.ts" --include="*.tsx" \| grep -v "__tests__" \| grep -v "\.test\."` |
| Risky non-null `!` assertions (heuristic, all files incl. tests) | 71 | same, unfiltered |
| TODO markers (src+App.tsx) | 4 | `grep -rn "TODO" src App.tsx --include="*.ts" --include="*.tsx" \| grep -v "__tests__\|\.test\."` |
| FIXME / HACK / XXX / TEMP markers | 0 each | same pattern per token |

*(Additional metrics for sections 4–11 appended below as each section was completed; see each section's own command annotations.)*

---

## Hotspot files

Command: `find src App.tsx -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn`, then filtered to non-test production files > 800 lines.

| File | Lines | Note |
|---|---:|---|
| `src/screens/MapScreen.tsx` | 4184 | Confirmed known hotspot. Largest file in repo; map rendering, filters, callouts, clustering, sheet presentation all appear co-located (see State ownership section). |
| `src/components/FlagDetailModal.tsx` | 3121 | Confirmed known hotspot. Single modal component carrying detail view, comments, status history, reopen flow, photo gallery triggers. |
| `src/screens/ProfileScreen.tsx` | 2881 | Confirmed known hotspot. |
| `src/screens/TasksScreen.tsx` | 2837 | Confirmed known hotspot. |
| `src/screens/ReportFlagModal.tsx` | 2278 | Confirmed known hotspot. Report submission flow (multi-step form + photo capture + validation) in one file. |
| `src/lib/flags.ts` | 1810 | Confirmed known hotspot. Core data-access module for flags (CRUD, photo upload, status transitions) — see TS-escape and state-ownership notes below. |
| `src/components/PlatformMap.web.tsx` | 1133 | Web Leaflet map implementation; parallel to `PlatformMap.tsx` (native) — see "Duplicated constants" and cross-platform notes. |
| `src/screens/SettingsScreen.tsx` | 1091 | Not previously flagged; crosses 800-line boundary. |
| `src/lib/copy.ts` | 987 | Centralized copy strings module — large by design (see Duplicated constants section), not necessarily a code-health problem. |
| `src/components/OnboardingCards.tsx` | 978 | Not previously flagged; crosses 800-line boundary. |
| `src/screens/HomeScreen.tsx` | 946 | Not previously flagged; crosses 800-line boundary. |
| `src/components/PlatformMap.tsx` | 815 | Native map implementation counterpart to `PlatformMap.web.tsx`. |

Files just under the 800-line bar worth watching: `src/theme.ts` (792), `src/components/FilterPresetsModal.tsx` (751), `src/lib/flagsStore.tsx` (692, the central flags state store — see State ownership), `src/screens/SignInScreen.tsx` (690), `src/components/MyReportsModal.tsx` (687).

Test-file line counts were excluded from the hotspot list per task scope (source hotspots only) but for context the largest test files are `src/screens/__tests__/ReportFlagModal.test.tsx` (1904 lines) and `src/lib/__tests__/flags.test.ts` (1030 lines) — proportionate to the size of the modules they cover.

---

## TS escapes by file

**Headline finding: TypeScript escape hatches are concentrated almost entirely in test files, not production code.** Of 72 `: any`, 36 `as any`, and 91 `as unknown as` occurrences repo-wide, only 11 + 9 + 5 = 25 are in non-test source. Non-null assertions (`x!`) are **zero** in non-test code (71 uses, all in tests). This is a positive type-discipline signal, not a defect. A caveat: several raw grep hits below are false positives from prose inside comments/JSDoc that happen to contain the literal substrings "any" or "as any" — flagged inline.

### Non-test `: any` (11) — `grep -rn ": any" src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."`

| File:line | Snippet | Real escape? |
|---|---|---|
| `PlatformMap.tsx:348,398` | `mapRef={(r: any) =>`, `renderCluster={(cluster: any) =>` | Yes — untyped ref/cluster render props (react-native-map-clustering has weak types) |
| `hooks/useComments.ts:172` | `(payload: any) => {` | Yes — Supabase realtime payload callback |
| `lib/flags.ts:295,309,321` | `reader.onload/onerror`, `img.onerror` `(_event: any) =>` | Yes — web `FileReader`/`Image` event shims (×3) |
| `components/ReportContentModal.tsx:406` | "...deliberately: any" | **False positive** — prose in a comment |
| `lib/errors.ts:6` | `catch (e: any) { Alert.alert(...)` | Yes, but inside a JSDoc *example*, not live code |
| `lib/copy.ts:583`, `lib/postgrestErrors.ts:48` | "...House rule: any bulk", "...class: anything that isn't..." | **False positive** ×2 — prose in comments |

Net: **~7 genuine non-test `: any` escapes**, narrowly scoped to third-party callback/event boundaries.

### Non-test `as any` (9) — `grep -rn "as any" src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."`

| File:line | Snippet | Real escape? |
|---|---|---|
| `screens/AboutScreen.tsx:38` | `(Constants as any).nativeAppVersion ??` | Yes — `expo-constants` field not in its public type |
| `components/FlagDetailModal.tsx:1064` | comment describing a cast living elsewhere | **False positive** |
| `hooks/useComments.ts:164` | `'postgres_changes' as any,` | Yes — Supabase realtime channel event-name typing gap |
| `lib/comments.ts:168` | `await (supabase as any)` | Yes — bypasses Supabase client typing for one query — see CAND-I-05 |
| `lib/copy.ts:947` | "...same as any visible string." | **False positive** — prose |
| `lib/flags.ts:307,312,318,325` | `}) as any;` (×4) | Yes — same web-shim boundary as the `: any` cases above |

Net: **~6 genuine non-test `as any` escapes**, concentrated at platform/DOM/Supabase-untyped boundaries.

### Non-test `as unknown as` (5) — `grep -rn "as unknown as" src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."`

| File:line | Snippet |
|---|---|
| `src/navigation/RootNavigator.tsx:273` | `applySceneInert(ref.current as unknown as HTMLElement \| null, isFocused);` |
| `src/components/ui/ScreenStage.tsx:52` | `} as unknown as ViewStyle)` |
| `src/lib/analytics.ts:132` | `trackEvent(event, props as unknown as Record<string, string \| number \| boolean>);` |
| `src/lib/announce.ts:66` | `const info = AccessibilityInfo as unknown as {` |
| `src/lib/statusHistory.ts:57` | `const client = supabase as unknown as {` |

All 5 are genuine double-casts (the `as unknown as X` pattern exists specifically to defeat structural type-checking) at RN/web interop boundaries (DOM ref on native nav, style object shape, analytics prop bag, `AccessibilityInfo` untyped native method, Supabase client narrowing). Each is a candidate for a narrower local type instead of a full unknown-cast — see CAND-I-07.

### `@ts-ignore` / `@ts-expect-error`

Zero `@ts-ignore` anywhere. One `@ts-expect-error` total, in `src/lib/__tests__/statusHistory.test.ts:254`, explicitly documented inline (`// @ts-expect-error — user_id is intentionally absent from the shape.`) — this is a well-used, self-documenting instance in a test, not a code-health concern.

### `eslint-disable*` by file (non-test, 23 total)

| File | Count | Rules disabled |
|---|---:|---|
| `pushNotifications.ts` | 4 | `@typescript-eslint/no-require-imports` |
| `analytics.ts` | 4 | `no-console` |
| `flagsStore.tsx` | 3 | `no-console` |
| `flags.ts` | 3 | `@typescript-eslint/no-explicit-any` (paired with FileReader/Image shims) |
| `hooks/useComments.ts` | 2 | `@typescript-eslint/no-explicit-any` |
| `TasksScreen.tsx`, `MapScreen.tsx`, `LiveStatusRegion.tsx`, `FlashBanner.tsx` | 1 each | `react-hooks/exhaustive-deps` |
| `AboutScreen.tsx`, `comments.ts` | 1 each | `@typescript-eslint/no-explicit-any` |
| `haptics.ts` | 1 | `@typescript-eslint/no-require-imports` |

Every disable targets one of three categories: `require()` for conditionally-loaded native modules (push/haptics, standard Expo pattern), intentional `console.*` in dev-diagnostic paths, or the same explicit-`any` crossings inventoried above. **After manual review:** all four `react-hooks/exhaustive-deps` suppressions (`TasksScreen.tsx:336`, `MapScreen.tsx:1510`, `LiveStatusRegion.tsx:113`, `FlashBanner.tsx:116`) carry an explanatory comment stating *why* the omission is intentional (e.g. FlashBanner: "`rendered` is intentionally omitted: this should react to message / reduced-motion changes, not to its own mount toggle") — deliberate one-shot-effect patterns, downgraded from an initial suspicion to LOW/DEBT, worth a spot-check but not carried as a numbered candidate. `comments.ts:161-168`'s `(supabase as any)` cast carries its own tracked-residual comment ("The ONE cast TYPE-3 could not retire (2026-08-06)") — see CAND-I-05.

---

## TODO/FIXME list

Commands: `grep -rn "TODO" src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__\|\.test\."` and the same pattern for `FIXME`, `HACK`, `\bXXX\b`, `\bTEMP\b`.

| File:line | Text (≤12 words) |
|---|---|
| `src/screens/ResourcesScreen.tsx:9` | TODO(Sky): drop in the specific links you want to point at |
| `src/components/FlagDetailModal.tsx:1063` | TODO: once Dana's migration (flag_reopen_count + flag_reopen_log) lands |
| `src/lib/featureFlags.ts:9` | TODO: Replace with a real feature flag service (LaunchDarkly/Firebase) |
| `src/lib/pushNotifications.ts:223` | TODO(analytics): when a foreground notification-received listener is added |

`FIXME`, `HACK`, `XXX`, `TEMP`: **0 occurrences each**, non-test `src`/`App.tsx`. A remarkably small, attributed list for a 57,843-line non-test codebase — consistent with the disciplined, ticket-referenced commenting style seen throughout (State ownership section). None are load-bearing.

---

## Deprecated / risky APIs

### `newArchEnabled: false`

Confirmed in two places, consistent with each other: `app.json:15` (`"newArchEnabled": false`) and the prebuilt `ios/Podfile.properties.json` (`"newArchEnabled": "false"`). Command: `grep -n newArchEnabled app.json ios/Podfile.properties.json`.

Implications: SDK 54 / RN 0.81 ship New Architecture (Fabric + TurboModules) on by default for new projects; this app opted back into legacy Paper. None of the installed direct dependencies (`react-native-maps`, `react-native-svg`, `react-native-screens`, `react-native-gesture-handler`, `react-native-safe-area-context`, `@react-navigation/*`) are New-Architecture-only at their installed majors, so the flag isn't currently blocking anything — but it does mean the app is never exercised against Fabric, so any latent Paper-vs-Fabric behavioral difference surfaces for the first time whenever it's eventually flipped, with no incremental history to bisect against. Separately: a custom config plugin, `plugins/withFmtXcode26Fix.js`, works around an Xcode 26.6/clang/fmt-11.0.2 consteval build incompatibility by forcing the `fmt` CocoaPod to `gnu++17`. Unrelated to New Architecture directly, but evidence the project already carries custom native-build patches — raising the cost of any future Fabric migration (more moving parts to re-validate together).

### Expo SDK 54 package-version cross-check (expo-doctor's failing check)

**Correction to the task brief:** the brief stated "16/17 checks passed, failing only 'packages should match Expo SDK versions.'" The actual lead-run log sitting alongside this report, `qa-reports/2026-09-02_FlagstoneDeepAudit/logs/baseline-expo-doctor.log` (read as a peer evidence file, not executed by this lane), shows **16/18 checks, 2 failures**:
1. `Check Expo config (app.json/app.config.js) schema` — `"should NOT have additional property 'privacyPolicyUrl'"`. Confirmed: `app.json:5` has a top-level `"privacyPolicyUrl"` field the SDK 54 config schema doesn't recognize (it's likely meant for `ios.infoPlist`-adjacent or an EAS-specific location instead). Previously unreported by this lane's own static analysis — a genuine second finding, not just the task brief's single package-version item.
2. Package-version mismatches, per the live log (which checks against Expo's currently-published SDK 54 registry versions, not just this snapshot's `bundledNativeModules.json`):

| Package | Log-expected | Installed | Type |
|---|---|---|---|
| `typescript` | `~5.9.2` | `6.0.3` | **Major** version mismatch — `package.json` pins `~6.0.0`, ahead of the SDK's own TS target. |
| `expo` | `~54.0.37` | `54.0.35` | Patch — installed lags the current registry patch. |
| `expo-constants` | `~18.0.14` | `18.0.13` | Patch — same. |
| `jest-expo` | `~54.0.18` | `54.0.17` | Patch — same. |

This lane's own static comparison (`package.json` vs the local `node_modules/expo/bundledNativeModules.json` snapshot, run because live `expo-doctor` access wasn't available here) additionally flagged `expo-font`, `expo-status-bar`, and `react-native-web` range-floor staleness — none of which the live tool flags, likely because their installed versions satisfy the live tool's tolerance even though the static snapshot's declared range didn't literally match. The two methods agree on the shape of the problem (stale `package.json` floors, harmless in practice) but not the exact package list; the live log is authoritative.

**DEBT, not a DEFECT**, for the version-mismatch half — differences are all patch-level except `typescript`'s major bump (ahead of, not behind, the SDK's target — lower risk than being behind). The `app.json` schema error is a distinct, likely-trivial-to-fix DEBT item (move or rename the field) but was unknown to this lane until cross-referencing the log. See CAND-I-09 (updated) and CAND-I-13 (new).

### `react-leaflet` 5 + `legacy-peer-deps=true`

`.npmrc:1` sets `legacy-peer-deps=true` (confirmed: `cat .npmrc` → `legacy-peer-deps=true`). `react-leaflet@5.0.0` is installed (`node_modules/react-leaflet/package.json`) with `peerDependencies: {"leaflet":"^1.9.0","react":"^19.0.0","react-dom":"^19.0.0"}` — all three are satisfied cleanly by the installed `leaflet@1.9.4`, `react@19.1.0`, `react-dom@19.1.0`. So react-leaflet 5 itself is not the thing forcing `legacy-peer-deps`.

Every package's `peerDependencies` was checked programmatically — none declare a `react` range excluding 19.x. `npm ls --all --offline` (fully local, no network) reports **zero** `invalid`/`UNMET`/`extraneous` lines anywhere in the tree.

**Conclusion: no direct-dependency peer conflict found, and the locked tree is internally consistent.** `legacy-peer-deps=true` may be a defensive holdover from an earlier upgrade (React 18→19, or react-leaflet 4→5) no longer load-bearing — or it may mask a transitive conflict only a fresh `npm install` against the registry would surface (not run here — no network). Genuine coverage gap, not a confirmed finding; see Coverage gaps and CAND-I-08.

### RN/Expo deprecated-API grep sweep

Non-test `src` + `App.tsx`:
- `Clipboard` (RN core, deprecated), `ProgressBarAndroid`/`ProgressViewIOS`/`DatePickerIOS`/`TimePickerIOS`/`MaskedViewIOS` (removed from core years ago), `ViewPropTypes`/`prop-types`, `ImageStore`/`ImageEditor`: **0 real hits on all** (the 2 `Clipboard` matches are comments about web `navigator.clipboard` and a UI-copy note, not the deprecated RN export).
- `pointerEvents=` (still valid, but RN docs mark the top-level prop legacy in favor of `style.pointerEvents` for Fabric parity): 59 hits — not urgent while `newArchEnabled: false`, but each becomes a Fabric-migration touch point later.
- `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` (New Architecture consolidates these into `boxShadow`): 44 hits, same forward-compat note.
- `useNativeDriver: false`: 4 hits (not a deprecation, a perf smell — performance lane's territory, noted only).

No uses of RN-core `AsyncStorage` (the community `@react-native-async-storage/async-storage` package is used throughout, consistent with the SDK 54 bundled version).

---

## Navigation reachability

**Method note (methodology correction made mid-audit):** a first pass grepping only `from '@/screens/X'`/`from '@/components/X'` absolute-alias imports produced several false "zero mount" results. Re-run with a pattern also catching same-directory relative imports (`from './X'`) and dynamic imports (`import('./X')`, used for `React.lazy`) — `grep -rln "/<Name>'" src App.tsx | grep -v "__tests__\|\.test\." | grep -vE "/<Name>\.tsx$"` per surface — resolved every one to a real mount point. **Net result: no zero-mount (orphaned) surface found** among 19 `src/screens/` files or ~20 modal-shaped `src/components/` files checked.

### Route tree (`src/navigation/RootNavigator.tsx`)

`Tab.Navigator` (bottom tabs, `RootTabParamList`):

| Route | Component | Tab-bar visible? | Notes |
|---|---|---|---|
| `Home` | `HomeScreen` | Yes (1st) | `initialRouteName` default; editorial landing surface, own header. |
| `Tasks` | `TasksScreen` | Yes (2nd) | Badge = `computeTasksBadge(flags)`. |
| `Profile` | `ProfileScreen` | Yes (3rd) | |
| `FullMap` | `MapScreen` | Hidden (`tabBarButton:()=>null`) | Reached from Home ("Open full map"/"Report" pill), Tasks/Profile focus-flag links, and the `accessmap://flag/:flagId?` deep link (`src/navigation/linking.ts:34`). Params `focusFlag`/`ts`/`openReport` are all set by at least one caller (`TasksScreen.tsx:778`, `ProfileScreen.tsx:804/816/1455`, `HomeScreen.tsx:294/652/690/707`) and all four params (`focusFlag`, `ts`, `flagId`, `openReport`) are read inside `MapScreen.tsx` (confirmed at lines 1360-1629). `flagId` has no in-app caller — by design, it is deep-link-only, populated by React Navigation's own path-parsing per `linking.ts`'s `FullMap: 'flag/:flagId?'` config, not dead. |
| `Settings` | `SettingsScreenLazy` (`React.lazy`) | Hidden | Reached only from the hamburger drawer (`DrawerHost.onNavigate('Settings')`, `RootNavigator.tsx:568`). Warmed pre-emptively on drawer-open (`RootNavigator.tsx:527-531`). |
| `Admin` | `AdminScreenLazy` (`React.lazy`) | Hidden, and only *registered* when `isAdmin === true` (`RootNavigator.tsx:461`) | Reached from the drawer, gated twice: once by the conditional `<Tab.Screen>` registration, again inside `AdminScreen` itself per the code comment ("defense-in-depth"). Not verified independently in this pass — see Coverage gaps. |

### Shared-modal pool (`src/lib/sharedModalsContext.tsx`, hosted once by `SharedModalsHost` in `RootNavigator.tsx:481-506`)

`HelpModal`, `ChangelogModal`, `FeedbackModal`, `MyFeedbackModal`, `TermsScreen`, `PrivacyScreen` — six surfaces sharing one `open: SharedModalKey | null` slot so opening one implicitly closes another (matches historical one-modal-at-a-time behavior per the in-file comment). `TermsScreen`/`PrivacyScreen` are deliberately in this pool rather than mounted per-screen because their callers (`AboutScreen`, `SignInScreen`, the report sheet) are themselves modals, and native iOS refuses to present a new modal from a view controller already presenting one — documented in a detailed comment block at `RootNavigator.tsx:238-263` (also covers a real web z-index bug found "Run 2", 2026-08-19: DrawerHost must mount before SharedModalsHost so the shared-modal z-index always wins on react-native-web, which stacks every `<Modal>` at the same z-index and lets last-sibling win).

### Drawer sub-screens (`src/components/HamburgerDrawer.tsx`)

`ResourcesScreen`, `HowToHelpScreen`, `AboutScreen` — mounted directly inside `HamburgerDrawer` (lines 403-412), toggled by local `subScreen` state, not part of the tab navigator or the shared-modal pool. `AboutScreen` further mounts `TermsScreen`/`PrivacyScreen` via the shared pool (see `LegalSheets.tsx` below) and `SettingsScreen`.

### `LegalSheets.tsx` — shared trigger helper

`TermsScreen`/`PrivacyScreen` (the shared-pool pair above) are opened from 4 sites via a common helper: `src/screens/ReportFlagModal.tsx`, `src/screens/AboutScreen.tsx`, `src/components/ReportContentModal.tsx`, `src/components/FlagDetailModal.tsx` all import `useLegalSheets`/`LegalSheets` from `./LegalSheets` — a single hook wrapping `useSharedModals()` so each of those 4 surfaces gets a consistent "open Terms/Privacy" affordance without duplicating the open/close wiring.

### Per-screen local modals

Confirmed mount points (all reachable, all local `useState`-driven visibility unless noted):

| Modal/sub-surface | Mounted from |
|---|---|
| `AchievementsModal`, `ActivityFeedModal`, `LeaderboardScreen`, `MyReportsModal`, `MyWatchedModal`, `UpdateBanner`, `RecentlyViewedRow`, `ReportsBreakdownCard`, `GuestProfile`, `SignInScreen` (as a sheet) | `src/screens/ProfileScreen.tsx` |
| `AddressSearchModal`, `FilterPresetsModal`, `SavedPlacesModal`, `LegendModal`, `NearbyFlagsModal`, `ReportFlagModal` (`React.lazy`, `MapScreen.tsx:127`) | `src/screens/MapScreen.tsx` |
| `AddressSearchModal` (2nd mount site) | `src/screens/HomeScreen.tsx` |
| `PhotoLightboxModal` | `src/screens/TasksScreen.tsx` (standalone lightbox, separate implementation from `PhotoGallery`'s built-in one — see Duplicated constants / dead-code notes) |
| `FlagDetailModal` | `src/screens/ProfileScreen.tsx`, `src/screens/TasksScreen.tsx`, `src/screens/MapScreen.tsx` (3 independent mount sites — see State ownership) |
| `HiddenCommentsModal`, `NotificationPrefsModal`, `OnboardingModal` | `src/screens/SettingsScreen.tsx` |
| `NotificationPreferencesScreen` | `src/screens/SettingsScreen.tsx` only |
| `NotificationPrefsModal` (2nd mount site) | `src/screens/ProfileScreen.tsx`, deliberately a **separate, per-screen instance** rather than pooled (`ProfileScreen.tsx:62`: "`NotificationPrefsModal` stays mounted PER-SCREEN on Profile (not in ..."), documented intentionally. |
| `ReportContentModal`, `StatusHistoryModal` | `src/components/FlagDetailModal.tsx` |
| `OnboardingCards` | `App.tsx` (first-launch gate) and `src/screens/OnboardingModal.tsx` (re-viewable copy from Settings) |

**Naming-collision note:** `NotificationPreferencesScreen.tsx` and `NotificationPrefsModal.tsx` are two different features with near-identical names (confirmed via both header doc-comments, not name alone) — see CAND-I-06.

### Zero-mount / unreachable surfaces

**None found in `src/screens/` or the modal-shaped components inventoried above.** Every surface checked resolves to at least one real import site outside its own file and outside tests.

---

## Duplicated constants / copies

### Points values — `src/lib/points.ts` vs SQL vs `HelpModal.tsx`: one confirmed live discrepancy

`src/lib/points.ts:30-57` defines a `POINTS` constant with an explicit header comment naming itself "the single source of truth for any UI copy that states point values (the Help FAQ, the Tasks '+points' flash)" and documenting, per field, exactly which SQL trigger it mirrors (verified 2026-08-20 per the file's own changelog note). Cross-checking against the live SQL:

- `POINTS.reporter = { verify: 10, resolve: 15 }` and `POINTS.actor = { verify: 3, resolve: 7 }` — **match** `supabase/schema.sql:154-163` (`handle_flag_status_change()`) exactly.
- `POINTS.submitReport = 5`, `addPhoto = 3`, `addComment = 1`, `commentUpvoted = 2`, `streakBonus = 5` — **match** the corresponding triggers in `supabase/migrations/2026-05-30_trust_score_system.sql` (lines 119, 231, 256, 296, 354: `SET points = points + 5/3/1/2/5` respectively).
- `POINTS.reject = 0` with the in-code comment "Rejecting a report awards nothing" — **does NOT match live SQL.** `supabase/schema.sql:164-172` has a third, unmirrored branch in the same trigger: when an admin explicitly rejects a flag (`new.status = 'rejected' and auth.uid() in (select id from public.users where is_admin = true)`), it applies a **-20 point "spam penalty"**: `update public.users set points = greatest(0, points - 20) ... insert into public.point_events (..., 'flag_spam_penalty', -20, ...)`.

This is not just an internal-constant gap — it is user-facing. `src/components/HelpModal.tsx:53` renders the FAQ answer to "How do points work?" by interpolating `POINTS` fields, and its final sentence is a **hardcoded, not-derived-from-`POINTS`** claim: `"Rejecting a report awards no points."` A report that a signed-in user filed, then had an admin explicitly reject, silently costs that user 20 points — while the app's own Help screen tells them rejection is free. Command trail: `grep -n "reject" src/lib/points.ts`; `sed -n '138,175p' supabase/schema.sql`; `grep -n "POINTS\." src/components/HelpModal.tsx src/screens/TasksScreen.tsx`. See **CAND-I-01** (top-ranked finding).

Context, not exculpatory: `schema.sql` is elsewhere flagged as a periodically-stale snapshot (see Migration lineage below), but this specific function block is architecturally consistent with its verified verify/resolve branches directly above — no positive reason to doubt it reflects live behavior. HIGH confidence; DB-side confirmation via `pg_get_functiondef` would remove all doubt (not possible in this read-only audit — see Coverage gaps).

### Category / severity / status labels — correctly centralized (no duplication found)

Contrary to the initial hypothesis that these would be duplicated, all three label/color maps trace to exactly one definition site each, with every other file importing rather than re-declaring:

- `CATEGORY_LABELS`, `SEVERITY_LABELS`, `STATUS_LABELS`: all three defined once, at `src/lib/flags.ts:1558`, `:1620`, `:1644` respectively (`export const X: Record<...> = {...}`). Command: `grep -rnE "^\s*(const|export const)\s+(CATEGORY_LABELS|STATUS_LABELS|SEVERITY_LABELS)\s*[:=]" src` returns exactly these 3 lines, all in the same file — no shadow re-implementation anywhere else in `src/`.
- Severity **colors**: `src/theme.ts:745` (`export const severity = {...}`) is explicitly commented as "single source of truth for the 1→5 color ramp," and `src/lib/flags.ts:1609`'s `severityColor()` function **derives** from it (`return severityRamp[s]?.color ?? ...`, confirmed by reading the function body) rather than hardcoding its own hex values. Both `src/components/PlatformMap.tsx` and `src/components/PlatformMap.web.tsx` (the native/web map dual-implementation) import `severityColor`/`SEVERITY_LABELS`/`CATEGORY_LABELS`/`STATUS_LABELS` from `@/lib/flags` and `heatmapSeverity` from `@/theme` rather than re-declaring — confirmed by reading each file's import block (`PlatformMap.tsx:10-12`, `PlatformMap.web.tsx:15,18`).
- The one manual (non-compiler-enforced) invariant: `theme.ts:740`'s comment "Keep this aligned with `severityColor()`" is aspirational discipline, not an automated check — low residual risk since `severityColor()` derives rather than duplicates, but see CAND-I-12 (NOTE).

**Assessment: well-managed, not a defect.** The task-brief hypothesis was checked and did not hold for labels/colors — only the points-vs-SQL axis showed real drift.

### `src/lib/copy.ts` adoption

987 lines / 70 exported constants, imported by 19 files. Scoped to compliance/moderation-adjacent copy (report/block/hide, privacy hints, offline banner) rather than all UI text — most screen copy stays inline, normal at this app's size, not a finding.

### Raw hex color literals — top files (non-test, `grep -roE "#[0-9A-Fa-f]{3,8}\b"`)

433 total raw hex literal occurrences in non-test `src`+`App.tsx`. Top 10 files:

| File | Raw hex count | Assessment |
|---|---:|---|
| `src/theme.ts` | 150 | Expected — the token definition file itself. |
| `src/theme/ThemeContext.tsx` | 95 | Expected — light/dark palette resolution. |
| `src/components/PlatformMap.web.tsx` | 35 | Largest non-theme concentration — map styling often has legitimate one-offs (tile/attribution chrome), worth spot-checking. |
| `src/components/PlatformMap.tsx` | 21 | Same caveat, native counterpart. |
| `src/screens/MapScreen.tsx` | 20 | Proportionate to file size (4184 lines) but still a top absolute offender. |
| `src/screens/TasksScreen.tsx` | 15 | |
| `src/screens/SignInScreen.tsx` | 11 | |
| `src/screens/ReportFlagModal.tsx` | 10 | |
| `src/components/HeatmapLegend.tsx` | 10 | Plausibly legitimate — heatmap gradient stops are inherently literal (`heatmapSeverity` in `theme.ts` itself hardcodes hex per-stop by design). |
| `src/screens/ProfileScreen.tsx` | 8 | |

Not independently triaged hex-by-hex (433 occurrences); theme/map files account for over two-thirds and are largely expected. See Coverage gaps.

### Raw `fontSize: <number>` literals — top files (non-test, `grep -roE "fontSize:\s*[0-9]+"`)

Only **27** raw numeric `fontSize` literals in the entire non-test codebase, in just 6 files — strong adherence to the `font.size.*` token scale (`src/theme.ts:468`) overall:

| File | Raw `fontSize:` count |
|---|---:|
| `src/screens/MapScreen.tsx` | 13 |
| `src/components/PlatformMap.web.tsx` | 6 |
| `src/screens/ReportFlagModal.tsx` | 5 |
| `src/components/PlatformMap.tsx` | 1 |
| `src/components/PhotoGallery.tsx` | 1 |
| `src/components/FeedbackModal.tsx` | 1 |

Sampled MapScreen's 13 (e.g. lines 3662, 4051, 4059, 4110, 4150) — small UI chrome (chip text, FAB labels, filter-preset buttons) with values adjacent to but not matching `font.size.*` steps; ad hoc micro-tuning, not a systemic bypass. **Positive finding, not a defect.**

---

## State ownership observations

**Overall assessment, stated up front: this is the most rigorously-engineered area audited in this lane.** State code shows a consistent pattern — ship, find the exact race/staleness/leak bug in review or production, fix it, leave a comment naming the failure mode — evidenced by in-code ticket refs (`F22`, `F32`, `F37`, `F43`, `F53`, `F58`, `F64`, `SW-53`) each describing a historical bug in exactly the categories this section hunts for. Several initial hypotheses below were falsified on inspection; reported honestly either way.

### `flagsStore.tsx` — single shared store, correctly cleaned up

`src/lib/flagsStore.tsx` (692 lines): a Context provider (`FlagsProvider`/`useFlags()`) holding one `flags: FlagRow[]` array plus a derived `flagsMap` (`useMemo`, O(1) lookup, `:478-482`) as the shared source of truth across `MapScreen`/`TasksScreen`/`ProfileScreen`. Mutations exposed as `patchFlag(id, patch)`/`removeFlag(id)` (`:614-619`).

**Realtime subscription (`flagsStore.tsx:537-613`)**, a Supabase `postgres_changes` channel gated behind opt-in (`realtimeEnabled`):
- Verified cleanup: effect teardown calls `supabase.removeChannel(channel)`, guarded by a `mounted` flag so a post-unmount async re-fetch is a silent no-op.
- Documented race fix (`F32`, lines 531-536): a `realtimeTeardownRef` promise chain so a fast toggle-off/on doesn't `.subscribe()` onto a still-leaving channel — comment names the prior failure ("switch shows ON, zero live subscription").
- 3 named "safeguards": #1 viewport geofencing delegated to `MapScreen` via ref callback; #2 the opt-in gate; #3 fire-and-forget `logRealtimeEvent` observability.
- DELETE/merge/insert events handled with correct re-sorting and status-filter re-application (`:571-585`).

### `FlagDetailModal` — three independent local-state mount points, verified NOT a split-brain risk in the paths checked

`FlagDetailModal` is mounted independently by `MapScreen.tsx`/`TasksScreen.tsx`/`ProfileScreen.tsx`, each owning its own `selectedFlag: FlagRow | null` (e.g. `MapScreen.tsx:498`, comment: "Per-screen state, NOT in the shared-modals pool"), passed down as a `flag` prop. Inside the modal, `shownFlag` (`FlagDetailModal.tsx:279`) is a second local state re-synced via `useEffect(() => { if (flag) setShownFlag(flag); ... }, [flag])` (`:302-309`) — two more copies of the same row on top of the shared store, exactly the shape that produces stale-UI bugs if mishandled.

Traced every in-modal mutation path to check whether the displayed `shownFlag` can go stale relative to what the parent's `selectedFlag` / the shared store now holds:

| Action | What happens to `shownFlag` | What happens to the parent / shared store | Stale-display risk? |
|---|---|---|---|
| Verify / Resolve / Reject (`runStatusChange`, `FlagDetailModal.tsx:807-855`) | Not updated locally | `onChanged(updated, action, isOwn)` called, then **`onClose()` immediately** | None — sheet closes before staleness could be seen. MapScreen's `onChanged` handler (`handleDetailChanged`, `MapScreen.tsx:1748-1755`) calls `patchFlag(updated.id, ...)`, so the underlying list/map pin is correct on the *next* open. |
| Edit description/category/severity (`handleSaveEdit`, `FlagDetailModal.tsx:780-792`) | **`setShownFlag(updated)` called directly** (line ~789) | `onEdited?.(updated)` — comment: `"F58: propagate to the shared store/list"` | None — local state and shared store both updated in the same handler; modal stays open showing fresh data. |
| Reopen request, threshold met (`FlagDetailModal.tsx:1136-1143`) | Not updated locally | `onChanged(updated, 'reopen', isOwn)`, then **`onClose()`** | None — same close-on-success pattern as status change. |
| Reopen request, threshold not yet met | Not updated (correctly — the flag's own row hasn't changed) | Not called | None — no real state change to reflect. |
| Server rejects a stale status write (`FlagStatusConflictError`, `FlagDetailModal.tsx:843-850`) | Not updated | `onClose()` called with an explanatory `notify()` — comment: `"F64: don't strand the user on a stale snapshot with live buttons."` | None — explicitly hardened against exactly this. |

**Conclusion: not a live defect in the paths checked.** Correctness currently rests on *discipline* — every handler that changes the displayed flag must call `setShownFlag` or close the modal — not a structural guarantee (e.g. deriving `shownFlag` from `flagsMap.get(id)` with a local overlay would make the invariant unbreakable by construction). A future handler in this 3121-line file that forgets both safe exits would silently reintroduce the `F58`/`F64` bug class. DEBT, not a confirmed defect — see CAND-I-04.

### Optimistic updates — rollback checked at 2 representative call sites, both correct

`grep -rn "optimistic" src -i` (excluding tests) surfaces ~18 sites with explicit "Optimistic" comments. Spot-checked two: `src/hooks/useComments.ts:215-226` (`deleteComment`) removes locally then on failure `await fetch(); throw e;` — true server re-sync rollback. `src/components/FilterPresetsModal.tsx:220-229` (delete preset) snapshots `presets` before the optimistic update and restores it on failure (the `Alert.alert` used to report that failure is itself the separate, confirmed CAND-I-02 gap — the rollback logic is correct regardless).

One deliberately-non-rolled-back case reading as a reasonable risk call, not an oversight: `src/hooks/useNotificationPreferences.ts:135-149` persists a toggle to `AsyncStorage` fire-and-forget with an explicit "Fail-soft" comment (in-memory state already correct; disk re-read next mount; failure still `console.warn`ed). Low-stakes preference vs. the higher-stakes flows that do roll back — differentiation looks intentional.

### Listeners — all 5 non-test registration sites have matching cleanup

`grep -rn "\.addEventListener(\|\.addChangeListener(\|AccessibilityInfo\.addEventListener" src App.tsx` (excluding tests) finds exactly 5 sites, all verified to have a matching removal:

| Site | Cleanup |
|---|---|
| `src/lib/accessibility.ts:261` (`screenReaderChanged`) | `sub.remove()` in effect cleanup |
| `src/lib/accessibility.ts:304` (`reduceMotionChanged`) | `sub.remove()` in effect cleanup |
| `src/lib/accessibility.ts:538` (`reduceTransparencyChanged`) | `sub.remove()` in effect cleanup |
| `src/lib/geocode.ts:44` (fetch-abort passthrough) | `callerSignal?.removeEventListener('abort', onAbort)` in a `.finally()` |
| `App.tsx:125` (`Linking` 'url' event, L8 warm-deep-link capture) | `sub.remove()` in effect cleanup (verified in the full `App.tsx` read above) |

No listener-leak candidates found in production code.

---

## Dead code / unused deps

**Method (heuristic, explicitly labeled as such):** a Python script scanned non-test `.ts`/`.tsx` files under `src/` for top-level `export function|const|class|interface|type|enum <Name>` declarations (683 found), then for each ran `grep -rl -w <Name> src App.tsx`, flagging a result of only the declaring file as a candidate. Not type-aware — misses barrel re-exports, and flags prop-type interfaces TypeScript infers structurally without any explicit import as false positives (both effects visible below).

### Exports never imported elsewhere — 9 real candidates (after filtering false positives)

Raw scan: 156 names unused outside their file (tests excluded), plus 46 more type/interface names unused by explicit name even including tests. Re-running with tests **included** (correcting for intentionally test-only exports like `flagsStore.tsx`'s `__`-prefixed `__writeFlagsCache`/`__readFlagsCache`) collapses the 156 to **9 VALUE exports** (function/const) with zero references anywhere, including their own file beyond the declaration:

| Export | Location | Occurrences in own file | Verdict |
|---|---|---:|---|
| `TypeBlockContext` | `ui/TypeBlock.tsx:68` | 3 | False positive — used twice more locally, just needlessly `export`ed. |
| `READ_STILL_TRYING_MS`, `READ_CEILING_MS` | `flagsStore.tsx:31,37` | 2 each | False positive — used once more locally each. |
| `TILE_CACHE_VERSION`, `MAX_CACHE_SIZE_BYTES`, `TILE_CLEAR_GRACE_MS` | `tileCache.ts:23,24,110` | 3-4 each | False positive — used locally. |
| `identifyUser`, `resetUser` | `analytics.ts:139,146` | 1 each (declaration only) | Genuinely unused everywhere, but deliberately: under a header "User identity — intentionally not sent anywhere" (`:135-136`), body only `console.log`s in `__DEV__`. Documented privacy stub, not an oversight. |
| `reverseGeocode` | `geocode.ts:108` | 1 (declaration only) | **Genuinely unused, and NOT self-explanatory like the two above.** A complete, documented Nominatim `/reverse` function with no caller anywhere in `src/` — reads like scaffolding for a "show a street address" feature never wired up. See CAND-I-10. |

Net: only `reverseGeocode` is an unexplained dead-code candidate; the other 8 are heuristic false positives or self-documented stubs. The 46 zero-usage TYPE/INTERFACE names (e.g. `HeatmapLayerProps`, `CreateFlagInput`) are overwhelmingly Props/parameter shapes TypeScript consumes structurally with no import-by-name requirement — treated as false positives, not itemized, to avoid misrepresenting normal TS usage as a hygiene problem.

### Unused npm dependencies

Checked every `dependencies` entry for any import (incl. bare side-effect `import '<pkg>'`, which a first pass missed) anywhere in `src`/`App.tsx`:

| Package | Import hits | Verdict |
|---|---|---|
| `@expo/vector-icons` | 0 | **Real removal candidate.** The actual icon library throughout is `lucide-react-native` (50 files); looks like an un-pruned `create-expo-app` template default. See CAND-I-11. |
| `expo-dev-client`, `expo` | 0 each | Expected — native-linking/framework-level packages, not JS-import-level. "Possibly used by native config" — correct here. |
| `react-native-screens` | 0 direct (1 comment mention, `RootNavigator.tsx:257`) | Expected — a `@react-navigation` peer dependency used internally, never imported by the app directly. |
| `react-native-url-polyfill` | 1 (corrected) | False alarm from the first pass — `supabase.ts:1`: `import 'react-native-url-polyfill/auto';`, a side-effect import the `from`-only grep missed. |
| `react-dom`, `react-native-web` | 0 each | Expected — consumed by the web bundler/renderer entry point, not app-level imports. |

Caveat on `@expo/vector-icons`: a config plugin could reference icon font presence rather than JS import, so this is good evidence, not absolute proof — DEBT/candidate, not confirmed dead.

### Unused assets

`assets/` holds only 8 files (`find assets -type f | wc -l`). Cross-referenced each filename against `src/`, `App.tsx`, `app.json`: 4 are used (`app-icon.png`, `favicon.png`, `logo-mark.svg`, `noise-128.png`), 4 have zero references (`app-icon.svg`, `favicon.svg`, `logo-mark-mono.svg`, `logo-mark-white.svg`) — all `.svg` variants alongside their referenced `.png` counterparts, most likely **design-source originals kept for re-export** rather than orphaned runtime assets (RN can't load an SVG directly without a loader component, and `app.json` points at the `.png` builds). Normal, not flagged as a defect; low-stakes given the total count is 8.

---

## Environment + platform assumptions

### `process.env` / `EXPO_PUBLIC_*`

Exactly 2 environment variables are read anywhere in the app: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, read in `src/lib/supabase.ts:16-17` (URL also re-read in `remoteImageUrl.ts:83` for image-domain validation). **`APP_ENV` is not used anywhere** — the task brief asked about it; a repo-wide search found zero hits, noted as a negative result.

**Missing-.env behavior is a hard, loud failure by design — a positive finding.** `src/lib/supabase.ts:19-23` throws (`'Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY...'`) at module-load time rather than silently booting with an empty URL. `.env`/`.env.local` are correctly gitignored; `.env.example` documents the 2 required keys empty. This worktree has a real, populated (gitignored) `.env` — contents not reproduced here.

Tangential, outside this lane's primary scope: `supabase.ts` carries a dated comment ("IO-2, security audit 2026-07-31 — WEB SESSION INJECTION") documenting a `detectSessionInUrl`/implicit-flow vulnerability class and its fix. Not re-verified here (security lane's territory) — flagged so it isn't missed.

### Hard-coded URLs / domains

`grep -roE "https?://[a-zA-Z0-9.-]+" src App.tsx | grep -v __tests__` surfaces a small, legitimate set — no surprises:

| Domain | File(s) | Purpose |
|---|---|---|
| `flagstone.skypistudio.com` | `src/lib/shareFlag.ts` (×3) | Share-link base URL. Comment notes it was repointed from a `localhost:3000` placeholder on 2026-08-18 — historical, not current. |
| `skypistudio.com` | `src/lib/links.ts` (×3) | Privacy Policy / Accessibility Statement / Support URLs — matches `app.json`'s `privacyPolicyUrl`. Legitimately static (legal/compliance pages). |
| `nominatim.openstreetmap.org`, `operations.osmfoundation.org` | `src/lib/geocode.ts` | Geocoding API + usage-policy reference (comment). |
| `www.google.com` | `src/lib/directionsLink.ts` | Google Maps directions deep link. |
| `www.openstreetmap.org`, `carto.com` | `src/components/PlatformMap.web.tsx` | Map tile provider + attribution links (Leaflet/web map). |
| `github.com` | `src/moderation/blockedTerms.ts` | Comment reference, not a live call. |
| `evil-supabase.co.attacker.test` | `src/lib/remoteImageUrl.ts` | **Not a real domain** — an illustrative example inside a comment explaining a URL-prefix-matching bypass the domain-allowlist check is written to avoid. Evidence of security-conscious documentation, not a live reference. |

No environment-specific domain switching beyond the two Supabase env vars — all fixed, non-secret public URLs, appropriate for their purpose.

### `Platform.OS` branches

116 occurrences across non-test `src`/`App.tsx` (`grep -rn "Platform\.OS" src App.tsx | grep -v "__tests__\|\.test\." | wc -l`). Top files:

| File | Count |
|---|---:|
| `src/screens/MapScreen.tsx` | 11 |
| `src/components/OnboardingCards.tsx` | 11 |
| `src/lib/pushNotifications.ts` | 7 |
| `src/screens/ReportFlagModal.tsx` | 6 |
| `src/lib/accessibility.ts` | 6 |
| `src/screens/SignInScreen.tsx` | 4 |
| `src/components/StatusHistoryModal.tsx` | 4 |
| `src/navigation/RootNavigator.tsx` | 3 |
| `src/lib/supabase.ts` | 3 |
| `src/components/MyFeedbackModal.tsx` | 3 |

### CAND-I-02 detail: `Alert.alert` is a confirmed hard no-op on web, and 12 of 29 direct call sites are unguarded

Surfaced while investigating the `confirm()`/`notify()` helpers referenced above; belongs here as a `Platform.OS`-branching-completeness question. **Mechanism verified by reading the actual installed dependency**, `node_modules/react-native-web/src/exports/Alert/index.js` in full: `class Alert { static alert() {} } export default Alert;` — completely empty, no dialog, no console warning.

**The team has fixed this exact bug 4 times before, individually, not systemically:** `confirm.ts`'s `notify()` helper (tagged `F46 re-sweep`, comment: "a failed report/avatar/photo upload on web previously dead-ended with a spinner stop and zero feedback"); `SignInScreen.tsx:128-129`'s named `F48` incident; `confirm.ts`'s own comment referencing 2 more ("same trap that bit R8 + R11"). No lint rule stops a 5th.

**Full manual audit of all 29 non-test `Alert.alert(` sites** (each enclosing function read for a `Platform.OS === 'web'` guard):
- **13 sites / 6 files correctly guarded (not bugs):** `SignInScreen.tsx:134`; `ReportFlagModal.tsx:539,592` (592 tagged `F46`); `MapScreen.tsx:882,1299,1721` (all 3 — fully clean); `FlagDetailModal.tsx:576,582,605,932,1005` (5 of 6); `pushNotifications.ts:49`; `blockedContent.ts:66`.
- **12 sites / 6 files confirmed UNGUARDED** (no `Platform` check anywhere in file or function): `AdminScreen.tsx:156,177` (error alerts after admin actions; file has zero `Platform` references at all); `SettingsScreen.tsx:460,548,555` (export sign-in guard, success, failure); `FeedbackModal.tsx:176,182` (no-mail-app fallback, generic failure); `FilterPresetsModal.tsx:181,202,228` (save/rename/delete-preset failures; file has zero `Platform` references); `FlagDetailModal.tsx:1080` ("Description required" — **5 lines after** a correctly-guarded `notify()` call at `:1075` in the same function); `feedback.ts:125` (`openFeedbackComposer()`'s fallback, reachable from the web-reachable `AboutScreen`).
- **1 lower-confidence site:** `pushNotifications.ts:233` — the file branches on web elsewhere, so this specific alert may sit behind a web-unreachable path; not verified either way.

All 6 unguarded files are web-reachable in normal use — no platform gate excludes any of them in `RootNavigator.tsx`. See **CAND-I-02** (ranked #2).

### Feature flags / kill switches / `__DEV__` gates

**Feature flags:** `src/lib/featureFlags.ts` (76 lines), a `useSyncExternalStore`-based store, self-labeled as a stopgap ("Local implementation only... TODO: Replace with a real feature flag service"). One flag exists, `PUSH_NOTIF_TYPES_ENABLED` (default `false`), hiding a Settings row because "NOTHING in the push pipeline reads that key yet... Showing the UI would be a lie to the user (Sky Decision 2, Option B)" — a deliberate honesty-over-completeness product decision, not scaffolding. `setFlag()` is `__DEV__`-gated and cannot affect production.

**`__DEV__` gates:** 19 occurrences across 6 files (`analytics.ts`, `flags.ts`, `flagsStore.tsx`, `featureFlags.ts`, `GlassSurface.tsx`, `App.tsx`). Read every one — all 19 gate diagnostic output only (EXIF-strip verification, cache-hydration timing, analytics echo, a blur-pane budget warning) or the feature-flag dev guard above. **None gate a functional dev-vs-production difference** — no `if (__DEV__) { skip-the-real-check() }` anywhere. Positive finding.

---

## Migration lineage observations (main vs Build 33)

**A real, factual divergence — not a hypothesis.** Commands: `ls supabase/migrations/` (main) vs `git ls-tree -r --name-only f5594171 -- supabase` (Build 33, read without checkout per the read-only constraint).

### The two naming conventions

- **`origin/main`**: 47 files, `YYYY-MM-DD_description.sql` (date-only). Status carried inline via suffix: `_PROPOSED` (3 files), `_APPLIED` (3 files), 6 `drift_capture_*` files dated `2026-07-27` (one reconciliation batch), one `.sql.deprecated-option1-do-not-apply` sentinel. Flat directory, no `supabase/nonmanaged/`.
- **Build 33**: 86 files, `YYYYMMDDhhmmss_description.sql` — the standard format Supabase CLI's `migration new` generates natively (main's day-only scheme does not match actual CLI tooling output). Also has `supabase/nonmanaged/` with 5 subdirectories (`destructive-data/`, `live-out-of-band/`, `manual/`, `proposed/`, `rollback-recovery/`) holding files recognizably the same content main keeps inline via suffix — e.g. Build 33's `nonmanaged/proposed/2026-06-09_status_transition_guard_PROPOSED.sql` is identically named to a file living directly in main's flat `migrations/`.

**Content check, not just filenames:** one migration both lineages share, diffed by content (main's `2026-05-30_trust_score_system.sql` vs Build 33's `20260531202835_trust_score_system.sql`) — **byte-for-byte identical**, despite the date component differing by a day between naming schemes. For shared content, the divergence is organizational, not a silent SQL fork.

### Substantive content Build 33 has that main does not

Build 33's 86 vs main's 47 migrations reflects ~39 migrations of real additional backend work, not renamed duplicates:
- **Edge functions**: main has 3 (`delete-account`, `notify-flag-status`, `send-push-notification`); Build 33 has 7, adding an async account-deletion review/worker-queue (`account-deletion-review/status/worker`) and a dedicated `delete-flag` function main lacks entirely. Cross-checked: main's `deleteFlag()` (`flags.ts:1413`) does a direct RLS-gated table delete, not an edge-function call — consistent with the function genuinely not existing on main.
- A `mod1*`-prefixed content-moderation/admin-report-queue migration batch (5 files, `20260828*`) and a `promptb_media_key_read_contract` migration (`20260830130000_*`) — none present on main.
- `supabase/tests/`: Build 33 has a pgTAP suite (4 files); main has no `supabase/tests/` directory at all.
- Scale, for context (not deeply analyzed — likely another lane's territory): `git diff --stat origin/main f5594171 -- src` = 150 files / +14,080 / -3,553.

### `schema.sql` staleness — self-admitted, in the file itself, on both lineages

Both `schema.sql` files (main 484 lines, Build 33 489 — near-identical size, consistent with a periodically-refreshed snapshot rather than a living document) carry the same class of warning. Main's header (`schema.sql:1-19`) states, verbatim: **"DO NOT RE-RUN THIS FILE WHOLESALE AGAINST THE LIVE PROJECT (QA 2026-08-19)... Live has been hardened past this file by later migrations"**, and separately, dated 2026-06-07: **"Ten additional tables and several supporting functions are NOT yet represented here."** main's migrations directory extends to 2026-08-22 — roughly 10 weeks past that reconciliation date. This is the codebase admitting its own staleness, not an inference of this audit.

### The two-lineage problem, stated factually

`origin/main`'s `supabase/` directory is not a reliable stand-in for the backend Build 33 actually runs against — it is missing, at minimum, the account-deletion worker queue, `delete-flag`, the whole `mod1` moderation feature, the media-key migration, and `supabase/tests/`, none of which exist on main under any name. The naming-convention difference is a real, smaller process problem on top of that. Both `schema.sql` files agree the real source of truth for either lineage is `pg_dump` against the live project — unavailable to this read-only, no-network audit. See CAND-I-03 and Coverage gaps.

---

## Candidate findings

Ranked by user-visible risk first, then maintainability. EVIDENCE below is deliberately terse where the full snippet already appears in the topic section above — follow the section pointer for the complete quote/table.

### CAND-I-01: Help FAQ tells users rejection "awards no points"; the live trigger applies a -20 point penalty on admin rejection

SEVERITY_GUESS: HIGH · DEBT_OR_DEFECT: DEFECT · AFFECTED_STATE: CURRENT_MAIN (Build 33's `HelpModal.tsx`/trigger not independently re-checked) · CONFIDENCE: HIGH

CLAIM: The Help FAQ makes a factually false, falsifiable-by-the-user claim about the points system.
EVIDENCE: `src/components/HelpModal.tsx:53` ends "Rejecting a report awards no points." (hardcoded, not derived from `POINTS`). `supabase/schema.sql:164-172`'s `handle_flag_status_change()` applies `points = greatest(0, points - 20)` + a `flag_spam_penalty` point_event when an admin explicitly rejects a flag with a known reporter. `src/lib/points.ts:35-36` (`reject: 0`) mirrors the FAQ, not the SQL, despite the file's own header claiming to be "the single source of truth" for exactly this FAQ. Full quotes in "Duplicated constants / copies" above.
WHY_IT_MATTERS: Points are the app's core reputation currency; a user told rejection is free will see their own total silently drop by 20 with no in-app explanation — a direct, provable trust breach, not a cosmetic gap.
VERIFICATION_NEEDED: Confirm live trigger matches `schema.sql` (`pg_get_functiondef`, no DB access here); check whether Build 33 already fixed this independently; decide the product fix (disclose the penalty, and/or surface the `flag_spam_penalty` event as its own notification rather than a silent balance change).

---

### CAND-I-02: `Alert.alert` is a verified hard no-op on react-native-web; at least 12 of 29 call sites are unguarded

SEVERITY_GUESS: HIGH · DEBT_OR_DEFECT: DEFECT · AFFECTED_STATE: CURRENT_MAIN (Build 33 not independently re-checked) · CONFIDENCE: HIGH

CLAIM: On web, 12 confirmed call sites produce zero visible/audible feedback for errors, successes, and validation prompts.
EVIDENCE: `node_modules/react-native-web/src/exports/Alert/index.js` — `Alert.alert()` is a fully empty function, read from the installed dependency. Patched 4 times before, individually (`confirm.ts`'s `F46`-tagged `notify()`; `SignInScreen.tsx:128-129`'s `F48`; 2 more as "R8 + R11") — a recognized, recurring class. Full per-site table in "Environment + platform assumptions" above; sharpest evidence of inconsistency: `FlagDetailModal.tsx:1075` correctly uses `notify()`, the next validation branch 5 lines later (`:1080`, same function) doesn't.
WHY_IT_MATTERS: This app ships a real web build; every one of the 6 affected files is web-reachable in normal use (core tab/hidden-route screens, header-button modal, drawer-reachable composer). Data-export and preset-delete failures/successes are silent on web.
VERIFICATION_NEEDED: Live click-through on web (no browser tooling available in this audit); resolve the 1 lower-confidence site (`pushNotifications.ts:233`); consider a lint rule banning bare `Alert.alert(` outside `confirm.ts` to stop a 5th recurrence.

---

### CAND-I-03: `origin/main`'s `supabase/` backend is measurably behind the submitted Build 33's

SEVERITY_GUESS: HIGH (for audit validity) · DEBT_OR_DEFECT: RISK · AFFECTED_STATE: BOTH · CONFIDENCE: HIGH

CLAIM: main is missing entire backend features Build 33 ships: an async account-deletion review/worker queue (3 functions), a `delete-flag` edge function, the full `mod1*` moderation/admin-report-queue migration set, a media-key read-contract migration, and `supabase/tests/` — 86 Build-33 migrations vs main's 47, not explained by renaming.
EVIDENCE: Full detail in "Migration lineage observations" above — `supabase/functions/` has 3 (main) vs 7 (Build 33); a byte-identical content diff of one migration both lineages share confirms the gap is additive, not a silent fork; `git diff --stat origin/main f5594171 -- src` = 150 files / +14,080 / -3,553 for the wider tree.
WHY_IT_MATTERS: Any audit — this one or others' — that checks RLS/authorization/schema completeness against main alone will be wrong for anything in Build 33's ~39 additional migrations. This lane cannot vouch for the security posture of the account-deletion worker queue, `delete-flag`, or `mod1` — that source doesn't exist on main to review.
VERIFICATION_NEEDED: A dedicated read of Build 33's `mod1*` migrations and 4 new edge functions for RLS/authz correctness (not done here — existence/absence only was confirmed).

---

### CAND-I-04: `FlagDetailModal`'s local-state sync (`shownFlag`) is discipline-dependent, not structurally guaranteed

SEVERITY_GUESS: MEDIUM · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: HIGH

CLAIM: 3 screens each hold independent `selectedFlag` state under the modal's own `shownFlag` state (`FlagDetailModal.tsx:279`). Every current handler avoids staleness correctly (`setShownFlag()` directly, or `onClose()` before staleness is visible) — but nothing structurally prevents a future handler from doing neither.
EVIDENCE: Full trace table in "State ownership observations" above — `runStatusChange` (closes on success), `handleSaveEdit` (`:780-792`, calls `setShownFlag(updated)`, comment "F58: propagate to the shared store/list"), reopen flow (closes on threshold-met). Named historical tickets `F58`/`F64` confirm this exact bug class already happened once.
WHY_IT_MATTERS: 3121-line, actively-developed file; correctness currently rests on every contributor remembering an unwritten rule rather than a structural guarantee (e.g. deriving from `flagsMap.get(id)` with a local overlay).
VERIFICATION_NEEDED: None to confirm current state; this is a forward-looking design recommendation.

---

### CAND-I-05: `comments.ts` casts the entire `supabase` client to `any` for one insert — self-documented, tracked

SEVERITY_GUESS: LOW · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: HIGH

CLAIM: `src/lib/comments.ts:161-168` casts the whole typed client (not just the payload) to `any`, per a comment naming it "The ONE cast TYPE-3 could not retire (2026-08-06)" pending a live-column-default answer only Sky can confirm. Full quote in "TS escapes by file" above.
WHY_IT_MATTERS: Casting the whole client, not just `.insert()`'s payload type, means zero type checking on any method chained here — small blast radius, but a typo wouldn't be caught either.
VERIFICATION_NEEDED: Reading the live `flag_comments.user_id` column default (no DB access in this audit) would let this narrow to a precise local cast.

---

### CAND-I-06: `NotificationPreferencesScreen` and `NotificationPrefsModal` are two different features with near-identical names

SEVERITY_GUESS: LOW · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: HIGH

CLAIM: `NotificationPreferencesScreen.tsx` (OS push-category toggles) and `NotificationPrefsModal.tsx` (in-app "since your last visit" banner toggles) are unrelated features, confirmed by reading both header doc-comments in full — not a name-only guess.
WHY_IT_MATTERS: Pure maintainability/naming-collision risk for a future contributor (human or AI) grepping "notification pref." No functional overlap found.
VERIFICATION_NEEDED: None — a rename is a mechanical, low-risk fix whenever convenient.

---

### CAND-I-07: 5 `as unknown as` double-casts at RN/web interop boundaries (non-test code)

SEVERITY_GUESS: LOW · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: MEDIUM

CLAIM: `RootNavigator.tsx:273`, `ScreenStage.tsx:52`, `analytics.ts:132`, `announce.ts:66`, `statusHistory.ts:57` each fully defeat structural type-checking (full list/snippets in "TS escapes by file" above).
WHY_IT_MATTERS: Each sits at a genuine platform-typing gap, not sloppy typing generally (this codebase's TS-escape discipline is otherwise clean) — flagged because a double-cast has zero compiler safety net if the underlying shape changes.
VERIFICATION_NEEDED: None to confirm current behavior; each is a candidate for a purpose-built local interface instead of `unknown`, next time touched.

---

### CAND-I-08: `legacy-peer-deps=true` has no confirmed current conflict — likely vestigial, not provably so

SEVERITY_GUESS: LOW · DEBT_OR_DEFECT: RISK · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: MEDIUM

CLAIM: No direct dependency's `peerDependencies` excludes React 19/RN 0.81, and `npm ls --all --offline` shows zero unmet/invalid entries in the locked tree — but a fresh `npm install` against the registry (not run here, no network) could still surface a transitive conflict this flag was added for. Full detail in "Deprecated / risky APIs" above.
WHY_IT_MATTERS: If vestigial, harmless but masks future genuine conflicts; if load-bearing, removing it untested would break CI/fresh installs/EAS Build.
VERIFICATION_NEEDED: In a disposable environment, delete `node_modules`+lockfile, drop the `.npmrc` line, run `npm install` fresh.

---

### CAND-I-09: 4 packages lag Expo SDK 54's currently-published versions per the actual expo-doctor log (task brief undercounted: 2 failures, not 1)

SEVERITY_GUESS: NOTE · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: HIGH

CLAIM: `logs/baseline-expo-doctor.log` (the lead's actual run, cross-referenced by this lane) shows `typescript` a major version ahead of SDK 54's target (`6.0.3` installed vs `~5.9.2` expected) and `expo`/`expo-constants`/`jest-expo` a patch behind the live registry. This lane's own static-file method (package.json vs the local `bundledNativeModules.json` snapshot) additionally flagged `expo-font`/`expo-status-bar`/`react-native-web`, which the live tool does not — the live log is authoritative where they disagree.
WHY_IT_MATTERS: All patch-level differences are hygiene only; `typescript` being a major *ahead* (not behind) is lower-risk than a lag would be, but is exactly the kind of drift `npx expo install --fix` doesn't always catch for devDependencies. No evidence of a real shipping conflict.
VERIFICATION_NEEDED: None — confirmed by the lead's own log; this lane's role was to reconcile it with a from-source method.

---

### CAND-I-10: `reverseGeocode()` is fully implemented but has zero callers anywhere

SEVERITY_GUESS: NOTE · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: HIGH

CLAIM: `src/lib/geocode.ts:108-121`, a complete documented reverse-geocoding function, has no caller anywhere in `src/` including tests.
WHY_IT_MATTERS: Unlike `analytics.ts`'s `identifyUser`/`resetUser` (self-explained as intentionally-inert), this has no comment explaining the non-use — reads like a disconnected feature, worth a quick product question rather than silent accumulation.
VERIFICATION_NEEDED: Ask whether a caller was planned/removed.

---

### CAND-I-11: `@expo/vector-icons` appears to be an unused dependency, likely an un-pruned template default

SEVERITY_GUESS: NOTE · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: MEDIUM

CLAIM: Zero imports anywhere in `src`/`App.tsx`; the app's actual icon library throughout is `lucide-react-native` (50 files).
WHY_IT_MATTERS: Minor bundle-size hygiene only. MEDIUM not HIGH confidence because a config plugin could reference it by presence rather than import.
VERIFICATION_NEEDED: Remove and run a full build to confirm nothing breaks (not done here — no-install constraint).

---

### CAND-I-12: The severity-color cross-file invariant (`theme.ts` ↔ `flags.ts`) is comment-enforced only, no automated test

SEVERITY_GUESS: NOTE · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: HIGH

CLAIM: `theme.ts:740`'s "keep this aligned with `severityColor()`" comment is the only enforcement — though `severityColor()` already *derives* from `theme.ts` rather than duplicating it (confirmed by reading the function body), so current risk is low.
WHY_IT_MATTERS: `points.ts`'s own `SW-53` history is a first-hand cautionary tale of this exact risk category — but derivation (not duplication) is already the safer pattern, making this the lowest-urgency item in this list.
VERIFICATION_NEEDED: None to confirm current correctness; a snapshot test would only guard a future refactor.

---

### CAND-I-13: `app.json` fails Expo's config-schema validation — an unrecognized top-level `privacyPolicyUrl` field

SEVERITY_GUESS: LOW · DEBT_OR_DEFECT: DEBT · AFFECTED_STATE: CURRENT_MAIN · CONFIDENCE: HIGH

CLAIM: `expo-doctor`'s config-schema check fails with `"should NOT have additional property 'privacyPolicyUrl'"` — not caught by this lane's own grep-based sweep, only surfaced by cross-referencing `logs/baseline-expo-doctor.log`. `app.json:5` sets `"privacyPolicyUrl"` at the top level of the `expo` block, which Expo's schema doesn't recognize there.
WHY_IT_MATTERS: A schema-validation failure is a step closer to "something is actually misconfigured" than a version-hygiene warning — worth confirming whether this field does anything today before EAS Build/Submit enforce the schema more strictly.
VERIFICATION_NEEDED: Confirm whether any build/submit step reads this field; relocate or drop it, then re-run `expo-doctor`.

---

## Coverage gaps

What this pass could not verify, given the read-only / no-network / no-DB / no-checkout constraints:

- **Worktree SHA mismatch.** `git rev-parse HEAD` resolves to `019a0a86` (2026-09-02 17:03:08 -0700), not the `70b52a30` the task brief names as "CURRENT_MAIN." Not reconciled further — every finding above is against the tree as it exists on disk.
- **No live-database confirmation for any SQL claim.** CAND-I-01, CAND-I-05, and the `schema.sql`-staleness claims are read from source only, never cross-checked against `pg_get_functiondef`/`pg_dump` on the live project (no DB/MCP access permitted) — both source files self-disclose they aren't fully authoritative either.
- **Build 33 not independently re-checked for src-level findings.** Every candidate except CAND-I-03 (which is itself about the main/Build-33 gap) was verified against `origin/main` only; whether Build 33 already fixed any of them independently (113 commits is room for that) was not checked — only `supabase/` and one migration file got the `git show f5594171:<path>` treatment.
- **No live click-through / build / typecheck / lint run.** All findings are static-read evidence (grep, file reads, `git show`, `npm ls --offline`); `tsc`, `eslint`, `jest`, and any simulator/browser verification were out of scope. Several VERIFICATION_NEEDED items (CAND-I-02's web click-through, CAND-I-08's fresh install, CAND-I-11's build check) require one of these and are explicitly left open.
- **Raw hex/fontSize literals (433 + 27) were counted and top-filed only** — no file-by-file legitimate-vs-should-be-token judgment beyond the top-10 lists and spot checks.
- **Dead-code/dependency heuristics are text-match, not type-aware** — can't see barrel re-exports rebinding a name (none found, but not exhaustively ruled out).
- **Security-adjacent items flagged, not pursued**: the `IO-2` session-injection comment in `supabase.ts`, and RLS/authz posture of Build 33's `mod1*` migrations — other lanes' territory.
- **`pushNotifications.ts:233`** (CAND-I-02's one lower-confidence site) not fully resolved either way.
