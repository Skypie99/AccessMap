# Lane I — Architecture health (source-level, CURRENT_MAIN)

**Scope:** `/Users/skypie/AccessMap-deep-audit-20260902` (worktree), locked at `origin/main` SHA `70b52a30` per task brief. **NOTE:** `git rev-parse HEAD` in this worktree actually resolves to `019a0a86` (2026-09-02 17:03:08 -0700), not `70b52a30`. This discrepancy is recorded as a coverage-gap item below; all findings in this document are against the checked-out tree as it exists on disk, whatever its true SHA is. Comparisons against the submitted iOS Build 33 source (`f5594171`) use `git show f5594171:<path>` / `git diff --stat origin/main f5594171 -- src` without checking out that commit.

Status: **IN PROGRESS — being written incrementally.** If you are reading this after an interruption, sections below the last `## ` heading may be incomplete; treat the final section present as possibly partial.

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
| `src/components/PlatformMap.tsx:348` | `mapRef={(r: any) => {` | Yes — untyped ref callback |
| `src/components/PlatformMap.tsx:398` | `renderCluster={(cluster: any) => {` | Yes — untyped cluster render prop (react-native-map-clustering has weak types) |
| `src/hooks/useComments.ts:172` | `(payload: any) => {` | Yes — Supabase realtime payload callback |
| `src/lib/flags.ts:295,309,321` | `reader.onload = ((_event: any) => {`, `reader.onerror = ((_error: any) => {`, `img.onerror = ((_event: any) => {` | Yes — web `FileReader`/`Image` event shims (3 occurrences) |
| `src/components/ReportContentModal.tsx:406` | `no explanatory sentence above it, deliberately: any` | **False positive** — prose in a comment |
| `src/lib/errors.ts:6` | `catch (e: any) { Alert.alert(...)` | Yes, but inside a JSDoc *example* snippet, not live code |
| `src/lib/copy.ts:583` | `before the bulk unhide. House rule: any bulk` | **False positive** — prose in a comment |
| `src/lib/postgrestErrors.ts:48` | `body (the F38 class: anything that isn't migration-absent must throw so` | **False positive** — prose in a comment |

Net: **~7 genuine non-test `: any` escapes**, all narrowly scoped to third-party callback/event boundaries (map ref/cluster props, FileReader/Image DOM shims, Supabase realtime payload).

### Non-test `as any` (9) — `grep -rn "as any" src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."`

| File:line | Snippet | Real escape? |
|---|---|---|
| `src/screens/AboutScreen.tsx:38` | `(Constants as any).nativeAppVersion ??` | Yes — `expo-constants` field not in its public type |
| `src/components/FlagDetailModal.tsx:1064` | `for session-level dedup) is applied, replace the \`(shownFlag as any)\`` | **False positive** — this line is a comment *describing* a cast that lives elsewhere; verify the actual cast separately |
| `src/hooks/useComments.ts:164` | `'postgres_changes' as any,` | Yes — Supabase realtime channel event-name typing gap |
| `src/lib/comments.ts:168` | `const { data, error } = await (supabase as any)` | Yes — bypasses Supabase client typing entirely for a query |
| `src/lib/copy.ts:947` | `ratification, same as any visible string.` | **False positive** — prose in a comment |
| `src/lib/flags.ts:307,312,318,325` | `}) as any;` (×4, paired with the `: any` FileReader/Image shims above) | Yes — same web-shim boundary as above |

Net: **~6 genuine non-test `as any` escapes**, again concentrated at platform/DOM/Supabase-untyped boundaries. `src/lib/comments.ts:168` (casting the whole `supabase` client to `any` for one query) is the one worth a closer look — see CAND-I-02.

### Non-test `as unknown as` (5) — `grep -rn "as unknown as" src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."`

| File:line | Snippet |
|---|---|
| `src/navigation/RootNavigator.tsx:273` | `applySceneInert(ref.current as unknown as HTMLElement \| null, isFocused);` |
| `src/components/ui/ScreenStage.tsx:52` | `} as unknown as ViewStyle)` |
| `src/lib/analytics.ts:132` | `trackEvent(event, props as unknown as Record<string, string \| number \| boolean>);` |
| `src/lib/announce.ts:66` | `const info = AccessibilityInfo as unknown as {` |
| `src/lib/statusHistory.ts:57` | `const client = supabase as unknown as {` |

All 5 are genuine double-casts (the `as unknown as X` pattern exists specifically to defeat structural type-checking) at RN/web interop boundaries (DOM ref on native nav, style object shape, analytics prop bag, `AccessibilityInfo` untyped native method, Supabase client narrowing). Each is a candidate for a narrower local type instead of a full unknown-cast — see CAND-I-03.

### `@ts-ignore` / `@ts-expect-error`

Zero `@ts-ignore` anywhere. One `@ts-expect-error` total, in `src/lib/__tests__/statusHistory.test.ts:254`, explicitly documented inline (`// @ts-expect-error — user_id is intentionally absent from the shape.`) — this is a well-used, self-documenting instance in a test, not a code-health concern.

### `eslint-disable*` by file (non-test, 23 total)

| File | Count | Rules disabled |
|---|---:|---|
| `src/lib/pushNotifications.ts` | 4 | `@typescript-eslint/no-require-imports` (×4) |
| `src/lib/analytics.ts` | 4 | `no-console` (×4) |
| `src/lib/flagsStore.tsx` | 3 | `no-console` (×3) |
| `src/lib/flags.ts` | 3 | `@typescript-eslint/no-explicit-any` (×3, paired with the FileReader/Image shims) |
| `src/hooks/useComments.ts` | 2 | `@typescript-eslint/no-explicit-any` (×2) |
| `src/screens/TasksScreen.tsx` | 1 | `react-hooks/exhaustive-deps` |
| `src/screens/MapScreen.tsx` | 1 | `react-hooks/exhaustive-deps` |
| `src/screens/AboutScreen.tsx` | 1 | `@typescript-eslint/no-explicit-any` |
| `src/lib/haptics.ts` | 1 | `@typescript-eslint/no-require-imports` |
| `src/lib/comments.ts` | 1 | `@typescript-eslint/no-explicit-any` |
| `src/components/LiveStatusRegion.tsx` | 1 | `react-hooks/exhaustive-deps` |
| `src/components/FlashBanner.tsx` | 1 | `react-hooks/exhaustive-deps` |

