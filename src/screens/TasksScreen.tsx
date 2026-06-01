import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { formatDistance, formatWalkingEta, haversineKm, type LatLng } from '@/lib/distance';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  NEXT_PAGE_SIZE,
  severityColor,
  updateFlagStatus,
} from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { useFlags } from '@/lib/flagsStore';
import { useUserLocation } from '@/lib/location';
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
import FlagDetailModal, { type DetailAction } from '@/components/FlagDetailModal';
import PhotoLightboxModal from '@/components/PhotoLightboxModal';
import { AppText } from '@/components/ui/AppText';
import { Search, Sparkles } from 'lucide-react-native';
import { font, radius, shadow, size, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

// Statuses Tasks shows. Even if the provider's `statuses` is widened by the
// Map's filter, Tasks restricts the visible set to the actionable lifecycle
// states (open → verified).
const TRIAGE_STATUSES: FlagStatus[] = ['open', 'verified'];

// Approximate height of the floating bulk-action bar including its safe-area
// padding. Used to reserve list-bottom space so the last card isn't hidden
// behind the bar in selection mode.
const BULK_BAR_HEIGHT = 88;

export default function TasksScreen() {
  const color = useColor();
  const styles = makeStyles(color);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Tasks'>>();
  const { user } = useAuth();
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

  // Min-severity threshold. 0 means "show all" (no filter applied); 2..5
  // means "show flags with severity >= N". Lets coordinators focus on the
  // most-urgent issues without leaving the triage screen.
  const [minSeverity, setMinSeverity] = useState<0 | 2 | 3 | 4 | 5>(0);

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

  // Free-text quick search. Substring match against description and the
  // human-readable category label. Trimmed + lowercased once in useMemo
  // so the per-row filter is a cheap `.includes`. Session-only — resets
  // on tab unmount, matching the rest of the Tasks filters.
  const [searchText, setSearchText] = useState('');
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

  // Apply the mine-only, min-severity, category, and free-text filters on top of the
  // triage filter so sections always reflect exactly what the list renders.
  const displayFlags = useMemo(() => {
    let out = flags;
    if (mineOnly && userId) out = out.filter((f) => f.user_id === userId);
    if (minSeverity > 0) out = out.filter((f) => f.severity >= minSeverity);
    if (categoryFilter) out = out.filter((f) => f.category === categoryFilter);
    const q = debouncedSearchText.trim().toLowerCase();
    if (q) {
      out = out.filter((f) => {
        const desc = (f.description ?? '').toLowerCase();
        const catLabel = CATEGORY_LABELS[f.category].toLowerCase();
        return desc.includes(q) || catLabel.includes(q);
      });
    }
    return out;
  }, [flags, mineOnly, userId, minSeverity, categoryFilter, debouncedSearchText]);

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
    const out: Array<{ title: string; data: FlagRow[] }> = [];
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
  const { location: userLocation } = useUserLocation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<FlagRow | null>(null);

  // Bulk-select state — component-local on purpose. Switching tabs unmounts
  // TasksScreen which resets the selection (matches the brief: "resets on
  // tab change"). Pure helpers live in src/lib/taskSelection.ts.
  const [selection, setSelection] = useState<TaskSelectionState>(EMPTY_SELECTION);
  // Tracks whether a bulk action is currently running so we can disable
  // the floating bar's buttons and avoid double-submits.
  const [bulkBusy, setBulkBusy] = useState(false);

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

  // Announce the selection bar's appearance once, when it first becomes
  // visible. Skipping the announcement on every count change keeps SR
  // chatter down — each card already announces its own checked/unchecked
  // state via accessibilityState.
  const announcedBarRef = useRef(false);
  useEffect(() => {
    if (selection.active && !announcedBarRef.current) {
      announcedBarRef.current = true;
      AccessibilityInfo.announceForAccessibility(
        `Selection mode. ${selectionCount(selection)} selected.`,
      );
    } else if (!selection.active) {
      announcedBarRef.current = false;
    }
  }, [selection]);

  const exitSelection = useCallback(() => {
    setSelection((s) => clearSelection(s));
  }, []);

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
    setSelection((s) => (s.active ? toggleId(s, flag.id) : enterSelectionWith(flag.id)));
  }, []);

  // SR-accessible entry into selection mode — a button at the top of the
  // screen because long-press is hard to discover (and hard to perform)
  // with a screen reader. Starts the selection empty so SR users can pick
  // cards via the checkbox role we wire up below.
  const enterSelectionEmpty = useCallback(() => {
    setSelection({ active: true, selectedIds: [] });
    AccessibilityInfo.announceForAccessibility('Selection mode. Tap cards to select.');
  }, []);

  // Track the flash-banner timer in a ref so we can cancel it on unmount or
  // when a new flash arrives — otherwise leaving the tab mid-flash triggers
  // a "setState on unmounted component" warning.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFlash = useCallback((msg: string) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(msg);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  }, []);

  // Run a bulk action (verify or resolve) across the current selection.
  // Iterates and calls updateFlagStatus per id — keeps the code simple and
  // matches the existing single-card flow's optimistic-then-refresh shape.
  // Errors on individual rows surface as an Alert at the end with a count.
  // Declared AFTER showFlash so the closure binds to its real value.
  const runBulkAction = useCallback(
    async (action: 'verify' | 'resolve') => {
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
          const updated = await updateFlagStatus(id, targetStatus);
          track('flag_status_changed', { flagId: id, from: updated.status === targetStatus ? 'open' : updated.status, to: targetStatus });
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
      // one of the same flags). Fire-and-forget; the optimistic updates
      // already handled instant feedback.
      refresh().catch(() => {});

      const past = action === 'verify' ? 'Verified' : 'Resolved';
      if (succeeded > 0) {
        showFlash(`${past} ${succeeded} flag${succeeded === 1 ? '' : 's'}`);
        AccessibilityInfo.announceForAccessibility(
          `${past} ${succeeded} flag${succeeded === 1 ? '' : 's'}.`,
        );
      }
      if (failures.length > 0) {
        Alert.alert(
          `Could not ${action} ${failures.length} flag${failures.length === 1 ? '' : 's'}`,
          failures[0] ?? 'Unknown error',
        );
      }
      exitSelection();
    },
    [selection, flagsMap, patchFlag, removeFlag, refresh, exitSelection, showFlash],
  );

  // Bulk-watch — adds every currently-selected id to the user's Watched
  // list in one shot. Useful when triaging a clump of related flags
  // ("watch all of these for status changes") without leaving the
  // SectionList. Delegates to addWatchedBulk so the FIFO eviction and
  // dedupe live in one place.
  const runBulkWatch = useCallback(async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to watch flags.');
      return;
    }
    const ids = selection.selectedIds.slice();
    if (ids.length === 0) {
      exitSelection();
      return;
    }
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
        AccessibilityInfo.announceForAccessibility(msg);
      }
    } catch (e) {
      Alert.alert("Couldn't update your watched list", errorMessage(e));
    } finally {
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

  // Keep the Tasks tab badge in sync with the count of open/verified flags so
  // the user sees at a glance how many items need attention without switching
  // to this tab. A count of zero clears the badge (undefined removes it).
  // Uses navigation.setOptions so the badge lives on the screen that owns the
  // data — no need to thread state through RootNavigator.
  useEffect(() => {
    const count = flags.length; // `flags` is already filtered to open+verified
    navigation.setOptions({
      tabBarBadge: count > 0 ? count : undefined,
    });
  }, [flags, navigation]);

  // Build the tap-to-retry banner copy from the provider's error string.
  // The provider already includes the leading "Couldn't load flags:" prefix
  // when relevant; we just append the retry hint if it isn't there.
  const errorBannerText = useMemo(() => {
    if (!flagsError) return null;
    return flagsError.toLowerCase().includes('tap to retry')
      ? flagsError
      : `${flagsError}. Tap to retry.`;
  }, [flagsError]);

  // Trigger lives in supabase/schema.sql (handle_flag_status_change, ~line 75).
  // Reporter ALWAYS gets the reporter bonus (5 verify / 10 resolve).
  // Actor gets the actor bonus (2 verify / 5 resolve) ONLY when actor != reporter.
  // So if you triage your own flag, you earn the reporter bonus only — keep this
  // mapping in sync with the trigger if the values ever change.
  const applyStatusChange = useCallback(
    (updated: FlagRow, action: DetailAction, isOwn: boolean) => {
      // Optimistic update via the shared store: replace the row in-place for
      // verify (status changes but flag stays visible), remove it for
      // resolve/reject (it leaves the triage queue).
      if (action === 'verify') {
        patchFlag(updated.id, { ...updated });
      } else {
        removeFlag(updated.id);
      }
      if (action === 'verify') {
        const msg = isOwn ? 'Verified! +5 points' : 'Verified! +2 points';
        showFlash(msg);
        // WCAG 4.1.3: announce single-card status changes to screen readers.
        // Bulk actions in runBulkAction already call announceForAccessibility;
        // single-card triage through this path was previously silent to SR.
        AccessibilityInfo.announceForAccessibility(msg);
      } else if (action === 'resolve') {
        const msg = isOwn ? 'Resolved! +10 points' : 'Resolved! +5 points';
        showFlash(msg);
        AccessibilityInfo.announceForAccessibility(msg);
      }
      // Re-fetch via the shared store to reconcile with what the server
      // actually committed. Fire-and-forget — the optimistic update already
      // handled instant feedback. The refresh also updates the Map tab's pin
      // count through the shared context.
      refresh().catch(() => {});
    },
    [refresh, patchFlag, removeFlag, showFlash],
  );

  const setStatus = useCallback(
    async (id: string, status: FlagStatus, isOwn: boolean) => {
      setBusyId(id);
      try {
        const updated = await updateFlagStatus(id, status);
        const action: DetailAction =
          status === 'verified' ? 'verify' : status === 'resolved' ? 'resolve' : 'reject';
        applyStatusChange(updated, action, isOwn);
      } catch (e) {
        Alert.alert("Couldn't update this flag", errorMessage(e));
      } finally {
        setBusyId(null);
      }
    },
    [applyStatusChange],
  );

  const handleViewOnMap = useCallback(
    (target: FlagRow) => {
      navigation.navigate('Map', {
        focusFlag: { id: target.id, lat: target.lat, lng: target.lng },
        ts: Date.now(),
      });
    },
    [navigation],
  );

  const handleDeleted = useCallback(
    (deletedId: string) => {
      removeFlag(deletedId);
      showFlash('Flag deleted');
      // WCAG 4.1.3: announce deletion to screen readers (same pattern as bulk actions).
      AccessibilityInfo.announceForAccessibility('Flag deleted');
    },
    [removeFlag, showFlash],
  );

  const showDetails = useCallback((flag: FlagRow) => {
    setSelectedFlag(flag);
  }, []);

  // Memoized renderItem — extracted from inline JSX so React.memo on FlagCard
  // actually fires. An inline arrow in the SectionList prop creates a new
  // function reference on every parent render, bypassing memo and causing all
  // visible cards to re-check their props even when nothing changed.
  const renderFlagItem = useCallback(
    ({ item }: { item: FlagRow }) => (
      <FlagCard
        flag={item}
        isBusy={busyId === item.id}
        isOwn={item.user_id === userId}
        userLocation={userLocation}
        selectionActive={selection.active}
        selected={isSelected(selection, item.id)}
        onPress={(flag) => {
          if (selection.active) {
            setSelection((s) => toggleId(s, flag.id));
          } else {
            track('flag_viewed', { flagId: flag.id, source: 'tasks' });
            handleViewOnMap(flag);
          }
        }}
        onLongPress={handleCardLongPress}
        onSetStatus={setStatus}
        onShowDetails={showDetails}
      />
    ),
    [
      busyId,
      userId,
      userLocation,
      selection,
      handleViewOnMap,
      handleCardLongPress,
      setStatus,
      showDetails,
    ],
  );

  // Load-more handler shared by the button (screen-reader / keyboard) and any
  // future scroll-triggered path. Surfaces errors as an Alert so the user has
  // a clear retry path.
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadMore().catch((e: unknown) => {
      Alert.alert('Could not load more flags', errorMessage(e, 'Unknown error'));
    });
  }, [hasMore, loadingMore, loadMore]);

  if (loading && flags.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <AppText variant="body" style={styles.subtitle}>Loading flags…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {flash && (
        <View style={styles.flashWrap} pointerEvents="none">
          <View style={styles.flashPill}>
            {/* accessibilityLiveRegion covers Android TalkBack;
                iOS VoiceOver handled by announceForAccessibility at each call site.
                WCAG 4.1.3 — status messages must reach all AT. */}
            <AppText variant="label" style={styles.flashText} accessibilityLiveRegion="polite">{flash}</AppText>
          </View>
        </View>
      )}
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
          accessibilityState={{ busy: loading }}
          accessibilityLiveRegion="polite"
        >
          {loading ? (
            <ActivityIndicator color={color.textOnBrand} />
          ) : (
            <AppText variant="label" style={styles.errorBannerIcon}>⚠</AppText>
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
          accessibilityLabel="Showing offline data. Connect to the internet to refresh."
        >
          <AppText
            variant="label"
            style={styles.offlineBannerIcon}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            📶
          </AppText>
          <AppText variant="body" style={styles.offlineBannerText}>Showing saved data — connect to the internet for the latest</AppText>
        </View>
      )}
      {/* Select-multiple entry — visible only when there's something to
          select and we're not already in selection mode. Long-press on a
          card does the same thing, but screen-reader users (and anyone
          who doesn't know about long-press) need a discoverable button.
          Renders above the other filter rows so it's the first focusable
          control on the screen after the error banner. */}
      {!selection.active && flags.length > 0 && (
        <View style={styles.selectEntryRow}>
          <Pressable
            onPress={enterSelectionEmpty}
            style={({ pressed }) => [
              styles.selectEntryBtn,
              pressed && styles.selectEntryBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Select multiple"
            accessibilityHint="Enter selection mode to verify or resolve multiple flags at once"
          >
            <AppText variant="label" style={styles.selectEntryText}>Select multiple</AppText>
          </Pressable>
        </View>
      )}
      {/* Free-text search — substring match against description and
          category label. Hidden if the list is empty (nothing to search).
          The clear (×) button is part of the textbox row so it stays a
          single, predictable a11y target. */}
      {flags.length > 0 && (
        <View style={styles.searchRow}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by description or category…"
            placeholderTextColor={color.placeholderText}
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
              style={styles.searchClearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <AppText variant="label" style={styles.searchClearText}>✕</AppText>
            </Pressable>
          )}
        </View>
      )}
      {/* Mine-only toggle — shown only when signed in. A chip row that
          switches between "All flags" and "My flags" without opening the
          full filter panel. Resets to All when the tab loses focus? No —
          we keep it until the user taps again; it's a deliberate choice. */}
      {userId && (
        <View style={styles.mineToggleRow}>
          <Pressable
            onPress={() => handleScopeChange(false)}
            disabled={!mineOnlyHydrated}
            style={[styles.mineChip, !mineOnly && styles.mineChipActive]}
            accessibilityRole="button"
            accessibilityLabel="Show all flags"
            accessibilityState={{ selected: !mineOnly, disabled: !mineOnlyHydrated }}
          >
            <AppText variant="label" style={[styles.mineChipText, !mineOnly && styles.mineChipTextActive]}>All</AppText>
          </Pressable>
          <Pressable
            onPress={() => handleScopeChange(true)}
            disabled={!mineOnlyHydrated}
            style={[styles.mineChip, mineOnly && styles.mineChipActive]}
            accessibilityRole="button"
            accessibilityLabel="Show only my flags"
            accessibilityState={{ selected: mineOnly, disabled: !mineOnlyHydrated }}
          >
            <AppText variant="label" style={[styles.mineChipText, mineOnly && styles.mineChipTextActive]}>Mine</AppText>
          </Pressable>
        </View>
      )}
      {/* Min-severity chip row — show even when not signed in (it works
          on the public flag list). Hidden if the list is empty so there's
          nothing to filter against. */}
      {flags.length > 0 && (
        <View style={styles.sevFilterRow} accessibilityLabel="Filter by minimum severity">
          {[
            { value: 0 as const, label: 'All' },
            { value: 2 as const, label: '2+' },
            { value: 3 as const, label: '3+' },
            { value: 4 as const, label: '4+' },
            { value: 5 as const, label: '5' },
          ].map(({ value, label }) => {
            const active = minSeverity === value;
            // When active and value > 0, tint with the severity palette so
            // the threshold's color is immediately recognizable.
            const activeColor = value === 0 ? color.brand : severityColor(value);
            return (
              <Pressable
                key={value}
                onPress={() => setMinSeverity(value)}
                style={[styles.sevChip, active && { backgroundColor: activeColor }]}
                accessibilityRole="button"
                accessibilityLabel={
                  value === 0 ? 'Show all severities' : `Show severity ${value} and above`
                }
                accessibilityState={{ selected: active }}
              >
                <AppText variant="label" style={[styles.sevChipText, active && styles.sevChipTextActive]}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
      {/* Category quick-filter — horizontally scrollable chip strip
          beneath the severity row. Always lists every category so the
          strip is stable as flags come and go. Tapping the active chip
          clears it (toggles to All). Session-only — resets with the tab. */}
      {flags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
          accessibilityLabel="Filter by category"
        >
          <Pressable
            onPress={() => handleCategoryChange(null)}
            style={[styles.catChip, categoryFilter === null && styles.catChipActive]}
            accessibilityRole="button"
            accessibilityLabel="Show all categories"
            accessibilityState={{ selected: categoryFilter === null }}
          >
            <AppText variant="label" style={[styles.catChipText, categoryFilter === null && styles.catChipTextActive]}>
              All
            </AppText>
          </Pressable>
          {CATEGORY_ORDER.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => handleCategoryChange(active ? null : cat)}
                style={[styles.catChip, active && styles.catChipActive]}
                accessibilityRole="button"
                accessibilityLabel={`${CATEGORY_LABELS[cat]}${active ? ', selected, tap to deselect' : ''}`}
                accessibilityState={{ selected: active }}
              >
                <AppText variant="label" style={[styles.catChipText, active && styles.catChipTextActive]}>
                  {CATEGORY_LABELS[cat]}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {/* Sort segmented control — sits below the filter rows so the
          user reads "what shows up" → "in what order" top to bottom.
          Hidden when there's nothing to sort (no flags after filtering)
          to keep the chrome tight. */}
      {displayFlags.length >= 2 && (
        <View style={styles.sortRow} accessibilityRole="tablist" accessibilityLabel="Sort order">
          <AppText
            variant="body"
            style={styles.sortLabel}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            Sort:
          </AppText>
          {TASKS_SORT_ORDER.map((mode) => {
            const active = sortMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => handleSortChange(mode)}
                style={[styles.sortChip, active && styles.sortChipActive]}
                accessibilityRole="tab"
                accessibilityLabel={`Sort by ${TASKS_SORT_LABELS[mode]}`}
                accessibilityState={{ selected: active }}
              >
                <AppText variant="label" style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {TASKS_SORT_LABELS[mode]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
      <SectionList
        sections={sections}
        keyExtractor={(f) => f.id}
        contentContainerStyle={[
          sections.length === 0 ? styles.emptyContainer : styles.list,
          // Reserve room for the floating bar so the last card doesn't sit
          // under it. Using paddingBottom (cross-platform) instead of
          // contentInset (iOS-only) — Android otherwise hides the last card.
          selection.active && { paddingBottom: BULK_BAR_HEIGHT },
        ]}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              refresh().catch(() => {});
            }}
          />
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeader} accessible accessibilityRole="header">
            <AppText variant="heading" style={styles.sectionTitle}>{title}</AppText>
            <View style={styles.sectionCountPill}>
              <AppText variant="monoBold" style={styles.sectionCountText}>{data.length}</AppText>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard} accessible accessibilityRole="text">
            <View
              style={styles.emptyIcon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {categoryFilter || searchText.trim() ? (
                <Search size={36} color={color.textSubtle} strokeWidth={2} />
              ) : (
                <Sparkles size={36} color={color.goldAccent} strokeWidth={2} />
              )}
            </View>
            <AppText variant="heading" style={styles.emptyTitle}>
              {categoryFilter
                ? `No ${CATEGORY_LABELS[categoryFilter]} flags`
                : searchText.trim()
                  ? 'No matches'
                  : 'All caught up'}
            </AppText>
            <AppText variant="body" style={styles.emptyBody}>
              {categoryFilter
                ? `No open or verified ${CATEGORY_LABELS[categoryFilter].toLowerCase()} flags right now. Tap "All" above to see every category.`
                : searchText.trim()
                  ? `Nothing matches "${searchText.trim()}". Try a different keyword or clear the search.`
                  : "You're all caught up — nice work! New reports show up here as the community adds them. Pull down to refresh anytime."}
            </AppText>
          </View>
        }
        renderItem={renderFlagItem}
        ListFooterComponent={
          // Only render the footer when the list has items — showing a
          // spinner or end-state beneath an empty list would be confusing.
          sections.length === 0 ? null : (
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
                  accessibilityState={{ busy: loadingMore }}
                >
                  {loadingMore ? (
                    <ActivityIndicator
                      accessibilityLabel="Loading more flags"
                      accessibilityState={{ busy: true }}
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
                  {"That's everything nearby — you're up to date ✓"}
                </AppText>
              )}
            </View>
          )
        }
      />
      {/* Floating bulk-action bar — appears at the bottom in selection
          mode. Positioned absolute so it overlays the SectionList rather
          than reflowing it. NOT wrapped in a live region — the count lives
          in its own live-region Text above the buttons so SR re-announces
          the count only (not every button label) when cards toggle. */}
      {selection.active && (
        <View style={styles.bulkBar}>
          {/* The single source of truth for "how many are picked", spoken
              by SR on every change. Buttons below are static labels so
              they don't double-announce. */}
          <AppText variant="label" style={styles.bulkCountText} accessibilityLiveRegion="polite">
            {`${selectionCount(selection)} selected`}
          </AppText>
          <View style={styles.bulkButtonRow}>
            <Pressable
              onPress={() => {
                void runBulkAction('verify');
              }}
              disabled={bulkBusy || selectedOpenCount === 0}
              style={({ pressed }) => [
                styles.bulkBtn,
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
              accessibilityState={{
                disabled: bulkBusy || selectedOpenCount === 0,
                busy: bulkBusy,
              }}
            >
              <AppText variant="label" style={styles.bulkBtnText}>Verify</AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                void runBulkAction('resolve');
              }}
              disabled={bulkBusy || selectionCount(selection) === 0}
              style={({ pressed }) => [
                styles.bulkBtn,
                styles.bulkResolveBtn,
                (bulkBusy || selectionCount(selection) === 0) && styles.bulkBtnDisabled,
                pressed && !bulkBusy && selectionCount(selection) > 0 && styles.bulkBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Resolve"
              accessibilityHint={
                selectionCount(selection) === 0
                  ? 'No flags selected'
                  : 'Marks each selected flag as resolved'
              }
              accessibilityState={{
                disabled: bulkBusy || selectionCount(selection) === 0,
                busy: bulkBusy,
              }}
            >
              <AppText variant="label" style={styles.bulkBtnText}>Resolve</AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                void runBulkWatch();
              }}
              disabled={bulkBusy || selectionCount(selection) === 0 || !user}
              style={({ pressed }) => [
                styles.bulkBtn,
                styles.bulkWatchBtn,
                (bulkBusy || selectionCount(selection) === 0 || !user) && styles.bulkBtnDisabled,
                pressed &&
                  !bulkBusy &&
                  selectionCount(selection) > 0 &&
                  user &&
                  styles.bulkBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Watch"
              accessibilityHint={
                !user
                  ? 'Sign in to watch flags'
                  : selectionCount(selection) === 0
                    ? 'No flags selected'
                    : 'Adds each selected flag to your watched list'
              }
              accessibilityState={{
                disabled: bulkBusy || selectionCount(selection) === 0 || !user,
                busy: bulkBusy,
              }}
            >
              <AppText variant="label" style={styles.bulkBtnText}>Watch</AppText>
            </Pressable>
            <Pressable
              onPress={exitSelection}
              disabled={bulkBusy}
              style={({ pressed }) => [
                styles.bulkBtn,
                styles.bulkCancelBtn,
                bulkBusy && styles.bulkBtnDisabled,
                pressed && !bulkBusy && styles.bulkBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel selection"
              accessibilityHint="Exits selection mode without changing any flags"
              accessibilityState={{ disabled: bulkBusy }}
            >
              <AppText variant="label" style={styles.bulkCancelText}>Cancel</AppText>
            </Pressable>
          </View>
        </View>
      )}
      <FlagDetailModal
        visible={selectedFlag !== null}
        flag={selectedFlag}
        onClose={() => setSelectedFlag(null)}
        onChanged={applyStatusChange}
        onDeleted={handleDeleted}
        onViewOnMap={handleViewOnMap}
      />
    </View>
  );
}

interface FlagCardProps {
  flag: FlagRow;
  isBusy: boolean;
  isOwn: boolean;
  /** Current user position, or null when unknown / permission denied. */
  userLocation: LatLng | null;
  /** True when the screen is in bulk-select mode. Changes tap semantics. */
  selectionActive: boolean;
  /** True when this card is part of the current selection. */
  selected: boolean;
  onPress: (flag: FlagRow) => void;
  /** Long-press enters / extends selection. */
  onLongPress: (flag: FlagRow) => void;
  onSetStatus: (id: string, status: FlagStatus, isOwn: boolean) => void;
  onShowDetails: (flag: FlagRow) => void;
}

// React.memo so a single triage action (which flips busyId on the parent)
// only re-renders the card that's actually busy — not every visible card.
// At hundreds of rows this is the difference between snappy and laggy.
// The userLocation prop is stable across renders (one-shot fetch), so it
// doesn't disturb memoization in practice.
const FlagCard = memo(function FlagCard({
  flag,
  isBusy,
  isOwn,
  userLocation,
  selectionActive,
  selected,
  onPress,
  onLongPress,
  onSetStatus,
  onShowDetails,
}: FlagCardProps) {
  const color = useColor();
  const styles = makeStyles(color);
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
  // Compute distance + ETA once per card per location change. Without the
  // memo this would recompute on every parent state flip (busyId, flash).
  const distanceInfo = useMemo(() => {
    if (!userLocation) return null;
    const km = haversineKm(userLocation, { lat: flag.lat, lng: flag.lng });
    return {
      label: formatDistance(km),
      eta: formatWalkingEta(km),
    };
  }, [userLocation, flag.lat, flag.lng]);
  // In selection mode, switch the card's a11y role to "checkbox" so SR
  // users hear "checked / not checked" instead of a generic button hint.
  // Append the selection state to the existing label so the SR reads the
  // category first (the meaningful bit) and the state at the end.
  const baseLabel = `${CATEGORY_LABELS[flag.category]}, severity ${flag.severity}, ${flag.status}. Tap to view on map.`;
  const a11yLabel = selectionActive
    ? `${CATEGORY_LABELS[flag.category]}, severity ${flag.severity}. ${selected ? 'Selected.' : 'Not selected.'}`
    : baseLabel;
  return (
    <Pressable
      onPress={() => onPress(flag)}
      onLongPress={() => onLongPress(flag)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole={selectionActive ? 'checkbox' : 'button'}
      accessibilityState={
        selectionActive ? { checked: selected, disabled: isBusy } : { disabled: isBusy }
      }
      accessibilityLabel={a11yLabel}
      accessibilityHint={
        selectionActive
          ? 'Toggles this flag in the selection'
          : 'Opens the Map tab focused on this flag. Long-press to select multiple.'
      }
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.sevDot, { backgroundColor: severityColor(flag.severity) }]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden={true}
        />
        <AppText variant="label" style={styles.cardTitle}>{CATEGORY_LABELS[flag.category]}</AppText>
        <AppText variant="label" style={styles.statusTag}>{flag.status}</AppText>
        {/* Checkmark indicator in the top-right corner. Hidden from SR
            because the accessibilityState above already conveys the
            checked/unchecked state — duplicating it would just read
            "checked" twice. */}
        {selectionActive && (
          <View
            style={[styles.selectCheck, selected && styles.selectCheckOn]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {selected ? <AppText variant="label" style={styles.selectCheckMark}>✓</AppText> : null}
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        {flag.photo_url && !photoError ? (
          <Pressable
            onPress={() => setLightboxOpen(true)}
            onLayout={() => setPhotoInView(true)}
            hitSlop={spacing.sm}
            style={styles.cardThumbWrap}
            accessibilityRole="button"
            accessibilityLabel={`Photo of ${CATEGORY_LABELS[flag.category]} accessibility issue. Tap to view full screen.`}
            accessibilityHint="Opens a full-screen view of the photo"
          >
            {photoInView ? (
              <Image
                source={{ uri: flag.photo_url }}
                style={styles.cardThumb}
                onError={() => setPhotoError(true)}
                accessible={false}
                importantForAccessibility="no"
              />
            ) : (
              <View style={[styles.cardThumb, { backgroundColor: color.surfaceNeutral }]} />
            )}
          </Pressable>
        ) : null}
        <View style={styles.cardBodyText}>
          {flag.description ? <AppText variant="body" style={styles.cardDesc}>{flag.description}</AppText> : null}
          <AppText variant="mono" style={styles.cardMeta}>
            {`Severity ${flag.severity}` +
              (distanceInfo ? ` • ${distanceInfo.label} · ${distanceInfo.eta}` : '') +
              ` • ${flag.lat.toFixed(4)}, ${flag.lng.toFixed(4)}` +
              ` • ${relativeTime(flag.created_at)}`}
          </AppText>
          <AppText variant="body" style={styles.cardHint}>
            {selectionActive
              ? selected
                ? 'tap to deselect'
                : 'tap to select'
              : 'tap to view on map'}
          </AppText>
        </View>
      </View>
      {/* Hide per-card action buttons during selection mode — the
          floating bar handles bulk actions, and showing both would be
          confusing (a tap on Verify here would still fire the single-
          item flow, not the bulk one). */}
      {!selectionActive && (
        <View style={styles.cardActions}>
          {flag.status === 'open' && (
            <Pressable
              disabled={isBusy}
              onPress={() => onSetStatus(flag.id, 'verified', isOwn)}
              style={[styles.actionBtn, styles.verifyBtn]}
              accessibilityRole="button"
              accessibilityLabel="Verify this flag"
              accessibilityState={{ disabled: isBusy }}
            >
              <AppText variant="label" style={styles.verifyText}>Verify</AppText>
            </Pressable>
          )}
          <Pressable
            disabled={isBusy}
            onPress={() => onSetStatus(flag.id, 'resolved', isOwn)}
            style={[styles.actionBtn, styles.resolveBtn]}
            accessibilityRole="button"
            accessibilityLabel="Mark this flag resolved"
            accessibilityState={{ disabled: isBusy }}
          >
            <AppText variant="label" style={styles.resolveText}>Resolved</AppText>
          </Pressable>
          <Pressable
            disabled={isBusy}
            onPress={() => onSetStatus(flag.id, 'rejected', isOwn)}
            style={[styles.actionBtn, styles.rejectBtn]}
            accessibilityRole="button"
            accessibilityLabel="Reject this flag"
            accessibilityState={{ disabled: isBusy }}
          >
            <AppText variant="label" style={styles.rejectText}>Reject</AppText>
          </Pressable>
          <Pressable
            disabled={isBusy}
            onPress={() => onShowDetails(flag)}
            style={[styles.actionBtn, styles.detailsBtn]}
            accessibilityRole="button"
            accessibilityLabel="View flag details"
            accessibilityHint="Opens a screen with the full report, photo, and more actions"
            accessibilityState={{ disabled: isBusy }}
          >
            <AppText variant="label" style={styles.detailsText}>Details</AppText>
          </Pressable>
        </View>
      )}
      {/* Full-screen photo lightbox — only mounts when the thumbnail exists
          and has loaded successfully. Tapping the thumbnail (or the close
          button inside the modal) dismisses it. */}
      {flag.photo_url && !photoError ? (
        <PhotoLightboxModal
          visible={lightboxOpen}
          photoUrl={flag.photo_url}
          caption={`${CATEGORY_LABELS[flag.category]} accessibility issue`}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </Pressable>
  );
});

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Screen wash — same #f7f9fc the Profile screen uses, so the white
    // cards inside read as cards instead of blending into a white page.
    screen: { flex: 1, backgroundColor: color.surfaceMuted },
    flashWrap: {
      position: 'absolute',
      top: 12,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    flashPill: {
      backgroundColor: color.success,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.circle,
      ...shadow.e2,
    },
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
    errorBannerPressed: { opacity: 0.7 },
    errorBannerIcon: { color: color.textOnBrand, fontSize: font.size.xl, fontWeight: font.weight.bold },
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
      minHeight: 40,
    },
    offlineBannerIcon: { fontSize: font.size.lg },
    offlineBannerText: {
      color: color.warningFg,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      flex: 1,
    },
    center: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.sm,
    },
    list: { padding: spacing.lg },
    // Load-more footer — centered below the last SectionList card.
    // minHeight 44 on the button satisfies WCAG 2.5.5 (minimum touch target).
    footer: {
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadMoreBtn: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.circle,
      borderWidth: 1,
      borderColor: color.brand,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      minWidth: 160,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadMoreBtnPressed: { opacity: 0.7 },
    loadMoreText: { color: color.brand, fontWeight: font.weight.bold, fontSize: font.size.base },
    endText: {
      fontSize: font.size.sm,
      color: color.textMutedAlt,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    emptyContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    emptyCard: {
      backgroundColor: color.surface,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.xxl + spacing.tight,
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: 340,
      ...shadow.e1,
    },
    emptyIcon: { marginBottom: spacing.tight },
    emptyTitle: {
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: -0.2,
    },
    emptyBody: {
      fontSize: font.size.sm,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: font.size.xs,
      fontWeight: font.weight.bold,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    sectionCountPill: {
      backgroundColor: color.brandSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.circle,
      minWidth: 22,
      alignItems: 'center',
    },
    sectionCountText: {
      color: color.brandText,
      fontSize: font.size.caption,
      fontWeight: font.weight.bold,
    },
    title: { fontSize: font.size.xl, fontWeight: font.weight.semibold },
    subtitle: { fontSize: font.size.sm, color: color.textMuted, textAlign: 'center', lineHeight: 19 },
    card: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.md + 2,
      gap: spacing.sm,
      minHeight: size.cardMin,
      ...shadow.e1,
      marginBottom: spacing.md,
    },
    cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sevDot: { width: 12, height: 12, borderRadius: 6 },
    cardTitle: { fontSize: font.size.lg, fontWeight: font.weight.semibold, flex: 1 },
    statusTag: {
      fontSize: font.size.caption,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    cardBody: { flexDirection: 'row', gap: spacing.md },
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
    cardBodyText: { flex: 1, gap: spacing.tight },
    cardDesc: { fontSize: font.size.base, color: color.textStrong },
    cardMeta: { fontSize: font.size.xs, color: color.textMuted },
    cardHint: { fontSize: font.size.caption, color: color.textSubtle, fontStyle: 'italic' },
    cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.tight },
    actionBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifyBtn: { backgroundColor: color.brand },
    verifyText: { color: color.textOnBrand, fontWeight: font.weight.semibold, fontSize: font.size.sm },
    resolveBtn: { backgroundColor: color.success },
    resolveText: { color: color.textOnBrand, fontWeight: font.weight.semibold, fontSize: font.size.sm },
    rejectBtn: { backgroundColor: color.surfaceNeutral },
    rejectText: { color: color.text, fontWeight: font.weight.semibold, fontSize: font.size.sm },
    detailsBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.brand,
    },
    detailsText: { color: color.brand, fontWeight: font.weight.semibold, fontSize: font.size.sm },
    mineToggleRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      backgroundColor: color.surfaceMuted,
    },
    mineChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm - 1,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44, // WCAG 2.5.5: was 36pt (below 44pt project standard)
      alignItems: 'center',
      justifyContent: 'center',
    },
    mineChipActive: { backgroundColor: color.brand },
    mineChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: color.text },
    mineChipTextActive: { color: color.textOnBrand },
    // Free-text search — sits above the chip filter rows so the cursor
    // doesn't shift down when the user starts typing. Bordered field +
    // inline clear button so the affordance is obvious without a separate
    // label.
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    searchInput: {
      flex: 1,
      minHeight: 44, // WCAG 2.5.5: was 40pt (4pt below 44pt project standard)
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      color: color.text,
      fontSize: font.size.base,
    },
    searchClearBtn: {
      minWidth: 32,
      minHeight: 32,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.circle,
    },
    searchClearText: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: color.textMuted },
    sevFilterRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    sevChip: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 44, // WCAG 2.5.5: was 36pt (below 44pt project standard)
      paddingVertical: spacing.sm,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sevChipText: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: color.text },
    sevChipTextActive: { color: color.textOnBrand },
    // Category chip strip — horizontally scrollable so all 6 categories
    // fit on narrow phones without truncating labels. Visual weight
    // matches sevChip; brand fill on active so it reads as "selected".
    categoryScroll: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
    categoryScrollContent: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingBottom: 2,
    },
    catChip: {
      minHeight: 44, // WCAG 2.5.5: was 36pt (below 44pt project standard)
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catChipActive: { backgroundColor: color.brand },
    catChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: color.text, flexShrink: 0 },
    catChipTextActive: { color: color.textOnBrand },
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
      // color.textMutedAlt (#5b6470) on screen wash (#f7f9fc) ≈ 7.0:1 — comfortably above AA.
      color: color.textMutedAlt,
      marginRight: 2,
    },
    sortChip: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 44,
      paddingVertical: spacing.sm,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sortChipActive: { backgroundColor: color.brand },
    sortChipText: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: color.text },
    sortChipTextActive: { color: color.textOnBrand },
    // Bulk-select entry row — a single full-width button sitting at the top
    // of the screen so SR users and anyone unfamiliar with long-press can
    // discover the feature. Tinted to match the sort chip's accent.
    selectEntryRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    selectEntryBtn: {
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      borderWidth: 1,
      borderColor: color.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectEntryBtnPressed: { opacity: 0.7 },
    // 14pt + bold on white-tinted chip background — meets WCAG 1.4.3 AA for
    // body text. Bumped from 13pt to clear the AA threshold against #eef1f5.
    selectEntryText: { color: color.brand, fontWeight: font.weight.bold, fontSize: font.size.base },
    // Card selection visuals — a subtle tinted background + a 2px accent
    // border so a selected card pops without needing to recolor the photo
    // thumbnail or muddle the severity dot. Pairs with the checkmark in
    // the card header for an unambiguous "yes this one's picked" signal.
    cardSelected: {
      backgroundColor: color.brandSofter,
      borderWidth: 2,
      borderColor: color.brand,
      padding: spacing.md,
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
    selectCheckMark: {
      color: color.textOnBrand,
      fontSize: 14,
      fontWeight: '900',
      lineHeight: 16,
    },
    // Floating bulk-action bar — pinned to the bottom of the screen on top
    // of the SectionList. Column-laid so the live-region count Text sits
    // above the row of action buttons. paddingBottom includes a generous
    // inset so it clears the iOS home indicator and Android nav bar without
    // depending on react-native-safe-area-context (not in this project yet).
    bulkBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'column',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md - 2,
      paddingBottom: spacing.xxl,
      backgroundColor: color.surface,
      borderTopWidth: 1,
      borderTopColor: color.borderSubtle,
      shadowColor: color.shadow,
      shadowOpacity: 0.12,
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
    bulkVerifyBtn: { backgroundColor: color.brand },
    // color.successStrong on white-text ≈ 4.6:1+ — WCAG 1.4.3 AA. color.success alone fails (~2.8:1).
    bulkResolveBtn: { backgroundColor: color.successStrong },
    // color.accentPurple: distinguishable from brand-blue + successStrong for protanopia/deuteranopia.
    bulkWatchBtn: { backgroundColor: color.accentPurple },
    // Cancel uses the neutral chip palette so it doesn't compete for
    // attention with the primary actions.
    bulkCancelBtn: {
      backgroundColor: color.surfaceNeutral,
      borderWidth: 1,
      borderColor: color.borderStrong,
    },
    // 14pt bold on the dark button fills — meets WCAG 1.4.3 AA for body text.
    // Bumped from 13pt with the resolve-btn color change to clear AA.
    bulkBtnText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    bulkCancelText: { color: color.textStrong, fontWeight: font.weight.bold, fontSize: font.size.base },
  });
