import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { RemoteImage } from '@/components/ui/RemoteImage';
import CategoryIcon from '@/components/CategoryIcon';
import { Check } from 'lucide-react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Callout, Marker, Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import type MapView from 'react-native-maps';
import { font, heatmapSeverity as severityTokens, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { CATEGORY_LABELS, SEVERITY_LABELS, severityColor, STATUS_LABELS } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { decorativeProps } from '@/lib/accessibility';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import { pinKey } from '@/lib/pinKey';
import { colorForCell, HEATMAP_FILL_OPACITY, type HeatCell, type HeatmapMode } from '@/lib/heatmap';
import type { FlagRow } from '@/types/database';

export interface PlatformMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// T1 (F2-01): native callouts render roughly this tall above the pin (title +
// severity sentence + reported line + "Open details" row). Code-inferred;
// R2-D12 device-verifies the real box.
const CALLOUT_HEADROOM_PX = 220;

// T1 (F2-01): bias a callout-bound camera target so the pin lands BELOW the
// persistent top chrome, leaving the callout (which extends upward from the
// pin) clear map to open into. Pure math, exported for the jest guards.
//
// A region's latitudeDelta spans the viewport top→bottom, so the pin sits at
// screen fraction f (0 = top) when the center sits (f − 0.5) × Δlat north of
// it. We aim the pin at the fraction where the chrome band + callout headroom
// end — never above center (f ≥ 0.5 keeps un-occluded moves exactly
// centered), never past 0.65 (the pin stays comfortably on-screen). The
// chrome is clamped to ≤45% of the map height, mirroring the web variant's
// clampChromeInset, so a runaway measurement degrades to a partial clear.
export function biasRegionForCallout(
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  },
  chromeClearPx: number,
  mapHeightPx: number,
): PlatformMapRegion {
  const base: PlatformMapRegion = {
    latitude: region.latitude,
    longitude: region.longitude,
    latitudeDelta: region.latitudeDelta ?? 0.005,
    longitudeDelta: region.longitudeDelta ?? 0.005,
  };
  if (!chromeClearPx || chromeClearPx <= 0 || !mapHeightPx || mapHeightPx <= 0) return base;
  const clamped = Math.min(chromeClearPx, Math.round(mapHeightPx * 0.45));
  const f = Math.min(0.65, Math.max(0.5, (clamped + CALLOUT_HEADROOM_PX) / mapHeightPx));
  return { ...base, latitude: base.latitude + (f - 0.5) * base.latitudeDelta };
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
  showCallout: (flagId: string) => void;
  /** Step the zoom by `delta` levels (+1 in, -1 out). Additive to the handle so
   *  the overlay's app-styled 44pt buttons can drive zoom — the single-pointer
   *  zoom-out affordance iOS otherwise lacks (WCAG 2.5.7). */
  zoomBy: (delta: number) => void;
  /** T7 (BP13): frame a region INSTANTLY — an unconditional zero-duration jump,
   *  deliberately NOT Reduce-Motion-gated because it replaces the initial paint
   *  (the no-location bounds-fit), it is not motion. Reuses the same instant
   *  animateToRegion(_, 0) primitive the RM branch of animateTo already uses. */
  snapToRegion: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  }) => void;
  /** SW-37: where is the map looking RIGHT NOW? Read-only, resolved from the
   *  visible bounds — the map itself stays deliberately UNCONTROLLED (no
   *  `region` prop, no onRegionChange), so nothing here can fight a gesture
   *  mid-pinch. Backs "place the pin on the map" for users whose location is
   *  denied or unavailable. Resolves null if the map isn't ready to answer. */
  getCenter: () => Promise<{ lat: number; lng: number } | null>;
}

