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
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/lib/flags';
import { clearWatched, loadWatched, removeWatched } from '@/lib/watchedFlags';
import { filterWatchedFlags } from '@/lib/watchedFlagsFilter';
import SearchInputRow from '@/components/SearchInputRow';
import { radius } from '@/theme';
import { decorativeProps } from '@/lib/accessibility';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import type { FlagRow } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

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
          (STATUS_SORT_ORDER[a.status] ?? 99) -
          (STATUS_SORT_ORDER[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime();
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

  const missingCount = watchedIds.length - flags.length;

  // Local filter — no network call. Derived from the already-loaded flags list.
  // Returns the same array reference when the query is empty so FlatList
  // doesn't re-render unnecessarily.
  const filteredWatched = useMemo(
    () => filterWatchedFlags(flags, searchQuery, (cat) => CATEGORY_LABELS[cat]),
    [flags, searchQuery],
  );

  const hasQuery = searchQuery.trim().length > 0;

  const renderItem = ({ item }: { item: FlagRow }) => {
    const statusPalette = STATUS_COLORS[item.status];
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
          style={[
            styles.severityDot,
            { backgroundColor: severityColor(item.severity) },
          ]}
          {...decorativeProps}
        />

        {/* Middle: category + date */}
        <View style={styles.rowMid}>
          <Text
            style={[styles.rowCategory, isResolved && styles.rowCategoryResolved]}
            numberOfLines={1}
          >
            {isResolved ? '✓ ' : ''}{CATEGORY_LABELS[item.category]}
          </Text>
          <Text style={styles.rowDate}>{date}</Text>
        </View>

        {/* Right: status badge + unwatch */}
        <View style={styles.rowRight}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusPalette.bg },
            ]}
            accessible
            accessibilityLabel={statusA11y(item.status)}
          >
            <Text style={[styles.statusText, { color: statusPalette.fg }]}>
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
          <Pressable
            onPress={() => handleUnwatch(item.id)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.unwatchBtn,
              pressed && styles.unwatchBtnPressed,
            ]}
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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

          {missingCount > 0 && !loading && (
            <View style={styles.missingBanner}>
              <Text style={styles.missingText}>
                {missingCount}{' '}
                {missingCount === 1 ? 'flag has' : 'flags have'} been removed
                by their author.
              </Text>
            </View>
          )}

          {/* Search bar — only shown once flags are loaded and there's
              something to search. Hidden during loading / error states. */}
          {!loading && !loadError && flags.length > 0 && (
            <SearchInputRow
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search by category or description…"
              accessibilityLabel="Search watched flags"
              accessibilityHint="Filter by category or description"
            />
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
          ) : filteredWatched.length === 0 && hasQuery ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No watched flags match</Text>
              <Text style={styles.emptySubtitle}>
                Try a different category or description keyword.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredWatched}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
              accessibilityRole="list"
              accessibilityLabel={`Watched flags list, ${filteredWatched.length} ${filteredWatched.length === 1 ? 'item' : 'items'}`}
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '85%',
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1, color: '#222' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#333', fontWeight: '700' },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fdecea',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: color.error },
  missingBanner: {
    backgroundColor: '#fff8e7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: color.accentOrange,
  },
  missingText: { fontSize: 13, color: '#7a5500' },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  errorText: { color: color.error, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: color.surfaceNeutral,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: color.brand, fontWeight: '600' },
  emptyIcon: { fontSize: 40, color: '#bbb' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  emptyBold: { fontWeight: '700', color: '#333' },
  list: { paddingBottom: 8 },
  separator: { height: 1, backgroundColor: '#eef1f5' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: { backgroundColor: '#f7f9fc' },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  rowMid: { flex: 1, gap: 2 },
  rowCategory: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowCategoryResolved: { color: '#1a7a44' },
  rowDate: { fontSize: 12, color: '#888' },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.circle,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  unwatchBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unwatchBtnPressed: { opacity: 0.5 },
  // Filled amber star — visually signals "tap to unwatch."
  unwatchGlyph: { fontSize: 18, color: color.accentOrange },
  viewOnMapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnMapBtnPressed: { opacity: 0.6, backgroundColor: color.borderPressed },
  viewOnMapGlyph: { fontSize: 14 },
  // Resolved-row treatments: light green wash + a left-edge accent bar.
  rowResolved: { backgroundColor: '#f0faf4' },
  resolvedAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#27ae60',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
});
