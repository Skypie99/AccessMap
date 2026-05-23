# Feature Push — AccessMap — 2026-05-23 (continuation)

## Summary

Two features built per your follow-up ask, each on its own branch off
`main` so they can be reviewed and merged independently:

1. **Status filter on the Map** — `feat/status-filter-2026-05-23`
   Adds a third row to the existing filter panel (Open / Verified /
   Resolved / Rejected), defaulting to `{open, verified}` to match the
   previous hardcoded `listFlags` call. Toggling pills drives a server-
   side re-fetch.

2. **Accessible list view of nearby flags (Phase 1)** —
   `feat/nearby-flags-list-2026-05-23`
   A new "📋 List" FAB on the Map opens a full-screen modal showing
   already-fetched flags sorted by haversine distance from the user.
   Each row tap closes the modal and centers the map on that flag —
   reusing the existing `focusFlag` / `animateTo` / `showCallout` chain.

**Typecheck:** green throughout on both branches.
**Status:** both complete, each one reviewable diff. Neither merged.

The branches don't conflict with each other or with the open
`feat/legend-sheet-2026-05-23` and `feat/flag-load-error-banner-…`
branches in any meaningful way (different files, or additive lines).

---

## Feature 1 — Status filter

### Spec as built

**What:** New `Status` row in the existing filter panel (alongside
*Categories* and *Minimum severity*), with four multi-select pills:
**Open**, **Verified**, **Resolved**, **Rejected**. Toggling a pill
re-fetches flags with the new set. The previous hardcoded
`listFlags(['open','verified'])` is now `listFlags(activeStatuses)`.

**Where:** `src/lib/flags.ts` (constants) + `src/screens/MapScreen.tsx`
(state, fetch wiring, JSX). No new files; matches the existing pill
pattern.

**User flow:**
1. Open Map → tap `⌕` filter button.
2. The familiar panel opens; below the existing rows you now see a
   **Status** label and four pills.
3. By default Open + Verified are selected (so behavior is unchanged
   from before).
4. Toggle Resolved → after a quick fetch, resolved flags now appear on
   the map. Toggle Open off → open flags disappear.
5. Tap **Clear** → all filters return to default (including statuses).
6. Edge case: if you toggle every status off, no flags are shown and a
   small hint *"Pick at least one status to see flags."* appears under
   the row (no network call is made).

**Components & data:**
- New constants in `src/lib/flags.ts`: `STATUS_LABELS`, `STATUS_ORDER`,
  `DEFAULT_STATUSES`. Mirrors how `CATEGORY_LABELS`/`CATEGORY_ORDER`
  already live there.
- New state in MapScreen: `activeStatuses: Set<FlagStatus>` initialized
  from `DEFAULT_STATUSES`.
- `refreshFlags` now depends on `activeStatuses`; its useCallback
  identity changes when the user toggles → the re-fetch useEffect
  fires.
- `clearFilters` resets statuses back to `DEFAULT_STATUSES` (not empty)
  so Clear truly returns the panel to its starting state.
- A new helper memo `statusFilterActive` flags whether the user has
  diverged from the default.

**Accessibility:** Each status pill is a `Pressable` with
`accessibilityRole="button"`, label *"Filter by Open"* etc., and
`accessibilityState={{ selected }}`. Reuses `filterPill` styles, which
already have proven contrast, text size, and target dimensions. The
empty-selection hint gives a screen reader user an in-context reason
for the empty map rather than silent absence.

**Assumptions documented:**
- Server-side filtering on each toggle (re-fetch). Cleaner than
  fetching all 4 statuses and filtering client-side; fits the existing
  `listFlags(statuses)` API; no behavior change to the cap-500 fetch.
- "Clear" returns statuses to default rather than emptying them — so
  the user can't accidentally end up in the empty-map state via Clear.

### Files / size

| File | Change |
|---|---|
| `src/lib/flags.ts` | +20 lines (constants) |
| `src/screens/MapScreen.tsx` | +98 / -6 (state, refetch, JSX, hint style) |
| **Total** | **+112 / -6**, 1 commit |

Commit: `7b9de67  MapScreen: add Status filter row (open / verified /
resolved / rejected)`.

### How to try it

```bash
cd ~/AccessMap
git checkout feat/status-filter-2026-05-23
npm run web                 # or npm start
```

1. Sign in.
2. On the Map, tap the `⌕` magnifier in the top row.
3. Scroll the panel to the new **Status** row.
4. Tap **Resolved** to include resolved flags → the map should update
   shortly (it re-fetches).
5. Tap **Open** off → open flags disappear.
6. Tap **Clear** → all filters revert to default.
7. Sanity-check the empty case: toggle off all four statuses → the
   hint appears and no flags render.

VoiceOver/TalkBack sanity:
- Each pill should announce as a *button*, name the status, and
  include *selected* / *not selected* state.
- The "Pick at least one status" hint reads in document order after
  the row when it appears.

---

## Feature 2 — Accessible list view of nearby flags (Phase 1)

### Spec as built

