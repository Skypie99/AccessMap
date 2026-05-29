/**
 * MyWatchedModal — shows all flags the current user is watching, grouped by
 * status. Each row shows the current status so the user can see changes since
 * they added it (e.g. "open → resolved"). Tapping a row opens FlagDetailModal
 * via the `onSelectFlag` callback (same pattern as MyReportsModal so the
 * parent can keep the detail modal as a top-level sibling, avoiding nested
 * Modal flakiness on Android).
 *
 * Unwatching from this list removes the ID from AsyncStorage immediately and
 * drops the row from local state — no round-trip needed.
 *
 * Missing flags (deleted since the user started watching) are silently dropped
 * by fetchFlagsByIds; the count note at the top tells the user how many are
 * loaded vs how many IDs are stored.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  fetchFlagsByIds,
  severityColor,
} from '@/lib/flags';
import { clearWatched, loadWatched, removeWatched } from '@/lib/watchedFlags';
import {
  filterWatchedFlags,
  filterWatchedFlagsByStatus,
  type WatchedStatusFilter,
} from '@/lib/watchedFlagsFilter';
import { font, radius, spacing } from '@/theme';
import { decorativeProps } from '@/lib/accessibility';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import type { FlagRow } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { StatusBadge } from './StatusBadge';
import SearchInputRow from './SearchInputRow';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  // Optional shortcut — when provided, each row gets a 📍 button that
  // closes the list and jumps the Map tab straight to that flag.
  onViewOnMap?: (flag: FlagRow) => void;
  // Bumped by the parent after a flag status changes in FlagDetailModal.
  refreshKey?: number;
}

// Ordering: show flags still needing attention first (open, verified), then
// resolved / rejected so they read as "done" rather than buried.
const STATUS_SORT_ORDER: Record<string, number> = {
  open: 0,
  verified: 1,
  resolved: 2,
  rejected: 3,
};

export default function MyWatchedModal({
  visible,
  onClose,
  onSelectFlag,
  onViewOnMap,
  refreshKey = 0,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WatchedStatusFilter>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const ids = await loadWatched(user.id);
      const rows = await fetchFlagsByIds(ids);
      // Sort by status priority, then newest first within the same status.
      rows.sort((a, b) => {
        const statusDiff =
          (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      if (!mountedRef.current) return;
      setWatchedIds(ids);
      setFlags(rows);
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(errorMessage(e, 'Could not load watched flags.'));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Reload whenever the modal becomes visible or the parent bumps refreshKey.
  useEffect(() => {
    if (visible) load();
  }, [visible, refreshKey, load]);

  const handleUnwatch = useCallback(
    async (flagId: string) => {
      if (!user) return;
      // Optimistic — drop from local state immediately so the row vanishes
      // without a reload. The AsyncStorage write happens in parallel.
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
      setWatchedIds((prev) => prev.filter((id) => id !== flagId));
      try {
        await removeWatched(user.id, flagId);
      } catch {
        // Rare AsyncStorage failure — the row is already gone from local
        // state; re-adding it would be confusing. A warning from watchedFlags
        // lib is sufficient.
      }
    },
    [user],
  );

  const handleClearAll = useCallback(async () => {
    if (!user || flags.length === 0) return;
    // confirm() falls back to window.confirm on web — Alert.alert is a
    // no-op there and would silently swallow the destructive prompt.
    const ok = await confirm(
      'Clear all watched flags?',
      `You're watching ${flags.length} ${flags.length === 1 ? 'flag' : 'flags'}. This will remove them all from your watched list.`,
      'Clear all',
      true,
    );
    if (!ok) return;
    // Optimistic: clear local state immediately so the list empties
    // without waiting for the AsyncStorage write.
    setFlags([]);
    setWatchedIds([]);
    try {
      await clearWatched(user.id);
    } catch {
      // Rare AsyncStorage failure — the UI already reflects the
      // cleared state; a reload will re-sync if needed.
    }
  }, [user, flags.length]);

  // Reset filters whenever the modal opens so stale state from a previous
  // session doesn't confuse the "No results" empty state.
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setStatusFilter('all');
    }
  }, [visible]);

  // Apply text + status filters locally — no extra fetches needed.
  const displayFlags = useMemo(() => {
    const byStatus = filterWatchedFlagsByStatus(flags, statusFilter);
    return filterWatchedFlags(byStatus, debouncedQuery, (cat) => CATEGORY_LABELS[cat] ?? '');
  }, [flags, debouncedQuery, statusFilter]);

  const missingCount = watchedIds.length - flags.length;

  const renderItem = useCallback(({ item }: { item: FlagRow }) => {
    const date = new Date(item.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const isResolved = item.status === 'resolved';

    return (
      <View role="listitem">
        <Pressable
          style={({ pressed }) => [
            styles.row,
            isResolved && styles.rowResolved,
            pressed && styles.rowPressed,
          ]}
          onPress={() => onSelectFlag(item)}
          accessibilityRole="button"
          accessibilityLabel={`${CATEGORY_LABELS[item.category]}, ${severityA11y(item.severity)}, ${statusA11y(item.status)}, reported ${date}`}
          accessibilityHint="Opens the full details for this flag"
        >
          {/* Green left-edge accent bar for resolved flags — decorative only */}
          {isResolved && (
            <View
              style={styles.resolvedAccent}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          )}

          {/* Left: severity dot */}
          <View
            style={[styles.severityDot, { backgroundColor: severityColor(item.severity) }]}
            {...decorativeProps}
          />

          {/* Middle: category + date */}
          <View style={styles.rowMid}>
            <Text
              style={[styles.rowCategory, isResolved && styles.rowCategoryResolved]}
              numberOfLines={1}
            >
              {isResolved ? '✓ ' : ''}
              {CATEGORY_LABELS[item.category]}
            </Text>
            <Text style={styles.rowDate}>{date}</Text>
          </View>

          {/* Right: status badge + unwatch */}
          <View style={styles.rowRight}>
            <StatusBadge
              status={item.status}
              accessibilityLabel={statusA11y(item.status)}
              size="sm"
            />
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
            <Pressable
              onPress={() => handleUnwatch(item.id)}
              hitSlop={10}
              style={({ pressed }) => [styles.unwatchBtn, pressed && styles.unwatchBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Stop watching this flag"
              accessibilityHint="Removes this flag from your watched list"
            >
              <Text style={styles.unwatchGlyph}>★</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }, [styles, onSelectFlag, onViewOnMap, handleUnwatch]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Watched Flags
            </Text>
            {/* Clear all — shown only when there's something to clear */}
            {flags.length > 0 && (
              <Pressable
                onPress={handleClearAll}
                hitSlop={10}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={`Clear all ${flags.length} watched flags`}
                accessibilityHint="Asks you to confirm before removing all watched flags"
              >
                <Text style={styles.clearBtnText}>Clear all</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close watched flags"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Search bar — always shown so the user can type before data loads */}
          <SearchInputRow
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search watched flags…"
            accessibilityLabel="Search watched flags"
            accessibilityHint="Filters by category and description"
            wrapStyle={styles.searchRow}
          />

          {/* Status filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statusScroll}
            contentContainerStyle={styles.statusScrollContent}
            accessibilityLabel="Filter by status"
          >
            {(
              [
                { value: 'all' as const, label: 'All' },
                { value: 'open' as const, label: 'Open' },
                { value: 'verified' as const, label: 'Verified' },
                { value: 'resolved' as const, label: 'Resolved' },
              ] satisfies { value: WatchedStatusFilter; label: string }[]
            ).map(({ value, label }) => {
              const active = statusFilter === value;
              const chipBg = active ? chipActiveBg(value, color) : color.surfaceNeutral;
              const chipFg = active ? chipActiveFg(value, color) : color.textMuted;
              return (
                <Pressable
                  key={value}
                  onPress={() => setStatusFilter(value)}
                  style={[styles.statusChip, { backgroundColor: chipBg }]}
                  accessibilityRole="button"
                  accessibilityLabel={value === 'all' ? 'Show all statuses' : `Filter to ${label} flags`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.statusChipText, { color: chipFg }]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {missingCount > 0 && !loading && (
            <View style={styles.missingBanner}>
              <Text style={styles.missingText}>
                {missingCount} {missingCount === 1 ? 'flag has' : 'flags have'} been removed by
                their author.
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : loadError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                onPress={load}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading watched flags"
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : flags.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon} accessibilityElementsHidden>
                ☆
              </Text>
              <Text style={styles.emptyTitle}>No watched flags yet</Text>
              <Text style={styles.emptySubtitle}>
                Open any flag on the map or in Tasks and tap{' '}
                <Text style={styles.emptyBold}>Watch</Text> to track it here.
              </Text>
            </View>
          ) : displayFlags.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon} accessibilityElementsHidden>
                🔎
              </Text>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search term or status filter.
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayFlags}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
              accessibilityRole="list"
              accessibilityLabel={`Watched flags list, ${displayFlags.length} ${displayFlags.length === 1 ? 'item' : 'items'}`}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// Returns the active background colour for each status chip, matching the
// StatusBadge palette so "Open" chips look like Open badges, etc.
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
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: color.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl + 4,
      maxHeight: '85%',
      gap: spacing.tight,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: font.size.xxl,
      fontWeight: font.weight.bold,
      flex: 1,
      color: color.textStrong,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: font.size.lg,
      color: color.text,
      fontWeight: font.weight.bold,
      lineHeight: font.size.lg + 2,
    },
    clearBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: color.errorBg,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.xs,
    },
    clearBtnText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.error,
    },
    missingBanner: {
      backgroundColor: color.warningBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: color.accentOrange,
    },
    missingText: {
      fontSize: font.size.sm,
      color: color.warningFg,
      lineHeight: 18,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: spacing.md,
    },
    errorText: {
      color: color.error,
      fontSize: font.size.base,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: color.surfaceNeutral,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
    },
    retryText: {
      color: color.brandText,
      fontWeight: font.weight.semibold,
    },
    emptyIcon: { fontSize: 40, color: color.textSubtle },
    emptyTitle: {
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    emptySubtitle: {
      fontSize: font.size.base,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyBold: {
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    list: { paddingBottom: spacing.sm },
    separator: { height: 1, backgroundColor: color.borderSubtle },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md + 2,
      gap: spacing.md,
    },
    rowPressed: { backgroundColor: color.surfaceMuted },
    severityDot: {
      width: 12,
      height: 12,
      borderRadius: radius.circle,
      flexShrink: 0,
    },
    rowMid: { flex: 1, gap: 2 },
    rowCategory: {
      fontSize: font.size.md,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    rowCategoryResolved: { color: color.statusResolvedFg },
    rowDate: { fontSize: font.size.xs, color: color.textSubtle },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 0,
    },
    unwatchBtn: {
      padding: spacing.tight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unwatchBtnPressed: { opacity: 0.5 },
    unwatchGlyph: { fontSize: font.size.xl, color: color.accentOrange },
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
    rowResolved: { backgroundColor: color.successSoft },
    resolvedAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: color.success,
      borderTopLeftRadius: 2,
      borderBottomLeftRadius: 2,
    },
    searchRow: {
      marginBottom: spacing.xs,
    },
    statusScroll: {
      flexGrow: 0,
      marginBottom: spacing.sm,
    },
    statusScrollContent: {
      gap: spacing.xs,
      paddingRight: spacing.xs,
    },
    statusChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusChipText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
    },
  });
