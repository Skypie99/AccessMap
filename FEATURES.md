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
- **Persist Map filters across app launches.** Cache `activeCategories`,
  `minSeverity`, and `activeStatuses` in `AsyncStorage` so reopening the
  app preserves the user's last view.
- **Install Jest so the existing `src/lib/__tests__/` tests can run.**
  The 6 test files (errors, flags, onboarding, points, preferences,
  severityColor) ship with main but there's no `jest` devDep or `test`
  script in `package.json`. See `qa-reports/proposal-jest-setup-2026-05-23.md`
  for the install steps. DECISIONS FOR SKY (devDep + standardizes a
  dev workflow).

## Next (this month)

- **Realtime flag updates.** Subscribe to Supabase realtime channel for
  `public.flags` so a flag created/triaged on one device appears on
  others without a manual refresh. Requires the realtime publication
  SQL (DECISIONS FOR SKY) and a small extension to `FlagsProvider` to
  merge incoming row deltas.
- **Saved named filter sets.** Depends on filter persistence above.
  Let users name a filter combo ("downtown commute", "park paths") and
  tap to switch between them.
- **Distance + ETA on Tasks cards.** Show how far each flag is from
  the user's current location. Hoist the haversine logic out of
  `NearbyFlagsModal` into `src/lib/distance.ts` and reuse.

## Later (sequence after the above)

- **Address search / jump-to.** Geocoded address bar at the top of
  Map; tapping a result animates the map there.
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
- 6 unit test files in `src/lib/__tests__/` (Jest install pending).

## Conventions

- Born accessible — labels, roles, contrast, 44pt targets, reduced motion.
- Match the existing patterns: screens in `src/screens/`, data in
  `src/lib/`, map only through `PlatformMap`, types use `type` (not
  `interface`).
- Schema / RLS / new-dependency / auth changes are **propose-only** —
  never apply them silently.
