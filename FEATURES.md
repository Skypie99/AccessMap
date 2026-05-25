# AccessMap — feature backlog

The next things to build, ordered roughly by value vs. cost. One vertical
slice per item. Keep each spec to a single sentence — flesh it out only
when you (or an agent) picks it up.

This file is the source of truth for what to build next. If something is
"in progress" or "shipped (unmerged)", note it inline; remove items once
they land on `main`.

---

## Parked on branches — awaiting Sky merge

### Parked (2026-05-25)

- **`fix/dani-statushistory-darkmode-2026-05-25`** — StatusHistoryModal
  background `'#fff'` → `color.surface`; `list`/`listitem` ARIA roles added
  for web a11y.

- **`a11y/full-sweep-2026-05-25`** — Full a11y sweep; WIP/stashed. Includes
  MyReportsModal chip tap-target fix (44pt). Unblock by finishing the cluster
  + edit-form a11y items documented in
  `qa-reports/2026-05-25_Alex_a11y-audit.md`.

### Parked (2026-05-24)

- **`feat/decorative-glyph-2026-05-24`** (`ff44775`) — `decorativeProps` sweep
  over 9 broken/stale callsites. Clean single commit; no conflicts expected.

---

## Later (sequence after the above)

- **Leaflet tile interception.** Wire `tileCache.ts` into `PlatformMap.web.tsx`
  using `L.TileLayer.extend` + canvas→base64 so web tiles survive offline.
  Pseudo-code in `qa-reports/2026-05-25-shamus-offline-tiles.md`.

- **Neighbourhood heat-map layer.** Overlay a colour-density grid on the map
  based on flag density so users can spot high-risk corridors at a glance.
  **Jordan pre-review required** (location + disability data, Const. Art. 7).

- **react-native-maps tile interception.** Native URLSession/OkHttp override to
  wire `tileCache.ts` into `PlatformMap.tsx`; requires managed-workflow ejection
  or a native module.

---

## Shipped 2026-05-25 — Wave 4 (later commits)

- **Photo thumbnails inline in Tasks triage.** `FlagCard` renders the submitted
  photo as an inline thumbnail inside the triage flow. (`a24b44a`)
- **`flagsMap` O(1) lookups.** `useMemo`-derived `flagsMap` replaces linear
  scans across the flags array; keyed by flag ID. (`ef7a215`)
- **`renderItem` useCallback memoization + status history data layer.**
  `renderItem` in `TasksScreen` is stable across renders; `FlagsProvider`
  extended with status-history query support. (`582b1c4`)
- **A11y residuals — 3 items.** `MapScreen` `announceForAccessibility` on filter
  change; `useReducedMotion` guard in both `PlatformMap` variants; web photo
  `alt` text on `FlagCard` thumbnails. (`673e296`)
- **Offline tile cache foundation.** `tileCache.ts` — TTL/LRU eviction, sign-out
  clear. Cache layer is shipped; tile interception (Leaflet + native) is
  propose-only (see Later). (`9597c31`)
- **ESLint + Prettier config.** Lint and format rules added to the repo.
  (`52fb592`)
- **Jest open-handles fix.** Test suite exits cleanly; no dangling async handles.
  (`a42518a`)
- **LEARNINGS.md sequential merge/build rule.** Concurrent-agent worktree
  isolation rule documented.
- **Design tokens.** `size.thumb`, `size.cardMin`, `backdropStrong`,
  `backdropCaption`, `overlayBtn` added to the token set.
- **TasksScreen renderItem memoization.** `renderItem` wrapped in `useCallback`
  to prevent unnecessary re-renders on list updates. (`582b1c4`)
- **Flag status timeline UI.** Flag detail modal shows a chronological status
  history strip (graceful degradation — hides if no history data). (`582b1c4`)
- **Cycle F — F1/F2/F4 complete.** `placeholderTextColor` sweep (remaining
  inputs), `sevDot` `decorativeProps`, and `surfaceSoft` WCAG AA contrast
  unit assertion all on main. (`ef2b717`, `e85cf82`)

## Shipped 2026-05-25 — Wave 4

