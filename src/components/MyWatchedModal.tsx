/**
 * MyWatchedModal — Wave 3: sort picker (Status/Newest/Oldest/Severity) +
 * pull-to-refresh. Tapping a row opens FlagDetailModal. Unwatching removes
 * the ID from AsyncStorage immediately.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
  onViewOnMap?: (flag: FlagRow) => void;
  refreshKey?: number;
}

const STATUS_SORT_ORDER: Record<string, number> = { open: 0, verified: 1, resolved: 2, rejected: 3 };

/** Wave 3 — sort mode for the Watched Flags list. Exported for tests. */
export type WatchedSort = 'status' | 'newest' | 'oldest' | 'severity';

const SORT_OPTIONS: { value: WatchedSort; label: string; a11yLabel: string }[] = [
  { value: 'status',   label: 'Status',     a11yLabel: 'Sort by status (open first)' },
  { value: 'newest',   label: 'Newest',     a11yLabel: 'Sort newest first' },
  { value: 'oldest',   label: 'Oldest',     a11yLabel: 'Sort oldest first' },
  { value: 'severity', label: 'Severity ↓', a11yLabel: 'Sort by highest severity first' },
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
    setFlags((prev) => prev.filter((f) => f.id !== flagId));
    setWatchedIds((prev) => prev.filter((id) => id !== flagId));
    try { await removeWatched(user.id, flagId); } catch { /* best-effort */ }
  }, [user]);

  const handleClearAll = useCallback(async () => {
    if (!user || flags.length === 0) return;
    const ok = await confirm(
      'Clear all watched flags?',
      `You're watching ${flags.length} ${flags.length === 1 ? 'flag' : 'flags'}. This will remove them all from your watched list.`,
      'Clear all', true,
    );
    if (!ok) return;
    setFlags([]); setWatchedIds([]);
    try { await clearWatched(user.id); } catch { /* best-effort */ }
  }, [user, flags.length]);

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
          accessibilityRole="button"
          accessibilityLabel={`${CATEGORY_LABELS[item.category]}, ${severityA11y(item.severity)}, ${statusA11y(item.status)}, reported ${date}`}
          accessibilityHint="Opens the full details for this flag"
        >
          {isResolved && (
            <View style={styles.resolvedAccent} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          )}
          <View style={[styles.severityDot, { backgroundColor: severityColor(item.severity) }]} {...decorativeProps} />
          <View style={styles.rowMid}>
            <Text style={[styles.rowCategory, isResolved && styles.rowCategoryResolved]} numberOfLines={1}>
              {isResolved ? '✓ ' : ''}{CATEGORY_LABELS[item.category]}
            </Text>
            <Text style={styles.rowDate}>{date}</Text>
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
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Watched Flags</Text>
            {flags.length > 0 && (
              <Pressable onPress={handleClearAll} hitSlop={10} style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={`Clear all ${flags.length} watched flags`}
                accessibilityHint="Asks you to confirm before removing all watched flags"
              >
                <Text style={styles.clearBtnText}>Clear all</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}
              accessibilityRole="button" accessibilityLabel="Close watched flags"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

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
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.statusChipText, { color: chipFg }]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.sortScroll} contentContainerStyle={styles.sortScrollContent}
            accessibilityLabel="Sort order"
          >
            {SORT_OPTIONS.map(({ value, label, a11yLabel }) => {
              const active = sortMode === value;
              return (
                <Pressable key={value} onPress={() => setSortMode(value)}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  accessibilityRole="button" accessibilityLabel={a11yLabel}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {missingCount > 0 && !loading && (
            <View style={styles.missingBanner}>
              <Text style={styles.missingText}>
                {missingCount} {missingCount === 1 ? 'flag has' : 'flags have'} been removed by their author.
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.center}><ActivityIndicator /></View>
          ) : loadError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable onPress={() => void load()} style={styles.retryBtn} accessibilityRole="button" accessibilityLabel="Retry loading watched flags">
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : flags.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon} accessibilityElementsHidden>☆</Text>
              <Text style={styles.emptyTitle}>No watched flags yet</Text>
              <Text style={styles.emptySubtitle}>
                Open any flag on the map or in Tasks and tap <Text style={styles.emptyBold}>Watch</Text> to track it here.
              </Text>
            </View>
          ) : displayFlags.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon} accessibilityElementsHidden>🔎</Text>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySubtitle}>Try a different search term or status filter.</Text>
            </View>
          ) : (
            <FlatList
              data={displayFlags} keyExtractor={(item) => item.id} renderItem={renderItem}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
              accessibilityRole="list"
              accessibilityLabel={`Watched flags list, ${displayFlags.length} ${displayFlags.length === 1 ? 'item' : 'items'}`}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} accessibilityLabel="Pull down to refresh watched flags" />
              }
            />
          )}
        </View>
      </View>
    </Modal>
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
    backdrop: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: color.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl + 4,
      maxHeight: '85%', gap: spacing.tight,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    title: { fontSize: font.size.xxl, fontWeight: font.weight.bold, flex: 1, color: color.textStrong, letterSpacing: -0.3 },
    closeBtn: { width: 32, height: 32, borderRadius: radius.circle, backgroundColor: color.surfaceNeutral, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontSize: font.size.lg, color: color.text, fontWeight: font.weight.bold, lineHeight: font.size.lg + 2 },
    clearBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: color.errorBg, minHeight: 36, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs },
    clearBtnText: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: color.error },
    missingBanner: { backgroundColor: color.warningBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: color.accentOrange },
    missingText: { fontSize: font.size.sm, color: color.warningFg, lineHeight: 18 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: spacing.md },
    errorText: { color: color.error, fontSize: font.size.base, textAlign: 'center' },
    retryBtn: { backgroundColor: color.surfaceNeutral, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: radius.md },
    retryText: { color: color.brandText, fontWeight: font.weight.semibold },
    emptyIcon: { fontSize: 40, color: color.textSubtle },
    emptyTitle: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: color.textStrong },
    emptySubtitle: { fontSize: font.size.base, color: color.textMuted, textAlign: 'center', lineHeight: 20 },
    emptyBold: { fontWeight: font.weight.bold, color: color.textStrong },
    list: { paddingBottom: spacing.sm },
    separator: { height: 1, backgroundColor: color.borderSubtle },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md + 2, gap: spacing.md },
    rowPressed: { backgroundColor: color.surfaceMuted },
    severityDot: { width: 12, height: 12, borderRadius: radius.circle, flexShrink: 0 },
    rowMid: { flex: 1, gap: 2 },
    rowCategory: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: color.textStrong },
    rowCategoryResolved: { color: color.statusResolvedFg },
    rowDate: { fontSize: font.size.xs, color: color.textSubtle },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
    unwatchBtn: { padding: spacing.tight, alignItems: 'center', justifyContent: 'center' },
    unwatchBtnPressed: { opacity: 0.5 },
    unwatchGlyph: { fontSize: font.size.xl, color: color.accentOrange },
    viewOnMapBtn: { width: 32, height: 32, borderRadius: radius.circle, backgroundColor: color.surfaceNeutral, alignItems: 'center', justifyContent: 'center' },
    viewOnMapBtnPressed: { opacity: 0.6, backgroundColor: color.borderPressed },
    viewOnMapGlyph: { fontSize: font.size.base },
    rowResolved: { backgroundColor: color.successSoft },
    resolvedAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color.success, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
    searchRow: { marginBottom: spacing.xs },
    statusScroll: { flexGrow: 0, marginBottom: spacing.sm },
    statusScrollContent: { gap: spacing.xs, paddingRight: spacing.xs },
    statusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    statusChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
    sortScroll: { flexGrow: 0, marginBottom: spacing.sm },
    sortScrollContent: { gap: spacing.xs, paddingRight: spacing.xs },
    sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, backgroundColor: color.surfaceNeutral, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    sortChipActive: { backgroundColor: color.brandSofter, borderWidth: 1, borderColor: color.brand },
    sortChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: color.textMuted },
    sortChipTextActive: { color: color.brandText },
  });
