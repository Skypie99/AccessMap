import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import type MapView from 'react-native-maps';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { CATEGORY_LABELS, severityColor } from '@/lib/flags';
import { decorativeProps } from '@/lib/accessibility';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import type { FlagRow } from '@/types/database';

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
  calloutPhoto: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    backgroundColor: color.surfaceNeutral,
  },
  // Cluster marker — a soft halo + filled core in brand blue. The halo
  // gives the cluster a sense of "grouped energy" so it reads as more
  // than just an oversized pin. Inner ring catches the eye and gives
  // separation from the underlying map tile.
  cluster: {
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    backgroundColor: color.brand,
    borderWidth: 2.5,
    borderColor: color.textOnBrand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.e2,
  },
  clusterCount: {
    color: color.textOnBrand,
    fontSize: font.size.base,
    fontWeight: font.weight.bold,
    letterSpacing: -0.2,
  },
});