- **Offline Cache (AsyncStorage persistence).** `FlagsProvider` persists flag
  data to AsyncStorage with a 24 h TTL and a user-scoped cache key. App shows
  stale data gracefully when offline; cache clears on sign-out. No migration
  required.
- **Push Notifications (opt-in).** Expo push token stored in a new
  `push_tokens` table (migration propose-only). Opt-in flow with in-app
  explanation, Settings toggle to enable/disable, and token cleared on
  sign-out. Edge Function `notify-flag-status` fires on flag status change;
  notification content: "Your [category] flag was [verified/resolved]."
  **Requires Sky action before production use:** apply the `push_tokens`
  migration, deploy the `notify-flag-status` Edge Function, and run
  `npx expo install expo-notifications`.
- **Centralised `signOut(userId)` cleanup.** Clears offline cache + push token
  before the Supabase auth sign-out, ensuring no stale data or orphaned tokens
  remain after a session ends.
- **CI/CD GitHub Actions.** Typecheck + test runs on every push and PR.
  (`e243498`, `b1450f9`)
- **Remaining `#999` → `color.textSubtle` callsites.** Final a11y colour-token
  sweep; all raw `#999` literals replaced. (`e243498`)
- **LEARNINGS.md sequential merge/build rule.** Concurrent-agent worktree
  isolation rule documented. (`9a3dca9`)
- **Flag pagination (Load More).** Cursor-paginated `listFlagsPage` fetcher,
  `hasMore`/`loadMore`/`loadingMore` in `FlagsProvider`, "Load More" footer in
  `TasksScreen`. (`feat/flag-pagination-2026-05-25` → `d1e2123`)

---

## Shipped 2026-05-25

All items below merged to `main` on 2026-05-25.

- **Marker clustering.** `react-native-map-clustering` + `supercluster` deps
  added; clusters render as branded bubble with count; tapping expands.
  (`shamus/marker-clustering-2026-05-25` → `c41ad9f`)
- **Accessible cluster bubbles.** `renderCluster` with full a11y labels so
  VoiceOver/TalkBack announces cluster count and category.
  (`a11y/audit-2026-05-25` → `1ffebdb`)
- **Flag editing.** Owners of open flags can edit description and severity from
  the flag detail modal; Jordan conditions satisfied and documented. (`830f4fe`)
- **Full token sweep / dark-mode fixes.** Raw hex literals in PlatformMap cluster
  styles and Reject button replaced with color tokens; dark mode correct throughout.
  (`feat/code-clean-2026-05-25`, `feat/dani-block-fixes-2026-05-25`)
- **Marker a11y fixes.** Map markers labelled; decorative callout elements hidden
  from a11y tree; category chip active-text contrast fixed (`brandOnSoft` not
  `brand`). (`a11y/audit-2026-05-25`)
- **Code clean.** Removed unused `AsyncStorage` import, stale comment fixes.
  (`feat/code-clean-2026-05-25`)
- **Gary test fixes.** `updateFlagContent` unit tests added; suite green on main.
- **Expo Web + Vercel deployment config.** (`feat/expo-web-vercel-2026-05-25`)

---

## Shipped 2026-05-24

- `chore/stabilization-2026-05-24` — hex-literal → theme-token migration (15
  files), `ProfileScreen` sign-out `confirm()`, filter deprecation comments,
  error-handling tier policy in CLAUDE.md.
- `cycle/E-2026-05-24` — `color.placeholderText` AA token + 6 callsites;
  default filter set on launch; `decorativeProps` helper; Tasks scope persisted;
  `SearchInputRow` reusable component; QA polish.
