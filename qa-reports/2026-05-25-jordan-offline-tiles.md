# Jordan — Privacy Review: Offline Tile Caching (Pre-Build)

**Date:** 2026-05-25
**Reviewer:** Jordan (privacy/PIPEDA advisor — NOT a lawyer; findings require professional legal review before any app-store submission or public launch)
**Feature:** Offline tile caching — cache OpenStreetMap raster tiles to device storage so the map renders offline or on slow connections
**Review type:** Pre-build gate (no code exists yet; this sets the conditions Shamus must implement)
**Mode:** READ-ONLY. No code changes. No external sends.

---

## VERDICT

**APPROVE WITH CONDITIONS**

The feature is privacy-compatible. Tile data is public, generic, and non-user-linked. However, the new persistence layer introduces a set of design constraints that Shamus must implement before shipping — they are not optional polish, they are the reason this review can say APPROVE rather than BLOCK.

Five conditions below. All five are merge gates.

---

## Trigger-by-trigger analysis

### Trigger 1 — Location data (PIPEDA Principle 4 — Limiting Collection)

**Fires? YES — with nuance.**

Tile requests use bounding box coordinates (lat/lng of the current map viewport). The tile system converts those to `zoom/x/y` indices on a fixed global grid. A `(zoom=16, x=19293, y=24641)` tuple maps to a ~600m × 600m area in downtown Toronto. Across a session, the set of cached tiles is effectively a sparse map of "areas this user has viewed at this zoom level."

**PIPEDA assessment:**

Under PIPEDA Principle 4 (Limiting Collection), collection must be limited to what is necessary for the stated purpose. The stated purpose here is offline rendering — not analytics, not behavior profiling. The tile set is necessary and appropriate.

However, the tile cache on disk is a **residual artifact** of location activity. If the device is accessed (lost, stolen, shared with household member), the cache content discloses which neighborhoods the user has viewed — and AccessMap's user base includes people with disabilities whose neighborhood-presence information can be sensitive (Const. Art. 7 — location, disability data = elevated sensitivity).

**Condition (C1):** The tile cache must be cleared on sign-out. See section on sign-out behavior below.

**Condition (C2):** The tile cache must not be included in any data export, sync, or backup to server storage. It is a local rendering performance artifact, not user data. It must be excluded from any future `dataExport.ts` expansion.

The cache keys (`zoom/x/y`) do not contain lat/lng explicitly, but a motivated reader can reverse them to real-world coordinates. Do not treat tile keys as opaque or non-sensitive in comments or documentation.

**Is it "location data" under PIPEDA?** Borderline. The tiles themselves contain no user identifier and are the same for every user worldwide — the same tile anyone who views that area gets. The *set of cached tiles per device* is a derived location artifact but is not directly PII. PIPEDA's "identified or identifiable individual" threshold is unlikely to be met by tile keys alone. However, combined with device ownership and AccessMap's sign-in model, the cache is attributable to a specific user account. Jordan recommends treating it as sensitive residual data and clearing it on sign-out (C1), which makes the legal question moot.

---

### Trigger 2 — Disability data (PIPEDA Principle 4)

**Fires? LOW — informational only, no condition required.**

The tiles themselves are generic OpenStreetMap imagery — building outlines, roads, parks. No disability-specific content is in the tile data. The tiles are the same for every user regardless of disability status.

**Tile access patterns** (which areas a user views most) are not stored anywhere in the proposed design — the cache is keyed by `zoom/x/y` with no timestamp or frequency counter. AccessMap does not have analytics infrastructure today. As long as the cache implementation does not log access frequency, recency, or hit-rate per tile to any persistent store, this trigger does not fire substantively.

**Shamus guidance:** Do NOT add per-tile metadata (last_accessed_at, hit_count, etc.) to the cache. If an eviction policy is needed, use tile-count-based LRU eviction in memory only — do not persist LRU metadata to disk.

---

### Trigger 3 — PII beyond auth

**Fires? NO.**

Tile URLs follow the standard OSM pattern: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. No user identifier, session token, API key, or account credential appears in tile URLs. The cached tile blobs are pure image data (PNG/JPEG). No PII concern here.

**One edge case to note:** if Shamus caches the tile URL as a cache key in AsyncStorage (in addition to the file path), verify the URL string contains no query parameters that could be user-specific (e.g., a future tile provider that uses session tokens). This is safe with OSM; it must be explicitly re-reviewed if the tile provider changes.

---

### Trigger 4 — RLS / auth / session

