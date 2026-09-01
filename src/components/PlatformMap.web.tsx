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
import { CATEGORY_LABELS, isAnon, SEVERITY_LABELS, severityColor, STATUS_LABELS } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import type { FlagCategory, FlagRow } from '@/types/database';
import { heatmapSeverity as severityTokens } from '@/theme';
import { useColor } from '@/theme/ThemeContext';
import { useAuth } from '@/lib/auth';
import { getCachedTile, setCachedTile } from '@/lib/tileCache';
import { track } from '@/lib/analytics';
import { colorForCell, HEATMAP_FILL_OPACITY, type HeatCell, type HeatmapMode } from '@/lib/heatmap';
import { safeImageUrl } from '@/lib/remoteImageUrl';

export interface PlatformMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface PlatformMapHandle {
  /** Move the camera. `opts.calloutClear` marks a callout-bound move (T1 /
   *  F2-01): native biases the target below the measured top chrome so the
   *  callout opens in clear map; web keeps exact targeting (its clearance
   *  runs at popup-open via autoPan / the Reduce-Motion instant cut). */
  animateTo: (
    region: {
      latitude: number;
      longitude: number;
      latitudeDelta?: number;
      longitudeDelta?: number;
    },
    opts?: { calloutClear?: boolean },
  ) => void;
  /** Returns false while the requested marker is not mounted, allowing the
   * caller to retry readiness without reopening an already-visible popup. */
  showCallout: (flagId: string) => boolean;
  /** S4 / D6 — parity with the native handle. Leaflet keeps one popup open per
   *  map, so this is `closePopup()`, not a sweep. */
  hideCallout: () => void;
  /** Step the zoom by `delta` levels (+1 in, -1 out). Additive to the handle so
   *  the overlay's app-styled 44pt buttons drive zoom — replacing Leaflet's
   *  occluded, pointer-dead default control (WCAG 2.5.7). */
  zoomBy: (delta: number) => void;
  /** T7 (BP13): frame a region INSTANTLY — reuses the shared zero-motion
   *  `instantCut` (setView animate:false), deliberately NOT Reduce-Motion-gated
   *  because it replaces the initial paint (the no-location bounds-fit). */
  snapToRegion: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  }) => void;
}

export interface PlatformMapProps {
  initialRegion: PlatformMapRegion;
  flags: FlagRow[];
  focusedFlagId: string | null;
  showsUserLocation?: boolean;
  /** When true, animateTo uses an instant pan (duration 0) to respect
   *  the user's "Reduce Motion" system preference (WCAG 2.3.3). */
  reducedMotion?: boolean;
  /** S17: suppress the Leaflet attribution control on THIS instance (the
   *  decorative Home peek) so no live "Leaflet / OpenStreetMap / CARTO" links
   *  sit inside a button and can navigate the browser away from the app. The
   *  full Map omits this and keeps its legally-required attribution. */
  suppressAttribution?: boolean;
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
  /**
   * S3: the popup's "Open details" button opens the full FlagDetailModal (the
   * trust ledger). Mirrors the native variant's callout affordance. Optional so
   * existing callers/tests don't have to pass it.
   */
  onOpenDetails?: (flag: FlagRow) => void;
  /**
   * T1 (F2-01): the vertical px band of persistent top chrome (safe area +
   * overlay padding + the measured header/status rows + margin) an opening
   * pin callout must clear. Consumed clamped to ≤45% of the map's height.
   * Web feeds Leaflet's popup autoPan padding + the Reduce-Motion instant
   * cut; native biases callout-bound camera moves below it.
   */
  chromeInsetTop?: number;
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
      border:1.5px solid #0F1B2D;border-radius:14px;
      box-shadow:0 1px 3px rgba(15,27,45,0.12),0 1px 2px rgba(15,27,45,0.08);
    ">${text}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  heatLabelIconCache.set(key, icon);
  return icon;
}

