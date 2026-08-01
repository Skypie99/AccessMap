import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  type Text,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import SearchInputRow from '@/components/SearchInputRow';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  listFlagsByUser,
  SEVERITY_LABELS,
  severityColor,
  STATUS_LABELS,
} from '@/lib/flags';
import { statusPalette } from '@/components/StatusBadge';
import { severityA11y } from '@/lib/a11yText';
import { filterMyReports } from '@/lib/myReportsFilter';
import type { FlagRow, FlagStatus } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';
import { MapPin, RefreshCw, X } from 'lucide-react-native';
import { StatusBadge } from '@/components/StatusBadge';

const STATUS_FILTER_ORDER: FlagStatus[] = ['open', 'verified', 'resolved', 'rejected'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  // Optional shortcut — when provided, each row gets a 📍 button that
  // closes the list and jumps the Map tab straight to that flag.
  onViewOnMap?: (flag: FlagRow) => void;
  // Bumping this value triggers a refetch — Profile uses it after a flag
  // is changed or deleted in FlagDetailModal so the list stays in sync.
  refreshKey?: number;
  // Optional seed for the internal status filter. When provided, the
  // modal opens already filtered to that status (e.g. Profile taps the
  // "4 open" status pill → opens here pre-filtered to Open). Undefined
  // (the default) keeps the existing behavior: opens showing all statuses.
  initialStatus?: FlagStatus;
}

