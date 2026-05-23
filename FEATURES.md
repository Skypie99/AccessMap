# AccessMap — feature backlog

The next things to build, ordered roughly by value vs. cost. One vertical
slice per item. Keep each spec to a single sentence — flesh it out only
when you (or an agent) picks it up.

This file is the source of truth for what to build next. If something is
"in progress" or "shipped (unmerged)", note it inline; remove items once
they land on `main`.

---

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

- **Marker clustering on the Map.** Cluster pins when more than ~50 are
  in the viewport so pan/zoom stays smooth at high density. Native: wrap
  `MapView` with `react-native-map-clustering`. Web: hand-roll with
  `supercluster` (react-leaflet has no native primitive). Adds two
  runtime deps — DECISIONS FOR SKY. Detailed plan in
  `qa-reports/qa-2026-05-22.md` P4.
- **Realtime flag updates — client merged to main, awaiting one SQL run.**
  `FlagsProvider` subscribes to `public.flags` and merges incoming
  INSERT/UPDATE/DELETE deltas through a pure helper
  (`src/lib/flagsRealtime.ts`, 11 unit tests). Currently a no-op —
  becomes live the moment **Sky runs
  [`supabase/realtime.sql`](supabase/realtime.sql)** in the Supabase
  dashboard SQL editor (one button-press, idempotent). After that,
  flags created/triaged on one device appear on others without a refresh.

## Next (this month)

- **Default-filter-set on launch — shipped on
  `feat/default-filter-set-2026-05-23` (unmerged).** Long-press a saved
  chip → action sheet with Make/Remove default, Delete, Cancel. The
  default chip shows a ★ prefix and its accessibilityLabel announces
  "default on launch". On mount the default's filters override the
  last-toggled mapFilters; a dangling pointer falls back silently and
  `deleteSet` cascades the pointer clear. 8 new unit tests cover the
  pointer + cascade.
- **Distance test coverage.** `src/lib/distance.ts` doesn't have a
  test file yet (Loop 5 didn't add one). Add one when Jest is in.
- **Address search / jump-to.** Geocoded address bar at the top of
  Map; tapping a result animates the map there.
- **Wire `accessmap://flag/{id}` deep-link handler.** Share button
  (shipped 2026-05-23 fastloop) emits this URL; the in-app handler
  isn't there yet. Add an `expo-linking` listener that maps the URL
  to the Map tab with `{focusFlag: { id, lat, lng }}` — reuses the
  existing route param.

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
