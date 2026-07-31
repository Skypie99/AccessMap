import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { arrivalPermissionDenied, getCurrentPositionWithTimeout, initialLocationAction } from '@/lib/location';
import { failureBannerText, offlineBannerText } from '@/lib/copy';
import { announce } from '@/lib/announce';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { hydrateGlassMode, useGlassMode } from '@/lib/glassMode';
import { font, radius, severity, shadow, spacing } from '@/theme';
import { errorMessage } from '@/lib/errors';
import { clearLiveStatusMessage, setLiveStatus } from '@/lib/liveStatus';
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
  Minus,
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
import type { DetailAction } from '@/components/FlagDetailModal';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { PressableScale } from '@/components/ui/PressableScale';
import { HeaderActions } from '@/components/ui/HeaderActions';
import { OverflowFade } from '@/components/ui/OverflowFade';
import {
  computeOverflowHasMore,
  useHorizontalOverflowFade,
} from '@/hooks/useHorizontalOverflowFade';
import { useDrawer } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { useScreenReader, useReducedMotion, a11yToggle, decorativeProps, useSurfaceTrigger } from '@/lib/accessibility';
import LegendModal from './LegendModal';
import HeatmapLegend from '@/components/HeatmapLegend';
import NearbyFlagsModal from './NearbyFlagsModal';
import AddressSearchModal from '@/components/AddressSearchModal';
import SavedPlacesModal from '@/components/SavedPlacesModal';
import FilterPresetsModal from '@/components/FilterPresetsModal';
import { loadPlaces, type SavedPlace } from '@/lib/savedPlaces';
import { useAuth } from '@/lib/auth';
import type { GeocodeResult } from '@/lib/geocode';

// Code-split: the report bottom-sheet only mounts once the user taps the Report
// FAB. React.lazy moves its (large) code into a separate async web chunk; it's
// still always-mounted below (visible-prop controlled), so open/close behavior is
// unchanged — the chunk just loads on demand instead of sitting in the main
// bundle. (severityColor lives in @/lib/flags, not this module, so the split is
// clean.) Declared after the imports so eslint's import/first stays satisfied.
const ReportFlagModal = React.lazy(() => import('./ReportFlagModal'));

// S3 (trust instrumentation): the flag-detail sheet is now reachable from the
// map itself — the pin callout's "Open details" and, under a screen reader, the
// Nearby list. Same React.lazy split as Tasks/Profile (Metro dedups by module
// path, so all three share one async chunk). Always-mounted below, visible-prop
// controlled. Declared after the imports so eslint's import/first stays happy.
const FlagDetailModal = React.lazy(() => import('@/components/FlagDetailModal'));

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

// T7 (F4-03 / F5-03): the honest, non-accusing line for the UNDETERMINED
// no-location arrival — never-asked web guests (the default first run) and
// native "Not now" deferrers. Deliberately NOT "off": a never-asked user was
// never denied, so the S4 gate (see the arrival effect) forbids telling them
// access is off. The assertive DENIED banner keeps its own stronger wording.
// PROPOSED (BP13, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
const NO_LOCATION_HINT =
  "Location isn't on yet — showing the most recent flags, not ones near you.";

// T7 (F4-03 / F5-03): fit a region to the loaded flags for the honest no-location
// arrival — a TRUE frame instead of the hardcoded San-Francisco default, so a
// confident "Showing N flags" pill is visibly true. Bounds midpoint + a padded
// span with a sane floor; a lone flag gets a fixed sensible zoom; the empty case
// falls back to DEFAULT_REGION (also guarded at the call site). Presentation over
// already-fetched rows only — never a proximity query (Fork 1 stays Sky's).
function regionForFlags(rows: readonly { lat: number; lng: number }[]): PlatformMapRegion {
  const first = rows[0];
  if (!first) return DEFAULT_REGION; // empty → keep the default frame (noUncheckedIndexedAccess-safe)
  if (rows.length === 1) {
    return { latitude: first.lat, longitude: first.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 };
  }
  let minLat = first.lat;
  let maxLat = first.lat;
  let minLng = first.lng;
  let maxLng = first.lng;
  for (const r of rows) {
    if (r.lat < minLat) minLat = r.lat;
    if (r.lat > maxLat) maxLat = r.lat;
    if (r.lng < minLng) minLng = r.lng;
    if (r.lng > maxLng) maxLng = r.lng;
  }
  // ~40% breathing room so pins aren't flush to the edge; MIN_DELTA floors a tight
  // cluster so it isn't over-zoomed into a single street.
  const PAD = 1.4;
  const MIN_DELTA = 0.01;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PAD, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * PAD, MIN_DELTA),
  };
}

// Filter-panel height budget (G5). OVERLAY_PADDING mirrors styles.overlay's
// padding; PANEL_BRACKET_ALLOWANCE reserves room for the action bar above the
// panel and the FAB bottom bar below it. flexShrink on filterPanel corrects any
// imprecision, so these only need to be in the right ballpark.
const OVERLAY_PADDING = 16;
const PANEL_BRACKET_ALLOWANCE = 160;

// T1 (F2-01): the persistent top-chrome band that a pin callout must clear.
// MAP_HEADER_ROW_MARGIN_BOTTOM mirrors styles.mapHeaderRow.marginBottom (the
// gap between the two measured rows); CALLOUT_CHROME_MARGIN is the breathing
// room between the chrome's bottom edge and the callout's top edge.
const MAP_HEADER_ROW_MARGIN_BOTTOM = 10;
const CALLOUT_CHROME_MARGIN = 8;

// Pop a flag's callout: one immediate same-tick attempt, then retries ~150ms
// apart. Right after animateTo the marker may not be mounted yet (the web map
// recomputes its cluster/pin set on the map's zoomend/moveend), so a purely
// delayed ladder can fire before the pin exists and silently no-op — but in
// the COMMON case the marker is already there, and rung 0 lands the payoff in
// the same frame as the camera move (T1/F3-06: under Reduce Motion that means
// jump + callout as one designed cut — the old ≥250ms dead beat is gone).
// showCallout/openPopup are idempotent, so the extra calls are harmless once
// it lands. `isCancelled` lets the caller abort (effect cleanup, or a newer
// focus) so we never pop a stale callout. Returns a canceller that clears the
// pending timers. Exported for the jest guards.
export function retryShowCallout(
  map: PlatformMapHandle | null,
  flagId: string,
  isCancelled: () => boolean,
): () => void {
  if (!isCancelled()) map?.showCallout(flagId);
  const timers = [250, 400, 550, 700].map((ms) =>
    setTimeout(() => {
      if (!isCancelled()) map?.showCallout(flagId);
    }, ms),
  );
  return () => timers.forEach(clearTimeout);
}

// T1 (F3-04): ONE shared scheduler so every callout flow is last-tap-wins —
// scheduling flag B cancels flag A's still-pending rungs across ALL entry
// paths (Tasks focus, deep link, View-on-map, Nearby select), not just within
// one. Rapid Nearby A→B can therefore never answer with A's callout on a map
// centered on B. The optional `isCancelled` predicate lets the effect callers
// keep their own cleanup semantics — double-cancel is harmless (clearTimeout
// on a fired or cleared id is a no-op). Exported for the jest guards.
export function createCalloutScheduler(getMap: () => PlatformMapHandle | null): {
  schedule: (flagId: string, isCancelled?: () => boolean) => () => void;
  cancelPending: () => void;
} {
  let cancelCurrent: () => void = () => {};
  return {
    schedule(flagId, isCancelled = () => false) {
      cancelCurrent(); // last-tap-wins: kill the previous flag's pending rungs
      const cancel = retryShowCallout(getMap(), flagId, isCancelled);
      cancelCurrent = cancel;
      return cancel;
    },
    cancelPending() {
      cancelCurrent();
    },
  };
}

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