- `a11y/signin-a11y-2026-05-24` — visible field labels, border contrast
  (#ccc→#666, 5.7:1), `placeholderTextColor`, `accessibilityRole="header"`.
- `a11y/contrast-touch-sweep-2026-05-24` — FlashBanner green AA fix; UpdateBanner
  touch target 36→44pt; removed duplicate `accessibilityLiveRegion`.
- `a11y/placeholder-a11y-clean-2026-05-24` — `placeholderTextColor` sweep (6
  inputs) + TasksScreen `sevDot` `decorativeProps`.
- `cycle/F-2026-05-24` (partial) — `SearchInputRow` `accessibilityHint`;
  `MyReportsModal` + `MyFeedbackModal` migrated to `SearchInputRow` with text
  search.
- `cycle/H-2026-05-24` — dark mode Phase 2: `ThemeProvider` + `useColor()` hook;
  all callsites migrated.

---

## Shipped 2026-05-23 (R7–R9 cycle)

- **R7 — Tasks screen sort options.** Segmented control: Newest / Oldest /
  Severity, sort within sections, persisted device-wide. +18 tests.
  (`feat/tasks-sort-2026-05-23` · `e4e7cb6`)
- **R8 — Map long-press to drop a flag.** Long-press → confirm →
  ReportFlagModal pre-filled with coord; native + Leaflet web.
  (`feat/map-longpress-drop-2026-05-23` · `0bc2b81`)
- **R9 — Profile nearest-unresolved jump.** Pale-blue card on Profile with
  nearest open/verified flag; tap → Map centered + callout. 9 tests.
  (`feat/profile-nearest-flag-jump-2026-05-23` · `1f31d06`)

## Shipped 2026-05-23 evening (merge-on-done loop)

- **What's New / Changelog modal.** Slide-up modal from Profile; inline
  `RELEASES` array in `src/components/ChangelogModal.tsx`.
- **Tasks screen polish.** Screen wash (#f7f9fc), `SectionList` Open/Verified
  sections, "All caught up" empty-state card.
- **Address search via Nominatim.** 🔍 button → slide-up sheet; 350ms debounce
  → up to 5 results; tap to animate map. 15 new tests.

## Shipped 2026-05-23 (fastloop v4 — watched flags + category cycle)

- **Watched Flags** (F5). Star pill on flag detail; Profile → Watched Flags list
  sorted by status. Max 200, FIFO overflow. 17 new tests.
- **Category quick-cycle button** (F6). Cycles All→category→All in Map top bar;
  announces new filter to screen readers.

## Shipped 2026-05-23 (fastloop v3 — feedback focus)

- **Feedback categories.** FeedbackModal 4-chip radio (Bug/Idea/Love/Other).
- **Supabase feedback table + dual-write** (migration propose-only).
- **My Feedback page.** Profile row → past feedback rows from the table.
- **Help & FAQ page.** 7 collapsible Q&A items; footer links to mail composer.

## Shipped 2026-05-23 (fastloop v2 — visual polish + pages)

- **Branded tab headers + global Feedback flow.** Brand-blue header bar +
  Feedback pill on every tab.
- **About AccessMap modal.** Mission, accessibility statement, community guidelines.
- **Profile hero card + screen wash.** 56pt points, progress bar to next milestone.
- **Map top-row grouped action bar.** Four buttons unified in one elevated tray.

## Shipped 2026-05-23 (earlier)

All items below merged to `main`. Not back-listed unless something broke.

- Categories / severity legend on the Map.
- Persistent flag-load error banner on the Map.
- Filter flags on the Map by status.
- Accessible list view of nearby flags + auto-open for screen readers.
- Profile editing (display name, default tab, prefer-list-view).
- Reporter points toast on triage.
- My Reports view from Profile.
- Flag detail modal in Tasks.
- Photo lightbox.
- Shared FlagsProvider with `setStatuses` + optimistic helpers + race protection.
- Tasks tap-to-retry error banner.
- `errorMessage()` helper consolidating ~11 catch-block sites.
- Persist Map filters across app launches.
- Distance + ETA on Tasks cards.
- Saved named filter sets (cap 5, long-press to delete).
- Jest + jest-expo test runner (119 tests, 9 suites).
- Realtime flag updates — client on main (no-op until `supabase/realtime.sql` applied).
- Map empty-state card with one-tap "Reset filters".
- Collapsible filter panel with persisted collapsed state.
- Severity quick-cycle button (N+) in Map top bar.
- Share-a-flag via OS share sheet / clipboard fallback.

---

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
