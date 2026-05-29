# Wave 2 Privacy Gate — Jordan Review

**Date:** 2026-05-29  
**Reviewer:** Jordan (Privacy / PII / Location)  
**Branch:** `feat/wave2-quick-wins`  
**Scope:** Three Wave 2 quick-win features  
**Hard cap:** 15 min  

---

## Overall Verdict: ✅ CONDITIONAL GREEN

All three features are safe to ship. One yellow item requires a one-line guard comment before a real analytics provider is wired — not a blocker for merging Wave 2.

---

## Feature-by-Feature

### 1. Watched Flags Search / Filter

**Verdict: ✅ GREEN**

Filtering is a pure in-memory operation on already-fetched `FlagRow[]` data. No analytics events fire on search input. No network calls. The haystack built in `filterWatchedFlags` (`src/lib/watchedFlagsFilter.ts:44`) uses only `description` and the category label string — `user_id`, `lat`, and `lng` are never touched by the filter logic and never appear in any log. Multi-token AND reduces false-positive exposure. No PII risk.

---

### 2. Web Map Marker Clustering (supercluster)

**Verdict: ✅ GREEN**

Supercluster runs entirely client-side. The only data fed into the index (`PlatformMap.web.tsx`, `ClusteredMarkers` component) is `[f.lng, f.lat]` (the flag's geographic pin, already public and already rendered on the map) plus `{ flagId: string }`. No `user_id` is passed into the Supercluster index at any point. Cluster centroids are computed by the library locally — nothing leaves the browser. The clustering doesn't reveal any location information beyond what is already visible as individual map pins; it aggregates existing public flag locations, it doesn't expose who created them or where the viewer is standing.

---

### 3. Tile Cache Analytics + Offline Indicator

**Verdict: ⚠️ YELLOW — safe now, needs one guard before real provider is wired**

**Current state (safe):** `analytics.ts` is a no-op stub — `track()` only `console.log`s in `__DEV__` and reaches no external service in production. No data leaves the device.

**What the event carries today:** `{ zoom: number }` only. Zoom alone carries no location signal — you cannot infer *where* the user is looking from a zoom level without x/y tile coordinates.

**The risk:** At the `CachedTileLayer.createTile()` call site (`PlatformMap.web.tsx`), `coords.x` and `coords.y` are in scope alongside `coords.z`. Tile x/y/z together encode a precise geographic bounding box. If a future developer adds x or y to the event payload, the analytics stream would leak the exact map viewport of every user, linked to `userId` via `identifyUser()`.

**Required fix before wiring a real analytics provider (non-blocking for Wave 2 merge):**

Add a single comment to `src/lib/analytics.ts` in the `tile_cache_hit` / `tile_cache_miss` event types, and/or at the `createTile` call site:

```ts
// PRIVACY: only `zoom` is allowed here. Do NOT add `x` or `y` —
// tile coordinates encode a precise geographic bounding box and would
// leak user viewport location linked to userId via identifyUser().
| { name: 'tile_cache_hit'; props: { zoom: number } }
| { name: 'tile_cache_miss'; props: { zoom: number } }
```

**Offline indicator badge:** no privacy concern — it's a local UI-only boolean derived from whether flags came from the AsyncStorage cache. No data sent anywhere.

**Cache storage:** tiles stored in AsyncStorage keyed by `(userId, tileUrl)` stay local to the device and are never transmitted to analytics. The userId-as-cache-key is fine — it's scoped to the local store.

---

## Decisions for Sky

None required to ship Wave 2. The yellow item is a one-line code comment that Steve or Shamus can add when the analytics provider is wired (per Phase 2 strategy doc milestone). It is NOT a blocker.

---

## Summary Table

| Feature | Verdict | Note |
|---|---|---|
| Watched Flags search/filter | ✅ GREEN | Pure local filter; no analytics, no PII in logs |
| Web map marker clustering | ✅ GREEN | Client-side only; flag coords only (already public) |
| Tile cache analytics | ⚠️ YELLOW | Safe now (stub); add x/y guard comment before real provider |
