import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  type Text,
  View,
} from 'react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { OverflowFade } from '@/components/ui/OverflowFade';
import { SheetGrabber } from '@/components/ui/Sheet';
import { useHorizontalOverflowFade } from '@/hooks/useHorizontalOverflowFade';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { MapPin, Search } from 'lucide-react-native';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { formatDistance, haversineKm, speakDistance, type LatLng } from '@/lib/distance';
import { searchFlags } from '@/lib/flagSearch';
import type { FlagCategory, FlagRow } from '@/types/database';
import SearchInputRow from '@/components/SearchInputRow';
import { FlagCard } from '@/components/ui/FlagCard';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  location: LatLng | null;
  flags: FlagRow[];
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
  /**
   * G5: fired when the surface has ACTUALLY left the screen (iOS onDismiss;
   * elsewhere the opener's `release()` stands in). The opener uses it to hand
   * the screen-reader cursor back to the control that opened this surface.
   * Optional — an opener with no trigger to return to passes nothing.
   */
  onDismiss?: () => void;
}

export default function NearbyFlagsModal({
  visible,
  location,
  flags,
  onClose,
  onSelectFlag,
  onDismiss,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // T14 (F2-07): the category tablist chips earn the overflow scent.
  const categoryFade = useHorizontalOverflowFade();
  const reducedMotion = useReducedMotion();
  // A11Y-202 (2.4.3): move the SR cursor onto the title when the sheet
  // presents. This surface EXISTS for screen-reader users — it even auto-opens
  // for them with no press (MapScreen's screenReaderOn effect) — yet only the
  // RETURN half of the focus contract (G5 onDismiss) was wired; on open the
  // cursor stayed stranded on the occluded control behind the sheet. The hook
  // covers both the manual open and the auto-open: both flip `visible`.
  const titleRef = useFocusOnOpen<Text>(visible);
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
    // S4/L3-8: only claim "nearby / sorted by distance" when a location actually
    // backs it. Without location the list is most-recent order (matching the
    // visible no-location notice) — the announcement must say so, not lie.
    const suffix = location != null ? ' nearby. Sorted by distance.' : '. Showing the most recent first.';
    const msg =
      count === 0
        ? 'No flags to show.'
        : count === 1
          ? `1 flag${suffix}`
          : `${count} flags${suffix}`;
    // Small delay so the Modal's open animation settles first; without it
    // the announcement races with the OS sheet-open utterance and both
    // can be cut off.
    const t = setTimeout(() => AccessibilityInfo.announceForAccessibility(msg), 600);
    return () => clearTimeout(t);
  }, [visible, flags.length, location]);

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
          // S3 (L6-05): under a screen reader this row now opens the focus-managed
          // detail sheet (see MapScreen onSelectFlag), not a silent map recenter.
          // The hint is only ever heard under SR, where the endpoint is always the
          // sheet — so an unconditional honest string is correct, and it keeps the
          // PROTECT-1 one-breath accessibilityLabel above untouched.
          accessibilityHint="Opens this flag's details"
        >
          {/* F1: the card is drawn by the shared component now, so this list,
              Home's rows and the Tasks queue are one object at three sizes. The
              order changes with it, and deliberately: the census used to sit
              BELOW the description, under the thumbnail, which put the sentence
              that says what the flag IS after the sentence a stranger wrote
              about it. It now rides under the title where the family puts it.

              Two things are held byte-for-byte across the move. The Pressable
              above keeps PROTECT-1's one-breath label and its endpoints — this
              card renders no accessible node of its own, so nothing fragments
              it. And the description stays uncapped at every size
              (`clampDescription={false}`): Phase 0 item 0.2 uncapped it because
              the accessible list is the map's equal (T4/D2), and the card
              density's own 3-line rule must not quietly put the clip back. */}
          <FlagCard
            flag={item}
            density="card"
            showDescription
            clampDescription={false}
            censusExtra={[relativeTime(item.created_at)]}
            trailing={
              dist ? (
                <AppText variant="monoBold" style={styles.distance}>{dist.text}</AppText>
              ) : undefined
            }
            media={
              item.photo_url ? (
                <RemoteImage uri={item.photo_url} style={styles.thumb} {...decorativeProps} />
              ) : undefined
            }
          />
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
      onDismiss={onDismiss}
      presentationStyle="pageSheet"
      // THE ONE PROP THAT MAKES THE GRABBER HONEST (map-gestures SPEC §2.2).
      // RN 0.81.5 sets modalInPresentation = YES on every Modal
      // (RCTModalHostView.m:38), which BLOCKS iOS's interactive sheet dismissal.
      // The blocked drag still reached us — presentationControllerDidAttemptTo-
      // Dismiss fires onRequestClose (RCTModalHostView.m:75-80) — so the sheet
      // rubber-banded, refused to follow the finger, and THEN closed. State-safe,
      // but it read as broken, under a grabber pill advertising a drag.
      //
      // This flips modalInPresentation to NO (RCTModalHostView.m:54-59), handing
      // the gesture to UIKit: real finger tracking, real threshold, real
      // spring-back on cancel. On completion RN calls onRequestClose (:82-87),
      // so `onClose` runs exactly as it does for the X — same handler, so the
      // focus-return contract (release/restore) is inherited untouched.
      // RN dev-asserts onRequestClose is present with this prop (Modal.js:204).
      // iOS-only; Android pageSheet is ~fullscreen and keeps hardware back.
      allowSwipeDismissal
      aria-label="Nearby flags"
    >
      {/* Bulk-glass fills the whole pageSheet edge-to-edge (Sky device pick D10);
          the SafeAreaView rides transparent on top so the PROTECT-1 list content
          — one-breath SR labels, tab chips, 44pt controls, reset-on-close — is
          byte-identical. Material only. */}
      <GlassSurface variant="bulk" borderRadius={0} style={styles.glassFill}>
      <SafeAreaView style={styles.screen} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        {/* G3 (§SKY-6): ABOVE styles.header, not inside it — Sky's Decision 2.
            `styles.header` paints opaque `color.surface`, which the arbiter
            measured at 8.83/8.90 and is the crisper of the two placements; this
            spot lands on BULK glass at 6.24/6.51 instead. Consistency won: this
            is the sheet's true top edge, where the platform puts a grabber and
            where Resources and HowToHelp now put theirs. 6.24 is not close to
            the 3.0 floor, so the cost of consistency here is nil. */}
        <SheetGrabber />
        <View style={styles.header}>
          <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">Nearby flags</AppText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
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
          <View style={styles.overflowFadeWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipBarScroll}
            contentContainerStyle={styles.chipBar}
            accessibilityLabel="Filter by category"
            accessibilityRole="tablist"
            {...categoryFade.scrollHandlers}
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
          <OverflowFade visible={categoryFade.hasMore} />
          </View>
        )}

        <FlatList
          // Recipe S (the FlagDetailModal A11Y-228 precedent): let the list
          // inset itself for the keyboard rather than wrapping in a KAV, which
          // would fight this surface's own layout. iOS-only prop; a no-op on
          // Android, which already resizes.
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          data={displayFlags}
          keyExtractor={(f) => f.id}
          renderItem={renderItem}
          removeClippedSubviews
          initialNumToRender={10}
          contentContainerStyle={displayFlags.length === 0 ? styles.emptyWrap : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              {searchQuery.trim().length > 0 ? (
                <Search size={32} color={color.inkGlassMuted} strokeWidth={2.2} {...decorativeProps} />
              ) : (
                <MapPin size={32} color={color.inkGlassMuted} strokeWidth={2.2} {...decorativeProps} />
              )}
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
      </GlassSurface>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Transparent — the GlassSurface behind it owns the sheet material.
    screen: { flex: 1, backgroundColor: 'transparent' },
    glassFill: { flex: 1 },
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
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
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
    // T1: the distance is a data numeral, so it takes JetBrains Mono with
    // TABULAR figures — a column of distances down the list stays a column
    // instead of shuffling sideways as 1s and 8s trade places. The face comes
    // from variant="monoBold" at the call site; asking for fontWeight on top of
    // it would only make iOS synthesise a weight the family already ships.
    distance: {
      fontSize: font.size.sm,
      color: color.brandText,
      fontVariant: ['tabular-nums'],
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: color.surfaceNeutral,
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
    // T14 (F2-07): position:relative wrapper so the absolute OverflowFade pins to
    // the tablist's right edge (required on web; harmless on native).
    overflowFadeWrap: { position: 'relative' },
    chip: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.xs + 1,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44, // WCAG 2.5.5: was 36pt (below 44pt project standard)
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A11Y-229 (M-52 grammar): ctaFill = mode-independent Wayfinder Blue.
    // color.brand is 3.42:1 with white in dark — legal only for large text;
    // these chip labels are small. ctaFill is 5.24 both themes (light is
    // byte-identical: light brand == ctaFill).
    chipActive: { backgroundColor: color.ctaFill },
    chipText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.text,
    },
    chipTextActive: { color: color.textOnBrand },
  });
