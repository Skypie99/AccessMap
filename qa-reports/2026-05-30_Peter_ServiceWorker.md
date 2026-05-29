# Peter — Service Worker (2026-05-30)

## Feature
Offline support for AccessMap web via Service Worker.

## Files
- `public/sw.js` — service worker (copied to `dist/sw.js` by `expo export`)
- `public/index.html` — Expo HTML template with SW registration script injected

## Caching strategies

| Request type | Strategy | Detail |
|---|---|---|
| Map tiles (`tile.openstreetmap.org`, `/tiles/`) | CacheFirst | Served from `accessmap-tiles-v1`; network miss fills cache; offline returns 504 so Leaflet shows blank tile gracefully |
| Supabase API (`supabase.co` / `supabase.io`) | NetworkFirst | Fresh network response preferred; cached fallback when offline; failed network + no cache returns `{"error":"offline"}` 503 JSON |
| App shell (JS bundles, CSS, assets) | StaleWhileRevalidate | Cached response served immediately; cache updated in background from network |

## How it works with Expo

Expo SDK 54 (Metro bundler) reads `public/index.html` as the HTML template at
build time (`expo export --platform web`). Scripts and CSS links are injected
into it automatically. The `public/` folder contents are copied verbatim to
`dist/` — so `public/sw.js` lands at `dist/sw.js` → served at `/sw.js`.

The SW registration is inlined in `public/index.html` as a `<script>` block in
`<body>`. It only runs if `'serviceWorker' in navigator`, so non-supporting
browsers degrade silently.

## Offline behavior

| Scenario | Offline available? |
|---|---|
| Previously visited map tiles | Yes — served from CacheFirst tile cache |
| New tiles in unvisited areas | No — requires connection |
| Flag browsing (cached Supabase responses) | Briefly — NetworkFirst serves last cached response |
| Flag reporting / photo upload | No — requires connection (by design; location data per Art. 9.4) |
| App shell / UI | Yes — StaleWhileRevalidate returns cached bundles |

## Cache management
- Install: pre-caches `'/'`; skips hashed JS/CSS bundles (populated on first load)
- Activate: cleans stale caches from prior `CACHE_VERSION` strings
- Version bump: increment `CACHE_VERSION` in `public/sw.js` to invalidate all caches on next deploy

## Branch: `feat/service-worker-2026-05-30`
## TypeScript: 0 errors (`npm run typecheck`)
## No native changes — SW is web-only (`public/` folder)