**Fires? NO — with one design instruction.**

Tile fetching from OSM is unauthenticated by definition. No Supabase changes are needed or appropriate. The tile cache has no relationship to the Supabase auth session.

**Design instruction for Shamus:** The tile cache must be stored under a path or AsyncStorage key namespace that includes the user's `auth.uid()` — even though tiles are generic and non-user-linked. Reason: AccessMap supports multiple accounts on the same device (Supabase supports account switching; it happens in practice when a user signs in as a different person or a developer tests). A device-wide tile cache is benign, but a user-keyed cache ensures that C1 (clear on sign-out) is implementable without nuking tiles for a different account. Follow the `savedPlaces.ts` pattern: `@accessmap/tile_cache_v1:{userId}` as the metadata key.

---

### Trigger 5 — External API sending user data outbound

**Fires? YES — informational only, no condition required (but document it).**

Tile requests go to `https://tile.openstreetmap.org/`. OSM tile servers receive:

- The request IP address (unavoidable — this is the TCP connection).
- The `User-Agent` header (set by the HTTP client, typically the OS/platform default).
- The requested tile path (`/{z}/{x}/{y}.png`).

AccessMap does not intentionally send any user identifier, Supabase session token, or PII to OSM servers. The IP address is not controlled by the app and is the same as any other internet request the device makes.

**OSM Usage Policy:** OSM tile servers have a usage policy that prohibits heavy tile-fetching that would constitute a DDoS or bulk download. A bounded offline cache (C3 below) naturally satisfies this — caching tiles for the user's visible area is standard, acceptable behavior. Pre-fetching large geographic areas programmatically (e.g., "download the whole city") would require a different tile source (e.g., MapTiler or a self-hosted tile server). The initial implementation should cache only tiles that the user has actually viewed, not speculatively pre-fetch.

**Condition (C3):** Tile caching must be demand-only — cache tiles as they are fetched during normal map use, not pre-fetched speculatively. Do not add any "download region for offline use" feature without a separate Jordan review.

---

### Trigger 6 — New data persistence layer

**Fires? YES — this is the primary trigger for this review.**

The tile cache is a new persistence layer. The existing persistence layers in AccessMap are all AsyncStorage-based and are bounded in size (savedPlaces: 50 entries, filterPresets: capped, addressRecents: 5 entries). The tile cache is the first file-system-level cache the app would have, and raster tiles are orders of magnitude larger than JSON preferences.

**Assessment:**

The project already follows good size-bounding conventions (see `savedPlaces.ts` MAX_PLACES, `filterPresets.ts` FILTER_PRESETS_MAX). The tile cache must follow the same discipline. Unbounded tile caches are a known failure mode in mapping apps — a user can fill device storage in an area with many zoom levels.

**Condition (C4) — Size bound:** The cache must be bounded to a maximum total size (recommended: 50 MB as a first-shipped default, configurable by Sky in a future settings pass). When the cache exceeds the cap, evict the oldest tiles (LRU or insertion-order). The cap protects users with limited device storage, and it prevents the cache from becoming a de-facto "map of my life" artifact.

**Condition (C5) — TTL:** Tiles must expire. OSM recommends honoring `Cache-Control` headers where present; if absent, a default TTL of 7 days is appropriate. Stale tiles must be re-fetched on expiry — do not serve indefinitely cached tiles. Reason: accessibility conditions change (new construction, ramps removed, etc.), and the app's core value is current accessibility data. A tile showing old imagery misleads the user about what infrastructure is present. 7 days is a reasonable balance between offline utility and data freshness.

---

## Sign-out and account switching behavior

This is the most important privacy-design question for this feature.

**Requirement:** When `supabase.auth.signOut()` is called (see `src/lib/auth.tsx` and `src/lib/supabase.ts`), the tile cache for the current user must be cleared. The clear must happen before the auth session is destroyed (to ensure the userId is still available for the cache key).

**Why:** The tile cache is a map of where the user has navigated. On a shared device (household tablet, work phone checked to a family member) or when a device is handed off, the residual cache discloses navigation patterns. Sign-out is the established privacy boundary in AccessMap — savedPlaces, filterSets, and preferences are all user-keyed and would be inaccessible after sign-out. The tile cache must follow the same boundary.

**Implementation guidance for Shamus:**

```typescript
// In auth.tsx or wherever signOut is handled — pseudocode only:
async function signOut(userId: string) {
  await clearTileCache(userId);   // clear before destroying session
  await supabase.auth.signOut();
}
```

