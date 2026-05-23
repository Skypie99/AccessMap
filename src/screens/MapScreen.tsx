import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_STATUSES,
  severityColor,
  SEVERITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from '@/lib/flags';
import { useFlags } from '@/lib/flagsStore';
import { loadMapFilters, saveMapFilters } from '@/lib/mapFilters';
import type {
  FlagCategory,
  FlagSeverity,
  FlagStatus,
} from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import PlatformMap, {
  type PlatformMapHandle,
  type PlatformMapRegion,
} from '@/components/PlatformMap';
import { useScreenReader } from '@/lib/accessibility';
import ReportFlagModal from './ReportFlagModal';
import LegendModal from './LegendModal';
import NearbyFlagsModal from './NearbyFlagsModal';

interface Coords {
  lat: number;
  lng: number;
}

const DEFAULT_REGION: PlatformMapRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const mapRef = useRef<PlatformMapHandle | null>(null);
  const route = useRoute<RouteProp<RootTabParamList, 'Map'>>();
  const [location, setLocation] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Shared flag list from FlagsProvider — the Map drives the fetched
  // statuses via setStatuses (mirroring its filter UI), and reads
  // flags/loading/error directly from the store. One round-trip per
  // filter change; Tasks tab sees the same data without re-fetching.
  const {
    flags,
    loading: loadingFlags,
    error: loadError,
    refresh: refreshFlags,
    setStatuses,
  } = useFlags();

  const [reportOpen, setReportOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [focusedFlagId, setFocusedFlagId] = useState<string | null>(null);

  // Phase 2 of the accessible list view: auto-open the linear list when a
  // screen reader is on, so blind/low-vision users land directly in the
  // navigable view instead of the (visual-by-nature) map. Fires once per
  // mount; if the user explicitly closes the modal, we leave them on the
  // Map and don't re-auto-open. The "📋 List" FAB remains as the manual
  // re-entry.
  const screenReaderOn = useScreenReader();
  const hasAutoOpenedListRef = useRef(false);
  useEffect(() => {
    if (screenReaderOn && !hasAutoOpenedListRef.current) {
      hasAutoOpenedListRef.current = true;
      setNearbyOpen(true);
    }
  }, [screenReaderOn]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<FlagCategory>>(
    new Set(),
  );
  const [minSeverity, setMinSeverity] = useState<FlagSeverity>(1);
  // Which statuses to fetch from the server. Default matches the original
  // hardcoded listFlags(['open','verified']) call, so the Map looks the same
  // until the user explicitly opts into a wider view (e.g. Resolved).
  const [activeStatuses, setActiveStatuses] = useState<Set<FlagStatus>>(
    () => new Set(DEFAULT_STATUSES),
  );
  // Tracks whether we've finished reading saved filters from AsyncStorage.
  // The save-effect below is gated on this so the very first render
  // doesn't overwrite stored state with the (still-default) starting set
  // before we've had a chance to hydrate from disk.
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  // True while this screen is on screen — checked before any setState that
  // runs after an `await` so a slow request can't update a torn-down screen.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toggleCategory = useCallback((c: FlagCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const toggleStatus = useCallback((s: FlagStatus) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCategories(new Set());
    setMinSeverity(1);
    setActiveStatuses(new Set(DEFAULT_STATUSES));
  }, []);

  // Whether the status filter differs from the default — used to glow the
  // filter button and show the Clear link.
  const statusFilterActive = useMemo(() => {
    if (activeStatuses.size !== DEFAULT_STATUSES.length) return true;
    return !DEFAULT_STATUSES.every((s) => activeStatuses.has(s));
  }, [activeStatuses]);

  // Mirror the screen's `activeStatuses` Set into the provider's statuses
  // array. The provider re-fetches whenever the array changes.
  useEffect(() => {
    setStatuses(Array.from(activeStatuses));
  }, [activeStatuses, setStatuses]);

  // Hydrate the three filter knobs from AsyncStorage on mount. If a saved
  // payload is present and valid we seed each state piece from it; if not
  // (first launch or corrupt blob) the defaults stand. Flip
  // filtersHydrated last so the save-effect below doesn't fire until we've
  // had a chance to read disk. A second Supabase fetch may happen here
  // when the saved statuses differ from DEFAULT_STATUSES — the provider's
  // fetchSeqRef discards the stale result, so there's no race.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadMapFilters();
      if (cancelled) return;
      if (saved) {
        setActiveCategories(new Set(saved.categories));
        setMinSeverity(saved.minSeverity);
        setActiveStatuses(new Set(saved.statuses));
      }
      setFiltersHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist filter changes. Gated on filtersHydrated so we don't clobber a
  // saved view with the initial default state during the brief window
  // between mount and the async load resolving. Fire-and-forget — the
  // worst case on a storage failure is the user's next pick doesn't
  // survive a relaunch.
  useEffect(() => {
    if (!filtersHydrated) return;
    saveMapFilters({
      categories: Array.from(activeCategories),
      minSeverity,
      statuses: Array.from(activeStatuses),
    });
  }, [activeCategories, minSeverity, activeStatuses, filtersHydrated]);

  const filtersActive =
    activeCategories.size > 0 || minSeverity > 1 || statusFilterActive;

  const filteredFlags = useMemo(() => {
    if (!filtersActive) return flags;
    return flags.filter(
      (f) =>
        (activeCategories.size === 0 || activeCategories.has(f.category)) &&
        f.severity >= minSeverity,
    );
  }, [flags, activeCategories, minSeverity, filtersActive]);

  const requestLocation = useCallback(async () => {
    if (mountedRef.current) setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) setPermissionDenied(true);
        return;
      }
      if (mountedRef.current) setPermissionDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      if (!mountedRef.current) return;
      setLocation(coords);
      mapRef.current?.animateTo({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (e) {
      if (mountedRef.current) {
        Alert.alert('Could not get location', errorMessage(e));
      }
    } finally {
      if (mountedRef.current) setLocating(false);
    }
  }, []);

  // Initial location fetch; runs once. (Flag fetching is owned by the
  // provider — see FlagsProvider in src/lib/flagsStore. iOS screen-reader
  // announcements for load errors fire from the provider so both Map and
  // Tasks benefit.)
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // When Tasks tab navigates here with a focusFlag, animate to it and pop the
  // callout. `ts` makes re-tapping the same flag re-fire.
  useEffect(() => {
    const focus = route.params?.focusFlag;
    if (!focus) return;
    setFocusedFlagId(focus.id);
    mapRef.current?.animateTo({
      latitude: focus.lat,
      longitude: focus.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    const t = setTimeout(() => {
      mapRef.current?.showCallout(focus.id);
    }, 700);
    refreshFlags();
    return () => clearTimeout(t);
  }, [route.params?.focusFlag, route.params?.ts, refreshFlags]);

  const initialRegion: PlatformMapRegion = location
    ? {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <PlatformMap
        ref={mapRef}
        initialRegion={initialRegion}
        flags={filteredFlags}
        focusedFlagId={focusedFlagId}
        showsUserLocation
      />

      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topRow}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>
              {loadingFlags
                ? 'Loading flags…'
                : filtersActive
                  ? `${filteredFlags.length} of ${flags.length} shown`
                  : `${flags.length} flag${flags.length === 1 ? '' : 's'} nearby`}
            </Text>
          </View>
          <Pressable
            onPress={() => setLegendOpen(true)}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Map legend"
            accessibilityHint="Opens a guide explaining flag categories and severity"
          >
            <Text style={styles.iconText}>?</Text>
          </Pressable>
          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            style={[
              styles.iconBtn,
              (filtersOpen || filtersActive) && styles.iconBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle filters"
            accessibilityState={{ expanded: filtersOpen }}
          >
            <Text
              style={[
                styles.iconText,
                (filtersOpen || filtersActive) && styles.iconTextActive,
              ]}
            >
              ⌕
            </Text>
          </Pressable>
          <Pressable
            onPress={refreshFlags}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Refresh flags"
          >
            <Text style={styles.iconText}>⟳</Text>
          </Pressable>
          <Pressable
            onPress={requestLocation}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Recenter on me"
          >
            <Text style={styles.iconText}>◎</Text>
          </Pressable>
        </View>

        {filtersOpen && (
          <View style={styles.filterPanel}>
            <View style={styles.filterHeaderRow}>
              <Text style={styles.filterTitle}>Filter flags</Text>
              {filtersActive && (
                <Pressable
                  onPress={clearFilters}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <Text style={styles.clearLink}>Clear</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.filterSubLabel}>Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {CATEGORY_ORDER.map((c) => {
                const active = activeCategories.has(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => toggleCategory(c)}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${CATEGORY_LABELS[c]}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        active && styles.filterPillTextActive,
                      ]}
                    >
                      {CATEGORY_LABELS[c]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.filterSubLabel}>Minimum severity</Text>
            <View style={styles.filterRow}>
              {SEVERITY_ORDER.map((s) => {
                const active = s === minSeverity;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setMinSeverity(s)}
                    style={[
                      styles.sevPill,
                      active && { backgroundColor: severityColor(s) },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Minimum severity ${s}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.sevPillText,
                        active && styles.sevPillTextActive,
                      ]}
                    >
                      {s}+
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterSubLabel}>Status</Text>
            <View style={styles.filterRow}>
              {STATUS_ORDER.map((s) => {
                const active = activeStatuses.has(s);
                return (
                  <Pressable
                    key={s}
                    onPress={() => toggleStatus(s)}
                    style={[
                      styles.filterPill,
                      active && styles.filterPillActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${STATUS_LABELS[s]}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        active && styles.filterPillTextActive,
                      ]}
                    >
                      {STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {activeStatuses.size === 0 && (
              <Text style={styles.statusHint}>
                Pick at least one status to see flags.
              </Text>
            )}
          </View>
        )}

        {loadError && (
          <Pressable
            onPress={refreshFlags}
            disabled={loadingFlags}
            style={({ pressed }) => [
              styles.errorBanner,
              loadingFlags && styles.errorBannerBusy,
              pressed && styles.errorBannerPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={loadError}
            accessibilityHint="Tries to load flags again"
            accessibilityState={{ busy: loadingFlags }}
            // Announces re-renders of this region on Android too; iOS uses
            // the explicit announceForAccessibility above.
            accessibilityLiveRegion="polite"
          >
            {loadingFlags ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.errorBannerIcon}>⚠</Text>
            )}
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {loadingFlags ? 'Retrying…' : loadError}
            </Text>
          </Pressable>
        )}

        {locating && !location && (
          <View style={styles.banner}>
            <ActivityIndicator />
            <Text style={styles.bannerText}>Finding your location…</Text>
          </View>
        )}

        {permissionDenied && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Location permission denied. Enable it in Settings to report a flag.
            </Text>
          </View>
        )}

        <View style={styles.fabColumn}>
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              styles.fabSecondary,
              pressed && styles.fabPressed,
            ]}
            onPress={() => setNearbyOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open nearby flags list"
            accessibilityHint="Opens an accessible list of flags sorted by distance"
          >
            <Text style={styles.fabSecondaryText}>📋 List</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              !location && styles.fabDisabled,
              pressed && styles.fabPressed,
            ]}
            onPress={() => setReportOpen(true)}
            disabled={!location}
            accessibilityRole="button"
            accessibilityLabel="Report a flag here"
            accessibilityHint="Opens a form to report an accessibility issue at your current location"
            accessibilityState={{ disabled: !location }}
          >
            <Text style={styles.fabText}>＋ Report</Text>
          </Pressable>
        </View>
      </View>

      <ReportFlagModal
        visible={reportOpen}
        location={location}
        onClose={() => setReportOpen(false)}
        onCreated={refreshFlags}
      />

      <LegendModal
        visible={legendOpen}
        onClose={() => setLegendOpen(false)}
      />

      <NearbyFlagsModal
        visible={nearbyOpen}
        location={location}
        flags={flags}
        onClose={() => setNearbyOpen(false)}
        onSelectFlag={(flag) => {
          setNearbyOpen(false);
          setFocusedFlagId(flag.id);
          mapRef.current?.animateTo({
            latitude: flag.lat,
            longitude: flag.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          // Give the close animation a beat before opening the callout, so
          // the marker is visible by the time the bubble appears.
          setTimeout(() => mapRef.current?.showCallout(flag.id), 350);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
  },
  topRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  statusPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  statusText: { fontSize: 13, color: '#333', fontWeight: '600' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  iconText: { fontSize: 18, color: '#2f80ed', fontWeight: '700' },
  iconBtnActive: { backgroundColor: '#2f80ed' },
  iconTextActive: { color: '#fff' },
  filterPanel: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  clearLink: { fontSize: 12, color: '#2f80ed', fontWeight: '600' },
  filterSubLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
  },
  filterPillActive: { backgroundColor: '#2f80ed' },
  filterPillText: { fontSize: 12, color: '#333', fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },
  sevPill: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1f5',
  },
  sevPillText: { fontSize: 13, color: '#333', fontWeight: '700' },
  sevPillTextActive: { color: '#fff' },
  statusHint: { fontSize: 11, color: '#a04040', marginTop: 4 },
  banner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  bannerText: { fontSize: 13, color: '#333' },
  errorBanner: {
    marginTop: 8,
    backgroundColor: '#c0392b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    minHeight: 44,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  errorBannerBusy: { opacity: 0.85 },
  errorBannerPressed: { opacity: 0.7 },
  errorBannerIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  fabColumn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 10,
  },
  fab: {
    backgroundColor: '#2f80ed',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  fabSecondary: { backgroundColor: 'rgba(255,255,255,0.97)' },
  fabSecondaryText: { color: '#2f80ed', fontWeight: '700', fontSize: 15 },
  fabDisabled: { opacity: 0.5 },
  fabPressed: { opacity: 0.8 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
