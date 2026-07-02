import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { AppText } from '@/components/ui/AppText';
import { font, radius, shadow, spacing } from '@/theme';
import { useReducedMotion } from '@/lib/accessibility';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { X } from 'lucide-react-native';
import { FEEDBACK_CATEGORY_GLYPHS, FEEDBACK_CATEGORY_LABELS } from '@/lib/feedback';
import { listFeedbackByUser } from '@/lib/feedbackStore';
import {
  FEEDBACK_CATEGORY_FILTERS,
  FEEDBACK_CATEGORY_FILTER_LABELS,
  filterFeedback,
  filterFeedbackByQuery,
  type FeedbackCategoryFilter,
} from '@/lib/feedbackFilter';
import SearchInputRow from '@/components/SearchInputRow';
import type { FeedbackRow } from '@/types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  // Bumping this triggers a refetch — Profile uses it after the user
  // sends new feedback so the list reflects the new row immediately.
  refreshKey?: number;
}

/**
 * "My Feedback" — a read-only history of feedback messages the user has
 * sent. Backed by the public.feedback table from
 * supabase/migrations/2026-05-23_feedback_table.sql.
 *
 * Gracefully degrades when:
 *  - The user is signed out → shows nothing (the row that opens this
 *    modal is gated on user being present anyway).
 *  - The migration hasn't been applied yet → listFeedbackByUser catches
 *    the "relation does not exist" error and returns []. The user sees
 *    the empty state, not an alarming error.
 */
