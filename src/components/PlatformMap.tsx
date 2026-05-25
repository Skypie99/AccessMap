import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import type MapView from 'react-native-maps';
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
            600,
          );
        },
        showCallout: (id) => {
          markerRefs.current[id]?.showCallout();
        },
      }),
      [],
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
