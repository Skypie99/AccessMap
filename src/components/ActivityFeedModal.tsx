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
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  listRecentFlags,
  severityColor,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/lib/flags';
import { groupByDay } from '@/lib/dayGroup';
import { relativeTime } from '@/lib/relativeTime';
import { loadWatched } from '@/lib/watchedFlags';
import type { FlagRow } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';

type FeedFilter = 'all' | 'mine' | 'watched';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  onViewOnMap?: (flag: FlagRow) => void;
}

export default function ActivityFeedModal({
  visible,
  onClose,
  onSelectFlag,
  onViewOnMap,
}: Props) {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
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
      const [rows, watched] = await Promise.all([
        listRecentFlags(100),
        loadWatched(user.id),
      ]);
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
  const sections = useMemo(
    () => groupByDay(filteredFlags, (f) => f.created_at),
    [filteredFlags],
  );

  const renderItem = useCallback(({ item }: { item: FlagRow }) => {
    const statusPalette = STATUS_COLORS[item.status];
    const a11yLabel =
      `${CATEGORY_LABELS[item.category]}, severity ${item.severity} of 5, ` +
      `${STATUS_LABELS[item.status]}, ${relativeTime(item.created_at)}` +
      (item.description ? `. ${item.description}` : '');

    return (
      <View role="listitem">
      <Pressable
        onPress={() => onSelectFlag(item)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Opens the full report"
      >
        <View style={styles.rowHeader}>
          <View
            style={[
              styles.sevDot,
              { backgroundColor: severityColor(item.severity) },
            ]}
            // Severity is already in the row's a11yLabel; this badge is
            // purely visual reinforcement. Hide on both platforms.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.sevDotText}>{item.severity}</Text>
          </View>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {CATEGORY_LABELS[item.category]}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusPalette.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusPalette.fg }]}>
              {STATUS_LABELS[item.status]}
            </Text>
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
              <Text style={styles.viewOnMapGlyph}>📍</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.rowBody}>
          {item.photo_url ? (
            <Image
              source={{ uri: item.photo_url }}
              style={styles.thumb}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
          <View style={styles.rowBodyText}>
            {item.description ? (
              <Text style={styles.rowDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.rowMeta}>{relativeTime(item.created_at)}</Text>
          </View>
        </View>
      </Pressable>
      </View>
    );
  }, [onSelectFlag, onViewOnMap, styles]);

  const filterChips: Array<{ value: FeedFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'Mine' },
    { value: 'watched', label: 'Watched' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              Recent Activity
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close recent activity"
              accessibilityHint="Returns to your Profile"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

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
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
          </View>

          {loadError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                onPress={load}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading activity"
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {loading && flags.length === 0 && !loadError ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.subtitle}>Loading recent activity…</Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(f) => f.id}
              renderItem={renderItem}
              accessibilityRole="list"
              stickySectionHeadersEnabled={false}
              contentContainerStyle={
                sections.length === 0 ? styles.center : styles.list
              }
              renderSectionHeader={({ section: { title, data } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                  <Text style={styles.sectionHeaderCount}>
                    {data.length} {data.length === 1 ? 'flag' : 'flags'}
                  </Text>
                </View>
              )}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={load} />
              }
              accessibilityLabel={
                filteredFlags.length === 0
                  ? 'Recent activity, empty'
                  : `Recent activity, ${filteredFlags.length} ${filteredFlags.length === 1 ? 'flag' : 'flags'}`
              }
              ListEmptyComponent={
                loadError ? null : (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>
                      {filter === 'mine'
                        ? 'You have no recent reports'
                        : filter === 'watched'
                          ? 'No recent activity on your watched flags'
                          : 'No recent activity'}
                    </Text>
                    <Text style={styles.emptyBody}>
                      {filter === 'mine'
                        ? 'When you report a flag, it appears here right away.'
                        : filter === 'watched'
                          ? 'Watch a flag to follow its updates here.'
                          : "When community members report or triage flags, they'll show up here in chronological order."}
                    </Text>
                  </View>
                )
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.surfaceMuted,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    height: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
    flex: 1,
    color: color.textStrong,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: font.size.xl,
    color: color.text,
    fontWeight: font.weight.bold,
    lineHeight: font.size.xl + 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
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
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    color: color.errorFg,
    flex: 1,
    fontSize: font.size.sm,
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: color.error,
    minHeight: 44,
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
  subtitle: {
    fontSize: font.size.sm,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 19,
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
    letterSpacing: 0.6,
  },
  sectionHeaderCount: { fontSize: font.size.xs, color: color.textSubtle },
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
  sevDot: {
    width: 28,
    height: 28,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevDotText: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.xs,
  },
  rowTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    flex: 1,
    color: color.textStrong,
    letterSpacing: -0.1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.tight,
    borderRadius: radius.circle,
  },
  statusBadgeText: { fontWeight: font.weight.bold, fontSize: font.size.caption },
  viewOnMapBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnMapBtnPressed: { opacity: 0.6, backgroundColor: color.borderPressed },
  viewOnMapGlyph: { fontSize: font.size.base },
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
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontSize: font.size.xl,
    fontWeight: font.weight.semibold,
    color: color.textStrong,
  },
  emptyBody: {
    fontSize: font.size.base,
    color: color.textMutedAlt,
    textAlign: 'center',
    lineHeight: 20,
  },
});
