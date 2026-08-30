/**
 * MyWatchedModal — Wave 3: sort picker (Status/Newest/Oldest/Severity) +
 * pull-to-refresh. Tapping a row opens FlagDetailModal. Unwatching removes
 * the ID from AsyncStorage immediately.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
// RNGH FlatList AND ScrollView, not react-native's — their refs expose
// .handlerTag, which SheetPull's simultaneousHandlers={scrollRef} needs to
// coexist with pull-to-dismiss on native. Full mechanism: LegendModal.tsx.
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { useAuth } from '@/lib/auth';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sheet } from '@/components/ui/Sheet';
import { useAtTop } from '@/components/ui/SheetPull';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { SeverityDisc } from '@/components/SeverityDisc';
import { confirm, notify } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  fetchFlagsByIds,
} from '@/lib/flags';
import { flagUnwatchedAnnouncement } from '@/lib/copy';
import {
  clearWatched,
  loadWatched,
  removeWatched,
  setWatched as persistWatchedIds,
} from '@/lib/watchedFlags';
import {
  filterWatchedFlags,
  filterWatchedFlagsByStatus,
  type WatchedStatusFilter,
} from '@/lib/watchedFlagsFilter';
import { a11y, font, radius, spacing } from '@/theme';
import { ArrowDown, MapPin, RefreshCw, Star } from 'lucide-react-native';
import { a11yToggle, decorativeProps } from '@/lib/accessibility';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import type { FlagRow } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { StatusBadge } from './StatusBadge';
import SearchInputRow from './SearchInputRow';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  onViewOnMap?: (flag: FlagRow) => void;
  refreshKey?: number;
}

const STATUS_SORT_ORDER: Record<string, number> = { open: 0, verified: 1, resolved: 2, rejected: 3 };

/** Wave 3 — sort mode for the Watched Flags list. Exported for tests. */
export type WatchedSort = 'status' | 'newest' | 'oldest' | 'severity';

/*
 * I1 / I3 — the direction arrow is an ICON, not a character in the label.
 *
 * "Severity ↓" was the last text glyph left in a control label after the
 * Lucide migration. Three things were wrong with it and only the first is
 * cosmetic: U+2193 renders in whatever the body face has for it (or a fallback
 * box), it does not scale or tint with the label beside it, and it was inside
 * the VISIBLE string while the spoken label said "highest severity first" —
 * so the two versions of the control disagreed about what it says.
 *
 * The spoken label is unchanged. The visible one loses one character and gains
 * a decorative arrow that inherits the chip's own ink.
 */
const SORT_OPTIONS: {
  value: WatchedSort;
  label: string;
  a11yLabel: string;
  descending?: boolean;
}[] = [
  { value: 'status',   label: 'Status',   a11yLabel: 'Sort by status (open first)' },
  { value: 'newest',   label: 'Newest',   a11yLabel: 'Sort newest first' },
  { value: 'oldest',   label: 'Oldest',   a11yLabel: 'Sort oldest first' },
  { value: 'severity', label: 'Severity', a11yLabel: 'Sort by highest severity first', descending: true },
];

