# AccessMap — feature backlog

The next things to build, ordered roughly by value vs. cost. One vertical
slice per item. Keep each spec to a single sentence — flesh it out only
when you (or an agent) picks it up.

This file is the source of truth for what to build next. If something is
"in progress" or "shipped (unmerged)", note it inline; remove items once
they land on `main`.

---

## Merged to main (2026-05-24) — complete

All four branches merged in order (stabilization → Cycle E → a11y/signin → a11y/contrast).

- **`chore/stabilization-2026-05-24`** (`c02a59f`) — Post-build polish:
  15-file hex-literal → theme-token migration (dark-mode prerequisite),
  ProfileScreen sign-out confirm(), filterSets/filterPresets deprecation
  comments, error-handling tier policy in CLAUDE.md. 0 TS errors · 673 tests.

- **Cycle E — `cycle/E-2026-05-24`** (`475cb6c`) — 5 features + QA polish.
  Merged after stabilization. 0 TS errors · 690 tests.
  - `color.placeholderText` AA token (#5b6470, 4.5:1+) + 6 callsites
  - Default filter set applied on launch (was wired but never fired)
  - `decorativeProps` helper in `src/lib/accessibility.ts` + sweep
  - Tasks "All/Mine" scope persisted device-wide (`tasksScope.ts`) + race guard
  - `SearchInputRow` reusable component — HelpModal + NearbyFlagsModal refactored
  - QA polish: SearchInputRow `wrapStyle` prop (H1), scope hydration race (H2),
    star chip `accessibilityElementsHidden` (M1), `resolvedAccent` importantForAccessibility (M2)

- **`a11y/signin-a11y-2026-05-24`** (`3d578c5`) — SignInScreen accessibility:
  visible field labels, border contrast `#ccc`→`#666` (5.7:1), placeholderTextColor,
  `accessibilityRole="header"` on title. 1 file. 0 errors · 673 tests.

- **`a11y/contrast-touch-sweep-2026-05-24`** (`ee86a38`) — Two component fixes:
  FlashBanner success green `#27ae60`→`#1e8449` (AA pass), UpdateBanner "View"
  button minHeight 36→44px + fontSize 13→14, remove duplicate `accessibilityLiveRegion`
  on the banner Pressable. 2 files. 0 errors · 673 tests.

---

## Parked on branches (2026-05-23) — awaiting Sky merge

These are committed on independent branches off `main`, all gates
green. See `qa-reports/cycle-r7-r9-handoff-2026-05-23.md` for details.

- **R7 — Tasks screen sort options** (`feat/tasks-sort-2026-05-23` ·
  `e4e7cb6`). Segmented control above the SectionList: Newest / Oldest
  / Severity. Sort applies WITHIN each section so the Open-first
  grouping stays intact. Persisted device-wide via
  `@accessmap/tasks_sort_v1`. +18 tests.
- **R8 — Map long-press to drop a flag**
  (`feat/map-longpress-drop-2026-05-23` · `0bc2b81`). Long-press anywhere
  on the map → confirm prompt → ReportFlagModal opens with that coord
  pre-filled. Native: `MapView.onLongPress`. Web: Leaflet `contextmenu`
  (right-click on desktop, long-touch on mobile browsers). Existing
  GPS-FAB flow untouched.
- **R9 — Profile nearest-unresolved jump**
  (`feat/profile-nearest-flag-jump-2026-05-23` · `1f31d06`). New
  pale-blue card on Profile (between streak hero + status breakdown)
  showing the nearest open/verified flag with category + severity +
  distance. Tap → Map tab centered on that flag, callout open. Hidden
  when no location or no open flags. New `src/lib/nearestFlag.ts` pure
  derivation + 9 tests.

## Shipped 2026-05-23 evening (merge-on-done loop)

- **What's New / Changelog modal.** New "What's New" row in Profile
  opens a slide-up modal listing shipped features grouped by date,
  each release with a date badge + headline + bulleted user-visible
  changes. Inline RELEASES array in
  `src/components/ChangelogModal.tsx` — adding a release is a single
  array prepend.
- **Tasks screen polish.** Screen wash (#f7f9fc), `SectionList`
  with Open / Verified sections (count pill per header, empty
  sections omitted), and a friendlier "All caught up ✨"
  empty-state card. No behavior changes to the card actions.
- **Address search via Nominatim.** New 🔍 button at the front of
  the Map's top action bar opens a slide-up search sheet. 350ms
  debounced calls to OpenStreetMap's Nominatim geocoder, results
  list (up to 5), tap to animate the map to the chosen location at
  neighborhood-scale zoom. Pure parser exported for testing (8 new
  geocode tests + 7 search tests = 15 total in
  `src/lib/__tests__/geocode.test.ts`).

**Process change applied this loop:** merge-on-done — each branch
landed to main as soon as it hit green (no conflict, typecheck OK,
jest OK, no protected paths). Three back-to-back clean merges, no
manual conflict resolution.

## Shipped 2026-05-23 (fastloop v3 — feedback focus)

- **Feedback categories.** FeedbackModal grew a 4-chip radio group
  (Bug / Idea / Love / Other, default 'Idea'). Pick lands in the
  email subject ("AccessMap feedback: Bug") and as a "Category: …"
  prefix in the body so the maintainer's inbox can triage at a glance.
- **Supabase feedback table + dual-write** (migration propose-only).
  `supabase/migrations/2026-05-23_feedback_table.sql` adds
  `public.feedback` with category enum, body length check,
  contact_email regex, indexes, and 4 RLS policies
  (insert-self-or-anon, select-own, select-maintainer, delete-own).
  FeedbackModal fires the insert in parallel with the mailto: — the
  insert is best-effort and silently degrades to `'skipped'` until
  the migration runs. After the migration, server-side tracking
  lights up with zero client change.
- **My Feedback page.** New `MyFeedbackModal` accessed from a Profile
  row (sibling to My Reports + About). Lists the user's past feedback
  rows from the new table, newest first, with category pill + date +
  body preview. Gracefully shows an empty state when the migration
  hasn't been applied or the user hasn't sent anything.
- **Help & FAQ page.** New `HelpModal` with 7 collapsible Q&A items
  (reporting, points, verified vs resolved, photo privacy, screen
  readers, deleting a report, filter-hiding). Footer brand-soft card
  links straight to the mail composer. Adding more questions is a
  one-line append to the FAQS array.

**Migration order for this loop:** `2026-05-23_feedback_table.sql`
(Sky-applied; required for My Feedback to show content and for
server-side feedback tracking — until then, dual-write silently
skips and mailto: handles delivery).

## Shipped 2026-05-23 (fastloop v2 — visual polish + pages)

- **Branded tab headers + global Feedback flow.** Default white
  header strip replaced with a brand-blue bar showing the tab name +
  a "Feedback" pill in headerRight on every tab. Tap opens a
  `FeedbackModal` (`src/components/FeedbackModal.tsx`); Send hands
  off to the OS mail composer via mailto: (no backend). On platforms
  with no mail client, the address is surfaced inline.
  Helper: `src/lib/feedback.ts` (`buildMailtoUrl`, `sendFeedback`,
  `openFeedbackComposer`) with 7 unit tests.
- **About AccessMap modal.** New "More about the app" surface,
  accessed from a row near the bottom of Profile. Sections: what it
  is, accessibility statement, community guidelines, maker note.
  Auto-pulls app version from `expo-constants`. "Send feedback"
  button hands straight to the OS mail composer. Sets up the
  "more pages" pattern — future Privacy/Help/Credits drop in as
  additional Profile rows + modals, no nav refactor.
- **Profile hero card + screen wash.** Replaced the small flat
  points pill with a brand-blue hero card: 56pt numeric, 🏅 icon,
  drop shadow that lifts it off the page, and a progress bar to the
  next milestone (25 → 50 → 100 → 250 → 500 → 1000 points, each tied
  to a notional badge name). Screen background changed from white to
  `#f7f9fc` so the inner white cards actually read as cards.
- **Map top-row grouped action bar.** The four floating icon buttons
  (legend / filters / refresh / recenter) are now wrapped in one
  elevated white actionBar with internal dividers. Reads as a single
  tool tray rather than four free-floating circles. No behavior
  changes — every existing tap and label is preserved.

## Now (next 1–2 runs)

- **Merge the 2026-05-24 branch queue (DECISIONS FOR SKY).** Four branches
  ready to land, in order (see "Parked on branches (2026-05-24)" above):
  stabilization → cycle/E → a11y/signin → a11y/contrast. All gates green.
- **Apply Supabase migrations (DECISIONS FOR SKY).** Five migrations in
  `supabase/migrations/` unlock T1 (status history) and C4 (context tags);
  `supabase/realtime.sql` activates live flag updates. Apply via Dashboard
  SQL Editor.
- **Marker clustering — DECISION FOR SKY.** Needs two new runtime deps
  (`react-native-map-clustering` + `supercluster`). Detailed plan in
  `qa-reports/qa-2026-05-22.md` P4. Approve deps to unblock Shamus.
- **Dark mode Phase 2 — DECISION FOR SKY.** Architecture choice required:
  Option A (useThemeColors hook, ~30 files, best long-term) vs Option B
  (root overlay, brittle for complex UIs). All tokens are in place —
  this is purely an architectural preference before Shamus builds.

## Cycle F — after Cycle E merges to main

These are pre-scoped, no blocking decisions needed (except dark mode):

1. **Dark mode Phase 2** — after Sky picks Option A or B above.
2. **Marker clustering** — after Sky approves deps above.
3. **`placeholderTextColor` sweep — 8 remaining TextInputs** (Quinn L3/L4):
   SignInScreen (2, now fixed via a11y/signin branch), ReportFlagModal (1),
   MapScreen (2), FilterPresetsModal (2), SavedPlacesModal (1).
4. **`sevDot` decorativeProps** — TasksScreen FlagCard severity dot needs
   `{...decorativeProps}` (Quinn L3, pre-existing, one-liner per file).
5. **SearchInputRow in MyReportsModal + AddressSearchModal** — 2 of 4
   modals migrated in cycle/E; these 2 remain.
6. **`SearchInputRow` TextInput `accessibilityHint`** — Quinn L4; add hint
   text like "Type to filter flags by keyword" to the TextInput inside
   SearchInputRow.
7. **`color.placeholderText` contrast test for `surfaceSoft`** — Quinn L1;
   add a theme.test.ts assertion verifying contrast on `#f7f8fa`.
8. **Flag editing** — reporter can edit open flag description/severity.
   Jordan trigger fires (RLS + user data edit) — needs Jordan review first.

## Later (sequence after the above)

- **Offline / PWA support.** Cache recent flags + the OSM tiles seen
  recently so the app works on a flaky connection.
- **Push notifications on flag updates.** Reporter learns when their
  flag is verified or resolved. Requires an Edge Function + push token
  storage — DECISIONS FOR SKY.

## Shipped recently (2026-05-23)

All items below merged to `main`. Not back-listed unless something
broke.

- Categories / severity legend on the Map.
- Persistent flag-load error banner on the Map.
- Filter flags on the Map by status.
- Accessible list view of nearby flags + auto-open for screen readers.
- Profile editing (display name, default tab, prefer-list-view).
- Reporter points toast on triage.
- My Reports view from Profile.
- Flag detail modal in Tasks.
- Photo lightbox.
- Shared FlagsProvider with `setStatuses` + optimistic helpers
  (`patchFlag` / `removeFlag`) + stale-fetch race protection + iOS
  screen-reader error announce.
- Tasks tap-to-retry error banner (replaces one-shot `Alert.alert`).
- Backported `errorMessage()` helper consolidating ~11 catch-block sites.
- **Persist Map filters across app launches** (Loop 2).
  `src/lib/mapFilters.ts` + hydration gate in MapScreen.
- **Distance + ETA on Tasks cards** (Loop 5). `src/lib/distance.ts` +
  `src/lib/location.ts` (`useUserLocation` hook). NearbyFlagsModal also
  rewired to the shared util.
- **Saved named filter sets** (Loop 4). `src/lib/filterSets.ts` + UI
  row in the Map filter panel. Cap of 5 sets, tap to apply, long-press
  to delete.
- **Jest + jest-expo test runner.** 119 tests across 9 suites pass on
  `npm test` (errors, flags, onboarding, points, preferences,
  severityColor, mapFilters, filterSets, flagsRealtime).
  `tsconfig.json` no longer excludes the `__tests__/` tree so tests
  type-check too.
- **Realtime flag updates — client merged to main.** Dana scheduled
  agent's `feat/realtime-flag-updates-2026-05-23` lands the
  `FlagsProvider` subscription + `flagsRealtime.ts` merge helper +
  proposed data-layer hardening migrations. No-op until
  `supabase/realtime.sql` is applied (see Now tier).
- **Map empty-state card** (fastloop 2026-05-23). Floating card on
  the Map when active filters return zero results, with a one-tap
  "Reset filters" button. iOS-announces appearance on transition.
- **Collapsible filter panel** (fastloop 2026-05-23). Chevron in the
  filter-panel header collapses Saved/Categories/Severity/Status into
  just the title row. Collapsed state persists across launches via
  `src/lib/filterPanelPrefs.ts` (device-wide key).
- **Severity quick-cycle button** (fastloop 2026-05-23). New
  "{n}+" button in the top icon row cycles `1+ → 2+ → 3+ → 4+ → 5+`
  on tap; background tints to that severity's color when active.
  Announces the new threshold to screen readers on each tap.
- **Share-a-flag** (fastloop 2026-05-23). Share button on the Flag
  Detail modal opens the OS share sheet (iOS/Android) or uses
  navigator.share / clipboard fallback (web). Message is self-contained
  (category, severity, coords) + an `accessmap://flag/{id}` link
  (handler is a follow-up in Next tier).

## Conventions

- Born accessible — labels, roles, contrast, 44pt targets, reduced motion.
- Match the existing patterns: screens in `src/screens/`, data in
  `src/lib/`, map only through `PlatformMap`, types use `type` (not
  `interface`).
- Schema / RLS / new-dependency / auth changes are **propose-only** —
  never apply them silently.

## Process notes

- **Parallel-agent worktree paths.** When the orchestrator spawns
  multiple agents at once, each one MUST stay in its own worktree —
  see [`qa-reports/parallel-agent-worktree-rules.md`](qa-reports/parallel-agent-worktree-rules.md)
  for the rule, the footgun, and the pre-write verify step.

## Fastloop v4 (evening, 2026-05-23) — F5 + F6

- **Watched Flags** (F5, fastloop 2026-05-23). Users can now watch any
  flag from its detail modal. A star pill (`☆ Watch` / `★ Watching`) sits
  above the secondaryRow; tapping it toggles via AsyncStorage per-user
  keyed store. Profile → Watched Flags list shows all watched flags sorted
  by status (open/verified first), each with its current status badge so
  changes are visible at a glance. Tapping a row reopens FlagDetailModal.
  Amber ★ button on each row unwatches instantly (optimistic). Max 200
  watched flags; oldest is dropped FIFO on overflow. 17 new tests in
  `src/lib/__tests__/watchedFlags.test.ts`.

- **Category quick-cycle button** (F6, fastloop 2026-05-23). New ⊕ /
  category-icon button between the severity (N+) and refresh (⟳) buttons
  in the Map top action bar. Pressing it cycles the category filter through
  the full sequence: All → No ramp → Broken sidewalk → Blocked path →
  Missing signal → Steep grade → Other → All. Shows the matching
  CATEGORY_ICONS glyph and fills brand-blue when a solo category is active.
  Announces the new filter to screen readers on each tap.
