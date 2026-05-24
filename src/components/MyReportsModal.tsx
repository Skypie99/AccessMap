import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  listFlagsByUser,
  severityColor,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/lib/flags';
import type { FlagRow, FlagStatus } from '@/types/database';

const STATUS_FILTER_ORDER: FlagStatus[] = [
  'open',
  'verified',
  'resolved',
  'rejected',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  // Bumping this value triggers a refetch — Profile uses it after a flag
  // is changed or deleted in FlagDetailModal so the list stays in sync.
  refreshKey?: number;
}

export default function MyReportsModal({
  visible,
  onClose,
  onSelectFlag,
  refreshKey = 0,
}: Props) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Sort options: newest (default, matches server order), oldest, or highest
  // severity first. Applied client-side so no extra fetch is needed.
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');
  // 'all' = no status filter; otherwise restrict to that status only.
  const [statusFilter, setStatusFilter] = useState<FlagStatus | 'all'>('all');

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
  const displayFlags = useMemo(() => {
    if (statusFilter === 'all') return sortedFlags;
    return sortedFlags.filter((f) => f.status === statusFilter);
  }, [sortedFlags, statusFilter]);

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
    const statusPalette = STATUS_COLORS[item.status];
    const dateLabel = new Date(item.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const a11yLabel =
      `${CATEGORY_LABELS[item.category]}, severity ${item.severity} of 5, ` +
      `status ${STATUS_LABELS[item.status]}, reported ${dateLabel}` +
      (item.description ? `. Note: ${item.description}` : '');

    return (
      <Pressable
        onPress={() => onSelectFlag(item)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Opens the full report with options to verify, resolve, reject, or delete"
      >
        <View style={styles.rowHeader}>
          <View
            style={[
              styles.sevDot,
              { backgroundColor: severityColor(item.severity) },
            ]}
            // Severity is also surfaced as a number + text in the badges
            // below; this dot is purely visual reinforcement.
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.rowTitle} numberOfLines={1}>
            {CATEGORY_LABELS[item.category]}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusPalette.bg }]}
          >
            <Text style={[styles.statusBadgeText, { color: statusPalette.fg }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
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
            ) : (
              <Text style={styles.rowDescMuted}>No description.</Text>
            )}
            <Text style={styles.rowMeta}>
              Severity {item.severity} • {dateLabel}
            </Text>
          </View>
        </View>
      </Pressable>
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
        <View
          style={styles.card}
          accessibilityViewIsModal
        >
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              My Reports
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close My Reports"
              accessibilityHint="Returns to your Profile"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

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
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                      {labels[opt]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Status filter chips — only shown when the list contains more
              than one distinct status. The chips use STATUS_COLORS for the
              active state, so each status tints with its palette color. */}
          {presentStatuses.length > 1 && (
            <View
              style={styles.statusFilterRow}
              accessibilityLabel="Filter by status"
            >
              <Pressable
                onPress={() => setStatusFilter('all')}
                style={[
                  styles.statusFilterChip,
                  statusFilter === 'all' && styles.statusFilterChipAllActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Show all statuses"
                accessibilityState={{ selected: statusFilter === 'all' }}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    statusFilter === 'all' && styles.statusFilterTextActive,
                  ]}
                >
                  All ({flags.length})
                </Text>
              </Pressable>
              {presentStatuses.map((status) => {
                const active = statusFilter === status;
                const palette = STATUS_COLORS[status];
                return (
                  <Pressable
                    key={status}
                    onPress={() =>
                      setStatusFilter(active ? 'all' : status)
                    }
                    style={[
                      styles.statusFilterChip,
                      active && { backgroundColor: palette.fg },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Show only ${STATUS_LABELS[status]} reports, ${statusCounts[status]} ${statusCounts[status] === 1 ? 'item' : 'items'}`
                    }
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.statusFilterText,
                        active && styles.statusFilterTextActive,
                      ]}
                    >
                      {STATUS_LABELS[status]} ({statusCounts[status]})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {loadError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                onPress={load}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading your reports"
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {loading && flags.length === 0 && !loadError ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.subtitle}>Loading your reports…</Text>
            </View>
          ) : (
            <FlatList
              data={displayFlags}
              keyExtractor={(f) => f.id}
              renderItem={renderItem}
              contentContainerStyle={
                displayFlags.length === 0 ? styles.center : styles.list
              }
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={load} />
              }
              accessibilityLabel={
                displayFlags.length === 0
                  ? 'Your reports list, empty'
                  : `Your reports list, showing ${displayFlags.length} of ${flags.length} ${flags.length === 1 ? 'report' : 'reports'}`
              }
              ListEmptyComponent={
                loadError ? null : flags.length > 0 && statusFilter !== 'all' ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>
                      No {STATUS_LABELS[statusFilter as FlagStatus].toLowerCase()} reports
                    </Text>
                    <Text style={styles.emptyBody}>
                      You don't have any reports in this status. Tap "All" to
                      see everything.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>No reports yet</Text>
                    <Text style={styles.emptyBody}>
                      You haven't reported any accessibility flags. Tap the
                      Map tab and use the Report button to drop your first
                      pin.
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
    height: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1, color: '#222' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: '#333', fontWeight: '700' },
  errorBanner: {
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: { color: '#8a1f1f', flex: 1, fontSize: 13 },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#c0392b',
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
  list: { paddingTop: 4, paddingBottom: 12, gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#eef1f5',
    minHeight: 44,
  },
  rowPressed: { opacity: 0.85, backgroundColor: '#f7f9fc' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sevDot: { width: 12, height: 12, borderRadius: 6 },
  rowTitle: { fontSize: 16, fontWeight: '600', flex: 1, color: '#222' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: { fontWeight: '700', fontSize: 11 },
  rowBody: { flexDirection: 'row', gap: 12 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
  },
  rowBodyText: { flex: 1, gap: 4 },
  rowDesc: { fontSize: 14, color: '#222' },
  rowDescMuted: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  rowMeta: { fontSize: 12, color: '#666' },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  emptyBody: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: '#2f80ed' },
  sortChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  sortChipTextActive: { color: '#fff' },
  // Status filter chip row — sits beneath the sort chips and uses the
  // STATUS_COLORS foreground tint as the active background so each status
  // tints with its palette.
  statusFilterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusFilterChipAllActive: { backgroundColor: '#2f80ed' },
  statusFilterText: { fontSize: 12, fontWeight: '700', color: '#555' },
  statusFilterTextActive: { color: '#fff' },
});
