import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Callout, Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import type MapView from 'react-native-maps';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { CATEGORY_LABELS, severityColor } from '@/lib/flags';
import { decorativeProps } from '@/lib/accessibility';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import type { FlagRow } from '@/types/database';
import {
  type HeatCell,
  heatColorForSeverity,
  heatOpacityForCount,
  DEFAULT_HEAT_GRID_DEG,
} from '@/lib/heatmap';

// Heat-cell circle radius in meters. Matches the web variant — see
// src/components/PlatformMap.web.tsx for the derivation. Both platforms
// render the same HeatCell[] at the same geographic size so the layer
// reads identically across web and native.
const HEAT_CELL_RADIUS_M = Math.round(
  ((DEFAULT_HEAT_GRID_DEG * 111320) / 2) * Math.SQRT2,
);

// react-native-maps' Circle expects fillColor as an rgba() string. Convert
// a hex color + opacity into that form once per render — there are only a
// handful of unique (color, opacity) pairs per frame, so this is cheap.
function rgbaFromHex(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`;
}

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
   * Long-press anywhere on the map to drop a flag at that location.
   * Fires with the geographic coordinate of the press. Web variant
   * implements the same callback via a `contextmenu` listener.
   */
  onLongPressMap?: (coord: { lat: number; lng: number }) => void;
  /**
   * Heat-map overlay cells. When provided and non-empty, the map renders
   * `<Circle>` overlays — one per cell — using the same severity palette
   * as individual pins. Cells are pre-binned at k>=3 (Jordan C1) by
   * computeHeatGrid before being passed in. Pass `undefined` or `[]` to
   * hide the heat layer entirely.
   */
  heatCells?: HeatCell[];
}

const PlatformMap = forwardRef<PlatformMapHandle, PlatformMapProps>(
  function PlatformMap(
    {
      initialRegion,
      flags,
      focusedFlagId,
      showsUserLocation,
      reducedMotion,
      onLongPressMap,
      heatCells,
    },
    ref,
  ) {
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

    useImperativeHandle(
      ref,
      () => ({
        animateTo: (r) => {
          mapRef.current?.animateToRegion(
            {
              latitude: r.latitude,
              longitude: r.longitude,
              latitudeDelta: r.latitudeDelta ?? 0.005,
              longitudeDelta: r.longitudeDelta ?? 0.005,
            },
            // Instant jump when "Reduce Motion" is on (WCAG 2.3.3).
            reducedMotion ? 0 : 600,
          );
        },
        showCallout: (id) => {
          markerRefs.current[id]?.showCallout();
        },
      }),
      [reducedMotion],
    );

    return (
      <ClusteredMapView
        mapRef={(r: any) => { mapRef.current = r; }}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        clusterColor={color.brand}
        clusterTextColor={color.textOnBrand}
        radius={40}
        renderCluster={(cluster: any) => {
          const { id, geometry, onPress, properties } = cluster;
          const count: number = properties.point_count;
          const coord = {
            latitude: geometry.coordinates[1] as number,
            longitude: geometry.coordinates[0] as number,
          };
          return (
            <Marker
              key={`cluster-${id}`}
              coordinate={coord}
              onPress={onPress}
              hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
              accessibilityRole="button"
              accessibilityLabel={`${count} ${count === 1 ? 'flag' : 'flags'}. Tap to expand.`}
            >
              <View style={styles.cluster}>
                <Text style={styles.clusterCount} {...decorativeProps}>{count}</Text>
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
        {/*
          Heat overlay — rendered BEFORE markers so pins stay on top and
          remain tappable. Each cell is a translucent <Circle>; severity
          drives the hue (heatColorForSeverity), count drives the fill
          opacity (heatOpacityForCount). Privacy floor (k>=3) is enforced
          upstream by computeHeatGrid — Circles here just visualize.
          strokeColor uses the same fill (no border ring) so a sparse
          area doesn't show "outline only".
        */}
        {heatCells?.map((cell) => {
          const hex = heatColorForSeverity(cell.avgSeverity);
          const rgba = rgbaFromHex(hex, heatOpacityForCount(cell.count));
          return (
            <Circle
              key={`heat-${cell.lat.toFixed(5)}-${cell.lng.toFixed(5)}`}
              center={{ latitude: cell.lat, longitude: cell.lng }}
              radius={HEAT_CELL_RADIUS_M}
              fillColor={rgba}
              strokeColor={rgba}
              strokeWidth={0}
            />
          );
        })}
        {flags.map((f) => (
          <Marker
            key={f.id}
            ref={(r) => {
              markerRefs.current[f.id] = r;
            }}
            coordinate={{ latitude: f.lat, longitude: f.lng }}
            pinColor={severityColor(f.severity)}
            opacity={focusedFlagId && focusedFlagId !== f.id ? 0.55 : 1}
            accessibilityRole="button"
            accessibilityLabel={`${CATEGORY_LABELS[f.category]}, ${severityA11y(f.severity)}, ${statusA11y(f.status)}. Tap to view details.`}
          >
            <Callout tooltip>
              <View style={styles.callout}>
                <View
                  style={[
                    styles.calloutSevBar,
                    { backgroundColor: severityColor(f.severity) },
                  ]}
                  // Decorative color bar — severity info is in the text below
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <View style={styles.calloutBody}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>
                    {CATEGORY_LABELS[f.category]}
                  </Text>
                  <Text style={styles.calloutMeta}>
                    Severity {f.severity} • {f.status}
                  </Text>
                  {f.photo_url ? (
                    <Image
                      source={{ uri: f.photo_url }}
                      style={styles.calloutPhoto}
                      // Decorative thumbnail inside an already-labeled callout.
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    />
                  ) : null}
                  {f.description ? (
                    <Text style={styles.calloutDesc} numberOfLines={3}>
                      {f.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </ClusteredMapView>
    );
  },
);

export default PlatformMap;

const makeStyles = (color: ColorTheme) => StyleSheet.create({
  callout: {
    flexDirection: 'row',
    width: 240,
    backgroundColor: color.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: color.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  calloutSevBar: { width: 6 },
  calloutBody: { flex: 1, padding: 10, gap: 4 },
  calloutTitle: { fontSize: 14, fontWeight: '700', color: color.textStrong },
  calloutMeta: {
    fontSize: 11,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutDesc: { fontSize: 12, color: color.text, marginTop: 4 },
  calloutPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: color.surfaceNeutral,
  },
  cluster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  clusterCount: {
    color: color.textOnBrand,
    fontSize: 13,
    fontWeight: '700',
  },
});