Every disable in this list targets one of three well-understood categories: (1) `require()` for conditionally-loaded native modules (push notifications, haptics — standard Expo pattern for optional native deps), (2) intentional `console.*` in dev-diagnostic paths, (3) the same explicit-`any` boundary crossings already inventoried above. **Update after manual review:** all four `react-hooks/exhaustive-deps` suppressions (`TasksScreen.tsx:336`, `MapScreen.tsx:1510`, `LiveStatusRegion.tsx:113`, `FlashBanner.tsx:116`) carry an explanatory comment immediately above stating *why* the omitted dependency is intentional (e.g. FlashBanner: `` `rendered` is intentionally omitted: this should react to message / reduced-motion changes, not to its own mount toggle``). These read as deliberate, documented one-shot-effect patterns rather than oversights — downgraded from an initial suspicion to LOW/DEBT, worth a spot-check but not a standout risk. Likewise `src/lib/comments.ts:161-168`'s `(supabase as any)` cast carries a multi-line comment naming it as a known, tracked residual (`// The ONE cast TYPE-3 could not retire (2026-08-06): ...`) pending a live-schema-default confirmation from Sky — self-documented debt, not a silent landmine. See CAND-I-01/02 for the two items still worth independent verification.

---

## Deprecated / risky APIs

### `newArchEnabled: false`

Confirmed in two places, consistent with each other: `app.json:15` (`"newArchEnabled": false`) and the prebuilt `ios/Podfile.properties.json` (`"newArchEnabled": "false"`). Command: `grep -n newArchEnabled app.json ios/Podfile.properties.json`.

Implications for an Expo SDK 54 / RN 0.81 app:
- SDK 54 / RN 0.81 ship with the New Architecture (Fabric + TurboModules) as the default for new projects; this app has explicitly opted back into the legacy (Paper) renderer/bridge.
- None of the currently-installed direct dependencies (`react-native-maps`, `react-native-svg`, `react-native-screens`, `react-native-gesture-handler`, `react-native-safe-area-context`, `@react-navigation/*`) are New-Architecture-only at their installed majors, so `newArchEnabled: false` is not currently blocking any installed package — but it does mean the app is not exercised against Fabric at all, so any latent Paper-vs-Fabric behavioral difference (event timing, measure/layout edge cases) will surface for the first time whenever New Architecture is eventually turned on, with no incremental history to bisect against.
- `newArchEnabled: false` is a common Expo escape hatch for exactly one reason: a native dependency or config plugin isn't Fabric-clean yet. The `./plugins/withFmtXcode26Fix` custom config plugin (`plugins/withFmtXcode26Fix.js`) suggests the team is already fighting toolchain/build issues on this project (an Xcode 26.6 / clang / fmt 11.0.2 consteval incompatibility, worked around by forcing the `fmt` CocoaPod to compile at `gnu++17`); it is unrelated to New Architecture directly but is evidence of a codebase already carrying custom native-build patches, which raises the cost of any future Fabric migration attempt (more moving parts to re-validate together). Not evidence of a required New Architecture blocker — just contextual load-bearing complexity in `ios/`.

### Expo SDK 54 package-version cross-check (expo-doctor's failing check)

