/**
 * RecentlyViewedRow — horizontal scrolling chip row of the user's most
 * recently opened flags. Lives on the Profile screen near the breakdown
 * card; tapping a chip jumps the Map to that flag with the callout open
 * (same in-app navigation Tasks→Map already uses).
 *
 * Storage: src/lib/recentlyViewed.ts (per-user, capped at 10).
 * Fetch:   src/lib/flags.ts → fetchFlagsByIds (single round-trip).
 *
 * If a remembered id no longer resolves (flag was deleted) the fetch
 * silently returns fewer rows — the chip for that id simply doesn't
 * render. We don't bother proactively cleaning the storage list here;
 * the dropFromRecent helper exists for when a delete happens in-session
 * (a future wiring task — propose-only, not in this slice).
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { CATEGORY_LABELS, fetchFlagsByIds, severityColor } from '@/lib/flags';
import { loadRecentlyViewed } from '@/lib/recentlyViewed';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import type { FlagRow } from '@/types/database';

interface Props {
  userId: string | null;
  /**
   * Bumped externally on Profile focus so the row re-reads after the
   * user opened a flag elsewhere in the app between focuses.
   */
  refreshKey?: number;
  /**
   * Called when a chip is tapped. Parent navigates Map → focus that
   * flag (same shape Tasks→Map uses). Receives the full FlagRow so the
   * parent can pass lat/lng directly into `focusFlag` without an extra
   * lookup.
   */
  onSelect: (flag: FlagRow) => void;
}

export default function RecentlyViewedRow({ userId, refreshKey, onSelect }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setFlags([]);
      setLoaded(true);
      return;
    }
    (async () => {
      const ids = await loadRecentlyViewed(userId);
      if (cancelled) return;
      if (ids.length === 0) {
        setFlags([]);
        setLoaded(true);
        return;
      }
      try {
        const fetched = await fetchFlagsByIds(ids);
        if (cancelled) return;
        // fetchFlagsByIds returns in DB order, but the user expects
        // most-recent-first (the order they tapped them). Re-sort to
        // match the storage order. Missing ids (deleted flags) silently
        // drop out.
        const order = new Map(ids.map((id, i) => [id, i] as const));
        const sorted = [...fetched].sort(
          (a, b) =>
            (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        );
        setFlags(sorted);
      } catch {
        // Best-effort: the row degrades to empty. Profile already has its
        // own error surface for the bigger fetches; adding a second one
        // here would be noise.
        if (cancelled) return;
        setFlags([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  // Hide the row entirely when there's nothing to show. (Avoids a
  // visually-empty card. The "no recents yet" state is implicit — the
  // user hasn't opened any flag detail; the breakdown card already
  // tells them what to do.)
  if (!loaded || flags.length === 0) return null;

  return (
    <View
      style={styles.card}
      accessible={false}
      // We don't put a single accessibilityLabel on the wrapper —
      // each chip is its own button and a screen-reader user is
      // better served walking them individually than hearing a
      // megaphone summary.
    >
      <AppText variant="heading" style={styles.title} accessibilityRole="header">
        Recently viewed
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {flags.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => onSelect(f)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            // Compose: category + severity + truncated description.
            // Severity is read as a NUMBER (not the color) since color
            // alone is never a sufficient accessibility cue.
            accessibilityLabel={
              `${CATEGORY_LABELS[f.category]}, severity ${f.severity}` +
              (f.description ? `. ${f.description.slice(0, 80)}` : '')
            }
            accessibilityHint="Opens this flag on the Map"
          >
            {/* Severity dot — decorative; the numeric severity is in
                the label above so screen readers skip this safely. */}
            <View
              style={[styles.sevDot, { backgroundColor: severityColor(f.severity) }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <AppText variant="label" style={styles.sevDotText}>{f.severity}</AppText>
            </View>
            <AppText variant="label" style={styles.chipLabel} numberOfLines={1}>
              {CATEGORY_LABELS[f.category]}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      ...shadow.e1,
    },
    title: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingRight: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: color.surfaceMuted,
      minHeight: 44,
      maxWidth: 200,
    },
    chipPressed: { opacity: 0.85 },
    sevDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sevDotText: {
      color: color.textOnBrand,
      fontSize: 12,
      fontWeight: font.weight.bold,
    },
    chipLabel: {
      color: color.textStrong,
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      flexShrink: 1,
    },
  });
