import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { a11yToggle, useReducedMotion } from '@/lib/accessibility';
import { CATEGORY_LABELS, CATEGORY_ORDER, severityColor } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { formatDistance, haversineKm, speakDistance, type LatLng } from '@/lib/distance';
import { searchFlags } from '@/lib/flagSearch';
import type { FlagCategory, FlagRow } from '@/types/database';
import SearchInputRow from '@/components/SearchInputRow';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  location: LatLng | null;
  flags: FlagRow[];
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
}

export default function NearbyFlagsModal({
  visible,
  location,
  flags,
  onClose,
  onSelectFlag,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  // null = show all categories; set to a FlagCategory to narrow the list.
  const [filterCat, setFilterCat] = useState<FlagCategory | null>(null);
  // Free-text search across description / category label / status label.
  // Empty = pass-through. Applied after the category filter so the chip
  // counts still reflect category totals (not search-narrowed counts).
  const [searchQuery, setSearchQuery] = useState('');

  // Reset filter + search whenever the modal closes — re-opening shows
  // a clean list. Without this, the previous filter sticks around
  // invisibly until the user thinks to clear it. QA Pass-1 #4.
  useEffect(() => {
    if (!visible) {
      setFilterCat(null);
      setSearchQuery('');
    }
  }, [visible]);

  // Announce the list size to screen readers when the modal opens so
  // VoiceOver users immediately know how much content awaits without
  // having to swipe through every item to find the end.
  useEffect(() => {
    if (!visible) return;
    const count = flags.length;
    const msg =
      count === 0
        ? 'No flags to show.'
        : count === 1
          ? '1 flag nearby. Sorted by distance.'
          : `${count} flags nearby. Sorted by distance.`;
    // Small delay so the Modal's open animation settles first; without it
    // the announcement races with the OS sheet-open utterance and both
    // can be cut off.
    const t = setTimeout(() => AccessibilityInfo.announceForAccessibility(msg), 600);
    return () => clearTimeout(t);
  }, [visible, flags.length]);

  // Sort by distance ascending when we have a location; otherwise keep the
  // existing order (which is most-recent-first from listFlags).
  const sortedFlags = useMemo(() => {
    if (!location) return flags;
    return [...flags]
      .map((f) => ({
        f,
        d: haversineKm(location, { lat: f.lat, lng: f.lng }),
      }))
      .sort((a, b) => a.d - b.d)
      .map(({ f }) => f);
  }, [flags, location]);

  // Categories that actually appear in this list (preserves CATEGORY_ORDER
  // ordering rather than insertion order).
  const presentCategories = useMemo<FlagCategory[]>(() => {
    const seen = new Set(flags.map((f) => f.category));
    return CATEGORY_ORDER.filter((c) => seen.has(c));
  }, [flags]);

  // Apply the active category filter on top of the distance-sorted list.
  const categoryFiltered = useMemo(() => {
    if (filterCat === null) return sortedFlags;
    return sortedFlags.filter((f) => f.category === filterCat);
  }, [sortedFlags, filterCat]);

  // Apply the search query on top of the category-filtered list. Pure
  // function — no extra fetch.
  const displayFlags = useMemo(
    () => searchFlags(categoryFiltered, searchQuery),
    [categoryFiltered, searchQuery],
  );

  // Pre-compute distance strings once per item so renderItem never runs
  // haversine inline (Peter Wave 6: expensive computation in render path).
  const distanceMap = useMemo(() => {
    if (!location) return new Map<string, { text: string; speak: string }>();
    const m = new Map<string, { text: string; speak: string }>();
    for (const f of displayFlags) {
      const d = haversineKm(location, { lat: f.lat, lng: f.lng });
      m.set(f.id, { text: formatDistance(d), speak: speakDistance(d) });
    }
    return m;
  }, [location, displayFlags]);

  const renderItem = useCallback(
    ({ item }: { item: FlagRow }) => {
      const dist = distanceMap.get(item.id);
      const a11yLabel =
        `${CATEGORY_LABELS[item.category]}, severity ${item.severity}` +
        (dist ? `, ${dist.speak}` : '') +
        `. Status ${item.status}.` +
        (item.description ? ` ${item.description}` : '');
      return (
        <Pressable
          onPress={() => onSelectFlag(item)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint="Closes the list and centers the map on this flag"
        >
          <View style={styles.cardHeader}>
            <View
              style={[styles.sevDot, { backgroundColor: severityColor(item.severity) }]}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              <AppText variant="label" style={styles.sevDotText}>{item.severity}</AppText>
            </View>
            <AppText variant="label" style={styles.cardTitle}>
              {CATEGORY_LABELS[item.category]}
            </AppText>
            {dist && <AppText variant="label" style={styles.distance}>{dist.text}</AppText>}
          </View>
          <View style={styles.cardBody}>
            {item.photo_url ? (
              <RemoteImage
                uri={item.photo_url}
                style={styles.thumb}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            ) : null}
            <View style={styles.cardBodyText}>
              {item.description ? (
                <AppText variant="body" style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </AppText>
              ) : null}
              <AppText variant="body" style={styles.cardMeta} maxFontSizeMultiplier={1.4}>
                Severity {item.severity} · {item.status} · {relativeTime(item.created_at)}
              </AppText>
            </View>
          </View>
        </Pressable>
      );
    },
    [distanceMap, onSelectFlag],
  );

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      aria-label="Nearby flags"
    >
      <SafeAreaView style={styles.screen} accessibilityViewIsModal>
        <View style={styles.header}>
          <AppText variant="heading" style={styles.title} accessibilityRole="header">Nearby flags</AppText>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close nearby flags list"
            hitSlop={10}
          >
            <AppText variant="label" style={styles.closeText}>Close</AppText>
          </Pressable>
        </View>

        {!location && (
          <View style={styles.notice}>
            <AppText variant="body" style={styles.noticeText}>
              Allow location access to sort flags by distance. Showing the most recent first.
            </AppText>
          </View>
        )}

        {/* Search bar — shown only when the list has at least two flags
            (one-flag lists don't benefit from search). Pure client-side
            filter via searchFlags(). Extracted to SearchInputRow. */}
        {flags.length >= 2 && (
          <SearchInputRow
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search descriptions, categories, status…"
            accessibilityLabel="Search flags"
          />
        )}

        {/* Category filter chips — only shown when the list has flags in
            more than one category, so there's something to filter. */}
        {presentCategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipBarScroll}
            contentContainerStyle={styles.chipBar}
            accessibilityLabel="Filter by category"
            accessibilityRole="tablist"
          >
            {/* "All" chip */}
            <Pressable
              onPress={() => setFilterCat(null)}
              style={[styles.chip, filterCat === null && styles.chipActive]}
              accessibilityRole="tab"
              accessibilityLabel="Show all categories"
              {...a11yToggle({ selected: filterCat === null })}
            >
              <AppText variant="label" style={[styles.chipText, filterCat === null && styles.chipTextActive]}>
                All ({flags.length})
              </AppText>
            </Pressable>
            {presentCategories.map((cat) => {
              const active = filterCat === cat;
              const count = flags.filter((f) => f.category === cat).length;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFilterCat(active ? null : cat)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="tab"
                  accessibilityLabel={`Filter by ${CATEGORY_LABELS[cat]}, ${count} ${count === 1 ? 'flag' : 'flags'}`}
                  {...a11yToggle({ selected: active })}
                >
                  <AppText variant="label" style={[styles.chipText, active && styles.chipTextActive]}>
                    {CATEGORY_LABELS[cat]} ({count})
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <FlatList
          data={displayFlags}
          keyExtractor={(f) => f.id}
          renderItem={renderItem}
          removeClippedSubviews
          initialNumToRender={10}
          contentContainerStyle={displayFlags.length === 0 ? styles.emptyWrap : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <AppText variant="heading" style={styles.emptyTitle}>
                {searchQuery.trim().length > 0
                  ? 'No matches'
                  : filterCat !== null
                    ? 'No matching flags'
                    : 'No flags to show'}
              </AppText>
              <AppText variant="body" style={styles.emptySub}>
                {searchQuery.trim().length > 0
                  ? `No flags match "${searchQuery.trim()}". Try a shorter or different query.`
                  : filterCat !== null
                    ? `No ${CATEGORY_LABELS[filterCat]} flags in this area. Try a different category.`
                    : "When community members report accessibility issues, they'll appear here sorted by distance."}
              </AppText>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: color.surfaceMuted },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: color.surface,
      borderBottomWidth: 1,
      borderBottomColor: color.borderSubtle,
    },
    title: {
      flex: 1,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: -0.2,
    },
    closeBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      color: color.text,
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
    notice: {
      backgroundColor: color.warningBg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: color.borderSubtle,
    },
    noticeText: {
      fontSize: font.size.sm,
      color: color.warningFg,
      lineHeight: 18,
    },
    list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    emptyWrap: { flexGrow: 1 },
    emptyInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxxl,
      gap: spacing.sm,
    },
    emptyTitle: {
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    emptySub: {
      fontSize: font.size.sm,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 320,
    },
    card: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      marginBottom: spacing.md,
      ...shadow.e1,
      minHeight: 44,
    },
    cardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
      backgroundColor: color.surfaceSoft,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sevDot: {
      width: 32,
      height: 32,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sevDotText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
    },
    cardTitle: {
      fontSize: font.size.lg,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
      flex: 1,
      letterSpacing: -0.1,
    },
    distance: {
      fontSize: font.size.sm,
      color: color.brandText,
      fontWeight: font.weight.bold,
    },
    cardBody: { flexDirection: 'row', gap: spacing.md },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: color.surfaceNeutral,
    },
    cardBodyText: { flex: 1, gap: spacing.tight, justifyContent: 'center' },
    cardDesc: {
      fontSize: font.size.base,
      color: color.text,
      lineHeight: 19,
    },
    cardMeta: {
      fontSize: font.size.xs,
      color: color.textMuted,
      lineHeight: 16,
    },
    // Pattern B: the outer `style` pins the bar's size AND paints the surface +
    // hairline so they span the full ScrollView width (not just the chips'
    // content width, which left the bar visually stopping mid-screen).
    chipBarScroll: {
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: color.surface,
      borderBottomWidth: 1,
      borderBottomColor: color.borderSubtle,
    },
    chipBar: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md - 2,
    },
    chip: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.xs + 1,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44, // WCAG 2.5.5: was 36pt (below 44pt project standard)
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: color.brand },
    chipText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.text,
    },
    chipTextActive: { color: color.textOnBrand },
  });
