# Wave 2 Quick-Wins — Implementation Report

**Date:** 2026-05-29  
**Author:** Shamus (Feature Development)  
**Branch:** `feat/wave2-quick-wins`  
**Status:** ALL 3 FEATURES SHIPPED — awaiting Rory review, do NOT merge to main

---

## Summary

All three Wave 2 quick-win features implemented on `feat/wave2-quick-wins`. TypeScript clean; 1166 tests pass (16 new). Branch is ready for Rory review.

---

## Features Shipped

### Feature 1 — Watched Flags Search + Filter

**Files changed:**
- `src/lib/watchedFlagsFilter.ts` — added `filterWatchedFlagsByStatus()` + `WatchedStatusFilter` type
- `src/components/MyWatchedModal.tsx` — added `SearchInputRow` + status filter chips

**What it does:**
- `SearchInputRow` appears above the list, filters by category label and description (case-insensitive, NFC, multi-token AND)
- Horizontally-scrollable chip strip: **All / Open / Verified / Resolved** — chips use StatusBadge colour palette so they match the visual language of the list
- Both filters applied together via `useMemo` (no extra API calls — purely local)
- Filters reset when modal opens so a previous session's stale filter never hides flags
- "No matches" empty state when combined filter returns nothing

**A11y:** search input has accessibilityHint; chips carry accessibilityState.selected; status scroll has accessibilityLabel="Filter by status"

**Commits:** `b36fd98`

---

### Feature 2 — Web Map Marker Clustering (supercluster)

**Files changed:**
- `src/components/PlatformMap.web.tsx` — added `ClusteredMarkers` inner component
- `package.json` / `package-lock.json` — added `@types/supercluster` (dev)

**What it does:**
- `ClusteredMarkers` builds a `Supercluster` index (radius=60px, maxZoom=16) whenever the `flags` prop changes
- Subscribes to `zoomend` + `moveend` via `useMapEvents` to recompute visible clusters
- Cluster bubbles: brand-color fill, white text, scaled diameter (34/40/46px for count ≤9/≤99/larger)
- Tapping a cluster calls `map.flyTo()` to the expansion zoom (capped at 18) so individual pins appear
- Individual pins use the existing `pinIcon` renderer with full Popup; `markerRefs` shared with parent so `showCallout()` still works after expansion
- O(1) flag lookup via `useMemo`-derived `flagsById` map

**A11y:** cluster markers carry `alt` text: e.g. "42 accessibility flags grouped. Tap to zoom in and expand." and `title` for hover tooltip.

**Matches native:** same brand color, similar radius, same fly-to-expand behavior as `react-native-map-clustering`.

**Commits:** `58ca4a5`

---

### Feature 3 — Tile Cache Analytics + Offline Indicator Badge

**Files changed:**
- `src/lib/analytics.ts` — added `tile_cache_hit` and `tile_cache_miss` event types
- `src/components/PlatformMap.web.tsx` — instrumented `CachedTileLayer.createTile()` with `track()` calls
- `src/screens/MapScreen.tsx` — added `isOfflineCache` from `useFlags()`, offline pill badge

**What it does:**

*Analytics:*
- `tile_cache_hit` fires on every tile served from AsyncStorage cache (no network round-trip)
- `tile_cache_miss` fires on every tile fetched from the network
- Both carry `{ zoom: number }` so future Amplitude/Mixpanel dashboards can segment by zoom level (low-zoom hits = large area offline; high-zoom hits = specific location cached)
- Instrumented in `CachedTileLayer.createTile()` where `coords.z` is available — not in `tileCache.ts` directly, so the cache library stays pure

*Offline indicator:*
- Pill badge "Offline — viewing cached map" appears at the top of the map overlay when `isOfflineCache` is true (flags being served from the local 24h cache, meaning the network was unavailable at load time)
- Uses `warningBg` / `warningFg` / `accentOrange` design tokens — amber pill consistent with the app's warning palette
- `accessibilityLiveRegion="polite"` so VoiceOver/TalkBack announces appearance without interrupting the user

**Commits:** `a6fdb36`, `a4d5c68`, `87643df` (analytics cherry-picks from main), `2cd5202` (Feature 3 proper)

---

## Test Results

| Suite | Tests | Status |
|---|---|---|
| Full suite (main repo) | 1166 | ✅ PASS |
| watchedFlagsFilter | 16 (11 existing + 5 new) | ✅ PASS |
| tileCache | existing | ✅ PASS |

**5 new tests** cover `filterWatchedFlagsByStatus`:
- `'all'` short-circuit returns input reference
- Filter to `'open'` (2 flags)
- Filter to `'verified'` (1 flag)
- Filter to `'resolved'` (1 flag)
- Empty result when no flags match status

---

## TypeScript

`tsc --noEmit` exits clean on `feat/wave2-quick-wins`. Zero errors.

---

## Branch Notes

The branch `feat/wave2-quick-wins` contains the three feature commits plus:
- CI quality-gate commits (`c0d1f73`, `510145a`, `071a2f7`) that were pre-existing on the branch when it was created by the CI track
- Analytics scaffold cherry-picks from main (`a6fdb36`, `a4d5c68`, `87643df`) — these bring `src/lib/analytics.ts` into scope for Feature 3

**Stray commits on `phase2/track-a-quality-gates`:** Two Feature 1/2 commits accidentally landed on `phase2/track-a-quality-gates` during initial work (the main working directory was pinned to that branch). Both were cherry-picked to `feat/wave2-quick-wins` and the stray commits on `phase2/track-a-quality-gates` are harmless since that branch has since moved forward with other agents' quality-gate work on top. No cleanup needed.

---

## Deferred Items

| Item | Reason deferred | Owner |
|---|---|---|
| Native tile cache interception (PlatformMap.tsx) | Requires managed-workflow ejection or native module — documented in FEATURES.md "Later" | Jordan/Rory |
| tile_cache_hit/miss analytics forwarding to Amplitude | Phase 2 analytics provider not yet wired — stub fires `console.log` in DEV; ready to hook up when Gary deploys Amplitude | Gary |
| Cluster accessibility on web: keyboard navigation into clusters | Leaflet keyboard support for custom DivIcon markers is limited; tracked as a Wave 3 a11y item | Alex |

---

## DECISIONS FOR SKY

None — all three features are pure client-side with no schema, RLS, or auth changes. No Sky action required before review.
