import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_STATUSES,
  fetchFlagById,
  SEVERITY_LABELS,
  severityColor,
  SEVERITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from '@/lib/flags';
import { useFlags } from '@/lib/flagsStore';
import { loadMapFilters, saveMapFilters } from '@/lib/mapFilters';
import {
  loadFilterPanelCollapsed,
  saveFilterPanelCollapsed,
} from '@/lib/filterPanelPrefs';
import {
  deleteSet,
  FilterSetError,
  getDefaultSetId,
  listSets,
  MAX_FILTER_SETS,
  saveSet,
  setDefaultSetId,
  type FilterSet,
} from '@/lib/filterSets';
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
import AddressSearchModal from '@/components/AddressSearchModal';
import type { GeocodeResult } from '@/lib/geocode';

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
  const [searchOpen, setSearchOpen] = useState(false);
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
  // Whether the filter panel (when open) shows just its header row or all
  // sections. Persists across launches via filterPanelPrefs. Hydrated
  // alongside the filter values; the save-effect below is gated on
  // filterPanelHydrated so we don't clobber the stored value with the
  // initial default during the brief mount→load window.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelCollapsedHydrated, setPanelCollapsedHydrated] = useState(false);
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

  // Saved named filter sets — separate persistence (see src/lib/filterSets).
  // Hydrated alongside the last-used filter values; an empty array is the
  // valid "first launch" state, so we don't need a hydrated flag here.
  const [savedSets, setSavedSets] = useState<FilterSet[]>([]);

  // Id of the user-marked "default" saved set, or null. When set on
  // launch, the matching set's filters override the last-toggled
  // mapFilters so the Map opens to the user's preferred view.
  const [defaultId, setDefaultIdState] = useState<string | null>(null);

  // Save-name modal state. nameDraft is the in-flight TextInput value;
  // savingSet guards against double-submit while the AsyncStorage write
  // is in flight.
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingSet, setSavingSet] = useState(false);

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

  // Quick-toggle severity from the top icon row without opening the full
  // filter panel. Cycles 1 → 2 → 3 → 4 → 5 → 1; 1 is the "no severity
  // filter" state (every flag is severity >= 1). Announces the new state
  // on each tap so screen-reader users hear the change.
  const cycleSeverity = useCallback(() => {
    setMinSeverity((prev) => {
      const next = (prev === 5 ? 1 : prev + 1) as FlagSeverity;
      AccessibilityInfo.announceForAccessibility(
        next === 1
          ? 'Minimum severity: all'
          : `Minimum severity: ${SEVERITY_LABELS[next]} and above`,
      );
      return next;
    });
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
  //
  // We also hydrate the saved-sets list + the "default set" pointer in
  // the same effect — three parallel AsyncStorage reads, one mount. If a
  // valid default exists and its referenced set is still in the saved
  // list, it overrides the last-toggled mapFilters so the Map opens to
  // the user's preferred view instead of whatever they touched last.
  // A dangling pointer (the set was deleted) silently falls back to the
  // last-toggled view; the pointer is cleared on the next saved-sets
  // mutation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, sets, storedDefault, collapsed] = await Promise.all([
        loadMapFilters(),
        listSets(),
        getDefaultSetId(),
        loadFilterPanelCollapsed(),
      ]);
      if (cancelled) return;
      const defaultSet =
        storedDefault !== null
          ? sets.find((s) => s.id === storedDefault) ?? null
          : null;
      if (defaultSet) {
        setActiveCategories(new Set(defaultSet.categories));
        setMinSeverity(defaultSet.minSeverity);
        setActiveStatuses(new Set(defaultSet.statuses));
      } else if (saved) {
        setActiveCategories(new Set(saved.categories));
        setMinSeverity(saved.minSeverity);
        setActiveStatuses(new Set(saved.statuses));
      }
      setSavedSets(sets);
      setDefaultIdState(defaultSet ? defaultSet.id : null);
      setPanelCollapsed(collapsed);
      setFiltersHydrated(true);
      setPanelCollapsedHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the panel collapsed/expanded toggle. Same fire-and-forget
  // pattern as mapFilters — the worst case on a storage failure is the
  // user's next session opens with the default (expanded) state.
  useEffect(() => {
    if (!panelCollapsedHydrated) return;
    saveFilterPanelCollapsed(panelCollapsed);
  }, [panelCollapsed, panelCollapsedHydrated]);

  // Apply a saved set: copy its filter triple over the active filters.
  // The existing save-effect below pushes the new values through to
  // mapFilters.ts storage, so the saved set is reflected next launch
  // even if the user doesn't change anything else after applying it.
  const applySet = useCallback((set: FilterSet) => {
    setActiveCategories(new Set(set.categories));
    setMinSeverity(set.minSeverity);
    setActiveStatuses(new Set(set.statuses));
  }, []);

  // Long-press a saved chip → native action sheet with Make/Remove default
  // + Delete + Cancel. Alert.alert is already the in-app pattern for
  // destructive confirmation, so it gets the familiar OS-native treatment
  // on iOS and Android. (Web falls back to a vertical list — acceptable
  // because the feature gracefully degrades there.)
  const openSetMenu = useCallback(
    (set: FilterSet) => {
      const isDefault = defaultId === set.id;
      Alert.alert(
        set.name,
        isDefault
          ? 'This filter opens by default on launch.'
          : 'Choose an action for this saved filter.',
        [
          {
            text: isDefault ? 'Remove default' : 'Make default',
            onPress: async () => {
              const nextId = isDefault ? null : set.id;
              await setDefaultSetId(nextId);
              if (!mountedRef.current) return;
              setDefaultIdState(nextId);
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteSet(set.id);
              if (!mountedRef.current) return;
              setSavedSets((prev) => prev.filter((s) => s.id !== set.id));
              // deleteSet cascades the storage clear; mirror it in local
              // state so the star disappears immediately.
              if (defaultId === set.id) setDefaultIdState(null);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    },
    [defaultId],
  );

  // Open the save-name modal with an empty draft.
  const openSaveModal = useCallback(() => {
    setNameDraft('');
    setNameModalOpen(true);
  }, []);

  // Commit the draft name. saveSet does the cap + duplicate checks; we
  // map its typed error onto a single user-facing Alert. On success the
  // new set is pushed to local state and the modal closes.
  const submitSaveSet = useCallback(async () => {
    if (savingSet) return;
    setSavingSet(true);
    try {
      const created = await saveSet(nameDraft, {
        categories: Array.from(activeCategories),
        minSeverity,
        statuses: Array.from(activeStatuses),
      });
      if (!mountedRef.current) return;
      setSavedSets((prev) => [...prev, created]);
      setNameModalOpen(false);
      setNameDraft('');
    } catch (e) {
      const msg =
        e instanceof FilterSetError ? e.message : errorMessage(e);
      Alert.alert("Couldn't save filter", msg);
    } finally {
      if (mountedRef.current) setSavingSet(false);
    }
  }, [
    activeCategories,
    activeStatuses,
    minSeverity,
    nameDraft,
    savingSet,
  ]);

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

  // Which saved set, if any, exactly matches the live filter triple.
  // Used to mark the matching chip `selected` so the user can see at a
  // glance which view they're in. Categories + statuses are compared as
  // sets (order-insensitive) so reordering doesn't break the match.
  const activeSetId = useMemo(() => {
    for (const set of savedSets) {
      if (set.minSeverity !== minSeverity) continue;
      if (set.categories.length !== activeCategories.size) continue;
      if (set.statuses.length !== activeStatuses.size) continue;
      if (!set.categories.every((c) => activeCategories.has(c))) continue;
      if (!set.statuses.every((s) => activeStatuses.has(s))) continue;
      return set.id;
    }
    return null;
  }, [savedSets, activeCategories, activeStatuses, minSeverity]);

  const canSaveMore = savedSets.length < MAX_FILTER_SETS;

  const filteredFlags = useMemo(() => {
    if (!filtersActive) return flags;
    return flags.filter(
      (f) =>
        (activeCategories.size === 0 || activeCategories.has(f.category)) &&
        f.severity >= minSeverity,
    );
  }, [flags, activeCategories, minSeverity, filtersActive]);

  // Announce the empty-results state to iOS screen readers when it appears
  // (Android picks it up via the alert's accessibilityLiveRegion). Only
  // fires on transitions into "0 results" — not on every re-render while
  // empty — so a user who's already heard it doesn't get re-spoken.
  const showEmptyCard =
    filtersActive && !loadingFlags && !loadError && filteredFlags.length === 0;
  const previouslyEmptyRef = useRef(false);
  useEffect(() => {
    if (showEmptyCard && !previouslyEmptyRef.current) {
      AccessibilityInfo.announceForAccessibility(
        'No flags match your filters. Try broadening them.',
      );
    }
    previouslyEmptyRef.current = showEmptyCard;
  }, [showEmptyCard]);

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

  // Deep-link arrival: accessmap://flag/{id} → React Navigation parses the
  // id into route.params.flagId. Fetch the flag's lat/lng on the fly, then
  // animate + pop the callout using the same machinery as the Tasks → Map
  // path above.
  //
  // Gracefully no-ops on:
  //   - bad / unknown id → fetchFlagById returns null and we just leave
  //     the map on its default region.
  //   - network or auth issues → caught in the try/catch; user sees the
  //     Map normally rather than an alert.
  useEffect(() => {
    const flagId = route.params?.flagId;
    if (!flagId) return;
    let cancelled = false;
    (async () => {
      try {
        const flag = await fetchFlagById(flagId);
        if (cancelled || !flag) return;
        setFocusedFlagId(flag.id);
        mapRef.current?.animateTo({
          latitude: flag.lat,
          longitude: flag.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        setTimeout(() => {
          if (!cancelled) mapRef.current?.showCallout(flag.id);
        }, 700);
      } catch {
        // Swallow — deep-link arrivals shouldn't ever surface an error
        // dialog. The user just sees the Map open as usual.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params?.flagId]);

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
          {/*
            actionBar groups the icon buttons into one connected surface so
            they feel like a single tool tray instead of four free-floating
            circles. The container carries the shadow + background; each
            inner button drops its own shadow so the row reads as one
            object with internal segments.
          */}
          <View style={styles.actionBar}>
            <Pressable
              onPress={() => setSearchOpen(true)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Search by address"
              accessibilityHint="Opens a search box to jump the map to an address or place"
            >
              <Text style={styles.iconText}>🔍</Text>
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={() => setLegendOpen(true)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Map legend"
              accessibilityHint="Opens a guide explaining flag categories and severity"
            >
              <Text style={styles.iconText}>?</Text>
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={() => setFiltersOpen((v) => !v)}
              style={[
                styles.actionBtn,
                (filtersOpen || filtersActive) && styles.actionBtnActive,
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
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={cycleSeverity}
              style={[
                styles.actionBtn,
                styles.sevQuickBtn,
                minSeverity > 1 && { backgroundColor: severityColor(minSeverity) },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                minSeverity === 1
                  ? 'Minimum severity: all'
                  : `Minimum severity: ${SEVERITY_LABELS[minSeverity]} and above`
              }
              accessibilityHint="Tap to cycle through minimum severity filters"
            >
              <Text
                style={[
                  styles.iconText,
                  styles.sevQuickText,
                  minSeverity > 1 && styles.iconTextActive,
                ]}
              >
                {minSeverity}+
              </Text>
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={refreshFlags}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Refresh flags"
            >
              <Text style={styles.iconText}>⟳</Text>
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={requestLocation}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Recenter on me"
            >
              <Text style={styles.iconText}>◎</Text>
            </Pressable>
          </View>
        </View>

        {filtersOpen && (
          <View style={styles.filterPanel}>
            <View style={styles.filterHeaderRow}>
              <Pressable
                onPress={() => setPanelCollapsed((v) => !v)}
                hitSlop={8}
                style={styles.filterTitleRow}
                accessibilityRole="button"
                accessibilityLabel={
                  panelCollapsed
                    ? 'Expand filter panel'
                    : 'Collapse filter panel'
                }
                accessibilityHint={
                  panelCollapsed
                    ? 'Shows saved filters, categories, severity, and status'
                    : 'Hides the filter sections, leaving just the header'
                }
                accessibilityState={{ expanded: !panelCollapsed }}
              >
                <Text style={styles.filterTitle}>Filter flags</Text>
                <Text
                  style={styles.filterChevron}
                  accessibilityElementsHidden
                >
                  {panelCollapsed ? '▸' : '▾'}
                </Text>
              </Pressable>
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

            {!panelCollapsed && (
              <>
            <Text style={styles.filterSubLabel}>Saved</Text>
            {savedSets.length === 0 ? (
              <View style={styles.savedEmpty}>
                <Text style={styles.savedEmptyText}>
                  Save your current filter as a named set to quickly
                  switch later.
                </Text>
                <Pressable
                  onPress={openSaveModal}
                  style={styles.savedSaveBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Save current filter as a named set"
                  accessibilityHint="Opens a prompt to name the current filter combination"
                >
                  <Text style={styles.savedSaveBtnText}>
                    Save current filter
                  </Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {savedSets.map((set) => {
                  const isSelected = set.id === activeSetId;
                  const isDefault = set.id === defaultId;
                  return (
                    <Pressable
                      key={set.id}
                      onPress={() => applySet(set)}
                      onLongPress={() => openSetMenu(set)}
                      style={[
                        styles.filterPill,
                        isSelected && styles.filterPillActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isDefault
                          ? `Apply "${set.name}" filter (default on launch)`
                          : `Apply "${set.name}" filter`
                      }
                      accessibilityHint="Sets the map filter to this saved combination. Long press for options including make default and delete."
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          isSelected && styles.filterPillTextActive,
                        ]}
                      >
                        {/* Star is decorative — the "default on launch"
                            wording is carried by accessibilityLabel above
                            so screen readers don't read out a glyph. */}
                        {isDefault ? '★ ' : ''}
                        {set.name}
                      </Text>
                    </Pressable>
                  );
                })}
                {canSaveMore && (
                  <Pressable
                    onPress={openSaveModal}
                    style={[styles.filterPill, styles.savedAddPill]}
                    accessibilityRole="button"
                    accessibilityLabel="Save current filter as a named set"
                    accessibilityHint="Opens a prompt to name the current filter combination"
                  >
                    <Text style={styles.savedAddPillText}>
                      + Save current
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            )}

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
              </>
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

        {/*
          Empty-state card for the "filters hide every flag" case. Only shown
          when the user has narrowed the view to zero results — not for the
          "no flags exist anywhere" case, which the status pill already
          communicates. Lives in the overlay so it floats above the map but
          below the FABs (which keep their column on the right).
        */}
        {showEmptyCard && (
            <View
              style={styles.emptyCard}
              accessible
              accessibilityRole="alert"
              accessibilityLabel="No flags match your filters. Try broadening them or reset filters."
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.emptyCardIcon} accessibilityElementsHidden>
                🔍
              </Text>
              <Text style={styles.emptyCardTitle}>
                No flags match your filters
              </Text>
              <Text style={styles.emptyCardBody}>
                Try broadening your filters, or reset to see all nearby flags.
              </Text>
              <Pressable
                onPress={clearFilters}
                style={({ pressed }) => [
                  styles.emptyCardBtn,
                  pressed && styles.emptyCardBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
                accessibilityHint="Clears categories, severity, and status filters"
              >
                <Text style={styles.emptyCardBtnText}>Reset filters</Text>
              </Pressable>
            </View>
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

      <AddressSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(result: GeocodeResult) => {
          // Animate the map to the picked location. Zoom is generous
          // (delta 0.02) since geocoded results often point at a
          // neighborhood centroid, not a precise pin — too tight and
          // the user lands "next to" their target.
          mapRef.current?.animateTo({
            latitude: result.lat,
            longitude: result.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }}
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

      {/*
        Cross-platform save-name prompt. We use a Modal + TextInput instead
        of Alert.prompt because Alert.prompt is iOS-only and the app runs
        on Android + web too. The modal mirrors ReportFlagModal's bottom-
        sheet pattern so the screen feels consistent.
      */}
      <Modal
        visible={nameModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!savingSet) setNameModalOpen(false);
        }}
      >
        <View style={styles.nameBackdrop}>
          <View style={styles.nameCard}>
            <Text style={styles.nameTitle}>Name this filter</Text>
            <Text style={styles.nameHint}>
              You can save up to {MAX_FILTER_SETS} filter sets.
            </Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="e.g. Downtown commute"
              autoFocus
              autoCapitalize="sentences"
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={submitSaveSet}
              style={styles.nameInput}
              accessibilityLabel="Filter set name"
            />
            <View style={styles.nameActions}>
              <Pressable
                onPress={() => {
                  if (savingSet) return;
                  setNameModalOpen(false);
                }}
                disabled={savingSet}
                style={[styles.nameBtn, styles.nameBtnCancel]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.nameBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitSaveSet}
                disabled={savingSet || nameDraft.trim().length === 0}
                style={[
                  styles.nameBtn,
                  styles.nameBtnSave,
                  (savingSet || nameDraft.trim().length === 0) &&
                    styles.nameBtnSaveDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save filter set"
                accessibilityState={{
                  busy: savingSet,
                  disabled: savingSet || nameDraft.trim().length === 0,
                }}
              >
                {savingSet ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nameBtnSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  // Quick-cycle severity button — slightly wider than the round icon buttons
  // to fit the "{n}+" label without crowding the glyph against the edges.
  sevQuickBtn: { width: 44 },
  sevQuickText: { fontSize: 14 },
  // Grouped action bar — wraps the icon buttons in one elevated white
  // surface with thin internal dividers so they read as a single
  // connected tool tray instead of four free-floating circles. Replaces
  // the cheap "scattered buttons" look the user called out.
  actionBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    // Slightly deeper shadow than the individual iconBtns it replaced,
    // so the merged surface still feels lifted.
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  actionBtnActive: { backgroundColor: '#2f80ed' },
  actionDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#e5e5e5',
  },
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
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    // The header row itself is the tap target; combined with the parent
    // panel padding this gives a comfortable 44pt area despite the small
    // visible glyph.
    minHeight: 32,
  },
  filterChevron: { fontSize: 12, color: '#2f80ed', fontWeight: '700' },
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
  emptyCard: {
    alignSelf: 'center',
    marginTop: 16,
    maxWidth: 320,
    backgroundColor: 'rgba(255,255,255,0.98)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    gap: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  emptyCardIcon: { fontSize: 28 },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  emptyCardBody: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCardBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2f80ed',
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyCardBtnPressed: { opacity: 0.8 },
  emptyCardBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
  savedEmpty: { gap: 8, marginTop: 4 },
  savedEmptyText: { fontSize: 12, color: '#666', lineHeight: 16 },
  savedSaveBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2f80ed',
    minHeight: 32,
    justifyContent: 'center',
  },
  savedSaveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  savedAddPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2f80ed',
    borderStyle: 'dashed',
  },
  savedAddPillText: { color: '#2f80ed', fontSize: 12, fontWeight: '700' },
  nameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  nameCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  nameTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  nameHint: { fontSize: 12, color: '#666' },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
  },
  nameActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  nameBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  nameBtnCancel: { backgroundColor: '#eef1f5' },
  nameBtnCancelText: { color: '#333', fontWeight: '600', fontSize: 14 },
  nameBtnSave: { backgroundColor: '#2f80ed' },
  nameBtnSaveDisabled: { opacity: 0.5 },
  nameBtnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
