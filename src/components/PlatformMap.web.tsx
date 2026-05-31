import 'leaflet/dist/leaflet.css';
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MapContainer, Marker, Popup, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import L, { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import Supercluster from 'supercluster';
import { CATEGORY_LABELS, isAnon, severityColor } from '@/lib/flags';
import { heatmapSeverity as severityTokens } from '@/theme';
import { useColor } from '@/theme/ThemeContext';
import type { FlagRow } from '@/types/database';
import { useAuth } from '@/lib/auth';
import { getCachedTile, setCachedTile } from '@/lib/tileCache';
import { track } from '@/lib/analytics';
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
      box-shadow:0 1px 3px rgba(15,27,45,0.12),0 1px 2px rgba(15,27,45,0.08);
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
      filter:drop-shadow(0 4px 8px rgba(15,27,45,0.28)) drop-shadow(0 1px 2px rgba(15,27,45,0.12));
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
// WCAG 2.2 AA contrast helper — picks #111 or #fff for text on a hex bg.
// Relative luminance via W3C formula; threshold 0.179 gives ≥4.5:1 on both.
// ---------------------------------------------------------------------------
function pickContrastText(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const r = toLinear(parseInt(hex.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(hex.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(hex.slice(4, 6), 16) / 255);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.179 ? '#111' : '#fff';
}

// ---------------------------------------------------------------------------
// Cluster icon — a branded bubble showing the count. Matches the native
// ClusteredMapView style: brand-color fill, WCAG-contrast text, subtle shadow.
// Cache by (brandColor + count) so identical bubbles share one DivIcon.
// ---------------------------------------------------------------------------
const clusterIconCache = new Map<string, L.DivIcon>();

function makeClusterIcon(brandColor: string, textColor: string, count: number): L.DivIcon {
  const label = count >= 1000 ? `${Math.floor(count / 1000)}k` : String(count);
  const key = `${brandColor}|${textColor}|${label}`;
  const cached = clusterIconCache.get(key);
  if (cached) return cached;
  // Diameter scales with count so large clusters are visually heavier.
  const size = count <= 9 ? 34 : count <= 99 ? 40 : 46;
  const icon = L.divIcon({
    className: 'accessmap-cluster',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:50%;
      background:${brandColor};color:${textColor};
      font-weight:700;font-size:${size <= 34 ? 13 : 12}px;
      border:2.5px solid rgba(255,255,255,0.85);
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      cursor:pointer;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  clusterIconCache.set(key, icon);
  return icon;
}

// GeoJSON point feature shape fed into Supercluster.
type FlagPointFeature = GeoJSON.Feature<GeoJSON.Point, { flagId: string }>;

// ---------------------------------------------------------------------------
// ClusteredMarkers — inner react-leaflet component that:
//   1. Builds a Supercluster index from the flags prop (only on flags change).
//   2. Listens to zoomend / moveend to recompute the visible cluster set.
//   3. Renders cluster bubbles (click → zoom to expansion zoom) and pins.
//
// markerRefs is shared with the outer PlatformMap so showCallout() can open
// a popup on an individual pin once the cluster has been expanded.
// ---------------------------------------------------------------------------
interface ClusteredMarkersProps {
  flags: FlagRow[];
  focusedFlagId: string | null;
  brandColor: string;
  textOnBrand: string;
  markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>;
}

function ClusteredMarkers({
  flags,
  focusedFlagId,
  brandColor,
  textOnBrand,
  markerRefs,
}: ClusteredMarkersProps) {
  const map = useMap();
  const themeColor = useColor();

  // Build the Supercluster index whenever the flag list changes. radius=60px
  // matches the native variant's radius={40} scaled up for typical web dpi.
  const index = useMemo(() => {
    const sc = new Supercluster<{ flagId: string }, Record<string, never>>({
      radius: 60,
      maxZoom: 16,
      minPoints: 2,
    });
    const features: FlagPointFeature[] = flags.map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
      properties: { flagId: f.id },
    }));
    sc.load(features);
    return sc;
  }, [flags]);

  // Build a flag lookup map so rendering a pin doesn't need a linear scan.
  const flagsById = useMemo(
    () => new Map(flags.map((f) => [f.id, f])),
    [flags],
  );

  // Cluster/point features visible in the current viewport.
  const [clusters, setClusters] = useState<ReturnType<typeof index.getClusters>>([]);

  const recompute = useCallback(() => {
    const bounds = map.getBounds();
    const zoom = Math.floor(map.getZoom());
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    setClusters(index.getClusters(bbox, zoom));
  }, [map, index]);

  // Initial computation + recompute whenever the index changes (flag list reload).
  useEffect(() => {
    recompute();
  }, [recompute]);

  // Subscribe to map view changes.
  useMapEvents({ zoomend: recompute, moveend: recompute });

  return (
    <>
      {clusters.map((feature) => {
        // GeoJSON Position is number[] — index access is safe here because
        // Supercluster always produces valid [lng, lat] Point coordinates.
        const lng = feature.geometry.coordinates[0] as number;
        const lat = feature.geometry.coordinates[1] as number;
        // Cast to a loose record so we can safely check the `cluster` flag
        // that Supercluster injects onto cluster features.
        const props = feature.properties as Record<string, unknown>;

        if (props.cluster) {
          const count = props.point_count as number;
          const clusterId = props.cluster_id as number;
          const icon = makeClusterIcon(brandColor, pickContrastText(brandColor), count);
          const a11yLabel = `${count} accessibility ${count === 1 ? 'flag' : 'flags'} grouped. Tap to zoom in and expand.`;

          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={icon}
              alt={a11yLabel}
              title={`${count} flags — tap to expand`}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    index.getClusterExpansionZoom(clusterId),
                    18,
                  );
                  map.flyTo([lat, lng], expansionZoom, { duration: 0.4 });
                },
              }}
            />
          );
        }

        // Individual pin.
        const flagId = (props as { flagId: string }).flagId;
        const flag = flagsById.get(flagId);
        if (!flag) return null;

        const flagIsAnon = isAnon(flag);
        return (
          <Marker
            key={flag.id}
            position={[flag.lat, flag.lng]}
            icon={pinIcon(
              flagIsAnon ? '#9CA3AF' : severityColor(flag.severity),
              !flagIsAnon && focusedFlagId !== null && focusedFlagId !== flag.id,
            )}
            // alt is what screen readers announce for the marker; title is
            // the browser tooltip. Mirrors the accessibilityLabel on the
            // native Marker so SR users hear the same description on web.
            alt={`${CATEGORY_LABELS[flag.category]}, severity ${flag.severity}, ${flag.status}${flagIsAnon ? ', submitted anonymously' : ''}. Open for details.`}
            title={`${CATEGORY_LABELS[flag.category]} — severity ${flag.severity}${flagIsAnon ? ' (anonymous)' : ''}`}
            ref={(m) => {
              markerRefs.current[flag.id] = m;
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {CATEGORY_LABELS[flag.category]}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: themeColor.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  Severity {flag.severity} · {flag.status}
                  {flagIsAnon ? ' · Anonymous' : ''}
                </div>
                {flag.photo_url ? (
                  <img
                    src={flag.photo_url}
                    alt={`Photo of ${CATEGORY_LABELS[flag.category]} accessibility issue`}
                    style={{
                      width: '100%',
                      maxHeight: 160,
                      objectFit: 'cover',
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  />
                ) : null}
                {flag.description ? (
                  <div style={{ marginTop: 6, fontSize: 12 }}>{flag.description}</div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
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
          track('tile_cache_hit', { zoom: coords.z });
          img.onload = () => done(undefined, img);
          img.onerror = () => {
            img.src = url;
            done(undefined, img);
          };
          img.src = cached;
          return;
        }

        // Step 2: cache miss — fetch, convert, store, display
        track('tile_cache_miss', { zoom: coords.z });
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
        {/* Clustered flag markers — groups nearby pins into branded bubbles
              at low zoom; expands to individual pins at zoom 17+. */}
        <ClusteredMarkers
          flags={flags}
          focusedFlagId={focusedFlagId}
          brandColor={themeColor.brand}
          textOnBrand={themeColor.textOnBrand}
          markerRefs={markerRefs}
        />
      </MapContainer>
    </div>
  );
});

// See PlatformMap.tsx — same rationale: memo skips re-renders for parent
// state changes unrelated to map props. Critical on web because every
// re-render rebuilds Leaflet's Marker layers.
export default memo(PlatformMap);