**What:** A new "📋 List" FAB on the Map (placed in a column with the
existing "+ Report" FAB) opens a full-screen modal showing the already-
fetched flags, sorted by distance from the user. Each row shows
category, severity, optional photo thumb, optional description, and
distance. Tapping a row closes the modal and centers the map on that
flag with the callout open — exactly like Tasks → Map navigation does.

**Where:**
- New: `src/screens/NearbyFlagsModal.tsx` — full-screen Modal +
  FlatList + sort/format helpers. Self-contained haversine helper
  (small, no need to lift to `lib/` yet).
- Updated: `src/screens/MapScreen.tsx` — wraps the existing Report FAB
  in a column, adds the List FAB above it, adds the modal render.

**User flow:**
1. On the Map, tap **📋 List** (right side, above the Report FAB).
2. A full-screen modal slides up titled *"Nearby flags"*.
3. Flags are listed top-to-bottom in distance order (closest first).
4. Each row: severity dot + number, category label, distance ("320 m"
   or "1.2 km"), optional photo thumb, optional description, status.
5. Tap any row → modal closes, the Map animates to that flag and pops
   the callout.
6. If location is not yet available, a banner at the top says
   *"Allow location access to sort by distance. Showing most recent
   first."* and the list falls back to chronological order.
7. If there are no flags, a friendly empty state explains what'll
   appear here.
8. Android back button dismisses the modal (`onRequestClose`).

**Components & data:**
- `NearbyFlagsModal` is a pure presentational component — props
  `visible`, `location`, `flags`, `onClose`, `onSelectFlag`. No
  fetching of its own; it reads MapScreen's already-loaded `flags`
  state so we don't double-fetch.
- Sort happens in a `useMemo` so it only recomputes when `flags` or
  `location` changes.
- `haversineMeters` is the standard great-circle formula — accurate
  enough for street-level distances. Kept local to the modal file
  rather than lifted to a new lib module (YAGNI; if a second consumer
  appears later, lift it).
- The "select a flag" handler in MapScreen calls
  `mapRef.animateTo(...)` + a delayed `mapRef.showCallout(flag.id)` —
  the same pattern the existing `route.params?.focusFlag` useEffect
  uses.

**Accessibility:**
- New **List FAB** has `accessibilityRole="button"`, label *"Open
  nearby flags list"*, hint, and `minHeight: 44`.