export interface PlatformMapProps {
  initialRegion: PlatformMapRegion;
  flags: FlagRow[];
  focusedFlagId: string | null;
  showsUserLocation?: boolean;
  /** When true, animateTo uses an instant pan (duration 0) to respect
   *  the user's "Reduce Motion" system preference (WCAG 2.3.3). */
  reducedMotion?: boolean;
  /** S17: web-only — suppress the Leaflet attribution control on this instance
   *  (the decorative Home peek, so no live third-party links sit inside a
   *  button). The FULL map omits it and keeps its legally-required attribution.
   *  Native has no Leaflet attribution, so it ignores this. */
  suppressAttribution?: boolean;
  /**
   * Long-press anywhere on the map to drop a flag at that location.
   * Fires with the geographic coordinate of the press. Web variant
   * implements the same callback via a `contextmenu` listener.
   */
  onLongPressMap?: (coord: { lat: number; lng: number }) => void;
  /**
   * Pre-computed heat-map cells (already privacy-filtered to k>=3).
   * Rendered as translucent polygons UNDER the flag-pin markers, with
   * a small numeric badge at each centroid showing the mean severity.
   */
  heatCells?: HeatCell[];
  /** Heat-map colour mode. See `HeatmapMode` for the contract. */
  heatmapMode?: HeatmapMode;
  /**
   * S3: tapping the pin callout's "Open details" affordance opens the full
   * FlagDetailModal (the trust ledger). On native the whole Callout is the tap
   * target (Android renders the callout as a snapshot, so only Callout.onPress
   * is reliable). Optional so existing callers/tests don't have to pass it.
   */
  onOpenDetails?: (flag: FlagRow) => void;
  /**
   * T1 (F2-01): the vertical px band of persistent top chrome (safe area +
   * overlay padding + the measured header/status rows + margin) an opening
   * pin callout must clear. Consumed clamped to ≤45% of the map's height.
   * Native biases callout-bound camera moves below it; web feeds Leaflet's
   * popup autoPan padding + the Reduce-Motion instant cut.
   */
  chromeInsetTop?: number;
}

