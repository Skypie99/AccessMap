# Feature Push — AccessMap — 2026-05-25 (Morning Continuation)

## Summary

Continuation of the overnight feature push (Waves 1–5). Built 4 features on clean branches, fixed the in-progress Leaflet tile interception, and cleared a large accumulation of unstaged `borderRadius:999 → radius.circle` token sweeps from prior sessions. Typecheck green (0 errors). All 789 tests passing. All branches are independent from main and ready for Sky's review.

---

## Features Built

### 1. Leaflet Tile Interception (`feat/leaflet-tile-interception-2026-05-25`)
**Commit:** `170f11e`

**What it does:** Web map tiles now flow through `tileCache.ts` (the offline tile cache built in Wave 5). When a tile is in the cache it loads instantly with no network request; on cache miss the tile is fetched normally and stored for next time. Clears automatically on sign-out (Jordan condition C1, already wired).

**How:** Extended `L.TileLayer` with a `CachedTileLayer` class that overrides `createTile()`. A `CachedTileLayerWrapper` React component (uses `useMap()`) mounts it imperatively and re-creates when `userId` changes. Replaced the old `<TileLayer>` in `PlatformMap.web.tsx` with `<CachedTileLayerWrapper userId={userId} />`.

**Where:** Web build only. `src/components/PlatformMap.web.tsx`. Reaches the user automatically — the Map tab is the entry point.

**Note:** `feat/leaflet-tile-interception-2026-05-25` has 2 commits — `285a7d5` was from a prior session and `170f11e` is the final working commit.

---

### 2. Avatar Photo Upload + Initials Fallback (`feat/edit-profile-2026-05-25`)
**Commit:** `5e92a6e` (feature) + `c41e5ca` (token sweep)

**What it does:** The Profile hero card now shows a circular avatar:
- If `avatar_url` is set → shows the user's photo
- Otherwise → a coloured circle with up to 2 initials from their display name or email
- Tapping the avatar opens the photo picker (library, square crop 1:1 aspect)
- An upload spinner overlay + `accessibilityState={{ busy }}` during upload
- Web uses a hidden `<input type="file">`; native uses `expo-image-picker`

**How:**
- `src/lib/users.ts`: Added `uploadAvatar(userId, localUri)` — stores at `<userId>/avatar/<timestamp>.<ext>` in the existing `flag-photos` bucket (satisfies RLS). Added `getInitials(name)` helper. Extended `UserProfilePatch` to accept `avatar_url`.
- `src/screens/ProfileScreen.tsx`: Replaced the decorative 🏅 emoji in `heroCard` with the tappable avatar component.

**Note:** The `feat/edit-profile-2026-05-25` branch also has commit `8f24ba4` from another agent that ran concurrently. That commit swaps remaining `borderRadius:999` literals to `radius.circle` but also touches some unrelated files (CHANGELOG.md, SYSTEM_CONSTITUTION.md, coverage/). The feature commit `5e92a6e` is clean and reviewable on its own.

---

### 3. Context Tags Display in FlagDetailModal (`feat/context-tags-display-2026-05-25`)
**Commit:** `e1e2638`

**What it does:** Flags with context tags now show a "Conditions" section in FlagDetailModal — a row of chips like "Slippery when wet", "After dark / poor visibility". Previously, context tags could be set in the report form but were never displayed anywhere.

**How:**
- `src/types/database.ts`: Added `context_tags?: string[]` to `FlagRow` (optional per migration pattern for `updated_at`).
- `src/components/FlagDetailModal.tsx`: Added `CONTEXT_TAG_LABELS` + `isValidTag` imports; added a conditional "Conditions" section after Description; chips are decorative (grouped in an accessible container with a composed a11y label).

**Where:** FlagDetailModal → "Conditions" section, visible only when tags are present.

---

### 4. Text Search in Tasks Triage List (`feat/tasks-search-2026-05-25`)
**Commit:** `d6b6fa7`

**What it does:** A `SearchInputRow` input appears above the Mine/All chips when there are triage flags to search. Typing filters the list in real time — matches on category label OR description, case-insensitive. Pure local filter (works on the loaded page, no extra queries).

**How:** Added `searchQuery` state, plugged into the `displayFlags` useMemo after the mine/severity filters. Used the existing `SearchInputRow` component (same one in MyReportsModal, MyWatchedModal, NearbyFlagsModal).

