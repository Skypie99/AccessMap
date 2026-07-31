/**
 * MyWatchedModal — Wave 3: sort picker (Status/Newest/Oldest/Severity) +
 * pull-to-refresh. Tapping a row opens FlagDetailModal. Unwatching removes
 * the ID from AsyncStorage immediately.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  type Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { SeverityDisc } from '@/components/SeverityDisc';
import { confirm, notify } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  fetchFlagsByIds,
} from '@/lib/flags';
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
import { font, radius, spacing } from '@/theme';
import { MapPin, Star, X } from 'lucide-react-native';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
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
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
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
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };

  return (
    <Modal aria-label="Watched Flags" visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
        {/* MP2/M-40: bulk-glass sheet (forceEngineered = budget-free).
            accessibilityViewIsModal (BP17 / T20) traps VoiceOver focus inside
            this sheet CONTENT view so it can't escape to the Profile screen
            behind it — the last sheet missing the app-wide SR-containment
            blanket. Goes on the GlassSurface, never the backdrop; mirrors
            MyReportsModal. */}
        <GlassSurface
          variant="bulk"
          borderRadius={0}
          forceEngineered
          style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl + 4, insets.bottom) }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.header}>
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">Watched Flags</AppText>
            {flags.length > 0 && (
              <Pressable onPress={handleClearAll} hitSlop={10} style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={`Clear all ${flags.length} watched flags`}
                accessibilityHint="Asks you to confirm before removing all watched flags"
              >
                <AppText variant="label" style={styles.clearBtnText}>Clear all</AppText>
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}
              accessibilityRole="button" accessibilityLabel="Close watched flags"
            >
              <X size={18} color={color.text} strokeWidth={2.2} />
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
            {SORT_OPTIONS.map(({ value, label, a11yLabel }) => {
              const active = sortMode === value;
              return (
                <Pressable key={value} onPress={() => setSortMode(value)}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  accessibilityRole="button" accessibilityLabel={a11yLabel}
                  {...a11yToggle({ pressed: active })}
                >
                  <AppText variant="label" style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</AppText>
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
          {loadError && flags.length > 0 && !loading && (
            <View style={styles.missingBanner}>
              <AppText variant="body" style={styles.missingText}>
                {`Couldn't refresh: ${loadError} Showing your last loaded list.`}
              </AppText>
            </View>
          )}

          {loading ? (
            <View style={styles.center}><ActivityIndicator /></View>
          ) : loadError && flags.length === 0 ? (
            <View style={styles.center}>
              {/* M-40 error repair: was bare color.error text directly on the
                  (now glass) sheet; adopts the sibling errorBanner pattern —
                  a self-contained solid errorBg banner (MyReports/ActivityFeed
                  ship the same), never error-on-glass. */}
              <View style={styles.errorBanner}>
                <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
                <Pressable onPress={() => void load()} style={styles.retryBtn} accessibilityRole="button" accessibilityLabel="Retry loading watched flags">
                  <AppText variant="label" style={styles.retryText}>Retry</AppText>
                </Pressable>
              </View>
            </View>
          ) : flags.length === 0 ? (
            <View style={styles.center}>
              <Star size={32} color={color.inkGlassMuted} strokeWidth={2.2} {...decorativeProps} />

              <AppText variant="heading" style={styles.emptyTitle}>No watched flags yet</AppText>
              <AppText variant="body" style={styles.emptySubtitle}>
                Open any flag on the map or in Tasks and tap <AppText variant="label" style={styles.emptyBold}>Watch</AppText> to track it here.
              </AppText>
            </View>
          ) : displayFlags.length === 0 ? (
            <View style={styles.center}>
              <AppText variant="body" style={styles.emptyIcon} {...decorativeProps}>🔎</AppText>
              <AppText variant="heading" style={styles.emptyTitle}>No matches</AppText>
              <AppText variant="body" style={styles.emptySubtitle}>Try a different search term or status filter.</AppText>
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
        </GlassSurface>
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
    // Bulk-glass sheet — the variant owns the surface (no backgroundColor);
    // overflow:hidden clips the square material to the rounded top; the up-shadow
    // moves to cardWrap (an overflow:hidden view clips its own shadow).
    sheet: {
      borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl + 4,
      maxHeight: '85%', gap: spacing.tight, overflow: 'hidden',
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
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    title: { fontSize: font.size.xxl, fontWeight: font.weight.bold, flex: 1, color: color.textStrong, letterSpacing: -0.3 },
    closeBtn: { width: 44, height: 44, borderRadius: radius.circle, backgroundColor: color.surfaceNeutral, alignItems: 'center', justifyContent: 'center' },    clearBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: color.errorBg, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs },
    clearBtnText: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: color.error },
    missingBanner: { backgroundColor: color.warningBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: color.accentOrange },
    missingText: { fontSize: font.size.sm, color: color.warningFg, lineHeight: 18 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: spacing.md },
    // M-40 error-banner (self-contained solid pin — errorBg + errorFg, the
    // MyReports/ActivityFeed sibling pattern; no new arbiter pair, stacks _doc).
    errorBanner: { backgroundColor: color.errorBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
    errorText: { color: color.errorFg, flex: 1, fontSize: font.size.sm, lineHeight: 18 },
    retryBtn: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm + 2, borderRadius: radius.md, backgroundColor: color.error, minHeight: 44, justifyContent: 'center' },
    retryText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.sm },
    emptyIcon: { fontSize: 40, color: color.textSubtle },
    emptyTitle: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: color.textStrong },
    emptySubtitle: { fontSize: font.size.base, color: color.inkGlassMuted, fontFamily: font.family.bodyMedium, textAlign: 'center', lineHeight: 20 },
    emptyBold: { fontWeight: font.weight.bold, color: color.textStrong },
    list: { paddingBottom: spacing.sm },
    separator: { height: 1, backgroundColor: color.borderSubtle },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md + 2, gap: spacing.md },
    rowPressed: { backgroundColor: color.surfaceMuted },
    // A11Y-214: summary wrapper mirrors the row's internal rhythm (same gap,
    // same centering, takes the middle space) so the de-flattened structure
    // renders identically.
    rowSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
    rowMid: { flex: 1, gap: 2 },
    rowCategory: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: color.textStrong },
    rowCategoryResolved: { color: color.statusResolvedFg },
    rowDate: { fontSize: font.size.xs, color: color.inkGlassMuted, fontFamily: font.family.bodyMedium },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
    unwatchBtn: { padding: spacing.tight, alignItems: 'center', justifyContent: 'center' },
    unwatchBtnPressed: { opacity: 0.5 },
    unwatchGlyph: { fontSize: font.size.xl, color: color.accentOrange },
    viewOnMapBtn: { width: 44, height: 44, borderRadius: radius.circle, backgroundColor: color.surfaceNeutral, alignItems: 'center', justifyContent: 'center' },
    viewOnMapBtnPressed: { opacity: 0.6, backgroundColor: color.borderPressed },
    viewOnMapGlyph: { fontSize: font.size.base },
    rowResolved: { backgroundColor: color.successSoft },
    resolvedAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color.success, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
    searchRow: { marginBottom: spacing.xs },
    statusScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm },
    statusScrollContent: { gap: spacing.xs, paddingRight: spacing.xs },
    statusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    statusChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
    sortScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm },
    sortScrollContent: { gap: spacing.xs, paddingRight: spacing.xs },
    sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, backgroundColor: color.surfaceNeutral, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    sortChipActive: { backgroundColor: color.brandSofter, borderWidth: 1, borderColor: color.brand },
    sortChipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: color.textMuted },
    sortChipTextActive: { color: color.brandText },
  });