/** Pure sort — returns a new array. Exported for unit tests. */
export function sortWatchedFlags(items: FlagRow[], mode: WatchedSort): FlagRow[] {
  const copy = [...items];
  switch (mode) {
    case 'newest':
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'oldest':
      return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'severity':
      return copy.sort((a, b) =>
        b.severity - a.severity || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case 'status':
    default:
      return copy.sort((a, b) => {
        const sd = (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99);
        return sd !== 0 ? sd : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }
}

export default function MyWatchedModal({ visible, onClose, onSelectFlag, onViewOnMap, refreshKey = 0 }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // The pull gesture must not fight the body's own scroll: `useAtTop`
  // disables it whenever the content is scrolled away from its top, so a
  // downward drag scrolls back up instead of dismissing (SheetPull's `atTop`).
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  // Holds the native scroll node, not the FlatList instance — see the ref
  // callback below for why.
  const scrollRef = useRef<unknown>(null);
  // Keyboard-up bottom-inset reclaim (Recipe F step 3).
  const keyboardVisible = useKeyboardVisible();
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WatchedStatusFilter>('all');
  const [sortMode, setSortMode] = useState<WatchedSort>('status');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (isPullRefresh = false) => {
    if (!user || !mountedRef.current) return;
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const ids = await loadWatched(user.id);
      const rows = await fetchFlagsByIds(ids);
      if (!mountedRef.current) return;
      setWatchedIds(ids);
      setFlags(rows);
      if (isPullRefresh && mountedRef.current) setLoadError(null);
      // F45 (re-sweep): prune ids whose flags no longer exist on the server so
      // the "removed by their author" banner shows once (this session) instead
      // of forever. State keeps the loaded ids so the banner still informs;
      // storage gets the surviving list so the next open is clean.
      if (rows.length < ids.length) {
        const surviving = new Set(rows.map((r) => r.id));
        void persistWatchedIds(user.id, ids.filter((id) => surviving.has(id))).catch(() => {
          // Prune is housekeeping — a failed write just means we prune again
          // next open; never block the list render for it.
        });
      }
    } catch (e) {
      if (mountedRef.current) setLoadError(errorMessage(e, 'Could not load watched flags.'));
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [user]);

  const handleRefresh = useCallback(() => { void load(true); }, [load]);

  useEffect(() => { if (visible) load(); }, [visible, refreshKey, load]);


  const handleUnwatch = useCallback(async (flagId: string) => {
    if (!user) return;
    // Optimistic removal with rollback (F43): persist now throws on a failed
    // user-data write, so a failure restores the row and tells the user.
    let removedFlag: FlagRow | undefined;
    let removedIdx = -1;
    setFlags((prev) => {
      removedIdx = prev.findIndex((f) => f.id === flagId);
      removedFlag = prev[removedIdx];
      return prev.filter((f) => f.id !== flagId);
    });
    setWatchedIds((prev) => prev.filter((id) => id !== flagId));
    try {
      await removeWatched(user.id, flagId);
      // A3 — back-ported from HiddenCommentsModal. The whole outcome of this
      // action is a ROW DISAPPEARING, which is the one result a screen reader
      // cannot observe: the cursor was on the row, the row is gone, and
      // nothing says why. Names the flag by its category, which is what the
      // row's own accessible label leads with.
      if (removedFlag) {
        AccessibilityInfo.announceForAccessibility(
          flagUnwatchedAnnouncement(CATEGORY_LABELS[removedFlag.category]),
        );
      }
    } catch (e) {
      if (mountedRef.current && removedFlag) {
        const flag = removedFlag;
        const idx = removedIdx;
        setFlags((prev) => {
          const next = prev.slice();
          next.splice(Math.min(idx, next.length), 0, flag);
          return next;
        });
        setWatchedIds((prev) => (prev.includes(flagId) ? prev : [...prev, flagId]));
      }
      notify("Couldn't update your watched list", errorMessage(e)); // F64: must render on web
    }
  }, [user]);

  const handleClearAll = useCallback(async () => {
    if (!user || flags.length === 0) return;
    const ok = await confirm(
      'Clear all watched flags?',
      `You're watching ${flags.length} ${flags.length === 1 ? 'flag' : 'flags'}. This will remove them all from your watched list.`,
      'Clear all', true,
    );
    if (!ok) return;
    const prevFlags = flags;
    const prevIds = watchedIds;
    setFlags([]); setWatchedIds([]);
    try {
      await clearWatched(user.id);
    } catch (e) {
      // F43: the clear didn't stick — restore and say so.
      if (mountedRef.current) {
        setFlags(prevFlags);
        setWatchedIds(prevIds);
      }
      notify("Couldn't clear your watched list", errorMessage(e)); // F64: must render on web
    }
  }, [user, flags, watchedIds]);

  useEffect(() => {
    if (visible) { setSearchQuery(''); setStatusFilter('all'); setSortMode('status'); }
  }, [visible]);

  const displayFlags = useMemo(() => {
    const byStatus = filterWatchedFlagsByStatus(flags, statusFilter);
    const filtered = filterWatchedFlags(byStatus, debouncedQuery, (cat) => CATEGORY_LABELS[cat] ?? '');
    return sortWatchedFlags(filtered, sortMode);
  }, [flags, debouncedQuery, statusFilter, sortMode]);

  const missingCount = watchedIds.length - flags.length;

  const renderItem = useCallback(({ item }: { item: FlagRow }) => {
    const date = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const isResolved = item.status === 'resolved';
    return (
      <View role="listitem">
        <Pressable
          style={({ pressed }) => [styles.row, isResolved && styles.rowResolved, pressed && styles.rowPressed]}
          onPress={() => onSelectFlag(item)}
          // A11Y-214 (S13 pattern): the row is NOT one accessible leaf — that
          // swallowed "Show on map" and "Stop watching" on iOS. The summary
          // node below announces the row; activating it falls through to this
          // Pressable; the actions stay independent elements.
          accessible={false}
        >
          {isResolved && (
            <View style={styles.resolvedAccent} {...decorativeProps} />
          )}
          {/* The labeled SUMMARY node (disc + category + date). Status is NOT
              in its label — the StatusBadge to the right is its own stop and
              speaks statusA11y, so nothing is said twice. */}
          <View
            style={styles.rowSummary}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${CATEGORY_LABELS[item.category]}, ${severityA11y(item.severity)}, reported ${date}`}
            accessibilityHint="Opens the full details for this flag"
          >
            {/* T5: the watched row gains the severity NUMBER (a colour-only dot
                spoke none) — the RecentlyViewedRow mini-disc recipe. Decorative;
                the summary's a11y label already speaks severityA11y. */}
            <SeverityDisc severity={item.severity} size={24} digitSize={font.size.xs} maxFontSizeMultiplier={1.3} />
            <View style={styles.rowMid}>
              <AppText variant="label" style={[styles.rowCategory, isResolved && styles.rowCategoryResolved]}>
                {CATEGORY_LABELS[item.category]}
              </AppText>
              <AppText variant="body" style={styles.rowDate}>{date}</AppText>
            </View>
          </View>
          <View style={styles.rowRight}>
            <StatusBadge status={item.status} accessibilityLabel={statusA11y(item.status)} size="sm" />
            {onViewOnMap && (
              <Pressable
                onPress={() => onViewOnMap(item)}
                hitSlop={8}
                style={({ pressed }) => [styles.viewOnMapBtn, pressed && styles.viewOnMapBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${CATEGORY_LABELS[item.category]} on the map`}
                accessibilityHint="Closes this list and centers the Map tab on the flag"
              >
                <MapPin size={18} color={color.brand} strokeWidth={2.2} />
              </Pressable>
            )}
            <Pressable
              onPress={() => handleUnwatch(item.id)}
              hitSlop={10}
              style={({ pressed }) => [styles.unwatchBtn, pressed && styles.unwatchBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Stop watching this flag"
              accessibilityHint="Removes this flag from your watched list"
            >
              <Star size={16} color={color.accentOrange} strokeWidth={2.2} />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }, [styles, onSelectFlag, onViewOnMap, handleUnwatch]);

  // Bottom-anchored sheet clears the home indicator (M15 family recipe).
  // Non-throwing context read — render tests mount without a provider.

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Watched Flags"
      closeLabel="Close watched flags"
      closeHint="Returns to your Profile"
      headerAccessory={
        <>
          {flags.length > 0 && (
            <Pressable onPress={handleClearAll} hitSlop={10} style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Clear all ${flags.length} watched flags`}
              accessibilityHint="Asks you to confirm before removing all watched flags"
            >
              <AppText variant="label" style={styles.clearBtnText}>Clear all</AppText>
            </Pressable>
          )}
          {/* A11Y-222 (2.5.7): the single-pointer alternative to the
              pull-to-refresh drag, same recipe as Close. */}
          <Pressable
            onPress={handleRefresh}
            hitSlop={12}
            style={({ pressed }) => [styles.circleBtn, pressed && { backgroundColor: color.borderPressed }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh"
            accessibilityHint="Reloads your watched flags without pulling down the list"
            {...a11yToggle({ busy: refreshing })}
          >
            <RefreshCw size={18} color={color.text} strokeWidth={2.2} {...decorativeProps} />
          </Pressable>
        </>
      }
      glass
      engineered
      padded
      // VP1 fix3 (Global Fix 3): information-heavy panels use the max
      // practical reading height instead of a content-hugging 55%/85%
      // floor+cap. `expanded` fills from just under the safe-area top to
      // minBottomPad, same as Leaderboard below and the pattern already
      // proven on FeedbackModal/ReportContentModal/StatusHistoryModal.
      presentation="expanded"
      keyboardAvoiding
      cardStyle={keyboardVisible ? styles.cardKeyboard : styles.cardRhythm}
      minBottomPad={spacing.xxl + 4}
      atTop={atTop}
      scrollRef={scrollRef}
      testID="myWatchedModal-backdrop"
    >
          <SearchInputRow
            value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery('')}
            placeholder="Search watched flags…" accessibilityLabel="Search watched flags"
            accessibilityHint="Filters by category and description" wrapStyle={styles.searchRow}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.statusScroll} contentContainerStyle={styles.statusScrollContent}
            accessibilityLabel="Filter by status"
          >
            {([
              { value: 'all' as const, label: 'All' },
              { value: 'open' as const, label: 'Open' },
              { value: 'verified' as const, label: 'Verified' },
              { value: 'resolved' as const, label: 'Resolved' },
            ] satisfies { value: WatchedStatusFilter; label: string }[]).map(({ value, label }) => {
              const active = statusFilter === value;
              const chipBg = active ? chipActiveBg(value, color) : color.surfaceNeutral;
              const chipFg = active ? chipActiveFg(value, color) : color.textMuted;
              return (
                <Pressable key={value} onPress={() => setStatusFilter(value)}
                  style={[styles.statusChip, { backgroundColor: chipBg }]}
                  accessibilityRole="button"
                  accessibilityLabel={value === 'all' ? 'Show all statuses' : `Filter to ${label} flags`}
                  {...a11yToggle({ pressed: active })}
                >
                  <AppText variant="label" style={[styles.statusChipText, { color: chipFg }]}>{label}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.sortScroll} contentContainerStyle={styles.sortScrollContent}
            accessibilityLabel="Sort order"
          >
            {SORT_OPTIONS.map(({ value, label, a11yLabel, descending }) => {
              const active = sortMode === value;
              return (
                <Pressable key={value} onPress={() => setSortMode(value)}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  accessibilityRole="button" accessibilityLabel={a11yLabel}
                  {...a11yToggle({ pressed: active })}
                >
                  <AppText variant="label" style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</AppText>
                  {descending ? (
                    <ArrowDown
                      size={14}
                      color={active ? color.brandText : color.textMuted}
                      strokeWidth={2.2}
                      {...decorativeProps}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {missingCount > 0 && !loading && (
            <View style={styles.missingBanner}>
              <AppText variant="body" style={styles.missingText}>
                {missingCount} {missingCount === 1 ? 'flag has' : 'flags have'} been removed by their author.
              </AppText>
            </View>
          )}

          {/* F44 (re-sweep): a failed pull-to-refresh used to replace the
              already-loaded list with this full-screen error. The full-screen
              error is now reserved for "nothing to show"; with rows on screen
              the failure renders as a banner above the (stale but useful)
              list instead. */}
          {/* C6: a FAILED OPERATION is red, an informational notice is amber.
              This banner shared the amber `missingBanner` with the notice two
              blocks above it ("N flags have been removed by their author"),
              so a failure and an FYI were the same object. MyReports and
              ActivityFeed already render a load failure in errorBg; this
              matches them. The stale list stays on screen either way — the
              colour is about what HAPPENED, not about what remains. */}
          {loadError && flags.length > 0 && !loading && (
            <View style={styles.refreshErrorBanner}>
              <AppText variant="body" style={styles.refreshErrorText}>
                {`Couldn't refresh: ${loadError} Showing your last loaded list.`}
              </AppText>
            </View>
          )}

          {/* SW-42: the list has always been able to scroll, which is why a
              POPULATED sheet only ever looked cramped. Every other state was a
              bare <View> — and the card legitimately shrinks into the KAV's cap
              (G6/SR-099) with overflow:'hidden' on the sheet, so those states
              were CLIPPED rather than scrolled. On an empty watched list the one
              line that explains how to watch a flag ("Open any flag… tap Watch")
              sat at y836 while the card ended at y822: present in the
              accessibility tree, 100% invisible, on the single screen whose only
              job is to explain itself. Identical on the 17e.

              The fix is the house recipe, not a new one. FeedbackModal — the
              reference Recipe F implementation, and the other sheet with this
              exact backdrop → KAV → cardWrap → card shape — puts its body in a
              ScrollView with flexShrink:1, so the shrink is absorbed by
              SCROLLING instead of by clipping. These states now do the same.

              The FlatList branch is deliberately NOT wrapped: nesting a
              VirtualizedList inside a ScrollView is its own bug. Hoisting it
              above the chain is equivalence-preserving — displayFlags is a
              subset of flags, so `displayFlags.length > 0` already implies both
              of the conditions that used to be tested before it. */}
          {!loading && displayFlags.length > 0 ? (
            <FlatList
              data={displayFlags} keyExtractor={(item) => item.id} renderItem={renderItem}
              // FlatList's OWN ref exposes FlatList's imperative API
              // (scrollToIndex, etc.), not the native node RNGH tags with
              // .handlerTag — that only lands on whatever `renderScrollComponent`
              // renders internally, which is RNGH's ScrollView now that FlatList
              // itself is imported from react-native-gesture-handler.
              // getNativeScrollRef() reaches through to exactly that node.
              ref={(r) => { scrollRef.current = r?.getNativeScrollRef() ?? null; }}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
              accessibilityRole="list"
              accessibilityLabel={`Watched flags list, ${displayFlags.length} ${displayFlags.length === 1 ? 'item' : 'items'}`}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={color.brand} colors={[color.brand]} accessibilityLabel="Pull down to refresh watched flags" />
              }
            />
          ) : (
            <ScrollView
              style={styles.stateBody}
              // scrollRef is typed unknown so it can hold either bridge's
              // node (see the FlatList ref above). RNGH's ScrollView carries
              // .handlerTag directly on its own ref — no getNativeScrollRef()
              // indirection needed here, that's a FlatList-only quirk.
              ref={(r) => { scrollRef.current = r; }}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={styles.stateBodyContent}
              keyboardShouldPersistTaps="handled"
            >
            {loading ? (
              // Content-shaped loading (BP-3): row placeholders; the bare
              // unthemed spinner told SR users nothing — the label does now.
              <View accessibilityLabel="Loading watched flags" accessibilityLiveRegion="polite">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </View>
            ) : loadError && flags.length === 0 ? (
              <View style={styles.center}>
                {/* M-40 error repair: was bare color.error text directly on the
                    (now glass) sheet; adopts the sibling errorBanner pattern —
                    a self-contained solid errorBg banner (MyReports/ActivityFeed
                    ship the same), never error-on-glass. */}
                <View style={styles.errorBanner}>
                  <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
                  <Pressable onPress={() => void load()} style={({ pressed }) => [styles.retryBtn, pressed && { backgroundColor: color.errorPressed }]} accessibilityRole="button" accessibilityLabel="Retry loading watched flags">
                    <AppText variant="label" style={styles.retryText}>Retry</AppText>
                  </Pressable>
                </View>
              </View>
            ) : flags.length === 0 ? (
              // W5: Star and Search, two glyphs for two flavours of the same
              // nothing, become one mark. Every word is the shipped word,
              // including the emphasis on the control's name.
              <EmptyState
                title="No watched flags yet"
                body={
                  <>
                    Open any flag on the map or in Tasks and tap{' '}
                    <AppText variant="label" style={styles.emptyBold}>Watch</AppText> to track it here.
                  </>
                }
              />
            ) : displayFlags.length === 0 ? (
              <EmptyState
                title="No matches"
                body="Try a different search term or status filter."
              />
              ) : null}
            </ScrollView>
          )}
    </Sheet>
  );
}

function chipActiveBg(status: WatchedStatusFilter, color: ColorTheme): string {
  switch (status) {
    case 'open': return color.statusOpenBg;
    case 'verified': return color.statusVerifiedBg;
    case 'resolved': return color.statusResolvedBg;
    default: return color.brand;
  }
}

function chipActiveFg(status: WatchedStatusFilter, color: ColorTheme): string {
  switch (status) {
    case 'open': return color.statusOpenFg;
    case 'verified': return color.statusVerifiedFg;
    case 'resolved': return color.statusResolvedFg;
    default: return color.textOnBrand;
  }
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // The sheet's inter-child rhythm. `padded` supplies `md`; this surface
    // shipped tighter and its rows carry their own spacing.
    cardRhythm: { gap: spacing.tight },
    // Keyboard up: the pad drops to `md` and does NOT take the safe-area inset,
    // because the keyboard is covering it. Shipped behaviour, made explicit.
    cardKeyboard: { gap: spacing.tight, paddingBottom: spacing.md },
    // Refresh, in the same 44pt circle recipe as the primitive's Close.
    circleBtn: { width: 44, height: 44, borderRadius: radius.circle, backgroundColor: color.surfaceNeutral, alignItems: 'center', justifyContent: 'center' },
    clearBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: color.errorBg, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs },
    clearBtnText: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: color.error },
    missingBanner: { backgroundColor: color.warningBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: color.accentOrange },
    missingText: { fontSize: font.size.sm, color: color.warningFg, lineHeight: 18 },
    // Same geometry as missingBanner, the failure palette instead of the notice
    // palette — the accent bar takes `error` so the left edge reads too.
    refreshErrorBanner: { backgroundColor: color.errorBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: color.error },
    refreshErrorText: { fontSize: font.size.sm, color: color.errorFg, lineHeight: 18 },
    // SW-42: the non-list states' scroller. flexShrink:1 is the load-bearing
    // half — it is what lets the body absorb the card's shrink by scrolling
    // instead of letting overflow:'hidden' eat it (FeedbackModal `body`, the
    // reference Recipe F implementation, carries exactly this). flexGrow:1 +
    // centring on the CONTENT container keeps a short empty state optically
    // centred when there is room, which is how it looked before.
    stateBody: { flexShrink: 1 },
    stateBodyContent: { flexGrow: 1, justifyContent: 'center' },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: spacing.md },
    // M-40 error-banner (self-contained solid pin — errorBg + errorFg, the
    // MyReports/ActivityFeed sibling pattern; no new arbiter pair, stacks _doc).
    errorBanner: { backgroundColor: color.errorBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
    errorText: { color: color.errorFg, flex: 1, fontSize: font.size.sm, lineHeight: 18 },
    retryBtn: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm + 2, borderRadius: radius.md, backgroundColor: color.error, minHeight: 44, justifyContent: 'center' },
    retryText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.sm },
    emptyBold: { fontWeight: font.weight.bold, color: color.textStrong },
    list: { paddingBottom: spacing.sm },
    separator: { height: 1, backgroundColor: color.borderSubtle },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md + 2, gap: spacing.md },
    rowPressed: { backgroundColor: color.surfaceMuted },
    // A11Y-214: summary wrapper mirrors the row's internal rhythm (same gap,
    // same centering, takes the middle space) so the de-flattened structure
    // renders identically.
    // SW-22/SW-43: this wrapper IS the labelled, role="button" element that
    // opens the flag (A11Y-214 de-flattened the row and put the label here).
    // It measured 21-29pt tall on every list surface and both devices, while
    // the "Show on the map" button beside it is a correct 44x44 — which is what
    // makes the short one read as an oversight rather than a style. hitSlop is
    // invisible to the accessibility frame, so the height has to be real.
    rowSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0, minHeight: a11y.minTargetSize },
    rowMid: { flex: 1, gap: 2 },
    rowCategory: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: color.textStrong },
    rowCategoryResolved: { color: color.statusResolvedFg },
    rowDate: { fontSize: font.size.xs, color: color.inkGlassMuted, fontFamily: font.family.bodyMedium },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
    unwatchBtn: { padding: spacing.tight, alignItems: 'center', justifyContent: 'center' },
    unwatchBtnPressed: { opacity: 0.5 },
    viewOnMapBtn: { width: 44, height: 44, borderRadius: radius.circle, backgroundColor: color.surfaceNeutral, alignItems: 'center', justifyContent: 'center' },
    viewOnMapBtnPressed: { opacity: 0.6, backgroundColor: color.borderPressed },
    rowResolved: { backgroundColor: color.successSoft },
    resolvedAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color.success, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
    searchRow: { marginBottom: spacing.xs },
    statusScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm },
    statusScrollContent: { gap: spacing.xs, paddingRight: spacing.xs },
    // Census sweep: minHeight was here but no width floor, so the short-labelled
    // "All" chip measured 41x45 — 3pt under on the other axis.
    statusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, minHeight: a11y.minTargetSize, minWidth: a11y.minTargetSize, alignItems: 'center', justifyContent: 'center' },
    statusChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
    sortScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm },
    sortScrollContent: { gap: spacing.xs, paddingRight: spacing.xs },
    sortChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.tight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, backgroundColor: color.surfaceNeutral, minHeight: a11y.minTargetSize },
    sortChipActive: { backgroundColor: color.brandSofter, borderWidth: 1, borderColor: color.brand },
    sortChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: color.textMuted },
    sortChipTextActive: { color: color.brandText },
  });
