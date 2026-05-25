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

- **`feat/flag-pagination-2026-05-25`** — Cursor-paginated flag fetcher
  (`listFlagsPage`), `hasMore`/`loadMore`/`loadingMore` in FlagsProvider, and
  a "Load More" footer in TasksScreen. (DECISION FOR SKY: confirm this is the
  canonical approach — a 2026-05-23 pagination branch also exists.)
- **`a11y/full-sweep-2026-05-25`** — Full a11y sweep; WIP/stashed. Includes
  MyReportsModal chip tap-target fix (44pt). Unblock by finishing the cluster
  + edit-form a11y items documented in
  `qa-reports/2026-05-25_Alex_a11y-audit.md`.

### Parked (2026-05-24)

- **`feat/decorative-glyph-2026-05-24`** (`ff44775`) — `decorativeProps` sweep
  over 9 broken/stale callsites. Clean single commit; no conflicts expected.
- **`a11y/placeholder-sweep-cycle-f`** (`9a6a16a`) — Remaining
  `placeholderTextColor` TextInputs + `sevDot` `decorativeProps` + surfaceSoft
  contrast test (Cycle F items F1/F2/F5). Unblocked now that cycle/F is on main.

### Parked (2026-05-23)

- **R7 — Tasks screen sort options** (`feat/tasks-sort-2026-05-23` ·
  `e4e7cb6`). Segmented control: Newest / Oldest / Severity, sort within
  sections, persisted device-wide. +18 tests.
- **R8 — Map long-press to drop a flag**
  (`feat/map-longpress-drop-2026-05-23` · `0bc2b81`). Long-press → confirm →
  ReportFlagModal pre-filled with coord; native + Leaflet web.
- **R9 — Profile nearest-unresolved jump**
  (`feat/profile-nearest-flag-jump-2026-05-23` · `1f31d06`). Pale-blue card on
  Profile with nearest open/verified flag; tap → Map centered + callout. 9 tests.

---

## Now (next 1–2 runs)

- **Finish cluster + edit-form a11y fixes.** Two open items from
  `a11y/audit-2026-05-25` (cluster bubble focus order, edit-form field
  labels); resolve so `a11y/full-sweep-2026-05-25` can close cleanly.
- **Merge `feat/decorative-glyph-2026-05-24`.** Standalone; no conflicts
  expected.
- **Merge `a11y/placeholder-sweep-cycle-f`.** Cycle F items F1/F2/F5;
  ready to land.
- **Merge `feat/flag-pagination-2026-05-25` (DECISION FOR SKY).** Confirm
  this is the canonical pagination approach before merging.
- **Cycle F remaining item F4.** Add `theme.test.ts` assertion verifying
  `color.placeholderText` contrast on `surfaceSoft` (`#f7f8fa`).
- **Apply Supabase migrations (DECISION FOR SKY).** Migrations in
  `supabase/migrations/` unlock status history (T1), context tags (C4), and
  realtime updates (`supabase/realtime.sql`). Apply via Dashboard SQL Editor.

---

## Cycle F — remaining items (cycle/F partially merged 2026-05-24)

Cycle F shipped F3/F6/F-search via `cycle/F-2026-05-24`. These remain:

1. **F1 — `placeholderTextColor` sweep** (6 remaining TextInputs) — covered by
   `a11y/placeholder-sweep-cycle-f`; ready to merge.
2. **F2 — `sevDot` decorativeProps** — covered by `a11y/placeholder-sweep-cycle-f`.
3. **F4 — surfaceSoft contrast unit test** — one new assertion in
   `theme.test.ts`; not yet on any branch.

---

## Later (sequence after the above)

- **Flag editing** — reporter can edit open flag description/severity. Jordan
  conditions documented in `qa-reports/2026-05-25_Jordan_flag-edit-review.md`;
  confirm final RLS migration is applied before shipping widely.
- **Offline / PWA support.** Cache recent flags + OSM tiles seen recently for
  flaky connections. (**Jordan review required** — touches cached user location
  + flag data.)
- **Push notifications on flag updates.** Reporter learns when their flag is
  verified or resolved; requires Edge Function + push token storage.
  (**Jordan review required** — push tokens are user-identifiable data.)
- **Tasks screen sort options** (R7) — merge branch when queue clears.
- **Map long-press to drop a flag** (R8) — merge branch when queue clears.
- **Profile nearest-unresolved jump** (R9) — merge branch when queue clears.

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
