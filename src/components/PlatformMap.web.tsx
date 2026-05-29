import 'leaflet/dist/leaflet.css';
import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { MapContainer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import L, { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { CATEGORY_LABELS, severityColor } from '@/lib/flags';
import { severity as severityTokens } from '@/theme';
import { useColor } from '@/theme/ThemeContext';
import type { FlagRow } from '@/types/database';
import { useAuth } from '@/lib/auth';
import { getCachedTile, setCachedTile } from '@/lib/tileCache';
import { colorForCell, HEATMAP_FILL_OPACITY, type HeatCell, type HeatmapMode } from '@/lib/heatmap';

export interface PlatformMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface PlatformMapHandle {
  animateTo: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  }) => void;
  showCallout: (flagId: string) => void;
}

export interface PlatformMapProps {
  initialRegion: PlatformMapRegion;
  flags: FlagRow[];
  focusedFlagId: string | null;
  showsUserLocation?: boolean;
  /** When true, animateTo uses an instant pan (duration 0) to respect
   *  the user's "Reduce Motion" system preference (WCAG 2.3.3). */
  reducedMotion?: boolean;
  /**
   * Drop-flag intent: native fires this on long-press; web fires it on
   * the map's `contextmenu` event (right-click, or long-press on
   * touchscreens which the browser surfaces as contextmenu). Coordinate
   * is the geographic point under the press.
   */
  onLongPressMap?: (coord: { lat: number; lng: number }) => void;
  /** Pre-computed heat-map cells (already privacy-filtered to k>=3). */
  heatCells?: HeatCell[];
  /** Heat-map colour mode. Matches the native variant. */
  heatmapMode?: HeatmapMode;
}