The cache library or implementation should expose a `clearTileCache(userId: string): Promise<void>` function callable from the auth layer. This must not silently fail — if the clear fails, log a warning but proceed with sign-out (do not block auth logout on a cache error — user safety outweighs cache hygiene).

---

## Recommended implementation approach

Shamus should use `expo-file-system` (already in the Expo SDK 54 ecosystem) rather than AsyncStorage for tile storage. Reasons:

1. AsyncStorage is designed for small JSON values, not binary blobs. Storing tile PNGs as base64 in AsyncStorage degrades performance for all other AsyncStorage reads.
2. `expo-file-system` provides a dedicated cache directory (`FileSystem.cacheDirectory`) that the OS may evict when storage is low — this is exactly the right behavior for a tile cache.
3. File-system paths make it straightforward to enumerate and size the cache for the C4 size-bound requirement.

**Proposed storage layout:**
```
<cacheDirectory>/tile_cache/<userId>/<zoom>/<x>/<y>.png
```

**Metadata index** (in AsyncStorage, small JSON):
```
@accessmap/tile_cache_meta_v1:<userId>  →  { totalBytes: number, entries: [{path, insertedAt, expiresAt, bytes}] }
```

The metadata index enables: size-bound enforcement (C4), TTL expiry (C5), and user-keyed clear on sign-out (C1). It follows the existing pattern in `savedPlaces.ts` and `filterPresets.ts`.

---

## Conditions for Shamus to build

All five conditions are merge gates — not optional:

| # | Condition | Where to implement |
|---|---|---|
| C1 | Clear tile cache on sign-out (keyed by userId) | `src/lib/auth.tsx` or `src/lib/supabase.ts` signOut flow |
| C2 | Exclude tile cache from any data export or server sync | `src/lib/dataExport.ts` — add explicit exclusion comment |
| C3 | Demand-only caching — no speculative pre-fetch | `src/lib/tileCache.ts` (new file) — cache only tiles fetched during normal use |
| C4 | Size bound — max 50 MB, LRU eviction | `src/lib/tileCache.ts` — enforce in the write path |
| C5 | TTL — expire tiles after 7 days (or `Cache-Control` max-age if shorter) | `src/lib/tileCache.ts` — check expiry on every cache read |

No new database tables, migrations, or RLS changes are required for this feature.

---

## About screen copy update (required before ship)

The current About > Your privacy section says:

> "We store flag reports and your profile. Location is requested only when you use the map. No tracking, no ads."

Add one sentence to cover the new persistence layer:

> "Map tiles are cached on your device for up to 7 days so the map works offline. The cache is cleared when you sign out."

(Sky / Will may wordsmith — the required disclosures are: cache exists, it is bounded in time, it clears on sign-out.)

---

## What was reviewed

- `src/components/PlatformMap.tsx` — native map (react-native-maps + PROVIDER_DEFAULT, no direct tile URL control)
- `src/components/PlatformMap.web.tsx` — web map (react-leaflet, OSM TileLayer at `tile.openstreetmap.org`)
- `src/lib/savedPlaces.ts` — pattern reference for user-keyed, bounded AsyncStorage with write-lock
- `src/lib/mapFilters.ts` — pattern reference for device-wide ephemeral preferences
- `src/lib/addressRecents.ts` — pattern reference for fail-soft, capped storage
- `src/lib/location.ts` — location permission handling, Const. Art. 9.6 compliance
- `src/lib/preferences.ts` — user-keyed AsyncStorage key pattern
- `src/lib/dataExport.ts` — (existence confirmed) data export surface
- `src/lib/supabase.ts` — auth helpers
- `CLAUDE.md` — error handling tiers, stack confirmation (Expo SDK 54, expo-file-system available)

## What was NOT reviewed

- The tile library Shamus selects (e.g., `react-native-maps-offline`, `expo-file-system` direct, or a third-party cache wrapper). The chosen library must be reviewed for any analytics/telemetry it sends before use.
- Any future "download region for offline use" feature — that is a separate Jordan gate.

---

## Out-of-scope notice

Per Const. Art. 5.3, this review contains no code changes. Per Const. Art. 9, Jordan does not message Sky — Morgan picks up this report on the next status sweep.

**One follow-up item for backlog (not a blocker):** If AccessMap ever adds analytics (screen-time, feature usage), the tile-request hit-rate must NOT be included in analytics payloads. Tile hit-rate is a proxy for map-view location frequency. Flag this as a future Jordan trigger if an analytics library is ever added.
