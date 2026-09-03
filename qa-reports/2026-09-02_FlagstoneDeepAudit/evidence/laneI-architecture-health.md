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
