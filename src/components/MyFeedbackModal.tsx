import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { useAuth } from '@/lib/auth';
import { AppText } from '@/components/ui/AppText';
import { Sheet } from '@/components/ui/Sheet';
import { useAtTop } from '@/components/ui/SheetPull';
import { bulkGlassShadow, font, radius, shadow, spacing } from '@/theme';
import { a11yToggle, decorativeProps } from '@/lib/accessibility';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { MessageCircle, RefreshCw, Search } from 'lucide-react-native';
import { FEEDBACK_CATEGORY_LABELS } from '@/lib/feedback';
import { FEEDBACK_CATEGORY_ICONS } from '@/components/feedbackCategoryIcons';
import { listFeedbackByUser } from '@/lib/feedbackStore';
import { REPORT_BODY_PREFIX } from '@/lib/reports';
import {
  MY_FEEDBACK_LOADING_ANNOUNCEMENT,
  myFeedbackLoadedAnnouncement,
} from '@/lib/copy';
import {
  FEEDBACK_CATEGORY_FILTERS,
  FEEDBACK_CATEGORY_FILTER_LABELS,
  filterFeedback,
  filterFeedbackByQuery,
  type FeedbackCategoryFilter,
} from '@/lib/feedbackFilter';
import SearchInputRow from '@/components/SearchInputRow';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
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
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const scrollRef = useRef(null);
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
    // A3/D18 — `accessibilityLiveRegion` is ANDROID-ONLY in RN, so on iOS this
    // list fetched and filled itself in silence. iOS-only announce; firing both
    // where the region works is the double-announce S10 retired.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(MY_FEEDBACK_LOADING_ANNOUNCEMENT);
    }
    // HIGH-1 (13_B1_VERIFY_LEDGER §A, ruled in §SKY-6). A signed-in report is
    // inserted with `user_id`, so without this it lands here and the reporter is
    // shown `[REPORT] v2 target=comment id=9f3c… flag=22a1…` — internal encoding
    // plus the reported comment's uuid — as prose, and as the row's accessible
    // NAME. The PIPEDA export deliberately does NOT pass this; see
    // `listFeedbackByUser`'s docblock for why the two surfaces diverge.
    const data = await listFeedbackByUser(user.id, { excludeBodyPrefix: REPORT_BODY_PREFIX });
    if (!mountedRef.current) return;
    setRows(data);
    setLoading(false);
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(myFeedbackLoadedAnnouncement(data.length));
    }
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
  // Keyboard-up bottom-inset reclaim (Recipe F step 3).
  const keyboardVisible = useKeyboardVisible();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="My Feedback"
      closeLabel="Close my feedback"
      glass
      presentation="expanded"
      keyboardAvoiding
      pullEnabled={!keyboardVisible}
      minBottomPad={spacing.xl}
      atTop={atTop}
      scrollRef={scrollRef}
      testID="myFeedbackModal-backdrop"
      headerAccessory={
        <Pressable
          onPress={() => void load()}
          hitSlop={12}
          style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          accessibilityHint="Reloads your feedback without pulling down the list"
          {...a11yToggle({ busy: loading })}
        >
          <RefreshCw size={18} color={color.text} strokeWidth={2.2} {...decorativeProps} />
        </Pressable>
      }
    >
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
              // B4 — the chips already declare `accessibilityRole="radio"`, but
              // a radio with no radiogroup around it is a widget with no set:
              // a screen reader announces the state ("selected") and never the
              // membership ("2 of 5"). The container is what supplies that, and
              // it has to carry a NAME too — an unlabeled group is a landmark
              // announced as nothing (A11Y-218).
              accessibilityRole="radiogroup"
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
                    {...a11yToggle({ selected: isActive })}
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
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            keyboardShouldPersistTaps="handled"
            data={filteredRows}
            keyExtractor={(r) => r.id}
            accessibilityRole="list"
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={color.brand} colors={[color.brand]} />}
            contentContainerStyle={
              filteredRows.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            renderItem={({ item }) => <FeedbackRowCard row={item} />}
            ListEmptyComponent={
              // A3 — the Android half of the pair. This one node is the list's
              // loading state, its empty state and its no-matches state, so a
              // polite region here narrates every transition between them.
              <View
                style={styles.emptyCard}
                accessible
                accessibilityRole="text"
                accessibilityLiveRegion="polite"
              >
                {loading ? (
                  // A4 — a labelled spinner. Its live region is the emptyCard
                  // wrapper above, which is `accessible` and Android-only, so
                  // the iOS half is the explicit announce in `load()`.
                  <ActivityIndicator color={color.brandText} accessibilityLabel="Loading your feedback" />
                ) : rows.length > 0 ? (
                  // Have feedback, but the active filter hides all of it.
                  <>
                    <Search size={32} color={color.textSubtle} strokeWidth={2} {...decorativeProps} />
                    <AppText variant="heading" style={styles.emptyTitle}>
                      No {FEEDBACK_CATEGORY_FILTER_LABELS[filter].toLowerCase()} feedback
                    </AppText>
                    <AppText variant="body" style={styles.emptyBody}>
                      Tap &quot;All&quot; above to see every message you&apos;ve sent.
                    </AppText>
                  </>
                ) : (
                  <>
                    <MessageCircle size={32} color={color.textSubtle} strokeWidth={2} {...decorativeProps} />
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
    </Sheet>
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
  const Icon = FEEDBACK_CATEGORY_ICONS[row.category];
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
          <Icon size={16} color={color.brandOnSoft} strokeWidth={2.2} {...decorativeProps} />
          <AppText variant="label" style={styles.categoryText}>{categoryLabel}</AppText>
        </View>
        <AppText variant="body" style={styles.dateText} numberOfLines={1}>{formattedDate}</AppText>
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
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      maxHeight: '90%',
      // G6/SR-099: shrink into cardWrap's cap (see that block).
      flexShrink: 1,
      // The bulk variant owns the surface; overflow:hidden clips it to the
      // rounded top (the up-shadow moves to cardWrap — GlassSurface contract).
      overflow: 'hidden',
    },
    // Bulk-glass up-shadow on the outer wrapper (an overflow:hidden view clips
    // its own shadow). Mode tint identical to FeedbackModal/AboutScreen.
    // G6/SR-099 — THE CAP MOVED HERE from cardWrap when the KAV was added.
    // A percentage maxHeight resolves only against a parent with a *definite*
    // height. cardWrap used to be the backdrop's direct child, so its cap
    // resolved; the KAV now sits between them and is itself content-sized, so
    // leaving the cap on cardWrap would have silently made it inert. The KAV is
    // the backdrop's direct child now, so the cap belongs here. Same net
    // geometry as before, plus keyboard avoidance.
    kav: {
      width: '100%',
      maxHeight: '90%',
      flexShrink: 1,
    },
    cardWrap: {
      // Cap relocated to `kav` above; this just shrinks into it. Its list is a
      // FlatList whose length is user data, not fixed copy — so the cap matters.
      flexShrink: 1,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...bulkGlassShadow(color),
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
      // Pill + date must be able to yield or the date bleeds past the card
      // edge at ≤360pt + large type (sweep minor); full date is in the row's
      // a11y label, so visual truncation loses nothing for SR users.
      flexShrink: 1,
    },
    categoryText: {
      color: color.brandOnSoft,
      fontWeight: font.weight.bold,
      fontSize: font.size.xs,
    },
    dateText: {
      fontSize: font.size.xs,
      color: color.textMuted,
      flexShrink: 1,
      textAlign: 'right',
    },
    bodyText: {
      fontSize: font.size.sm,
      color: color.text,
      lineHeight: 19,
    },
  });
