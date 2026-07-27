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
  ActivityIndicator,  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { SeverityDisc } from '@/components/SeverityDisc';
import { useAuth } from '@/lib/auth';
import { a11yToggle, useReducedMotion } from '@/lib/accessibility';
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
import { font, radius, shadow, spacing } from '@/theme';
import { MapPin, X } from 'lucide-react-native';
import { StatusBadge } from '@/components/StatusBadge';

type FeedFilter = 'all' | 'mine' | 'watched';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  onViewOnMap?: (flag: FlagRow) => void;
}

export default function ActivityFeedModal({ visible, onClose, onSelectFlag, onViewOnMap }: Props) {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const reducedMotion = useReducedMotion();
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
              <SeverityDisc severity={item.severity} size={28} digitSize={font.size.xs} />
              <AppText variant="label" style={styles.rowTitle}>
                {CATEGORY_LABELS[item.category]}
              </AppText>
              <StatusBadge status={item.status} />
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
                  style={styles.thumb}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
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
    <Modal aria-label="Recent Activity" visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
        <GlassSurface
          variant="bulk"
          borderRadius={0}
          forceEngineered
          style={[styles.card, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.headerRow}>
            <AppText variant="heading" style={styles.title} accessibilityRole="header">
              Recent Activity
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close recent activity"
              accessibilityHint="Returns to your Profile"
            >
              <X size={18} color={color.text} strokeWidth={2.2} />
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
                    {...a11yToggle({ selected: active })}
                  >
                    <AppText variant="label" style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
          </View>

          {loadError ? (
            <View style={styles.errorBanner}>
              <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
              <Pressable
                onPress={load}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading activity"
              >
                <AppText variant="label" style={styles.retryText}>Retry</AppText>
              </Pressable>
            </View>
          ) : null}

          {loading && flags.length === 0 && !loadError ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <AppText variant="body" style={styles.subtitle}>Loading recent activity…</AppText>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(f) => f.id}
              renderItem={renderItem}
              accessibilityRole="list"
              stickySectionHeadersEnabled={false}
              contentContainerStyle={sections.length === 0 ? styles.center : styles.list}
              renderSectionHeader={({ section: { title, data } }) => (
                <View style={styles.sectionHeader}>
                  <AppText variant="heading" style={styles.sectionHeaderText}>{title}</AppText>
                  <AppText variant="body" style={styles.sectionHeaderCount}>
                    {data.length} {data.length === 1 ? 'flag' : 'flags'}
                  </AppText>
                </View>
              )}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
              accessibilityLabel={
                filteredFlags.length === 0
                  ? 'Recent activity, empty'
                  : `Recent activity, ${filteredFlags.length} ${filteredFlags.length === 1 ? 'flag' : 'flags'}`
              }
              ListEmptyComponent={
                loadError ? null : (
                  <View style={styles.emptyWrap}>
                    <AppText variant="label" style={styles.emptyTitle}>
                      {filter === 'mine'
                        ? 'You have no recent reports'
                        : filter === 'watched'
                          ? 'No recent activity on your watched flags'
                          : 'No recent activity'}
                    </AppText>
                    <AppText variant="body" style={styles.emptyBody}>
                      {filter === 'mine'
                        ? 'When you report a flag, it appears here right away.'
                        : filter === 'watched'
                          ? 'Watch a flag to follow its updates here.'
                          : "When community members report or triage flags, they'll show up here in chronological order."}
                    </AppText>
                  </View>
                )
              }
            />
          )}
        </GlassSurface>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      // Bulk-glass sheet: GlassSurface variant="bulk" (forceEngineered) supplies
      // the surface + top edge/specular + designed Reduce-Transparency state — no
      // backgroundColor here (the variant owns it; drops the surfaceMuted wash).
      // overflow:hidden clips the square material to the rounded top; the
      // up-shadow moves to cardWrap (GlassSurface contract).
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    cardWrap: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...(color.scheme === 'dark'
        ? { shadowColor: '#000', shadowOpacity: 0.35 }
        : { shadowColor: color.shadowTint, shadowOpacity: 0.12 }),
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
      elevation: 5,
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
    },    filterRow: {
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
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
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
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