const PlatformMap = forwardRef<PlatformMapHandle, PlatformMapProps>(function PlatformMap(
  {
    initialRegion,
    flags,
    focusedFlagId,
    showsUserLocation,
    reducedMotion,
    onLongPressMap,
    onOpenDetails,
    heatCells = [],
    heatmapMode = 'gradient',
    chromeInsetTop,
  },
  ref,
) {
  // T1 (F2-01): the map fills the screen on this app, so the window height is
  // the honest map-height stand-in for the callout-clear bias math.
  const { height: windowHeight } = useWindowDimensions();
  const color = useColor();
  const styles = makeStyles(color);
  // Ref to ClusteredMapView — cast to MapView for animateToRegion calls
  // (ClusteredMapView wraps MapView internally and delegates map methods)
  const mapRef = useRef<MapView | null>(null);
  const markerRefs = useRef<Record<string, InstanceType<typeof Marker> | null>>({});

  // When a flag is resolved/rejected it drops out of the list. React's ref
  // callback is called with null on unmount, but the key stays in this dict
  // — so over a long session that triages thousands of flags, the dict
  // would keep growing. Prune to current ids whenever the list changes.
  useEffect(() => {
    const valid = new Set(flags.map((f) => f.id));
    for (const id of Object.keys(markerRefs.current)) {
      if (!valid.has(id)) delete markerRefs.current[id];
    }
  }, [flags]);

  // T1 (F2-01): a DIRECT pin tap opens the callout natively with no camera
  // move of ours — a top-third pin's callout would open straight into the
  // chrome band. If the tapped pin sits inside that band (+ headroom), nudge
  // the camera with the same biased move the imperative flows use, at the
  // CURRENT zoom (deltas = the live visible span from getMapBoundaries).
  // Reduce Motion rides the existing duration-0 instant jump. Both map APIs
  // are feature-checked and failures are swallowed — a convenience nudge must
  // never break the tap (code-inferred; R2-D12 device-verifies the feel).
  const handlePinPress = useCallback(
    (flag: FlagRow) => {
      const map = mapRef.current;
      const chromeClearPx = chromeInsetTop ?? 0;
      if (
        !map ||
        chromeClearPx <= 0 ||
        typeof map.pointForCoordinate !== 'function' ||
        typeof map.getMapBoundaries !== 'function'
      ) {
        return;
      }
      const coord = { latitude: flag.lat, longitude: flag.lng };
      void Promise.all([map.pointForCoordinate(coord), map.getMapBoundaries()])
        .then(([pt, bounds]) => {
          const clamped = Math.min(chromeClearPx, Math.round(windowHeight * 0.45));
          if (pt.y >= clamped + CALLOUT_HEADROOM_PX) return; // already clear
          // Preserve the CURRENT visible span so the nudge keeps zoom. Guard
          // the deltas: across the antimeridian getMapBoundaries' longitude
          // span goes negative, and a bad reading could yield 0 — either would
          // corrupt animateToRegion. Fall back to the standard focus zoom.
          const latSpan = bounds.northEast.latitude - bounds.southWest.latitude;
          const lngSpan = bounds.northEast.longitude - bounds.southWest.longitude;
          mapRef.current?.animateToRegion(
            biasRegionForCallout(
              {
                ...coord,
                latitudeDelta: latSpan > 0 ? latSpan : 0.005,
                longitudeDelta: lngSpan > 0 ? lngSpan : 0.005,
              },
              chromeClearPx,
              windowHeight,
            ),
            reducedMotion ? 0 : 600,
          );
        })
        .catch(() => {});
    },
    [chromeInsetTop, windowHeight, reducedMotion],
  );

  useImperativeHandle(
    ref,
    () => ({
      // T1 (F2-01): callout-bound moves (opts.calloutClear) bias the target
      // below the measured chrome so the callout opens in clear map. All
      // other moves (GPS fix, address search, saved places…) keep exact
      // targeting.
      animateTo: (r, opts) => {
        const target: PlatformMapRegion = opts?.calloutClear
          ? biasRegionForCallout(r, chromeInsetTop ?? 0, windowHeight)
          : {
              latitude: r.latitude,
              longitude: r.longitude,
              latitudeDelta: r.latitudeDelta ?? 0.005,
              longitudeDelta: r.longitudeDelta ?? 0.005,
            };
        mapRef.current?.animateToRegion(
          target,
          // Instant jump when "Reduce Motion" is on (WCAG 2.3.3).
          reducedMotion ? 0 : 600,
        );
      },
      showCallout: (id) => {
        markerRefs.current[id]?.showCallout();
      },
      // SW-37: the midpoint of the visible bounds. getMapBoundaries is already
      // the read this file trusts for viewport questions (see handlePinPress),
      // so this adds no new dependency on map internals.
      getCenter: async () => {
        const map = mapRef.current;
        if (!map || typeof map.getMapBoundaries !== 'function') return null;
        try {
          const b = await map.getMapBoundaries();
          return {
            lat: (b.northEast.latitude + b.southWest.latitude) / 2,
            lng: (b.northEast.longitude + b.southWest.longitude) / 2,
          };
        } catch {
          return null;
        }
      },
      zoomBy: (delta) => {
        const map = mapRef.current;
        if (!map) return;
        // Read the current camera, step its zoom, and animate at the RM-gated
        // duration (instant under Reduce Motion, WCAG 2.3.3).
        void map
          .getCamera()
          .then((cam) => {
            map.animateCamera(
              { ...cam, zoom: (cam.zoom ?? 12) + delta },
              { duration: reducedMotion ? 0 : 300 },
            );
          })
          // Same guard as handlePinPress: a detached/unmounted native map
          // rejects, and a zoom tap must not surface an unhandled rejection.
          .catch(() => {});
      },
      snapToRegion: (r) => {
        mapRef.current?.animateToRegion(
          {
            latitude: r.latitude,
            longitude: r.longitude,
            latitudeDelta: r.latitudeDelta ?? 0.01,
            longitudeDelta: r.longitudeDelta ?? 0.01,
          },
          // T7 (BP13): unconditional 0 — the no-location initial-paint fit is
          // not motion, so never Reduce-Motion-gated. Same instant primitive the
          // RM branch of animateTo uses above; reused, not forked.
          0,
        );
      },
    }),
    [reducedMotion, chromeInsetTop, windowHeight],
  );

  return (
    <ClusteredMapView
      mapRef={(r: any) => {
        mapRef.current = r;
      }}
      style={StyleSheet.absoluteFillObject}
      provider={PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      clusterColor={color.ctaFill}
      clusterTextColor={color.textOnBrand}
      radius={40}
      // PINCH-ZOOM IS THE PLATFORM'S, NOT OURS (map-gestures SPEC §1). Apple
      // Maps already gives spread-to-zoom-in / pinch-to-zoom-out focused under
      // the fingers, simultaneous with one-finger pan, and this map is
      // deliberately UNCONTROLLED (initialRegion + imperative animateToRegion,
      // never a `region` prop) so nothing fights the gesture mid-pinch. Do not
      // add a gesture handler here — guard law F2 forbids it, precisely because
      // a handler over the box-none overlay would break what already works.
      //
      // The one knob worth having: a floor. Without it the map zooms out past
      // the point where every pin collapses into a single cluster dot over a
      // grey world, which reads as "the app lost my data". No ceiling — Apple
      // Maps' own is sane, and Supercluster's maxZoom:16 governs cluster math,
      // not the camera.
      minZoomLevel={3}
      // B7-B (L4-03): gate the iOS marker-cluster spring under reduce-motion.
      // react-native-map-clustering fires a global LayoutAnimation.spring on
      // every pan-settle guarded only by `animationEnabled && Platform.OS ===
      // 'ios'` — with no RM check. animationEnabled={false} short-circuits that
      // one call, bringing the last native cluster animation up to the app's
      // reduce-motion standard (mirrors S12's web-camera gate). iOS spring
      // amplitude/feel once gated is NEEDS-SKY-DEVICE.
      animationEnabled={!reducedMotion}
      renderCluster={(cluster: any) => {
        const { id, geometry, onPress, properties } = cluster;
        const count: number = properties.point_count;
        const coord = {
          latitude: geometry.coordinates[1] as number,
          longitude: geometry.coordinates[0] as number,
        };
        return (
          <Marker
            key={`cluster-${id}-${count}`}
            coordinate={coord}
            onPress={onPress}
            // The whole bubble is mode-independent now (ctaFill disc, #fff ring +
            // count, #0F1B2D outer hairline), so snapshotting is safe and cuts
            // per-pan re-rasterization. The key carries the count so the snapshot
            // refreshes when the cluster's number changes.
            tracksViewChanges={false}
            hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityLabel={`${count} ${count === 1 ? 'flag' : 'flags'}. Tap to expand.`}
          >
            {/* Outer 1px #0F1B2D hairline as a wrapper View (RN allows one border
                per view). Union of the two rings keeps a ≥3:1 edge over ANY map
                tile — the white ring covers dark backdrops, the dark hairline
                covers light ones. Neither color spans the range alone. */}
            <View style={styles.clusterRing}>
              <View style={styles.cluster}>
                {/* Abbreviate like the web twin (PlatformMap.web makeClusterIcon)
                    and cap scaling — a raw 4-digit count clipped in the circle at
                    any scale, and any count clipped at AX sizes (sweep M1). */}
                <Text style={styles.clusterCount} maxFontSizeMultiplier={1.2} {...decorativeProps}>
                  {count >= 1000 ? `${Math.floor(count / 1000)}k` : String(count)}
                </Text>
              </View>
            </View>
          </Marker>
        );
      }}
      onLongPress={
        onLongPressMap
          ? (e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onLongPressMap({ lat: latitude, lng: longitude });
            }
          : undefined
      }
    >
      {/* Heat-map polygons + centroid label markers. JSX-ordered before
            the pin Markers so they paint underneath; label Markers use
            cluster={false} to bypass SuperCluster so a sparse "1 cell, 1
            label" view isn't rolled up into a generic cluster bubble. */}
      {heatCells.map((cell) => {
        const fill = colorForCell(cell, heatmapMode, severityTokens, color.brand);
        const meanRounded = Math.round(cell.meanSeverity);
        // Static, fill-keyed ink — a THEMED ink (textStrong) went catastrophic
        // in dark mode on the low-severity yellow fill (#f5f5f5 on #fde047 =
        // 1.2:1). Gradient fills sev1-4 are light enough for the dark ink; the
        // sev5 red and the density brand fill take white. Keyed off the fill,
        // never the theme.
        const labelTone =
          heatmapMode === 'density' ? '#fff' : meanRounded >= 5 ? '#fff' : '#0F1B2D';
        // Alpha-on-hex (#RRGGBBAA) — react-native-maps accepts it on
        // both iOS + Android. Mirrors the HEATMAP_FILL_OPACITY constant
        // so a tweak there flows here without a separate edit.
        const alphaSuffix = Math.round(HEATMAP_FILL_OPACITY * 255)
          .toString(16)
          .padStart(2, '0');
        const coords = [
          { latitude: cell.latStart, longitude: cell.lngStart },
          { latitude: cell.latEnd, longitude: cell.lngStart },
          { latitude: cell.latEnd, longitude: cell.lngEnd },
          { latitude: cell.latStart, longitude: cell.lngEnd },
        ];
        return (
          <React.Fragment key={`heat-${cell.key}`}>
            <Polygon
              coordinates={coords}
              fillColor={`${fill}${alphaSuffix}`}
              strokeColor={fill}
              strokeWidth={1}
              tappable={false}
            />
            <Marker
              coordinate={{ latitude: cell.lat, longitude: cell.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              // Bypass SuperCluster — see comment above.
              {...({ cluster: false } as { cluster: false })}
              accessibilityRole="text"
              accessibilityLabel={`Heat zone: ${cell.count} flags, mean severity ${cell.meanSeverity.toFixed(1)} out of 5.`}
            >
              <View style={[styles.heatBadge, { backgroundColor: fill }]}>
                {/* Mirror the cluster count above: cap scaling so the digit
                    can't overflow the badge at AX sizes, and hide it from the
                    a11y tree — the Marker's own label already speaks it. */}
                <Text
                  style={[styles.heatBadgeText, { color: labelTone }]}
                  maxFontSizeMultiplier={1.2}
                  {...decorativeProps}
                >
                  {meanRounded}
                </Text>
              </View>
            </Marker>
          </React.Fragment>
        );
      })}
      {flags.map((f) => (
        <Marker
          key={pinKey(f)}
          ref={(r) => {
            markerRefs.current[f.id] = r;
          }}
          coordinate={{ latitude: f.lat, longitude: f.lng }}
          anchor={{ x: 0.5, y: 1 }}
          // Snapshot the custom teardrop once (PROTECT-15). Focus dimming rides the
          // native opacity prop, so it still updates without a re-snapshot.
          tracksViewChanges={false}
          opacity={focusedFlagId && focusedFlagId !== f.id ? 0.55 : 1}
          accessibilityRole="button"
          accessibilityLabel={`${CATEGORY_LABELS[f.category]}, ${severityA11y(f.severity)}, ${statusA11y(f.status)}${f.user_id === null ? ', anonymous report' : ''}. Tap to view details.`}
          // T1 (F2-01): the native callout opens on this same tap; if the pin
          // sits inside the chrome band, nudge the camera clear (see
          // handlePinPress). onPress does NOT suppress the default callout.
          onPress={() => handlePinPress(f)}
        >
          {/* S14: custom teardrop marker — the severity FILL + a 2.5px white ring +
              a 1px #0F1B2D outer hairline (GLASS §12.4 union so low-severity pins
              survive light AND dark tiles: the white ring covers dark backdrops,
              the dark hairline covers light ones) + the counter-rotated category
              glyph (or a check when resolved). S1/L8-7: an ANONYMOUS report keeps
              its severity fill and carries provenance as a SECOND concentric ring —
              never the gray swap that erased the safety encoding. All literals are
              mode-independent (PROTECT-16); the marker snapshots once (PROTECT-15). */}
          <View style={styles.pinWrap}>
            <View style={[styles.pinRot, f.user_id === null && styles.pinRotAnon]}>
              <View style={styles.pinHairline}>
                <View style={[styles.pinDrop, { backgroundColor: severityColor(f.severity) }]}>
                  <View style={styles.pinGlyphCounter}>
                    {f.status === 'resolved' ? (
                      <Check size={14} color="#fff" strokeWidth={3} />
                    ) : (
                      <CategoryIcon category={f.category} size={14} color="#fff" decorative />
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* S3: the whole callout is a doorway into the trust ledger. On
              Android the callout is a snapshot, so Callout.onPress is the only
              reliable in-bubble tap; on iOS it fires for a tap anywhere on the
              tooltip. The visible "Open details ›" row is the affordance cue. */}
          <Callout tooltip onPress={onOpenDetails ? () => onOpenDetails(f) : undefined}>
            <View style={styles.callout}>
              <View
                style={[styles.calloutSevBar, { backgroundColor: severityColor(f.severity) }]}
                // Decorative color bar — severity info is in the text below {...decorativeProps}
              />
              <View style={styles.calloutBody}>
                <AppText
                  variant="label"
                  style={styles.calloutTitle}
                  // dynamic-type-ok — fixed-width callout bubble anchored to a pin;
                  // horizontally hard-bounded by the marker, so one-line truncation
                  // is the intended design (was the guard's ALLOW_LIST entry).
                  numberOfLines={1}
                >
                  {CATEGORY_LABELS[f.category]}
                </AppText>
                <AppText variant="body" style={styles.calloutMeta}>
                  Severity {f.severity} of 5 · {SEVERITY_LABELS[f.severity]} · {STATUS_LABELS[f.status]}
                </AppText>
                {/* S3 (L3-12): a freshness line so even a quick glance shows how
                    recent the report is — the read-half of the trust ledger. */}
                <AppText variant="body" style={styles.calloutFresh}>
                  Reported {relativeTime(f.created_at)}
                </AppText>
                {f.photo_url ? (
                  <RemoteImage
                    uri={f.photo_url}
                    style={styles.calloutPhoto}
                    // photo_alt (2026-08-19): speak the reporter's description
                    // when there is one; otherwise stay decorative inside the
                    // already-labeled callout as before.
                    {...(f.photo_alt
                      ? { accessible: true, accessibilityLabel: `Photo: ${f.photo_alt}` }
                      : { /* Decorative thumbnail inside an already-labeled callout. */ ...decorativeProps })}
                  />
                ) : null}
                {f.description ? (
                  <AppText variant="body" style={styles.calloutDesc} numberOfLines={3}>
                    {f.description}
                  </AppText>
                ) : null}
                {/* S3 (L3-12): the affordance that finally cashes the "open for
                    details" promise — opens FlagDetailModal via Callout.onPress. */}
                {onOpenDetails ? (
                  <View style={styles.calloutCta}>
                    <AppText variant="label" style={styles.calloutCtaText}>
                      Open details ›
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          </Callout>
        </Marker>
      ))}
    </ClusteredMapView>
  );
});

// React.memo skips the re-render when MapScreen re-renders for reasons
// unrelated to the map (e.g. opening a modal, toggling filter panel
// collapsed state). Without it, every parent state change tore down and
// rebuilt every Marker. Props are shallowly compared — callers must stabilize
// `flags`, `initialRegion`, and `onLongPressMap` via useMemo / useCallback
// for this to be effective.
export default memo(PlatformMap);

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    callout: {
      flexDirection: 'row',
      width: 244,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadow.e3,
    },
    calloutSevBar: { width: 6 },
    calloutBody: { flex: 1, padding: spacing.md, gap: spacing.tight },
    calloutTitle: {
      fontSize: font.size.base,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: -0.1,
    },
    calloutMeta: {
      fontSize: font.size.caption,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: font.weight.semibold,
    },
    calloutDesc: {
      fontSize: font.size.xs,
      color: color.text,
      marginTop: spacing.tight,
      lineHeight: 17,
    },
    // S3: report-freshness line — quiet, muted, sits under the severity meta.
    calloutFresh: {
      fontSize: font.size.xs,
      color: color.textMuted,
      fontWeight: font.weight.semibold,
    },
    // S3: "Open details ›" affordance — the callout's next step into the ledger.
    // BP-10/E1 — callout parity: the web popup ships a FILLED 44pt CTA while
    // native was a bare text link; the payoff moment now matches. ctaFill is
    // the mode-independent white-safe fill (5.24:1 both themes). The whole
    // callout stays one tap target (Callout.onPress) — this is visual weight,
    // not a second control.
    calloutCta: {
      marginTop: spacing.sm,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: color.ctaFill,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    calloutCtaText: {
      fontSize: font.size.sm,
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      letterSpacing: 0.2,
    },
    calloutPhoto: {
      width: '100%',
      height: 120,
      borderRadius: radius.md,
      marginTop: spacing.xs,
      backgroundColor: color.surfaceNeutral,
    },
    // Custom teardrop pin (S14). Nesting mirrors the cluster union: an outer
    // #0F1B2D hairline (pinHairline) hugs the white-ringed severity drop (pinDrop).
    // The rotation lives on pinRot so the whole stack tips into a teardrop; the
    // glyph counter-rotates upright. Anonymous pins add pinRotAnon — a second
    // #0F1B2D ring with a white gap (the "double ring"). All literals are
    // mode-independent (PROTECT-16).
    pinWrap: {
      width: 38,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinRot: {
      transform: [{ rotate: '-45deg' }],
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
      borderBottomRightRadius: 15,
      borderBottomLeftRadius: 0,
    },
    pinRotAnon: {
      padding: 2,
      borderWidth: 1.5,
      borderColor: '#0F1B2D',
      backgroundColor: '#fff',
    },
    pinHairline: {
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      borderBottomRightRadius: 14,
      borderBottomLeftRadius: 0,
      borderWidth: 1,
      borderColor: '#0F1B2D',
    },
    pinDrop: {
      width: 26,
      height: 26,
      borderTopLeftRadius: 13,
      borderTopRightRadius: 13,
      borderBottomRightRadius: 13,
      borderBottomLeftRadius: 0,
      borderWidth: 2.5,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.e2,
    },
    pinGlyphCounter: {
      transform: [{ rotate: '45deg' }],
    },
    // Cluster marker — a soft halo + filled core in brand blue. The halo
    // gives the cluster a sense of "grouped energy" so it reads as more
    // than just an oversized pin. Inner ring catches the eye and gives
    // separation from the underlying map tile.
    // Outer hairline ring — a wrapper View with only a border (no width/height)
    // so the dark edge hugs just outside the white ring. See the JSX note.
    clusterRing: {
      borderRadius: radius.circle,
      borderWidth: 1,
      borderColor: '#0F1B2D',
    },
    cluster: {
      // Min dims (not fixed) so a wide abbreviated count can grow the pill —
      // hard 44×44 clipped 4-digit counts; the count Text style must never
      // carry a hard height (guard Rule 3).
      minWidth: 44,
      minHeight: 44,
      paddingHorizontal: 4,
      borderRadius: radius.circle,
      // ctaFill (mode-independent brand) so the white ring + white count stay at
      // 5.2:1 in BOTH themes — plain color.brand is lighter in dark and drops
      // the white count to 3.4:1.
      backgroundColor: color.ctaFill,
      borderWidth: 2.5,
      borderColor: color.textOnBrand,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.e2,
    },
    clusterCount: {
      // White on the ctaFill disc = 5.2:1. (Was '#111', a stale sev5-red-era
      // literal that measured only 3.6:1 on today's blue disc.)
      color: color.textOnBrand,
      fontSize: font.size.base,
      fontWeight: font.weight.bold,
      letterSpacing: -0.2,
    },
    // Heat-cell centroid badge — rounded mean-severity label that gives
    // colorblind users a non-color cue for the cell's intensity. Sized so
    // it stays readable at zoom 14 without crowding adjacent pins.
    heatBadge: {
      minWidth: 28,
      minHeight: 28,
      paddingHorizontal: 8,
      borderRadius: 14,
      borderWidth: 1.5,
      // Static dark edge (not themed color.surface, which vanished over dark
      // tiles). Carries the light-tile regime; the fill-keyed ink carries
      // identification. Boundary residual over the badge's own cell on dark
      // tiles is disclosed in the stacks _doc (non-interactive text label).
      borderColor: '#0F1B2D',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: color.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 3,
    },
    heatBadgeText: { fontSize: 13, fontWeight: '700' },
  });