**Where:** Tasks tab → above "All / Mine" chips.

---

## Token Sweep (also on `feat/edit-profile-2026-05-25`, commit `c41e5ca`)

Added two theme tokens to `src/theme.ts` and `src/theme/ThemeContext.tsx`:
- `radius.circle = 9999` — semantic alias for perfectly circular elements
- `color.overlayBtnPressed` — pressed state for overlay buttons (light + dark)

Swept 7 files from raw `borderRadius: 999` to `radius.circle`. Also fixed an invalid `accessibilityRole="listitem"` in `ActivityFeedModal` (not a valid React Native `AccessibilityRole`; changed to `role="listitem"` which is valid for web semantics via the `role` prop).

---

## How to Try It

1. **Avatar (Profile):** Run the app → Profile tab → tap the circular initials/photo badge in the hero card → pick a photo from the library. It should upload and appear immediately.

2. **Context tags:** Need a flag with context tags set (use the Report modal and select tags like "Slippery when wet"). Open the flag's detail modal → scroll past Description → see "Conditions" chip row.

3. **Tasks search:** Tasks tab → type a word in the search bar at the top (e.g. "sidewalk" or "broken") → list filters live.

4. **Tile interception (web):** Run `npm run web` → load the map → check DevTools Network tab — after the first load, subsequent tile requests should come from the in-memory cache (you'll see them hit on the second map movement with no network requests).

---

## Branches Ready for Review

```
feat/leaflet-tile-interception-2026-05-25  (commit 170f11e)
feat/edit-profile-2026-05-25               (commits c41e5ca, 5e92a6e, 8f24ba4)
feat/context-tags-display-2026-05-25       (commit e1e2638)
feat/tasks-search-2026-05-25               (commit d6b6fa7)
```

Review diff:
```bash
git diff main..feat/tasks-search-2026-05-25
git diff main..feat/context-tags-display-2026-05-25
git diff main..feat/edit-profile-2026-05-25
git diff main..feat/leaflet-tile-interception-2026-05-25
```

Discard:
```bash
git branch -D feat/tasks-search-2026-05-25
git branch -D feat/context-tags-display-2026-05-25
git branch -D feat/edit-profile-2026-05-25
git branch -D feat/leaflet-tile-interception-2026-05-25
```

---

## Proposals (NOT applied)

None — all 4 features use existing schema, existing storage bucket (flag-photos), and existing dependencies. No new deps, no migrations.

---

## Decisions for Sky

1. **`feat/edit-profile-2026-05-25` has a noisy commit** — commit `8f24ba4` from a concurrent agent includes unrelated file changes (CHANGELOG.md, SYSTEM_CONSTITUTION.md, coverage/). The actual feature and token sweep (`c41e5ca`, `5e92a6e`) are clean. You can review those two commits individually and consider cherry-picking instead of merging the full branch.

2. **Context tags migration** — `supabase/migrations/2026-05-24_flag_context_tags.sql` must be applied before context tags show up. Without it, `context_tags` will always be undefined and the Conditions section won't render. The code gracefully handles this.

---

## Suggested Next Features

1. **Flag clustering on the web map** — `PlatformMap.web.tsx` doesn't cluster markers at all; even 20 flags in the same area become overlapping pins. Supercluster (already a dep) could be wired into the Leaflet render path the same way it's wired into the native map.

2. **Search/filter for the watched-flags list** — `MyWatchedModal` shows all watched flags in a flat list with no search or filter. As the list grows, a `SearchInputRow` + status/severity filter chips (matching the Tasks pattern) would make it scannable — especially for a11y users navigating by list.

---

## Verification

| | |
|---|---|
| Typecheck before | 0 errors |
| Typecheck after | 0 errors |
| Tests | 789/789 (unchanged baseline) |
| New files | `src/lib/users.ts` (extended) |
| Modified files | `PlatformMap.web.tsx`, `ProfileScreen.tsx`, `FlagDetailModal.tsx`, `TasksScreen.tsx`, `database.ts`, `theme.ts`, `ThemeContext.tsx` + 7 token sweep files |
| A11y | Born accessible on all 4 features — roles, labels, busy state, composed group labels |
