import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';
import { errorMessage } from '@/lib/errors';
import { confirm, notify } from '@/lib/confirm';
import CategoryIcon from '@/components/CategoryIcon';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  List,
  LocateFixed,
  MapPin,
  Plus,
  RotateCw,
  Search,
  Shapes,
  SlidersHorizontal,
  Star,
  WifiOff,
} from 'lucide-react-native';
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
import {
  DISABILITY_TAGS,
  DISABILITY_TAG_LABELS,
  matchesDisabilityFilter,
  type DisabilityTag,
} from '@/lib/contextTags';
import { DISTANCE_OPTIONS, loadMapFilters, saveMapFilters } from '@/lib/mapFilters';
import { haversineKm } from '@/lib/distance';
import { loadFilterPanelCollapsed, saveFilterPanelCollapsed } from '@/lib/filterPanelPrefs';
import { loadHeatmapEnabled, saveHeatmapEnabled } from '@/lib/heatmapPrefs';
import {
  bucketFlagsToCells,
  DEFAULT_HEATMAP_MODE,
  DEFAULT_K_FLOOR,
  type HeatmapMode,
} from '@/lib/heatmap';
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
import {
  addPreset,
  FILTER_PRESETS_MAX,
  loadPresets,
  savePresets,
  type FilterPreset,
} from '@/lib/filterPresets';
import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import PlatformMap, {
  type PlatformMapHandle,
  type PlatformMapRegion,
} from '@/components/PlatformMap';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useScreenReader, useReducedMotion } from '@/lib/accessibility';
import ReportFlagModal from './ReportFlagModal';
import LegendModal from './LegendModal';
import HeatmapLegend from '@/components/HeatmapLegend';
import NearbyFlagsModal from './NearbyFlagsModal';
import AddressSearchModal from '@/components/AddressSearchModal';
import SavedPlacesModal from '@/components/SavedPlacesModal';
import FilterPresetsModal from '@/components/FilterPresetsModal';
import { loadPlaces, type SavedPlace } from '@/lib/savedPlaces';
import { useAuth } from '@/lib/auth';
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

// Cycle sequence for the category quick-cycle button: null = "All categories"
// (empty Set), followed by each category in display order. Defined here
// (module-level) so the useCallback below can reference it without a dep.
const CATEGORY_CYCLE: (FlagCategory | null)[] = [null, ...CATEGORY_ORDER];

// ----------------------------------------------------------------------------
// Heat-map render mode — single config constant for Sky's D5 follow-up.
//
// Sky pre-approved a gradient (D5 = yes) and Dani's design compile signed off
// with POLISH. The contingency: if the gradient reads as too busy in real
// testing, Sky flips this constant to 'density' and ships a uniform
// brand-tinted layer instead. ONE-LINE CHANGE here — no other code in the
// screen / map / clustering lib has to move.
//
// Jordan's k>=3 floor is enforced inside `bucketFlagsToCells`; lowering it
// requires a fresh privacy review.
// ----------------------------------------------------------------------------
const HEATMAP_MODE: HeatmapMode = DEFAULT_HEATMAP_MODE;

// M3 (re-sweep 2026-06-09): a deep-linked flag can live outside the first
// page of loaded flags, in which case animateTo centers the map on empty
// water — no marker, no callout. This helper appends the fetched flag to
// the marker list if (and only if) it isn't already there, de-duped by id.
// It runs AFTER the filter pass on purpose: a flag the user explicitly
// followed a link to should always be visible, even when the active
// filters would hide it. Pure + exported so the unit test can pin the
// append/de-dupe behavior without rendering the screen.
export function withFocusFlag(flags: FlagRow[], extra: FlagRow | null): FlagRow[] {
  if (!extra) return flags;
  if (flags.some((f) => f.id === extra.id)) return flags;
  return [...flags, extra];
}

// M4 (re-sweep 2026-06-09): web replacement for the saved-set Alert menu.
// Alert.alert is a no-op shim on react-native-web (same trap documented at
// handleMapLongPress below), so the three-button action sheet never appears
// on web — which made saved sets undeletable there and turned the 5-set cap
// into a dead end. Instead we ask two sequential yes/no questions through
// the platform-aware confirm() helper:
//   1. Make default / Remove default (label + copy flip on isDefault)
//   2. Delete (marked destructive)
// Declining both means "cancel" → null. The confirm function is injected so
// the unit test can pin the prompt sequence without a window.confirm shim.
// A proper sheet-based menu is deliberately out of scope (later design
// polish).
export type SetMenuChoice = 'toggleDefault' | 'delete' | null;

export async function webSetMenuChoice(
  setName: string,
  isDefault: boolean,
  confirmFn: (
    title: string,
    message: string,
    confirmLabel?: string,
    destructive?: boolean,
  ) => Promise<boolean>,
): Promise<SetMenuChoice> {
  const wantsToggle = await confirmFn(
    setName,
    isDefault
      ? 'This filter opens by default on launch. Remove it as the default?'
      : 'Make this the filter that opens by default on launch?',
    isDefault ? 'Remove default' : 'Make default',
    false,
  );
  if (wantsToggle) return 'toggleDefault';

  const wantsDelete = await confirmFn(
    `Delete "${setName}"?`,
    'This permanently deletes the saved filter set. This cannot be undone.',
    'Delete',
    true,
  );
  return wantsDelete ? 'delete' : null;
}

