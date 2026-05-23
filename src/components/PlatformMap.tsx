import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Callout,
  Marker,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { CATEGORY_LABELS } from '@/lib/flags';
import type { FlagRow } from '@/types/database';
import { severityColor } from '@/screens/ReportFlagModal';

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
}

const PlatformMap = forwardRef<PlatformMapHandle, PlatformMapProps>(
  function PlatformMap(
    { initialRegion, flags, focusedFlagId, showsUserLocation },
    ref,
  ) {
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
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
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
          >
            <Callout tooltip>
              <View style={styles.callout}>
                <View
                  style={[
                    styles.calloutSevBar,
                    { backgroundColor: severityColor(f.severity) },
                  ]}
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
      </MapView>
    );
  },
);

export default PlatformMap;

const styles = StyleSheet.create({
  callout: {
    flexDirection: 'row',
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  calloutSevBar: { width: 6 },
  calloutBody: { flex: 1, padding: 10, gap: 4 },
  calloutTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  calloutMeta: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutDesc: { fontSize: 12, color: '#333', marginTop: 4 },
  calloutPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: '#eef1f5',
  },
});
