# Quinn — Correctness review of Cycle B (R2 / T4 / F4-wire / Bulk / Export) — 2026-05-24

## Summary
21 findings across the 5 branches (3 HIGH, 9 MEDIUM, 9 LOW). Branches are fully disjoint by file and all merge cleanly into `main` (5b982ec). Verdicts: **Hold** `feat/tasks-bulk-select-2026-05-24` (Android UX bug) and `feat/data-export-2026-05-24` (false-success after share cancel); **Merge with follow-up** `feat/get-directions-2026-05-24` (duplicate-lib cleanup), `feat/reputation-tier-2026-05-24` (a11y order regression risk), and `feat/filter-presets-apply-2026-05-24` (silent cap drop + cast safety).

## Findings by branch

### R2 Get-directions (`feat/get-directions-2026-05-24`)

- **[HIGH] Duplicate / orphaned `directions.ts` + its tests left in tree** — `src/lib/directions.ts`, `src/lib/__tests__/directions.test.ts`. The branch swaps the only caller (`FlagDetailModal.tsx` line 17) from `openDirections` (in `directions.ts`) to `getDirectionsUrl` (in new `directionsLink.ts`). Repo-wide grep shows ZERO remaining callers of `openDirections` on this branch. The old lib + ~140 lines of tests are now dead code that future readers will trip over. Either delete `directions.ts` + its test file, or delete `directionsLink.ts` and patch `directions.ts` to expose a pure `buildDirectionsUrl` the modal can call. The two libs have meaningfully different semantics (old: 5-decimal precision rounding + walking-mode flag + Android pin label; new: raw passthrough + no mode flag) — the new branch SILENTLY drops both walking-mode and the Android pin label, which is a regression vs. main. Pick one canonical implementation.

- **[MED] Walking-mode flag dropped** — `src/lib/directionsLink.ts:36-38`. The old iOS URL was `maps://?daddr=...&dirflg=w`; the new one is `maps:?daddr=...` with no mode. Old web URL was `...&travelmode=walking`; new one is `...&destination=...` with no mode. AccessMap is a pedestrian-accessibility tool — defaulting to whatever the maps app last used (probably driving) is a meaningful UX regression for the core use case. The branch comment ("we leave the choice to the user's maps app") is a deliberate design choice but it reverses a prior decision encoded in `directions.ts`.

- **[MED] iOS scheme changed from `maps://` to `maps:`** — `directionsLink.ts:36`. Both are accepted by iOS, but `maps://` is what the old code used and what Apple's docs show. The single-colon form works because URL parsers treat `maps:?daddr=...` as opaque-scheme URI; the rest of the AccessMap codebase uses `maps://` consistently. Confirm intentional.

- **[MED] Android pin label dropped** — `directionsLink.ts:37`. Old code formed `geo:lat,lng?q=lat,lng(<encoded label>)`; new code drops the label. The label appears as the pin title in the Android maps chooser, so users with multiple maps apps installed lose context about what they're navigating to.

- **[LOW] `Linking.openURL` rejection — no surfaced reason** — `FlagDetailModal.tsx:471`. The new `catch { Alert.alert('Could not open maps app.') }` discards the error; the old `openDirections` showed `errorMessage(e)` plus the coordinates so a user could read out the lat/lng and copy/dictate them manually. Loss of fallback info for users who really do have no maps app.

- **[LOW] No coordinate validation** — `directionsLink.ts`. If `lat=NaN` or `lng=undefined`, the URL becomes `maps:?daddr=NaN,NaN`. The lib trusts caller — fine in practice (FlagDetailModal only opens with a real flag) but a defensive `Number.isFinite` guard would future-proof.

### T4 Reputation tier (`feat/reputation-tier-2026-05-24`)

- **[MED] Combined hero-card SR summary lost** — `src/screens/ProfileScreen.tsx:633-638`. The old card was `accessible accessibilityLabel={"X points. Y points to milestone."}` — a single focusable element with both numbers and the milestone gap. The new version drops `accessible` so the tier pill can be focused independently, but now SR users hear five separate stops (icon hidden, "POINTS", "{N} points", tier pill, milestone subtitle) instead of one consolidated announcement. The tier pill's own label re-states the point count, so users will hear the number twice. Re-consider: keep `accessible` on the View, but mark the tier pill as `accessible={true}` Pressable INSIDE — or add `accessibilityElementsHidden` to the redundant Texts.

