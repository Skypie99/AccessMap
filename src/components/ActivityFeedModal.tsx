/**
 * ActivityFeedModal — chronological "what's been happening" view of
 * community flag activity. Unlike the Map (spatial) and Tasks (triage
 * queue), the Activity Feed is a temporal browse: see what flags were
 * reported recently, who's been triaging, where things stand.
 *
 * Data: listRecentFlags() returns the latest 100 flags across all
 * statuses, newest first. The feed groups those flags into day buckets
 * via groupByDay() so the header reads "Today", "Yesterday", "Tuesday",
 * etc. Filter chips narrow to "All", "Mine" (current user's reports),
 * or "Watched" (flags on the user's watched list).
 *
 * Tap a row → opens FlagDetailModal via onSelectFlag (matching the
 * pattern used by MyReportsModal / MyWatchedModal so the parent owns
 * the detail modal as a sibling). Optional 📍 button per row jumps
 * straight to the Map when the parent provides onViewOnMap.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
// RNGH ships no SectionList wrapper (unlike ScrollView/FlatList) — this is
// SectionList's internal scroller, wired in via renderScrollComponent below.
// See SectionListScrollRefBridge for why that needs its own bridge shape.
import { ScrollView } from 'react-native-gesture-handler';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sheet } from '@/components/ui/Sheet';
import { useAtTop } from '@/components/ui/SheetPull';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { SeverityDisc } from '@/components/SeverityDisc';
import { useAuth } from '@/lib/auth';
import { a11yToggle, decorativeProps } from '@/lib/accessibility';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  listRecentFlags,
  STATUS_LABELS,
} from '@/lib/flags';
import { groupByDay } from '@/lib/dayGroup';
import { relativeTime } from '@/lib/relativeTime';
import { loadWatched } from '@/lib/watchedFlags';
import type { FlagRow } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { a11y, font, radius, shadow, spacing } from '@/theme';
import { MapPin, RefreshCw } from 'lucide-react-native';
import { StatusBadge } from '@/components/StatusBadge';

type FeedFilter = 'all' | 'mine' | 'watched';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  onViewOnMap?: (flag: FlagRow) => void;
}

/**
 * Bridges SectionList's internal scroller to a ref SheetPull can use.
 *
 * A plain `ref` on <SectionList> only exposes SectionList's own instance, which
 * — unlike FlatList's getNativeScrollRef() — never re-exposes the VirtualizedList
 * underneath, so there's no public way to reach the real scroll node from outside.
 * A ref set directly on the element renderScrollComponent returns doesn't survive
 * either: VirtualizedList always re-parents that ref onto itself
 * (`cloneElement(el, { ref: this._captureScrollRef })`), discarding whatever ref
 * was there. So this component takes VirtualizedList's ref and forwards it to BOTH
 * itself (VirtualizedList keeps working normally) and `bridgeRef` (SheetPull's
 * simultaneousHandlers gets the same tagged RNGH node the ScrollView/FlatList
 * fixes already rely on).
 */
const SectionListScrollRefBridge = React.forwardRef<
  unknown,
  React.ComponentPropsWithoutRef<typeof ScrollView> & { bridgeRef: React.MutableRefObject<unknown> }
>(({ bridgeRef, ...scrollViewProps }, ref) => (
  <ScrollView
    {...scrollViewProps}
    ref={(node: unknown) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<unknown>).current = node;
      bridgeRef.current = node;
    }}
  />
));