// B10 (L7-07): the web locate-failure copy, shared by the setter (in the catch)
// and the message-targeted clear (at the start of each locate attempt) so they
// agree on exactly which banner to dismiss.
const LOCATE_FAILED_MSG = "Couldn't find your location — check your connection and try again.";

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
  const styles = useMemo(() => makeStyles(color), [color]);
  // C-lite drives the filter panel's material: full = true blur (F3, the one
  // frost moment on Map), lite = engineered gradient. Hydrate on mount so a
  // C-lite user who cold-starts onto Map doesn't get a blur panel for one frame
  // before another glass screen mounts (bonus fix 3).
  const glassLite = useGlassMode() === 'lite';
  useEffect(() => {
    void hydrateGlassMode();
  }, []);
  const mapRef = useRef<PlatformMapHandle | null>(null);
  // T1 (F3-04): one scheduler for all four callout flows — last-tap-wins.
  const calloutScheduler = useMemo(() => createCalloutScheduler(() => mapRef.current), []);
  // Leaving the Map screen mid-ladder must not pop a callout into a dead
  // screen — cancel whatever is still pending on unmount.
  useEffect(() => () => calloutScheduler.cancelPending(), [calloutScheduler]);
  const route = useRoute<RouteProp<RootTabParamList, 'FullMap'>>();
  // L9: needed to reset route.params.flagId after a deep link is handled —
  // see the deep-link effect below.
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'FullMap'>>();
  // Phase 7a: the bottom tab bar is now absolute (frosted glass) on native, so
  // lift the bottom overlay (FAB tray + legend) above it.
  const tabBarHeight = useBottomTabBarHeight();
  // Reactive viewport height (rotation-safe) + safe-area insets, used to bound
  // the filter panel's maxHeight so it can't cover the FABs (G5). Context form
  // (non-throwing) since a provider isn't guaranteed in every render path.
  const { height: windowHeight } = useWindowDimensions();
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  // S8: the map wears its own editorial header inside the box-none overlay now
  // (the dark nav bar is gone), so it drives the drawer + Feedback itself.
  const drawer = useDrawer();
  const { setOpen: setSharedModal } = useSharedModals();
  const [location, setLocation] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // T7 (F4-03): true only on the UNDETERMINED no-location arrival (never asked).
  // Mutually exclusive with permissionDenied — a real denial shows the assertive
  // banner, never this polite hint. Cleared the moment the FAB resolves either way.
  const [noLocationHint, setNoLocationHint] = useState(false);

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
    offlineCachedAt,
    patchFlag, // S3: keep the map's flag list in sync after a detail-sheet action
    removeFlag,
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
  // G5 focus-return triggers. Each one owns the handle of the control that
  // opened its surface, so closing the surface hands the screen-reader cursor
  // back to that control instead of stranding it (WCAG 2.4.3). Local pairs
  // only — the button and the <Modal> both live in this component, so no
  // provider is needed (see useSurfaceTrigger's docblock).
  const nearbyTrigger = useSurfaceTrigger<View>();
  const reportTrigger = useSurfaceTrigger<View>();
  const legendTrigger = useSurfaceTrigger<View>();
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
  // S3: the flag whose detail sheet is open (null = closed). Per-screen state,
  // NOT in the shared-modals pool — mirrors Tasks/Profile, which each own their
  // own selectedFlag because the sheet is opened with per-screen context.
  const [selectedFlag, setSelectedFlag] = useState<FlagRow | null>(null);
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

  // S16 (L5-05): the 7-tool action bar scrolls its last tools (Refresh,
  // Recenter — the documented CONTRIBUTE entry for locationless users) out of
  // reach at <=320pt / large Dynamic Type with zero affordance. Track whether
  // it overflows AND isn't scrolled to the end, and show a fade edge when so.
  const actionBarViewW = useRef(0);
  const actionBarContentW = useRef(0);
  const actionBarOffsetX = useRef(0);
  const [actionBarHasMore, setActionBarHasMore] = useState(false);
  const recomputeActionBarFade = useCallback(() => {
    setActionBarHasMore(
      computeOverflowHasMore(
        actionBarContentW.current,
        actionBarViewW.current,
        actionBarOffsetX.current,
      ),
    );
  }, []);
  const onActionBarScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      actionBarOffsetX.current = e.nativeEvent.contentOffset.x;
      recomputeActionBarFade();
    },
    [recomputeActionBarFade],
  );
  const onActionBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      actionBarViewW.current = e.nativeEvent.layout.width;
      recomputeActionBarFade();
    },
    [recomputeActionBarFade],
  );
  const onActionBarContentSize = useCallback(
    (w: number) => {
      actionBarContentW.current = w;
      recomputeActionBarFade();
    },
    [recomputeActionBarFade],
  );

  // T14 (F2-07): the two silent filter-panel chip rails earn the same overflow
  // scent as the action bar, from the one shared contract (never a fork).
  const savedSetsFade = useHorizontalOverflowFade();
  const categoriesFade = useHorizontalOverflowFade();

  // T1 (F2-01): measure the PERSISTENT top-chrome band — mapHeaderRow + topRow
  // ONLY, never overlayTopGroup (it also nests the conditional filterPanel /
  // banners / places row, which would inflate the callout inset toward half
  // the screen). The sum feeds PlatformMap's chromeInsetTop so an opening pin
  // callout autoPans (or Reduce-Motion-cuts) fully below the chrome instead of
  // compositing under it. State, not just refs: topRow flexWraps, so its
  // height changes at runtime and the inset must re-render through to the map.
  // onLayout is a passive read — the box-none overlay law is untouched.
  const mapHeaderRowH = useRef(0);
  const topRowH = useRef(0);
  const [chromeBandPx, setChromeBandPx] = useState(0);
  const recomputeChromeBand = useCallback(() => {
    setChromeBandPx(
      Math.round(mapHeaderRowH.current + MAP_HEADER_ROW_MARGIN_BOTTOM + topRowH.current),
    );
  }, []);
  const onMapHeaderRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      mapHeaderRowH.current = e.nativeEvent.layout.height;
      recomputeChromeBand();
    },
    [recomputeChromeBand],
  );
  const onTopRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      topRowH.current = e.nativeEvent.layout.height;
      recomputeChromeBand();
    },
    [recomputeChromeBand],
  );

  const hasAutoOpenedListRef = useRef(false);
  useEffect(() => {
    if (screenReaderOn && !hasAutoOpenedListRef.current) {
      hasAutoOpenedListRef.current = true;
      // G5: arm the focus return for the ONE Nearby session every screen-reader
      // user is guaranteed to get. This open has no press behind it, so without
      // an explicit register() the session is never armed, restore() early-returns
      // and dismissing the auto-opened list strands the cursor at the top of the
      // revealed map — the exact bug G5 exists to fix, on the exact cohort it
      // exists for. The List FAB is already mounted and is the control that
      // reopens this sheet, so it is the correct return target.
      nearbyTrigger.register();
      setNearbyOpen(true);
    }
    // Safe to depend on the whole trigger: useSurfaceTrigger memoizes its return
    // object, so this does not re-run every render.
  }, [screenReaderOn, nearbyTrigger]);
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
  // A11Y-204 (WCAG 4.1.3): announce the RESULT COUNT when an active filter
  // changes it. The status pill carries accessibilityLiveRegion="polite",
  // which RN implements on ANDROID ONLY — so iOS VoiceOver users heard the
  // zero case (announced just below) and nothing else: apply a filter, get
  // silence, no idea whether it matched 3 flags or 300. Announce only while
  // filters are active and settled, and only when the count actually moved,
  // so panning or a background revalidation never chatters.
  const lastAnnouncedCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!filtersActive || loadingFlags || loadError) {
      lastAnnouncedCountRef.current = null;
      return;
    }
    // The zero case has its own richer recovery sentence below — don't
    // announce a bare "0 of N" ahead of it.
    if (filteredFlags.length === 0) return;
    if (lastAnnouncedCountRef.current === filteredFlags.length) return;
    lastAnnouncedCountRef.current = filteredFlags.length;
    AccessibilityInfo.announceForAccessibility(
      `${filteredFlags.length} of ${flags.length} flags shown`,
    );
  }, [filtersActive, loadingFlags, loadError, filteredFlags.length, flags.length]);

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

  // B10 (L7-07): a stable pointer to the latest requestLocation so the web
  // locate-failure Retry can re-run it without requestLocation depending on
  // itself (mirrors the S11 refreshRef pattern; keeps exhaustive-deps quiet).
  const requestLocationRef = useRef<() => void>(() => {});
  const requestLocation = useCallback(async () => {
    // B10 (L7-07): every new locate attempt dismisses a stale locate-failure
    // banner from a prior attempt (message-targeted so it never clobbers an
    // S10/S11 data banner that has since taken the shared slot). So a successful
    // Retry clears the error — the catch below re-shows it only if THIS attempt
    // also fails. Web-only: native uses Alert.alert, not the live region.
    if (Platform.OS === 'web') clearLiveStatusMessage(LOCATE_FAILED_MSG);
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
          // The FAB forced a real answer: this is now a denial, not the
          // never-asked hint — retire the polite line for the assertive banner.
          setNoLocationHint(false);
          setPermissionDenied(true);
          // WCAG 4.1.3: permission-denied is a status change not conveyed
          // by focus or role; announce it explicitly.
          AccessibilityInfo.announceForAccessibility(
            'Location is off, so the map shows the most recent flags, not ones near you. Turn on location access to find flags nearby.',
          );
        }
        return;
      }
      if (mountedRef.current) {
        setNoLocationHint(false);
        setPermissionDenied(false);
      }
      // Battery: reuse a cached fix up to 30s old before powering the GPS for a
      // fresh lock on every recenter/initial-locate. 30s is recent enough to
      // center the map accurately; getLastKnownPositionAsync returns null when
      // no recent fix exists, so we fall back to a live read.
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 30_000 })) ??
        (await getCurrentPositionWithTimeout({
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
        // B10 (L7-07): Alert.alert is a no-op on react-native-web, so a web
        // locate failure was fully silent (no visible message, nothing spoken).
        // Route web through the persistent LiveStatusRegion — visible + live —
        // with a Retry. Native keeps its working, announced dialog. Distinct
        // from the S4 permission-denied arrival banner (a non-throwing state).
        if (Platform.OS === 'web') {
          setLiveStatus({
            message: LOCATE_FAILED_MSG,
            tone: 'info',
            action: { label: 'Retry', onPress: () => requestLocationRef.current() },
          });
        } else {
          Alert.alert("Couldn't find your location", errorMessage(e));
        }
      }
    } finally {
      if (mountedRef.current) setLocating(false);
    }
  }, []);
  // Keep the Retry pointer current (requestLocation is stable, so this settles
  // after the first render).
  requestLocationRef.current = requestLocation;

  // Initial location fetch; runs once. Only fetches if the OS permission is
  // already granted — the first-time prompt is deferred to the onboarding flow
  // (OnboardingCards card 4). The user-facing locate button still calls
  // requestLocation() directly and will trigger the OS prompt if needed.
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (initialLocationAction(status) === 'fetch') {
          requestLocation();
        } else if (mountedRef.current) {
          // Not granted yet (undetermined on first run, or denied): the initial
          // fetch is skipped, so clear the `locating` spinner that inits true —
          // otherwise "Finding your location…" hangs forever over an otherwise
          // working map. The locate FAB / onboarding still trigger the real OS
          // prompt via requestLocation().
          setLocating(false);
          // S4 (L3-2): surface the denied banner on ARRIVAL — but ONLY for a real
          // prior denial. initialLocationAction() collapses undetermined (first
          // run, prompt deferred to onboarding) and denied into one 'clear', so
          // gate on the RAW status: a never-asked user must never be told access
          // is off. initialLocationAction + location.test.ts are untouched — this
          // only ADDS status-gated setters.
          if (arrivalPermissionDenied(status)) {
            setPermissionDenied(true);
          } else {
            // T7 (F4-03): UNDETERMINED (never asked) is no longer wordless. Show
            // the polite, non-accusing hint — never "off". On web the static
            // aria-live banner won't speak content present at mount, so publish
            // once through the announce shim (native reads it via the banner's
            // polite live region — no double-speak with the SR auto-open sheet).
            setNoLocationHint(true);
            if (Platform.OS === 'web') announce(NO_LOCATION_HINT);
          }
        }
      })
      .catch(() => {
        // Permission probe itself failed — don't leave the spinner stuck.
        if (mountedRef.current) setLocating(false);
      });
  }, [requestLocation]);

  // When Tasks tab navigates here with a focusFlag, animate to it and pop the
  // callout. `ts` makes re-tapping the same flag re-fire.
  useEffect(() => {
    const focus = route.params?.focusFlag;
    if (!focus) return;
    let cancelled = false;
    setFocusedFlagId(focus.id);
    // T1: calloutClear — this move exists to OPEN a callout, so native biases
    // the target below the measured chrome band (web clears at popup-open).
    mapRef.current?.animateTo(
      {
        latitude: focus.lat,
        longitude: focus.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      { calloutClear: true },
    );
    // Retry the callout a few times — right after animateTo the marker may not
    // be mounted yet, so a single fixed-delay call can silently no-op.
    const cancelCallout = calloutScheduler.schedule(focus.id, () => cancelled);
    // Only revalidate if the flag list is actually stale. Tapping a Tasks card
    // to focus a flag we already have shouldn't trigger a full network re-fetch
    // (realtime + the freshness window keep the list current). Saves a
    // round-trip — and the radio/battery cost — on every card tap.
    void refreshFlagsIfStale();
    return () => {
      cancelled = true;
      cancelCallout();
    };
  }, [route.params?.focusFlag, route.params?.ts, refreshFlagsIfStale, calloutScheduler]);

  // Phase 7a: Home's "Report" pill navigates here with openReport:true so the
  // report sheet opens on arrival. Clear the param right away (mirroring the L9
  // flagId reset) so it doesn't re-fire on a later re-focus of this route.
  useEffect(() => {
    if (!route.params?.openReport) return;
    // S5 (L3-1): mirror the Report FAB — kick a location read before opening so
    // the sheet resolves instead of stalling forever on "Waiting for location…".
    // A first-time web guest arriving from Home's "Report" pill has no fix in
    // flight; without this the submit stays permanently disabled. Skip when a
    // drop pin is set (the sheet uses that coord, so no GPS is needed).
    if (!dropLocation) void requestLocation();
    setReportOpen(true);
    navigation.setParams({ openReport: undefined });
  }, [route.params?.openReport, navigation, dropLocation, requestLocation]);

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
    // Cancellers for the callout-retry timers and the param-clear timer, set
    // once the flag resolves so the effect cleanup can clear them.
    let cancelCallout: () => void = () => {};
    let clearParamTimer: ReturnType<typeof setTimeout> | undefined;
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
        // T1: calloutClear — a deep link's whole job is landing on an open
        // callout, so native biases the target below the chrome band.
        mapRef.current?.animateTo(
          {
            latitude: flag.lat,
            longitude: flag.lng,
            // Tighter than the Tasks→Map focus (0.005): on web this lands at a
            // zoom past Supercluster's maxZoom, so the target pin is guaranteed
            // declustered on arrival and its popup can actually open.
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          },
          { calloutClear: true },
        );
        // Retry the callout a few times — the marker may still be inside a
        // cluster bubble or not yet mounted right after animateTo, so a single
        // fixed-delay call can silently no-op. Then free the deep-link param
        // (after the last retry) so re-tapping the same link re-fires (L9).
        cancelCallout = calloutScheduler.schedule(flag.id, () => cancelled);
        clearParamTimer = setTimeout(() => {
          if (!cancelled) clearFlagIdParam();
        }, 800);
      } catch {
        // Swallow — deep-link arrivals shouldn't ever surface an error
        // dialog. The user just sees the Map open as usual (but the param
        // is freed so a retry tap actually retries).
        clearFlagIdParam();
      }
    })();
    return () => {
      cancelled = true;
      cancelCallout();
      if (clearParamTimer) clearTimeout(clearParamTimer);
    };
  }, [route.params?.flagId, navigation, calloutScheduler]);

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

  // T7 (F4-03 / F5-03): the honest no-location arrival's TRUE FRAME. With no usable
  // location, a hardcoded San-Francisco viewport under a confident "Showing N flags"
  // pill is the inverted-honesty shape S4/S6 killed. So on the FIRST flags-load while
  // location is still null — a plain, ungestured arrival — fit the viewport to the
  // loaded rows with ONE instant cut (snapToRegion reuses BP1's instant-camera path;
  // never RM-gated because it replaces the initial paint, it is not motion). Fires
  // exactly once and never overrides an intent-driven camera: a resolved location, a
  // focusFlag / deep-link / openReport arrival, or a user who already moved the map.
  const didInitialFitRef = useRef(false);
  useEffect(() => {
    if (didInitialFitRef.current) return; // one-time
    if (location) return; // a real location owns the camera via initialRegion
    // A CAMERA-MOVING intent arrival (Tasks focusFlag / deep-link flagId) owns the
    // camera — permanently RETIRE the auto-fit here. These params SELF-CLEAR shortly
    // after they fire (the deep-link clears flagId ~800ms after animating to its
    // target); WITHOUT retiring, that param-clear would re-run this effect and yank the
    // viewport off the deep-linked flag. Set the one-time flag BEFORE the flags-loaded
    // gate so it also covers a deep-link that arrives before the first flags-load.
    // NOTE: openReport is deliberately NOT here — it opens the report sheet + kicks
    // requestLocation but moves NO map camera, so a null-location Report-pill arrival
    // still earns the honest fit behind the sheet (T7's whole point). If location DOES
    // resolve via that requestLocation, the `if (location) return` guard supersedes it.
    if (route.params?.focusFlag || route.params?.flagId) {
      didInitialFitRef.current = true;
      return;
    }
    if (loadingFlags || flags.length === 0) return; // wait for the first non-empty load
    // No-gesture proxy: currentRegionRef only syncs to `location` on this screen, so
    // `=== DEFAULT_REGION` means "still the seed" — no resolved location. (A user pan on
    // the pre-fit SF DEFAULT isn't tracked — no onRegionChange — but the fit only replaces
    // that irrelevant default frame with the real flags; an INTENT camera is retired above.)
    if (currentRegionRef.current !== DEFAULT_REGION) return;

    // R-13 / SR-105. This used to set the one-time flag and then call
    // `mapRef.current?.snapToRegion(region)`. The `?.` is the bug: the map ref
    // is not populated on the frame the flags first land (react-leaflet's
    // MapContainer attaches its imperative handle asynchronously), so on web
    // the snap was silently DROPPED — while the one-time flag had already been
    // set, retiring the fit forever. A guest with no location was left staring
    // at the seeded San Francisco default with their own city's flags loaded
    // and off-screen. Optional chaining turned a race into a no-op.
    //
    // Retry on the next frame instead of committing, bounded so it can never
    // spin if the map never mounts. Same shape as navigateWhenReady in
    // RootNavigator, which solves the identical "the thing is not ready yet"
    // problem for navigation.
    const commitFit = (attempts: number) => {
      if (!mapRef.current) {
        if (attempts <= 0) return; // give up quietly; the default frame stands
        requestAnimationFrame(() => commitFit(attempts - 1));
        return;
      }
      // Only NOW is the fit real, so only now does it count as done.
      didInitialFitRef.current = true;
      const region = regionForFlags(flags);
      currentRegionRef.current = region; // keep the viewport gate honest post-fit
      mapRef.current.snapToRegion(region);
    };
    commitFit(10);
  }, [flags, loadingFlags, location, route.params?.focusFlag, route.params?.flagId]);

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
    // A11Y-208 (G5 focus-return contract): arm the latch on BOTH map-gesture
    // paths. Without register() the session is never armed, restore() early-
    // returns, and dismissing a report opened this way strands the cursor —
    // the exact failure G5 exists to prevent.
    //
    // THE SEMANTICS CALL this finding left to Phase B: what should the cursor
    // return to, when the "trigger" was a long-press on the map itself and no
    // control was ever focused? The Report FAB — it is already mounted
    // (guests can't reach this path, and the FAB renders for every signed-in
    // user), it is labelled, and it is the control that opens this same
    // sheet. That is the identical reasoning this screen already recorded for
    // the screen-reader auto-open of the Nearby sheet.
    reportTrigger.register();
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
    // reportTrigger is memoized by useSurfaceTrigger, so depending on it does
    // not re-create this callback every render.
  }, [authUser, reportTrigger]);

  // S3 detail-sheet handlers. FlagDetailModal does the server mutation itself and
  // gates its own actions by auth/ownership (no new writes here — FORK 5 read
  // side only); MapScreen just REFLECTS the result into the shared store so the
  // pin re-colours/re-labels.
  //
  // Unlike Tasks (whose list is hard-filtered to open+verified, so it removeFlags
  // on resolve/reject), the Map shows whatever statuses the user selected
  // (activeStatuses). A resolved flag can still be a valid marker — so we ALWAYS
  // patch in place, then let refresh() reconcile: if the new status falls outside
  // the active fetch the refresh drops it; otherwise it stays, updated. We also
  // patch deepLinkFlag, since patchFlag is a no-op for a flag held only there
  // (a marker opened from a deep link that isn't in the store array).
  const handleDetailChanged = useCallback(
    (updated: FlagRow, _action: DetailAction, _isOwn: boolean) => {
      patchFlag(updated.id, { ...updated });
      setDeepLinkFlag((d) => (d && d.id === updated.id ? { ...d, ...updated } : d));
      refreshFlags().catch(() => {});
    },
    [patchFlag, refreshFlags],
  );

  const handleDetailDeleted = useCallback(
    (deletedId: string) => {
      removeFlag(deletedId);
      setDeepLinkFlag((d) => (d && d.id === deletedId ? null : d));
      // WCAG 4.1.3: announce deletion to screen readers (same pattern as Tasks).
      AccessibilityInfo.announceForAccessibility('Flag deleted');
    },
    [removeFlag],
  );

  // On the Map tab we're ALREADY on the map, so "View on map" recenters locally
  // instead of re-navigating (Tasks/Profile navigate cross-tab). Reuses the same
  // center-on-flag spine as the focusFlag / deep-link effects. The modal calls
  // onClose() itself right after this, so we don't touch selectedFlag here.
  const handleDetailViewOnMap = useCallback((flag: FlagRow) => {
    setFocusedFlagId(flag.id);
    // T1: calloutClear — "View on map" exists to show the callout.
    mapRef.current?.animateTo(
      {
        latitude: flag.lat,
        longitude: flag.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      { calloutClear: true },
    );
    calloutScheduler.schedule(flag.id);
  }, [calloutScheduler]);

  // The Report FAB is dimmed until we have a location on NATIVE (where the
  // recenter button is the way to turn location on). On WEB we keep it
  // tappable even without a fix: the tap kicks requestLocation() and opens
  // ReportFlagModal, which shows "Waiting for location…" and blocks submit
  // until the location resolves — so the FAB can never dead-end on web.
  const reportDisabled = !location && Platform.OS !== 'web';

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
        onOpenDetails={setSelectedFlag} // S3: pin callout "Open details" → detail sheet
        heatCells={heatCells}
        heatmapMode={HEATMAP_MODE}
        // T1 (F2-01): the full vertical band a callout must clear — safe area +
        // overlay padding + the measured persistent chrome rows + margin. The
        // map clamps it (≤45% of its own height) before use.
        chromeInsetTop={insets.top + OVERLAY_PADDING + chromeBandPx + CALLOUT_CHROME_MARGIN}
      />

      <View
        pointerEvents="box-none"
        // S8: headerShown:false on FullMap now, so the overlay clears the notch
        // itself (was below the dark nav bar).
        style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: tabBarHeight + 16 }]}
      >
        {/* Top cluster in ONE group so the overlay's space-between only ever
            distributes [topGroup, bottomBar] — with nine direct children, the
            conditional banners/chips floated to mid-map (sweep M10).
            box-none is mandatory: an opaque-to-touch wrapper would swallow
            map pan/zoom; flexShrink lets the G5 filterPanel keep yielding. */}
        <View style={styles.overlayTopGroup} pointerEvents="box-none">
        {/* S8 (treatment ii): a compact editorial title inside the box-none
            overlay — the map joins the header family without a nav bar. The row
            wrapper is box-none; only the content-hugging glass title chip and the
            menu/Feedback circles take touches (NO full-width opaque strip), so the
            map stays pannable/zoomable underneath (the box-none gesture law). */}
        <View style={styles.mapHeaderRow} pointerEvents="box-none" onLayout={onMapHeaderRowLayout}>
          <GlassSurface style={styles.mapHeaderChip} variant="row" forceEngineered borderRadius={radius.lg}>
            <AppText variant="label" style={styles.mapHeaderEyebrow}>MAP</AppText>
            <AppText
              variant="display"
              size={22}
              numberOfLines={1}
              accessibilityRole="header"
              style={styles.mapHeaderTitle}
            >
              Explore
            </AppText>
          </GlassSurface>
          <View style={styles.mapHeaderActions} pointerEvents="box-none">
            <HeaderActions
              onMenu={() => drawer.setOpen(true)}
              onFeedback={() => setSharedModal('feedback')}
              iconColor={color.textStrong}
            />
          </View>
        </View>
        {/* S6 (WCAG 2.5.7): box-none so taps fall THROUGH the row's gaps to the
            map — the un-guarded wrapper was pointer-dead, killing zoom/pan even
            on visible tile between the pill and the action tray. */}
        <View style={styles.topRow} pointerEvents="box-none" onLayout={onTopRowLayout}>
          {/* WCAG 4.1.3: accessibilityLiveRegion covers ANDROID TalkBack only
              (RN implements it there and nowhere else — the comment here used
              to claim it covered "AT", which would have waved a future
              reviewer straight past the gap). iOS VoiceOver is served by the
              explicit count announce in the A11Y-204 effect above. */}
          <GlassSurface
            style={styles.statusPill}
            variant="row"
            forceEngineered
            borderRadius={radius.circle}
            accessibilityLiveRegion="polite"
          >
            <AppText variant="label" maxFontSizeMultiplier={1.3} style={styles.statusText}>
              {loadingFlags
                ? // S11: a cold load (nothing on screen yet) reads differently
                  // from a revalidation over data already shown.
                  flags.length === 0
                  ? 'Loading flags…'
                  : 'Updating…'
                : // T9 (F5-02): a settled failure with nothing cached gets the honest
                  // fourth arm — never "Showing 0 flags". The co-present error banner
                  // below carries the retry. Gated on `&& flags.length === 0` so the
                  // SWR stale path keeps showing its cached count.
                  loadError && flags.length === 0
                  ? "Couldn't load flags"
                  : filtersActive
                    ? `${filteredFlags.length} of ${flags.length} shown`
                    : `Showing ${flags.length} flag${flags.length === 1 ? '' : 's'}`}
            </AppText>
          </GlassSurface>
          {/*
            actionBar groups the icon buttons into one connected surface so
            they feel like a single tool tray instead of four free-floating
            circles. The container carries the shadow + background; each
            inner button drops its own shadow so the row reads as one
            object with internal segments.
          */}
          <GlassSurface style={styles.actionBar} variant="row" forceEngineered borderRadius={radius.circle}>
            {/* The 7 buttons scroll horizontally when the tray outgrows the
                screen (~322pt of targets vs 288pt usable at 320pt — sweep
                M11). Identical at normal widths: the row is content-sized and
                only scrolls on overflow. flexShrink on actionBar lets the
                GlassSurface bound the viewport; the R4 pins live on the
                scroller so the buttons can never be vertically crushed. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.actionBarScroll}
              contentContainerStyle={styles.actionBarScrollContent}
              scrollEventThrottle={16}
              onScroll={onActionBarScroll}
              onLayout={onActionBarLayout}
              onContentSizeChange={onActionBarContentSize}
            >
            <PressableScale
              onPress={() => setSearchOpen(true)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Search by address"
              accessibilityHint="Opens a search box to jump the map to an address or place"
            >
              <Search size={19} color={color.inkSelect} strokeWidth={2.2} />
            </PressableScale>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <PressableScale
              ref={legendTrigger.ref}
              onPress={() => {
                // Captures this button's handle before the legend opens.
                legendTrigger.register();
                setLegendOpen(true);
              }}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Map legend"
              accessibilityHint="Opens a guide explaining flag categories and severity"
            >
              <HelpCircle size={19} color={color.inkSelect} strokeWidth={2.2} />
            </PressableScale>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <PressableScale
              onPress={() => setFiltersOpen((v) => !v)}
              style={[styles.actionBtn, (filtersOpen || filtersActive) && styles.actionBtnActive]}
              pressedTint={filtersOpen || filtersActive ? color.ctaFillPressed : color.borderPressed}
              accessibilityRole="button"
              accessibilityLabel="Toggle filters"
              {...a11yToggle({ expanded: filtersOpen })}
            >
              <SlidersHorizontal
                size={19}
                color={filtersOpen || filtersActive ? color.textOnBrand : color.inkSelect}
                strokeWidth={2.2}
              />
            </PressableScale>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <PressableScale
              onPress={cycleSeverity}
              style={[
                styles.actionBtn,
                styles.sevQuickBtn,
                minSeverity > 1 && { backgroundColor: severityColor(minSeverity) },
              ]}
              // Active severity fill is AA-tuned per level and not tokenized —
              // greying it would break the {n}+ ink; dim only in the inactive (all) state.
              dimOnPress={minSeverity === 1}
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
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.iconText,
                  styles.sevQuickText,
                  // {n}+ is TEXT (4.5 floor): textStrong at rest; on the active
                  // severity fill use the severity's own AA-audited ink (sev1-4
                  // #0F1B2D, sev5 #fff) — plain white here failed 2.2–3.6:1.
                  minSeverity > 1
                    ? { color: severity[minSeverity].textOnColor }
                    : { color: color.textStrong },
                ]}
              >
                {minSeverity}+
              </AppText>
            </PressableScale>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <PressableScale
              onPress={cycleCategory}
              style={[
                styles.actionBtn,
                styles.catQuickBtn,
                catCycleActive && styles.actionBtnActive,
              ]}
              pressedTint={catCycleActive ? color.ctaFillPressed : color.borderPressed}
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
                <Shapes size={19} color={color.inkSelect} strokeWidth={2.2} />
              )}
            </PressableScale>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <PressableScale
              onPress={() => { refreshFlags().catch(() => {}); }}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Refresh flags"
            >
              <RotateCw size={19} color={color.inkSelect} strokeWidth={2.2} />
            </PressableScale>
            <View style={styles.actionDivider} accessibilityElementsHidden />
            <PressableScale
              onPress={requestLocation}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Recenter on me"
            >
              <LocateFixed size={19} color={color.inkSelect} strokeWidth={2.2} />
            </PressableScale>
            </ScrollView>
            {/* S16 (L5-05): fade edge cueing that tools continue past the tray
                edge when it overflows. Decorative + pointer-inert, so the map
                gesture law (the box-none overlay) is untouched, and the 44x44
                buttons are unchanged (the fade wraps AROUND the ScrollView). */}
            <OverflowFade visible={actionBarHasMore} edge="pill" />
          </GlassSurface>
        </View>

        {/* Offline notice — parity with TasksScreen. The map still shows the
            last cached flags; this tells the user why they may be stale. */}
        {isOfflineCache && (
          <View
            style={styles.offlineBanner}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel={offlineBannerText(offlineCachedAt)}
          >
            <WifiOff size={16} color={color.warningFg} strokeWidth={2} />
            <AppText variant="body" style={styles.offlineBannerText}>
              {offlineBannerText(offlineCachedAt)}
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
          // Single-line scroller: up to 50 wrapping chips used to stack rows
          // over the map (sweep minor). No cap — a cap silently hides places.
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.placesRowScroll}
            contentContainerStyle={styles.placesRowContent}
            keyboardShouldPersistTaps="handled"
          >
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
                <MapPin size={14} color="#1466E0" strokeWidth={2.2} />
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
                color="#1466E0"
                strokeWidth={2.2}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <AppText variant="label" style={styles.placeChipText}>
                {savedPlaces.length === 0 ? 'Save a place' : 'Manage'}
              </AppText>
            </Pressable>
          </ScrollView>
        )}

        {filtersOpen && (
          <GlassSurface
            style={[
              styles.filterPanel,
              // Bound the panel to the viewport minus overlay padding and the
              // space reserved for the action bar + FAB tray, so the FABs stay
              // visible; flexShrink on filterPanel trims any imprecision (G5).
              {
                maxHeight:
                  windowHeight -
                  insets.top -
                  insets.bottom -
                  OVERLAY_PADDING * 2 -
                  spacing.sm -
                  PANEL_BRACKET_ALLOWANCE,
              },
            ]}
            variant="row"
            forceEngineered={glassLite}
            overlayTint={color.glassMapWash}
            borderRadius={radius.lg}
          >
            <View style={styles.filterHeaderRow}>
              <Pressable
                onPress={() => setPanelCollapsed((v) => !v)}
                hitSlop={8}
                style={({ pressed }) => [styles.filterTitleRow, pressed && styles.filterPillPressed]}
                accessibilityRole="button"
                accessibilityLabel={
                  panelCollapsed ? 'Expand filter panel' : 'Collapse filter panel'
                }
                accessibilityHint={
                  panelCollapsed
                    ? 'Shows saved filters, categories, severity, and status'
                    : 'Hides the filter sections, leaving just the header'
                }
                {...a11yToggle({ expanded: !panelCollapsed })}
              >
                <AppText variant="heading" style={styles.filterTitle}>Filter flags</AppText>
                {panelCollapsed ? (
                  <ChevronRight size={16} color={color.inkSelect} strokeWidth={2.4} accessibilityElementsHidden />
                ) : (
                  <ChevronDown size={16} color={color.inkSelect} strokeWidth={2.4} accessibilityElementsHidden />
                )}
              </Pressable>
              {filtersActive && (
                <Pressable
                  onPress={clearFilters}
                  hitSlop={8}
                  style={({ pressed }) => [styles.clearBtn, pressed && styles.filterPillPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <AppText variant="label" style={styles.clearLink}>Clear</AppText>
                </Pressable>
              )}
            </View>

            {!panelCollapsed && (
              <ScrollView
                style={styles.filterPanelScroll}
                contentContainerStyle={styles.filterPanelScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                <AppText variant="heading" style={styles.filterSubLabel}>Saved</AppText>
                {savedSets.length === 0 ? (
                  <View style={styles.savedEmpty}>
                    <AppText variant="bodyMedium" style={styles.savedEmptyText}>
                      No saved filters yet. Save your current view to switch back to it quickly.
                    </AppText>
                    <Pressable
                      onPress={openSaveModal}
                      style={({ pressed }) => [styles.savedSaveBtn, pressed && styles.savedSaveBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Save current filter as a named set"
                      accessibilityHint="Opens a prompt to name the current filter combination"
                    >
                      <AppText variant="label" style={styles.savedSaveBtnText}>Save current filter</AppText>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.overflowFadeWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterRow}
                    {...savedSetsFade.scrollHandlers}
                  >
                    {savedSets.map((set) => {
                      const isSelected = set.id === activeSetId;
                      const isDefault = set.id === defaultId;
                      return (
                        <Pressable
                          key={set.id}
                          onPress={() => applySet(set)}
                          onLongPress={() => openSetMenu(set)}
                          style={({ pressed }) => [styles.filterPill, isSelected && styles.filterPillActive, !isSelected && pressed && styles.filterPillPressed]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isDefault
                              ? `${set.name}, default filter set, tap to apply`
                              : `${set.name}, tap to apply, long press for options`
                          }
                          accessibilityHint="Sets the map filter to this saved combination. Long press for options including make default and delete."
                          {...a11yToggle({ pressed: isSelected })}
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
                                color={color.inkSelect}
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
                        style={({ pressed }) => [styles.filterPill, styles.savedAddPill, pressed && styles.filterPillPressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Save current filter as a named set"
                        accessibilityHint="Opens a prompt to name the current filter combination"
                      >
                        <AppText variant="label" style={styles.savedAddPillText}>+ Save current</AppText>
                      </Pressable>
                    )}
                  </ScrollView>
                  <OverflowFade visible={savedSetsFade.hasMore} />
                  </View>
                )}

                <AppText variant="heading" style={styles.filterSubLabel}>Categories</AppText>
                <View style={styles.overflowFadeWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}
                  contentContainerStyle={styles.filterRow}
                  {...categoriesFade.scrollHandlers}
                >
                  {CATEGORY_ORDER.map((c) => {
                    const active = activeCategories.has(c);
                    const count = categoryCounts[c];
                    return (
                      <Pressable
                        key={c}
                        onPress={() => toggleCategory(c)}
                        style={({ pressed }) => [styles.filterPill, active && styles.filterPillActive, !active && pressed && styles.filterPillPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by ${CATEGORY_LABELS[c]}, ${count} flag${count === 1 ? '' : 's'}`}
                        {...a11yToggle({ pressed: active })}
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
                <OverflowFade visible={categoriesFade.hasMore} />
                </View>

                <AppText variant="heading" style={styles.filterSubLabel}>Minimum severity</AppText>
                <View style={styles.filterRow}>
                  {SEVERITY_ORDER.map((s) => {
                    const active = s === minSeverity;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setMinSeverity(s)}
                        style={({ pressed }) => [styles.sevPill, active && { backgroundColor: severityColor(s) }, !active && pressed && styles.filterPillPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Minimum severity ${s}`}
                        {...a11yToggle({ pressed: active })}
                      >
                        <AppText
                          variant="label"
                          style={[
                            styles.sevPillText,
                            // Active fill is the severity color — use its own
                            // AA-audited ink (sev1-4 #0F1B2D, sev5 #fff); plain
                            // white failed 2.2–3.6:1 on sev 2/3/4.
                            active && { color: severity[s].textOnColor },
                          ]}
                        >
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
                    style={({ pressed }) => [styles.filterPill, heatmapEnabled && styles.filterPillActive, !heatmapEnabled && pressed && styles.filterPillPressed]}
                    accessibilityRole="switch"
                    accessibilityLabel="Show neighbourhood heat map"
                    {...a11yToggle({ checked: heatmapEnabled })}
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
                  <AppText variant="bodyMedium" style={styles.statusHint}>
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
                        style={({ pressed }) => [styles.filterPill, active && styles.filterPillActive, !active && pressed && styles.filterPillPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by ${STATUS_LABELS[s]}`}
                        {...a11yToggle({ pressed: active })}
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
                  <AppText variant="bodyMedium" style={styles.statusHint}>Pick at least one status — otherwise nothing will show up.</AppText>
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
                        style={({ pressed }) => [styles.filterPill, active && styles.filterPillActive, !active && pressed && styles.filterPillPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by barriers affecting: ${label}`}
                        {...a11yToggle({ pressed: active })}
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
                  <AppText variant="bodyMedium" style={styles.statusHint}>
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
                        style={({ pressed }) => [styles.filterPill, active && styles.filterPillActive, !active && pressed && styles.filterPillPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={a11yLabel}
                        {...a11yToggle({ pressed: active })}
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
                  <AppText variant="bodyMedium" style={styles.statusHint} accessibilityLiveRegion="polite">
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
                          pressed && styles.presetBtnSecondaryPressed,
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
              </ScrollView>
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
            {...a11yToggle({ busy: loadingFlags })}
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
              {/* T9 (F5-05): the visible retry verb APPENDED to the single AppText
                  (no new child — preserves the M10 grouping + box-none footprint);
                  single-sourced via copy.ts so Home/Map/Tasks speak one register.
                  The accessibilityLabel/Hint below already voice the retry to SR. */}
              {loadingFlags ? 'Retrying…' : failureBannerText(loadError)}
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
          <GlassSurface
            style={styles.emptyCard}
            variant="row"
            forceEngineered
            overlayTint={color.glassMapWash}
            borderRadius={radius.lg}
            // A11Y-213 (S13/L6-04 class): the material container must NOT be an
            // accessible leaf — on iOS that flattened the whole card into one
            // VoiceOver element and made the per-filter chips and "Reset all
            // filters" (the only zero-results recovery path, PROTECT-2)
            // unreachable. The summary node below carries the alert semantics;
            // every action stays an independent element.
          >
            <Search size={26} color={color.inkGlassMuted} strokeWidth={2} {...decorativeProps} />
            <View
              style={styles.emptyCardSummary}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <AppText variant="heading" style={styles.emptyCardTitle}>Nothing here right now</AppText>
              <AppText variant="body" style={styles.emptyCardBody}>
                Your filters are hiding everything. Clear just the one in the way, or reset them all.
              </AppText>
            </View>
            {emptyResetChips.length > 0 && (
              <View style={styles.emptyQuickRow}>
                {emptyResetChips.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={c.onPress}
                    style={({ pressed }) => [styles.emptyQuickChip, pressed && styles.filterPillPressed]}
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
          </GlassSurface>
        )}

        {/* WCAG 4.1.3: accessibilityLiveRegion covers Android TalkBack.
            iOS VoiceOver is already handled by the
            announceForAccessibility call in requestLocation(). */}
        {locating && !location && (
          <GlassSurface
            style={styles.bannerLocating}
            borderRadius={radius.md}
            // Map overlays are the always-light DESIGN.md exception. Pinned to
            // LITERALS — the themed overlayGlass/overlaySoft tokens rendered
            // DARK in dark mode (only the blur tint was pinned before). Now the
            // neutral "finding your location" banner reads identically in any
            // palette, over any tile. (Semantic alert banners stay solid.)
            tint="light"
            tintColor="rgba(255,255,255,0.82)"
            solidColor="rgba(255,255,255,0.95)"
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator
              color="#414B5A"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <AppText variant="body" style={styles.bannerLocatingText}>Finding your location…</AppText>
          </GlassSurface>
        )}

        {/* T7 (F4-03): the UNDETERMINED no-location arrival's one honest voice.
            Polite + role="text" (never the assertive alert — nothing was
            denied); reuses the banner INK only. Mutually exclusive with the
            denied banner below, which stays byte-identical. */}
        {noLocationHint && (
          <View
            style={styles.banner}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            <AppText variant="body" style={styles.bannerText}>
              {NO_LOCATION_HINT}
            </AppText>
          </View>
        )}

        {permissionDenied && (
          <View
            style={styles.banner}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <AppText variant="body" style={styles.bannerText}>
              Location is off, so the map shows the most recent flags, not ones near you. Turn on
              location access to find flags nearby.
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

        {/* B7-A (L7-11): the disclaimer above states the k-threshold RULE but is
            silent about the OUTCOME. When heat is on and there IS data but no
            cell clusters enough to qualify, the tinted layer is simply blank —
            which reads as broken. This complementary line names the outcome so
            "on + empty" ≠ "broken". (heatCells is the global loaded set, not a
            viewport query, so the copy stays honest about coverage, not "view".) */}
        {heatmapEnabled && heatCells.length === 0 && filteredFlags.length > 0 && (
          <View
            style={styles.heatmapDisclaimer}
            accessible
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            <AppText variant="body" style={styles.heatmapDisclaimerText}>
              No heat zones qualify yet — coverage grows as more reports come in.
            </AppText>
          </View>
        )}
        </View>

        {/* Bottom bar: legend (left, conditional) + FABs (right) */}
        <View style={styles.bottomBar}>
          {/* Flex slot reserves the left half so HeatmapLegend wraps against the
              true remaining width beside the intrinsic-width fabColumn, instead
              of overlapping the FABs at narrow widths (G6). */}
          <View style={styles.legendSlot}>{heatmapEnabled ? <HeatmapLegend /> : null}</View>
          <View style={styles.fabColumn}>
            {/* S6: app-styled 44pt+ zoom buttons — the reachable, pointer-live
                zoom affordance replacing Leaflet's occluded default control (web)
                and iOS's missing single-pointer zoom-out (WCAG 2.5.5 / 2.5.7).
                Opaque ctaFill + white glyph (map tiles unreachable beneath them);
                box-none group so only the buttons themselves take touches. */}
            <View style={styles.zoomGroup} pointerEvents="box-none">
              <PressableScale
                style={[styles.fab, styles.zoomBtn]}
                pressedTint={color.ctaFillPressed}
                onPress={() => mapRef.current?.zoomBy(1)}
                accessibilityRole="button"
                accessibilityLabel="Zoom in"
              >
                <Plus size={22} color={color.textOnBrand} strokeWidth={2.6} />
              </PressableScale>
              <PressableScale
                style={[styles.fab, styles.zoomBtn]}
                pressedTint={color.ctaFillPressed}
                onPress={() => mapRef.current?.zoomBy(-1)}
                accessibilityRole="button"
                accessibilityLabel="Zoom out"
              >
                <Minus size={22} color={color.textOnBrand} strokeWidth={2.6} />
              </PressableScale>
            </View>
            <PressableScale
              ref={nearbyTrigger.ref}
              style={[styles.fab, styles.fabSecondary]}
              // List label is color.brand (15px bold → 4.5 floor); a neutral grey
              // dim drops it to ~4.2:1. Keep spring + haptic, skip the fill dim.
              dimOnPress={false}
              onPress={() => {
                // register() captures this button's native handle BEFORE the
                // sheet opens, so closing it can return the cursor here.
                nearbyTrigger.register();
                setNearbyOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Open nearby flags list"
              accessibilityHint={
                location
                  ? 'Opens an accessible list of flags sorted by distance'
                  : 'Opens an accessible list of the most recent flags'
              }
            >
              <View style={styles.fabSecondaryRow}>
                <List size={16} color={color.brand} strokeWidth={2.2} />
                <AppText variant="label" style={styles.fabSecondaryText}>List</AppText>
              </View>
            </PressableScale>
            {/* Jordan Condition 2: hide Report FAB for guest users.
                Guests can browse but not create reports. Hiding at render
                time avoids collecting location permission before surfacing
                the "you must sign in" gate — a privacy-adjacent UX issue
                Jordan flagged in the privacy gate report. */}
            {authUser && (
              <PressableScale
                ref={reportTrigger.ref}
                style={[styles.fab, reportDisabled && styles.fabDisabled]}
                pressedTint={color.ctaFillPressed}
                haptic="medium"
                onPress={() => {
                  // Captures this FAB's handle before the sheet opens.
                  reportTrigger.register();
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
                disabled={reportDisabled}
                accessibilityRole="button"
                accessibilityLabel="Report a flag here"
                accessibilityHint={
                  location
                    ? 'Opens a form to report an accessibility issue at your current location'
                    : Platform.OS === 'web'
                      ? 'Opens the report form and finds your location. Allow location access when your browser asks.'
                      : 'Dimmed until location is on. Use the recenter button to turn on location, then report a flag here.'
                }
                {...a11yToggle({ disabled: reportDisabled })}
              >
                <View style={styles.iconLabelRow}>
                  <Plus size={16} color={color.textOnBrand} strokeWidth={2.6} />
                  <AppText variant="label" style={styles.fabText}>Report</AppText>
                </View>
              </PressableScale>
            )}
          </View>
        </View>
      </View>

      <Suspense fallback={null}>
        <ReportFlagModal
          visible={reportOpen}
          // Prefer the long-press drop location if the user dropped one;
          // otherwise fall back to the user's current GPS location for the
          // FAB-triggered "report at my location" flow.
          location={dropLocation ?? location}
          // S5: lets the sheet re-run the same locating spine on demand (the
          // in-sheet "Use my location" retry) without leaving the flow.
          onRequestLocation={requestLocation}
          onClose={() => {
            setReportOpen(false);
            // Clear the drop pin on close so the next FAB-tap defaults back
            // to GPS. Without this, a long-press once would stick as the
            // implicit location forever.
            setDropLocation(null);
            // RN core fires a Modal's onDismiss on iOS ONLY, so everywhere else
            // the close INTENT is the last event available; release() stands in.
            reportTrigger.release();
          }}
          // The dismissal-COMPLETE event — only now is the Report FAB back on
          // screen and safe to aim the screen-reader cursor at.
          onDismiss={reportTrigger.restore}
          onCreated={(flag) => {
            // A SUBMIT hands off to the confirmation, not back to the FAB. Both
            // success paths run onCreated → onClose → setLiveStatus, and that
            // live region announces "Report filed…" — moving the cursor to the
            // FAB as the sheet slides out would cut that confirmation off
            // mid-utterance. Cancel / hardware back / the escape scrub are plain
            // closes and DO return focus.
            reportTrigger.markHandoff();
            refreshFlags().catch(() => {});
            // S10: recenter on the brand-new pin so the user SEES their
            // contribution land. Reduced-motion gated (PROTECT-7) — skipped
            // instantly under Reduce Motion, exactly like every other camera move.
            if (flag && !reducedMotion) {
              mapRef.current?.animateTo({
                latitude: flag.lat,
                longitude: flag.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }
          }}
        />
      </Suspense>

      {/* S3: the trust ledger, now reachable from the map. Opened by the pin
          callout's "Open details" and, under a screen reader, by the Nearby
          list. Self-manages focus (useFocusOnOpen → title); mounts OUTSIDE the
          box-none overlay so the map gesture law is untouched. */}
      <Suspense fallback={null}>
        <FlagDetailModal
          visible={selectedFlag !== null}
          flag={selectedFlag}
          onClose={() => setSelectedFlag(null)}
          onChanged={handleDetailChanged}
          onEdited={(updated) => patchFlag(updated.id, updated)}
          onDeleted={handleDetailDeleted}
          onViewOnMap={handleDetailViewOnMap}
        />
      </Suspense>

      <LegendModal
        visible={legendOpen}
        onClose={() => {
          setLegendOpen(false);
          // RN core fires a Modal's onDismiss on iOS ONLY, so everywhere else
          // the close INTENT is the last event available; release() stands in.
          legendTrigger.release();
        }}
        // The dismissal-COMPLETE event — only now is the legend button back on
        // screen and safe to aim the screen-reader cursor at.
        onDismiss={legendTrigger.restore}
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
        onClose={() => {
          setNearbyOpen(false);
          // RN core fires a Modal's onDismiss on iOS ONLY, so everywhere else
          // the close INTENT is the last event available; release() stands in.
          nearbyTrigger.release();
        }}
        // The dismissal-COMPLETE event — only now is the List button back on
        // screen and safe to aim the screen-reader cursor at.
        onDismiss={nearbyTrigger.restore}
        onSelectFlag={(flag) => {
          // S3 (L6-05): a screen-reader user gets the focus-managed detail sheet
          // — a real heading with useFocusOnOpen — instead of a silent map
          // recenter they can't perceive. We present the sheet ON TOP of the
          // still-open Nearby list (we do NOT close it): closing-then-presenting
          // races the iOS modal transition, and leaving the list mounted means
          // VoiceOver focus returns to this row when the sheet closes. Nesting is
          // already proven here (StatusHistoryModal stacks over FlagDetailModal).
          if (screenReaderOn) {
            setSelectedFlag(flag);
            return;
          }
          // Sighted path — unchanged behaviour, upgraded to the shared
          // last-tap-wins scheduler (vs the old single fixed 350ms timeout):
          // rapid A→B selects can never answer with A's callout (T1/F3-04).
          // Hands off to the map callout — do not yank the cursor back.
          // `release()` still has to run: this branch closes the list WITHOUT
          // going through the parent onClose, and Android fires no onDismiss,
          // so without it `armed`/`handedOff` would stay latched with a stale
          // handle until the next register(). restore() is idempotent, so on the
          // platforms that DO fire onDismiss this costs nothing.
          nearbyTrigger.markHandoff();
          nearbyTrigger.release();
          setNearbyOpen(false);
          setFocusedFlagId(flag.id);
          // T1: calloutClear — the Nearby row select lands on an open callout.
          mapRef.current?.animateTo(
            {
              latitude: flag.lat,
              longitude: flag.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            { calloutClear: true },
          );
          calloutScheduler.schedule(flag.id);
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
        aria-label="Name this preset"
        onRequestClose={() => {
          if (!savingPreset) setPresetNameModalOpen(false);
        }}
      >
        <View style={styles.nameBackdrop}>
          {/* KAV lifts the centered card above the keyboard the autoFocus
              input opens. iOS 'padding'; width:100% preserves centering. */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
          <View
            style={styles.nameCard}
            // G2/SR-065: this dialog sits over a LIVE map, which is the worst
            // case for focus leakage — without containment VoiceOver can wander
            // onto pins and controls behind a text-entry dialog. One of only two
            // surfaces in the app that lacked it.
            accessibilityViewIsModal
            // G1: same `!savingPreset` guard as onRequestClose.
            onAccessibilityEscape={() => {
              if (!savingPreset) setPresetNameModalOpen(false);
            }}
          >
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
                {...a11yToggle({ disabled: savingPreset })}
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
                {...a11yToggle({
                  busy: savingPreset,
                  disabled: savingPreset || presetNameDraft.trim().length === 0,
                })}
              >
                {savingPreset ? (
                  <ActivityIndicator color={color.textOnBrand} />
                ) : (
                  <AppText variant="label" style={styles.nameBtnSaveText}>Save</AppText>
                )}
              </Pressable>
            </View>
          </View>
          </KeyboardAvoidingView>
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
        aria-label="Name this filter"
        onRequestClose={() => {
          if (!savingSet) setNameModalOpen(false);
        }}
      >
        <View style={styles.nameBackdrop}>
          {/* KAV lifts the centered card above the keyboard the autoFocus
              input opens. iOS 'padding'; width:100% preserves centering. */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
          <View
            style={styles.nameCard}
            // G2/SR-065: containment over the live map (see the preset dialog).
            accessibilityViewIsModal
            // G1: same `!savingSet` guard as onRequestClose.
            onAccessibilityEscape={() => {
              if (!savingSet) setNameModalOpen(false);
            }}
          >
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
                {...a11yToggle({
                  busy: savingSet,
                  disabled: savingSet || nameDraft.trim().length === 0,
                })}
              >
                {savingSet ? (
                  <ActivityIndicator color={color.textOnBrand} />
                ) : (
                  <AppText variant="label" style={styles.nameBtnSaveText}>Save</AppText>
                )}
              </Pressable>
            </View>
          </View>
          </KeyboardAvoidingView>
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
      minHeight: 44,
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
    // M10 group: must shrink (RN Views default flexShrink 0) so the nested
    // filterPanel's own flexShrink/maxHeight bound still engages against the
    // absolute-fill overlay. Never give this flex:1 or a fixed height.
    overlayTopGroup: { flexShrink: 1 },
    // S8 map editorial header (treatment ii). The row is box-none; only the
    // content-hugging chip + the action circles are opaque. Inks reuse the map
    // overlay's proven always-light glass tokens (map-stacks.json) — no arbiter.
    mapHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      // T1: mirrored by MAP_HEADER_ROW_MARGIN_BOTTOM in the chrome-band measure.
      marginBottom: MAP_HEADER_ROW_MARGIN_BOTTOM,
    },
    mapHeaderChip: {
      // T13/F2-12: snap the last off-scale stray in this touched style to a token.
      // Horizontal only (width) — it does not feed T1's chrome-band HEIGHT measure.
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      alignItems: 'flex-start',
    },
    // T13 (F2-05): the menu + Feedback circles as ONE right-pinned pair, so the
    // space-between row can no longer strand the menu circle mid-air. box-none
    // keeps the map pannable through the gap between the two discrete 44pt targets.
    mapHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    mapHeaderEyebrow: {
      fontSize: font.size.xs,
      letterSpacing: 1.2,
      color: color.inkGlassMuted,
      fontWeight: font.weight.semibold,
    },
    mapHeaderTitle: { color: color.textStrong, marginTop: 0 },
    topRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
    // Saved Places chip row — slim secondary single-line scroller beneath the
    // action bar. Pattern-B pins (guard Rule 4) on the scroller; layout lives
    // on the content container.
    placesRowScroll: { flexGrow: 0, flexShrink: 0, marginTop: 8 },
    placesRowContent: { flexDirection: 'row', gap: 6 },
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
    // Place chips are PINNED ALWAYS-LIGHT (white 0.95 fill in both themes, like
    // the heatmap legend) — so every ink/tint here is a light-mode literal, not
    // a themed token. Themed inks broke over the white fill in dark mode:
    // brandTextAlt → #84AEF6 = 2.0:1, and surfaceNeutral flashed near-black on
    // press. The trailing manage chip keeps its tinted background.
    // Fill-swap dim (the pinned-light literal, per the note above); the group
    // opacity that used to ride here dimmed the label too (dropped in BP11).
    placeChipPressed: { backgroundColor: '#EEF1F5' },
    placeChipManage: { backgroundColor: '#EEF4FE' },
    placeChipGlyph: { fontSize: 14, color: '#1466E0' },
    placeChipText: { fontSize: 13, fontWeight: '600', color: '#0E4499' },
    statusPill: {
      // Deep Field row-tier via <GlassSurface variant="row" forceEngineered>
      // (Map pass) — no backgroundColor here, the surface owns the translucent
      // fill + AA floor. Shadow only in light: over the engineered dark chrome
      // the e1 drop (dark #0F1B2D) reads as muddy fringing, not lift.
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.circle,
      ...(color.scheme === 'light' ? shadow.e1 : {}),
    },
    statusText: { fontSize: 13, color: color.textStrong, fontWeight: '600' },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.circle,
      backgroundColor: color.overlaySoft,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.e1,
    },
    iconText: { fontSize: 18, fontWeight: '700' },
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
      // Deep Field row-tier via <GlassSurface variant="row" forceEngineered>
      // (Map pass). No border here — the row variant paints its own hairline
      // edge, so a second borderWidth would double it. Shadow light-only (see
      // statusPill note).
      flexDirection: 'row',
      borderRadius: radius.circle,
      paddingHorizontal: 4,
      paddingVertical: 2,
      alignItems: 'center',
      // Yields inside topRow so the inner tray ScrollView gets a bounded
      // viewport at narrow widths (M11) instead of bleeding off-screen.
      flexShrink: 1,
      ...(color.scheme === 'light' ? shadow.e2 : {}),
    },
    // Pattern-B pins (guard Rule 4): a horizontal scroller inside a bounded
    // flex parent must never grow/shrink on its cross axis.
    actionBarScroll: { flexGrow: 0, flexShrink: 0 },
    actionBarScrollContent: { flexDirection: 'row', alignItems: 'center' },
    // T14 (F2-07): the position:relative wrapper each silent chip rail gets so its
    // absolute OverflowFade edge pins to that rail's right edge (not the panel).
    // Redundant on native (Views default relative) but required on the web export.
    overflowFadeWrap: { position: 'relative' },
    actionBtn: {
      minWidth: 44, // WCAG 2.5.5: was 36pt (below 44pt project standard)
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.circle,
    },
    actionBtnActive: { backgroundColor: color.ctaFill },
    actionDivider: {
      width: 1,
      height: 18,
      backgroundColor: color.border,
    },
    filterPanel: {
      marginTop: spacing.sm,
      // flexShrink lets the panel give up height inside the absolute-fill overlay
      // so it can't grow past its siblings and cover the FABs (G5, layer 1).
      flexShrink: 1,
      // Frosted-glass surface supplied by <GlassSurface> (translucent + blur with
      // an AA contrast floor); falls back to a solid fill under Reduce Transparency.
      // No backgroundColor here — GlassSurface owns the surface.
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      // No border here — the row variant paints its own hairline edge (a second
      // border would double it). Shadow light-only (over the engineered/blur
      // dark panel the dark drop reads as fringing, not lift).
      ...(color.scheme === 'light' ? shadow.e2 : {}),
    },
    // The scrollable region holding the 8 filter sections. flexShrink lets it
    // shrink within the maxHeight-bounded panel so filterHeaderRow stays pinned
    // and the sections scroll (G5, layer 2). Content gap replaces the panel gap
    // the sections lose by moving into the scroll container.
    filterPanelScroll: {
      flexShrink: 1,
    },
    filterPanelScrollContent: {
      gap: spacing.sm,
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
    // Bare text link on the washed panel (4.5 floor): light brandTextAlt
    // #0E4499 / dark inkSelect #B4CFFA. Plain brand was 4.25:1 L / failed dark.
    clearLink: {
      fontSize: font.size.xs,
      color: color.scheme === 'light' ? color.brandTextAlt : color.inkSelect,
      fontWeight: font.weight.semibold,
    },
    // S16 (L5-04, WCAG 2.5.5): the recovery "Clear" control was the app's only
    // bare-text Pressable (~34x17pt) — a miss collapsed the panel. Give it the
    // sibling filterTitleRow's comfort treatment: minHeight 32 + padding, plus
    // hitSlop={8} on the Pressable → an effective target of ~48pt (32 + 8 + 8).
    clearBtn: {
      justifyContent: 'center',
      minHeight: 32,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    filterSubLabel: {
      fontSize: font.size.caption,
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.loose,
      marginTop: spacing.sm,
    },
    // Pattern B: `filterScroll` pins the horizontal chip strips (style prop);
    // `filterRow` stays the shared content-row layout — also reused by 3
    // non-scrolling Views, so it must NOT gain flexGrow/flexShrink.
    // Horizontal chip strip. overflow-y is hidden on web, which clips the
    // keyboard :focus-visible ring to two vertical slivers. The active chip fill
    // is brand blue = the ring colour, so the ring can't move INSIDE the chip
    // (it would vanish) — give the outside halo 4px of vertical headroom and
    // cancel it with a matching negative margin: ring renders whole, zero net
    // layout cost.
    filterScroll: { flexGrow: 0, flexShrink: 0, paddingVertical: 4, marginVertical: -4 },
    filterRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      minHeight: 44,
      borderRadius: radius.circle,
      // Chip-on-pane (law): translucent chip tint + hairline edge over the
      // washed panel; ink is glassChipInk. Active + dashed-add variants
      // override the bg below.
      backgroundColor: color.glassChipFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.glassChipEdge,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterPillActive: { backgroundColor: color.ctaFill },
    filterPillText: { fontSize: font.size.xs, color: color.glassChipInk, fontWeight: font.weight.semibold },
    filterPillTextActive: { color: color.textOnBrand },
    // Viewport count badge inside each category chip (UX #1). Sits after the
    // label with a thin separator gap; muted so the label stays primary, but
    // turns textOnBrand (via filterPillTextActive) when the chip is selected.
    filterPillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    filterPillCount: {
      fontSize: font.size.caption,
      // glassChipInk on the chip stack (10.46/6.25); hierarchy comes from the
      // smaller caption size, not a lighter ink (inkGlassMuted failed the stack).
      color: color.glassChipInk,
      fontWeight: font.weight.bold,
    },
    sevPill: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
      // Chip-on-pane like the filter pills; the active state overrides the bg
      // with the severity color inline.
      backgroundColor: color.glassChipFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.glassChipEdge,
    },
    sevPillText: { fontSize: font.size.sm, color: color.glassChipInk, fontWeight: font.weight.bold },
    sevPillTextActive: { color: color.textOnBrand },
    statusHint: { fontSize: font.size.caption, color: color.warningFg, marginTop: spacing.tight },
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
    // Pinned-light literal — NOT the shared bannerText (the permission banner
    // renders that on a themed dark fill). #333 on the 0.82 white banner = 8.28:1.
    bannerLocatingText: { fontSize: font.size.sm, color: '#333' },
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
    errorBannerPressed: { backgroundColor: color.errorPressed },
    errorBannerIcon: { color: color.textOnBrand, fontSize: font.size.xl, fontWeight: font.weight.bold },
    errorBannerText: { color: color.textOnBrand, fontSize: font.size.sm, fontWeight: font.weight.semibold, flex: 1 },
    emptyCard: {
      // Row-tier Deep Field material (GlassSurface variant="row" forceEngineered
      // + glassMapWash overlay) supplies the surface, edge, and specular — so no
      // backgroundColor / border here. Shadow + layout stay on this outer style
      // (GlassSurface clips only its inner material layer — see its docstring).
      alignSelf: 'center',
      marginTop: 16,
      maxWidth: 320,
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderRadius: radius.lg,
      gap: 8,
      alignItems: 'center',
      ...shadow.e2,
    },
    // A11Y-213: the summary node inherits the card's internal rhythm so the
    // de-flattened structure is pixel-identical to the old flat one.
    emptyCardSummary: {
      gap: 8,
      alignItems: 'center',
    },
    emptyCardTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textAlign: 'center',
      letterSpacing: -0.1,
    },
    emptyCardBody: {
      fontSize: font.size.sm,
      // On-glass body reads color.text (7.67 L / 6.67 D over the wash) — the
      // muted face is banned on glass (GLASS §7.4). Title stays textStrong.
      color: color.text,
      textAlign: 'center',
      lineHeight: 18,
    },
    emptyCardBtn: {
      marginTop: spacing.tight,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.circle,
      // ctaFill (mode-independent Wayfinder Blue) for white-on-blue CTAs —
      // color.brand + white is 3.42:1 in dark (passing only by 14pt-bold
      // large-text allowance); ctaFill removes that latent fragility.
      backgroundColor: color.ctaFill,
      minHeight: 44,
      justifyContent: 'center',
    },
    // emptyCardBtn is brand-filled (ctaFill + white) → deepen to ctaFillPressed;
    // the emptyQuickChip (surfaceNeutral + brandText) uses the neutral fill above.
    emptyCardBtnPressed: { backgroundColor: color.ctaFillPressed },
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
    // Left half of the bottom bar. flex:1 makes it claim the space beside the
    // intrinsic-width fabColumn, giving HeatmapLegend a definite bounding width
    // so its internal flexWrap wraps instead of pushing into the FABs (G6).
    legendSlot: {
      flex: 1,
      marginRight: spacing.sm,
      alignItems: 'flex-start',
    },
    fabColumn: {
      alignItems: 'flex-end',
      gap: 10,
    },
    // S6 zoom control — two stacked 48pt circles at the top of the right column.
    zoomGroup: {
      alignItems: 'flex-end',
      gap: 10,
    },
    zoomBtn: {
      width: 48,
      height: 48,
      paddingHorizontal: 0,
      paddingVertical: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fab: {
      // ctaFill (mode-independent) — the Report FAB rides this base; plain
      // color.brand dropped its white text to 3.4:1 in dark. The List FAB
      // overrides bg to color.overlay (fabSecondary) and keeps color.brand ink (F4).
      backgroundColor: color.ctaFill,
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
    fabText: { color: color.textOnBrand, fontWeight: '700', fontSize: 15 },
    savedEmpty: { gap: 8, marginTop: 4 },
    savedEmptyText: { fontSize: 12, color: color.inkGlassMuted, lineHeight: 16 },
    savedSaveBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.circle,
      backgroundColor: color.ctaFill,
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
    // brandText (not brand) so it stays AA on the neutral pressed fill — matches
    // its sibling presetBtnSecondaryText, which uses brandText for the same reason.
    savedAddPillText: { color: color.brandText, fontSize: 12, fontWeight: '700' },
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
      backgroundColor: color.ctaFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Save-as-preset is brand-filled (ctaFill + white) → deepen to ctaFillPressed.
    presetBtnPressed: { backgroundColor: color.ctaFillPressed },
    // Load-preset is brandText-on-surface (outline) → neutral pressed fill.
    presetBtnSecondaryPressed: { backgroundColor: color.borderPressed },
    // The shared neutral chip/row pressed fill (BP11 one press vocabulary):
    // inactive filter chips, the collapse header, Clear, +Save-current, the
    // Load-preset + empty quick chips. Ink stays full opacity on the dimmed fill.
    filterPillPressed: { backgroundColor: color.borderPressed },
    savedSaveBtnPressed: { backgroundColor: color.ctaFillPressed },
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
      // T20: shadow.e3 makes the four-dialog tier four-of-four for depth (the
      // ProfileScreen account dialogs already carry it). Unconditional — these
      // are solid-surface cards, so the Deep Field transparent-bg shadow
      // suppression does not apply.
      ...shadow.e3,
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
    nameBtnSave: { backgroundColor: color.ctaFill },
    nameBtnSaveDisabled: { opacity: 0.5 },
    nameBtnSaveText: { color: color.textOnBrand, fontWeight: '700', fontSize: 14 },
  });