// White category glyph drawn inside the pin — same shapes as CategoryIcon.
// A resolved flag shows a check instead.
const CAT_PIN_PATHS: Record<string, string> = {
  no_ramp:
    '<path d="M3 20 H21"/><path d="M5 20 L19 7"/><path d="M19 7 V20"/><circle cx="10.5" cy="15" r="1.6"/>',
  broken_sidewalk:
    '<path d="M8 21 L10 4"/><path d="M16 21 L14 4"/><path d="M11.3 10 H12.7"/><path d="M10.7 15 H13.3"/>',
  blocked_path: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6 L18.4 18.4"/>',
  missing_signal: '<path d="M5 21 L8 5"/><path d="M11 21 L12.5 5"/><path d="M17 21 L17 5"/>',
  steep_grade:
    '<path d="M3 20 H21"/><path d="M6 20 L18 7"/><path d="M18 7 L13.6 8"/><path d="M18 7 L17 11.4"/>',
  other:
    '<circle cx="12" cy="12" r="9"/><circle cx="7.5" cy="12" r="1.1" fill="#fff" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="#fff" stroke="none"/><circle cx="16.5" cy="12" r="1.1" fill="#fff" stroke="none"/>',
};
function pinGlyphSvg(category: FlagCategory, resolved: boolean): string {
  const paths = resolved ? '<path d="M5 12 l4 4 l8 -9"/>' : CAT_PIN_PATHS[category] ?? CAT_PIN_PATHS.other;
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="${resolved ? 3 : 2.4}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

// Cache teardrop pin icons by (color + category + resolved + dim). Bounded set
// (≤6 colors × 6 categories × 2 × 2), so the cache stays tiny for the page
// life. Without it every render builds a new L.DivIcon → needless marker churn.
const pinIconCache = new Map<string, L.DivIcon>();
function pinIcon(
  color: string,
  category: FlagCategory,
  resolved: boolean,
  dim: boolean,
  anon: boolean,
): L.DivIcon {
  const key = `${color}|${category}|${resolved ? 'r' : ''}|${dim ? 1 : 0}|${anon ? 'a' : ''}`;
  const cached = pinIconCache.get(key);
  if (cached) return cached;
  // Design teardrop: a severity-colored drop (border-radius 50% 50% 50% 0,
  // rotated -45°) with a 2.5px white ring, a Wayfinder-Blue glow, and the
  // white category glyph (counter-rotated upright) — or a check when resolved.
  //
  // Ring/boundary (GLASS §12.4 union so the pin survives light AND dark tiles):
  //  - EVERY pin carries a 1px #0F1B2D outer hairline (S14) — the union's
  //    light-tile arm; the 2.5px white ring is the dark-tile arm. Neither color
  //    spans the whole tile range alone (the white ring reads 1.00:1 on white
  //    Apple tiles; the hairline rescues it).
  //  - an ANONYMOUS report keeps its severity FILL (S1 — the safety encoding is
  //    never erased) and carries provenance as a SECOND concentric ring: hairline
  //    + white gap + a second hairline → a "double ring" a sighted user reads at
  //    a glance. Arbiter-proven over the tile bases + red heat cell.
  const ring = anon
    ? '0 0 0 1px #0F1B2D, 0 0 0 3px #FFFFFF, 0 0 0 4px #0F1B2D'
    : '0 0 0 1px #0F1B2D';
  const icon = L.divIcon({
    className: 'accessmap-pin',
    html: `<div style="width:30px;height:30px;opacity:${dim ? 0.55 : 1};filter:drop-shadow(0 6px 14px rgba(20,102,224,0.35)) drop-shadow(0 1px 2px rgba(15,27,45,0.18));">
      <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:${ring};display:flex;align-items:center;justify-content:center;">
        <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">${pinGlyphSvg(category, resolved)}</div>
      </div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 29],
    popupAnchor: [0, -28],
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
      border:2.5px solid #fff;
      box-shadow:0 0 0 1px #0F1B2D,0 2px 6px rgba(0,0,0,0.35);
      cursor:pointer;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  clusterIconCache.set(key, icon);
  return icon;
}

// ---------------------------------------------------------------------------
// PopupPhoto — the flag photo inside a marker popup (L3). A bare <img> shows
// the browser's broken-image glyph when the Storage URL 404s or the network
// drops mid-load; this swaps in a "Photo unavailable" placeholder via onError
// instead. The error state remembers WHICH src failed, so a new photo url
// (photo re-uploaded, flag edited) automatically gets a fresh load attempt
// rather than inheriting the previous failure.
// ---------------------------------------------------------------------------
interface PopupPhotoProps {
  src: string;
  alt: string;
  mutedColor: string;
}

function PopupPhoto({ src, alt, mutedColor }: PopupPhotoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label="Photo unavailable"
        style={{
          width: '100%',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15,27,45,0.06)',
          color: mutedColor,
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          marginTop: 6,
        }}
      >
        Photo unavailable
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      style={{
        width: '100%',
        maxHeight: 160,
        objectFit: 'cover',
        borderRadius: 8,
        marginTop: 6,
      }}
    />
  );
}

// GeoJSON point feature shape fed into Supercluster.
type FlagPointFeature = GeoJSON.Feature<GeoJSON.Point, { flagId: string }>;

// T1 (F2-01): popup-clearance constants. The X pad keeps autoPan from kissing
// the screen edge; the tip allowance covers the pin's popupAnchor (28px) plus
// the popup tip; the fallback height stands in when the popup's DOM box isn't
// measurable (jsdom, or a not-yet-laid-out open).
const POPUP_AUTOPAN_PAD_X = 12;
const CALLOUT_TIP_ALLOWANCE_PX = 40;
const CALLOUT_FALLBACK_HEIGHT_PX = 220;

// T1 (F2-01): never let the callout inset eat more than ~45% of the map's own
// height — a runaway measurement (giant Dynamic Type wrapping the pill rows)
// must degrade to a partial clear, not autoPan/cut the pin off the map.
// Exported for the jest guards.
export function clampChromeInset(insetPx: number, mapHeightPx: number): number {
  if (!insetPx || insetPx <= 0) return 0;
  if (!mapHeightPx || mapHeightPx <= 0) return insetPx;
  return Math.min(insetPx, Math.round(mapHeightPx * 0.45));
}

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
  onOpenDetails?: (flag: FlagRow) => void;
  // S12: threaded from PlatformMap so the cluster flyTo and each Popup's
  // autoPan can be gated by Reduce Motion (WCAG 2.3.3).
  reducedMotion?: boolean;
  // T1 (F2-01): the already-clamped top inset (px) each Popup's autoPan must
  // clear. 0 = no chrome to clear (e.g. the Home peek) → Leaflet defaults.
  popupInsetTop: number;
}

// BP11 / T3 (F1-13/14): the popup "Open details" button joins the press
// vocabulary. Inline React styles can't carry :hover/:active/:focus-visible, so
// the interactive states live in a class backed by a single injected <style>
// (id-guarded so repeated popups don't duplicate it). The rest fill lives here
// too — an inline background would out-specify the :hover rule. Deepen matches
// the RN ctaFillPressed (#0F53BE); white label clears AA on both blues.
const CALLOUT_CSS_ID = 'am-callout-css';
function ensureCalloutStyles() {
  if (typeof document === 'undefined' || document.getElementById(CALLOUT_CSS_ID)) return;
  const el = document.createElement('style');
  el.id = CALLOUT_CSS_ID;
  el.textContent =
    '.am-callout-btn{background:#1466E0;transition:background-color .12s}' +
    '.am-callout-btn:hover{background:#0F53BE}' +
    '.am-callout-btn:active{background:#0F53BE}' +
    '.am-callout-btn:focus-visible{outline:2px solid #1466E0;outline-offset:2px}';
  document.head.appendChild(el);
}

function ClusteredMarkers({
  flags,
  focusedFlagId,
  brandColor,
  textOnBrand,
  markerRefs,
  onOpenDetails,
  reducedMotion,
  popupInsetTop,
}: ClusteredMarkersProps) {
  const map = useMap();
  // Inject the callout button's hover/active/focus styles once (web-only).
  useEffect(() => { ensureCalloutStyles(); }, []);

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
                  // S12: same falsy-zero trap as the main camera — under Reduce
                  // Motion use { animate: false } for an instant jump, never
                  // duration: 0. Non-RM keeps the 0.4s expansion fly.
                  map.flyTo(
                    [lat, lng],
                    expansionZoom,
                    reducedMotion ? { animate: false } : { duration: 0.4 },
                  );
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
              // S1 (L8-7): anonymous pins keep their SEVERITY fill — the safety
              // encoding is never swapped to gray; provenance rides the ring.
              severityColor(flag.severity),
              flag.category,
              flag.status === 'resolved',
              !flagIsAnon && focusedFlagId !== null && focusedFlagId !== flag.id,
              flagIsAnon,
            )}
            // alt is what screen readers announce for the marker; title is
            // the browser tooltip. Mirrors the accessibilityLabel on the
            // native Marker so SR users hear the same description on web.
            alt={`${CATEGORY_LABELS[flag.category]}, severity ${flag.severity} of 5, ${SEVERITY_LABELS[flag.severity]}, ${STATUS_LABELS[flag.status]}${flagIsAnon ? ', submitted anonymously' : ''}. Open for details.`}
            title={`${CATEGORY_LABELS[flag.category]} — severity ${flag.severity}${flagIsAnon ? ' (anonymous)' : ''}`}
            ref={(m) => {
              markerRefs.current[flag.id] = m;
            }}
          >
            {/* S12: autoPan pans the map to keep the popup in view when it
                opens — that's motion. Suppress it under Reduce Motion.
                T1 (F2-01): autoPanPaddingTopLeft makes that pan clear the
                MEASURED persistent chrome band, not just the container edge —
                the top-third callout no longer composites under the pill/rail.
                Bind-time only for this popup instance; later inset changes are
                stamped onto live popups by the effect in PlatformMap (react-
                leaflet never diffs popup options after construction). */}
            <Popup
              autoPan={!reducedMotion}
              autoPanPaddingTopLeft={
                popupInsetTop > 0 ? [POPUP_AUTOPAN_PAD_X, popupInsetTop] : undefined
              }
            >
              {/* BP-10/E1 — callout parity: native ships a 6px severity accent
                  bar down the card edge; the web popup now matches. Decorative
                  (severity is spoken in the meta line below). */}
              <div style={{ minWidth: 200, display: 'flex', gap: 8 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 6,
                    borderRadius: 3,
                    alignSelf: 'stretch',
                    flexShrink: 0,
                    background: severityColor(flag.severity),
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {CATEGORY_LABELS[flag.category]}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    // Static #666 — the Leaflet popup chrome is always white on
                    // both platforms, so the themed textMuted (#aaa in dark)
                    // dropped to ~2.3:1. Pin it light.
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  Severity {flag.severity} of 5 · {SEVERITY_LABELS[flag.severity]} · {STATUS_LABELS[flag.status]}
                  {flagIsAnon ? ' · Anonymous' : ''}
                </div>
                {/* S3 (L3-12): report-freshness line — the read-half of the
                    trust ledger, visible at a glance. #666 like the meta above
                    (the Leaflet popup chrome is always white). */}
                <div style={{ fontSize: 11, color: '#666', marginTop: 2, fontWeight: 600 }}>
                  Reported {relativeTime(flag.created_at)}
                </div>
                {safeImageUrl(flag.photo_url) ? (
                  <PopupPhoto
                    src={safeImageUrl(flag.photo_url) as string}
                    alt={`Photo of ${CATEGORY_LABELS[flag.category]} accessibility issue`}
                    mutedColor="#666"
                  />
                ) : null}
                {flag.description ? (
                  <div style={{ marginTop: 6, fontSize: 12 }}>{flag.description}</div>
                ) : null}
                {/* S3 (L3-12): the affordance that cashes the marker's "Open for
                    details" promise — opens FlagDetailModal. Wayfinder Blue
                    (#1466E0, mode-independent per PROTECT-16) on the white chrome. */}
                {onOpenDetails ? (
                  <button
                    type="button"
                    className="am-callout-btn"
                    onClick={() => onOpenDetails(flag)}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      // F1-14: reach the 44px min touch target (was ~34px) and
                      // center the label now that the box is taller.
                      minHeight: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      // background lives in .am-callout-btn so :hover/:active win.
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12, // radius.md — the documented button radius (parity with native, BP-10/E1)
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Open details
                  </button>
                ) : null}
                </div>
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
  // F31: set when the wrapper unmounts the layer. In-flight tile chains are
  // not cancellable, but they must stop persisting tiles once the layer is
  // gone (e.g. after sign-out, when the cache for that user was just cleared).
  private _disposed = false;

  constructor(urlTemplate: string, options: CachedTileLayerOptions) {
    const { userId, ...rest } = options;
    super(urlTemplate, rest);
    this._userId = userId;
  }

  dispose(): void {
    this._disposed = true;
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
        // setCachedTile itself (it already logs internally). Skip if the
        // layer was unmounted while this chain was in flight (F31).
        if (!this._disposed) void setCachedTile(userId, url, dataUri);
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

// S7: CARTO basemaps branched on the app's color scheme — Dark Matter in dark,
// Positron (light_all) in light. The URL was hard-coded to dark_all, so light
// mode rendered a near-black void (R6: "the map failed to load"). The light
// family is a Sky-eye candidate (Positron light_all vs the warmer Voyager);
// Positron keeps the pins + heat cells the most legible over the tiles.
const OSM_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const OSM_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

// S7: tame the third-party attribution strip to the app's hairline voice — KEPT
// (legally required), just quieter and pinned always-light (GLASS §12 overlay
// discipline). Injected once on web.
if (typeof document !== 'undefined' && !document.getElementById('accessmap-leaflet-attr')) {
  const attrStyle = document.createElement('style');
  attrStyle.id = 'accessmap-leaflet-attr';
  attrStyle.textContent =
    '.leaflet-control-attribution{background:rgba(255,255,255,0.78)!important;' +
    'color:#5B6472!important;font-size:10px!important;line-height:15px!important;' +
    'padding:0 6px!important;border-top-left-radius:8px!important;box-shadow:none!important;}' +
    '.leaflet-control-attribution a{color:#3A4657!important;}';
  document.head.appendChild(attrStyle);
}

// T1 (F3-05): how long the outgoing tile layer may linger if the incoming one
// never fires 'load' (offline, throttled). Retirement is idempotent — the
// timer is a hard backstop, not the happy path.
const TILE_SWAP_FALLBACK_MS = 2000;

function CachedTileLayerWrapper({
  userId,
  tileUrl,
}: {
  userId: string | null;
  tileUrl: string;
}): null {
  const map = useMap();

  // T1 (F3-05): the live layer, owned ACROSS effect runs so a theme flip can
  // overlap old and new instead of blanking. The old shape removed the
  // outgoing layer in the effect cleanup — which React runs BEFORE the next
  // effect body — so the map held an empty pane while the incoming family
  // fetched its first tiles (the only surface that visibly rebuilt instead of
  // transforming during the theme moment). Swap MECHANICS only — the tile
  // family itself is Sky's open eye-candidate, untouched here.
  const activeLayerRef = useRef<CachedTileLayer | null>(null);

  useEffect(() => {
    const layer = new CachedTileLayer(tileUrl, {
      attribution: OSM_ATTRIBUTION,
      userId,
    });
    layer.addTo(map);
    const prev = activeLayerRef.current;
    activeLayerRef.current = layer;
    if (prev) {
      // The incoming layer mounts FIRST (above — Leaflet stacks by add
      // order); the outgoing one retires only once the new family has painted
      // ('load' = all visible tiles done), with a hard fallback so it can
      // never linger past 2s. dispose() runs NOW: in-flight cache writes must
      // stop immediately (F31 — a sign-out clears the tile cache; a late
      // write would resurrect it). The fallback is deliberately NOT cleared
      // on the next flip: retirement is idempotent, and clearing it could
      // leak the old layer if the incoming one never loads. Leaflet's
      // remove() is a safe no-op once detached.
      prev.dispose();
      let retired = false;
      const retirePrev = () => {
        if (retired) return;
        retired = true;
        layer.off('load', retirePrev);
        prev.remove();
      };
      layer.on('load', retirePrev);
      setTimeout(retirePrev, TILE_SWAP_FALLBACK_MS);
    }
    // Flip path: the NEXT effect run retires `layer` (as its `prev`). Only a
    // true unmount tears down the still-live layer — the effect below.
    // tileUrl in deps: a light/dark flip re-creates the layer with the new family.
  }, [map, userId, tileUrl]);

  // True unmount: dispose + remove whichever layer is still live.
  useEffect(
    () => () => {
      activeLayerRef.current?.dispose(); // F31
      activeLayerRef.current?.remove();
      activeLayerRef.current = null;
    },
    [],
  );

  return null;
}

const PlatformMap = forwardRef<PlatformMapHandle, PlatformMapProps>(function PlatformMap(
  {
    initialRegion,
    flags,
    focusedFlagId,
    reducedMotion,
    suppressAttribution,
    onLongPressMap,
    onOpenDetails,
    heatCells = [],
    heatmapMode = 'gradient',
    chromeInsetTop,
  },
  ref,
) {
  const themeColor = useColor();
  const tileUrl = themeColor.scheme === 'dark' ? OSM_DARK : OSM_LIGHT;
  const mapInstance = useRef<LeafletMap | null>(null);
  // F7: react-leaflet's MapContainer ref resolves to null on the first commit
  // (its internal context isn't ready yet) and to the real map only after a
  // re-render. Track that transition in state so effects that need the map
  // instance (e.g. the contextmenu binding below) re-run once it's populated —
  // otherwise they capture a null map and never re-bind for the session.
  const [mapReady, setMapReady] = useState(false);
  // Stable ref callback so React only invokes it when the forwarded handle
  // actually changes (null -> map), not on every render (an inline arrow would
  // detach/reattach each render and thrash mapReady).
  const setMapRef = useCallback((m: LeafletMap | null) => {
    mapInstance.current = m;
    setMapReady(m != null);
  }, []);
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

  // T1 (F2-01): the chrome inset each popup must clear, clamped against the
  // live map height (mapReady re-renders once the instance lands; before
  // that, the window height is the honest stand-in on web).
  const popupInsetTop = clampChromeInset(
    chromeInsetTop ?? 0,
    mapInstance.current?.getSize?.().y ??
      (typeof window !== 'undefined' ? window.innerHeight : 0),
  );

  // T1 (F2-01): react-leaflet constructs each L.Popup ONCE from its props and
  // never diffs option changes afterwards — a later chrome re-measure (status
  // pill wrapping, rotation) would strand every already-bound popup on a stale
  // inset. Leaflet reads autoPanPaddingTopLeft at OPEN time (_adjustPan), so
  // stamping the live instances' options keeps every future open correct; new
  // popups still pick up the current value at bind time via the <Popup> prop.
  useEffect(() => {
    if (popupInsetTop <= 0) return;
    for (const m of Object.values(markerRefs.current)) {
      const popup = m?.getPopup();
      if (popup) popup.options.autoPanPaddingTopLeft = [POPUP_AUTOPAN_PAD_X, popupInsetTop];
    }
  }, [popupInsetTop]);

  // Wire `contextmenu` to the drop-flag intent on web. Leaflet fires
  // this on right-click on desktop and on a long-touch on mobile
  // browsers (the OS surfaces the press as a context menu request).
  // We re-bind on every change to `onLongPressMap` so the latest
  // closure is used. `mapReady` is in the deps (F7) so the binding also
  // runs after the map instance is populated — without it, the effect ran
  // once with a null map and never re-bound for already-signed-in users
  // (whose onLongPressMap was stable for the whole session), leaving
  // right-click drop-flag permanently dead.
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
  }, [onLongPressMap, mapReady]);

  // T1: THE shared instant-camera path — a zero-motion setView cut. BP13/T7
  // reuses this exact branch for its camera work; keep it a single named
  // implementation (never inline animate:false setViews elsewhere). NEVER
  // duration: 0 — Leaflet treats 0 as falsy and falls back to its default
  // multi-second flight (the animateTo comment below is the canonical law).
  const instantCut = useCallback((center: L.LatLngExpression, zoom: number) => {
    mapInstance.current?.setView(center, zoom, { animate: false });
  }, []);

  // T1 (F2-01): the popupopen listener below outlives renders, so it reads
  // the inset through a ref — a closure from an early bind (before the chrome
  // rows finished measuring) must never cut against a stale, tiny inset (the
  // BP1 evidence probe caught exactly that under-cut).
  const chromeInsetRef = useRef(0);
  useEffect(() => {
    chromeInsetRef.current = chromeInsetTop ?? 0;
  }, [chromeInsetTop]);

  // T1 (F2-01): autoPan is suppressed under Reduce Motion (S12 — the glide is
  // motion), which stranded top-third callouts under the chrome with no
  // recovery. This is the designed instant equivalent: measure where the
  // just-opened popup ACTUALLY rendered (its real rect against the map
  // container — no anchor/tip modeling to drift) and, if any of it sits
  // inside the chrome band, cut the camera so it clears — the same clear
  // position autoPan would have glided to, delivered with zero animation.
  const ensurePopupClearRM = useCallback(
    (popup: L.Popup) => {
      const map = mapInstance.current;
      if (!map) return;
      const inset = clampChromeInset(chromeInsetRef.current, map.getSize?.().y ?? 0);
      if (inset <= 0) return;
      // A rapid A→B may close this popup before the deferred frame lands —
      // never cut for a callout that is no longer on screen.
      if (typeof popup.isOpen === 'function' && !popup.isOpen()) return;
      const el = popup.getElement();
      const container = map.getContainer?.();
      let popupTop: number;
      if (el && container) {
        popupTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
      } else {
        // jsdom / not-yet-laid-out fallback: model the box above the pin.
        const latlng = popup.getLatLng();
        if (!latlng) return;
        popupTop =
          map.latLngToContainerPoint(latlng).y -
          CALLOUT_FALLBACK_HEIGHT_PX -
          CALLOUT_TIP_ALLOWANCE_PX;
      }
      const deficit = inset - popupTop;
      if (deficit <= 0) return;
      // Move the world DOWN by `deficit` px = re-center on the point that sits
      // `deficit` px ABOVE the current center (Leaflet's own autoPan math,
      // delivered as a cut).
      const centerPt = map.latLngToContainerPoint(map.getCenter());
      const target = map.containerPointToLatLng(centerPt.add(L.point(0, -deficit)));
      instantCut(target, map.getZoom());
    },
    [instantCut],
  );

  // T1 (F2-01): under Reduce Motion the cut must cover EVERY open path — a
  // DIRECT pin click opens the popup through Leaflet's own bound-popup
  // handler and never touches the imperative showCallout, so the rescue
  // rides the map's popupopen event instead (it fires synchronously inside
  // openPopup — same frame — and only after layout, so the popup box is
  // measurable). Bound only while RM is on; mapReady re-binds once the map
  // instance lands (F7, same as contextmenu above). This closed the gap the
  // BP1 evidence probe caught: the imperative-only branch left a real tap
  // under RM occluded.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !reducedMotion) return;
    const onPopupOpen = (e: L.PopupEvent) => {
      // react-leaflet portals the popup CONTENT on the React commit AFTER
      // popupopen fires (its lifecycle listener flips setOpen(true) first) —
      // measuring now would see the empty shell and under-cut by the whole
      // content height (the BP1 evidence probe caught exactly that, a 126px
      // shortfall). One frame later the box is real; the camera move is
      // still a zero-animation cut — one frame of deferral, no glide.
      requestAnimationFrame(() => ensurePopupClearRM(e.popup));
    };
    map.on('popupopen', onPopupOpen);
    return () => {
      map.off('popupopen', onPopupOpen);
    };
  }, [reducedMotion, mapReady, ensurePopupClearRM]);

  useImperativeHandle(
    ref,
    () => ({
      // opts.calloutClear is consumed by the NATIVE variant (camera bias); on
      // web the callout's clearance runs at popup-open (autoPan padding above,
      // the popupopen RM cut below), so targeting stays exact.
      animateTo: (r, _opts) => {
        const zoom = deltaToZoom(r.latitudeDelta ?? 0.005);
        // Reduce Motion → { animate: false } (Leaflet short-circuits to an
        // instant setView). We must NOT pass duration: 0 — Leaflet treats 0 as
        // falsy and falls back to its default multi-second distance flight, the
        // exact opposite of what RM asks (WCAG 2.3.3). Non-RM keeps the 0.6s fly.
        mapInstance.current?.flyTo(
          [r.latitude, r.longitude],
          zoom,
          reducedMotion ? { animate: false } : { duration: 0.6 },
        );
      },
      showCallout: (id) => {
        // Opening fires popupopen synchronously; under RM the listener above
        // delivers the instant clear in the same frame (F3-06).
        const marker = markerRefs.current[id];
        if (!marker) return false;
        marker.openPopup();
        return true;
      },
      hideCallout: () => {
        // Leaflet holds at most one open popup per map, so the map itself is the
        // right handle — no marker sweep, and no dependency on which pin it was.
        mapInstance.current?.closePopup();
      },
      // SW-37: parity with the native handle. Leaflet answers synchronously;
      // the Promise is the shared contract, not a cost.
      getCenter: async () => {
        const map = mapInstance.current;
        if (!map) return null;
        const c = map.getCenter();
        return { lat: c.lat, lng: c.lng };
      },
      zoomBy: (delta) => {
        const map = mapInstance.current;
        if (!map) return;
        // Leaflet clamps to the layer's min/max; animate unless Reduce Motion.
        map.setZoom(map.getZoom() + delta, { animate: !reducedMotion });
      },
      snapToRegion: (r) => {
        // T7 (BP13): reuse the shared zero-motion path — `instantCut` (setView
        // animate:false), the SAME primitive animateTo's RM branch uses; and
        // `deltaToZoom` mirrors animateTo's zoom math, so the no-location
        // bounds-fit frames exactly like every other camera move, just without
        // the fly. It replaces the initial paint (not motion), so it is never
        // Reduce-Motion-gated. Never inline a setView here (see instantCut's law).
        instantCut([r.latitude, r.longitude], deltaToZoom(r.latitudeDelta ?? 0.01));
      },
    }),
    [reducedMotion, instantCut],
  );

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <MapContainer
        center={[initialRegion.latitude, initialRegion.longitude]}
        zoom={deltaToZoom(initialRegion.latitudeDelta)}
        style={{ height: '100%', width: '100%' }}
        ref={setMapRef}
        // Parity with the native twin's floor (map-gestures SPEC §1.2): stop the
        // zoom-out that collapses every pin into one dot over a grey world.
        // Leaflet's touchZoom / dragging / doubleClickZoom defaults stay ON —
        // pinch here is the library's, same as pinch on native is Apple's.
        minZoom={3}
        // S6: drop Leaflet's default top-left zoom control — it was occluded by
        // the count pill AND pointer-dead. The app-styled 44pt buttons in the
        // overlay's bottom zone drive zoom via the imperative handle instead.
        zoomControl={false}
        // S17: on the decorative Home peek (suppressAttribution), drop the live
        // "Leaflet / OpenStreetMap / CARTO" attribution links so they can't
        // navigate the browser away from inside a button. The full Map omits
        // this prop → attribution stays (legally required).
        attributionControl={!suppressAttribution}
        // S12: kill Leaflet's built-in zoom/fade tweens under Reduce Motion so
        // setView / setZoom paint instantly instead of animating (WCAG 2.3.3).
        zoomAnimation={!reducedMotion}
        fadeAnimation={!reducedMotion}
      >
        <CachedTileLayerWrapper userId={userId} tileUrl={tileUrl} />
        {/* Heat-map: Rectangle for each cell footprint + a divIcon Marker
              at the centroid showing the rounded mean severity. Leaflet
              paints Rectangles on `overlayPane` (SVG default) which sits
              beneath `markerPane`, so the cell tints render under the pins
              without any explicit z-index work. */}
        {heatCells.map((cell) => {
          const fill = colorForCell(cell, heatmapMode, severityTokens, themeColor.brand);
          const meanRounded = Math.round(cell.meanSeverity);
          // Static, fill-keyed ink (mirrors the native twin). A themed ink went
          // catastrophic on the yellow low-severity fill in dark mode; sev1-4
          // take dark ink, sev5 red + density brand fill take white.
          const labelTone =
            heatmapMode === 'density' ? '#fff' : meanRounded >= 5 ? '#fff' : '#0F1B2D';
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
          brandColor={themeColor.ctaFill}
          textOnBrand={themeColor.textOnBrand}
          markerRefs={markerRefs}
          onOpenDetails={onOpenDetails}
          reducedMotion={reducedMotion}
          popupInsetTop={popupInsetTop}
        />
      </MapContainer>
    </div>
  );
});

// See PlatformMap.tsx — same rationale: memo skips re-renders for parent
// state changes unrelated to map props. Critical on web because every
// re-render rebuilds Leaflet's Marker layers.
export default memo(PlatformMap);