// Cache the heat-label divIcon by (color + tone + number). Cells with the
// same rounded mean severity render an identical badge, so caching keeps
// Leaflet from rebuilding hundreds of icons during a pan.
const heatLabelIconCache = new Map<string, L.DivIcon>();
function heatLabelIcon(fill: string, text: string, textColor: string): L.DivIcon {
  const key = `${fill}|${text}|${textColor}`;
  const cached = heatLabelIconCache.get(key);
  if (cached) return cached;
  // Inline styles so the badge paints identically on the first frame
  // without waiting for any external stylesheet.
  const icon = L.divIcon({
    className: 'accessmap-heat-label',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      min-width:28px;height:28px;padding:0 8px;
      background:${fill};color:${textColor};
      font-weight:700;font-size:13px;
      border:1.5px solid #fff;border-radius:14px;
      box-shadow:0 1px 3px rgba(0,0,0,0.25);
    ">${text}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  heatLabelIconCache.set(key, icon);
  return icon;
}

// Cache pin icons by (color + dim). There are only 6 possible combinations
// (5 severity colors + the gray fallback × 2 dim states), so this dictionary
// caps at ~12 entries for the life of the page. Without the cache every
// render builds a brand-new L.DivIcon for every flag, and Leaflet treats a
// new icon as a marker change → unnecessary re-renders at hundreds of pins.
const pinIconCache = new Map<string, L.DivIcon>();
function pinIcon(color: string, dim: boolean): L.DivIcon {
  const key = `${color}|${dim ? 1 : 0}`;
  const cached = pinIconCache.get(key);
  if (cached) return cached;
  // Two-layer pin: a soft outer halo for depth + an inner severity dot with a
  // crisp white ring. Reads as a "pin" rather than a flat blob, and keeps
  // good contrast against the OSM tile background.
  const icon = L.divIcon({
    className: 'accessmap-pin',
    html: `<div style="
      position:relative;width:26px;height:26px;
      display:flex;align-items:center;justify-content:center;
      opacity:${dim ? 0.55 : 1};
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));
    ">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:${color};opacity:0.22;
      "></div>
      <div style="
        width:18px;height:18px;border-radius:50%;
        background:${color};
        border:2.5px solid #fff;
        box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);
      "></div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
  pinIconCache.set(key, icon);
  return icon;
}

function deltaToZoom(latitudeDelta: number): number {
  return Math.max(2, Math.min(18, Math.round(Math.log2(360 / latitudeDelta))));
}

// ---------------------------------------------------------------------------
// CachedTileLayer — extends L.TileLayer to intercept tile HTTP requests and
// route them through the offline tile cache (getCachedTile / setCachedTile).
//
// Strategy per tile:
//   1. Build the concrete tile URL (Leaflet already does this in getTileUrl).
//   2. Check the cache (getCachedTile). On HIT: set img.src to the stored
//      data-URI and call done() immediately — no network round-trip.
//   3. On MISS: fetch() → Blob → FileReader → base64 data-URI → set img.src
//      → fire-and-forget setCachedTile → call done().
//   4. On ANY error (network, FileReader, cache write): fall back to setting
//      img.src directly to the URL so Leaflet can try its own XHR retry path.
//      A broken tile is never shown.
// ---------------------------------------------------------------------------

interface CachedTileLayerOptions extends L.TileLayerOptions {
  userId: string | null;
}

class CachedTileLayer extends L.TileLayer {
  private _userId: string | null;

  constructor(urlTemplate: string, options: CachedTileLayerOptions) {
    const { userId, ...rest } = options;
    super(urlTemplate, rest);
    this._userId = userId;
  }

  createTile(
    coords: L.Coords,
    done: (err: Error | undefined, tile: HTMLElement) => void,
  ): HTMLElement {
    const img = document.createElement('img');
    // Required for CORS tiles (e.g. OSM)
    img.crossOrigin = 'anonymous';
    img.alt = '';

    const url = this.getTileUrl(coords);
    const userId = this._userId;

    if (!userId) {
      // No authenticated user — skip cache, load tile directly.
      img.onload = () => done(undefined, img);
      img.onerror = () => done(undefined, img); // keep fallback: never broken
      img.src = url;
      return img;
    }

    void (async () => {
      try {
        // Step 1: cache hit?
        const cached = await getCachedTile(userId, url);
        if (cached) {
          img.onload = () => done(undefined, img);
          img.onerror = () => {
            img.src = url;
            done(undefined, img);
          };
          img.src = cached;
          return;
        }

        // Step 2: cache miss — fetch, convert, store, display
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Tile fetch failed: ${response.status}`);
        const blob = await response.blob();

        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        img.onload = () => done(undefined, img);
        img.onerror = () => {
          img.src = url;
          done(undefined, img);
        };
        img.src = dataUri;

        // Fire-and-forget: persist to cache; errors are swallowed by
        // setCachedTile itself (it already logs internally).
        void setCachedTile(userId, url, dataUri);
      } catch {
        // Any error → graceful fallback to direct URL (never a broken tile)
        img.onload = () => done(undefined, img);
        img.onerror = () => done(undefined, img);
        img.src = url;
      }
    })();

    return img;
  }
}

// ---------------------------------------------------------------------------
// CachedTileLayerWrapper — react-leaflet inner component that mounts the
// CachedTileLayer imperatively via useMap(). Re-creates the layer whenever
// userId changes so tiles are always keyed to the current authenticated user.
// ---------------------------------------------------------------------------

// CartoDB Dark Matter — matches the app's dark UI.
const OSM_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