export default function ActivityFeedModal({ visible, onClose, onSelectFlag, onViewOnMap }: Props) {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  // The pull gesture must not fight the body's own scroll: `useAtTop`
  // disables it whenever the content is scrolled away from its top, so a
  // downward drag scrolls back up instead of dismissing (SheetPull's `atTop`).
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const scrollRef = useRef<unknown>(null);
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>('all');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      // Skip the fetch entirely when not signed in — RLS would return an
      // empty list anyway (SELECT policy is authenticated-only), no point
      // burning a round-trip. (QA #6)
      if (!user) {
        if (mountedRef.current) {
          setFlags([]);
          setWatchedIds(new Set());
        }
        return;
      }
      const [rows, watched] = await Promise.all([listRecentFlags(100), loadWatched(user.id)]);
      if (!mountedRef.current) return;
      setFlags(rows);
      setWatchedIds(new Set(watched));
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(errorMessage(e, 'Could not load recent activity.'));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Reload every time the modal opens. Cheap (100 rows, single query).
  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  // If the user signs out while the modal is open (or while it was
  // already mounted with a non-'all' filter), force the filter back to
  // 'all'. Otherwise the only-'all'-chip-rendered guard would leave the
  // filter pinned to 'mine' or 'watched' with no way to reset it. (QA #1)
  useEffect(() => {
    if (!user && filter !== 'all') setFilter('all');
  }, [user, filter]);

  // Apply the active filter on top of the recent-flags list.
  const filteredFlags = useMemo(() => {
    if (filter === 'mine') {
      if (!user) return [];
      return flags.filter((f) => f.user_id === user.id);
    }
    if (filter === 'watched') {
      if (watchedIds.size === 0) return [];
      return flags.filter((f) => watchedIds.has(f.id));
    }
    return flags;
  }, [flags, filter, user, watchedIds]);

  // Bucket the filtered list into day-sections for SectionList.
  const sections = useMemo(() => groupByDay(filteredFlags, (f) => f.created_at), [filteredFlags]);

  const renderItem = useCallback(
    ({ item }: { item: FlagRow }) => {
      // A11Y-214: the summary node's label. Description and time are NOT here —
      // the body text below is its own AT stop now that the row is
      // de-flattened, so nothing is said twice.
      const a11yLabel =
        `${CATEGORY_LABELS[item.category]}, severity ${item.severity} of 5, ` +
        `${STATUS_LABELS[item.status]}`;

      return (
        <View role="listitem">
          <Pressable
            onPress={() => onSelectFlag(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            // A11Y-214 (S13 pattern): not one accessible leaf — that swallowed
            // the "Show on map" button on iOS. The summary below announces the
            // row; activation falls through to this Pressable.
            accessible={false}
          >
            <View style={styles.rowHeader}>
              {/* Labeled SUMMARY node: disc + category + status badge. */}
              <View
                style={styles.rowSummary}
                accessible
                accessibilityRole="button"
                accessibilityLabel={a11yLabel}
                accessibilityHint="Opens the full report"
              >
              <SeverityDisc severity={item.severity} size={28} digitSize={font.size.xs} />
              <AppText variant="label" style={styles.rowTitle}>
                {CATEGORY_LABELS[item.category]}
              </AppText>
              <StatusBadge status={item.status} />
              </View>
              {onViewOnMap && (
                <Pressable
                  onPress={() => onViewOnMap(item)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.viewOnMapBtn,
                    pressed && styles.viewOnMapBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${CATEGORY_LABELS[item.category]} on the map`}
                  accessibilityHint="Closes this list and centers the Map tab on the flag"
                >
                  <MapPin size={18} color={color.brand} strokeWidth={2.2} />
                </Pressable>
              )}
            </View>
            <View style={styles.rowBody}>
              {item.photo_url ? (
                <RemoteImage
                  uri={item.photo_url}
                  style={styles.thumb} {...decorativeProps}
                />
              ) : null}
              <View style={styles.rowBodyText}>
                {item.description ? (
                  <AppText variant="body" style={styles.rowDesc} numberOfLines={2}>
                    {item.description}
                  </AppText>
                ) : null}
                <AppText variant="body" style={styles.rowMeta}>{relativeTime(item.created_at)}</AppText>
              </View>
            </View>
          </Pressable>
        </View>
      );
    },
    [onSelectFlag, onViewOnMap, styles],
  );

  const filterChips: { value: FeedFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'Mine' },
    { value: 'watched', label: 'Watched' },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Recent Activity"
      closeLabel="Close recent activity"
      closeHint="Returns to your Profile"
      headerAccessory={
        /* A11Y-222 (2.5.7): pull-to-refresh is a DRAG. This is the
           single-pointer alternative, in the same 44pt circle recipe as
           Close beside it — and it is discoverable, which close+reopen
           was not. */
        <Pressable
          onPress={() => void load()}
          hitSlop={12}
          style={({ pressed }) => [styles.circleBtn, pressed && { backgroundColor: color.borderPressed }]}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          accessibilityHint="Reloads recent activity without pulling down the list"
          {...a11yToggle({ busy: loading })}
        >
          <RefreshCw size={18} color={color.text} strokeWidth={2.2} {...decorativeProps} />
        </Pressable>
      }
      glass
      engineered
      padded
      presentation="expanded"
      minBottomPad={spacing.xl}
      atTop={atTop}
      scrollRef={scrollRef}
      testID="activityFeedModal-backdrop"
    >
          {/* Filter chips — Mine/Watched are hidden when not signed in
              because they'd always be empty. */}
          <View style={styles.filterRow} accessibilityLabel="Filter activity">
            {filterChips
              .filter((c) => c.value === 'all' || user)
              .map(({ value, label }) => {
                const active = filter === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setFilter(value)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${label.toLowerCase()} activity`}
                    {...a11yToggle({ pressed: active })}
                  >
                    <AppText variant="label" style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
          </View>

          {loading && flags.length === 0 && !loadError ? (
            // Content-shaped loading (BP-3) — see MyReportsModal; same recipe.
            <View accessibilityLabel="Loading recent activity" accessibilityLiveRegion="polite">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : (
            <SectionList
              sections={sections}
              renderScrollComponent={(scrollProps) => (
                <SectionListScrollRefBridge {...scrollProps} bridgeRef={scrollRef} />
              )}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              keyExtractor={(f) => f.id}
              renderItem={renderItem}
              accessibilityRole="list"
              stickySectionHeadersEnabled={false}
              // A11Y-XXXL: the error banner (below, via ListHeaderComponent) needs a
              // top-aligned, natural-height container — `styles.center`'s
              // alignItems/justifyContent:'center' would shrink it to its intrinsic
              // width and vertically center it, which is exactly what let it get
              // clipped by the Sheet's own 85% cap instead of scrolling into view.
              // The genuine empty state (no error, zero sections) keeps centering.
              contentContainerStyle={!loadError && sections.length === 0 ? styles.center : styles.list}
              ListHeaderComponent={
                loadError ? (
                  <View style={styles.errorBanner}>
                    <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
                    <Pressable
                      onPress={load}
                      style={({ pressed }) => [styles.retryBtn, pressed && { backgroundColor: color.errorPressed }]}
                      accessibilityRole="button"
                      accessibilityLabel="Retry loading activity"
                    >
                      <AppText variant="label" style={styles.retryText}>Retry</AppText>
                    </Pressable>
                  </View>
                ) : null
              }
              renderSectionHeader={({ section: { title, data } }) => (
                <View style={styles.sectionHeader}>
                  <AppText variant="heading" style={styles.sectionHeaderText}>{title}</AppText>
                  <AppText variant="body" style={styles.sectionHeaderCount}>
                    {data.length} {data.length === 1 ? 'flag' : 'flags'}
                  </AppText>
                </View>
              )}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={color.brand} colors={[color.brand]} />}
              accessibilityLabel={
                filteredFlags.length === 0
                  ? 'Recent activity, empty'
                  : `Recent activity, ${filteredFlags.length} ${filteredFlags.length === 1 ? 'flag' : 'flags'}`
              }
              ListEmptyComponent={
                loadError ? null : (
                  // W5: the Clock glyph becomes the path. Both sentences are
                  // the shipped sentences, all three branches.
                  <EmptyState
                    title={
                      filter === 'mine'
                        ? 'You have no recent reports'
                        : filter === 'watched'
                          ? 'No recent activity on your watched flags'
                          : 'No recent activity'
                    }
                    body={
                      filter === 'mine'
                        ? 'When you report a flag, it appears here right away.'
                        : filter === 'watched'
                          ? 'Watch a flag to follow its updates here.'
                          : "When community members report or triage flags, they'll show up here in chronological order."
                    }
                  />
                )
              }
            />
          )}
    </Sheet>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // The sheet's own cap. `Sheet` defaults to 90%; this surface shipped at 85%.
    cap: { maxHeight: '85%' },
    // The Refresh circle in the header. Same 44pt recipe the primitive's Close
    // uses, so the pair reads as one control set.
    circleBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // C10 / the SW-36 class. Four chips in a row that could not wrap: at large
    // type the words grow, the row does not, and the last chip is pushed off
    // the sheet's edge with no way to reach it.
    //
    // BOTH halves, because either alone is a change that looks like a fix and
    // is not one. `flexWrap` gives the row somewhere to put the overflow, and
    // `flexShrink: 0` on the chip is what makes the wrap FIRE — a chip that can
    // shrink just gets narrower than its own word instead, which is the
    // character-breaking defect SW-36 named. The chips size to their text
    // (no flexBasis), so a row that fits still renders exactly as it did.
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.sm,
      gap: spacing.sm,
    },
    filterChip: {
      flexShrink: 0,
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipActive: { backgroundColor: color.brand },
    filterChipText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.text,
    },
    filterChipTextActive: { color: color.textOnBrand },
    errorBanner: {
      backgroundColor: color.errorBg,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: spacing.md,
      // Rendered via ListHeaderComponent now — this replaces the gap the card's
      // own `cardPadded` used to provide when the banner was a direct sibling.
      marginBottom: spacing.md,
    },
    errorText: {
      color: color.errorFg,
      flex: 1,
      minWidth: 0,
      fontSize: font.size.sm,
    },
    retryBtn: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: color.error,
      minHeight: 44,
      alignSelf: 'flex-start',
      justifyContent: 'center',
    },
    retryText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
    },
    center: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.sm,
    },
    list: { paddingTop: spacing.tight, paddingBottom: spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    sectionHeaderText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
    },
    sectionHeaderCount: { fontSize: font.size.xs, color: color.inkGlassMuted },
    row: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg - 2,
      gap: spacing.sm,
      marginBottom: spacing.sm + 2,
      ...shadow.e1,
      minHeight: 44,
    },
    rowPressed: { opacity: 0.9, backgroundColor: color.surfaceMuted },
    rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    // A11Y-214: summary wrapper mirrors the header's internal rhythm so the
    // de-flattened structure renders identically.
    // SW-22/SW-43: this wrapper IS the labelled, role="button" element that
    // opens the flag (A11Y-214 de-flattened the row and put the label here).
    // It measured 21-29pt tall on every list surface and both devices, while
    // the "Show on the map" button beside it is a correct 44x44 — which is what
    // makes the short one read as an oversight rather than a style. hitSlop is
    // invisible to the accessibility frame, so the height has to be real.
    rowSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0, minHeight: a11y.minTargetSize },
    rowTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.semibold,
      flex: 1,
      color: color.textStrong,
      letterSpacing: -0.1,
    },
    viewOnMapBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewOnMapBtnPressed: { opacity: 0.6, backgroundColor: color.borderPressed },
    rowBody: { flexDirection: 'row', gap: spacing.md },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: color.surfaceNeutral,
    },
    rowBodyText: { flex: 1, gap: spacing.tight, justifyContent: 'center' },
    rowDesc: { fontSize: font.size.base, color: color.text, lineHeight: 19 },
    rowMeta: { fontSize: font.size.xs, color: color.textMuted, lineHeight: 16 },
  });