Per the task brief, `expo-doctor` reported 16/17 checks passed, failing only "packages should match Expo SDK versions." Cross-referencing `package.json` against `node_modules/expo/bundledNativeModules.json` (command: Python diff of the two JSON files' overlapping keys) found **5 packages whose `package.json`-declared semver range differs from the SDK 54 bundled-expectation string**:

| Package | package.json range | SDK 54 expects | Actually installed (`node_modules/<pkg>/package.json`) | Verdict |
|---|---|---|---|---|
| `expo-constants` | `~18.0.0` | `~18.0.13` | `18.0.13` | Installed version already matches SDK expectation; only the package.json floor is stale. |
| `expo-font` | `~14.0.4` | `~14.0.12` | `14.0.12` | Same — installed matches SDK; package.json floor stale. |
| `expo-status-bar` | `~3.0.0` | `~3.0.9` | `3.0.9` | Same — installed matches SDK; package.json floor stale. |
| `jest-expo` | `~54.0.0` | `~54.0.17` | `54.0.17` | Dev-only dependency; same pattern, installed matches SDK. |
| `react-native-web` | `^0.21.2` | `~0.21.0` | `0.21.2` | Different range *operator* (`^` vs `~`) but both resolve the same install (`0.21.2` is within both `^0.21.2` and `~0.21.0`); this is a string-format difference, not a real mismatch. |

Command used for the "actually installed" column: `node -p "require('./node_modules/<pkg>/package.json').version"` for each of the 5.

**Read on this finding: it is DEBT, not a DEFECT.** In every one of the 5 cases the version actually resolved into `node_modules` already satisfies what Expo SDK 54 expects — npm's resolver pulled forward to compatible patches despite the stale lower bounds in `package.json`. `expo-doctor`'s check is comparing declared ranges, not resolved installs, so it correctly flags a hygiene gap (the fix is normally `npx expo install --fix`, not run here per the no-`expo`-CLI constraint), but there is no evidence of an actual version conflict shipping in the built app. See CAND-I-05.

### `react-leaflet` 5 + `legacy-peer-deps=true`

`.npmrc:1` sets `legacy-peer-deps=true` (confirmed: `cat .npmrc` → `legacy-peer-deps=true`). `react-leaflet@5.0.0` is installed (`node_modules/react-leaflet/package.json`) with `peerDependencies: {"leaflet":"^1.9.0","react":"^19.0.0","react-dom":"^19.0.0"}` — all three are satisfied cleanly by the installed `leaflet@1.9.4`, `react@19.1.0`, `react-dom@19.1.0`. So react-leaflet 5 itself is not the thing forcing `legacy-peer-deps`.

Investigation of what else might require it:
- Direct-dependency peer ranges for `react`/`react-native` were checked programmatically across every package in `package.json` (`dependencies` + `devDependencies`) by reading each `node_modules/<pkg>/package.json`'s `peerDependencies` — none declare a `react` range that excludes 19.x (most use `"*"` or explicit `19.0.0` support, e.g. `lucide-react-native`, `@react-navigation/*`, `react-native-maps`).
- `npm ls --all --offline` (fully local, no network — read-only listing of the resolved tree against `package-lock.json`) reports **zero** `invalid`/`UNMET`/`extraneous` lines anywhere in the tree.

**Conclusion: with the tree as currently locked, no direct-dependency peer conflict against React 19 / RN 0.81 was found, and `npm ls --all --offline` shows the resolved tree is internally consistent.** `legacy-peer-deps=true` may be a defensive holdover from an earlier upgrade (e.g. the React 18→19 or react-leaflet 4→5 migration) that is no longer load-bearing — or it may be masking a transitive conflict that only manifests on a fresh `npm install` against the registry (which this audit cannot run — no network, no install). This is a genuine coverage gap, not a confirmed finding either way; see Coverage gaps and CAND-I-06.

### RN/Expo deprecated-API grep sweep

Commands and results (non-test `src` + `App.tsx`):
- `Clipboard` from React Native core: 0 real hits — the only 2 matches are comments (`SettingsScreen.tsx:897`, a UI-copy note about a removed glyph; `webShare.ts:54,61`, comments describing web `navigator.clipboard` fallback logic, not the deprecated RN `Clipboard` export).
- `ProgressBarAndroid` / `ProgressViewIOS` / `DatePickerIOS` / `TimePickerIOS` / `MaskedViewIOS` (all removed from RN core years ago): 0 hits.
- `ViewPropTypes` / `prop-types`: 0 hits.
- `ImageStore` / `ImageEditor` (deprecated RN image APIs): 0 hits.
- `pointerEvents=` (still valid as a prop today, but RN's docs mark the top-level prop as legacy in favor of `style.pointerEvents` for Fabric parity): 59 hits — not urgent while `newArchEnabled: false`, but every one becomes a Fabric-migration touch point later. Not itemized per-file here (59 call sites, cosmetic/forward-compat only); re-grep at New Architecture migration time.
- `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` (iOS-only shadow props; RN's New Architecture consolidates these into `boxShadow`, and the split-props form is being phased toward deprecated status): 44 hits. Same forward-compat note as `pointerEvents` — not a defect today, becomes a migration cost later.
- `useNativeDriver: false`: 4 hits (not a deprecation — flagged here only because it's a common perf smell; Lane on performance owns follow-up, out of scope for this architecture pass beyond noting the count).

No uses of RN-core `AsyncStorage` (project correctly uses the community `@react-native-async-storage/async-storage` package throughout — consistent with the SDK 54 bundled version).

---

## Navigation reachability

**Method note (methodology correction made mid-audit):** the first pass grepped only `from '@/screens/X'` / `from '@/components/X'` absolute-alias imports and produced several false "zero mount" results. Re-run with a pattern that also catches same-directory relative imports (`from './X'`) and dynamic imports (`import('./X')`, used for `React.lazy`) resolved every one of them to a real mount point. Command used for the corrected sweep: `grep -rln "/<Name>'" src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__\|\.test\." | grep -vE "/<Name>\.tsx$"` run per surface. **Net result: no zero-mount (orphaned) screen or modal surface was found** among the 19 files in `src/screens/` or the ~20 modal-shaped components checked in `src/components/`.

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

**Naming-collision note (not a functional bug, confirmed by reading both headers):** `src/screens/NotificationPreferencesScreen.tsx` (OS push-notification category toggles: flag-status/nearby/watched/bulk-digest) and `src/components/NotificationPrefsModal.tsx` (in-app "since your last visit" banner toggles — which status transitions count as an "update") are two different features with near-identical names. Confirmed via each file's header doc-comment (`NotificationPreferencesScreen.tsx:1-11` vs `NotificationPrefsModal.tsx:1-9`). Worth a rename for maintainability; not a reachability or duplication defect. See CAND-I-07.

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

Note for context, not exculpatory: this SQL file is `supabase/schema.sql`, which the codebase's own migration-hygiene commentary (see Migration lineage section below) already flags as a periodically-stale consolidated snapshot rather than a live-verified source in every line — but the specific `handle_flag_status_change()` function block carries its own "Live body verified" provenance note elsewhere in the file for sibling functions, and the reject-penalty branch is architecturally consistent (same function, same style) with the verified verify/resolve branches directly above it, so there is no positive reason to doubt it reflects live behavior. Confidence is HIGH but DB-side confirmation (reading the actual live function via `pg_get_functiondef`, not done in this read-only source audit) would remove all doubt — see Coverage gaps.

### Category / severity / status labels — correctly centralized (no duplication found)

Contrary to the initial hypothesis that these would be duplicated, all three label/color maps trace to exactly one definition site each, with every other file importing rather than re-declaring:

- `CATEGORY_LABELS`, `SEVERITY_LABELS`, `STATUS_LABELS`: all three defined once, at `src/lib/flags.ts:1558`, `:1620`, `:1644` respectively (`export const X: Record<...> = {...}`). Command: `grep -rnE "^\s*(const|export const)\s+(CATEGORY_LABELS|STATUS_LABELS|SEVERITY_LABELS)\s*[:=]" src` returns exactly these 3 lines, all in the same file — no shadow re-implementation anywhere else in `src/`.
- Severity **colors**: `src/theme.ts:745` (`export const severity = {...}`) is explicitly commented as "single source of truth for the 1→5 color ramp," and `src/lib/flags.ts:1609`'s `severityColor()` function **derives** from it (`return severityRamp[s]?.color ?? ...`, confirmed by reading the function body) rather than hardcoding its own hex values. Both `src/components/PlatformMap.tsx` and `src/components/PlatformMap.web.tsx` (the native/web map dual-implementation) import `severityColor`/`SEVERITY_LABELS`/`CATEGORY_LABELS`/`STATUS_LABELS` from `@/lib/flags` and `heatmapSeverity` from `@/theme` rather than re-declaring — confirmed by reading each file's import block (`PlatformMap.tsx:10-12`, `PlatformMap.web.tsx:15,18`).
- The one manual (non-compiler-enforced) invariant: `theme.ts:740`'s comment "Keep this aligned with `severityColor()` in `src/lib/flags.ts`" is aspirational cross-file discipline, not an automated check — low residual risk given `severityColor()` already derives from `theme.ts` rather than duplicating it, but worth a lightweight regression test tying the two together (same category of risk that the points.ts `SW-53` history shows can silently rot). See CAND-I-08 (LOW severity).

**Assessment: this is a well-managed pattern, not a defect.** Reported here to document that the hypothesis in the task brief was checked and did not hold for labels/colors — only the points-vs-SQL axis showed real drift.

### `src/lib/copy.ts` adoption

`copy.ts` is 987 lines / 70 exported string constants (`grep -c "^export const" src/lib/copy.ts`), imported by 19 files (`grep -rl "from '@/lib/copy'" src App.tsx | grep -v __tests__ | wc -l`). Its own contents show it is deliberately scoped to cross-cutting, compliance/moderation-adjacent copy (report/block/hide flows, privacy hints, offline banner, hidden-comments) rather than an attempt to centralize all UI text — the large majority of screen/modal copy is inline JSX text local to its own component, which is a normal and defensible pattern at this app's size, not itself a finding.

### Raw hex color literals — top files (non-test, `grep -roE "#[0-9A-Fa-f]{3,8}\b"`)

433 total raw hex literal occurrences in non-test `src`+`App.tsx`. Top 10 files:

| File | Raw hex count | Assessment |
|---|---:|---|
| `src/theme.ts` | 150 | Expected — this IS the token definition file. |
| `src/theme/ThemeContext.tsx` | 95 | Expected — light/dark palette resolution. |
| `src/components/PlatformMap.web.tsx` | 35 | Worth spot-checking — map styling often has legitimate one-off values (tile/attribution chrome), but 35 raw hexes outside the token file is the largest non-theme concentration. |
| `src/components/PlatformMap.tsx` | 21 | Same map-styling caveat as above (native counterpart). |
| `src/screens/MapScreen.tsx` | 20 | Proportionate to file size (4184 lines, largest hotspot) but still a top offender in absolute terms. |
| `src/screens/TasksScreen.tsx` | 15 | |
| `src/screens/SignInScreen.tsx` | 11 | |
| `src/screens/ReportFlagModal.tsx` | 10 | |
| `src/components/HeatmapLegend.tsx` | 10 | Plausibly legitimate — heatmap gradient stops are inherently literal color ramps (`heatmapSeverity` in `theme.ts` itself also hardcodes hex per-stop, e.g. `#fde047`, by design, per its own comment "Distinct from the pin-marker severity ramp above"). |
| `src/screens/ProfileScreen.tsx` | 8 | |

Not independently triaged hex-by-hex (433 occurrences); the theme/map files account for over two-thirds of the total and are largely expected. See Coverage gaps for what a full triage would need to separate "legitimate one-off" from "should be a token."

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

Sampled a few of MapScreen's 13 (lines 3662, 4051, 4057, 4059, 4069, 4078, 4110, 4119, 4150, 4155) — all are small UI chrome (chip text, FAB labels, filter-preset buttons) with values (12/13/14/15/18) adjacent to but not matching `font.size.*` steps; read as ad hoc micro-tuning rather than a systemic token bypass. **Positive finding, not a defect** — flagged here only because the task scope asked for the top-10 list, not because it indicates a problem.

---

## State ownership observations

**Overall assessment, stated up front: this is the most rigorously-engineered area of the codebase audited in this lane.** The state-management code shows a consistent, repeated pattern — ship something, find the exact race/staleness/leak bug it enables in production or review, fix it, and leave a comment naming the failure mode so it isn't reintroduced — evidenced by in-code ticket references (`F22`, `F32`, `F37`, `F43`, `F53`, `F58`, `F64`, `SW-53`) each describing a specific historical bug in exactly the categories this section was asked to hunt for. Several initial hypotheses below were falsified on inspection; reported honestly either way.

### `flagsStore.tsx` — single shared store, correctly cleaned up

`src/lib/flagsStore.tsx` (692 lines) is a React Context provider (`FlagsProvider`/`useFlags()`) holding one `flags: FlagRow[]` array plus a derived `flagsMap` (`useMemo`, O(1) id lookup, `flagsStore.tsx:478-482`) as the single shared source of truth for flag data across `MapScreen`, `TasksScreen`, and `ProfileScreen`. Mutations are exposed as `patchFlag(id, patch)` / `removeFlag(id)` (`flagsStore.tsx:614-619`) for consumers to write back into the shared store after a server round-trip.

**Realtime subscription (`flagsStore.tsx:537-613`)** — a Supabase `postgres_changes` channel gated behind a user opt-in (`realtimeEnabled`), with:
- A verified cleanup path: `useEffect` returns a teardown function that calls `supabase.removeChannel(channel)` (line ~613), guarded by a `mounted` flag so an in-flight async re-fetch after unmount is a silent no-op rather than a `setState`-after-unmount warning.
- A documented race fix (`F32`, lines 531-536): a `realtimeTeardownRef` promise chain so a fast toggle-off/toggle-on doesn't `.subscribe()` onto a channel that is still leaving (supabase-js dedupes channels by topic name) — the comment explicitly names the prior failure mode ("switch shows ON, zero live subscription").
- Three explicit "safeguards" by design comment: #1 viewport geofencing delegated to `MapScreen` via a ref-based callback (`viewportGateRef`) so geographic filtering stays co-located with the map's own region state; #2 the opt-in gate itself; #3 fire-and-forget observability (`logRealtimeEvent`) on subscribe/unsubscribe.
- DELETE events and merge/insert events are both handled with correct positional re-sorting and status-filter re-application (`flagsStore.tsx:571-585`).

Command trail: `grep -n "useEffect(\|\.subscribe(\|removeChannel\|return () =>" src/lib/flagsStore.tsx`.

### `FlagDetailModal` — three independent local-state mount points, verified NOT a split-brain risk in the paths checked

Per the Navigation reachability section, `FlagDetailModal` is mounted independently by `MapScreen.tsx`, `TasksScreen.tsx`, and `ProfileScreen.tsx`, each owning its own `selectedFlag: FlagRow | null` local `useState` (e.g. `MapScreen.tsx:498`, explicitly commented "S3: ... Per-screen state, NOT in the shared-modals pool"), and each passing it down as a controlled `flag` prop. Inside the modal, `shownFlag` (`FlagDetailModal.tsx:279`) is a second, modal-local `useState` seeded from that prop and re-synced via `useEffect(() => { if (flag) setShownFlag(flag); ... }, [flag])` (`FlagDetailModal.tsx:302-309`) — i.e. **two more state copies of the same row on top of the shared store's array**, which is exactly the shape that produces stale-UI bugs if not handled carefully.

Traced every in-modal mutation path to check whether the displayed `shownFlag` can go stale relative to what the parent's `selectedFlag` / the shared store now holds:

| Action | What happens to `shownFlag` | What happens to the parent / shared store | Stale-display risk? |
|---|---|---|---|
| Verify / Resolve / Reject (`runStatusChange`, `FlagDetailModal.tsx:807-855`) | Not updated locally | `onChanged(updated, action, isOwn)` called, then **`onClose()` immediately** | None — sheet closes before staleness could be seen. MapScreen's `onChanged` handler (`handleDetailChanged`, `MapScreen.tsx:1748-1755`) calls `patchFlag(updated.id, ...)`, so the underlying list/map pin is correct on the *next* open. |
| Edit description/category/severity (`handleSaveEdit`, `FlagDetailModal.tsx:780-792`) | **`setShownFlag(updated)` called directly** (line ~789) | `onEdited?.(updated)` — comment: `"F58: propagate to the shared store/list"` | None — local state and shared store both updated in the same handler; modal stays open showing fresh data. |
| Reopen request, threshold met (`FlagDetailModal.tsx:1136-1143`) | Not updated locally | `onChanged(updated, 'reopen', isOwn)`, then **`onClose()`** | None — same close-on-success pattern as status change. |
| Reopen request, threshold not yet met | Not updated (correctly — the flag's own row hasn't changed) | Not called | None — no real state change to reflect. |
| Server rejects a stale status write (`FlagStatusConflictError`, `FlagDetailModal.tsx:843-850`) | Not updated | `onClose()` called with an explanatory `notify()` — comment: `"F64: don't strand the user on a stale snapshot with live buttons."` | None — explicitly hardened against exactly this. |

**Conclusion: not a live defect in the paths checked.** The correctness of this pattern currently rests on *discipline* — every handler that changes the displayed flag must either call `setShownFlag` directly or close the modal — rather than a structural guarantee (e.g., deriving `shownFlag` from `flagsMap.get(id)` with local-only overlay for in-flight edits, which would make the invariant impossible to violate by construction). In a 3121-line file with many action handlers, a future addition that forgets one of the two safe exits would silently reintroduce the exact bug class `F58`/`F64` already fixed once. This is a maintainability/DEBT observation, not a confirmed defect — see CAND-I-09 (LOW severity).

### Optimistic updates — rollback checked at 2 representative call sites, both correct

`grep -rn "optimistic" src -i` (excluding tests) surfaces ~18 call sites with explicit "Optimistic" comments. Spot-checked two:
- `src/hooks/useComments.ts:215-226` (`deleteComment`): removes the comment from local state immediately, and on failure calls `await fetch(); throw e;` — re-syncs from the server (true rollback) and re-throws so the caller can surface an error.
- `src/components/FilterPresetsModal.tsx:220-229` (delete preset): snapshots `presets` before the optimistic `setPresets(next)`, and on a `savePresets` failure calls `setPresets(presets)` (restores the pre-optimistic snapshot) plus an `Alert.alert` — see the Environment section for why raw `Alert.alert` specifically in **this** file is itself a separate, confirmed cross-platform gap (CAND-I-02), independent of the rollback logic itself being correct.

One deliberately-non-rolled-back case, and it reads as a reasonable risk call rather than an oversight: `src/hooks/useNotificationPreferences.ts:135-149` persists a preference toggle to `AsyncStorage` fire-and-forget, with an explicit comment justifying no rollback ("Fail-soft: the optimistic UI already shows `next` and the next mount re-reads disk... still warn so a persistent write failure is visible"). Low-stakes local preference vs. the higher-stakes flows (comment deletion, paid-for filter presets) that do implement full rollback — the differentiation looks intentional.

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

**Method (heuristic, explicitly labeled as such):** a Python script scanned every non-test `.ts`/`.tsx` file under `src/` for top-level `export function|const|class|interface|type|enum <Name>` declarations (683 found), then for each name ran `grep -rl -w <Name> src App.tsx` and treated a result set of only the declaring file as a candidate for "unused." This is a heuristic, not a type-aware reference count — it will not catch re-exports through a barrel file that re-binds the name, and it will flag prop-type interfaces that TypeScript infers structurally without ever needing an explicit import as false positives. Both effects are visible and called out below.

### Exports never imported elsewhere — 9 real candidates (after filtering false positives)

The raw scan flagged 156 names with zero usage outside their declaring file when tests were excluded, and 46 more type/interface names with zero *explicit-name* usage even including tests (the task asked for "top 30"; the true list is short enough to give in full with the filtering shown). Re-running with test files **included** in the usage search (correcting for intentionally test-only exports, e.g. the `__`-prefixed `__writeFlagsCache`/`__readFlagsCache` in `flagsStore.tsx`, whose own doc-comment says "Exported... for unit tests only") collapses the 156 to **9 VALUE exports** (function/const — i.e. exports that matter for dead-code purposes) with zero references anywhere, including their own declaring file beyond the declaration line itself:

| Export | Location | Occurrences in own file | Verdict |
|---|---|---:|---|
| `TypeBlockContext` | `src/components/ui/TypeBlock.tsx:68` | 3 | **False positive** — used twice more within its own file; just needlessly `export`ed. Not dead. |
| `READ_STILL_TRYING_MS` | `src/lib/flagsStore.tsx:31` | 2 | **False positive** — used once more within the file. Not dead. |
| `READ_CEILING_MS` | `src/lib/flagsStore.tsx:37` | 2 | **False positive** — same. Not dead. |
| `TILE_CACHE_VERSION` | `src/lib/tileCache.ts:23` | 3 | **False positive** — used within the file. Not dead. |
| `MAX_CACHE_SIZE_BYTES` | `src/lib/tileCache.ts:24` | 4 | **False positive** — used within the file. Not dead. |
| `TILE_CLEAR_GRACE_MS` | `src/lib/tileCache.ts:110` | 3 | **False positive** — used within the file. Not dead. |
| `identifyUser` | `src/lib/analytics.ts:139` | 1 (declaration only) | **Genuinely unused everywhere**, but deliberately so — sits under a section header comment "User identity — intentionally not sent anywhere" (`analytics.ts:135-136`) and its body only `console.log`s in `__DEV__`. Reads as a documented, privacy-motivated no-op stub, not an oversight. |
| `resetUser` | `src/lib/analytics.ts:146` | 1 (declaration only) | Same file/comment, same verdict — deliberate no-op stub. |
| `reverseGeocode` | `src/lib/geocode.ts:108` | 1 (declaration only) | **Genuinely unused everywhere, and NOT self-explanatory like the two above.** A fully-implemented, documented function (Nominatim `/reverse` lookup, same timeout/User-Agent conventions as the actively-used `searchAddress`) with no caller anywhere in `src/`. Reads like scaffolding for a "show a street address instead of raw lat/lng" feature that was never wired up (or was wired up and later had its call site removed). Worth a one-line ask to the team rather than a confident "delete this" — see CAND-I-10. |

Net: **only 1 export (`reverseGeocode`) is an unexplained dead-code candidate**; the other 8 raw hits are either false positives from the heuristic (over-exported-but-used) or self-documented intentional stubs.

The 46 zero-usage TYPE/INTERFACE names (full list generated, e.g. `HeatmapLayerProps`, `SearchInputRowProps`, `CreateFlagInput`, `ListFlagsPageOptions`) are, on inspection, overwhelmingly component-Props and function-parameter/return shapes — TypeScript consumes these structurally wherever the component or function is used, with no requirement to import the type by name. **Treated as false positives, not reported as dead code individually** — flagging them would misrepresent normal TypeScript usage as a hygiene problem.

### Unused npm dependencies

Checked every `dependencies` entry in `package.json` for any `from '<pkg>'`/`from "<pkg>"`/`require('<pkg>')` import anywhere in `src`/`App.tsx`, then corrected for bare side-effect imports (`import '<pkg>'` with no `from`, which the first pass missed) and for packages that are legitimately never imported by application code:

| Package | Import hits | Verdict |
|---|---|---|
| `@expo/vector-icons` | 0 (confirmed — no import, no side-effect import, only appears in `package.json`) | **Real candidate for removal.** The app's actual icon library throughout is `lucide-react-native` (50 files). `@expo/vector-icons` is bundled by default in every `create-expo-app` template scaffold; this looks like an un-pruned template leftover. Low risk to investigate (not proven unused at the native-config level — see caveat below). |
| `expo-dev-client` | 0 | Expected zero — a native dev-tooling package activated by presence/linking, not JS import. "Possibly used by native config" per task guidance — correct here. |
| `expo` (the SDK itself) | 0 | Expected zero — `package.json`'s `"main": "node_modules/expo/AppEntry.js"` is how it's actually wired in; framework-level, not import-level. |
| `react-native-screens` | 0 direct import (1 mention, in a comment describing its DOM behavior in `RootNavigator.tsx:257`) | Expected zero at the app level — it's a peer dependency `@react-navigation/bottom-tabs`/`native` import internally for native-stack scene management; the app never needs to import it directly. "Possibly used by native config / transitively required by react-navigation" — correct here. |
| `react-native-url-polyfill` | 1 (corrected after including bare side-effect imports) | **False alarm from the first pass.** `src/lib/supabase.ts:1`: `import 'react-native-url-polyfill/auto';` — genuinely used, just via a side-effect import the first grep pass (which required a `from` clause) missed. |
| `react-dom`, `react-native-web` | 0 each | Expected zero — consumed by the web bundler/renderer entry point and Metro's platform resolution respectively, not by app-level imports. Normal for a project with a web target. |

**Actionable candidate: `@expo/vector-icons`.** Caveat before treating this as a confirmed removal: some Expo/React Navigation internals or config plugins can reference icon font families by package presence rather than JS import, so "zero grep hits in `src/`" is good evidence but not absolute proof of zero runtime dependency — flagged as DEBT/candidate, not a confirmed dead dependency. See CAND-I-11 (LOW severity, cheap to verify: remove and run a full build).

### Unused assets

`assets/` holds only 8 files total (`find assets -type f | wc -l`) — a small, easily-audited set. Cross-referenced each filename against `src/`, `App.tsx`, and `app.json`:

| Asset | Reference count | Note |
|---|---:|---|
| `assets/brand/app-icon.png` | 2 | Used (`app.json` icon fields). |
| `assets/favicon.png` | 1 | Used (`app.json` web favicon). |
| `assets/brand/logo-mark.svg` | 1 | Used. |
| `assets/textures/noise-128.png` | 1 | Used. |
| `assets/brand/app-icon.svg` | 0 | No reference found. |
| `assets/brand/favicon.svg` | 0 | No reference found. |
| `assets/brand/logo-mark-mono.svg` | 0 | No reference found. |
| `assets/brand/logo-mark-white.svg` | 0 | No reference found. |

The 4 zero-reference files are all `.svg` variants sitting alongside their referenced `.png`/`.svg` counterparts in `assets/brand/`. Most likely read as **design-source originals kept for re-export** (an SVG isn't directly renderable by React Native without an SVG-loading component, and `app.json`'s icon/favicon fields point at the `.png` builds) rather than orphaned runtime assets — normal to keep in a repo, not flagged as a defect. Low-stakes either way given the total asset count is 8.

---

## Environment + platform assumptions

### `process.env` / `EXPO_PUBLIC_*`

Exactly 2 environment variables are read anywhere in the app (command: `grep -rn "process\.env\." src App.tsx --include="*.ts" --include="*.tsx" | grep -v "__tests__\|\.test\."` — 3 hits, 2 distinct variables): `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, both read in `src/lib/supabase.ts:16-17` (with a third read of the URL in `src/lib/remoteImageUrl.ts:83` for image-domain validation). **`APP_ENV` is not used anywhere in this codebase** — the task brief asked about it, but a repo-wide search found zero hits; noted as a negative result rather than a finding.

**Missing-.env behavior is a hard, loud failure, by design — a positive finding.** `src/lib/supabase.ts:19-23`:
```ts
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY — locally in .env, and in EAS via `eas env:create`.',
  );
}
```
This throws at module-load time (the app cannot boot at all without both variables) rather than silently constructing a client with an empty URL and producing confusing downstream network errors. `.env` and `.env.local` are correctly gitignored (`.gitignore:12-13`); `.env.example` documents exactly the 2 required keys with empty values. This worktree has a real (git-ignored) `.env` populated with both keys — contents not reproduced here.

Tangential, one level outside this lane's primary scope but touching "environment assumptions": `src/lib/supabase.ts` carries a detailed, dated comment block ("IO-2 (security audit 2026-07-31) — WEB SESSION INJECTION") documenting a specific `detectSessionInUrl`/implicit-flow vulnerability class and the client-config choice made to address it. Not independently re-verified here (security lane's territory) — flagged only so it isn't missed.

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
| `evil-supabase.co.attacker.test` | `src/lib/remoteImageUrl.ts` | **Not a real domain** — an illustrative example inside a comment explaining a URL-prefix-matching bypass the code's domain-allowlist check is written to avoid (e.g. why a naive `.startsWith()` check would be exploitable). Evidence of security-conscious documentation, not a live reference. |

No indication of environment-specific domain switching (e.g. a staging vs. production API host) beyond the two Supabase env vars — all of the above are permanently-fixed, non-secret public URLs, which is appropriate for their purpose (share links, legal pages, third-party APIs).

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

### CAND-I-02 detail: `Alert.alert` is a confirmed hard no-op on web, and ~12 of 29 direct call sites are unguarded

This surfaced while investigating the `confirm()`/`notify()` helpers referenced in the TS-escapes and State-ownership sections above, and belongs here because it is fundamentally a `Platform.OS`-branching-completeness question.

**The mechanism is not an inference — it was verified by reading the actual installed dependency source.** `node_modules/react-native-web/src/exports/Alert/index.js`, in full:
```js
class Alert {
  static alert() {}
}
export default Alert;
```
`Alert.alert()` on web is a completely empty function — no dialog, no console warning, nothing observable happens.

**The team knows this and has fixed it before, repeatedly, at individual call sites — but not systemically.** Evidence, all from in-repo comments: `src/lib/confirm.ts` exports a `notify()` helper specifically for this ("Alert.alert is a silent no-op on react-native-web... NOT for telling the user that something they submitted failed — a failed report/avatar/photo upload on web previously dead-ended with a spinner stop and zero feedback," tagged `F46 re-sweep`); `src/screens/SignInScreen.tsx:128-129` documents a second historical incident by name ("F48: the button-Alert below never renders on web — sign-up looked like a silent no-op and the modal never closed"); `src/lib/confirm.ts`'s own module comment references two more ("same trap that bit R8 + R11"). That is **4 named historical incidents of this exact bug class**, each patched individually with a local `Platform.OS === 'web'` branch, with no lint rule or wrapper-only convention enforced to stop a 5th.

**Full manual audit of all 29 non-test `Alert.alert(` call sites** (`grep -rn "Alert.alert(" src App.tsx | grep -v "__tests__\|\.test\."`, each site's enclosing function read for a `Platform.OS === 'web'` guard):

- **13 sites, 6 files, confirmed correctly guarded (not bugs):** `SignInScreen.tsx:134` (else-branch of an if/web), `ReportFlagModal.tsx:539,592` (592 has an explicit `F46` comment), `MapScreen.tsx:882,1299,1721` (all 3 — MapScreen is fully clean on this pattern), `FlagDetailModal.tsx:576,582,605,932,1005` (5 of its 6 — add-photo/share/copy-coords flows all branch on web first), `pushNotifications.ts:49` (`showPushExplanation`, web branch uses `window.confirm`), `blockedContent.ts:66` (`showBlockedContentAlert`, web branch uses `notify()`).
- **12 sites, 6 files, confirmed UNGUARDED — no `Platform.OS` check anywhere in the enclosing file or function:**

  | Site | What silently does nothing on web |
  |---|---|
  | `src/screens/AdminScreen.tsx:156` | Error alert after a failed flag delete/reject action (file has **zero** `Platform` references at all) |
  | `src/screens/AdminScreen.tsx:177` | Same pattern, second admin action |
  | `src/screens/SettingsScreen.tsx:460` | "Sign in required" guard on data-export |
  | `src/screens/SettingsScreen.tsx:548` | "Data exported" success confirmation |
  | `src/screens/SettingsScreen.tsx:555` | "Could not export data" failure alert |
  | `src/components/FeedbackModal.tsx:176` | "No email app found" fallback (shows the support email address — the ONE piece of info the user needs when email fails) |
  | `src/components/FeedbackModal.tsx:182` | "Couldn't open email" generic failure |
  | `src/components/FilterPresetsModal.tsx:181` | "Could not save preset" failure (file has **zero** `Platform` references at all) |
  | `src/components/FilterPresetsModal.tsx:202` | "Could not rename preset" failure |
  | `src/components/FilterPresetsModal.tsx:228` | "Could not delete preset" failure |
  | `src/components/FlagDetailModal.tsx:1080` | "Description required" validation for a reopen request — **in the same function**, 5 lines after a correctly-guarded `notify('Sign in required', ...)` call (`FlagDetailModal.tsx:1075`), i.e. one validation branch was fixed and the very next one wasn't |
  | `src/lib/feedback.ts:125` | `openFeedbackComposer()`'s fallback alert when no mail client responds — explicitly documented as reachable from `About` and other non-modal entry points, which are web-reachable |

- **1 site not fully resolved (lower confidence):** `pushNotifications.ts:233` ("Notifications unavailable" after a failed token fetch) — the file does branch on `Platform.OS === 'web'` elsewhere for the *explanation* prompt, so this specific alert may be behind a code path that never runs on web; not verified either way.

Every one of the 6 unguarded files is a surface reachable on web in normal use — `AdminScreen`/`SettingsScreen`/`FlagDetailModal` are core tab-navigator/hidden-route screens with no platform gate in `RootNavigator.tsx`, `FeedbackModal` is opened from the header button on every tab, `FilterPresetsModal` is opened from `MapScreen`, and `feedback.ts`'s composer is called from `AboutScreen` (drawer-reachable). See **CAND-I-02** (ranked #2, just under the points/FAQ finding).

### Feature flags / kill switches / `__DEV__` gates

**Feature flag system:** `src/lib/featureFlags.ts` (76 lines) is a small, self-contained, honestly-labeled implementation — a `useSyncExternalStore`-based store with exactly one flag defined today. Its own header comment states the scope plainly: "Local implementation only — flags live in this file and are toggled at build/deploy time... TODO: Replace with a real feature flag service (LaunchDarkly or Firebase Remote Config are mentioned in the Phase 2 strategy)." This is a documented, intentional stopgap, not an oversight.

The one flag, `PUSH_NOTIF_TYPES_ENABLED` (default `false`), is a genuine kill switch with an unusually good justification in-line: it hides the "Push notification types" row in `NotificationPreferencesScreen` because "NOTHING in the push pipeline reads that key yet, so the choices have no effect. Showing the UI would be a lie to the user (Sky Decision 2, Option B: hide, don't wire)." This reads as a deliberate honesty-over-completeness product decision (tracked as "Sky Decision 2"), not dead scaffolding — flagged here for visibility, not as a defect. Only one consumer: `src/screens/SettingsScreen.tsx`. `setFlag()` is explicitly runtime-override-only and itself gated `if (!__DEV__) return;` so it cannot affect production behavior.

**`__DEV__` gates:** 19 occurrences across 6 files (`grep -rn "__DEV__" src App.tsx | grep -v "__tests__\|\.test\."`: `src/lib/analytics.ts`, `src/lib/flags.ts`, `src/lib/flagsStore.tsx`, `src/lib/featureFlags.ts`, `src/components/ui/GlassSurface.tsx`, `App.tsx`). Read every one — **all 19 gate diagnostic output only** (`console.debug`/`console.log` for EXIF-stripping verification, offline-cache hydration timing, analytics-event echo, a `GlassSurface` blur-pane budget warning) or the feature-flag dev-override guard above. **None gate a functional/business-logic difference between dev and production builds** — there is no `if (__DEV__) { skip-the-real-check() }` shortcut anywhere in this set, which is the risky pattern this check exists to catch. Positive finding.

---

## Migration lineage observations (main vs Build 33)

**This section describes a real, substantial, factual divergence between `origin/main`'s `supabase/` directory and the submitted iOS Build 33 source's `supabase/` directory — not a hypothesis.** Commands: `ls supabase/migrations/` (main, checked out directly) vs `git ls-tree -r --name-only f5594171 -- supabase` (Build 33, read via `git show`/`git ls-tree` without checkout, per the read-only constraint).

### The two naming conventions

- **`origin/main`**: 47 files in `supabase/migrations/`, all named `YYYY-MM-DD_description.sql` — **date-only** granularity (day, no time component). Suffix markers carry status inline in the filename: `_PROPOSED` (3 files: `2026-06-09_status_transition_guard_PROPOSED.sql`, `2026-06-18_monthly_leaderboard_rpc_PROPOSED.sql`, `2026-07-16_fork5_dispute_counter_PROPOSED.sql`), `_APPLIED` (3 files: `2026-08-19_flag_status_transition_guard_APPLIED.sql`, `2026-08-19_photo_alt_text_APPLIED.sql`, `2026-08-22_takedown_junk_flags_APPLIED.sql`), and 6 `drift_capture_*` files all dated `2026-07-27` (a single reconciliation batch — see below). One `.sql.deprecated-option1-do-not-apply` sentinel-named file. Everything lives flat in one directory; there is no `supabase/nonmanaged/`.
- **Build 33 (`f5594171`)**: 86 files in `supabase/migrations/`, all named `YYYYMMDDhhmmss_description.sql` — full **timestamp** granularity (to the second). This is the standard format Supabase CLI's `supabase migration new` generates natively, whereas main's day-only convention is a simplified, hand-maintained scheme that does not match what the actual CLI tooling produces. Build 33 additionally has a `supabase/nonmanaged/` directory with 5 subdirectories — `destructive-data/`, `live-out-of-band/`, `manual/`, `proposed/`, `rollback-recovery/` — holding files whose names are recognizably the SAME content main keeps inline via suffix (e.g. Build 33's `nonmanaged/rollback-recovery/2026-07-27_drift_capture_handle_flag_status_change.sql` and `nonmanaged/proposed/2026-06-09_status_transition_guard_PROPOSED.sql` are identically-named to files that live directly in main's flat `migrations/` folder).

**Content check, not just filenames:** diffed one migration both lineages share by content, `supabase/migrations/2026-05-30_trust_score_system.sql` (main) against Build 33's `supabase/migrations/20260531202835_trust_score_system.sql` — **byte-for-byte identical, zero diff lines**, despite the filename's date component differing by one day (05-30 vs 05-31) between the two naming schemes. This is useful evidence that, at least for shared content, the divergence is **organizational/procedural (naming convention, filing scheme) rather than a silent SQL-logic fork** — the two lineages agree on what this particular migration says, they just catalog it differently.

### Substantive content Build 33 has that main does not

Beyond the naming-convention difference, Build 33's migration count (86) versus main's (47) reflects **~39 migrations' worth of real, additional backend work absent from `origin/main` entirely**, not just renamed duplicates. Concretely:

- **Edge functions**: main's `supabase/functions/` has 3 functions (`delete-account`, `notify-flag-status`, `send-push-notification`). Build 33's has 7 (adds `account-deletion-review`, `account-deletion-status`, `account-deletion-worker` — an async review/worker queue pattern for account deletion that main's single `delete-account` function doesn't have — plus `delete-flag`, a dedicated edge function for flag deletion that main has no equivalent of at all). Cross-checked against the client: `src/lib/flags.ts:1413`'s `deleteFlag()` on main does a **direct** `supabase.from('flags').delete()...` RLS-gated table call, not an edge-function call — consistent with main genuinely lacking the server-side `delete-flag` function, not just failing to wire up an existing one.
- **Migrations from a `mod1*`-prefixed moderation-safety batch** (`20260828040000_mod1_moderation_release_safety.sql`, `20260828050000_mod1_admin_report_queue.sql`, `20260828060000_mod1r_fix1_report_and_insert_authz.sql`, `20260828070000_mod1r_fix1_pending_close_state.sql`, `20260828080000_mod1r_fix2_action_intent.sql`) and a `promptb_media_key_read_contract` migration (`20260830130000_...sql`) — none present on main. These read as a content-moderation/admin-report-queue feature that shipped in Build 33 but is entirely absent from `origin/main`'s backend.
- **`supabase/tests/`**: Build 33 has a pgTAP-style SQL test directory (`d1f4r3_fix2_flags_delete_rls.test.sql`, `d1f4r3_fix3_review_audit.test.sql`, `mod1r_fix1/00_baseline.sql` + `10_proof.sql`, `promptb_media_key_guards.test.sql`) — main has no `supabase/tests/` directory at all.
- Scale check for src (not deeply analyzed here — likely another lane's territory, noted for context only): `git diff --stat origin/main f5594171 -- src` reports **150 files changed, 14,080 insertions(+), 3,553 deletions(-)** — the backend divergence documented above sits inside a much larger overall divergence between the two trees, consistent with the task brief's "113 commits ahead" framing.

### `schema.sql` staleness — self-admitted, in the file itself, on both lineages

Both `supabase/schema.sql` files (main: 484 lines; Build 33: 489 lines — nearly identical size, consistent with schema.sql being a periodically-refreshed *snapshot* rather than a living document either lineage keeps current) carry the same class of explicit staleness warning. Main's header (`supabase/schema.sql:1-19`):

```
-- ⚠️  DO NOT RE-RUN THIS FILE WHOLESALE AGAINST THE LIVE PROJECT (QA 2026-08-19).
--   Live has been hardened past this file by later migrations: re-running it
--   would RESURRECT the broad `flags update own` policy...
--
-- RECONCILIATION STATUS (2026-06-07):
--   This file covers the original tables (users, flags, push_tokens) + the
--   2026-06-03 security gate functions + the F8 reopen RPC.  Ten additional
--   tables and several supporting functions are NOT yet represented here —
--   they were applied via the migration files in supabase/migrations/.
--   For the full live schema, run pg_dump or consult: [migration file list]
```

This is the project **admitting, in-repo, in the file itself**, that `schema.sql` is a point-in-time snapshot (dated 2026-06-07) that is already known to be missing "ten additional tables and several supporting functions" relative to its own migrations directory, and that a wholesale re-run would actively regress live security posture. main's migrations directory extends to 2026-08-22 (`2026-08-22_takedown_junk_flags_APPLIED.sql`) — roughly **10 weeks past** the schema.sql reconciliation date. Anyone treating `schema.sql` as "the schema" rather than "a bootstrap starting point, superseded by the migrations directory" would be working from a picture that is confirmed-stale by the codebase's own account, not an inference of this audit.

### The two-lineage problem, stated factually

`origin/main`'s `supabase/` directory is not a reliable stand-in for the backend the submitted Build 33 binary actually runs against. Concretely: **anyone auditing `origin/main` for backend completeness, RLS coverage, or schema correctness is auditing a tree that is missing at minimum the account-deletion review/worker queue, the `delete-flag` edge function, the entire `mod1` moderation/admin-report-queue feature set, the media-key read-contract migration, and the `supabase/tests/` pgTAP suite** — none of these exist on main at all, not merely under a different name. The migration-naming-convention difference (date-only + inline suffix markers vs full-timestamp + a `nonmanaged/` classification directory) is a real process divergence worth reconciling on its own, but it is the smaller of the two problems; the larger one is that main's backend is measurably behind what shipped. Both `schema.sql` files independently self-disclose that neither lineage treats that file as authoritative — the actual source of truth for either lineage's live schema is stated, in both files, to be `pg_dump` against the live project, which this read-only, no-network, no-MCP audit cannot run. See CAND-I-06 (cross-referenced from the deprecated-APIs section) and Coverage gaps.

---
