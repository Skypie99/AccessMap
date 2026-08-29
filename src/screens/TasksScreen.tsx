import React, { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  InteractionManager,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  type StyleProp,
  TextInput,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { getFloatingTabBarContentInset } from '@/navigation/tabBarGeometry';
import { useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { formatDistance, formatWalkingEta, haversineKm, speakDistance, type LatLng } from '@/lib/distance';
import { confirm, notify } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import {
  FlagStatusConflictError,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  NEXT_PAGE_SIZE,
  updateFlagStatus,
} from '@/lib/flags';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import { relativeTime } from '@/lib/relativeTime';
import { searchFlags } from '@/lib/flagSearch';
import { findNearestUnresolved } from '@/lib/nearestFlag';
import { useFlags } from '@/lib/flagsStore';
import { useUserLocation } from '@/lib/location';
import { POINTS } from '@/lib/points';
import { failureBannerText, offlineBannerText } from '@/lib/copy';
import {
  DEFAULT_TASKS_SORT,
  TASKS_SORT_LABELS,
  TASKS_SORT_ORDER,
  loadTasksSort,
  saveTasksSort,
  sortFlags,
  type TasksSort,
} from '@/lib/tasksSort';
import {
  EMPTY_SELECTION,
  clearSelection,
  count as selectionCount,
  enterSelectionWith,
  isSelected,
  toggleId,
  type TaskSelectionState,
} from '@/lib/taskSelection';
import { loadScope, saveScope } from '@/lib/tasksScope';
import { addWatchedBulk } from '@/lib/watchedFlags';
import { track } from '@/lib/analytics';
import type { FlagCategory, FlagRow, FlagStatus } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import type { DetailAction } from '@/components/FlagDetailModal';
import PhotoLightboxModal from '@/components/PhotoLightboxModal';
import { AppText } from '@/components/ui/AppText';
import { FlagCard, MonoDistance } from '@/components/ui/FlagCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import { hapticImpact, hapticNotify, hapticSelection } from '@/lib/haptics';
import { AlertTriangle, Check, ChevronRight, ListChecks, MapPin, Menu, MessageSquare, MoreHorizontal, Search, SlidersHorizontal, Sparkles, WifiOff, X } from 'lucide-react-native';
import { a11y, font, motion, radius, shadow, size, spacing } from '@/theme';
import { a11yToggle, decorativeProps, isAxRecompose, useReducedMotion, useReduceTransparency } from '@/lib/accessibility';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { Sheet } from '@/components/ui/Sheet';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import { useDrawer, useDrawerTrigger } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeImageUrl } from '@/lib/remoteImageUrl';

// Code-split: the flag-detail sheet only opens when a card is tapped. React.lazy
// moves its (large) code into a shared async web chunk — the SAME chunk is reused
// by ProfileScreen's FlagDetailModal (Metro dedups by module path). Always-mounted
// below (visible-prop controlled), so behavior is unchanged. Declared after the
// imports so eslint's import/first stays satisfied.
const FlagDetailModal = React.lazy(() => import('@/components/FlagDetailModal'));

// Statuses Tasks shows. Even if the provider's `statuses` is widened by the
// Map's filter, Tasks restricts the visible set to the actionable lifecycle
// states (open → verified).
const TRIAGE_STATUSES: FlagStatus[] = ['open', 'verified'];

// Fallback height (pt) of the floating bulk-action bar, used ONLY to seed the
// list-bottom reserve before the bar's real height is measured via onLayout
// (below). Approx: paddingTop 10 + count line ~20 + gap 8 + button 44 +
// paddingBottom 12. Once mounted, the measured height takes over so the last
// card never hides behind the bar — even at large type, when the bar grows.
const BULK_BAR_FALLBACK_HEIGHT = 94;

// Fallback height (pt) of the absolute chrome glass pane, used only to seed
// the list's top reserve before the pane's real height lands via onLayout
// (the list is opacity-gated until then, so this only sizes the first layout
// pass). Safe-area top is added at the call site. Once measured, the real
// height takes over — the mockup's ResizeObserver → RN onLayout translation.
//
// The old row list here was wrong twice over: it quoted the header at ~112
// (measured: 98) and it omitted the mine/All row entirely — which only renders
// when SIGNED IN, and is therefore invisible to every web capture, so nothing
// caught it. Measured at 390x844 (design-reviews/device-tune/tools/measure-header.mjs,
// DECISIONS §F F-16/F-17), all rows visible, default type:
//   pane padding 8 + header 98 + search 60 + mine/All 60 + category 62 + sort 64
//   = 352 post-D3/C1  (it was 404 before C1 returned the select-entry row's 52pt)
//
// D3/C3 then moved mine/All, category and sort into the filter sheet and D3/C2
// retired the subtitle, taking the pane to:
//   pane padding 8 + header 78 + search 60 + filter trigger 64 = 210
//
// Phase 2a (board 09) folded the filter trigger row into the search row as a
// pair of 44pt circles, so the trigger's 64 is gone and the pane is:
//   pane padding 8 + header 78 + control row 60 = 146
// The row that held "Clear filters" survives, but ONLY while a filter is
// active, so it is not part of the seed: seeding the filtered height would
// leave a 52pt gap under the chrome on every unfiltered first paint, which is
// the visible jump this constant exists to prevent. The real height still
// arrives via onLayout a frame later and takes over in both states.
const CHROME_FALLBACK_HEIGHT = 146;

// The banner is a pointer to the first card. Past this text size it is taller
// than the thing it points at, so it stands down (board 09, AXL column). 2x is
// one notch above the F4 recomposition point on purpose: at 1.5x the banner is
// still a useful two-line signpost, and only at 2x does it become a paragraph.
const BANNER_STAND_DOWN_SCALE = 2;

/**
 * The FlagCard action-row reflow threshold (sweep M16): a narrow device OR
 * large Dynamic Type tips the tiered single row into the deliberate 2-row
 * stack. Extracted pure so the composition pin test can assert the ×1.6
 * behavior headlessly (RN-web can't set fontScale for captures).
 */
export function isCompactLayout(width: number, fontScale: number): boolean {
  return width <= 375 || fontScale >= 1.15;
}

export default function TasksScreen() {
  const color = useColor();
  const reduceTransparency = useReduceTransparency();
  const styles = useMemo(() => makeStyles(color, reduceTransparency), [color, reduceTransparency]);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Tasks'>>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const drawer = useDrawer();
  const menuTrigger = useDrawerTrigger<View>();
  const { setOpen: setSharedModal } = useSharedModals();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  // Measured height of the floating bulk-action bar (selection mode). Seeded
  // with the fallback, then set from the bar's real onLayout so the list
  // reserves the correct space even when the bar grows at large type.
  const [bulkBarHeight, setBulkBarHeight] = useState(BULK_BAR_FALLBACK_HEIGHT);
  // Measured height of the absolute chrome glass pane. null until the first
  // onLayout — the list hides (opacity 0) for that single pass so the top
  // padding never visibly jumps from the fallback estimate to the real value.
  const [chromeHeight, setChromeHeight] = useState<number | null>(null);
  // Drives the FlagCard action row's deliberate 1-row → 2-row reflow. Computed
  // ONCE here (not per-card) so the whole list shares a single Dimensions
  // subscription instead of N. A narrow device OR large Dynamic Type tips the
  // four triage buttons from a tidy tiered row to a controlled stack — never a
  // ragged wrap. Threshold: ≤375pt or ≥1.15× type stacks — an exactly-375pt
  // device at 1.1–1.29× type used to take the single-row path and clip
  // "Resolved" against the pill curvature (sweep M16).
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const compactActions = isCompactLayout(windowWidth, fontScale);
  // F4 — the one recomposition threshold, shared with Home, the map bar and
  // FlagCard so the app changes shape all at once rather than screen by screen.
  const axRecompose = isAxRecompose(fontScale);
  // At double text size the banner is no longer a slim pointer at the top of
  // the list: it is a paragraph, and it is a paragraph ABOUT the card directly
  // beneath it, because the nearest open barrier sorts first. So it stands
  // down and gives the screen back to the thing it was pointing at. Nothing is
  // lost — the same flag, with the same distance, is the next thing on screen.
  const bannerStandsDown = fontScale >= BANNER_STAND_DOWN_SCALE;
  // Top reserve for content scrolling BENEATH the absolute chrome glass pane
  // (mockup: padding-top = chrome height + 10). Fallback only seeds the first,
  // hidden layout pass — see chromeHeight above.
  const chromeTopPad = (chromeHeight ?? CHROME_FALLBACK_HEIGHT + insets.top) + 10;
  const {
    flags: providerFlags,
    flagsMap,
    loading,
    error: flagsError,
    refresh,
    loadMore,
    loadingMore,
    hasMore,
    patchFlag,
    removeFlag,
    isOfflineCache,
    offlineCachedAt,
  } = useFlags();
  // Extract userId early so it's available for derived values below.
  const userId = user?.id;

  // Triage view = only open + verified, no matter what the provider holds.
  const flags = useMemo(
    () => providerFlags.filter((f) => TRIAGE_STATUSES.includes(f.status)),
    [providerFlags],
  );

  // "Mine only" toggle — when true, shows only the current user's submitted
  // flags. Persisted device-wide via AsyncStorage so the preference survives
  // app restarts. Hydrated from disk in an effect (same pattern as sortMode).
  const [mineOnly, setMineOnly] = useState(false);
  // Guard: chips are disabled until the stored value has loaded. Without this,
  // a tap before hydration completes would be overwritten by the effect's
  // setMineOnly(saved) call, silently reverting the user's choice.
  const [mineOnlyHydrated, setMineOnlyHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void loadScope().then((saved) => {
      if (!cancelled) {
        setMineOnly(saved);
        setMineOnlyHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const handleScopeChange = useCallback((next: boolean) => {
    setMineOnly(next);
    // Fire-and-forget — saveScope fails-soft with a console.warn.
    void saveScope(next);
  }, []);

  // Category quick-filter. null = all categories. Session-only (not
  // persisted) so the filter resets when the user leaves and returns to
  // the tab — keeps triage intent explicit and avoids stale state after
  // new flags arrive.
  const [categoryFilter, setCategoryFilter] = useState<FlagCategory | null>(null);
  const handleCategoryChange = useCallback((cat: FlagCategory | null) => {
    setCategoryFilter(cat);
    const label = cat ? CATEGORY_LABELS[cat] : 'all categories';
    AccessibilityInfo.announceForAccessibility(`Showing ${label}`);
  }, []);

  // Free-text quick search. Delegates to the shared searchFlags() helper
  // (same as NearbyFlagsModal): case-insensitive substring match across
  // description + category label + status label, with AND semantics
  // across whitespace-separated tokens. Session-only — resets on tab
  // unmount, matching the rest of the Tasks filters.
  const [searchText, setSearchText] = useState('');
  // D3/C3: the consolidated filter sheet's open state.
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // The ⋯ tool sheet. Holds the controls that are neither the search nor the
  // filters — today "Select multiple", and "Clear filters" while one is active.
  const [toolSheetOpen, setToolSheetOpen] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchText(searchText), 250);
    return () => clearTimeout(t);
  }, [searchText]);

  // Sort mode — applied within each section. Persisted device-wide via
  // AsyncStorage so a refresh / app-restart keeps the user's last choice.
  // Hydrated from disk in an effect so first paint matches the default
  // (otherwise we'd flash 'newest' and snap to the saved value).
  const [sortMode, setSortMode] = useState<TasksSort>(DEFAULT_TASKS_SORT);
  useEffect(() => {
    let cancelled = false;
    void loadTasksSort().then((saved) => {
      if (!cancelled) setSortMode(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const handleSortChange = useCallback((next: TasksSort) => {
    setSortMode(next);
    // Fire-and-forget — saveTasksSort fails-soft with a console.warn.
    // No deps needed; saveTasksSort is a pure function.
    void saveTasksSort(next);
  }, []);

  // Apply the mine-only, category, and free-text filters on top of the triage
  // filter so sections always reflect exactly what the list renders.
  const displayFlags = useMemo(() => {
    let out = flags;
    if (mineOnly && userId) out = out.filter((f) => f.user_id === userId);
    if (categoryFilter) out = out.filter((f) => f.category === categoryFilter);
    out = searchFlags(out, debouncedSearchText);
    return out;
  }, [flags, mineOnly, userId, categoryFilter, debouncedSearchText]);

  // Group the visible flags by status so the SectionList can show "Open"
  // and "Verified" as distinct sections. Sections with zero rows are
  // omitted entirely (no orphaned headers). Order: Open first because
  // it's the higher-attention triage state.
  //
  // `sortMode` re-orders WITHIN each section so the Open-first layout is
  // preserved — sorting across the whole list would let an old, severity-5
  // Verified flag jump above a fresh Open report.
  const sections = useMemo(() => {
    const open = sortFlags(
      displayFlags.filter((f) => f.status === 'open'),
      sortMode,
    );
    const verified = sortFlags(
      displayFlags.filter((f) => f.status === 'verified'),
      sortMode,
    );
    const out: { title: string; data: FlagRow[] }[] = [];
    if (open.length > 0) out.push({ title: 'Open', data: open });
    if (verified.length > 0) out.push({ title: 'Verified', data: verified });
    return out;
  }, [displayFlags, sortMode]);

  // WCAG 4.1.3: announce result count when the debounced search query changes
  // so AT users hear how many flags match without swiping through the list.
  // Only fires on a non-empty query — clearing search is silent, the list
  // just expands and the section headers speak for themselves. Dep on
  // `debouncedSearchText` only is intentional; other filter axes announce
  // themselves via handleCategoryChange / handleScopeChange.
  useEffect(() => {
    const q = debouncedSearchText.trim();
    if (!q) return;
    const count = displayFlags.length;
    AccessibilityInfo.announceForAccessibility(
      count === 0
        ? 'No flags match your search.'
        : `${count} flag${count === 1 ? '' : 's'} match your search.`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchText]);

  // One-shot location fetch so each card can show "0.3 km · 4 min walk".
  // Graceful degrade: if the user denies permission (or we error) we just
  // render the card without distance — see FlagCard below.
  const { location: userLocation } = useUserLocation({
    requireExistingPermission: true,
  });

  // UX #3 "Suggested next action": the single nearest OPEN barrier to the
  // user, computed from the already-loaded `displayFlags` + `userLocation`.
  // Presentation-only — no fetch, no location request beyond the one-shot
  // `useUserLocation()` already wired above. Returns null when location is
  // unknown or there are no open flags, so the banner renders nothing rather
  // than a placeholder (see ListHeaderComponent below). Restricted to OPEN
  // (not open+verified) because the banner copy says "Nearest open barrier".
  const nearestOpenHit = useMemo(() => {
    if (!userLocation) return null;
    return findNearestUnresolved(
      displayFlags.filter((f) => f.status === 'open'),
      userLocation,
    );
  }, [displayFlags, userLocation]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // Flash tone: 'success' = the green "+points" reward pill (default, every
  // existing caller). 'muted' = a neutral dark pill for non-reward notices
  // like "couldn't refresh", so an error doesn't masquerade as a reward.
  const [flashTone, setFlashTone] = useState<'success' | 'muted'>('success');
  const [selectedFlag, setSelectedFlag] = useState<FlagRow | null>(null);

  // Bulk-select state — component-local on purpose. Switching tabs unmounts
  // TasksScreen which resets the selection (matches the brief: "resets on
  // tab change"). Pure helpers live in src/lib/taskSelection.ts.
  const [selection, setSelection] = useState<TaskSelectionState>(EMPTY_SELECTION);
  // Tracks whether a bulk action is currently running so we can disable
  // the floating bar's buttons and avoid double-submits.
  const [bulkBusy, setBulkBusy] = useState(false);
  // Synchronous re-entry guard (F4). The bulk buttons' `disabled` reads the
  // `bulkBusy` STATE, which doesn't flip until React re-renders — and
  // runBulkAction awaits confirm() (a dialog) before setBulkBusy(true), so a
  // rapid second tap could start a second concurrent bulk run. This ref is set
  // synchronously before the dialog so the second tap bails.
  const bulkBusyRef = useRef(false);

  // How many of the currently selected ids are still 'open'? Drives whether
  // the "Verify N" button is enabled — verifying a flag that's already
  // verified is a no-op and would just spend RTTs. Recomputed from the
  // current displayFlags so a stale id (deleted, filtered) doesn't count.
  const selectedOpenCount = useMemo(() => {
    if (!selection.active || selection.selectedIds.length === 0) return 0;
    let n = 0;
    for (const id of selection.selectedIds) {
      const flag = flagsMap.get(id);
      if (flag && flag.status === 'open') n += 1;
    }
    return n;
  }, [selection, flagsMap]);

  // F39 (re-sweep): selected ids whose flag still EXISTS in the store. A
  // selected flag can vanish underneath the selection (realtime delete, admin
  // remove, another user resolving it out of the filter) — counting those
  // ghosts inflated the bar's "N selected" and let bulk Watch persist dead
  // ids to the watched list.
  const liveSelectedCount = useMemo(() => {
    if (!selection.active || selection.selectedIds.length === 0) return 0;
    let n = 0;
    for (const id of selection.selectedIds) {
      if (flagsMap.has(id)) n += 1;
    }
    return n;
  }, [selection, flagsMap]);

  // Announce the selection bar's appearance once, when it first becomes
  // visible. Skipping the announcement on every count change keeps SR
  // chatter down — each card already announces its own checked/unchecked
  // state via accessibilityState.
  const announcedBarRef = useRef(false);
  useEffect(() => {
    if (user && selection.active && !announcedBarRef.current) {
      announcedBarRef.current = true;
      AccessibilityInfo.announceForAccessibility(
        `Selection mode. ${selectionCount(selection)} selected.`,
      );
    } else if (!user || !selection.active) {
      announcedBarRef.current = false;
    }
  }, [user, selection]);

  const exitSelection = useCallback(() => {
    setSelection((s) => clearSelection(s));
  }, []);

  // Authentication can disappear while Tasks is mounted (sign-out from the
  // drawer or session removal). Guest presentation must never inherit a stale
  // bulk-review state or an already-open tool sheet that only held Select.
  useEffect(() => {
    if (user) return;
    exitSelection();
    setToolSheetOpen(false);
  }, [user, exitSelection]);

  // Clear selection on tab blur — without this, leaving Tasks mid-selection
  // and coming back leaves the user staring at a stale selection bar with
  // old ids (some of which may have been resolved/deleted in the meantime).
  // Empty dep array on the inner callback because `setSelection` is stable
  // and we only need it to fire once per focus cycle.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelection((s) => clearSelection(s));
      };
    }, []),
  );

  // Long-press anywhere on a card enters selection mode with that card
  // already picked. If we're already in selection mode, long-press just
  // toggles (mirrors the tap behavior so muscle memory works either way).
  const handleCardLongPress = useCallback((flag: FlagRow) => {
    if (!user) return;
    hapticSelection();
    setSelection((s) => (s.active ? toggleId(s, flag.id) : enterSelectionWith(flag.id)));
  }, [user]);

  // SR-accessible entry into selection mode — a button at the top of the
  // screen because long-press is hard to discover (and hard to perform)
  // with a screen reader. Starts the selection empty so SR users can pick
  // cards via the checkbox role we wire up below.
  const enterSelectionEmpty = useCallback(() => {
    if (!user) return;
    hapticSelection();
    setSelection({ active: true, selectedIds: [] });
    AccessibilityInfo.announceForAccessibility('Selection mode. Tap cards to select.');
  }, [user]);

  // Track the flash-banner timer in a ref so we can cancel it on unmount or
  // when a new flash arrives — otherwise leaving the tab mid-flash triggers
  // a "setState on unmounted component" warning.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * A11Y-205 (WCAG 4.1.3): the flash pill is a STATUS MESSAGE, so every flash
   * announces by default — it is not enough for the sighted eye to catch it.
   * This used to be opt-in per call site, and the branches nobody remembered
   * to wire were silent to screen readers: bulk-watch when everything was
   * already watched, and both post-action refresh-reconcile failures (the
   * user acts, and the failure notice never reaches them).
   *
   * Announcing HERE rather than at each call site means a future flash cannot
   * be silent by omission. Pass `{ announce: false }` only when the caller
   * speaks a richer sentence of its own.
   */
  const showFlash = useCallback(
    (msg: string, tone: 'success' | 'muted' = 'success', opts?: { announce?: boolean }) => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setFlash(msg);
      setFlashTone(tone);
      flashTimer.current = setTimeout(() => setFlash(null), 2200);
      if (opts?.announce !== false) AccessibilityInfo.announceForAccessibility(msg);
    },
    [],
  );

  // Reward pill entrance — a gentle slide-down + fade when a flash appears,
  // reduced-motion gated (snaps to rest under Reduce Motion). Resets per flash.
  const reducedMotion = useReducedMotion();
  const flashAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flash) return;
    if (reducedMotion) {
      flashAnim.setValue(1);
      return;
    }
    flashAnim.setValue(0);
    Animated.spring(flashAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...motion.spring.sheet,
    }).start();
  }, [flash, reducedMotion, flashAnim]);

  // Run a bulk action (verify or resolve) across the current selection.
  // Iterates and calls updateFlagStatus per id — keeps the code simple and
  // matches the existing single-card flow's optimistic-then-refresh shape.
  // Errors on individual rows surface as an Alert at the end with a count.
  // Declared AFTER showFlash so the closure binds to its real value.
  const runBulkAction = useCallback(
    async (action: 'verify' | 'resolve') => {
      // F4: bail on a rapid second tap. The dialog (await confirm) opens a
      // window where the state-based button `disabled` hasn't flipped yet.
      if (bulkBusyRef.current) return;
      // R-2 / SR-093, the THIRD caller — found while writing the guard for the
      // other two. Selection mode is reachable as a guest, so a bulk verify
      // fired one RLS-denied write PER SELECTED FLAG and then reported them as
      // a list of raw failure strings. Same gate, ahead of the confirm: there
      // is no point asking a guest to confirm N actions they cannot take.
      if (!user) {
        notify('Sign in required', 'Please sign in to verify or resolve flags.');
        return;
      }
      const targetStatus: FlagStatus = action === 'verify' ? 'verified' : 'resolved';
      const ids = selection.selectedIds.slice();
      // For 'verify' we skip anything not in 'open' (already-verified
      // flags would be a no-op). For 'resolve' we accept both open + verified.
      const targetIds = ids.filter((id) => {
        const flag = flagsMap.get(id);
        if (!flag) return false;
        if (action === 'verify') return flag.status === 'open';
        return flag.status === 'open' || flag.status === 'verified';
      });
      if (targetIds.length === 0) {
        exitSelection();
        return;
      }
      bulkBusyRef.current = true;
      try {
        const verb = action === 'verify' ? 'Verify' : 'Resolve';
        const ok = await confirm(
          `${verb} ${targetIds.length} flag${targetIds.length === 1 ? '' : 's'}?`,
          action === 'verify'
            ? 'Marks each selected flag as verified.'
            : 'Marks each selected flag as resolved.',
          verb,
          action === 'resolve',
        );
        if (!ok) return;

        setBulkBusy(true);
        let succeeded = 0;
        const failures: string[] = [];
        for (const id of targetIds) {
          try {
            // F53: CAS on the status the list showed for this row.
            const fromStatus = flagsMap.get(id)?.status;
            const updated = await updateFlagStatus(id, targetStatus, fromStatus);
            // COR-4: log the PRE-CAS status — after a successful CAS,
            // updated.status === targetStatus is always true, so the old
            // ternary tautologically reported 'open' for every bulk action.
            track('flag_status_changed', { flagId: id, from: fromStatus ?? 'open', to: targetStatus });
            if (action === 'verify') {
              // Verify keeps the flag visible (status becomes 'verified'),
              // so patch the store with the new row.
              patchFlag(id, { ...updated });
            } else {
              // Resolve removes it from the triage queue.
              removeFlag(id);
            }
            succeeded += 1;
          } catch (e) {
            failures.push(errorMessage(e));
          }
        }
        setBulkBusy(false);
        // Reconcile with the server — covers the gap between our optimistic
        // updates and the actual committed state (e.g. another user resolved
        // one of the same flags). The optimistic updates already gave instant
        // feedback; if the reconcile fails, nudge the user to pull-to-refresh
        // instead of silently swallowing it.
        refresh().catch(() => showFlash("Couldn't refresh — pull down to update.", 'muted'));

        const past = action === 'verify' ? 'Verified' : 'Resolved';
        if (succeeded > 0) {
          showFlash(`${past} ${succeeded} flag${succeeded === 1 ? '' : 's'}`);
        }
        if (failures.length > 0) {
          notify(
            `Could not ${action} ${failures.length} flag${failures.length === 1 ? '' : 's'}`,
            failures[0] ?? 'Unknown error',
          );
        }
        exitSelection();
      } finally {
        bulkBusyRef.current = false;
      }
    },
    [selection, flagsMap, patchFlag, removeFlag, refresh, exitSelection, showFlash, user],
  );

  // Bulk-watch — adds every currently-selected id to the user's Watched
  // list in one shot. Useful when triaging a clump of related flags
  // ("watch all of these for status changes") without leaving the
  // SectionList. Delegates to addWatchedBulk so the FIFO eviction and
  // dedupe live in one place.
  const runBulkWatch = useCallback(async () => {
    if (bulkBusyRef.current) return; // F4: same re-entry guard as runBulkAction
    if (!user) {
      notify('Sign in required', 'Please sign in to watch flags.');
      return;
    }
    // F64 (second sweep, revising F39): do NOT filter watch targets through
    // flagsMap — a flag that left the store snapshot may have merely been
    // resolved out of the default statuses (still real, still watchable; the
    // user explicitly selected it). Genuinely deleted ids self-heal: the
    // MyWatched prune (F45) removes them on its next load.
    const ids = selection.selectedIds.slice();
    if (ids.length === 0) {
      exitSelection();
      return;
    }
    bulkBusyRef.current = true;
    setBulkBusy(true);
    try {
      const { added, alreadyWatched, dropped } = await addWatchedBulk(user.id, ids);
      if (added === 0 && alreadyWatched > 0) {
        showFlash(
          alreadyWatched === 1
            ? 'Already watching that flag'
            : `Already watching all ${alreadyWatched} flags`,
        );
      } else if (added > 0) {
        // Compose a single-line summary so the screen-reader announcement
        // matches the visible flash. Mentions the eviction when it
        // happened (rare but the user should know).
        const parts: string[] = [`Watching ${added} flag${added === 1 ? '' : 's'}`];
        if (alreadyWatched > 0) parts.push(`${alreadyWatched} already watched`);
        if (dropped > 0) parts.push(`${dropped} oldest dropped`);
        const msg = parts.join(', ');
        showFlash(msg);
      }
    } catch (e) {
      notify("Couldn't update your watched list", errorMessage(e)); // F64: must render on web
    } finally {
      bulkBusyRef.current = false;
      setBulkBusy(false);
      exitSelection();
    }
  }, [user, selection, exitSelection, showFlash]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  // NOTE: the Tasks tab badge has ONE writer — RootNavigator's store-derived
  // count (open-only, capped 99). TasksScreen deliberately does NOT set
  // tabBarBadge: a second writer here (open+verified, uncapped) disagreed with
  // that value and, worse, only applied once this screen mounted — so the badge
  // changed meaning mid-transition (badge 9 while the list header read OPEN 6).
  // One writer, one definition, identical before/during/after every tab cut.

  // T9 (F5-05): the tap-to-retry banner copy is now single-sourced in copy.ts
  // (failureBannerText) — this screen's original inline recipe, extracted so
  // Home / Map / Tasks route ONE failure register instead of three dialects.
  // The helper appends the retry verb unless the provider message already carries it.
  const errorBannerText = useMemo(
    () => (flagsError ? failureBannerText(flagsError) : null),
    [flagsError],
  );

  // Trigger lives in supabase/schema.sql (handle_flag_status_change, ~line 75).
  // Reporter ALWAYS gets the reporter bonus (10 verify / 15 resolve).
  // Actor gets the actor bonus (3 verify / 7 resolve) ONLY when actor != reporter.
  // So if you triage your own flag, you earn the reporter bonus only — keep this
  // mapping in sync with the trigger if the values ever change.
  const applyStatusChange = useCallback(
    (updated: FlagRow, action: DetailAction, isOwn: boolean) => {
      // T4 (F1-08): the commit landed — a medium impact for committing real
      // state, then a success notify for the outcome, so triage FEELS like a
      // commit rather than a form. This is the shared commit point for every
      // action (verify/resolve/reject) and both callers (this card + the
      // FlagDetailModal via onChanged); it is reached only AFTER
      // updateFlagStatus resolves, and for Reject only after its confirm gate.
      hapticImpact('medium');
      hapticNotify('success');
      // Optimistic update via the shared store: replace the row in-place for
      // verify (status changes but flag stays visible) and reopen (it
      // re-enters the queue; the reconcile refresh below fills it in if the
      // store didn't hold the resolved row), remove it for resolve/reject
      // (it leaves the triage queue).
      if (action === 'verify' || action === 'reopen' || action === 'restore') {
        patchFlag(updated.id, { ...updated });
      } else {
        removeFlag(updated.id);
      }
      if (action === 'reopen') {
        // No points flash: the trigger awards nothing for resolved→open.
        showFlash('Flag reopened');
      } else if (action === 'restore') {
        // MOD1: admin-only rejected→open. Not reachable from this screen today
        // (TRIAGE_STATUSES excludes 'rejected', so this card's own modal can
        // never show Restore) — handled here anyway so this callback stays
        // correct if that ever changes, rather than silently mis-filing a
        // restored flag as a removal.
        showFlash('Flag restored');
      } else if (action === 'verify') {
        const msg = isOwn
          ? `Verified! +${POINTS.reporter.verify} points`
          : `Verified! +${POINTS.actor.verify} points`;
        // WCAG 4.1.3: showFlash announces (see its docblock) — single-card
        // triage through this path was once silent to SR.
        showFlash(msg);
      } else if (action === 'resolve') {
        const msg = isOwn
          ? `Resolved! +${POINTS.reporter.resolve} points`
          : `Resolved! +${POINTS.actor.resolve} points`;
        showFlash(msg);
      }
      // Re-fetch via the shared store to reconcile with what the server
      // actually committed. The optimistic update already gave instant
      // feedback; if the reconcile fails, nudge the user to pull-to-refresh
      // instead of silently swallowing it. The refresh also updates the Map
      // tab's pin count through the shared context.
      refresh().catch(() => showFlash("Couldn't refresh — pull down to update.", 'muted'));
    },
    [refresh, patchFlag, removeFlag, showFlash],
  );

  const setStatus = useCallback(
    async (id: string, status: FlagStatus, isOwn: boolean) => {
      // R-2 / SR-093, the second caller. Same defect as FlagDetailModal's: a
      // guest tap fired a real, RLS-refused write to production and came back
      // with the FALSE "This flag changed" notify below, because zero rows is
      // indistinguishable from a concurrent edit. Stop before the write and say
      // the true thing. Confirm gates are below this on purpose — there is no
      // point asking a guest to confirm an action they cannot take.
      if (!user) {
        notify('Sign in required', 'Please sign in to verify or resolve flags.');
        return;
      }
      // Reject removes a report from the queue — confirm first, matching the
      // destructive-confirm tier (bulk actions, FlagDetailModal Delete/Reject).
      // confirm() is web-safe: window.confirm on web, Alert.alert on native.
      if (status === 'rejected') {
        const ok = await confirm(
          'Reject this flag?',
          'This marks the report as invalid or spam and removes it from your queue.',
          'Reject',
          true,
        );
        if (!ok) return;
      }
      setBusyId(id);
      try {
        // F53: CAS on the status the card showed — a stale card tap must not
        // silently overwrite a concurrent change (and the '+points' flash
        // only fires for transitions the trigger actually awards).
        const updated = await updateFlagStatus(id, status, flagsMap.get(id)?.status);
        const action: DetailAction =
          status === 'verified' ? 'verify' : status === 'resolved' ? 'resolve' : 'reject';
        applyStatusChange(updated, action, isOwn);
      } catch (e) {
        // T4 (F1-08): the outcome half on the failure path — one error notify
        // covering both the conflict and generic branches.
        hapticNotify('error');
        if (e instanceof FlagStatusConflictError) {
          notify('This flag changed', 'It was updated by someone else just now — refreshing the list.');
          refresh().catch(() => {});
        } else {
          notify("Couldn't update this flag", errorMessage(e));
        }
      } finally {
        setBusyId(null);
      }
    },
    [applyStatusChange, flagsMap, refresh, user],
  );

  const handleViewOnMap = useCallback(
    (target: FlagRow) => {
      navigation.navigate('FullMap', {
        focusFlag: { id: target.id, lat: target.lat, lng: target.lng },
        ts: Date.now(),
      });
    },
    [navigation],
  );

  const handleDeleted = useCallback(
    (deletedId: string) => {
      removeFlag(deletedId);
      // WCAG 4.1.3: showFlash announces (see its docblock).
      showFlash('Flag deleted');
    },
    [removeFlag, showFlash],
  );

  const showDetails = useCallback((flag: FlagRow) => {
    setSelectedFlag(flag);
  }, []);

  const handleCardSignInToReview = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  // iOS does not safely hand navigation to another tab until the presented
  // detail modal has finished dismissing. Other platforms do not emit
  // Modal.onDismiss, so they spend the same handoff after interactions settle.
  const pendingDetailSignInRef = useRef(false);
  const detailSignInTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const completeDetailSignIn = useCallback(() => {
    if (!pendingDetailSignInRef.current) return;
    pendingDetailSignInRef.current = false;
    navigation.navigate('Profile');
  }, [navigation]);
  const handleDetailSignInToReview = useCallback(() => {
    pendingDetailSignInRef.current = true;
    setSelectedFlag(null);
    if (Platform.OS !== 'ios') {
      detailSignInTaskRef.current?.cancel();
      detailSignInTaskRef.current = InteractionManager.runAfterInteractions(
        completeDetailSignIn,
      );
    }
  }, [completeDetailSignIn]);
  useEffect(
    () => () => {
      detailSignInTaskRef.current?.cancel();
    },
    [],
  );

  // Stable tap handler, hoisted out of renderFlagItem. Inline, its identity would
  // change on every selection toggle (renderFlagItem depends on `selection`),
  // handing a fresh onPress to every FlagCard and defeating its React.memo.
  // Depending on `selection.active` (a boolean) instead of the whole `selection`
  // object keeps it stable while toggling cards within select mode.
  const handleCardPress = useCallback(
    (flag: FlagRow) => {
      if (user && selection.active) {
        hapticSelection();
        setSelection((s) => toggleId(s, flag.id));
      } else {
        track('flag_viewed', { flagId: flag.id, source: 'tasks' });
        handleViewOnMap(flag);
      }
    },
    [user, selection.active, handleViewOnMap],
  );

  // Memoized renderItem — extracted from inline JSX so React.memo on FlagCard
  // actually fires. An inline arrow in the SectionList prop creates a new
  // function reference on every parent render, bypassing memo and causing all
  // visible cards to re-check their props even when nothing changed.
  // F40/F41, named. The gold celebration belongs to a genuinely empty,
  // fully-loaded, unfiltered list — never to a failed load, a filtered page, or
  // a page with more to come. The condition was spelled out twice inline
  // (once for the disc tint, once for the glyph); it is one name now.
  const isCaughtUp = !flagsError && !categoryFilter && !searchText.trim() && !hasMore;

  const renderFlagItem = useCallback(
    ({ item }: { item: FlagRow }) => (
      <TaskCard
        flag={item}
        isBusy={busyId === item.id}
        isOwn={item.user_id === userId}
        userLocation={userLocation}
        canReview={!!user}
        isAdmin={isAdmin === true}
        selectionActive={!!user && selection.active}
        selected={!!user && isSelected(selection, item.id)}
        compactActions={compactActions}
        onPress={handleCardPress}
        onLongPress={user ? handleCardLongPress : undefined}
        onSetStatus={setStatus}
        onShowDetails={showDetails}
        onSignInToReview={handleCardSignInToReview}
      />
    ),
    [
      busyId,
      userId,
      userLocation,
      user,
      isAdmin,
      selection,
      compactActions,
      handleCardPress,
      handleCardLongPress,
      setStatus,
      showDetails,
      handleCardSignInToReview,
    ],
  );

  // Load-more handler shared by the button (screen-reader / keyboard) and any
  // future scroll-triggered path. Surfaces errors as an Alert so the user has
  // a clear retry path.
  // D3/C3: is anything actually FILTERING the list right now? Sort is
  // deliberately excluded — it is an ORDER, not a filter, so "Clear filters"
  // must never silently reset the ordering the user chose.
  const tasksFiltersActive = mineOnly || categoryFilter !== null || debouncedSearchText !== '';
  const handleClearFilters = useCallback(() => {
    handleScopeChange(false);
    handleCategoryChange(null);
    setSearchText('');
  }, [handleScopeChange, handleCategoryChange]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadMore().catch((e: unknown) => {
      notify('Could not load more flags', errorMessage(e, 'Unknown error'));
    });
  }, [hasMore, loadingMore, loadMore]);

  // First load with nothing cached → content-shaped skeletons render in the
  // list's place UNDER the chrome pane (mockup loading state), instead of the
  // old bare headerless early-return.
  const initialLoading = loading && flags.length === 0;

  return (
    <View style={styles.screen}>
      <ScreenStage />
      {/* The chrome — ONE absolute i=24 glass pane carrying the whole header
          zone (title, notices, select-entry, search, chips, sort). The list
          scrolls BENEATH it (onLayout feeds the list's top reserve). Pills and
          chips inside are engineered tints — the pane blurs, the chip tints
          (GLASS.md blur-budget law). Rendered before the list so VoiceOver
          reads the header first; zIndex keeps it painted on top. */}
      <GlassSurface
        variant="chrome"
        borderRadius={0}
        style={[styles.chromePane, { paddingTop: insets.top }]}
        onLayout={(e) => setChromeHeight(e.nativeEvent.layout.height)}
      >
      {/* Editorial header (Phase 13) — headerless like Home, menu + Feedback folded in. */}
      <ScreenHeader
        eyebrow="TASKS"
        title="Review barriers"
        // D3/C2: the subtitle retires. "Review barriers" already says what the
        // screen is for, so the second line was restating the title in smaller
        // type — 16pt of a header that was 53% of the display.
        //
        // The `TASKS` eyebrow deliberately STAYS (Sky's A-4 pick). It is not
        // decoration: the all-caps eyebrow is the editorial voice this app
        // speaks on every screen — Home carries NEARBY / LATEST above its own
        // title — and dropping it here alone would make Tasks a different
        // family member. It costs 18pt, about a tenth of a card. Worth it.
        titleSize={30}
        // BP12 (T6): Tasks' top chrome is the whole composite glass pane (title +
        // search + chips + sort, measured as chromeHeight), not this title block
        // — so opt out of publishing a ledge height. The status pill keeps its
        // default placement here and the inline points flash stays byte-identical.
        publishLedge={false}
        eyebrowColor={color.inkGlassMuted}
        subtitleColor={color.inkGlassMuted}
        actions={
          <>
            <Pressable
              // D2/C3: inline hamburger (this one sits on glass with its own
              // fill, so it never joined the shared HeaderActions cluster) —
              // registers itself as the drawer's focus-return target.
              ref={menuTrigger.ref}
              onPress={() => {
                menuTrigger.register();
                drawer.setOpen(true);
              }}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              hitSlop={8}
            >
              <Menu size={22} color={color.headerFg} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              onPress={() => setSharedModal('feedback')}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Send feedback"
              accessibilityHint="Opens a form to email feedback to the Flagstone owner"
              hitSlop={8}
            >
              <MessageSquare size={20} color={color.headerFg} strokeWidth={2.2} />
            </Pressable>
          </>
        }
      />
      {errorBannerText && (
        <Pressable
          onPress={() => {
            refresh().catch(() => {});
          }}
          disabled={loading}
          style={({ pressed }) => [
            styles.errorBanner,
            loading && styles.errorBannerBusy,
            pressed && styles.errorBannerPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={errorBannerText}
          accessibilityHint="Tries to load flags again"
          {...a11yToggle({ busy: loading })}
          accessibilityLiveRegion="polite"
        >
          {loading ? (
            <ActivityIndicator color={color.textOnBrand} />
          ) : (
            <AlertTriangle size={18} color={color.textOnBrand} strokeWidth={2.2} />
          )}
          <AppText variant="body" style={styles.errorBannerText} numberOfLines={2}>
            {loading ? 'Retrying…' : errorBannerText}
          </AppText>
        </Pressable>
      )}
      {isOfflineCache && (
        <View
          style={styles.offlineBanner}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel={offlineBannerText(offlineCachedAt)}
        >
          <WifiOff size={16} color={color.warningFg} strokeWidth={2} />
          <AppText variant="body" style={styles.offlineBannerText}>{offlineBannerText(offlineCachedAt)}</AppText>
        </View>
      )}
      {/* THE CONTROL PANE, COMPACTED (board 09). It used to be two rows: a
          search row with "Select multiple" on its trailing edge, and a second
          row holding a "Filter & sort" chip with nothing beside it (plus
          "Clear filters" when one was active). That is 124pt of chrome spent on
          three controls, on a screen whose header already ate more than half
          the display and where the first card started 65% of the way down.

          It is one row now — the map's pattern: a search pill that takes the
          width, and two 44pt circles beside it. The words are not lost:
          "Filter & sort" is the sheet's own title, and "Select multiple" keeps
          its label, hint and handler byte-identical inside the ⋯ sheet.

          The clear-search ✕ still belongs to the textbox row so it stays a
          single predictable target, and the row still wraps (T5/D24) so the
          circles drop to their own line rather than squeezing the field. */}
      {flags.length > 0 && (
        <View style={styles.searchRow}>
          {/* The magnifier is what carries the field's meaning once the
              placeholder is gone at large type. Decorative: the TextInput
              beside it owns the accessible name in both states. */}
          <View style={styles.searchField}>
            <Search
              size={18}
              color={color.glassPlaceholder}
              strokeWidth={2.2}
              {...decorativeProps}
            />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              // Icon-only at the recomposition point: at large type the
              // placeholder is the longest string in the chrome and it truncated
              // mid-word. The field keeps its width and its function; only the
              // hint text goes, and `accessibilityLabel` still names it, so
              // nothing is lost to a screen reader or to voice control.
              placeholder={axRecompose ? '' : 'Search by description or category…'}
              placeholderTextColor={color.glassPlaceholder}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={styles.searchInput}
              accessibilityLabel="Search flags"
              accessibilityHint="Filter the list by matching description or category"
            />
            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText('')}
                style={({ pressed }) => [styles.searchClearBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={18} color={color.textMuted} strokeWidth={2.2} />
              </Pressable>
            )}
          </View>
          {/* The filter circle. Same sheet, same handler, same expanded state
              as the chip it replaces; the active fill moves from a chip's
              background to the circle's, which is the map's grammar. */}
          <Pressable
            onPress={() => { setToolSheetOpen(false); setFilterSheetOpen(true); }}
            style={({ pressed }) => [
              styles.filterTriggerBtn,
              tasksFiltersActive && styles.filterTriggerBtnActive,
              !tasksFiltersActive && pressed && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filter and sort"
            accessibilityHint="Opens filter and sort options"
            {...a11yToggle({ expanded: filterSheetOpen })}
          >
            <SlidersHorizontal
              size={19}
              color={tasksFiltersActive ? color.textOnBrand : color.glassChipInk}
              strokeWidth={2.2}
            />
          </Pressable>
          {/* The ⋯ circle mounts only when its sheet would hold something. The
              two rows inside it are gated — "Select multiple" on not already
              selecting, "Clear filters" on something actually filtering — and
              a ⋯ that opens an empty drawer is worse than no ⋯ at all. */}
          {((!!user && !selection.active) || tasksFiltersActive) && (
            <Pressable
              onPress={() => { setFilterSheetOpen(false); setToolSheetOpen(true); }}
              style={({ pressed }) => [styles.toolTriggerBtn, pressed && styles.chipPressed]}
              accessibilityRole="button"
              accessibilityLabel="More task tools"
              accessibilityHint={
                user
                  ? 'Select multiple flags, or clear the active filters'
                  : 'Clear the active filters'
              }
              {...a11yToggle({ expanded: toolSheetOpen })}
            >
              <MoreHorizontal size={22} color={color.glassChipInk} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      )}
      {/* An active filter must never be able to hide behind a closed sheet, so
          it is still signalled two independent ways: the filter circle takes
          the active fill, AND this chip mounts. It is the same control it
          always was — same handler, same label, same hint — wearing the ✕ that
          says what tapping it does, and it exists only while something is
          genuinely filtering, so it is never a dead control. Clear is reachable
          from the ⋯ sheet as well, for a user who went looking in the drawer
          rather than at the chip. */}
      {flags.length > 0 && tasksFiltersActive && (
        <View style={styles.filterTriggerRow}>
          <Pressable
            onPress={handleClearFilters}
            style={({ pressed }) => [styles.clearFiltersBtn, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            accessibilityHint="Removes the search text, category and my-flags filters"
          >
            <AppText variant="label" style={styles.clearFiltersText}>Clear filters</AppText>
            <X size={14} color={color.inkSelect} strokeWidth={2.4} {...decorativeProps} />
          </Pressable>
        </View>
      )}
      </GlassSurface>
      {/* D3/C3 — the filter sheet. `glass={false}` is the opaque house modal
          grammar (runtime-proven by ChangelogModal) and costs ZERO against the
          blur budget, so Tasks still owns exactly one live pane.

          Every handler, every accessibility prop and every label inside is
          byte-identical to the rows this replaced. Two things did change, both
          forced by the new container: the category strip WRAPS instead of
          scrolling horizontally (which is a gain — all seven categories are
          visible at once; the strip only ever showed about three), and the chip
          fills take the shipped SOLID pair, because a translucent glass-chip
          fill over an opaque card would be a composite nobody has arbitrated. */}
      <Sheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filter &amp; sort"
        glass={false}
      >
      {/* Mine-only toggle — shown only when signed in. A chip row that
          switches between "All flags" and "My flags" without opening the
          full filter panel. Resets to All when the tab loses focus? No —
          we keep it until the user taps again; it's a deliberate choice. */}
      {userId && (
        <View style={styles.mineToggleRow}>
          <Pressable
            onPress={() => handleScopeChange(false)}
            disabled={!mineOnlyHydrated}
            style={({ pressed }) => [styles.sheetChip, !mineOnly && styles.sheetChipActive, mineOnly && pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel="Show all flags"
            {...a11yToggle({ pressed: !mineOnly, disabled: !mineOnlyHydrated })}
          >
            <AppText variant="label" style={[styles.sheetChipText, !mineOnly && styles.sheetChipTextActive]}>All</AppText>
          </Pressable>
          <Pressable
            onPress={() => handleScopeChange(true)}
            disabled={!mineOnlyHydrated}
            style={({ pressed }) => [styles.sheetChip, mineOnly && styles.sheetChipActive, !mineOnly && pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel="Mine, show only my flags"
            {...a11yToggle({ pressed: mineOnly, disabled: !mineOnlyHydrated })}
          >
            <AppText variant="label" style={[styles.sheetChipText, mineOnly && styles.sheetChipTextActive]}>Mine</AppText>
          </Pressable>
        </View>
      )}
      {/* Category quick-filter — horizontally scrollable chip strip
          beneath the severity row. Always lists every category so the
          strip is stable as flags come and go. Tapping the active chip
          clears it (toggles to All). Session-only — resets with the tab. */}
      {flags.length > 0 && (
        <View style={styles.categoryWrapRow} accessibilityLabel="Filter by category">
          <Pressable
            onPress={() => handleCategoryChange(null)}
            style={({ pressed }) => [styles.sheetChip, categoryFilter === null && styles.sheetChipActive, categoryFilter !== null && pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel="Show all categories"
            {...a11yToggle({ pressed: categoryFilter === null })}
          >
            <AppText variant="label" style={[styles.sheetChipText, categoryFilter === null && styles.sheetChipTextActive]}>
              All
            </AppText>
          </Pressable>
          {CATEGORY_ORDER.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => handleCategoryChange(active ? null : cat)}
                style={({ pressed }) => [styles.sheetChip, active && styles.sheetChipActive, !active && pressed && styles.chipPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${CATEGORY_LABELS[cat]}${active ? ', selected, tap to deselect' : ''}`}
                {...a11yToggle({ pressed: active })}
              >
                <AppText variant="label" style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>
                  {CATEGORY_LABELS[cat]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
      {/* Sort segmented control — sits below the filter rows so the
          user reads "what shows up" → "in what order" top to bottom.
          Hidden when there's nothing to sort (no flags after filtering)
          to keep the chrome tight. */}
      {displayFlags.length >= 2 && (
        <View style={styles.sortRow} accessibilityRole="tablist" accessibilityLabel="Sort order">
          <AppText
            variant="body"
            style={styles.sortLabel} {...decorativeProps}
          >
            Sort:
          </AppText>
          {TASKS_SORT_ORDER.map((mode) => {
            const active = sortMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => handleSortChange(mode)}
                style={({ pressed }) => [styles.sheetSortChip, active && styles.sheetSortChipActive, !active && pressed && styles.chipPressed]}
                accessibilityRole="tab"
                accessibilityLabel={`Sort by ${TASKS_SORT_LABELS[mode]}`}
                {...a11yToggle({ selected: active })}
              >
                <AppText
                  variant="label"
                  style={[styles.sheetSortChipText, active && styles.sheetSortChipTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {TASKS_SORT_LABELS[mode]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
      </Sheet>
      {/* The ⋯ tool sheet. The map's tool-sheet RECIPE — a short column of
          icon + label rows, each its own 44pt control — inside this screen's
          own `Sheet` primitive rather than the map's inline panel, because the
          panel is an overlay in the map's absolute stack and a third shell on
          this screen would break S5. `glass={false}` is the opaque house modal
          grammar and costs nothing against the blur budget, so Tasks still
          owns exactly one live pane.

          "Clear filters" leads when a filter is active: this is the drawer a
          user opens when they went looking for the control rather than
          noticing the chip above. */}
      <Sheet
        visible={toolSheetOpen && (!!user || tasksFiltersActive)}
        onClose={() => setToolSheetOpen(false)}
        title="Task tools"
        glass={false}
      >
        {tasksFiltersActive && (
          <PressableScale
            onPress={() => { setToolSheetOpen(false); handleClearFilters(); }}
            style={styles.toolRow}
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            accessibilityHint="Removes the search text, category and my-flags filters"
          >
            <X size={20} color={color.text} strokeWidth={2.2} {...decorativeProps} />
            <AppText variant="label" style={styles.toolRowText}>Clear filters</AppText>
          </PressableScale>
        )}
        {/* The gate is the one it always had: a non-empty list (the ⋯ circle
            is inside that wrapper) AND not already selecting. Re-entering
            selection mode from here would call enterSelectionEmpty and silently
            drop the selection the user had already built. */}
        {!!user && !selection.active && (
          <PressableScale
            onPress={() => { setToolSheetOpen(false); enterSelectionEmpty(); }}
            style={styles.toolRow}
            accessibilityRole="button"
            accessibilityLabel="Select multiple"
            accessibilityHint="Enter selection mode to verify or resolve multiple flags at once"
          >
            <ListChecks size={20} color={color.text} strokeWidth={2.2} {...decorativeProps} />
            <AppText variant="label" style={styles.toolRowText}>Select multiple</AppText>
          </PressableScale>
        )}
      </Sheet>
      {/* Points/notice flash — floats over the chrome (zIndex above the pane),
          same visual spot over the header as before the glass pass. */}
      {flash && (
        <Animated.View
          style={[
            styles.flashWrap,
            { top: insets.top + spacing.sm },
            {
              opacity: flashAnim,
              transform: [
                { translateY: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.flashPill, flashTone === 'muted' && styles.flashPillMuted]}>
            {/* accessibilityLiveRegion covers Android TalkBack;
                iOS VoiceOver handled by announceForAccessibility at each call site.
                WCAG 4.1.3 — status messages must reach all AT. */}
            <AppText variant="label" style={styles.flashText} accessibilityLiveRegion="polite">{flash}</AppText>
          </View>
        </Animated.View>
      )}
      {initialLoading ? (
        // Content-shaped skeletons in the list's place, under the chrome —
        // "the list is arriving" rather than a frozen spinner.
        <View
          style={[styles.loadingColumn, { paddingTop: chromeTopPad }]}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading flags"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <GlassSkeletonCard key={i} styles={styles} bar={color.glassSkeletonBar} />
          ))}
        </View>
      ) : (
      <SectionList
        // Recipe S (the FlagDetailModal A11Y-228 precedent): the search field
        // lives in this list's header, so without this the rows under the
        // keyboard are unreachable. iOS-only prop; a no-op on Android.
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        sections={sections}
        keyExtractor={(f) => f.id}
        // Fills the whole screen now the chrome is absolute; hidden for the
        // single pre-measure pass so the top padding never visibly jumps.
        // NOTE (GLASS.md budget law): virtualization props stay at RN defaults
        // — no windowSize/removeClippedSubviews tuning; the default windowing
        // is what keeps live row-glass bounded.
        style={[styles.listLayer, chromeHeight === null && styles.listHidden]}
        scrollIndicatorInsets={{ top: chromeTopPad }}
        keyboardDismissMode="on-drag"
        // UX #3 "Suggested next action" — one slim row above the list that
        // surfaces the single nearest OPEN barrier. Renders nothing when
        // location is unknown or no open flags exist (nearestOpenHit === null).
        // Tapping opens that flag via showDetails — the SAME handler a card's
        // Details action uses (onShowDetails). Navigation only: no status
        // change, no fetch, no new data path.
        ListHeaderComponent={
          nearestOpenHit && !bannerStandsDown ? (
            <Pressable
              onPress={() => showDetails(nearestOpenHit.flag)}
              style={({ pressed }) => [
                styles.suggestedRowOuter,
                pressed && styles.suggestedRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Review the nearest open barrier, ${
                CATEGORY_LABELS[nearestOpenHit.flag.category]
              }, ${severityA11y(nearestOpenHit.flag.severity)}, ${speakDistance(nearestOpenHit.km)}`}
              accessibilityHint="Opens the full report for the closest open accessibility barrier"
            >
              {/* The banner is C's SCROLLING i=12 glass pane — it rides with
                  the list (explicitly costed in the blur budget). */}
              <GlassSurface variant="banner" style={styles.suggestedRow}>
                <MapPin
                  size={18}
                  color={color.brandOnSoft}
                  strokeWidth={2.2} {...decorativeProps}
                />
                {/* Two deliberate lines, same words, same order. As one line
                    it wrapped wherever it ran out and orphaned "4 · 433 m" onto
                    a line of its own; broken on purpose it reads as a label
                    over its subject. The distance is the sentence's numeral, so
                    it takes mono (T1). */}
                <View style={styles.suggestedTextBlock}>
                  <AppText variant="label" style={styles.suggestedLead}>
                    Nearest open barrier
                  </AppText>
                  <AppText variant="label" style={styles.suggestedText}>
                    {`${CATEGORY_LABELS[nearestOpenHit.flag.category]} · Severity ${nearestOpenHit.flag.severity} · `}
                    {/* 1.6 = the `label` variant's own cap, which is what the
                        words beside it use. The banner is chrome and sits in no
                        content block, so without this the numeral would cap at
                        the mono row's 1.4 and shrink away from its sentence. */}
                    <MonoDistance
                      value={formatDistance(nearestOpenHit.km)}
                      maxFontSizeMultiplier={1.6}
                    />
                  </AppText>
                </View>
                <ChevronRight
                  size={18}
                  color={color.brandOnSoft}
                  strokeWidth={2.2} {...decorativeProps}
                />
              </GlassSurface>
            </Pressable>
          ) : null
        }
        contentContainerStyle={[
          sections.length === 0 ? styles.emptyContainer : styles.list,
          // Reserve room for the absolute chrome pane above and the floating
          // tab bar (absolute on native) plus the bulk-action bar when active,
          // so content never hides under either. paddingBottom is
          // cross-platform (contentInset is iOS-only).
          {
            paddingTop: chromeTopPad,
            paddingBottom:
              getFloatingTabBarContentInset(tabBarHeight, insets.bottom) +
              (user && selection.active ? bulkBarHeight : 0),
          },
        ]}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            tintColor={color.brand}
            colors={[color.brand]}
            // Spawn the spinner below the absolute chrome pane, not under it.
            progressViewOffset={chromeHeight ?? CHROME_FALLBACK_HEIGHT + insets.top}
            onRefresh={() => {
              refresh().catch(() => {});
            }}
          />
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeader} accessible accessibilityRole="header">
            {/* accessibilityRole="none": the WRAPPER is the one header node —
                it's `accessible`, so on iOS it is the single VoiceOver element
                and only its role ever lands. Left alone, variant="heading"
                would add a second header role here, which react-native-web
                renders as an <h1> INSIDE the wrapper's <h1>: invalid HTML that
                React errors on, and one title announced as two nested headings
                to a browser screen reader. */}
            {/* The count joins the header instead of riding a pill beside it.
                One "9" per screen: the tab badge keeps its own, because it
                counts for a user who is looking at another tab. Two objects
                saying the same number a thumb's width apart was the second. */}
            <AppText variant="heading" style={styles.sectionTitle} accessibilityRole="none">
              {title}
              {' · '}
              <AppText variant="monoBold" style={styles.sectionCount}>{data.length}</AppText>
            </AppText>
          </View>
        )}
        ListEmptyComponent={
          <GlassSurface
            variant="row"
            borderRadius={radius.xl}
            style={styles.emptyCard}
            accessible
            accessibilityRole="text"
          >
            {/* W5: the house recipe. Every word here is the shipped word — all
                five branches, both lines, verbatim. What changes is the MARK:
                Search, the glyph that said nothing the heading was not already
                saying, becomes the path.
                F40/F41 survive as the one documented exception in EmptyState:
                "All caught up" is a CELEBRATION, not an absence, so it keeps
                the gold Sparkles disc — and keeps it only for a genuinely
                empty, fully-loaded list, never for a failed load or a filtered
                page with more to come. */}
            <EmptyState
              mark={
                isCaughtUp ? (
                  <View
                    style={[styles.emptyIcon, styles.emptyIconGold]} {...decorativeProps}
                  >
                    <Sparkles size={36} color={color.goldAccent} strokeWidth={2} />
                  </View>
                ) : undefined
              }
              title={
                flagsError
                  ? "Couldn't load flags"
                  : categoryFilter
                    ? `No ${CATEGORY_LABELS[categoryFilter]} flags`
                    : searchText.trim()
                      ? 'No matches'
                      : hasMore
                        ? 'Nothing to triage yet'
                        : 'All caught up'
              }
              body={
                flagsError
                  ? 'Reports could not be loaded. Pull down to retry, or tap the message above.'
                  : categoryFilter
                    ? `No open or verified ${CATEGORY_LABELS[categoryFilter].toLowerCase()} flags right now. Tap "All" above to see every category.`
                    : searchText.trim()
                      ? `Nothing matches "${searchText.trim()}". Try a different keyword or clear the search.`
                      : hasMore
                        ? 'None of the reports loaded so far need attention, but there are more to load. Use "Load more" below to keep looking.'
                        : "You're all caught up — nice work! New reports show up here as the community adds them. Pull down to refresh anytime."
              }
            />
          </GlassSurface>
        }
        renderItem={renderFlagItem}
        ListFooterComponent={
          // Render the footer when the list has items, OR when the list is
          // empty but more pages exist (F40 re-sweep): local filters can empty
          // page 1 while hasMore is true, and without the footer the user had
          // no path to the next page. Stays hidden for the error and genuine
          // end-of-list empty states.
          sections.length === 0 && !(hasMore && !flagsError) ? null : (
            <View style={styles.footer}>
              {hasMore ? (
                <Pressable
                  onPress={handleLoadMore}
                  style={({ pressed }) => [
                    styles.loadMoreBtn,
                    pressed && styles.loadMoreBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Load ${NEXT_PAGE_SIZE} more flags`}
                  accessibilityHint="Fetches the next page of accessibility reports"
                  {...a11yToggle({ busy: loadingMore })}
                >
                  {loadingMore ? (
                    <ActivityIndicator
                      // inkSelect — the arbitrated load-more ink on glass
                      // (GLASS.md §2 inks table). Was platform-grey.
                      color={color.inkSelect}
                      accessibilityLabel="Loading more flags"
                      {...a11yToggle({ busy: true })}
                    />
                  ) : (
                    <AppText variant="label" style={styles.loadMoreText}>{`Load ${NEXT_PAGE_SIZE} more`}</AppText>
                  )}
                </Pressable>
              ) : (
                <AppText
                  variant="body"
                  style={styles.endText}
                  accessibilityRole="text"
                  accessibilityLabel="You have seen all flags nearby"
                >
                  {"That's everything nearby — you're up to date"}
                </AppText>
              )}
            </View>
          )
        }
      />
      )}
      {/* Floating bulk-action bar — appears at the bottom in selection
          mode. Positioned absolute so it overlays the SectionList rather
          than reflowing it. NOT wrapped in a live region — the count lives
          in its own live-region Text above the buttons so SR re-announces
          the count only (not every button label) when cards toggle. */}
      {!!user && selection.active && (
        <GlassSurface
          variant="bulk"
          // Web tab bar is in-flow (the list already ends above it), so the bar
          // sits at bottom: 0. Native tab bar is position:absolute, so the bar
          // must clear it by sitting at bottom: tabBarHeight. onLayout feeds the
          // bar's real height back into the list reserve above. The second,
          // CONDITIONAL i=24 pane of the blur budget — mounts only here.
          style={[styles.bulkBar, { bottom: Platform.OS === 'web' ? 0 : tabBarHeight }]}
          onLayout={(e) => setBulkBarHeight(e.nativeEvent.layout.height)}
        >
          {/* The single source of truth for "how many are picked", spoken
              by SR on every change. Buttons below are static labels so
              they don't double-announce. */}
          <AppText variant="label" style={styles.bulkCountText} accessibilityLiveRegion="polite">
            {`${liveSelectedCount} selected`}
          </AppText>
          {/* The SW-36 class, on the one row in the app that could not escape
              it. Four verbs share a row with `flexBasis: 0`, so each is sized
              by what is left over rather than by its own word — and at large
              type "Resolve" hit its 0.8 shrink floor and still clipped. The
              fallback is the same STACK the cards take, at the same threshold
              (`isCompactLayout`), so the screen changes shape all at once
              instead of the bar and the cards disagreeing about how wide the
              device is. `adjustsFontSizeToFit` stays for the row path; stacked,
              each button is full width and never needs it. */}
          <View style={compactActions ? styles.bulkButtonStack : styles.bulkButtonRow}>
            <Pressable
              onPress={() => {
                void runBulkAction('verify');
              }}
              disabled={bulkBusy || selectedOpenCount === 0}
              style={({ pressed }) => [
                styles.bulkBtn,
                compactActions && styles.bulkBtnFull,
                styles.bulkVerifyBtn,
                (bulkBusy || selectedOpenCount === 0) && styles.bulkBtnDisabled,
                pressed && !bulkBusy && selectedOpenCount > 0 && styles.bulkBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Verify"
              accessibilityHint={
                selectedOpenCount === 0
                  ? 'No open flags selected'
                  : 'Marks each selected open flag as verified'
              }
              {...a11yToggle({
                disabled: bulkBusy || selectedOpenCount === 0,
                busy: bulkBusy,
              })}
            >
              <AppText variant="label" style={styles.bulkBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Verify</AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                void runBulkAction('resolve');
              }}
              disabled={bulkBusy || liveSelectedCount === 0}
              style={({ pressed }) => [
                styles.bulkBtn,
                compactActions && styles.bulkBtnFull,
                styles.bulkResolveBtn,
                (bulkBusy || liveSelectedCount === 0) && styles.bulkBtnDisabled,
                pressed && !bulkBusy && liveSelectedCount > 0 && styles.bulkBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Resolve"
              accessibilityHint={
                liveSelectedCount === 0
                  ? 'No flags selected'
                  : 'Marks each selected flag as resolved'
              }
              {...a11yToggle({
                disabled: bulkBusy || liveSelectedCount === 0,
                busy: bulkBusy,
              })}
            >
              <AppText variant="label" style={styles.bulkBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Resolve</AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                void runBulkWatch();
              }}
              disabled={bulkBusy || liveSelectedCount === 0 || !user}
              style={({ pressed }) => [
                styles.bulkBtn,
                compactActions && styles.bulkBtnFull,
                styles.bulkWatchBtn,
                (bulkBusy || liveSelectedCount === 0 || !user) && styles.bulkBtnDisabled,
                pressed &&
                  !bulkBusy &&
                  liveSelectedCount > 0 &&
                  user &&
                  styles.bulkBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Watch"
              accessibilityHint={
                !user
                  ? 'Sign in to watch flags'
                  : liveSelectedCount === 0
                    ? 'No flags selected'
                    : 'Adds each selected flag to your watched list'
              }
              {...a11yToggle({
                disabled: bulkBusy || liveSelectedCount === 0 || !user,
                busy: bulkBusy,
              })}
            >
              <AppText variant="label" style={styles.bulkBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Watch</AppText>
            </Pressable>
            <Pressable
              onPress={exitSelection}
              disabled={bulkBusy}
              style={({ pressed }) => [
                styles.bulkBtn,
                compactActions && styles.bulkBtnFull,
                styles.bulkCancelBtn,
                bulkBusy && styles.bulkBtnDisabled,
                pressed && !bulkBusy && styles.bulkBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel selection"
              accessibilityHint="Exits selection mode without changing any flags"
              {...a11yToggle({ disabled: bulkBusy })}
            >
              <AppText variant="label" style={styles.bulkCancelText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Cancel</AppText>
            </Pressable>
          </View>
        </GlassSurface>
      )}
      <Suspense fallback={null}>
        <FlagDetailModal
          visible={selectedFlag !== null}
          flag={selectedFlag}
          // Q2 = C. This is the triage queue, so the sheet leads with the
          // community verb and pins the siblings to its foot. Every other entry
          // point defaults to 'read'.
          primaryIntent="triage"
          // The card beside this sheet already knows the distance; the sheet
          // holds no location permission of its own and must not take one.
          distanceKm={
            userLocation && selectedFlag
              ? haversineKm(userLocation, { lat: selectedFlag.lat, lng: selectedFlag.lng })
              : null
          }
          onClose={() => setSelectedFlag(null)}
          onDismiss={completeDetailSignIn}
          onChanged={applyStatusChange}
          onEdited={(updated) => patchFlag(updated.id, updated)}
          onDeleted={handleDeleted}
          onViewOnMap={handleViewOnMap}
          onSignInToReview={handleDetailSignInToReview}
        />
      </Suspense>
    </View>
  );
}

interface TaskCardProps {
  flag: FlagRow;
  isBusy: boolean;
  isOwn: boolean;
  /** Whether this viewer may use production review controls. */
  canReview: boolean;
  /** MOD1: whether this viewer may Reject (admin-only; DB trigger enforces
   *  this independently — this only keeps the control off the screen). */
  isAdmin: boolean;
  /** Current user position, or null when unknown / permission denied. */
  userLocation: LatLng | null;
  /** True when the screen is in bulk-select mode. Changes tap semantics. */
  selectionActive: boolean;
  /** True when this card is part of the current selection. */
  selected: boolean;
  /** When true the action row stacks (narrow width / large type) instead of one row. */
  compactActions: boolean;
  onPress: (flag: FlagRow) => void;
  /** Long-press enters / extends selection. */
  onLongPress?: (flag: FlagRow) => void;
  onSetStatus: (id: string, status: FlagStatus, isOwn: boolean) => void;
  onShowDetails: (flag: FlagRow) => void;
  onSignInToReview: () => void;
}

// React.memo so a single triage action (which flips busyId on the parent)
// only re-renders the card that's actually busy — not every visible card.
// At hundreds of rows this is the difference between snappy and laggy.
// The userLocation prop is stable across renders (one-shot fetch), so it
// doesn't disturb memoization in practice.
const TaskCard = memo(function TaskCard({
  flag,
  isBusy,
  isOwn,
  canReview,
  isAdmin,
  userLocation,
  selectionActive,
  selected,
  compactActions,
  onPress,
  onLongPress,
  onSetStatus,
  onShowDetails,
  onSignInToReview,
}: TaskCardProps) {
  const color = useColor();
  const reduceTransparency = useReduceTransparency();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(color, reduceTransparency), [color, reduceTransparency]);
  // 120ms press sheen (mockup: optional, reduced-motion gated). Driven by the
  // outer Pressable's onPressIn/Out; never mounted when the user prefers
  // reduced motion or transparency.
  const sheenActive = !reducedMotion && !reduceTransparency;
  const sheenAnim = useRef(new Animated.Value(0)).current;
  const sheenIn = useCallback(() => {
    Animated.timing(sheenAnim, {
      toValue: 1,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [sheenAnim]);
  const sheenOut = useCallback(() => {
    Animated.timing(sheenAnim, {
      toValue: 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [sheenAnim]);
  // Controls whether the full-screen photo lightbox is open.
  // Kept component-local — lightbox state doesn't need to survive unmount.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Tracks whether the photo URL failed to load. On error we render nothing
  // instead of a broken-image icon — cleaner than an empty grey box.
  const [photoError, setPhotoError] = useState(false);
  // Lazy-load the photo: only render the Image once the user has scrolled
  // the card into view. Before then, show a placeholder so the UI doesn't
  // jank when the image finally arrives.
  const [photoInView, setPhotoInView] = useState(false);
  // Tracks the remote image's load so a shimmer covers the blank gap until the
  // photo actually paints (not just until it's scrolled into view).
  const [photoLoaded, setPhotoLoaded] = useState(false);
  // TB-3 (security audit 2026-07-31): these two thumbnails and the lightbox are
  // raw <Image>s, so they bypass RemoteImage's allow-list. `photo_url` is an
  // unconstrained column a hostile row can point at any server, which would
  // beacon this viewer's IP. Reject anything outside our Storage origin; a
  // rejected URL reads as "no photo", which the gates below already handle.
  const safePhotoUrl = useMemo(() => safeImageUrl(flag.photo_url), [flag.photo_url]);
  // Compute distance + ETA once per card per location change. Without the
  // memo this would recompute on every parent state flip (busyId, flash).
  const distanceInfo = useMemo(() => {
    if (!userLocation) return null;
    const km = haversineKm(userLocation, { lat: flag.lat, lng: flag.lng });
    // `km` rides along now: the census renders the distance itself so it can put
    // the numeral in mono (T1), and `label` survives only for the action labels,
    // which name their flag in words a screen reader already knows.
    return {
      km,
      label: formatDistance(km),
      eta: formatWalkingEta(km),
    };
  }, [userLocation, flag.lat, flag.lng]);
  // In selection mode, switch the card's a11y role to "checkbox" so SR
  // users hear "checked / not checked" instead of a generic button hint.
  // Append the selection state to the existing label so the SR reads the
  // category first (the meaningful bit) and the state at the end.
  // T8 (F4-02): the spoken card routes through the taught severity/status
  // grammar (a11yText helpers) instead of raw enums — "severity 3 of 5,
  // Moderate, status Open" not "severity 3, open" (the latter reads the status
  // like a verb). Same helpers Home + the map already speak.
  const baseLabel = `${CATEGORY_LABELS[flag.category]}, ${severityA11y(flag.severity)}, ${statusA11y(flag.status)}. Tap to view on map.`;
  const reviewSelectionActive = canReview && selectionActive;
  const a11yLabel = reviewSelectionActive
    ? `${CATEGORY_LABELS[flag.category]}, ${severityA11y(flag.severity)}. ${selected ? 'Selected.' : 'Not selected.'}`
    : baseLabel;

  // ── Triage actions ────────────────────────────────────────────────────────
  // One descriptor list + one render helper, so the tiered single row and the
  // deliberate 2-row compact stack share a single source of truth. `Verify`
  // exists only while the flag is open; once verified the lead becomes
  // `Resolved`. Every button carries its own a11y label AND hint (WCAG: say
  // what it does and what happens next).
  // T8 (F4-08): each action names its flag, so an SR user swiping a list hears
  // WHICH flag each "Verify" acts on — category, plus distance only when a
  // location has resolved (distanceInfo is null-guarded on userLocation).
  const actionSubject = `${CATEGORY_LABELS[flag.category]}${distanceInfo ? `, ${distanceInfo.label}` : ''}`;
  type CardAction = {
    key: string;
    label: string;
    a11yLabel: string;
    a11yHint: string;
    onPress: () => void;
    /** Assigned by POSITION, not declared here — see the lead/siblings split. */
    btnStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    /** Deepen a brand-filled action on press instead of greying it (Verify);
     *  neutral/ghost actions omit it and inherit the house borderPressed dim. */
    pressedTint?: string;
    /** Opt out of the fill dim where greying would drop the ink below AA
     *  (Details: inkDetailsGhost is #1466E0 light → 4.03:1 on borderPressed).
     *  The spring + haptic still answer. */
    dimOnPress?: boolean;
    // T4 (F1-08): 'none' on the three commit actions — their outcome haptics
    // fire at the commit point in applyStatusChange (medium impact + notify), so
    // a press tick here would double up. Details keeps the 'selection' tick
    // since it only navigates to the detail sheet.
    haptic: 'selection' | 'none';
  };
  const actions: CardAction[] = canReview ? [
    ...(flag.status === 'open'
      ? [{
          key: 'verify',
          label: 'Verify',
          a11yLabel: `Verify this flag — ${actionSubject}`,
          a11yHint: 'Confirms this barrier report is real',
          onPress: () => onSetStatus(flag.id, 'verified', isOwn),
          haptic: 'none',
        } satisfies CardAction]
      : []),
    {
      key: 'resolved',
      label: 'Resolved',
      a11yLabel: `Mark this flag resolved — ${actionSubject}`,
      a11yHint: 'Marks this barrier as fixed',
      onPress: () => onSetStatus(flag.id, 'resolved', isOwn),
      haptic: 'none',
    },
    // MOD1: community Reject is removed — only an admin viewer gets this cell.
    // Rejected flags never reach TRIAGE_STATUSES, so there is no matching
    // "Restore" cell to add here (see AdminScreen, where rejected flags do
    // surface).
    ...(isAdmin
      ? [{
          key: 'reject',
          label: 'Reject',
          a11yLabel: `Reject this flag — ${actionSubject}`,
          a11yHint: 'Dismisses this report; asks you to confirm first',
          onPress: () => onSetStatus(flag.id, 'rejected', isOwn),
          haptic: 'none',
        } satisfies CardAction]
      : []),
    {
      key: 'details',
      label: 'Details',
      a11yLabel: `View flag details — ${actionSubject}`,
      a11yHint: 'Opens a screen with the full report, photo, and more actions',
      onPress: () => onShowDetails(flag),
      btnStyle: styles.detailsLink,
      textStyle: styles.detailsText,
      dimOnPress: false,
      haptic: 'selection',
    },
  ] : [
    {
      key: 'sign-in',
      label: 'Sign in to review',
      a11yLabel: `Sign in to review — ${actionSubject}`,
      a11yHint: 'Opens the Profile tab, where you can sign in',
      onPress: onSignInToReview,
      haptic: 'selection',
    },
    {
      key: 'details',
      label: 'Details',
      a11yLabel: `View flag details — ${actionSubject}`,
      a11yHint: 'Opens a screen with the full report, photo, and more actions',
      onPress: () => onShowDetails(flag),
      btnStyle: styles.detailsLink,
      textStyle: styles.detailsText,
      dimOnPress: false,
      haptic: 'selection',
    },
  ];
  // F3 — the row stops wearing three costumes for one decision. It used to run
  // Verify (filled) · Resolved (neutral fill) · Reject (ghost) · Details
  // (ghost), which is four controls in three styles and a verb, an adjective, a
  // verb and a noun all dressed alike. Now:
  //
  //   lead      the ONE filled verb, whichever commit verb is next in the
  //             lifecycle. Open -> Verify; already verified -> Resolved.
  //   siblings  the remaining commit verbs, together inside ONE ghost
  //             segmented control, so they read as alternatives to the lead
  //             rather than as three peers.
  //   details   navigation, and it is not a verb at all, so it stops wearing a
  //             button and becomes a link.
  //
  // Nothing about what they DO changed: the same descriptors, the same
  // handlers, the same confirm() gate upstream in setStatus, the same labels
  // and hints. `details` is spliced out by key rather than by index so the
  // split cannot silently follow a reordered list.
  const commitActions = actions.filter((a) => a.key !== 'details');
  const detailsAction = actions.find((a) => a.key === 'details')!;
  // Signed-in review always has at least two commit verbs. Guest presentation
  // has exactly one lead account boundary and therefore no sibling segment.
  //
  // The paint is assigned HERE, by position, and deliberately not on the
  // descriptors above. Declaring it per-verb is how the first cut of this got
  // it wrong: `Verify` owned the fill, so a flag that was ALREADY verified
  // rendered a lead verb with no fill at all and the card had zero filled
  // controls instead of exactly one. "The lead is filled" is a fact about the
  // POSITION, so the position is where it is stated.
  //
  // The pressed companion travels with the fill for the same reason: a filled
  // control that greys on press drops its ink below AA (the rule
  // brandInkAA.guard pins), and Resolved has to obey it on the day it becomes
  // the lead just as Verify does today.
  const leadAction: CardAction = {
    ...commitActions[0]!,
    btnStyle: styles.leadBtn,
    textStyle: styles.leadText,
    pressedTint: color.ctaFillPressed,
  };
  const siblingActions: CardAction[] = commitActions
    .slice(1)
    .map((a) => ({ ...a, btnStyle: styles.segCell, textStyle: styles.segText }));
  // hitSlop widens the tap area without changing layout — keeps adjacent
  // constructive/destructive buttons from mis-firing on the reflowed row.
  const renderAction = (a: CardAction, widthStyle: StyleProp<ViewStyle>) => (
    <PressableScale
      key={a.key}
      disabled={isBusy}
      haptic={a.haptic}
      onPress={a.onPress}
      hitSlop={spacing.xs}
      style={[styles.actionBtn, a.btnStyle, widthStyle]}
      pressedTint={a.pressedTint}
      dimOnPress={a.dimOnPress ?? true}
      accessibilityRole="button"
      accessibilityLabel={a.a11yLabel}
      accessibilityHint={a.a11yHint}
      {...a11yToggle({ disabled: isBusy })}
    >
      <AppText variant="label" style={a.textStyle}>{a.label}</AppText>
    </PressableScale>
  );

  // The photo, lifted out of the old card body verbatim so it can be handed to
  // the shared card as its leading media. Both branches are unchanged: in bulk
  // -select mode it is a NON-interactive View so a tap falls through to the
  // card's selection toggle instead of opening the lightbox (F17); otherwise it
  // is the Pressable that opens it.
  const photo = (
safePhotoUrl && !photoError ? (
    reviewSelectionActive ? (
      // F17: in bulk-select mode the whole card is the selection toggle.
      // Render the thumbnail as a NON-interactive View so a tap on the
      // photo falls through to the outer card Pressable instead of opening
      // the lightbox (a nested Pressable would otherwise swallow it,
      // making the photo area a dead spot for selection).
      <View
        style={styles.cardThumbWrap}
        onLayout={() => setPhotoInView(true)}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {photoInView && (
          <Image
            source={{ uri: safePhotoUrl }}
            style={styles.cardThumb}
            onLoad={() => setPhotoLoaded(true)}
            onError={() => setPhotoError(true)}
            accessible={false}
            importantForAccessibility="no"
            aria-hidden={true}
          />
        )}
        {!photoLoaded && (
          <Skeleton
            width={size.thumb}
            height={size.thumb}
            borderRadius={radius.md}
            style={styles.thumbSkeleton}
          />
        )}
      </View>
    ) : (
      <Pressable
        onPress={() => setLightboxOpen(true)}
        onLayout={() => setPhotoInView(true)}
        hitSlop={spacing.sm}
        style={styles.cardThumbWrap}
        accessibilityRole="button"
        // photo_alt (2026-08-19): the reporter's own description wins;
        // the category-based label stays as the fallback for old rows.
        accessibilityLabel={
          flag.photo_alt
            ? `Photo: ${flag.photo_alt}. Tap to view full screen.`
            : `Photo of ${CATEGORY_LABELS[flag.category]} accessibility issue. Tap to view full screen.`
        }
        accessibilityHint="Opens a full-screen view of the photo"
      >
        {photoInView && (
          <Image
            source={{ uri: safePhotoUrl }}
            style={styles.cardThumb}
            onLoad={() => setPhotoLoaded(true)}
            onError={() => setPhotoError(true)}
            accessible={false}
            importantForAccessibility="no"
            aria-hidden={true}
          />
        )}
        {!photoLoaded && (
          <Skeleton
            width={size.thumb}
            height={size.thumb}
            borderRadius={radius.md}
            style={styles.thumbSkeleton}
          />
        )}
      </Pressable>
    )
  ) : null
  );

  return (
    <Pressable
      onPress={() => onPress(flag)}
      onLongPress={canReview && onLongPress ? () => onLongPress(flag) : undefined}
      onPressIn={sheenActive ? sheenIn : undefined}
      onPressOut={sheenActive ? sheenOut : undefined}
      style={({ pressed }) => [styles.cardOuter, pressed && styles.cardPressed]}
      // S13 (L6-04, the audit's #1 VoiceOver check): the card is NOT one
      // accessible leaf. accessible={false} exposes the labeled header summary
      // AND each action button (Verify/Resolve/Reject/Details) and the photo as
      // independent elements, so a blind user can reach the trust engine — and
      // it removes the web nested-<button> invalidity. The card's role/label/
      // state/hint move to the header summary node below; tap-anywhere-to-open
      // still works through this Pressable (RN touch + web/VoiceOver activation
      // fall through to it). Bulk-select is unchanged (actions hidden then).
      accessible={false}
    >
      {/* The card IS a pane of row glass (i=12 + floor + hairlines). The
          Pressable stays the interactive root — handlers and a11y unchanged;
          GlassSurface carries material only. Selected state = 2px brand edge
          (padding compensated below) + the arbitrated selection tint, and its
          Reduce-Transparency designed fill is brandSofter via solidColor. */}
      <GlassSurface
        variant="row"
        edgeColor={selected ? color.brand : undefined}
        edgeWidth={selected ? 2 : undefined}
        overlayTint={selected ? color.glassSelectedTint : undefined}
        solidColor={selected ? color.brandSofter : undefined}
        style={[styles.card, selected && styles.cardSelected]}
      >
      {/* 120ms press sheen — a top light-wash that answers touch on the
          glass. Mounted only when motion + transparency are welcome; the
          linear top-wash is the RN translation of the mockup's radial sheen
          (honesty-tagged in GLASS.md). */}
      {sheenActive && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.sheenClip, { opacity: sheenAnim }]}
        >
          <LinearGradient
            colors={[color.glassSheen, 'transparent']}
            locations={[0, 0.7]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      {/* F1: the card's insides are the shared drawing now. What used to be
          here was an amber severity pill, the title, a status pill, then a
          photo beside a 2-line description and a meta line — five species of
          object announcing one flag, none of them shaped like Home's row or
          Nearby's card. It is one component and one census line now:

            Severity 3 · Moderate · Open · 876 m · 11 min walk · 2d ago

          The status word moved INTO that sentence (C3: status is a word, not a
          pill, inside a flag object) and the severity colour is drawn once, on
          the disc (C2). The distance is the sentence's one numeral, so the
          component renders it in mono from the raw km.

          S13's structure is preserved exactly, because it is what lets a
          screen-reader user reach the trust engine: the card stays
          accessible={false}, the HEADER is the single labeled summary node
          carrying the button/checkbox role fork, and every action below stays
          independently reachable. FlagCard takes that as `headerA11y` rather
          than assuming it, which is why Nearby can decline it. */}
      <FlagCard
        flag={flag}
        density="card"
        distanceKm={distanceInfo?.km ?? null}
        censusExtra={[distanceInfo?.eta, relativeTime(flag.created_at)]}
        showDescription
        media={photo}
        headerAccessory={
          /* Checkmark indicator in the top-right corner. Hidden from SR because
             the accessibilityState above already conveys the checked/unchecked
             state — duplicating it would just read "checked" twice. */
          reviewSelectionActive ? (
            <View
              style={[styles.selectCheck, selected && styles.selectCheckOn]} {...decorativeProps}
            >
              {selected ? <Check size={16} color={color.textOnBrand} strokeWidth={2.2} /> : null}
            </View>
          ) : undefined
        }
        headerA11y={{
          role: reviewSelectionActive ? 'checkbox' : 'button',
          label: a11yLabel,
          hint: reviewSelectionActive
            ? 'Toggles this flag in the selection'
            : canReview
              ? 'Opens the Map tab focused on this flag. Long-press to select multiple.'
              : 'Opens the Map tab focused on this flag.',
          state: a11yToggle(
            reviewSelectionActive ? { checked: selected, disabled: isBusy } : { disabled: isBusy }
          ),
        }}
        actions={
          /* Hidden during selection mode — the floating bar handles bulk
             actions, and showing both would be confusing (a tap on Verify here
             would still fire the single-item flow, not the bulk one). */
          reviewSelectionActive ? undefined : (
            <View
              style={compactActions ? styles.cardActionsStack : styles.cardActionsRow}
              testID={compactActions ? 'card-actions-stack' : 'card-actions-row'}
            >
              {renderAction(leadAction, compactActions ? styles.actionBtnFull : styles.actionBtnLead)}
              {/* One ghost segmented control, not two ghost buttons: the pair
                  reads as alternatives to the filled verb rather than as its
                  peers. The container draws the single hairline and clips the
                  ends; each cell keeps its own 44pt box and its own label,
                  hint and handler, so nothing about reaching them changed. */}
              {siblingActions.length > 0 ? (
                <View
                  testID="card-actions-segmented"
                  style={[
                    styles.segmented,
                    compactActions ? styles.actionBtnFull : styles.actionBtnSiblings,
                  ]}
                >
                  {siblingActions.map((a, i) =>
                    renderAction(a, i > 0 ? styles.segCellDivided : null),
                  )}
                </View>
              ) : null}
              {renderAction(detailsAction, compactActions ? styles.actionBtnFull : null)}
            </View>
          )
        }
      />
      {/* Full-screen photo lightbox — only mounts when the thumbnail exists
          and has loaded successfully. Tapping the thumbnail (or the close
          button inside the modal) dismisses it. */}
      {safePhotoUrl && !photoError ? (
        <PhotoLightboxModal
          visible={lightboxOpen}
          photoUrl={safePhotoUrl}
          caption={flag.photo_alt || `${CATEGORY_LABELS[flag.category]} accessibility issue`}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
      </GlassSurface>
    </Pressable>
  );
});

/**
 * First-load skeleton on the ROW MATERIAL — mirrors the card's anatomy, which
 * changed with it in Phase 2a: disc · title · census · two description lines ·
 * one filled verb beside a segmented pair, with Details as a link rather than a
 * fourth pill. A skeleton that still drew three equal pills would promise a row
 * the real card no longer has, and the swap at load would read as a jump. Bars
 * use the arbitrated skeleton tint; the pulse inside `Skeleton` is already
 * reduced-motion gated. Takes the parent's styles/bar so six instances don't
 * re-create the StyleSheet.
 */
function GlassSkeletonCard({
  styles,
  bar,
}: {
  styles: ReturnType<typeof makeStyles>;
  bar: string;
}) {
  return (
    <GlassSurface
      variant="row"
      style={[styles.card, styles.cardOuter]}
      accessible={false}
    >
      <View style={styles.skeletonHeader}>
        <Skeleton width={32} height={32} borderRadius={radius.circle} style={{ backgroundColor: bar }} />
        <View style={styles.skeletonHeaderText}>
          <Skeleton width="55%" height={18} borderRadius={radius.sm} style={{ backgroundColor: bar }} />
          <Skeleton width="80%" height={13} borderRadius={radius.sm} style={{ backgroundColor: bar }} />
        </View>
      </View>
      <Skeleton width="100%" height={13} borderRadius={radius.sm} style={{ backgroundColor: bar }} />
      <Skeleton width="62%" height={13} borderRadius={radius.sm} style={{ backgroundColor: bar }} />
      <View style={styles.cardActionsRow}>
        <View style={styles.actionBtnLead}>
          <Skeleton width="100%" height={44} borderRadius={radius.full} style={{ backgroundColor: bar }} />
        </View>
        <View style={styles.actionBtnSiblings}>
          <Skeleton width="100%" height={44} borderRadius={radius.full} style={{ backgroundColor: bar }} />
        </View>
        <Skeleton width={56} height={44} borderRadius={radius.full} style={{ backgroundColor: bar }} />
      </View>
    </GlassSurface>
  );
}

// Test-only export: the composition pin test (contract item 6 — the locked
// 6-element FlagCard + tiered action row) renders the card directly instead
// of mocking the whole screen's data layer. Not for reuse — the card is
// private to this screen by design.
export { TaskCard };

const makeStyles = (color: ColorTheme, reduceTransparency: boolean) => {
  // Engineered chip tint — pills/chips/search ON the chrome pane (they carry
  // no blur of their own; the pane blurs, the chip tints). Under Reduce
  // Transparency the designed opaque state swaps them to the solid neutral
  // pair (mockup body.rt) — active chips keep the mode-independent CTA fill.
  const chipFill = reduceTransparency ? color.surfaceNeutral : color.glassChipFill;
  const chipEdge = reduceTransparency ? color.borderSubtle : color.glassChipEdge;

  return StyleSheet.create({
    // Screen wash — the Deep Field stage's mid stop, so any frame rendered
    // before ScreenStage mounts (or content past its edges) matches the field.
    // The stage itself (gradient + pools + grain) is <ScreenStage /> below.
    screen: { flex: 1, backgroundColor: color.stage1 },
    // The absolute chrome glass pane (variant="chrome" supplies the material:
    // i=24 blur + floor + bottom edge/lip). No paddingBottom — the last chrome
    // row (sort) carries its own 12pt, matching the mockup's pane padding.
    chromePane: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
    },
    // The list fills the whole screen beneath the absolute chrome; hidden for
    // the single pre-measure pass (see chromeHeight) so padding never jumps.
    listLayer: { flex: 1 },
    listHidden: { opacity: 0 },
    // First-load skeleton column — sits exactly where the list will land.
    loadingColumn: { flex: 1, paddingHorizontal: spacing.lg },
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: chipFill,
      borderWidth: 1,
      borderColor: chipEdge,
    },
    headerBtnPressed: { backgroundColor: color.glassNeutralBtn },
    flashWrap: {
      position: 'absolute',
      // `top` applied inline (insets.top + spacing.sm) — over the header
      // inside the safe area, floating above the chrome pane.
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 60,
    },
    flashPill: {
      // successStrong (not success): white reward text needs ≥4.5:1 — #27ae60
      // is only 2.8:1 (AA-large), #1e8449 is 4.6:1. Matches FlashBanner.
      backgroundColor: color.successStrong,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.circle,
      ...shadow.e2,
    },
    // Muted (non-reward) tone — neutral dark pill, same white text. Distinct
    // from the green success pill so an error notice doesn't read as a reward.
    flashPillMuted: { backgroundColor: color.backdropCaption },
    flashText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.sm },
    errorBanner: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      backgroundColor: color.error,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      minHeight: 44,
      ...shadow.e2,
    },
    errorBannerBusy: { opacity: 0.85 },
    errorBannerPressed: { backgroundColor: color.errorPressed },
    errorBannerText: { color: color.textOnBrand, fontSize: font.size.sm, fontWeight: font.weight.semibold, flex: 1 },
    // Offline data notice — uses warning tokens so it's visually distinct from
    // the red error banner but still draws the eye. Wraps `warningBg`/`warningFg`
    // from the theme (WCAG-checked pair). No tap action — it's purely informational.
    offlineBanner: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      backgroundColor: color.warningBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md, // matches errorBanner's paddingVertical: 12
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
    list: { padding: spacing.lg },
    // UX #3 "Suggested next action" banner — one slim, >=44pt row above the
    // list. A brand-tinted card so it reads as a soft call-to-action without
    // competing with the severity-colored flag cards below. Icon + chevron are
    // decorative (a11y-hidden); the label carries the meaning, and the
    // accessibilityLabel on the Pressable speaks the full phrase. Color is
    // never the sole signal — the "Nearest open barrier" text states it plainly.
    // Split for the glass pass: the Pressable owns margins + pressed state,
    // the inner GlassSurface (variant="banner": i=12 blur + brandSoft floor +
    // brand edge + specular) owns the material. Radius on both layers (the
    // surface clips its material to radius.lg — GlassSurface's default).
    suggestedRowOuter: { marginBottom: spacing.md },
    suggestedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44, // WCAG 2.5.5 minimum touch target
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      // e1 lift in light only — dark is luminosity-led (edges, not shadows).
      ...(color.scheme === 'light' ? shadow.e1 : {}),
    },
    suggestedRowPressed: { backgroundColor: color.borderPressed },
    suggestedTextBlock: { flexGrow: 1, flexShrink: 1, minWidth: 130, gap: 1 },
    suggestedLead: {
      color: color.brandOnSoft,
      fontWeight: font.weight.semibold,
      fontSize: font.size.sm,
    },
    suggestedText: {
      color: color.brandOnSoft,
      fontWeight: font.weight.medium,
      fontSize: font.size.sm,
    },
    // Load-more footer — centered below the last SectionList card.
    // minHeight 44 on the button satisfies WCAG 2.5.5 (minimum touch target).
    footer: {
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Load-more sits on the raw stage — chip tint + brand edge (the mockup
    // has no load-more state; chip recipe is the interpretation, flagged in
    // the build report).
    loadMoreBtn: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.circle,
      borderWidth: 1,
      borderColor: color.brand,
      backgroundColor: chipFill,
      minHeight: 44,
      minWidth: 160,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadMoreBtnPressed: { backgroundColor: color.borderPressed },
    loadMoreText: { color: color.inkSelect, fontWeight: font.weight.bold, fontSize: font.size.base },
    endText: {
      fontSize: font.size.sm,
      color: color.inkOnStage,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    emptyContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    // Empty state on the row material at radius.xl (variant="row" supplies
    // the glass; e2 lift light-only — dark is luminosity-led).
    emptyCard: {
      borderRadius: radius.xl,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.xxl + spacing.tight,
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: 340,
      ...(color.scheme === 'light' ? shadow.e2 : {}),
    },
    // 64pt icon disc (mockup): Civic Gold for the true "all caught up"
    // celebration, quiet ink-tint for the search/error/filter variants.
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.tight,
    },
    emptyIconGold: { backgroundColor: color.goldLight },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: font.size.xs,
      // 600, not 700 — the mockup's section headers are type-only restraint.
      fontWeight: font.weight.semibold,
      // inkOnStage — arbitrated for raw-stage text over the pool's darkest
      // stop (textMuted #666 measured 4.10:1 there — forked deeper).
      color: color.inkOnStage,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
    },
    // T1: the count is a data numeral, so it takes mono with tabular figures.
    // It inherits the header's size, tracking and ink — it is part of the same
    // label, not a second object with its own voice.
    sectionCount: { fontVariant: ['tabular-nums'] },
    // The card is a pane of ROW GLASS (variant="row": i=12 blur + 0.70 floor +
    // specular top hairline + edge — GlassSurface supplies all of it). The
    // Pressable outer owns margins + press feedback; this style is the pane's
    // layout + the light-mode e1 lift. Dark retires drop shadows entirely —
    // the luminous edge hairlines carry the lift (Deep Field is
    // luminosity-led; GLASS.md).
    cardOuter: { marginBottom: spacing.md, minHeight: size.cardMin },
    card: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      minHeight: size.cardMin,
      ...(color.scheme === 'light' ? shadow.e1 : {}),
    },
    // Clips the press sheen to the card's rounded corners.
    sheenClip: { borderRadius: radius.lg, overflow: 'hidden' },
    cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    // SW-22 / SW-36 moved out with the header they described: the 44pt frame,
    // the wrap and the title's width floor now live in FlagCard, where the
    // header is drawn, and are pinned there by
    // flexBasisUnderLargeType.guard.test.ts and hitTargetFrame.guard.test.ts.
    // Container holds the image so overflow:hidden clips rounded corners on
    // Android (where borderRadius on Image alone is unreliable).
    cardThumbWrap: {
      width: size.thumb,
      height: size.thumb,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: color.surfaceNeutral,
      flexShrink: 0,
    },
    cardThumb: {
      width: '100%',
      height: '100%',
    },
    thumbSkeleton: { position: 'absolute', top: 0, left: 0 },
    // Action row (F3): one filled verb, one ghost segmented pair, one link.
    // One tidy row at default; the card swaps to cardActionsStack, everything
    // full-width, when compactActions is true (narrow width / large type).
    // T5: three children of different natures share this row, so it wraps
    // rather than squeezing the segmented pair below its own longest word.
    cardActionsRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, gap: spacing.sm },
    cardActionsStack: { gap: spacing.sm },
    actionBtn: {
      // Fully-rounded pills (Phase 13 editorial language). Width is owned by the
      // flex below — NOT by horizontal padding — so the labels distribute evenly
      // instead of sizing each pill to its text (the old wrap bug). Vertical
      // padding + minHeight carry the 44pt touch target.
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnFull: { alignSelf: 'stretch' },
    // The loading skeleton's header, which mirrors FlagCard's own but lives
    // here: the shared component draws a real flag, and a skeleton has no flag.
    skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: a11y.minTargetSize },
    skeletonHeaderText: { flexGrow: 1, flexShrink: 1, gap: spacing.tight },
    actionBtnLead: { flexGrow: 1, flexBasis: 0, minWidth: 0 },
    // The pair needs slightly more room than the lone lead verb: it is two
    // words behind one hairline, and "Resolved" is the longest label in the row.
    actionBtnSiblings: { flexGrow: 1.3, flexBasis: 0, minWidth: 0 },

    // F3 — the ONE filled verb, whichever commit verb is next in the lifecycle.
    // ctaFill, not brand — the CTA fill is MODE-INDEPENDENT #1466E0 (dark
    // brand #4E89EF + white = 3.4:1 fails; script-arbitrated, GLASS.md).
    leadBtn: { backgroundColor: color.ctaFill },
    leadText: { color: color.textOnBrand, fontWeight: font.weight.semibold, fontSize: font.size.sm },

    // The ghost segmented control. The CONTAINER draws the one hairline and
    // clips the ends so the pair reads as a single object; the cells draw
    // nothing but the divider between them. This replaces two separate
    // treatments — Resolved was a neutral FILL and Reject a ghost — which made
    // two alternatives look like two unrelated decisions. Ghost edges use the
    // arbitrated on-glass hairline (borderSubtle vanishes over the row material).
    segmented: {
      flexDirection: 'row',
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: color.glassGhostEdge,
      overflow: 'hidden',
    },
    // borderRadius: 0 overrides actionBtn's pill radius on purpose — inside the
    // container a rounded cell would draw a second, smaller pill against the
    // first. `overflow: 'hidden'` above is what gives the end cells their curve.
    segCell: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      borderRadius: 0,
      backgroundColor: 'transparent',
    },
    segCellDivided: { borderLeftWidth: 1, borderLeftColor: color.glassGhostEdge },
    segText: { color: color.text, fontWeight: font.weight.semibold, fontSize: font.size.sm },

    // Details is navigation, not a verb, so it stops wearing a button. The 44pt
    // box survives in `actionBtn`; only the border and the fill are gone.
    detailsLink: { backgroundColor: 'transparent', paddingHorizontal: spacing.sm },
    // inkSelect, not inkDetailsGhost — the same ink "Select multiple" and "Clear
    // filters" already carry, so every text link on this screen is one colour.
    // It is also the higher-contrast of the two in BOTH modes: #0F53BE is
    // darker than #1466E0 against the light floor and #B4CFFA is lighter than
    // #84AEF6 against the dark one, so the swap moves away from the mid-tone
    // either way rather than trading one mode's contrast for the other's.
    detailsText: { color: color.inkSelect, fontWeight: font.weight.semibold, fontSize: font.size.sm },
    // D3/C3 — the single trigger that replaced three header rows.
    // T5 / D24: content-sized chips in a row with no escape. At large type
    // "Filter & sort" + "Clear filters" exceed the row and the second chip was
    // pushed off the edge. The chips already measure their own text, so wrap is
    // the whole fix — they stack instead of overflowing.
    filterTriggerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    // The ⋯ circle. Same box as the filter circle beside it; no active state,
    // because the sheet it opens holds no persistent setting of its own.
    toolTriggerBtn: {
      minHeight: 44,
      minWidth: 44,
      borderRadius: radius.circle,
      backgroundColor: chipFill,
      borderWidth: 1,
      borderColor: chipEdge,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    // Now a 44pt circle rather than a text chip: the word it used to carry
    // ("Filter & sort") is the title of the sheet it opens, so nothing had to
    // be invented to drop it. minWidth replaces the horizontal padding that
    // used to size it to its label.
    filterTriggerBtn: {
      minHeight: 44,
      minWidth: 44,
      borderRadius: radius.circle,
      backgroundColor: chipFill,
      borderWidth: 1,
      borderColor: chipEdge,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    // The ⋯ sheet's rows — the map tool sheet's recipe: an icon, a label, one
    // 44pt target each, nothing else.
    toolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 44,
      paddingVertical: spacing.sm,
      // The device caught this one too: without it the row's icon sat flush
      // against the screen edge while the sheet's own title sat at 16pt in.
      // `Sheet` gutters its header and leaves its body to the content, which is
      // why every sibling row in the filter sheet carries the same value.
      paddingHorizontal: spacing.lg,
    },
    toolRowText: { fontSize: font.size.base, fontWeight: font.weight.semibold, color: color.text },
    // MapScreen's ratified active grammar — a filled brand chip with white ink.
    // This is what makes an active filter impossible to miss with the sheet shut.
    filterTriggerBtnActive: { backgroundColor: color.ctaFill, borderColor: 'transparent' },
    // Ships as a CHIP, not a bare link: that keeps it on the already-arbitrated
    // chipFill + inkSelect stack instead of introducing a new ink-on-chrome pair
    // (and therefore an arbiter run) for one secondary control.
    clearFiltersBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.circle,
      backgroundColor: chipFill,
      borderWidth: 1,
      borderColor: chipEdge,
      justifyContent: 'center',
    },
    clearFiltersText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: color.inkSelect },
    // Inside the OPAQUE sheet the chips take the shipped solid pair. The glass
    // chipFill is designed to sit on the chrome pane's blur; over an opaque card
    // it would be an un-arbitrated composite.
    sheetChip: {
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm - 1,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetChipActive: { backgroundColor: color.ctaFill, borderColor: 'transparent' },
    sheetChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: color.textStrong, flexShrink: 0 },
    sheetChipTextActive: { color: color.textOnBrand },
    sheetSortChip: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 44,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetSortChipActive: { backgroundColor: color.ctaFill, borderColor: 'transparent' },
    sheetSortChipText: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: color.textStrong },
    sheetSortChipTextActive: { color: color.textOnBrand },
    // The strip becomes a wrap row inside the sheet: all seven categories are
    // visible at once, where the horizontal strip showed about three.
    categoryWrapRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm + 2,
    },
    mineToggleRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      // No fill — the row sits on the chrome pane's glass.
    },
    // BP11 one press vocabulary: the neutral pressed fill shared by the mine /
    // category / sort chips. Inactive chips only (active chips keep their ctaFill);
    // glassChipInk stays full opacity and AA on borderPressed in both schemes.
    chipPressed: { backgroundColor: color.borderPressed },
    // Free-text search — sits above the chip filter rows so the cursor
    // doesn't shift down when the user starts typing. Bordered field +
    // inline clear button so the affordance is obvious without a separate
    // label.
    // T5 / D24: the input is flex:1 (basis 0), so the non-shrinking "Select
    // multiple" button beside it could squeeze the field to a sliver at large
    // type. A floor on the field plus wrap on the row sends the button to its
    // own line instead.
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      rowGap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    searchField: {
      flex: 1,
      flexBasis: 0,
      // T5: the floor that makes searchRow's flexWrap fire (see that style).
      minWidth: 200,
      // The wrapper owns the field geometry and visible material. Its 46pt
      // height is a real field, not an input border whose accessibility frame
      // shrinks inside the native control.
      minHeight: a11y.minTargetSize + 2,
      borderRadius: radius.circle,
      backgroundColor: chipFill,
      borderWidth: 1,
      borderColor: chipEdge,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    searchInput: {
      flex: 1,
      color: color.glassChipInk,
      fontSize: font.size.base,
      paddingVertical: spacing.sm,
      paddingHorizontal: 0,
    },
    searchClearBtn: {
      minWidth: 44, // WCAG 2.5.8: was 32pt (below 44pt project standard)
      minHeight: 44, // WCAG 2.5.8: was 32pt (below 44pt project standard)
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.circle,
    },
    // Sort row — mirrors sevFilterRow's look, with an explicit "Sort:" label
    // before the chips so sighted users get a hint distinguishing it from
    // the severity row above. The label is a11y-hidden because the chip
    // labels already say "Sort by …".
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    sortLabel: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      // inkGlassMuted — script-arbitrated for the chrome glass over worst-case
      // scrolling content (textSubtle #707070 measured 2.69:1 there — killed).
      color: color.inkGlassMuted,
      marginRight: 2,
    },
    // Bulk-select entry — a discoverable button for SR users and anyone
    // unfamiliar with the long-press gesture. Tinted to match the sort chip's
    // accent.
    //
    // Phase 13 made it a compact right-aligned secondary action (it had been a
    // dominating full-width bordered button) so the cards led the screen.
    // D3/C1 finishes that thought: it no longer has a ROW of its own either —
    // it rides the search row's trailing edge, returning 52pt to the list.
    // `flexShrink: 0` is what keeps it at its full >=44pt width while the
    // text input takes the remaining space.
    // inkSelect — script-arbitrated on the chip-over-chrome stack (brand
    // #1466E0 measured 4.17:1 over the worst-case base — forked to brandText).
    // Card selection visuals — a subtle tinted background + a 2px accent
    // border so a selected card pops without needing to recolor the photo
    // thumbnail or muddle the severity dot. Pairs with the checkmark in
    // the card header for an unambiguous "yes this one's picked" signal.
    cardSelected: {
      // Fill + border now come from GlassSurface props (overlayTint =
      // glassSelectedTint wash, edgeColor/edgeWidth = 2px brand; RT designed
      // fill = brandSofter via solidColor). Only the padding compensation
      // lives here: 15 + 2px edge = 17 visual inset, matching the unselected
      // 16 + 1px hairline — the content box doesn't jump on select toggle.
      padding: spacing.lg - 1,
    },
    selectCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: color.brand,
      backgroundColor: color.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectCheckOn: { backgroundColor: color.brand },
    // Floating bulk-action bar — overlays the SectionList in selection mode.
    // Column-laid so the live-region count Text sits above the row of action
    // buttons. It sits ABOVE the tab bar (bottom offset applied inline at the
    // JSX site, platform-gated) and its measured height feeds the list reserve.
    bulkBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      // `bottom` is applied inline at the JSX site (platform-gated): 0 on web
      // (tab bar is in-flow), tabBarHeight on native (tab bar is absolute).
      flexDirection: 'column',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md - 2,
      // The bar no longer owns the home-indicator inset — the tab bar it now
      // sits above does. Just enough breathing room below the buttons.
      paddingBottom: spacing.md,
      // Fill/edge/specular come from variant="bulk" (the second, conditional
      // i=24 pane). The up-shadow stays out here — GlassSurface's clip layer
      // would swallow it (iOS overflow:hidden clips its own shadow). Mockup:
      // light 0 -2 8 shadowTint@0.12 · dark 0 -2 8 black@0.35 (the one dark
      // shadow Deep Field keeps — the bar needs lift off the tab bar).
      ...(color.scheme === 'light'
        ? { shadowColor: color.shadowTint, shadowOpacity: 0.12 }
        : { shadowColor: '#000', shadowOpacity: 0.35 }),
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: 8,
    },
    bulkCountText: {
      color: color.textStrong,
      fontSize: font.size.base,
      fontWeight: font.weight.bold,
      paddingHorizontal: spacing.tight,
      letterSpacing: 0.2,
    },
    bulkButtonRow: { flexDirection: 'row', gap: spacing.sm },
    // The deliberate stack, matching cardActionsStack rather than inventing a
    // second compact language. A column resets flexBasis' meaning (it becomes
    // height), so `alignSelf: 'stretch'` on the button is what makes each one
    // full width — exactly what actionBtnFull does for the cards.
    bulkButtonStack: { gap: spacing.sm },
    bulkBtnFull: { alignSelf: 'stretch' },
    bulkBtn: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md - 2,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bulkBtnDisabled: { opacity: 0.45 },
    bulkBtnPressed: { opacity: 0.85 },
    // ctaFill, not brand: the CTA fill is MODE-INDEPENDENT #1466E0 (dark brand
    // #4E89EF + white text = 3.4:1, fails AA — script-arbitrated fork).
    bulkVerifyBtn: { backgroundColor: color.ctaFill },
    // color.successStrong on white-text ≈ 4.6:1+ — WCAG 1.4.3 AA. color.success alone fails (~2.8:1).
    bulkResolveBtn: { backgroundColor: color.successStrong },
    // color.accentPurple: distinguishable from brand-blue + successStrong for protanopia/deuteranopia.
    bulkWatchBtn: { backgroundColor: color.accentPurple },
    // Cancel uses the neutral chip palette so it doesn't compete for
    // attention with the primary actions.
    bulkCancelBtn: {
      backgroundColor: reduceTransparency ? color.surfaceNeutral : color.glassCancelFill,
      borderWidth: 1,
      borderColor: color.scheme === 'dark' ? color.glassGhostEdge : color.borderStrong,
    },
    // 14pt bold on the dark button fills — meets WCAG 1.4.3 AA for body text.
    // Bumped from 13pt with the resolve-btn color change to clear AA.
    bulkBtnText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    bulkCancelText: { color: color.textStrong, fontWeight: font.weight.bold, fontSize: font.size.base },
  });
};
