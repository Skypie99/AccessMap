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

Every disable in this list targets one of three well-understood categories: (1) `require()` for conditionally-loaded native modules (push notifications, haptics — standard Expo pattern for optional native deps), (2) intentional `console.*` in dev-diagnostic paths, (3) the same explicit-`any` boundary crossings already inventoried above. Four `react-hooks/exhaustive-deps` suppressions (TasksScreen, MapScreen, LiveStatusRegion, FlashBanner) are the ones most worth re-verifying by hand, since a suppressed exhaustive-deps warning is exactly the shape of bug that produces stale-closure defects — see CAND-I-04.

---
