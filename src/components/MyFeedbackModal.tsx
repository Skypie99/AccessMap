import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { color, font, radius, shadow, spacing } from '@/theme';
import {
  FEEDBACK_CATEGORY_GLYPHS,
  FEEDBACK_CATEGORY_LABELS,
} from '@/lib/feedback';
import { listFeedbackByUser } from '@/lib/feedbackStore';
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
export default function MyFeedbackModal({
  visible,
  onClose,
  refreshKey = 0,
}: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              My Feedback
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close my feedback"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={rows}
            keyExtractor={(r) => r.id}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={load} />
            }
            contentContainerStyle={
              rows.length === 0
                ? styles.emptyContainer
                : styles.listContainer
            }
            renderItem={({ item }) => <FeedbackRowCard row={item} />}
            ListEmptyComponent={
              <View style={styles.emptyCard} accessible accessibilityRole="text">
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <>
                    <Text
                      style={styles.emptyIcon}
                      accessibilityElementsHidden
                    >
                      💬
                    </Text>
                    <Text style={styles.emptyTitle}>No feedback yet</Text>
                    <Text style={styles.emptyBody}>
                      Tap the "Feedback" button at the top of any screen
                      to send your first message. It lands here and in
                      the maintainer's inbox.
                    </Text>
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
  const formattedDate = new Date(row.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const categoryLabel = FEEDBACK_CATEGORY_LABELS[row.category];
  // Keep the row's body compact in the list — full text isn't needed for
  // a "did I send this?" scan, and very long bodies would push every
  // other row off the screen.
  const preview =
    row.body.length > 200 ? `${row.body.slice(0, 200).trim()}…` : row.body;

  return (
    <View
      style={styles.rowCard}
      accessible
      accessibilityLabel={`${categoryLabel} feedback sent ${formattedDate}: ${preview}`}
    >
      <View style={styles.rowHeader}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryGlyph} accessibilityElementsHidden>
            {FEEDBACK_CATEGORY_GLYPHS[row.category]}
          </Text>
          <Text style={styles.categoryText}>{categoryLabel}</Text>
        </View>
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>
      <Text style={styles.bodyText}>{preview}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 32,
    height: 32,
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
