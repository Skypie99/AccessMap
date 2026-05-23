# AccessMap — feature backlog

The next things to build, ordered roughly by value vs. cost. One vertical
slice per item. Keep each spec to a single sentence — flesh it out only
when you (or an agent) picks it up.

This file is the source of truth for what to build next. If something is
"in progress" or "shipped (unmerged)", note it inline; remove items once
they land on `main`.

---

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

- **Default-filter-set on launch.** With saved sets in place, let the
  user mark one as the default so the app opens to that view instead of
  the last-toggled state.
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
