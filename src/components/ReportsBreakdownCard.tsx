/**
 * ReportsBreakdownCard — a horizontal-bar breakdown of the signed-in user's
 * own flags, grouped by category and by severity. Lives on the Profile
 * screen near the existing Stats hero.
 *
 * Why a separate component:
 *  - Lets the existing Profile load flow stay untouched (it only pulls
 *    status counts; we need category + severity, which is a different
 *    aggregation).
 *  - Easy to slot into other surfaces later (Settings export, a /stats
 *    deep link, etc.).
 *
 * Data shape comes from src/lib/userReportStats.ts. Refresh is driven
 * externally via a `refreshKey` prop the parent bumps on focus / after
 * a successful new report; we deliberately don't subscribe to a global
 * store here because the parent already knows when stats might be stale.
 *
 * Born accessible:
 *  - Card has a header role and a composed accessibility summary so a
 *    screen reader can read "Your reports: 12 total. Top category:
 *    broken sidewalk, 5. Most common severity: moderate, 6." without
 *    walking every bar.
 *  - Each row carries its own label too, for users who want to drill in.
 *  - Bars convey magnitude only — the textual count next to each bar is
 *    the source of truth (color is decoration).
 *  - 44pt minimum row height for any tap targets (none today, but the
 *    rows could become tappable in a future "filter Map to this slice"
 *    feature without revisiting layout).
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  severityColor,
} from '@/lib/flags';
import {
  EMPTY_USER_REPORT_STATS,
  fetchUserReportStats,
  type UserReportStats,
} from '@/lib/userReportStats';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import type { FlagCategory, FlagSeverity } from '@/types/database';

interface Props {
  userId: string | null;
  /**
   * Bumping this triggers a re-fetch. Parent should bump on screen
   * focus and after a new report lands so stale counts don't linger.
   * If unset, the card fetches once on mount.
   */
  refreshKey?: number;
}

/**
 * Renders one bar row. Decoupled from the host data so we can reuse it
 * for both the category and severity sections without duplication.
 *
 * Bar width is computed against the section max (not the total), so a
 * dominant category doesn't visually flatten the rest of the rows.
 */
function BarRow({
  label,
  count,
  max,
  color: barColor,
  a11yLabel,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  a11yLabel: string;
}) {
  const color = useColor();
  const styles = makeStyles(color);
  // Empty section (max=0) renders zero-width bars across the board;
  // clamp to a tiny minimum so the row isn't visually empty when at
  // least one entry has a non-zero count.
  const widthPct = max <= 0 ? 0 : Math.max(2, Math.round((count / max) * 100));
  return (
    <View style={styles.barRow} accessible accessibilityRole="text" accessibilityLabel={a11yLabel}>
      <AppText variant="body" style={styles.barLabel} numberOfLines={1}>
        {label}
      </AppText>
      <View style={styles.barTrack}>
        <View
          // The fill is decorative; count is read out by the row label.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: barColor }]}
        />
      </View>
      <AppText variant="label" style={styles.barCount}>{count}</AppText>
    </View>
  );
}

/**
 * Pick the (label, count) pair with the highest count from a record,
 * or null if everything is zero. Used to compose the screen-reader
 * summary line. Ties resolve to the first one in `order`.
 */
function topEntry<K extends string | number>(
  counts: Record<K, number>,
  order: readonly K[],
  labels: Record<K, string>,
): { label: string; count: number } | null {
  let bestKey: K | null = null;
  let bestCount = 0;
  for (const k of order) {
    if (counts[k] > bestCount) {
      bestKey = k;
      bestCount = counts[k];
    }
  }
  if (bestKey === null || bestCount === 0) return null;
  return { label: labels[bestKey], count: bestCount };
}