- **[MED] Modal not scroll-wrapped** — `ProfileScreen.tsx:1233-1325`. Tier sheet is rendered as a single non-scrolling card. With dynamic type (largest a11y size), header + 4 tier rows + intro + footer can exceed small phone screens (iPhone SE landscape, 5.4"). Wrap `tierList` in a `ScrollView` to avoid the bottom footer "you're X away from..." being clipped on the smallest viewports.

- **[LOW] `accessibilityRole="text"` + `accessibilityState={{selected}}` is non-standard** — `ProfileScreen.tsx:1276-1282`. On RN web `role="text"` doesn't carry a selected state; iOS handles it as a plain string and Android may ignore. The label string already includes "Your current tier" so the visual highlight + label carry the meaning even if `selected` is dropped. Cosmetic.

- **[LOW] Tier pill SR label says "Tap to see all tiers" — wrong verb on web/Android** — `ProfileScreen.tsx:665`. RN convention is "Double-tap" (iOS VoiceOver) or "Activate" (TalkBack). Existing AccessMap rows use neutral phrasing ("Opens the X view"); keep house style.

- **[LOW] No re-announce after the modal opens** — Tier modal does not call `AccessibilityInfo.announceForAccessibility('Reputation tiers')` and does not set initial focus to the header. SR users get whatever default focus RN's Modal assigns.

- **[LOW] `accessibilityViewIsModal` is iOS-only** — `ProfileScreen.tsx:1240`. On Android the underlying ProfileScreen elements remain focusable by TalkBack while the tier modal is open. The pattern matches AboutModal so it's consistent, but worth tracking as a cross-cutting concern across the app.

- **[LOW] Mid-modal points update edge case** — works correctly. `tier` and `nextTier` are computed during render from `profile?.points`, and a profile refresh re-renders the modal because `profile` is in render scope. No bug; confirmed.

- **[LOW] Tier-boundary tests are thorough** — defensive input (null/undefined/NaN/±Infinity/negative) and exact thresholds (0/10/50/200) all covered. No off-by-one. No findings here.

### F4-wire (`feat/filter-presets-apply-2026-05-24`)

- **[HIGH] Silent oldest-preset drop at cap** — `src/lib/filterPresets.ts:171-176` + `src/screens/MapScreen.tsx:497-526`. `addPreset` silently slices the oldest entry when at `FILTER_PRESETS_MAX` (20). The MapScreen save flow calls `addPreset` then `savePresets` then announces "Saved preset: X" — the user gets a success message with no warning that the oldest preset just got rolled off. A power user at 20 presets is silently destroying older saves. Surface a confirm if `existing.length >= FILTER_PRESETS_MAX`, or include "Dropped oldest preset 'Y'" in the announce/Alert.

- **[MED] No duplicate-name check on save** — `MapScreen.tsx:485-525`. User can save two presets with the same name. The list then shows two indistinguishable rows; tapping either applies different filters. Either reject duplicates with a friendly error, or auto-suffix (" (2)") on collision.

- **[MED] Unsafe enum cast in `handleApplyPreset`** — `MapScreen.tsx:538-540`. Stored preset categories/statuses are `string[]` (intentional — lib is framework-agnostic) but the handler does `new Set(preset.categories as FlagCategory[])` — a blind cast. A preset saved when category vocab included `"old_cat"` (since renamed) will silently land in `activeCategories` and never match any flag — user sees zero results with no explanation. Filter the cast through a known-good set: `preset.categories.filter((c) => CATEGORY_ORDER.includes(c as FlagCategory))`.

- **[MED] Apply mode does not enforce a "non-empty filter" sanity check** — `MapScreen.tsx:536-545`. A preset with empty categories AND empty statuses is allowed, applies, and produces zero markers with the existing "Pick at least one status to see flags" hint. Probably fine but worth confirming the user understands an apply with empty status filter wipes the map.

- **[MED] Save button visible only when signed-in; no signed-out UX** — `MapScreen.tsx:1192`. Both `+ Save as preset` and `Load preset…` buttons live behind `{authUser && ...}`. Signed-out users see nothing in the Presets section — not even a "Sign in to save presets" prompt. Confusing if they'd noticed the section before signing out.

- **[LOW] Whitespace-only name correctly blocked** — `MapScreen.tsx:494,502`. Trim then length-zero check is correct. Trailing-only spaces are stripped (good).

- **[LOW] `presetSummary` refactor is behavior-identical** — old inline `summarize` and new exported `presetSummary` return the exact same string for all inputs. Tests added cover empty/single/multiple categories and confirm status doesn't affect output. Confirmed safe extraction.

- **[LOW] Manager-mode `onApply` undefined path preserved** — when called without `onApply`, the rows show the "Wiring next release" hint and no Apply button. Confirmed working.

- **[LOW] `FilterPresetsModal` Modal does not have `onRequestClose`** — not relevant in this diff but worth noting for a future polish pass. (Did not change in this branch.)

### Tasks bulk-select (`feat/tasks-bulk-select-2026-05-24`)

- **[HIGH] `contentInset` is iOS-only — last card hidden under bulk bar on Android** — `src/screens/TasksScreen.tsx:647`. `contentInset={{bottom: BULK_BAR_HEIGHT}}` is honored on iOS SectionList but Android ignores it. On Android in selection mode, the last card sits behind the 88pt floating bar with no way to scroll past it. Use `contentContainerStyle={{paddingBottom: BULK_BAR_HEIGHT}}` (cross-platform) or add a separate `paddingBottom` prop wrapped in `Platform.OS === 'android'`.

- **[MED] Selection state PERSISTS across tab changes — comment claims otherwise** — `TasksScreen.tsx:155-158`. The comment says "Switching tabs unmounts TasksScreen which resets the selection" but `RootNavigator.tsx` uses `createBottomTabNavigator` with no `lazy` or `unmountOnBlur` option — bottom tabs keep all screens mounted by default. Real behavior: user enters selection mode, switches to Map to verify something, switches back to Tasks — still in selection mode, same items selected. Either (a) add `unmountOnBlur` to the Tasks tab, (b) wire a `useFocusEffect` to `exitSelection` on blur, or (c) update the comment + tell users this is intentional. Pick one.

- **[MED] Cancel button disabled during bulk action — no escape from a slow run** — `TasksScreen.tsx:706-715`. `disabled={bulkBusy}` on Cancel means a user firing "Resolve 20 flags" with a slow network has zero way to abort. The sequential loop has no `AbortController`. For N=20 with 500ms per call, that's 10 seconds of frozen UI with all bar buttons disabled. Either keep Cancel enabled and have it set a `cancelledRef.current = true` flag that the loop checks between iterations, or stage the work in a single bulk-update RPC.

- **[MED] Sequential update loop — N round-trips, no partial-failure UX** — `TasksScreen.tsx:262-276`. Each flag updates one at a time. If flag #3 fails (network blip), flag #4 still attempts; failures accumulate into `failures[]` and only the FIRST error message is shown in the Alert. So a user resolving 10 flags with 3 transient failures sees "Resolved 7 flags" toast + "Could not resolve 3 flags: Network request failed" but no list of WHICH 3 failed — they have to scan the list. Either show the failed-id list, or batch via a single Supabase RPC.

- **[MED] Bar `accessibilityLiveRegion="polite"` doesn't re-announce on count change** — `TasksScreen.tsx:653`. RN's live region re-reads when *text content* inside the View changes, but the count appears in the button's `accessibilityLabel`, not in a visible Text wrapped by the live region. So toggling cards after entering selection mode doesn't get SR confirmation. The initial "Selection mode. N selected." announcement (`announcedBarRef`) only fires once.

- **[MED] FlagCard tap-handler tap-vs-longpress race** — `TasksScreen.tsx:629-640`. RN distinguishes onPress/onLongPress by 500ms timer, but on some Android devices the press still fires before long-press resolves. User tries to long-press to enter selection mode → may instead navigate to map (single tap → `handleViewOnMap`). Common pattern: `delayLongPress={250}`.

- **[LOW] Selection-mode card hint copy** — `TasksScreen.tsx:865-870`. "tap to deselect" / "tap to select" is fine but inconsistent with the bar's "Verify"/"Resolve" copy (no period; lowercase). Cosmetic.

- **[LOW] `selectedOpenCount` recomputed on every flag-store change** — `TasksScreen.tsx:163-170`. Uses `flags.find` in a loop (O(n*m)). For n=20 selected and m=200 flags that's 4000 iterations on every realtime tick. Replace with a `Map<string, FlagRow>` if perf measurement shows it matters. Probably premature.

- **[LOW] Tests cover taskSelection lib thoroughly** — toggle round-trip, ordering, idempotency, defensive immutability — no gaps. No findings on the pure helper.

### Data export (`feat/data-export-2026-05-24`)

- **[HIGH] False success after user cancels iOS share sheet** — `src/screens/SettingsScreen.tsx:218-220`. On iOS, when the user dismisses `Share.share` without picking an action, the promise resolves with `{action: 'dismissedAction'}` — it does NOT throw. The code unconditionally calls `Alert.alert('Data exported', successMsg)` after the await. User cancels share → app falsely confirms "Exported N flags + M feedback items to your clipboard" with nothing on the clipboard. Inspect the resolved value: `const result = await Share.share(...); if (result.action === Share.dismissedAction) return;`.

- **[MED] Spec deviation: native uses `Share.share`, not clipboard** — `SettingsScreen.tsx:212-220`. Spec asked for clipboard handoff; agent fell back to `Share.share` because `expo-clipboard` isn't installed. RN `Clipboard` from `@react-native-clipboard/clipboard` IS available in many Expo setups but isn't installed here either. The agent's choice is reasonable (share sheet gives Copy + Mail + Notes etc.) but the success message says "Copied to your clipboard" which is misleading on native — the user actually got a share sheet. Match the copy to the actual action: "Exported via share sheet" or similar.

- **[MED] `listFeedbackByUser` swallows ALL errors including auth** — `src/lib/feedbackStore.ts:91-100` + `SettingsScreen.tsx:191`. The helper returns `[]` for any error (table missing, RLS denied, expired token, network). If user's auth has silently expired, export shows 0 feedback rows without warning. PIPEDA right-of-access concern: an incomplete export presented as complete is worse than a clear failure. Distinguish "table not found" (silent OK) from "auth/network error" (surface to user). This is a feedbackStore-side fix, but the export is the consumer making it visible.

- **[MED] `listFlagsByUser` capped at 200 — silent truncation** — `src/lib/flags.ts:73-83`. Power user with 250 flags exports only the latest 200. No cap-reached banner. PIPEDA right-of-access concern: not a complete record. Add a "+ 50 older flags not shown" line in the export, or paginate.

- **[LOW] Pluralization "1 flags"** — `dataExport.ts:97` + tests at line 124. `lines.push(\`REPORTS (${sortedFlags.length} flags):\`)` always pluralizes — single flag renders as "1 flags". Test explicitly locks in the bad output. Use `${n} flag${n === 1 ? '' : 's'}`.

- **[LOW] Multi-line description rendering** — `dataExport.ts:117`. A description containing `\n` is rendered as `    {desc}` — the first line is indented 4 spaces, subsequent lines start at column 0. Hurts readability on multi-paragraph descriptions. Pre-process: `desc.split('\n').map(l => '    ' + l).join('\n')`.

- **[LOW] No confirm before export** — `SettingsScreen.tsx:145-225`. Single tap fires the share sheet / clipboard write. Accidental taps annoying but harmless.

- **[LOW] Web fallback to `window.alert(text)` could be ~10KB+** — `SettingsScreen.tsx:206-208`. A user with 200 flags + a 1KB description per flag would generate a ~200KB string dumped into an alert. Most browsers truncate. Add a length cap or fall back to a textarea-in-DOM pattern.

- **[LOW] Tests are thorough** — header, profile fallbacks, all categories, all severities, all statuses, ordering, both feedback states (undefined vs []), timezone determinism. Excellent coverage modulo the pluralization assertion above.

## Cross-branch patterns

- **Zero file-overlap between the 5 branches.** All five merge cleanly into main (verified via `git merge-tree --write-tree`). No new test from any branch breaks because the shared lib changes (F4-wire's `presetSummary` add) are additive and not imported by any other branch.
- **Recurring a11y smell**: 3 of 5 branches (T4, Bulk, Export) make non-trivial accessibility decisions (live regions, `accessibilityViewIsModal`, `accessibilityState`, removed `accessible`) that aren't covered by tests. Worth a dedicated Alex pass post-merge.
- **Recurring "pluralize this string" gap**: T4 ("1 point" / "points" is handled correctly inside reputationTier.tsx but the modal footer string is `${gap} ${gap === 1 ? 'point' : 'points'}` — good), Bulk ("Verified 1 flag" is handled correctly), Export ("1 flags" is broken). Inconsistent.
- **Recurring "silent success obscures partial failure" pattern**: F4-wire (cap drop), Tasks bulk (partial failures only first message shown), Export (cancelled share + swallowed feedback errors). Theme: optimistic confirmation copy without inspecting the underlying result.
- **Recurring iOS-only API used without Android branch**: `contentInset` (Bulk), `accessibilityViewIsModal` (T4), `maps:` scheme behavior (R2). All three need a TODO or a Platform.OS gate.

## Merge verdict

| Branch | Verdict | Reason |
|---|---|---|
| `feat/get-directions-2026-05-24` | **Merge with follow-up** | Functional regression (lost walking-mode + Android label) and dead code (old `directions.ts` orphaned). Land if Sky accepts the "pure handoff, no mode flag" design choice; otherwise revise before merge. |
| `feat/reputation-tier-2026-05-24` | **Merge with follow-up** | Tier math is solid (tests excellent). A11y order regression on heroCard is a noticeable change in SR experience — re-validate before launch. No correctness bugs in tier logic. |
| `feat/filter-presets-apply-2026-05-24` | **Merge with follow-up** | Wire works. Silent oldest-drop at cap is the biggest risk — surface a warning before/after. Enum cast safety needed for cross-version preset durability. |
| `feat/tasks-bulk-select-2026-05-24` | **HOLD** | Android `contentInset` bug is blocking — last card unreachable in selection mode on Android. Cancel-during-busy also UX-blocker. Fix both before merge. |
| `feat/data-export-2026-05-24` | **HOLD** | False-success on iOS share-cancel is a correctness bug AND a trust bug (user thinks they exported when they didn't). Fix the `Share.share` result inspection before merge. |

## Polish tickets (priority order)

1. **[Tasks bulk]** Replace `contentInset` with cross-platform `contentContainerStyle={{paddingBottom: BULK_BAR_HEIGHT}}` so the last card isn't hidden on Android.
2. **[Data export]** Inspect `Share.share` result on native — only show "Data exported" Alert when `result.action !== Share.dismissedAction`.
3. **[R2]** Delete the orphaned `src/lib/directions.ts` + `src/lib/__tests__/directions.test.ts`, OR delete the new `directionsLink.ts` and use the existing `buildDirectionsUrl`. Pick one canonical path.
4. **[R2]** Decide on walking-mode default. Re-add `&dirflg=w` (iOS) and `&travelmode=walking` (web) if AccessMap's pedestrian focus is unchanged.
5. **[Tasks bulk]** Add `useFocusEffect` to clear selection on tab blur (or fix the misleading comment claiming auto-unmount).
6. **[F4-wire]** Surface a warning in the save flow when `existing.length >= FILTER_PRESETS_MAX`. Either confirm-before-save or include "Dropped oldest preset 'Y'" in the success announcement.
7. **[F4-wire]** Filter the enum cast in `handleApplyPreset` so renamed/removed categories don't silently slip through.
8. **[Tasks bulk]** Keep Cancel button enabled during bulk action; check a `cancelledRef` between loop iterations so users can abort a slow N-flag run.
9. **[Data export]** Fix the "1 flags" pluralization (and update the test that locks it in).
10. **[Data export]** Surface a banner when `listFlagsByUser` returns 200 (cap hit) so the export is honest about completeness.
11. **[T4]** Wrap tier modal content in a ScrollView for dynamic-type / small-screen safety.
12. **[T4]** Reconsider the dropped combined `accessible` label on heroCard — current setup causes the points number to be announced twice (once on heroValue Text, once inside the tier pill label).
13. **[F4-wire]** Reject duplicate preset names with a friendly error, OR auto-suffix " (2)".
14. **[Tasks bulk]** Switch sequential bulk loop to a single Supabase RPC or `Promise.all` (with per-item error capture) once partial-failure UX is improved.
15. **[Tasks bulk]** Add `delayLongPress={250}` to FlagCard's Pressable so Android long-press is more reliably distinguished from tap.