export default function MyFeedbackModal({ visible, onClose, refreshKey = 0 }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const { user } = useAuth();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  // Category filter for the chip row. Per-modal-open state — resets to
  // 'all' every time the modal closes so reopens always show everything.
  const [filter, setFilter] = useState<FeedbackCategoryFilter>('all');
  // Free-text query for body search. Resets to '' on close so reopens
  // always start with an unfiltered list (same discipline as the category
  // filter above).
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
    if (mountedRef.current) setLoading(true);
    const data = await listFeedbackByUser(user.id);
    if (!mountedRef.current) return;
    setRows(data);
    setLoading(false);
  }, [user]);

  // Refetch on open and whenever the parent bumps refreshKey.
  useEffect(() => {
    if (visible) load();
  }, [visible, refreshKey, load]);

  // Reset the filter and search query on close so the next open starts
  // clean. (We do it on close, not on open, so values are correct before
  // the first frame of the next render.)
  useEffect(() => {
    if (!visible) {
      setFilter('all');
      setSearchQuery('');
    }
  }, [visible]);

  // The list the FlatList renders — category filter first, then text
  // query. Two-stage pipeline mirrors MyReportsModal. Memoized so
  // FlatList doesn't think the data array changed on every render.
  const filteredRows = useMemo(
    () => filterFeedbackByQuery(filterFeedback(rows, filter), searchQuery),
    [rows, filter, searchQuery],
  );
  // WCAG 2.3.3: snap (no slide) when the user prefers reduced motion.
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={onClose}
    >
      {/* accessibilityViewIsModal — VoiceOver treats everything behind
          this view as inert while the modal is up. Same pattern as
          HelpModal; see that file for the longer comment. Alex P5. */}
      <View style={styles.backdrop} accessibilityViewIsModal testID="myFeedbackModal-backdrop">
        <View style={[styles.card, { paddingBottom: Math.max(spacing.sm, insets.bottom) }]}>
          <View style={styles.headerRow}>
            <AppText variant="heading" style={styles.title} accessibilityRole="header">
              My Feedback
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close my feedback"
            >
              <X size={18} color={color.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Free-text search — only shown when there's more than one row
              to filter (matching MyReportsModal's guard). Searches the
              feedback body text; works in combination with the category
              chips below (category applied first, then query). */}
          {rows.length > 1 && (
            <SearchInputRow
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search your feedback…"
              accessibilityLabel="Search your feedback"
              accessibilityHint="Filters your feedback list to entries whose text contains your search words"
            />
          )}

          {/* Category filter chips — only shown when there's more than
              one row to filter (otherwise the chips are noise). Style
              mirrors the NearbyFlagsModal chip row so the two feel like
              the same control. */}
          {rows.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipBarScroll}
              contentContainerStyle={styles.chipBar}
              accessibilityLabel="Filter feedback by category"
            >
              {FEEDBACK_CATEGORY_FILTERS.map((opt) => {
                const isActive = filter === opt;
                const label = FEEDBACK_CATEGORY_FILTER_LABELS[opt];
                // Active chip shows the count for clarity ("Bug (3)");
                // inactive chips stay clean ("Bug") to reduce visual noise.
                const activeCount = isActive ? filteredRows.length : null;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setFilter(opt)}
                    style={[styles.chip, isActive && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Filter to ${label}`}
                  >
                    <AppText variant="label" style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {activeCount !== null ? `${label} (${activeCount})` : label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <FlatList
            data={filteredRows}
            keyExtractor={(r) => r.id}
            accessibilityRole="list"
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            contentContainerStyle={
              filteredRows.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            renderItem={({ item }) => <FeedbackRowCard row={item} />}
            ListEmptyComponent={
              <View style={styles.emptyCard} accessible accessibilityRole="text">
                {loading ? (
                  <ActivityIndicator />
                ) : rows.length > 0 ? (
                  // Have feedback, but the active filter hides all of it.
                  <>
                    <AppText variant="body" style={styles.emptyIcon} accessibilityElementsHidden>
                      🔍
                    </AppText>
                    <AppText variant="heading" style={styles.emptyTitle}>
                      No {FEEDBACK_CATEGORY_FILTER_LABELS[filter].toLowerCase()} feedback
                    </AppText>
                    <AppText variant="body" style={styles.emptyBody}>
                      Tap &quot;All&quot; above to see every message you&apos;ve sent.
                    </AppText>
                  </>
                ) : (
                  <>
                    <AppText variant="body" style={styles.emptyIcon} accessibilityElementsHidden>
                      💬
                    </AppText>
                    <AppText variant="heading" style={styles.emptyTitle}>No feedback yet</AppText>
                    <AppText variant="body" style={styles.emptyBody}>
                      Tap the &quot;Feedback&quot; button at the top of any screen to send your first message.
                      It lands here and in the maintainer&apos;s inbox.
                    </AppText>
                  </>
                )}
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function FeedbackRowCard({ row }: { row: FeedbackRow }) {
  const color = useColor();
  const styles = makeStyles(color);
  const formattedDate = new Date(row.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const categoryLabel = FEEDBACK_CATEGORY_LABELS[row.category];
  // Keep the row's body compact in the list — full text isn't needed for
  // a "did I send this?" scan, and very long bodies would push every
  // other row off the screen.
  const preview = row.body.length > 200 ? `${row.body.slice(0, 200).trim()}…` : row.body;

  return (
    <View
      style={styles.rowCard}
      accessible
      role="listitem"
      accessibilityLabel={`${categoryLabel} feedback sent ${formattedDate}: ${preview}`}
    >
      <View style={styles.rowHeader}>
        <View style={styles.categoryPill}>
          <AppText variant="body" style={styles.categoryGlyph} accessibilityElementsHidden>
            {FEEDBACK_CATEGORY_GLYPHS[row.category]}
          </AppText>
          <AppText variant="label" style={styles.categoryText}>{categoryLabel}</AppText>
        </View>
        <AppText variant="body" style={styles.dateText}>{formattedDate}</AppText>
      </View>
      <AppText variant="body" style={styles.bodyText}>{preview}</AppText>
    </View>
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
      backgroundColor: color.surfaceMuted,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      maxHeight: '90%',
      ...shadow.e3,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: font.size.lg,
      color: color.text,
      fontWeight: font.weight.bold,
    },
    // Chip row sits below the header and above the list. Layout mirrors
    // the NearbyFlagsModal chip bar so the two share a visual language —
    // same height, same pill radius, same active fill colour.
    // Pattern B: pin the strip's size so the sibling FlatList can't crush it.
    chipBarScroll: { flexGrow: 0, flexShrink: 0 },
    chipBar: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      // Touch-target floor — WCAG 2.5.5 wants ≥ 44pt. minHeight on the
      // Pressable + the padding above gets us there comfortably.
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: color.brand },
    chipText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.textMuted,
    },
    chipTextActive: { color: color.textOnBrand },
    listContainer: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    emptyContainer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.lg,
    },
    emptyCard: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      ...shadow.e1,
    },
    emptyIcon: { fontSize: 36 },
    emptyTitle: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    emptyBody: {
      fontSize: font.size.sm,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
    rowCard: {
      backgroundColor: color.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
      gap: spacing.sm,
      ...shadow.e1,
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    categoryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: color.brandSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.tight,
      borderRadius: radius.full,
    },
    categoryGlyph: { fontSize: font.size.sm },
    categoryText: {
      color: color.brandOnSoft,
      fontWeight: font.weight.bold,
      fontSize: font.size.xs,
    },
    dateText: {
      fontSize: font.size.xs,
      color: color.textMuted,
    },
    bodyText: {
      fontSize: font.size.sm,
      color: color.text,
      lineHeight: 19,
    },
  });