export default function MyReportsModal({
  visible,
  onClose,
  onSelectFlag,
  onViewOnMap,
  refreshKey = 0,
  initialStatus,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Sort options: newest (default, matches server order), oldest, or highest
  // severity first. Applied client-side so no extra fetch is needed.
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');
  // 'all' = no status filter; otherwise restrict to that status only.
  const [statusFilter, setStatusFilter] = useState<FlagStatus | 'all'>('all');
  // Free-text search across description / category label / status. Pure
  // client-side filter via filterMyReports() — no extra fetch.
  const [searchQuery, setSearchQuery] = useState('');

  // Reset transient filters when the modal closes, so reopening starts fresh
  // instead of restoring whatever was set last time. F9: without resetting
  // statusFilter, a stale (e.g. 'resolved') filter could leave the list empty
  // on reopen — and if no flags of that status remain, the filter chip row
  // (gated on >1 present status) hides the 'All' button, stranding the user in
  // an empty view whose only escape hint points to a control that isn't shown.
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setStatusFilter('all');
      setSortBy('newest');
    } else {
      // On open, seed the status filter from the optional initialStatus
      // prop (e.g. Profile tapped the "Open" status pill). Falls back to
      // 'all' so callers that don't pass it keep the existing behavior.
      // Sort + search always start fresh on open.
      setStatusFilter(initialStatus ?? 'all');
    }
  }, [visible, initialStatus]);

  // Count flags per status — drives the chip badges. Computed once per
  // `flags` change so it stays cheap.
  const statusCounts = useMemo<Record<FlagStatus, number>>(() => {
    const counts: Record<FlagStatus, number> = {
      open: 0,
      verified: 0,
      resolved: 0,
      rejected: 0,
    };
    for (const f of flags) {
      if (f.status in counts) counts[f.status]++;
    }
    return counts;
  }, [flags]);

  // Categories present in this user's reports — used to decide whether to
  // even show the status filter chips (don't bother if everything is in
  // the same status).
  const presentStatuses = useMemo<FlagStatus[]>(() => {
    return STATUS_FILTER_ORDER.filter((s) => statusCounts[s] > 0);
  }, [statusCounts]);

  const sortedFlags = useMemo(() => {
    const copy = [...flags];
    if (sortBy === 'oldest') {
      copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'severity') {
      copy.sort((a, b) => b.severity - a.severity);
    }
    // 'newest' keeps the server order (created_at DESC from listFlagsByUser)
    return copy;
  }, [flags, sortBy]);

  // Apply status filter on top of the sort. Empty filter = pass-through.
  const statusFiltered = useMemo(() => {
    if (statusFilter === 'all') return sortedFlags;
    return sortedFlags.filter((f) => f.status === statusFilter);
  }, [sortedFlags, statusFilter]);

  // Apply the free-text search on top of the status filter. The lib is
  // decoupled from the labels table — pass CATEGORY_LABELS in as a
  // lookup callback. Empty / whitespace-only query is a no-op (returns
  // the same array reference, so the FlatList doesn't re-render its
  // rows for no reason).
  const displayFlags = useMemo(() => {
    return filterMyReports(statusFiltered, searchQuery, (cat) => CATEGORY_LABELS[cat]);
  }, [statusFiltered, searchQuery]);

  // True when the user has typed something searchable (after trimming).
  // Used to swap the empty state copy and to show the clear (✕) button.
  const hasQuery = searchQuery.trim().length > 0;

  // Guard setState after async calls so a slow fetch can't update a
  // torn-down modal.
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
      const rows = await listFlagsByUser(user.id);
      if (mountedRef.current) setFlags(rows);
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(errorMessage(e, 'Could not load your reports.'));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Fetch fresh data every time the modal opens (and when the parent bumps
  // refreshKey after a triage/delete completes).
  useEffect(() => {
    if (visible) load();
  }, [visible, refreshKey, load]);

  const renderItem = ({ item }: { item: FlagRow }) => {
    const dateLabel = new Date(item.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    // A11Y-214: the summary node's label. Description and date are NOT here —
    // the body text below is its own AT stop now that the row is de-flattened,
    // so nothing is said twice.
    const a11yLabel =
      `${CATEGORY_LABELS[item.category]}, ${severityA11y(item.severity)}, ` +
      `status ${STATUS_LABELS[item.status]}`;

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
            {/* Labeled SUMMARY node: dot + category + status badge. Children of
                an accessible container are not separate stops, so the badge
                does not re-announce what the label already says. */}
            <View
              style={styles.rowSummary}
              accessible
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityHint="Opens the full report with options to verify, resolve, reject, or delete"
            >
            <View
              style={[styles.sevDot, { backgroundColor: severityColor(item.severity) }]}
              // Severity is also surfaced as a number + text in the badges
              // below; this dot is purely visual reinforcement.
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <AppText variant="label" style={styles.rowTitle}>
              {CATEGORY_LABELS[item.category]}
            </AppText>
            <StatusBadge status={item.status} />
            </View>
            {/* Pin shortcut — bypasses the detail modal and jumps straight
              to the Map tab with the pin focused. Only shown when the
              parent passes onViewOnMap. */}
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
              ) : (
                <AppText variant="body" style={styles.rowDescMuted}>No description.</AppText>
              )}
              <AppText variant="body" style={styles.rowMeta}>
                Severity {item.severity} · {SEVERITY_LABELS[item.severity]} · {dateLabel}
              </AppText>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <Modal aria-label="My Reports" visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
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
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
              My Reports
            </AppText>
            {/* A11Y-222 (2.5.7): pull-to-refresh is a DRAG. This is the
              single-pointer alternative, in the same 44pt circle recipe as
              Close beside it — and it is discoverable, which close+reopen
              was not. */}
            <Pressable
              onPress={() => void load()}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Refresh"
              accessibilityHint="Reloads your reports without pulling down the list"
              {...a11yToggle({ busy: loading })}
            >
              <RefreshCw size={18} color={color.text} strokeWidth={2.2} {...decorativeProps} />
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close My Reports"
              accessibilityHint="Returns to your Profile"
            >
              <X size={18} color={color.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Free-text search — only useful once the user has more than one
              report. Filters across description, category label, and status
              via filterMyReports. Multi-token AND, NFC-normalized, case-
              insensitive. Reset on modal close (useEffect above). */}
          {flags.length > 1 && (
            <SearchInputRow
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search your reports…"
              accessibilityLabel="Search your reports"
              accessibilityHint="Filters your reports list to those whose description, category, or status contains your search words"
            />
          )}

          {/* Sort chips — only shown when there's something to sort */}
          {flags.length > 1 && (
            <View style={styles.sortRow}>
              {(['newest', 'oldest', 'severity'] as const).map((opt) => {
                const labels = { newest: 'Newest', oldest: 'Oldest', severity: 'Severity' };
                const active = sortBy === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setSortBy(opt)}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Sort by ${labels[opt]}`}
                    {...a11yToggle({ pressed: active })}
                  >
                    <AppText variant="label" style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                      {labels[opt]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Status filter chips — only shown when the list contains more
              than one distinct status. The chips use statusPalette for the
              active state, so each status tints with its palette color. */}
          {presentStatuses.length > 1 && (
            <View style={styles.statusFilterRow} accessibilityLabel="Filter by status">
              <Pressable
                onPress={() => setStatusFilter('all')}
                style={[
                  styles.statusFilterChip,
                  statusFilter === 'all' && styles.statusFilterChipAllActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Show all statuses"
                {...a11yToggle({ pressed: statusFilter === 'all' })}
              >
                <AppText
                  variant="label"
                  style={[
                    styles.statusFilterText,
                    statusFilter === 'all' && styles.statusFilterTextActive,
                  ]}
                >
                  All ({flags.length})
                </AppText>
              </Pressable>
              {presentStatuses.map((status) => {
                const active = statusFilter === status;
                // Themed (light + dark) — was the light-only STATUS_COLORS map,
                // which froze active chips in light colors on dark surfaces
                // (BP-2 fix). In dark mode the fg tokens are LIGHT fills, so the
                // active label flips to ink — the severity-ramp rule (light
                // fills carry dark ink; theme.ts severity textOnColor).
                const palette = statusPalette(color, status);
                const activeInk =
                  color.scheme === 'dark' ? color.textOnAccent : color.textOnBrand;
                return (
                  <Pressable
                    key={status}
                    onPress={() => setStatusFilter(active ? 'all' : status)}
                    style={[styles.statusFilterChip, active && { backgroundColor: palette.fg }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Show only ${STATUS_LABELS[status]} reports, ${statusCounts[status]} ${statusCounts[status] === 1 ? 'item' : 'items'}`}
                    {...a11yToggle({ pressed: active })}
                  >
                    <AppText
                      variant="label"
                      style={[styles.statusFilterText, active && { color: activeInk }]}
                    >
                      {STATUS_LABELS[status]} ({statusCounts[status]})
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {loadError ? (
            <View style={styles.errorBanner}>
              <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
              <Pressable
                onPress={load}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading your reports"
              >
                <AppText variant="label" style={styles.retryText}>Retry</AppText>
              </Pressable>
            </View>
          ) : null}

          {loading && flags.length === 0 && !loadError ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <AppText variant="body" style={styles.subtitle}>Loading your reports…</AppText>
            </View>
          ) : (
            <FlatList
              data={displayFlags}
              keyExtractor={(f) => f.id}
              renderItem={renderItem}
              accessibilityRole="list"
              contentContainerStyle={displayFlags.length === 0 ? styles.center : styles.list}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
              accessibilityLabel={
                displayFlags.length === 0
                  ? 'Your reports list, empty'
                  : `Your reports list, showing ${displayFlags.length} of ${flags.length} ${flags.length === 1 ? 'report' : 'reports'}`
              }
              ListEmptyComponent={
                loadError ? null : flags.length > 0 && hasQuery ? (
                  // accessibilityLiveRegion="polite" on the wrapper makes
                  // TalkBack announce "No matches. No reports match that
                  // search." when the user types into the search field and
                  // the list collapses to empty — otherwise the change is
                  // silent and SR users have no feedback their query missed.
                  // (iOS VoiceOver doesn't honor the prop but loses nothing
                  // — it's a no-op there.)
                  <View style={styles.emptyWrap} accessibilityLiveRegion="polite">
                    <AppText variant="label" style={styles.emptyTitle}>No matches</AppText>
                    <AppText variant="body" style={styles.emptyBody}>No reports match that search.</AppText>
                  </View>
                ) : flags.length > 0 && statusFilter !== 'all' ? (
                  <View style={styles.emptyWrap}>
                    <AppText variant="label" style={styles.emptyTitle}>
                      No {STATUS_LABELS[statusFilter as FlagStatus].toLowerCase()} reports
                    </AppText>
                    <AppText variant="body" style={styles.emptyBody}>
                      You don&apos;t have any reports in this status. Tap &quot;All&quot; to see everything.
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.emptyWrap}>
                    <AppText variant="label" style={styles.emptyTitle}>No reports yet</AppText>
                    <AppText variant="body" style={styles.emptyBody}>
                      You haven&apos;t reported any accessibility flags. Tap the Map tab and use the
                      Report button to drop your first pin.
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
      // backgroundColor here (the variant owns it). overflow:hidden clips the
      // square material to the rounded top; the up-shadow moves to cardWrap
      // (an overflow:hidden view clips its own shadow — GlassSurface contract).
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
    },    errorBanner: {
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
    list: { paddingTop: spacing.tight, paddingBottom: spacing.md, gap: spacing.sm + 2 },
    row: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg - 2,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      minHeight: 44,
      ...shadow.e1,
    },
    rowPressed: { opacity: 0.9, backgroundColor: color.surfaceMuted },
    rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    // A11Y-214: summary wrapper mirrors the header's internal rhythm so the
    // de-flattened structure renders identically.
    rowSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
    sevDot: { width: 12, height: 12, borderRadius: radius.circle },
    rowTitle: {
      fontSize: font.size.lg,
      fontWeight: font.weight.semibold,
      flex: 1,
      color: color.textStrong,
      letterSpacing: -0.1,
    },
    rowBody: { flexDirection: 'row', gap: spacing.md },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: color.surfaceNeutral,
    },
    rowBodyText: { flex: 1, gap: spacing.tight },
    rowDesc: { fontSize: font.size.base, color: color.text, lineHeight: 19 },
    rowDescMuted: {
      fontSize: font.size.base,
      color: color.textSubtle,
      fontStyle: 'italic',
    },
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
    sortRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingBottom: spacing.sm + 2,
      // Same wrap allowance as statusFilterRow below — "Severity" clipped at
      // ≤360pt + large type without it (sweep M9).
      flexWrap: 'wrap',
    },
    sortChip: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.xs + 1,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A11Y-229 (M-52 grammar): small white chip labels — ctaFill, 5.24 both
    // themes (dark brand is 3.42, large-text-only). Light is byte-identical.
    sortChipActive: { backgroundColor: color.ctaFill },
    sortChipText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.text,
    },
    sortChipTextActive: { color: color.textOnBrand },
    statusFilterRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingBottom: spacing.sm,
      flexWrap: 'wrap',
    },
    statusFilterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusFilterChipAllActive: { backgroundColor: color.ctaFill },
    statusFilterText: {
      fontSize: font.size.xs,
      fontWeight: font.weight.bold,
      color: color.text,
    },
    statusFilterTextActive: { color: color.textOnBrand },
    viewOnMapBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewOnMapBtnPressed: { opacity: 0.6, backgroundColor: color.borderPressed },
    viewOnMapGlyph: { fontSize: font.size.lg },
  });
