// Flagstone Service Worker — offline support
// Strategies: CacheFirst for tiles, NetworkFirst for Supabase API + navigations, StaleWhileRevalidate for hashed app shell

const CACHE_VERSION = 'v3';
const CACHE_NAME = 'accessmap-' + CACHE_VERSION;
const TILE_CACHE = 'accessmap-tiles-' + CACHE_VERSION;

// Static assets to pre-cache on install.
// Expo hashes JS/CSS bundles so we skip pre-caching them here;
// they get added to CACHE_NAME on first load via StaleWhileRevalidate.
const STATIC_ASSETS = [
  '/',
];

// ─── Install ─────────────────────────────────────────────────────────────────
// Pre-cache static assets and activate immediately.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Non-fatal: if '/' fails (e.g. offline at SW install time), continue anyway.
      });
    })
  );
  // Take control of all clients without waiting for old SW to unload.
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
// Remove caches from previous versions to free storage.

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Claim all open tabs so the SW takes effect immediately.
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests — POST/PUT/DELETE go straight to network.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // ── Map tiles: CacheFirst ─────────────────────────────────────────────────
  // Tiles rarely change; serve from cache immediately when available.
  // Falls back to network on a cache miss, then stores the response.
  //
  // This rule follows the approved OpenFreeMap browser basemap. Bumping the
  // cache version discards old CARTO imagery rather than retaining the
  // provider's API-key watermark in an existing browser cache.
  //
  // Vector style, sprite, font, and tile requests all use this documented host.
  // CacheFirst preserves the existing offline web behavior; the requests carry
  // only normal browser/network metadata and viewport-derived map geography.
  // They do not include app identity, report data, or authentication tokens.
  //
  // Host tests are exact, not substring matches. A loose match could route an
  // attacker-controlled host into the trusted cache.
  //
  const isTile = url.hostname === 'tiles.openfreemap.org';

  if (isTile) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          // Tile not cached and offline — return 504 so Leaflet shows blank tile.
          return new Response('', { status: 504, statusText: 'Gateway Timeout' });
        }
      })
    );
    return;
  }

  // ── Supabase API: NetworkFirst ────────────────────────────────────────────
  // Always try the network first so users get fresh data.
  // Falls back to a previously cached response when offline.
  // Suffix match, not substring — see the note on the tile rule above.
  const isSupabase =
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.supabase.io');

  if (isSupabase) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses for offline fallback.
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ error: 'offline' }), {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              })
          )
        )
    );
    return;
  }

  // ── Navigations: NetworkFirst ─────────────────────────────────────────────
  // The HTML shell must reflect the latest deploy, so try the network first and
  // fall back to cache (then '/') only when offline. Hashed JS/CSS keep
  // StaleWhileRevalidate below.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(request)) ||
            (await cache.match('/')) ||
            new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          );
        })
    );
    return;
  }

  // ── App shell (JS, CSS, assets): StaleWhileRevalidate ────────────────────
  // Return cached response immediately (fast), then update the cache in the
  // background so the next load gets fresh content.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // Serve cached immediately; fall back to network if nothing cached.
      return cached || networkPromise;
    })
  );
});