export default function MapScreen() {
  const color = useColor();
  const styles = makeStyles(color);
  const mapRef = useRef<PlatformMapHandle | null>(null);
  const route = useRoute<RouteProp<RootTabParamList, 'FullMap'>>();
  // L9: needed to reset route.params.flagId after a deep link is handled —
  // see the deep-link effect below.
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'FullMap'>>();
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
    refreshIfStale: refreshFlagsIfStale,
    setStatuses,
    setViewportGate,
    isOfflineCache,
  } = useFlags();

  const [reportOpen, setReportOpen] = useState(false);
  // Long-press drop location — set when the user long-presses the map.
  // Pre-fills ReportFlagModal with this coord (overriding the user's
  // current GPS location). Cleared on modal close so subsequent
  // FAB-tap reports use GPS again.
  const [dropLocation, setDropLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  // Saved Places list for the quick-jump chip row above the action bar.
  // Loaded when the user is known and refreshed every time the modal
  // closes (so newly-added / removed places appear without a screen
  // change). Kept here (not in the modal) because the chip row outlives
  // the modal lifecycle.
  const { user: authUser } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  // QA E1/C2: track which user-id the current `savedPlaces` belongs to.
  // When authUser flips (sign-out → sign-in, or user A → user B on the
  // same device), we (a) clear the list synchronously to avoid a flash
  // of the previous user's data and (b) discard any in-flight load whose
  // user no longer matches.
  const loadedForUserIdRef = useRef<string | null>(null);
  const placesMountedRef = useRef(true);
  useEffect(() => {
    placesMountedRef.current = true;
    return () => {
      placesMountedRef.current = false;
    };
  }, []);
  const refreshSavedPlaces = useCallback(async () => {
    const targetId = authUser?.id ?? null;
    // Synchronous: clear if user changed (or is now null) BEFORE awaiting,
    // so the chip row never paints with the previous user's data.
    if (loadedForUserIdRef.current !== targetId) {
      setSavedPlaces([]);
      loadedForUserIdRef.current = targetId;
    }
    if (!targetId) return;
    try {
      const list = await loadPlaces(targetId);
      // Guard the late resolution: if another user signed in mid-flight,
      // discard this result.
      if (!placesMountedRef.current) return;
      if (loadedForUserIdRef.current !== targetId) return;
      setSavedPlaces(list);
    } catch {
      // Best-effort — chip row degrades to empty silently.
    }
  }, [authUser]);
  useEffect(() => {
    void refreshSavedPlaces();
  }, [refreshSavedPlaces]);
  const [focusedFlagId, setFocusedFlagId] = useState<string | null>(null);
  // M3: the flag a deep link resolved to. Kept as local state (flagsStore has
  // no upsert) and merged into the marker list via withFocusFlag below, so a
  // deep-linked flag outside the loaded page still renders a marker. NOT
  // cleared when route.params.flagId goes back to undefined — the L9 fix
  // clears the nav param after the callout fires, and the marker must
  // persist. Only replaced when a new flagId arrives.
  const [deepLinkFlag, setDeepLinkFlag] = useState<FlagRow | null>(null);

  // Phase 2 of the accessible list view: auto-open the linear list when a
  // screen reader is on, so blind/low-vision users land directly in the
  // navigable view instead of the (visual-by-nature) map. Fires once per
  // mount; if the user explicitly closes the modal, we leave them on the
  // Map and don't re-auto-open. The "📋 List" FAB remains as the manual
  // re-entry.
  const screenReaderOn = useScreenReader();
  // WCAG 2.3.3: skip non-essential animation when the user has requested
  // reduced motion. Used at every animateTo / showCallout call site below.
  const reducedMotion = useReducedMotion();
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
  // Heat-map toggle — defaults to OFF (Dani's design compile: don't obscure
  // pins on first load). Persisted via heatmapPrefs.ts. `heatmapHydrated`
  // gates the save-effect so we don't clobber the stored value during the
  // brief mount→load window.
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapHydrated, setHeatmapHydrated] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<FlagCategory>>(new Set());
  const [minSeverity, setMinSeverity] = useState<FlagSeverity>(1);
  // Which statuses to fetch from the server. Default matches the original
  // hardcoded listFlags(['open','verified']) call, so the Map looks the same
  // until the user explicitly opts into a wider view (e.g. Resolved).
  const [activeStatuses, setActiveStatuses] = useState<Set<FlagStatus>>(
    () => new Set(DEFAULT_STATUSES),
  );
  // Max distance (km) from the user to consider a flag visible. null = off
  // (no distance filter applied). When the user has no known location
  // (permission denied / still loading), the filter is treated as inactive
  // regardless of this value — see filteredFlags below. Persisted via
  // mapFilters; saved sets/presets do not carry this axis (yet) so applying
  // a set leaves the current radius untouched.
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  // "Who does this affect?" filter (Sprint 3) — the disability tags the user
  // wants to narrow to. Empty = no filter (show everything). This is a pure
  // client-side filter on already-loaded flags (see filteredFlags) — no new
  // server query. Intentionally session-only / not persisted to mapFilters:
  // it's an access-need lens a user picks for the moment, and keeping it out
  // of the persisted triple avoids disturbing saved-set/preset matching, which
  // compares categories/severity/status only.
  const [activeDisabilityTags, setActiveDisabilityTags] = useState<Set<DisabilityTag>>(new Set());
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

  // Per-user filter presets (parallel to the device-wide `filterSets`
  // chips above). The presets list itself lives inside FilterPresetsModal;
  // MapScreen only needs to (a) open the modal in apply-mode for "Load
  // preset" and (b) write a new preset from the "Save as preset" name
  // prompt below. The write happens here (not in the modal) because the
  // current filter triple is MapScreen state — the modal has no view of it.
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [presetNameModalOpen, setPresetNameModalOpen] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  // True while this screen is on screen — checked before any setState that
  // runs after an `await` so a slow request can't update a torn-down screen.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // D4 Safeguard #1 — Viewport geofence for realtime flag events.
  //
  // Tracks the latest known map region so the D4 payload handler can discard
  // flags whose lat/lng fall outside what the user is currently viewing.
  // Seeded from DEFAULT_REGION on mount; updated when `location` resolves
  // (see useEffect below that syncs with `initialRegion`).
  //
  // We use a ref (not state) because the viewport gate callback is a closure
  // over this ref — no re-render needed when the region changes.
  const currentRegionRef = useRef<PlatformMapRegion>(DEFAULT_REGION);

  // Register a viewport gate with FlagsProvider on mount; deregister on unmount.
  // The gate is a pure predicate: returns true if the flag is inside the current
  // map bounds, false if outside (payload should be discarded).
  useEffect(() => {
    setViewportGate((flag) => {
      const r = currentRegionRef.current;
      const latMin = r.latitude - r.latitudeDelta / 2;
      const latMax = r.latitude + r.latitudeDelta / 2;
      const lngMin = r.longitude - r.longitudeDelta / 2;
      const lngMax = r.longitude + r.longitudeDelta / 2;
      return flag.lat >= latMin && flag.lat <= latMax && flag.lng >= lngMin && flag.lng <= lngMax;
    });
    return () => {
      setViewportGate(null);
    };
  }, [setViewportGate]);

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

  const toggleDisabilityTag = useCallback((tag: DisabilityTag) => {
    setActiveDisabilityTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCategories(new Set());
    setMinSeverity(1);
    setActiveStatuses(new Set(DEFAULT_STATUSES));
    setMaxDistanceKm(null);
    setActiveDisabilityTags(new Set());
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

  // Category quick-cycle — cycles the category filter through a fixed
  // sequence: All → no_ramp → broken_sidewalk → blocked_path →
  // missing_signal → steep_grade → other → All. Each press scopes the
  // map to exactly one category, making it easy to scan for a specific
  // barrier type without opening the full filter panel.
  //
  // Behaviour when multiple categories are active (user set them via the
  // full panel): pressing this button treats the state as "All" so the
  // next tap moves to no_ramp (the first single-category view).
  const cycleCategory = useCallback(() => {
    setActiveCategories((prev) => {
      // Determine the current position in the cycle sequence.
      // Default: 0 = "All categories" (empty Set).
      let currentIdx = 0;
      if (prev.size === 1) {
        // prev.size === 1 guarantees the spread has exactly one element.
        const singleCat = ([...prev] as FlagCategory[])[0];
        const pos = CATEGORY_CYCLE.indexOf(singleCat ?? null);
        if (pos !== -1) currentIdx = pos;
      }
      // Advance one step, wrapping from the last category back to All.
      const nextIdx = (currentIdx + 1) % CATEGORY_CYCLE.length;
      // CATEGORY_CYCLE.length is always 7 (1 null + 6 categories) so
      // nextIdx is always in range — cast away the `| undefined`.
      const nextCat = (CATEGORY_CYCLE[nextIdx] ?? null) as FlagCategory | null;
      const nextSet = nextCat === null ? new Set<FlagCategory>() : new Set<FlagCategory>([nextCat]);
      AccessibilityInfo.announceForAccessibility(
        nextCat === null
          ? 'Category filter: all categories'
          : `Category filter: ${CATEGORY_LABELS[nextCat]} only`,
      );
      return nextSet;
    });
  }, []); // CATEGORY_CYCLE + CATEGORY_LABELS are module-level constants; no closure deps

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
      const [saved, sets, storedDefault, collapsed, heatOn] = await Promise.all([
        loadMapFilters(),
        listSets(),
        getDefaultSetId(),
        loadFilterPanelCollapsed(),
        loadHeatmapEnabled(),
      ]);
      if (cancelled) return;
      const defaultSet =
        storedDefault !== null ? (sets.find((s) => s.id === storedDefault) ?? null) : null;
      if (defaultSet) {
        setActiveCategories(new Set(defaultSet.categories));
        setMinSeverity(defaultSet.minSeverity);
        setActiveStatuses(new Set(defaultSet.statuses));
      } else if (saved) {
        setActiveCategories(new Set(saved.categories));
        setMinSeverity(saved.minSeverity);
        setActiveStatuses(new Set(saved.statuses));
      }
      // Distance is hydrated from the last-toggled mapFilters even when a
      // default saved set is being applied — saved sets don't currently
      // carry distance, so we still want the user's last radius choice.
      if (saved) setMaxDistanceKm(saved.maxDistanceKm);
      setSavedSets(sets);
      setDefaultIdState(defaultSet ? defaultSet.id : null);
      setPanelCollapsed(collapsed);
      setHeatmapEnabled(heatOn);
      setFiltersHydrated(true);
      setPanelCollapsedHydrated(true);
      setHeatmapHydrated(true);
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

  // Persist the heat-map visibility toggle. Same fire-and-forget pattern.
  useEffect(() => {
    if (!heatmapHydrated) return;
    saveHeatmapEnabled(heatmapEnabled);
  }, [heatmapEnabled, heatmapHydrated]);

  // Apply a saved set: copy its filter triple over the active filters.
  // The existing save-effect below pushes the new values through to
  // mapFilters.ts storage, so the saved set is reflected next launch
  // even if the user doesn't change anything else after applying it.
  const applySet = useCallback((set: FilterSet) => {
    setActiveCategories(new Set(set.categories));
    setMinSeverity(set.minSeverity);
    setActiveStatuses(new Set(set.statuses));
  }, []);

  // The two saved-set menu actions, hoisted out of the Alert buttons so the
  // native and web menu paths below share one implementation. Each re-derives
  // isDefault from current state so the menu copy and the action can't drift.
  const toggleDefaultFor = useCallback(
    async (set: FilterSet) => {
      const isDefault = defaultId === set.id;
      const nextId = isDefault ? null : set.id;
      await setDefaultSetId(nextId);
      if (!mountedRef.current) return;
      setDefaultIdState(nextId);
      AccessibilityInfo.announceForAccessibility(
        isDefault ? 'Default filter cleared' : 'Set as default filter',
      );
    },
    [defaultId],
  );

  const deleteSetFor = useCallback(
    async (set: FilterSet) => {
      await deleteSet(set.id);
      if (!mountedRef.current) return;
      setSavedSets((prev) => prev.filter((s) => s.id !== set.id));
      // deleteSet cascades the storage clear; mirror it in local
      // state so the star disappears immediately.
      if (defaultId === set.id) setDefaultIdState(null);
    },
    [defaultId],
  );

  // Long-press a saved chip → action menu with Make/Remove default + Delete
  // + Cancel. On iOS/Android, Alert.alert is already the in-app pattern for
  // destructive confirmation, so it gets the familiar OS-native treatment.
  // On web, Alert.alert is a no-op shim, so we route through the exported
  // webSetMenuChoice helper (two sequential confirm() binaries) instead —
  // without it the menu is unreachable and saved sets can never be deleted
  // once the 5-set cap is hit.
  const openSetMenu = useCallback(
    (set: FilterSet) => {
      const isDefault = defaultId === set.id;
      if (Platform.OS === 'web') {
        void (async () => {
          const choice = await webSetMenuChoice(set.name, isDefault, confirm);
          if (choice === 'toggleDefault') await toggleDefaultFor(set);
          else if (choice === 'delete') await deleteSetFor(set);
        })();
        return;
      }
      Alert.alert(
        set.name,
        isDefault
          ? 'This filter opens by default on launch.'
          : 'Choose an action for this saved filter.',
        [
          {
            text: isDefault ? 'Remove default' : 'Make default',
            onPress: () => void toggleDefaultFor(set),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void deleteSetFor(set),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    },
    [defaultId, toggleDefaultFor, deleteSetFor],
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
      const msg = e instanceof FilterSetError ? e.message : errorMessage(e);
      Alert.alert("Couldn't save filter", msg);
    } finally {
      if (mountedRef.current) setSavingSet(false);
    }
  }, [activeCategories, activeStatuses, minSeverity, nameDraft, savingSet]);

  // Open the per-user preset save-name prompt with an empty draft.
  const openPresetSaveModal = useCallback(() => {
    setPresetNameDraft('');
    setPresetNameModalOpen(true);
  }, []);

  // Snapshot the current filter triple as a new named preset for the
  // signed-in user. Loads the existing list, appends via addPreset (which
  // also enforces the FILTER_PRESETS_MAX cap by dropping the oldest),
  // persists, and surfaces a screen-reader announcement so SR users hear
  // confirmation. Catches storage errors and re-surfaces them as an Alert.
  //
  // Cap warning: if the user was already at FILTER_PRESETS_MAX, addPreset
  // silently drops the oldest entry to make room. That used to vanish
  // without a trace — Quinn flagged this as silent data loss. We now
  // capture the soon-to-be-dropped name BEFORE the save and surface it in
  // both the SR announcement and the visual toast so the user knows.
  const submitSavePreset = useCallback(async () => {
    if (savingPreset || !authUser) return;
    const trimmed = presetNameDraft.trim();
    if (trimmed.length === 0) return;
    setSavingPreset(true);
    try {
      const existing = await loadPresets(authUser.id);
      // If we're at the cap, addPreset will drop existing[0] (oldest).
      // Capture its name now so we can name it in the success message.
      const droppedName =
        existing.length >= FILTER_PRESETS_MAX ? (existing[0]?.name ?? null) : null;
      const next = addPreset(existing, {
        name: trimmed,
        categories: Array.from(activeCategories),
        minSeverity,
        statusFilter: Array.from(activeStatuses),
      });
      await savePresets(authUser.id, next);
      if (!mountedRef.current) return;
      setPresetNameModalOpen(false);
      setPresetNameDraft('');
      // F56 (re-sweep): the eviction was announced to screen readers only —
      // sighted users lost their oldest preset silently. Mirror it visibly.
      // The native Alert announces itself, so only the no-eviction path needs
      // the explicit SR announcement (avoids a double announcement — second
      // sweep F65).
      if (droppedName) {
        notify(
          'Preset saved',
          `"${trimmed}" was saved. You were at the ${FILTER_PRESETS_MAX}-preset limit, so the oldest preset "${droppedName}" was removed.`,
        );
      } else {
        AccessibilityInfo.announceForAccessibility(`Saved preset: ${trimmed}`);
      }
    } catch (e) {
      Alert.alert("Couldn't save preset", errorMessage(e));
    } finally {
      if (mountedRef.current) setSavingPreset(false);
    }
  }, [activeCategories, activeStatuses, authUser, minSeverity, presetNameDraft, savingPreset]);

  // Apply a chosen preset's filter triple to the live Map filters and
  // close the picker. Categories and statuses are stored as plain strings
  // in the preset (FilterPreset is intentionally framework-agnostic).
  //
  // Quinn flagged the previous `as FlagCategory[]` cast as unsafe — if a
  // preset was saved when a category existed and we later renamed/removed
  // that category from the enum, the cast would let a stale string through
  // and the map filter would silently filter to nothing useful. We now
  // intersect against CATEGORY_ORDER (the live source of truth) and drop
  // anything stale. If any were dropped, we mention it in the SR announce
  // so the user knows their filter isn't quite what they saved.
  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    const validCategorySet = new Set<string>(CATEGORY_ORDER);
    const filteredCategories = preset.categories.filter((c) =>
      validCategorySet.has(c),
    ) as FlagCategory[];
    const droppedCategoryCount = preset.categories.length - filteredCategories.length;

    setActiveCategories(new Set<FlagCategory>(filteredCategories));
    setMinSeverity(preset.minSeverity as FlagSeverity);
    setActiveStatuses(new Set(preset.statusFilter as FlagStatus[]));
    setPresetsModalOpen(false);
    AccessibilityInfo.announceForAccessibility(
      droppedCategoryCount > 0
        ? `Applied preset: ${preset.name}. ${droppedCategoryCount} obsolete categor${droppedCategoryCount === 1 ? 'y' : 'ies'} ignored.`
        : `Applied preset: ${preset.name}`,
    );
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
      maxDistanceKm,
    });
  }, [activeCategories, minSeverity, activeStatuses, maxDistanceKm, filtersHydrated]);

  // Distance is only effective when we know where the user is — otherwise
  // the filter would silently hide every flag. Track this in a derived
  // flag so the chip row + filteredFlags + filtersActive agree.
  const distanceFilterEffective = maxDistanceKm !== null && location !== null;

  const filtersActive =
    activeCategories.size > 0 ||
    minSeverity > 1 ||
    statusFilterActive ||
    distanceFilterEffective ||
    activeDisabilityTags.size > 0;

  // Category quick-cycle button derived state — computed once per render
  // so the JSX stays readable. catCycleActive drives the filled-blue style;
  const catCycleActiveCat: FlagCategory | null =
    activeCategories.size === 1 ? (([...activeCategories] as FlagCategory[])[0] ?? null) : null;
  const catCycleActive = catCycleActiveCat !== null;

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
    return flags.filter((f) => {
      if (activeCategories.size > 0 && !activeCategories.has(f.category)) {
        return false;
      }
      if (f.severity < minSeverity) return false;
      // Disability ("who does this affect?") filter — pure client-side match
      // on the flag's context_tags. matchesDisabilityFilter returns true when
      // no tags are selected, so this is a no-op until the user picks one.
      if (!matchesDisabilityFilter(f.context_tags, [...activeDisabilityTags])) {
        return false;
      }
      // Distance filter — only applied when we actually know where the user
      // is (see distanceFilterEffective). Status filtering already happens
      // server-side via setStatuses, so we don't repeat it here.
      if (distanceFilterEffective && maxDistanceKm !== null && location) {
        const km = haversineKm(
          { lat: location.lat, lng: location.lng },
          { lat: f.lat, lng: f.lng },
        );
        if (km > maxDistanceKm) return false;
      }
      return true;
    });
  }, [
    flags,
    activeCategories,
    minSeverity,
    filtersActive,
    activeDisabilityTags,
    distanceFilterEffective,
    maxDistanceKm,
    location,
  ]);

  // M3: marker list for the map = filtered flags + the deep-linked flag (if
  // any) appended via withFocusFlag. Only <PlatformMap> consumes this —
  // heatCells, the count pill, and the empty-state card stay driven by
  // filteredFlags so the focused flag doesn't skew counts or aggregates.
  const mapFlags = useMemo(
    () => withFocusFlag(filteredFlags, deepLinkFlag),
    [filteredFlags, deepLinkFlag],
  );

  // Viewport filter counts (UX #1): tally how many of the currently-loaded
  // flags fall in each category, so the category chips can show a live count.
  // Pure client-side aggregate over the already-fetched `flags` array — no new
  // fetch. Counts ALL loaded flags (not filteredFlags) so each chip shows what
  // selecting it would surface, independent of the other active axes.
  const categoryCounts = useMemo(() => {
    const counts = {} as Record<FlagCategory, number>;
    for (const c of CATEGORY_ORDER) counts[c] = 0;
    for (const f of flags) {
      if (f.category in counts) counts[f.category] += 1;
    }
    return counts;
  }, [flags]);

  // Heat-cell aggregation — buckets the currently-visible flag set onto
  // the grid and drops anything below the privacy floor (k>=3). Memoised
  // so a parent re-render that doesn't touch flags/toggle doesn't redo
  // the pass. Skipped entirely when the toggle is off so the layer has
  // zero cost on the default-off path.
  const heatCells = useMemo(() => {
    if (!heatmapEnabled) return [];
    return bucketFlagsToCells(filteredFlags);
  }, [heatmapEnabled, filteredFlags]);

  // Announce the empty-results state to iOS screen readers when it appears
  // (Android picks it up via the alert's accessibilityLiveRegion). Only
  // fires on transitions into "0 results" — not on every re-render while
  // empty — so a user who's already heard it doesn't get re-spoken.
  const showEmptyCard = filtersActive && !loadingFlags && !loadError && filteredFlags.length === 0;
  const previouslyEmptyRef = useRef(false);
  useEffect(() => {
    if (showEmptyCard && !previouslyEmptyRef.current) {
      AccessibilityInfo.announceForAccessibility(
        'No flags match your active filters. Try clearing one, or reset them all.',
      );
    }
    previouslyEmptyRef.current = showEmptyCard;
  }, [showEmptyCard]);

  // Smart empty-state recovery (UX overhaul #2): when filters hide everything,
  // offer a one-tap clear for EACH active filter axis — not just a blunt
  // "reset all" — so the user can widen exactly the constraint hiding results.
  // Pure presentation: each chip flips one existing filter state setter.
  const emptyResetChips = useMemo(() => {
    if (!showEmptyCard) return [] as { key: string; label: string; onPress: () => void }[];
    const chips: { key: string; label: string; onPress: () => void }[] = [];
    if (activeCategories.size > 0)
      chips.push({ key: 'cat', label: 'All categories', onPress: () => setActiveCategories(new Set()) });
    if (minSeverity > 1)
      chips.push({ key: 'sev', label: 'Any severity', onPress: () => setMinSeverity(1) });
    if (maxDistanceKm !== null)
      chips.push({ key: 'dist', label: 'Any distance', onPress: () => setMaxDistanceKm(null) });
    if (activeDisabilityTags.size > 0)
      chips.push({
        key: 'dis',
        label: 'All access needs',
        onPress: () => setActiveDisabilityTags(new Set()),
      });
    return chips;
  }, [showEmptyCard, activeCategories, minSeverity, maxDistanceKm, activeDisabilityTags]);

  const requestLocation = useCallback(async () => {
    if (mountedRef.current) {
      setLocating(true);
      // WCAG 4.1.3: announce the transient "finding location" state so
      // screen-reader users hear it without having to discover the spinner.
      AccessibilityInfo.announceForAccessibility('Finding your location…');
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) {
          setPermissionDenied(true);
          // WCAG 4.1.3: permission-denied is a status change not conveyed
          // by focus or role; announce it explicitly.
          AccessibilityInfo.announceForAccessibility(
            'Location access is off. Turn it on in your device Settings to report barriers near you.',
          );
        }
        return;
      }
      if (mountedRef.current) setPermissionDenied(false);
      // Battery: reuse a cached fix up to 30s old before powering the GPS for a
      // fresh lock on every recenter/initial-locate. 30s is recent enough to
      // center the map accurately; getLastKnownPositionAsync returns null when
      // no recent fix exists, so we fall back to a live read.
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 30_000 })) ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));
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
        Alert.alert("Couldn't find your location", errorMessage(e));
      }
    } finally {
      if (mountedRef.current) setLocating(false);
    }
  }, []);

  // Initial location fetch; runs once. Only fetches if the OS permission is
  // already granted — the first-time prompt is deferred to the onboarding flow
  // (OnboardingCards card 4). The user-facing locate button still calls
  // requestLocation() directly and will trigger the OS prompt if needed.
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') requestLocation();
    });
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
    // Only revalidate if the flag list is actually stale. Tapping a Tasks card
    // to focus a flag we already have shouldn't trigger a full network re-fetch
    // (realtime + the freshness window keep the list current). Saves a
    // round-trip — and the radio/battery cost — on every card tap.
    void refreshFlagsIfStale();
    return () => clearTimeout(t);
  }, [route.params?.focusFlag, route.params?.ts, refreshFlagsIfStale]);

  // Phase 7a: Home's "Report" pill navigates here with openReport:true so the
  // report sheet opens on arrival. Clear the param right away (mirroring the L9
  // flagId reset) so it doesn't re-fire on a later re-focus of this route.
  useEffect(() => {
    if (!route.params?.openReport) return;
    setReportOpen(true);
    navigation.setParams({ openReport: undefined });
  }, [route.params?.openReport, navigation]);

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
    // A new flagId is arriving — drop any previous deep-link marker so a
    // stale flag from an earlier link can't linger if this fetch fails.
    // (The early return above means flagId → undefined does NOT clear it.)
    setDeepLinkFlag(null);
    // L9: once this link is handled (callout shown, id unknown, or fetch
    // failed), reset the param. With flagId stuck at the old value,
    // re-tapping the SAME share link navigated with identical params, this
    // effect never re-ran, and the tap was a silent no-op. Clearing to
    // undefined re-runs the effect exactly once more, which early-returns
    // above WITHOUT touching deepLinkFlag — the M3 marker persists. Skipped
    // when cancelled: a newer flagId owns the param by then.
    const clearFlagIdParam = () => {
      if (!cancelled) navigation.setParams({ flagId: undefined });
    };
    (async () => {
      try {
        const flag = await fetchFlagById(flagId);
        if (cancelled) return;
        if (!flag) {
          // Unknown / deleted id — leave the map as-is, but free the param
          // so the next tap of any link (including this one) re-fires.
          clearFlagIdParam();
          return;
        }
        // M3: keep the fetched row so withFocusFlag can render its marker
        // even when the flag is outside the loaded page / active filters.
        setDeepLinkFlag(flag);
        setFocusedFlagId(flag.id);
        mapRef.current?.animateTo({
          latitude: flag.lat,
          longitude: flag.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        setTimeout(() => {
          if (cancelled) return;
          mapRef.current?.showCallout(flag.id);
          clearFlagIdParam();
        }, 700);
      } catch {
        // Swallow — deep-link arrivals shouldn't ever surface an error
        // dialog. The user just sees the Map open as usual (but the param
        // is freed so a retry tap actually retries).
        clearFlagIdParam();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params?.flagId, navigation]);

  // Memoized so the React.memo on PlatformMap can actually skip re-renders
  // when MapScreen re-renders for reasons unrelated to the map's seed region
  // (filter panel toggles, modal opens, name-draft text input, etc.).
  // Without memoization this object identity changes every render, defeating
  // shallow prop equality.
  const initialRegion: PlatformMapRegion = useMemo(
    () =>
      location
        ? {
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
        : DEFAULT_REGION,
    [location],
  );

  // Keep the viewport ref in sync with the resolved initial region. This fires
  // once when `location` becomes non-null, giving the gate an accurate starting
  // region rather than the fallback DEFAULT_REGION.
  useEffect(() => {
    currentRegionRef.current = initialRegion;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Long-press anywhere on the map → confirm prompt → open the report
  // modal with that coord pre-filled. The confirm step matters: a
  // long-press is easy to trigger accidentally while panning, and we
  // don't want a modal popping over the user mid-scroll. Pinned to lat/lng
  // rounded to 5 decimals (~1 m precision) so the prompt copy fits in the
  // alert title without scrolling.
  //
  // Web caveat: Alert.alert is a no-op shim on react-native-web (see
  // node_modules/react-native-web/src/exports/Alert/index.js), so on the
  // web build the confirm prompt would never appear and the feature would
  // silently do nothing. On web we skip the confirm and drop the pin
  // directly — right-click intent on desktop is unambiguous, and the
  // accidental-trigger concern (panning) doesn't apply since web uses
  // right-click rather than a long-press gesture.
  const handleMapLongPress = useCallback((coord: { lat: number; lng: number }) => {
    // Jordan Condition 2: guests cannot create reports.
    if (!authUser) return;
    if (Platform.OS === 'web') {
      setDropLocation(coord);
      setReportOpen(true);
      return;
    }
    const latStr = coord.lat.toFixed(5);
    const lngStr = coord.lng.toFixed(5);
    Alert.alert('Report a barrier here?', `Place a new flag at ${latStr}, ${lngStr}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report here',
        onPress: () => {
          setDropLocation(coord);
          setReportOpen(true);
        },
      },
    ]);
  }, [authUser]);

  return (
    <View style={styles.container}>
      <PlatformMap
        ref={mapRef}
        initialRegion={initialRegion}
        flags={mapFlags}
        focusedFlagId={focusedFlagId}
        showsUserLocation
        reducedMotion={reducedMotion}
        onLongPressMap={handleMapLongPress}
        heatCells={heatCells}
        heatmapMode={HEATMAP_MODE}
      />

      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topRow}>
          {/* WCAG 4.1.3: live region ensures AT announces when the count
              changes after a filter toggle (e.g. "12 of 45 shown"). Using
              'polite' so it doesn't interrupt mid-sentence. */}
          <View style={styles.statusPill} accessibilityLiveRegion="polite">
            <AppText variant="label" style={styles.statusText}>
              {loadingFlags
                ? 'Loading flags…'
                : filtersActive
                  ? `${filteredFlags.length} of ${flags.length} shown`
                  : `${flags.length} flag${flags.length === 1 ? '' : 's'} nearby`}
            </AppText>
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
              <Search size={19} color={color.brand} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={() => setLegendOpen(true)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Map legend"
              accessibilityHint="Opens a guide explaining flag categories and severity"
            >
              <HelpCircle size={19} color={color.brand} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={() => setFiltersOpen((v) => !v)}
              style={[styles.actionBtn, (filtersOpen || filtersActive) && styles.actionBtnActive]}
              accessibilityRole="button"
              accessibilityLabel="Toggle filters"
              accessibilityState={{ expanded: filtersOpen }}
            >
              <SlidersHorizontal
                size={19}
                color={filtersOpen || filtersActive ? color.textOnBrand : color.brand}
                strokeWidth={2.2}
              />
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
              <AppText
                variant="label"
                style={[
                  styles.iconText,
                  styles.sevQuickText,
                  minSeverity > 1 && styles.iconTextActive,
                ]}
              >
                {minSeverity}+
              </AppText>
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={cycleCategory}
              style={[
                styles.actionBtn,
                styles.catQuickBtn,
                catCycleActive && styles.actionBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                catCycleActive && catCycleActiveCat !== null
                  ? `Category filter: ${CATEGORY_LABELS[catCycleActiveCat]} only`
                  : 'Category filter: all categories'
              }
              accessibilityHint="Tap to cycle through category filters"
            >
              {catCycleActive && catCycleActiveCat !== null ? (
                <CategoryIcon
                  category={catCycleActiveCat}
                  size={19}
                  color={color.textOnBrand}
                  decorative
                />
              ) : (
                <Shapes size={19} color={color.brand} strokeWidth={2.2} />
              )}
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={() => { refreshFlags().catch(() => {}); }}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Refresh flags"
            >
              <RotateCw size={19} color={color.brand} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <Pressable
              onPress={requestLocation}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Recenter on me"
            >
              <LocateFixed size={19} color={color.brand} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        {/* Offline notice — parity with TasksScreen. The map still shows the
            last cached flags; this tells the user why they may be stale. */}
        {isOfflineCache && (
          <View
            style={styles.offlineBanner}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel="Showing saved offline data. Connect to the internet to refresh the map."
          >
            <WifiOff size={16} color={color.warningFg} strokeWidth={2} />
            <AppText variant="body" style={styles.offlineBannerText}>
              Showing saved data — connect for the latest
            </AppText>
          </View>
        )}

        {/* Saved Places chip row — shown only when signed in. Renders
            quick-jump chips for each saved place plus a trailing "★ +"
            chip that opens the manage modal (and acts as the first-add
            affordance for users with no places yet). */}
        {authUser && (
          // QA A4: dropped the wrapping accessibilityLabel — without
          // accessible={true} it was being ignored anyway, and each
          // chip's own a11yLabel already describes what tapping does.
          <View style={styles.placesRow}>
            {savedPlaces.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => {
                  mapRef.current?.animateTo({
                    latitude: place.lat,
                    longitude: place.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                }}
                style={({ pressed }) => [styles.placeChip, pressed && styles.placeChipPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Jump map to ${place.name}`}
              >
                <MapPin size={14} color={color.brand} strokeWidth={2.2} />
                <AppText variant="label" style={styles.placeChipText} numberOfLines={1}>
                  {place.name}
                </AppText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setPlacesOpen(true)}
              style={({ pressed }) => [
                styles.placeChip,
                styles.placeChipManage,
                pressed && styles.placeChipPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={savedPlaces.length === 0 ? 'Save a place' : 'Manage saved places'}
              accessibilityHint="Opens the saved places list to add, rename, or remove"
            >
              <Star
                size={16}
                color={color.brand}
                strokeWidth={2.2}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <AppText variant="label" style={styles.placeChipText}>
                {savedPlaces.length === 0 ? 'Save a place' : 'Manage'}
              </AppText>
            </Pressable>
          </View>
        )}

        {filtersOpen && (
          <GlassSurface style={styles.filterPanel} borderRadius={radius.lg}>
            <View style={styles.filterHeaderRow}>
              <Pressable
                onPress={() => setPanelCollapsed((v) => !v)}
                hitSlop={8}
                style={styles.filterTitleRow}
                accessibilityRole="button"
                accessibilityLabel={
                  panelCollapsed ? 'Expand filter panel' : 'Collapse filter panel'
                }
                accessibilityHint={
                  panelCollapsed
                    ? 'Shows saved filters, categories, severity, and status'
                    : 'Hides the filter sections, leaving just the header'
                }
                accessibilityState={{ expanded: !panelCollapsed }}
              >
                <AppText variant="heading" style={styles.filterTitle}>Filter flags</AppText>
                {panelCollapsed ? (
                  <ChevronRight size={16} color={color.brand} strokeWidth={2.4} accessibilityElementsHidden />
                ) : (
                  <ChevronDown size={16} color={color.brand} strokeWidth={2.4} accessibilityElementsHidden />
                )}
              </Pressable>
              {filtersActive && (
                <Pressable
                  onPress={clearFilters}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <AppText variant="label" style={styles.clearLink}>Clear</AppText>
                </Pressable>
              )}
            </View>

            {!panelCollapsed && (
              <>
                <AppText variant="heading" style={styles.filterSubLabel}>Saved</AppText>
                {savedSets.length === 0 ? (
                  <View style={styles.savedEmpty}>
                    <AppText variant="body" style={styles.savedEmptyText}>
                      No saved filters yet. Save your current view to switch back to it quickly.
                    </AppText>
                    <Pressable
                      onPress={openSaveModal}
                      style={styles.savedSaveBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Save current filter as a named set"
                      accessibilityHint="Opens a prompt to name the current filter combination"
                    >
                      <AppText variant="label" style={styles.savedSaveBtnText}>Save current filter</AppText>
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
                          style={[styles.filterPill, isSelected && styles.filterPillActive]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isDefault
                              ? `${set.name}, default filter set, tap to apply`
                              : `${set.name}, tap to apply, long press for options`
                          }
                          accessibilityHint="Sets the map filter to this saved combination. Long press for options including make default and delete."
                          accessibilityState={{ selected: isSelected }}
                        >
                          <AppText
                            variant="label"
                            style={[
                              styles.filterPillText,
                              isSelected && styles.filterPillTextActive,
                            ]}
                          >
                            {/* Star is decorative — the "default on launch"
                            wording is carried by accessibilityLabel above
                            so screen readers don't read out a glyph.
                            Hidden from the AT node tree entirely. */}
                            {isDefault && (
                              <Star
                                size={14}
                                color={color.brand}
                                strokeWidth={2.2}
                                accessibilityElementsHidden
                                importantForAccessibility="no-hide-descendants"
                              />
                            )}
                            {isDefault ? ' ' : null}
                            {set.name}
                          </AppText>
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
                        <AppText variant="label" style={styles.savedAddPillText}>+ Save current</AppText>
                      </Pressable>
                    )}
                  </ScrollView>
                )}

                <AppText variant="heading" style={styles.filterSubLabel}>Categories</AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {CATEGORY_ORDER.map((c) => {
                    const active = activeCategories.has(c);
                    const count = categoryCounts[c];
                    return (
                      <Pressable
                        key={c}
                        onPress={() => toggleCategory(c)}
                        style={[styles.filterPill, active && styles.filterPillActive]}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by ${CATEGORY_LABELS[c]}, ${count} flag${count === 1 ? '' : 's'}`}
                        accessibilityState={{ selected: active }}
                      >
                        <View style={styles.filterPillRow}>
                          <AppText
                            variant="label"
                            style={[styles.filterPillText, active && styles.filterPillTextActive]}
                          >
                            {CATEGORY_LABELS[c]}
                          </AppText>
                          <AppText
                            variant="label"
                            style={[styles.filterPillCount, active && styles.filterPillTextActive]}
                          >
                            {count}
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <AppText variant="heading" style={styles.filterSubLabel}>Minimum severity</AppText>
                <View style={styles.filterRow}>
                  {SEVERITY_ORDER.map((s) => {
                    const active = s === minSeverity;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setMinSeverity(s)}
                        style={[styles.sevPill, active && { backgroundColor: severityColor(s) }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Minimum severity ${s}`}
                        accessibilityState={{ selected: active }}
                      >
                        <AppText variant="label" style={[styles.sevPillText, active && styles.sevPillTextActive]}>
                          {s}+
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Heat-map toggle — sits above Status because it's a render
                axis (what gets drawn) not a fetch axis (what gets fetched).
                Hidden under panelCollapsed alongside the rest of the panel.
                Off by default per Dani's design compile. */}
                <AppText variant="heading" style={styles.filterSubLabel}>Layers</AppText>
                <View style={styles.filterRow}>
                  <Pressable
                    onPress={() => setHeatmapEnabled((v) => !v)}
                    style={[styles.filterPill, heatmapEnabled && styles.filterPillActive]}
                    accessibilityRole="switch"
                    accessibilityLabel="Show neighbourhood heat map"
                    accessibilityState={{ checked: heatmapEnabled }}
                    accessibilityHint={`Overlays a coloured grid that summarises severity across neighbourhoods. Only areas with at least ${DEFAULT_K_FLOOR} reports are shown.`}
                  >
                    <AppText
                      variant="label"
                      style={[styles.filterPillText, heatmapEnabled && styles.filterPillTextActive]}
                    >
                      {heatmapEnabled ? 'Heat map · On' : 'Heat map · Off'}
                    </AppText>
                  </Pressable>
                </View>
                {heatmapEnabled && (
                  <AppText variant="body" style={styles.statusHint}>
                    Heat zones only appear where at least {DEFAULT_K_FLOOR} flags have been
                    reported. Colour shows mean severity (1–5); the legend explains the full scale.
                  </AppText>
                )}

                <AppText variant="heading" style={styles.filterSubLabel}>Status</AppText>
                <View style={styles.filterRow}>
                  {STATUS_ORDER.map((s) => {
                    const active = activeStatuses.has(s);
                    return (
                      <Pressable
                        key={s}
                        onPress={() => toggleStatus(s)}
                        style={[styles.filterPill, active && styles.filterPillActive]}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by ${STATUS_LABELS[s]}`}
                        accessibilityState={{ selected: active }}
                      >
                        <AppText
                          variant="label"
                          style={[styles.filterPillText, active && styles.filterPillTextActive]}
                        >
                          {STATUS_LABELS[s]}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                {activeStatuses.size === 0 && (
                  <AppText variant="body" style={styles.statusHint}>Pick at least one status — otherwise nothing will show up.</AppText>
                )}

                {/* "Who does this affect?" — disability filter (Sprint 3). A
                    pure client-side filter on each flag's context_tags: pick
                    one or more access needs and the map narrows to barriers
                    tagged for any of them (OR match). Empty = show everything,
                    so legacy/untagged flags are only hidden once the user
                    actively narrows. Same pill pattern as the other axes. */}
                <AppText variant="heading" style={styles.filterSubLabel}>Who does this affect?</AppText>
                <View style={styles.filterRow}>
                  {DISABILITY_TAGS.map((tag) => {
                    const active = activeDisabilityTags.has(tag);
                    const label = DISABILITY_TAG_LABELS[tag];
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleDisabilityTag(tag)}
                        style={[styles.filterPill, active && styles.filterPillActive]}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by barriers affecting: ${label}`}
                        accessibilityState={{ selected: active }}
                      >
                        <AppText
                          variant="label"
                          style={[styles.filterPillText, active && styles.filterPillTextActive]}
                        >
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                {activeDisabilityTags.size > 0 && (
                  <AppText variant="body" style={styles.statusHint}>
                    Showing only flags tagged for the selected access need
                    {activeDisabilityTags.size > 1 ? 's' : ''}. Untagged flags are hidden.
                  </AppText>
                )}

                {/* Distance — radius from the user's current location. Chips
                follow the same pill pattern as Status/Category; "Off"
                renders selected when no radius is active. When the user
                has no known location (permission denied / still loading)
                we still render the chips but show a hint underneath
                explaining the filter is inactive until location is known.
                We rely on `location` (the existing requestLocation state),
                not a separate hook, to stay consistent with the rest of
                the screen.

                Saved sets/presets intentionally do NOT carry distance
                yet — saved sets are device-wide and presets are about
                category/severity/status combinations; mixing in a radius
                that depends on the user's current GPS would make a
                "saved view" portable in a way it isn't today. We can
                revisit when location-aware sets become a clear need. */}
                <AppText variant="heading" style={styles.filterSubLabel}>Distance</AppText>
                <View style={styles.filterRow}>
                  {DISTANCE_OPTIONS.map((opt) => {
                    const active = opt === maxDistanceKm;
                    const label =
                      opt === null ? 'Off' : opt < 1 ? `${Math.round(opt * 1000)} m` : `${opt} km`;
                    const a11yLabel =
                      opt === null
                        ? 'Distance filter off'
                        : opt < 1
                          ? `Within ${Math.round(opt * 1000)} meters`
                          : `Within ${opt} kilometer${opt === 1 ? '' : 's'}`;
                    return (
                      <Pressable
                        key={opt === null ? 'off' : String(opt)}
                        onPress={() => setMaxDistanceKm(opt)}
                        style={[styles.filterPill, active && styles.filterPillActive]}
                        accessibilityRole="button"
                        accessibilityLabel={a11yLabel}
                        accessibilityState={{ selected: active }}
                      >
                        <AppText
                          variant="label"
                          style={[styles.filterPillText, active && styles.filterPillTextActive]}
                        >
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                {maxDistanceKm !== null && !location && (
                  <AppText variant="body" style={styles.statusHint} accessibilityLiveRegion="polite">
                    Distance filter needs your location to work. It&apos;ll kick in once you share it.
                  </AppText>
                )}

                {/* Per-user presets — distinct from the device-wide Saved
                chips above. Hidden when signed-out because presets are
                keyed by user. */}
                {authUser && (
                  <>
                    <AppText variant="heading" style={styles.filterSubLabel}>Presets</AppText>
                    <View style={styles.presetRow}>
                      <Pressable
                        onPress={openPresetSaveModal}
                        style={({ pressed }) => [
                          styles.presetBtn,
                          pressed && styles.presetBtnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Save current filters as a preset"
                        accessibilityHint={`Names and saves your current category, severity, and status filters. Stored per account, up to ${FILTER_PRESETS_MAX} presets.`}
                      >
                        <View style={styles.iconLabelRow}>
                          <Plus size={15} color={color.textOnBrand} strokeWidth={2.6} />
                          <AppText variant="label" style={styles.presetBtnText}>Save as preset</AppText>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => setPresetsModalOpen(true)}
                        style={({ pressed }) => [
                          styles.presetBtn,
                          styles.presetBtnSecondary,
                          pressed && styles.presetBtnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Load a saved preset"
                        accessibilityHint="Opens your saved filter presets so you can apply one"
                      >
                        <AppText variant="label" style={styles.presetBtnSecondaryText}>Load preset…</AppText>
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            )}
          </GlassSurface>
        )}

        {loadError && (
          <Pressable
            onPress={() => { refreshFlags().catch(() => {}); }}
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
              <ActivityIndicator color={color.textOnBrand} />
            ) : (
              <AlertTriangle size={18} color={color.textOnBrand} strokeWidth={2.2} />
            )}
            <AppText variant="body" style={styles.errorBannerText} numberOfLines={2}>
              {loadingFlags ? 'Retrying…' : loadError}
            </AppText>
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
            accessibilityLabel="No flags match your active filters. Try clearing one, or reset them all."
            accessibilityLiveRegion="polite"
          >
            <Search size={26} color={color.textSubtle} strokeWidth={2} />
            <AppText variant="heading" style={styles.emptyCardTitle}>Nothing here right now</AppText>
            <AppText variant="body" style={styles.emptyCardBody}>
              Your filters are hiding everything. Clear just the one in the way, or reset them all.
            </AppText>
            {emptyResetChips.length > 0 && (
              <View style={styles.emptyQuickRow}>
                {emptyResetChips.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={c.onPress}
                    style={({ pressed }) => [styles.emptyQuickChip, pressed && styles.emptyCardBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={c.label}
                    accessibilityHint="Clears this one filter so more flags show"
                  >
                    <AppText variant="label" style={styles.emptyQuickChipText}>{c.label}</AppText>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable
              onPress={clearFilters}
              style={({ pressed }) => [styles.emptyCardBtn, pressed && styles.emptyCardBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Reset all filters"
              accessibilityHint="Clears categories, severity, status, distance, and access-need filters"
            >
              <AppText variant="label" style={styles.emptyCardBtnText}>Reset all filters</AppText>
            </Pressable>
          </View>
        )}

        {/* WCAG 4.1.3: accessibilityLiveRegion covers Android TalkBack.
            iOS VoiceOver is already handled by the
            announceForAccessibility call in requestLocation(). */}
        {locating && !location && (
          <GlassSurface
            style={styles.bannerLocating}
            borderRadius={radius.md}
            // Map overlays are the always-light DESIGN.md exception — pin the
            // glass + its Reduce-Transparency fallback to the light tokens so
            // the neutral "finding your location" banner reads the same in any
            // palette. (Semantic alert banners below stay solid, not frosted.)
            tint="light"
            tintColor={color.overlayGlass}
            solidColor={color.overlaySoft}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <AppText variant="body" style={styles.bannerText}>Finding your location…</AppText>
          </GlassSurface>
        )}

        {permissionDenied && (
          <View
            style={styles.banner}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <AppText variant="body" style={styles.bannerText}>
              Location access is off. Turn it on in your device Settings to report barriers near you.
            </AppText>
          </View>
        )}

        {/* Jordan Art. 7 disclaimer — shown whenever the heat layer is active.
            Must be visible (not buried in the filter panel) per the conditional
            pass: "Heat zones only appear where at least 3 flags have been
            reported. Based on community reports — coverage varies by area." */}
        {heatmapEnabled && (
          <View
            style={styles.heatmapDisclaimer}
            accessible
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            <AppText variant="body" style={styles.heatmapDisclaimerText}>
              Heat zones only appear where at least {DEFAULT_K_FLOOR} flags have been reported.
              Based on community reports — coverage varies by area.
            </AppText>
          </View>
        )}

        {/* Bottom bar: legend (left, conditional) + FABs (right) */}
        <View style={styles.bottomBar}>
          {heatmapEnabled ? <HeatmapLegend /> : <View />}
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
              <View style={styles.fabSecondaryRow}>
                <List size={16} color={color.brand} strokeWidth={2.2} />
                <AppText variant="label" style={styles.fabSecondaryText}>List</AppText>
              </View>
            </Pressable>
            {/* Jordan Condition 2: hide Report FAB for guest users.
                Guests can browse but not create reports. Hiding at render
                time avoids collecting location permission before surfacing
                the "you must sign in" gate — a privacy-adjacent UX issue
                Jordan flagged in the privacy gate report. */}
            {authUser && (
              <Pressable
                style={({ pressed }) => [
                  styles.fab,
                  !location && styles.fabDisabled,
                  pressed && styles.fabPressed,
                ]}
                onPress={() => {
                  // FIX C (Decision 6, Option A): the `location` state can be
                  // minutes old by the time the user taps Report. Kick off a
                  // fresh GPS read fire-and-forget — ReportFlagModal reads its
                  // `location` prop live at submit time, so the new fix lands
                  // mid-form and the report pins where the user is standing.
                  // Worst case (read fails / resolves late) the submit just
                  // uses today's cached coords. A drop pin overrides GPS, so
                  // skip the read when one is set.
                  if (!dropLocation) void requestLocation();
                  setReportOpen(true);
                }}
                disabled={!location}
                accessibilityRole="button"
                accessibilityLabel="Report a flag here"
                accessibilityHint={
                  location
                    ? 'Opens a form to report an accessibility issue at your current location'
                    : 'Dimmed until location is on. Use the recenter button to turn on location, then report a flag here.'
                }
                accessibilityState={{ disabled: !location }}
              >
                <View style={styles.iconLabelRow}>
                  <Plus size={16} color={color.textOnBrand} strokeWidth={2.6} />
                  <AppText variant="label" style={styles.fabText}>Report</AppText>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <ReportFlagModal
        visible={reportOpen}
        // Prefer the long-press drop location if the user dropped one;
        // otherwise fall back to the user's current GPS location for the
        // FAB-triggered "report at my location" flow.
        location={dropLocation ?? location}
        onClose={() => {
          setReportOpen(false);
          // Clear the drop pin on close so the next FAB-tap defaults back
          // to GPS. Without this, a long-press once would stick as the
          // implicit location forever.
          setDropLocation(null);
        }}
        onCreated={() => { refreshFlags().catch(() => {}); }}
      />

      <LegendModal visible={legendOpen} onClose={() => setLegendOpen(false)} />

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

      <SavedPlacesModal
        visible={placesOpen}
        currentLocation={location}
        onClose={() => {
          setPlacesOpen(false);
          // Belt-and-suspenders refresh on close in case any change
          // happened that didn't fire onListChanged (e.g., add failed
          // mid-flight). The cheaper case (immediate refresh on every
          // add/remove) is handled below via onListChanged.
          void refreshSavedPlaces();
        }}
        // QA E12: refresh the chip row the moment a place is added or
        // removed, so the row visible behind the modal backdrop reflects
        // reality without waiting for the modal to close.
        onListChanged={() => {
          void refreshSavedPlaces();
        }}
        onJumpToPlace={(place) => {
          // Tighter zoom (delta 0.01) than search results because the
          // user pinned this exact spot — they want street-level detail.
          mapRef.current?.animateTo({
            latitude: place.lat,
            longitude: place.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
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

      <FilterPresetsModal
        visible={presetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
        onApply={handleApplyPreset}
      />

      {/*
        Per-user "Save as preset" prompt. Mirrors the device-wide
        save-filter-set prompt below — same TextInput-in-a-Modal pattern
        for cross-platform parity (Alert.prompt is iOS-only).
      */}
      <Modal
        visible={presetNameModalOpen}
        animationType={reducedMotion ? 'none' : 'fade'}
        transparent
        onRequestClose={() => {
          if (!savingPreset) setPresetNameModalOpen(false);
        }}
      >
        <View style={styles.nameBackdrop}>
          <View style={styles.nameCard}>
            <AppText variant="heading" style={styles.nameTitle} accessibilityRole="header">
              Name this preset
            </AppText>
            <AppText variant="body" style={styles.nameHint}>
              Saves your current filters. Up to {FILTER_PRESETS_MAX} presets per account.
            </AppText>
            <TextInput
              value={presetNameDraft}
              onChangeText={setPresetNameDraft}
              placeholder="e.g. Morning commute"
              placeholderTextColor={color.textMuted}
              autoFocus
              autoCapitalize="sentences"
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={submitSavePreset}
              style={styles.nameInput}
              accessibilityLabel="Preset name"
              accessibilityHint="Required. Up to 60 characters."
            />
            <View style={styles.nameActions}>
              <Pressable
                onPress={() => {
                  if (savingPreset) return;
                  setPresetNameModalOpen(false);
                }}
                disabled={savingPreset}
                style={[styles.nameBtn, styles.nameBtnCancel]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                accessibilityState={{ disabled: savingPreset }}
              >
                <AppText variant="label" style={styles.nameBtnCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={submitSavePreset}
                disabled={savingPreset || presetNameDraft.trim().length === 0}
                style={[
                  styles.nameBtn,
                  styles.nameBtnSave,
                  (savingPreset || presetNameDraft.trim().length === 0) &&
                    styles.nameBtnSaveDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save preset"
                accessibilityState={{
                  busy: savingPreset,
                  disabled: savingPreset || presetNameDraft.trim().length === 0,
                }}
              >
                {savingPreset ? (
                  <ActivityIndicator color={color.textOnBrand} />
                ) : (
                  <AppText variant="label" style={styles.nameBtnSaveText}>Save</AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/*
        Cross-platform save-name prompt. We use a Modal + TextInput instead
        of Alert.prompt because Alert.prompt is iOS-only and the app runs
        on Android + web too. The modal mirrors ReportFlagModal's bottom-
        sheet pattern so the screen feels consistent.
      */}
      <Modal
        visible={nameModalOpen}
        animationType={reducedMotion ? 'none' : 'fade'}
        transparent
        onRequestClose={() => {
          if (!savingSet) setNameModalOpen(false);
        }}
      >
        <View style={styles.nameBackdrop}>
          <View style={styles.nameCard}>
            <AppText variant="heading" style={styles.nameTitle} accessibilityRole="header">Name this filter</AppText>
            <AppText variant="body" style={styles.nameHint}>You can save up to {MAX_FILTER_SETS} filter sets.</AppText>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="e.g. Downtown commute"
              placeholderTextColor={color.textMuted}
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
                <AppText variant="label" style={styles.nameBtnCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={submitSaveSet}
                disabled={savingSet || nameDraft.trim().length === 0}
                style={[
                  styles.nameBtn,
                  styles.nameBtnSave,
                  (savingSet || nameDraft.trim().length === 0) && styles.nameBtnSaveDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save filter set"
                accessibilityState={{
                  busy: savingSet,
                  disabled: savingSet || nameDraft.trim().length === 0,
                }}
              >
                {savingSet ? (
                  <ActivityIndicator color={color.textOnBrand} />
                ) : (
                  <AppText variant="label" style={styles.nameBtnSaveText}>Save</AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Offline data notice — warning tokens, distinct from the red error
    // banner. Mirrors the TasksScreen offline banner so both screens read the
    // same when showing cached data.
    offlineBanner: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      backgroundColor: color.warningBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      minHeight: 40,
    },
    offlineBannerText: {
      color: color.warningFg,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      flex: 1,
    },
    container: { flex: 1 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      padding: 16,
      justifyContent: 'space-between',
      zIndex: 10,
    },
    topRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
    // Saved Places chip row — slim secondary row beneath the action bar.
    // Wraps so a long list breaks to a second line rather than truncating.
    placesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    placeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: radius.circle,
      // 44pt is the AccessMap baseline touch target (Apple HIG + Android
      // a11y minimum + WCAG 2.5.5). Bumped from 36 per QA A1.
      minHeight: 44,
      maxWidth: 180,
      ...shadow.e1,
    },
    placeChipPressed: { backgroundColor: color.surfaceNeutral, opacity: 0.9 },
    // The trailing manage chip uses a tinted background so the affordance
    // reads visually distinct from the place chips.
    placeChipManage: { backgroundColor: color.brandSofter },
    placeChipGlyph: { fontSize: 14, color: color.brand },
    placeChipText: { fontSize: 13, fontWeight: '600', color: color.brandTextAlt },
    statusPill: {
      alignSelf: 'flex-start',
      backgroundColor: color.overlaySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.circle,
      ...shadow.e1,
    },
    statusText: { fontSize: 13, color: color.text, fontWeight: '600' },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.circle,
      backgroundColor: color.overlaySoft,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.e1,
    },
    iconText: { fontSize: 18, color: color.brand, fontWeight: '700' },
    iconBtnActive: { backgroundColor: color.brand },
    iconTextActive: { color: color.textOnBrand },
    // Quick-cycle severity button — slightly wider than the round icon buttons
    // to fit the "{n}+" label without crowding the glyph against the edges.
    sevQuickBtn: { width: 44 },
    sevQuickText: { fontSize: 14 },
    // Quick-cycle category button — same sizing/treatment as the severity
    // button; shows the category icon glyph or "⊕" for "all categories."
    catQuickBtn: { width: 44 },
    catQuickText: { fontSize: 15 },
    // Grouped action bar — wraps the icon buttons in one elevated white
    // surface with thin internal dividers so they read as a single
    // connected tool tray instead of four free-floating circles. Replaces
    // the cheap "scattered buttons" look the user called out.
    actionBar: {
      flexDirection: 'row',
      backgroundColor: color.overlay,
      borderRadius: radius.circle,
      paddingHorizontal: 4,
      paddingVertical: 2,
      alignItems: 'center',
      // Hairline edge so the white tray reads as a crisp object over any map tile.
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.borderSubtle,
      ...shadow.e2,
    },
    actionBtn: {
      minWidth: 44, // WCAG 2.5.5: was 36pt (below 44pt project standard)
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.circle,
    },
    actionBtnActive: { backgroundColor: color.brand },
    actionDivider: {
      width: 1,
      height: 18,
      backgroundColor: color.border,
    },
    filterPanel: {
      marginTop: spacing.sm,
      // Frosted-glass surface supplied by <GlassSurface> (translucent + blur with
      // an AA contrast floor); falls back to a solid fill under Reduce Transparency.
      // No backgroundColor here — GlassSurface owns the surface.
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.borderSubtle,
      ...shadow.e2,
    },
    filterHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    filterTitle: { fontSize: font.size.base, fontWeight: font.weight.bold, color: color.textStrong },
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
    filterChevron: { fontSize: font.size.xs, color: color.brand, fontWeight: font.weight.bold },
    clearLink: { fontSize: font.size.xs, color: color.brand, fontWeight: font.weight.semibold },
    filterSubLabel: {
      fontSize: font.size.caption,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.loose,
      marginTop: spacing.sm,
    },
    filterRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      minHeight: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterPillActive: { backgroundColor: color.brand },
    filterPillText: { fontSize: font.size.xs, color: color.text, fontWeight: font.weight.semibold },
    filterPillTextActive: { color: color.textOnBrand },
    // Viewport count badge inside each category chip (UX #1). Sits after the
    // label with a thin separator gap; muted so the label stays primary, but
    // turns textOnBrand (via filterPillTextActive) when the chip is selected.
    filterPillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    filterPillCount: {
      fontSize: font.size.caption,
      color: color.textMuted,
      fontWeight: font.weight.bold,
    },
    sevPill: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color.surfaceNeutral,
    },
    sevPillText: { fontSize: font.size.sm, color: color.text, fontWeight: font.weight.bold },
    sevPillTextActive: { color: color.textOnBrand },
    statusHint: { fontSize: font.size.caption, color: color.warningHint, marginTop: spacing.tight },
    banner: {
      alignSelf: 'center',
      backgroundColor: color.overlaySoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    // Frosted variant of `banner` for the NEUTRAL "Finding your location…" info
    // banner only. Identical layout, but no solid backgroundColor — <GlassSurface>
    // owns the surface (translucent + blur with an AA contrast floor; opaque
    // fallback under Reduce Transparency). The semantic alert banners
    // (permission / offline / error) keep their solid fills for urgency.
    bannerLocating: {
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    bannerText: { fontSize: font.size.sm, color: color.text },
    errorBanner: {
      marginTop: spacing.sm,
      backgroundColor: color.error,
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      minHeight: 44,
      ...shadow.e2,
    },
    errorBannerBusy: { opacity: 0.85 },
    errorBannerPressed: { opacity: 0.7 },
    errorBannerIcon: { color: color.textOnBrand, fontSize: font.size.xl, fontWeight: font.weight.bold },
    errorBannerText: { color: color.textOnBrand, fontSize: font.size.sm, fontWeight: font.weight.semibold, flex: 1 },
    emptyCard: {
      alignSelf: 'center',
      marginTop: 16,
      maxWidth: 320,
      backgroundColor: color.overlay,
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderRadius: radius.lg,
      gap: 8,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.borderSubtle,
      ...shadow.e2,
    },
    emptyCardIcon: { fontSize: font.size.xxl },
    emptyCardTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textAlign: 'center',
      letterSpacing: -0.1,
    },
    emptyCardBody: {
      fontSize: font.size.sm,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    emptyCardBtn: {
      marginTop: spacing.tight,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.circle,
      backgroundColor: color.brand,
      minHeight: 44,
      justifyContent: 'center',
    },
    emptyCardBtnPressed: { opacity: 0.8 },
    emptyCardBtnText: { color: color.textOnBrand, fontSize: font.size.base, fontWeight: font.weight.bold },
    // Smart empty-state recovery — per-axis "clear this one" chips above the
    // reset-all button. Neutral chips (not brand) so the brand reset stays the
    // visual anchor. Each is a ≥44pt target and wraps on narrow screens.
    emptyQuickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    emptyQuickChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      justifyContent: 'center',
    },
    emptyQuickChipText: { color: color.brandText, fontSize: font.size.sm, fontWeight: font.weight.semibold },
    // Jordan Art. 7 — heatmap active disclaimer. Floats just above the
    // bottom bar so it's visible whenever the heat layer is on, regardless
    // of whether the filter panel is open. Semi-transparent so it doesn't
    // fully obscure the map edge, muted font so it reads as informational
    // (not an error) and doesn't compete with the HeatmapLegend swatches.
    heatmapDisclaimer: {
      alignSelf: 'stretch',
      // WCAG 1.4.3: solid colours guarantee contrast on any map tile background.
      // rgba(0,0,0,0.55) + rgba(255,255,255,0.85) fell to ~2.5:1 on light OSM tiles.
      backgroundColor: '#1a1a1a',
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: 8,
    },
    heatmapDisclaimerText: {
      fontSize: font.size.caption,
      // textOnBrand (#fff) on forced dark surface (#1a1a1a) = 18.1:1 — WCAG AA pass.
      color: color.textOnBrand,
      lineHeight: 15,
      textAlign: 'center',
    },
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    fabColumn: {
      alignItems: 'flex-end',
      gap: 10,
    },
    fab: {
      backgroundColor: color.brand,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: radius.circle,
      ...shadow.e2,
      minHeight: 48,
      justifyContent: 'center',
    },
    fabSecondary: { backgroundColor: color.overlay },
    fabSecondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fabSecondaryText: { color: color.brand, fontWeight: '700', fontSize: 15 },
    // Shared icon+label row. Replaces two identical inline
    // `{ flexDirection:'row', alignItems:'center', gap:6 }` objects (Save-preset
    // button + Report FAB) that were re-allocated on every MapScreen render.
    iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fabDisabled: { opacity: 0.5 },
    fabPressed: { opacity: 0.8 },
    fabText: { color: color.textOnBrand, fontWeight: '700', fontSize: 15 },
    savedEmpty: { gap: 8, marginTop: 4 },
    savedEmptyText: { fontSize: 12, color: color.textMuted, lineHeight: 16 },
    savedSaveBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.circle,
      backgroundColor: color.brand,
      minHeight: 44,
      justifyContent: 'center',
    },
    savedSaveBtnText: { color: color.textOnBrand, fontSize: 12, fontWeight: '700' },
    savedAddPill: {
      backgroundColor: color.surface,
      borderWidth: 1,
      borderColor: color.brand,
      borderStyle: 'dashed',
    },
    savedAddPillText: { color: color.brand, fontSize: 12, fontWeight: '700' },
    // Per-user preset buttons — side-by-side pair beneath the Status row.
    // Primary (Save) is filled blue; secondary (Load) is outlined to keep
    // the primary action visually distinct without two competing fills.
    // Both clear 44pt to satisfy WCAG 2.5.5 / Apple HIG touch targets.
    presetRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    presetBtn: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: color.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetBtnPressed: { opacity: 0.85 },
    // 14pt bold qualifies as WCAG "large text" — 3:1 ratio applies, so
    // white-on-#1466E0 (~3.8:1) clears AA. At 13pt it failed the 4.5:1
    // small-text threshold.
    presetBtnText: { color: color.textOnBrand, fontWeight: '700', fontSize: 14 },
    presetBtnSecondary: {
      backgroundColor: color.surface,
      borderWidth: 1,
      borderColor: color.brand,
    },
    // Inverted variant (blue on white). Uses color.brandText (#1c4f99 ≈ 7.6:1)
    // instead of color.brand (#1466E0 ≈ 3.3:1) so it stays AA-safe even if the
    // font size ever drops below the 14pt-bold large-text threshold.
    presetBtnSecondaryText: { color: color.brandText, fontWeight: '700', fontSize: 14 },
    nameBackdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'center',
      padding: 20,
    },
    nameCard: {
      backgroundColor: color.surface,
      borderRadius: radius.xl,
      padding: 20,
      gap: 12,
    },
    nameTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.2,
    },
    nameHint: { fontSize: 12, color: color.textMuted },
    nameInput: {
      borderWidth: 1,
      borderColor: color.borderStrong,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      minHeight: 44,
      color: color.text,
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
    nameBtnCancel: { backgroundColor: color.surfaceNeutral },
    nameBtnCancelText: { color: color.text, fontWeight: '600', fontSize: 14 },
    nameBtnSave: { backgroundColor: color.brand },
    nameBtnSaveDisabled: { opacity: 0.5 },
    nameBtnSaveText: { color: color.textOnBrand, fontWeight: '700', fontSize: 14 },
  });
