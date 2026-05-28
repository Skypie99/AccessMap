# QA Report — Leaflet Tile Cache Interception
**Date:** 2026-05-25
**Role:** Shamus (Feature Engineer)
**Branch:** `feat/leaflet-tile-interception-2026-05-25`
**Commit:** 285a7d5
**File changed:** `src/components/PlatformMap.web.tsx` (only)

---

## Summary

Wired all Leaflet tile HTTP requests through the existing `tileCache` layer in the web map. Tiles are now served from `AsyncStorage` on cache hit, and persisted to the cache on every new network fetch. Unauthenticated users and all error paths fall back to direct URL loads — a broken tile is never shown.

---

## Implementation

### Approach

Extended `L.TileLayer` with a `CachedTileLayer` class that overrides `createTile`. A thin `CachedTileLayerWrapper` React component (uses `useMap()` from react-leaflet) mounts and removes the layer imperatively inside `MapContainer`. The existing `<TileLayer>` JSX was replaced with `<CachedTileLayerWrapper userId={userId} />`.

### Per-tile flow (CachedTileLayer.createTile)

1. Build tile URL via `this.getTileUrl(coords)` (Leaflet's own resolver — handles `{s}`, `{z}`, `{x}`, `{y}` substitution).
2. If `userId` is null (unauthenticated): set `img.src = url` directly, skip cache entirely.
3. `getCachedTile(userId, url)` — **HIT**: set `img.src` to stored data-URI, call `done()`. No network.
4. **MISS**: `fetch(url)` → `response.blob()` → `FileReader.readAsDataURL` → data-URI → set `img.src` → call `done()` → fire-and-forget `setCachedTile(userId, url, dataUri)`.
5. Any thrown error (network, FileReader, bad status): fall back to `img.src = url`, call `done()` — never a broken tile.

### userId source

`useAuth()` hook (from `@/lib/auth`) is called inside `PlatformMap`. `user?.id ?? null` is passed down to `CachedTileLayerWrapper`. When the user logs out and `userId` becomes null, the `useEffect` dependency causes the layer to re-mount in unauthenticated mode, automatically stopping cache reads/writes.

### TypeScript

- `CachedTileLayerOptions` extends `L.TileLayerOptions` with `userId: string | null` — no implicit any.
- `createTile` signature matches `L.TileLayer`'s override signature exactly.
- `CachedTileLayerWrapper` returns `null` typed as `null` (not `React.ReactElement | null`) which is valid for a react-leaflet inner component.

---

## Gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npm test -- --no-coverage` (tail) | **789 passed, 789 total** (52 suites) |

---

## Constraints

- Only `src/components/PlatformMap.web.tsx` was modified. Zero native code changes.
- No new dependencies introduced.
- Cache API used exactly as specified: `getCachedTile(userId, url) → Promise<string|null>`, `setCachedTile(userId, url, data) → Promise<void>`.

---

## Not merged

Branch committed and pushed to `feat/leaflet-tile-interception-2026-05-25`. No merge to `main`.

---

## DECISIONS FOR SKY

None — implementation is straightforward and all constraints satisfied.