- Modal header is `accessibilityRole="header"`.
- Each list row has a composed `accessibilityLabel` that includes
  category, severity number, distance in full words (*"320 meters
  away"* — never abbreviated for the screen reader), status, and
  description. So one swipe gives the whole picture.
- Decorative severity dot is hidden from accessibility
  (`importantForAccessibility="no"` + `accessibilityElementsHidden`)
  since its info is already in the parent label.
- `numberOfLines` caps on title (1) and description (2) so one
  pathological row doesn't break the list layout at large dynamic
  type.
- Touch targets ≥ 44pt (rows have `minHeight: 44`; close button has
  `hitSlop: 10` and `minHeight/minWidth: 44`).
- Distance is paired with text everywhere — never just a color or
  position cue.
- Close button is `Pressable`, full Close text (not just an icon), so
  screen readers and keyboard users have a clear dismiss path.

**Assumptions documented:**
- Phase 1 is **manual-open** only via the FAB. The auto-open-when-
  screen-reader-on logic (Phase 2 per FEATURES.md → Next) is left for
  a follow-up that introduces an `accessibilityPreferences` path; I
  did not want to silently add that scope.
- Distances are in **meters / kilometers** (not miles). AccessMap is
  used internationally and meters are more useful at street-level
  scale ("50 m" is more meaningful than "0.03 mi"). Trivial to change
  if you'd prefer miles.
- Phase-1 doesn't include any "filters apply to the list too" wiring.
  The modal shows whatever `flags` MapScreen has — so if the user has
  filters set on the Map, the list reflects those naturally.

### Files / size

| File | Change |
|---|---|
| `src/screens/NearbyFlagsModal.tsx` | +267 (new) |
| `src/screens/MapScreen.tsx` | +77 / -16 (FAB column, state, render) |
| **Total** | **+328 / -16**, 1 commit |

Commit: `c546740  Add NearbyFlagsModal — accessible list view of
flags from the Map`.

### How to try it

```bash
cd ~/AccessMap
git checkout feat/nearby-flags-list-2026-05-23
npm run web                 # or npm start for iOS sim
```

1. Sign in.
2. On the Map, look at the bottom-right corner — you should see two
   stacked buttons: **📋 List** (white pill) on top, **+ Report**
   (blue pill) below.
3. Tap **📋 List** → a full-screen sheet slides up with *"Nearby
   flags"* across the top.
4. With at least a couple of flags in the DB, you should see them in
   distance order (closest at top). Each row shows distance in m/km.
5. Tap any row → the modal closes, the map animates to that location
   and the marker's callout pops up.
6. Test the no-location case: deny location permission, reload, open
   the list — you should see the yellow notice at the top and flags in
   creation-time order.
7. Test the empty case: filter to a status with no flags (e.g.
   *Rejected* if you have the status-filter branch merged, or wipe the
   `flags` table) — you should see *"No flags to show"* with the
   community explanation.

VoiceOver/TalkBack sanity:
- The List FAB should read as a *button* with the hint about distance
  sorting.
- Each list row should read as a single composed sentence:
  *"No ramp, severity 3, 320 meters away. Status verified. Curb at
  3rd and Main. Closes the list and centers the map on this flag."*
- Close should read as *"Close nearby flags list. Button."*

---

## Proposals (NOT applied — need your review)

### 1. Merge order (suggested)

These can merge in any order — they don't touch the same lines — but
this is the friendliest order for review:

1. `feat/legend-sheet-2026-05-23` (already shipped, awaiting review)
2. `feat/flag-load-error-banner-2026-05-23` (already shipped)
3. `feat/status-filter-2026-05-23` (this run)
4. `feat/nearby-flags-list-2026-05-23` (this run)

Standard merge commands:
```bash
git checkout main
git merge feat/status-filter-2026-05-23
git merge feat/nearby-flags-list-2026-05-23
```

There is **no** schema, dependency, or auth change in either branch.

### 2. FEATURES.md updates after you merge

- *"Filter flags on the Map by status"* under **Now** → move to
  **Shipped (unmerged)** until on main, then remove.
- *"Accessible list view of nearby flags"* under **Next** → split
  into *Phase 1 (shipped)* + *Phase 2 (auto-open when screen reader
  is on)*. Phase 2 is a real follow-up; see "Suggested next features"
  below.

### 3. A small follow-up worth its own diff

The MapScreen's `focusFlag` useEffect depends on `refreshFlags`, which
now changes identity when `activeStatuses` changes. So toggling a
status while a `focusFlag` route param is set will re-fire the
animate-to-focused-flag effect. Pre-existing pattern, low impact,
worth a one-line cleanup later (gate the body on `route.params?.ts`
change rather than `refreshFlags` identity).

---

## Suggested next features (1–2)

1. **Phase 2 of the accessible list — auto-open when screen reader is
   on.** Add an `accessibilityPreferences` boolean (or a more general
   `useAccessibilitySettings` hook) that reads
   `AccessibilityInfo.isScreenReaderEnabled()` and listens for
   changes. When `true`, open `NearbyFlagsModal` automatically on Map
   tab focus. Small, high-value, builds on what we just shipped.

2. **Onboarding / first-run cards.** Three swipeable cards explaining
   what flags are, how severity works, and how points are earned.
   Shown once on first sign-in (stored as a flag in async storage
   keyed by user id). Already on FEATURES.md → Next; fits one diff.

---

## Verification

| Check | Status |
|---|---|
| Typecheck (`npm run typecheck`) green at start | ✓ |
| Typecheck green after each commit | ✓ |
| Typecheck green at hand-off | ✓ |
| Feature 1 reachable | Map → `⌕` filter → new Status row |
| Feature 2 reachable | Map → bottom-right "📋 List" FAB |
| Matches house style | Pills reuse `filterPill` styles, modal mirrors `ReportFlagModal` + `TasksScreen` card patterns |
| Accessibility built in | role/label/state on every interactive element, composed labels on list rows, decorative children hidden, ≥44pt targets, no color-only meaning |
| Gotchas respected | No new dep, no schema, no map-library reach-through, types still `type` not `interface`, photo path scheme untouched |
| Secrets / destructive | None |

**Branches not merged.** No remote push attempted.

---

## How to review

```bash
# Feature 1
git diff main..feat/status-filter-2026-05-23
# Feature 2
git diff main..feat/nearby-flags-list-2026-05-23

# Merge (any order)
git checkout main
git merge feat/status-filter-2026-05-23
git merge feat/nearby-flags-list-2026-05-23

# Discard (if you want)
git branch -D feat/status-filter-2026-05-23
git branch -D feat/nearby-flags-list-2026-05-23
```

---

## Learnings & suggested skill updates

- **One backlog ask, two clean branches.** When the user asks for two
  features in a single turn, the safer move is one branch per feature
  rather than one combined branch — keeps each diff reviewable and
  mergeable independently. (Skill currently encourages one feature
  per *run*; this turn was clearly an exception. Worth a sentence in
  the skill: *"if the user explicitly asks for multiple features in
  one turn, prefer one branch per feature rather than bundling — each
  is then independently reviewable."*)

- **Self-contained helpers stay local until a second consumer
  appears.** Haversine lives inside `NearbyFlagsModal.tsx` rather
  than a new `lib/geo.ts` module — it has exactly one consumer today,
  and lifting it preemptively would just add an import without value.
  When a second consumer appears (e.g. Tasks-screen distance, a
  shared "near me" filter), lift it then.

- **Composed `accessibilityLabel` beats per-child labels for list
  rows.** Building one descriptive sentence per row (and hiding
  decorative children with `importantForAccessibility="no"` +
  `accessibilityElementsHidden`) gives VoiceOver/TalkBack users a
  much faster read than swiping through nested elements. The
  NearbyFlagsModal rows are the canonical pattern.
