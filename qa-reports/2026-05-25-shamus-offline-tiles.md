# Shamus QA Report — Offline Tile Caching
**Date:** 2026-05-25
**Branch:** `feat/offline-tiles-2026-05-25` (commit `bd33f12`)
**Engineer:** Shamus (Feature Engineer)
**Feature:** Offline map tile cache — Jordan C1–C5

---

## Summary

Built the tile cache layer, hooked it into `signOut`, added the privacy note to `AboutScreen`, and wrote 12 unit tests. All five Jordan conditions are addressed — three are fully implemented, two (tile interception) are architecturally propose-only with clear upgrade paths.

---

## Jordan Conditions — Status

| Condition | Description | Status |
|---|---|---|
| C1 | Clear cache on sign-out | DONE — `clearTileCache(userId)` added to `signOut()` in `supabase.ts` |
| C2 | Exclude from data export; document in About/Privacy | DONE — sentence added to `AboutScreen.tsx` "Your privacy" section |
| C3 | Demand-only caching — no speculative pre-fetch | DONE (by design) — `setCachedTile` is only called by callers who already fetched; no background pre-fetch code exists |
| C4 | 50 MB size bound with LRU eviction | DONE — `evictLRU()` trims to 40 MB when total exceeds 50 MB |
| C5 | 7-day TTL | DONE — `getCachedTile` returns null and prunes entries older than `TILE_TTL_MS = 7 * 24 * 60 * 60 * 1000` |

---

## Architecture Path Taken

**`expo-file-system` not installed.** `package.json` has `@react-native-async-storage/async-storage@2.2.0` but no `expo-file-system`. Per the spec: tile data is stored in AsyncStorage as base64-encoded strings.

**Pros of this path:** zero new dependencies, immediate testability, works on web too.

**Cons:** AsyncStorage has a 6 MB per-key limit on some platforms and serializes tile data through JSON. For large tile sets this will be slower than a file system approach.

**Propose-only upgrade path (for Sky's consideration):**
```
expo install expo-file-system
```
Then refactor `tileDataKey` storage to write binary blobs with `FileSystem.writeAsStringAsync(path, data, { encoding: 'base64' })` and read with `FileSystem.readAsStringAsync`. The metadata index in AsyncStorage stays unchanged. This would improve performance for large tile sets without changing the public API surface.

---

## Tile Interception — Propose-Only

### Native (`PlatformMap.tsx` / `react-native-maps`)

`react-native-maps` renders tiles using the platform's native map SDKs (Apple Maps / Google Maps). There is no JavaScript-level hook to intercept tile HTTP requests — doing so would require a native module that overrides `URLSession` on iOS or `OkHttp` on Android (a significant native code change, outside Expo managed workflow).

**Propose-only approach for Sky:** Switch from `PROVIDER_DEFAULT` to a custom tile overlay using `react-native-maps`' `<UrlTile>` or `<WMSTile>` components. These accept a `urlTemplate` and can be replaced with a custom RN component that proxies requests through a local HTTP server (e.g. using `expo-modules` or a custom native module). This is a multi-sprint effort.

**What was built instead:** The cache layer (`tileCache.ts`) is ready and tested. When tile interception becomes feasible, PlatformMap.tsx can call `getCachedTile` / `setCachedTile` at the interception point with zero changes to the cache module itself.

### Web (`PlatformMap.web.tsx` / `react-leaflet`)

Leaflet's `TileLayer` supports extension via `L.TileLayer.extend`. A custom tile layer can override `createTile` to check the cache before fetching. **However**, Expo Web does not support Service Workers in the managed workflow, so a SW-based approach is ruled out.

**Propose-only implementation for `PlatformMap.web.tsx`:**

```typescript
// CachedTileLayer.ts (web-only)
import L from 'leaflet';
import { getCachedTile, setCachedTile } from '@/lib/tileCache';

export function makeCachedTileLayer(userId: string, urlTemplate: string) {
  return L.TileLayer.extend({
    createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
      const img = document.createElement('img');
      const url = this.getTileUrl(coords);
      getCachedTile(userId, url).then((cached) => {
        if (cached) {
          img.src = `data:image/png;base64,${cached}`;
          done(undefined, img);
        } else {
          img.onload = () => {
            // Convert to base64 via canvas and cache
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const b64 = canvas.toDataURL('image/png').split(',')[1];
            if (b64) setCachedTile(userId, url, b64).catch(() => {});
            done(undefined, img);
          };
          img.onerror = (e) => done(e as ErrorEvent, img);
          img.src = url;
          img.crossOrigin = 'anonymous';
        }
      });
      return img;
    },
  });
}
```

This requires `userId` to be threaded into `PlatformMap.web.tsx` from `MapScreen` (via the auth context). This is a one-sprint effort and is the recommended next step.

---

## Files Changed

| File | Type | Description |
|---|---|---|
| `src/lib/tileCache.ts` | NEW | Core cache module — 4 exports + internal helpers |
| `src/lib/__tests__/tileCache.test.ts` | NEW | 12 unit tests |
| `src/lib/supabase.ts` | MODIFIED | Added `clearTileCache(userId)` call in `signOut()` |
| `src/screens/AboutScreen.tsx` | MODIFIED | Added tile cache privacy sentence (Jordan C2) |

---

## Quality Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm test -- --passWithNoTests --forceExit` | 780 passed (baseline: 768, +12 new) |
| Branch | `feat/offline-tiles-2026-05-25` — NOT merged to main |

---

## Git Note — Main Contaminated

During development, the commit was accidentally applied to `main` before being moved to the feature branch. The identical commit now exists on both `main` (SHA `9597c31`) and `feat/offline-tiles-2026-05-25` (SHA `bd33f12`).

**DECISION FOR SKY:** Please reset `main` back to `52fb592` with:
```
git checkout main
git reset --hard 52fb592
```
Then the feature branch (`feat/offline-tiles-2026-05-25`) is clean to review and merge normally when ready.

---

## Decisions for Sky

1. **Main branch cleanup (see above)** — requires `git reset --hard 52fb592` on main to undo the accidental commit.
2. **expo-file-system upgrade** — install and refactor tile data storage from AsyncStorage to FileSystem for better performance at scale. Propose-only today.
3. **Web tile interception** — implement `CachedTileLayer` for `PlatformMap.web.tsx` (see pseudo-code above). Straightforward — recommended for next sprint.
4. **Native tile interception** — requires native module work. Defer until managed workflow tile overlay is stable.
5. **`userId` threading** — when web tile interception is built, `userId` must be passed from `MapScreen` → `PlatformMap.web.tsx`. This is a small prop addition.