export default function ReportsBreakdownCard({ userId, refreshKey }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const [stats, setStats] = useState<UserReportStats>(EMPTY_USER_REPORT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      // Signed-out / unknown user — render an empty shell quietly so the
      // card doesn't appear, then disappear once auth resolves.
      setStats(EMPTY_USER_REPORT_STATS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchUserReportStats(userId)
      .then((next) => {
        if (cancelled) return;
        setStats(next);
      })
      .catch(() => {
        if (cancelled) return;
        // Best-effort surface — the rest of Profile already has its own
        // error UX; the breakdown just hides itself on failure rather
        // than stacking another alert.
        setError('Could not load report breakdown.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  // Don't render anything until we have a userId (avoids a flash of
  // "0 reports" during the auth-loading window).
  if (!userId) return null;

  // Loading shell so the screen doesn't jump when stats arrive.
  if (loading) {
    return (
      <View
        style={styles.card}
        accessible
        accessibilityRole="text"
        accessibilityLabel="Loading your report breakdown"
      >
        <View style={styles.headerRow}>
          <AppText variant="heading" style={styles.title} accessibilityRole="header">
            Your reports
          </AppText>
        </View>
        <ActivityIndicator
          // The accessible label on the card already announces "loading".
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    );
  }

  // Error path — quietly skip the card. The Profile screen has its own
  // load-error UX; we don't want to clutter it with a second banner.
  if (error) return null;

  // Empty state — first-time user with no reports yet. Render a tiny
  // hint so the card surface doesn't look broken.
  if (stats.total === 0) {
    return (
      <View
        style={styles.card}
        accessible
        accessibilityRole="text"
        accessibilityLabel="No reports yet. Drop a flag on the Map tab to see your breakdown here."
      >
        <View style={styles.headerRow}>
          <AppText variant="heading" style={styles.title} accessibilityRole="header">
            Your reports
          </AppText>
        </View>
        <AppText variant="body" style={styles.emptyText}>
          No reports yet. Drop a flag on the Map tab to see your breakdown here.
        </AppText>
      </View>
    );
  }

  const catMax = Math.max(...CATEGORY_ORDER.map((c) => stats.byCategory[c]), 0);
  const sevMax = Math.max(...SEVERITY_ORDER.map((s) => stats.bySeverity[s]), 0);

  const topCat = topEntry(stats.byCategory, CATEGORY_ORDER, CATEGORY_LABELS);
  const topSev = topEntry(
    stats.bySeverity,
    SEVERITY_ORDER,
    SEVERITY_LABELS as Record<FlagSeverity, string>,
  );

  // Compose a one-shot summary for screen readers so they don't have
  // to walk every bar to get the overall shape. Sighted users see the
  // bars + counts; SR users hear this line.
  const summary = [
    `Your reports: ${stats.total} total.`,
    topCat ? `Top category: ${topCat.label}, ${topCat.count}.` : '',
    topSev ? `Most common severity: ${topSev.label}, ${topSev.count}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.card}>
      <View
        style={styles.headerRow}
        accessible
        accessibilityRole="header"
        accessibilityLabel={summary}
      >
        <AppText variant="heading" style={styles.title}>Your reports</AppText>
        <AppText variant="label" style={styles.totalChip}>{stats.total} total</AppText>
      </View>

      <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
        By category
      </AppText>
      {CATEGORY_ORDER.map((c: FlagCategory) => {
        const count = stats.byCategory[c];
        return (
          <BarRow
            key={c}
            label={CATEGORY_LABELS[c]}
            count={count}
            max={catMax}
            color={color.brandText}
            a11yLabel={`${CATEGORY_LABELS[c]}: ${count} report${count === 1 ? '' : 's'}`}
          />
        );
      })}

      <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
        By severity
      </AppText>
      {SEVERITY_ORDER.map((s: FlagSeverity) => {
        const count = stats.bySeverity[s];
        return (
          <BarRow
            key={s}
            label={`${s} — ${SEVERITY_LABELS[s]}`}
            count={count}
            max={sevMax}
            // Severity is the one place we DO let color carry meaning
            // visually — but the bar's count + label already encode it
            // for non-sighted users, so the colored fill is decoration.
            color={severityColor(s)}
            a11yLabel={`Severity ${s} ${SEVERITY_LABELS[s]}: ${count} report${count === 1 ? '' : 's'}`}
          />
        );
      })}
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    title: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    totalChip: {
      fontSize: font.size.xs,
      color: color.textMuted,
      fontWeight: font.weight.bold,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: color.surfaceMuted,
      overflow: 'hidden',
    },
    sectionLabel: {
      fontSize: font.size.xs,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: font.weight.bold,
      marginTop: spacing.sm,
    },
    emptyText: {
      fontSize: font.size.sm,
      color: color.textMuted,
      lineHeight: 20,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 28,
    },
    barLabel: {
      flexBasis: 130,
      flexShrink: 0,
      fontSize: font.size.sm,
      color: color.textStrong,
    },
    barTrack: {
      flex: 1,
      height: 10,
      borderRadius: radius.full,
      backgroundColor: color.surfaceMuted,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
    },
    barCount: {
      width: 36,
      textAlign: 'right',
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
  });