function CachedTileLayerWrapper({ userId }: { userId: string | null }): null {
  const map = useMap();

  useEffect(() => {
    const layer = new CachedTileLayer(OSM_URL, {
      attribution: OSM_ATTRIBUTION,
      userId,
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, userId]);

  return null;
}

const PlatformMap = forwardRef<PlatformMapHandle, PlatformMapProps>(function PlatformMap(
  {
    initialRegion,
    flags,
    focusedFlagId,
    reducedMotion,
    onLongPressMap,
    heatCells = [],
    heatmapMode = 'gradient',
  },
  ref,
) {
  const themeColor = useColor();
  const mapInstance = useRef<LeafletMap | null>(null);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  // See PlatformMap.tsx for why we prune: ref callbacks leave null entries
  // behind when markers unmount; without pruning, the dict grows forever.
  useEffect(() => {
    const valid = new Set(flags.map((f) => f.id));
    for (const id of Object.keys(markerRefs.current)) {
      if (!valid.has(id)) delete markerRefs.current[id];
    }
  }, [flags]);

  // Wire `contextmenu` to the drop-flag intent on web. Leaflet fires
  // this on right-click on desktop and on a long-touch on mobile
  // browsers (the OS surfaces the press as a context menu request).
  // We re-bind on every change to `onLongPressMap` so the latest
  // closure is used.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !onLongPressMap) return;
    const handler = (e: L.LeafletMouseEvent) => {
      // Prevent the browser's default right-click menu from showing
      // over the map.
      const oe = e.originalEvent;
      if (oe && 'preventDefault' in oe) oe.preventDefault();
      onLongPressMap({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('contextmenu', handler);
    return () => {
      map.off('contextmenu', handler);
    };
  }, [onLongPressMap]);

  useImperativeHandle(
    ref,
    () => ({
      animateTo: (r) => {
        const zoom = deltaToZoom(r.latitudeDelta ?? 0.005);
        mapInstance.current?.flyTo([r.latitude, r.longitude], zoom, {
          // Instant jump when "Reduce Motion" is on (WCAG 2.3.3).
          duration: reducedMotion ? 0 : 0.6,
        });
      },
      showCallout: (id) => {
        markerRefs.current[id]?.openPopup();
      },
    }),
    [reducedMotion],
  );

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <MapContainer
        center={[initialRegion.latitude, initialRegion.longitude]}
        zoom={deltaToZoom(initialRegion.latitudeDelta)}
        style={{ height: '100%', width: '100%' }}
        ref={(m) => {
          mapInstance.current = m;
        }}
      >
        <CachedTileLayerWrapper userId={userId} />
        {/* Heat-map: Rectangle for each cell footprint + a divIcon Marker
              at the centroid showing the rounded mean severity. Leaflet
              paints Rectangles on `overlayPane` (SVG default) which sits
              beneath `markerPane`, so the cell tints render under the pins
              without any explicit z-index work. */}
        {heatCells.map((cell) => {
          const fill = colorForCell(cell, heatmapMode, severityTokens, themeColor.brand);
          const meanRounded = Math.round(cell.meanSeverity);
          const labelTone = meanRounded >= 3 ? themeColor.textOnBrand : themeColor.textStrong;
          const icon = heatLabelIcon(fill, String(meanRounded), labelTone);
          return (
            <React.Fragment key={`heat-${cell.key}`}>
              <Rectangle
                bounds={[
                  [cell.latStart, cell.lngStart],
                  [cell.latEnd, cell.lngEnd],
                ]}
                pathOptions={{
                  color: fill,
                  weight: 1,
                  fillColor: fill,
                  fillOpacity: HEATMAP_FILL_OPACITY,
                  interactive: false,
                }}
              />
              <Marker
                position={[cell.lat, cell.lng]}
                icon={icon}
                // Decorative aggregate — let keyboard focus stay on real pins.
                keyboard={false}
                alt={`Heat zone: ${cell.count} flags, mean severity ${cell.meanSeverity.toFixed(1)} out of 5.`}
                title={`${cell.count} flags · mean severity ${cell.meanSeverity.toFixed(1)}`}
              />
            </React.Fragment>
          );
        })}
        {flags.map((f) => (
          <Marker
            key={f.id}
            position={[f.lat, f.lng]}
            icon={pinIcon(
              severityColor(f.severity),
              focusedFlagId !== null && focusedFlagId !== f.id,
            )}
            // alt is what screen readers announce for the marker; title is
            // the browser tooltip. Mirrors the accessibilityLabel on the
            // native Marker so SR users hear the same description on web.
            alt={`${CATEGORY_LABELS[f.category]}, severity ${f.severity}, ${f.status}. Open for details.`}
            title={`${CATEGORY_LABELS[f.category]} — severity ${f.severity}`}
            ref={(m) => {
              markerRefs.current[f.id] = m;
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{CATEGORY_LABELS[f.category]}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  Severity {f.severity} · {f.status}
                </div>
                {f.photo_url ? (
                  <img
                    src={f.photo_url}
                    alt={`Photo of ${CATEGORY_LABELS[f.category]} accessibility issue`}
                    style={{
                      width: '100%',
                      maxHeight: 160,
                      objectFit: 'cover',
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  />
                ) : null}
                {f.description ? (
                  <div style={{ marginTop: 6, fontSize: 12 }}>{f.description}</div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
});

// See PlatformMap.tsx — same rationale: memo skips re-renders for parent
// state changes unrelated to map props. Critical on web because every
// re-render rebuilds Leaflet's Marker layers.
export default memo(PlatformMap);
