/**
 * AchievementsModal — full catalog of achievements with earned + unearned
 * states. Earned badges render in full color; unearned ones are dimmed
 * with a "X / N" progress chip so the user can see how close they are.
 *
 * Pure presentation: the parent passes the computed Achievement[] list
 * (from `computeAchievements(stats)`) so the modal never re-runs
 * derivation on its own. That keeps the heavy lifting in Profile, which
 * already has the data.
 */
import React, { useMemo , useRef} from 'react';
import { StyleSheet, View } from 'react-native';
// RNGH ScrollView, not react-native's — its ref exposes .handlerTag, which
// SheetPull's simultaneousHandlers={scrollRef} needs to coexist with
// pull-to-dismiss on native. Full mechanism: LegendModal.tsx.
import { ScrollView } from 'react-native-gesture-handler';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sheet } from '@/components/ui/Sheet';
import { TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { useAtTop } from '@/components/ui/SheetPull';
import type { Achievement, AchievementCategory } from '@/lib/achievements';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import {
  Award,
  CircleCheck,
  Flame,
  FolderOpen,
  Footprints,
  Gem,
  Landmark,
  PartyPopper,
  PenLine,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react-native';

// Achievement icon name (from achievements.ts) → Lucide component.
type IconCmp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const ACH_ICON: Record<string, IconCmp> = {
  footprints: Footprints,
  'pen-line': PenLine,
  'folder-open': FolderOpen,
  'circle-check': CircleCheck,
  trophy: Trophy,
  landmark: Landmark,
  'party-popper': PartyPopper,
  star: Star,
  sparkles: Sparkles,
  gem: Gem,
  flame: Flame,
};

interface Props {
  visible: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  reporting: 'Reporting',
  resolution: 'Resolution',
  points: 'Points',
  streak: 'Streak',
};

const CATEGORY_ORDER: AchievementCategory[] = ['reporting', 'resolution', 'points', 'streak'];

// Defined before both components so AchievementRow can call it without a hoisting issue.
const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    body: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
    scroll: { paddingBottom: spacing.md, gap: spacing.lg },
    section: { gap: spacing.sm },
    sectionHeader: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
    },
    list: { gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.md,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      minHeight: 56,
    },
    rowDimmed: { opacity: 0.7 },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleEarned: { backgroundColor: color.achievementEarnedBg }, // earned-state amber wash — token carries a dark-mode variant (#3D2A00)
    iconCircleLocked: { backgroundColor: color.surfaceNeutral },
    rowText: { flex: 1, gap: 2 },
    rowTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    rowDesc: {
      fontSize: font.size.sm,
      color: color.textMuted,
      lineHeight: 18,
    },
    statePill: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
      borderRadius: radius.circle,
      minWidth: 64,
      alignItems: 'center',
    },
    statePillEarned: { backgroundColor: color.statusResolvedBg },
    statePillLocked: { backgroundColor: color.surfaceNeutral },
    stateText: { fontSize: font.size.caption, fontWeight: font.weight.bold },
    stateTextEarned: { color: color.statusResolvedFg },
    stateTextLocked: { color: color.text },
  });

export default function AchievementsModal({ visible, onClose, achievements }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // The pull gesture must not fight the body's own scroll: `useAtTop`
  // disables it whenever the content is scrolled away from its top, so a
  // downward drag scrolls back up instead of dismissing (SheetPull's `atTop`).
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const scrollRef = useRef(null);
  // Group by category preserving catalog order within each group.
  const grouped = useMemo(() => {
    const map = new Map<AchievementCategory, Achievement[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const a of achievements) {
      map.get(a.category)?.push(a);
    }
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: map.get(cat) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [achievements]);

  const totalEarned = achievements.filter((a) => a.earned).length;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Achievements"
      subtitle={`${totalEarned} of ${achievements.length} earned`}
      subtitleLabel={`${totalEarned} of ${achievements.length} achievements earned`}
      subtitleMaxFontSizeMultiplier={TYPE_BLOCK.header}
      closeLabel="Close achievements"
      glass
      engineered
      padded
      presentation="expanded"
      minBottomPad={spacing.xl}
      atTop={atTop}
      scrollRef={scrollRef}
      testID="achievementsModal-backdrop"
    >
      <ScrollView style={styles.body} contentContainerStyle={styles.scroll}
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}>
        {/* W5 — the empty state this sheet never had. `grouped` filters out
            every empty category, so a catalog that arrives empty (or a
            future build with achievements gated off) rendered a titled
            sheet with nothing under it and no explanation. Every sibling
            list in the estate answers that case; this one just went blank.
            PLACEHOLDER COPY (SKY-WORDS-REQUIRED). */}
        {grouped.length === 0 ? (
          <EmptyState
            title="No badges to show yet"
            body="Report, verify and resolve barriers to start earning them."
          />
        ) : (
          grouped.map(({ cat, items }) => (
            <View key={cat} style={styles.section}>
              <AppText variant="heading" style={styles.sectionHeader}>{CATEGORY_LABEL[cat]}</AppText>
              <View style={styles.list}>
                {items.map((a) => (
                  <AchievementRow key={a.id} achievement={a} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}

function AchievementRow({ achievement: a }: { achievement: Achievement }) {
  const color = useColor();
  const styles = makeStyles(color);
  const stateText = a.earned ? "Earned" : `${a.progress} of ${a.threshold}`;
  const a11yLabel =
    `${a.title}, ${a.description} ` +
    (a.earned ? "Earned." : `Progress: ${a.progress} of ${a.threshold}.`);

  return (
    <View
      style={[styles.row, !a.earned && styles.rowDimmed]}
      accessible={true}
      accessibilityLabel={a11yLabel}
    >
      <View
        style={[styles.iconCircle, a.earned ? styles.iconCircleEarned : styles.iconCircleLocked]}
      >
        {(() => {
          const Icon = ACH_ICON[a.icon] ?? Award;
          return (
            <Icon size={22} color={a.earned ? color.goldDark : color.textSubtle} strokeWidth={2.2} />
          );
        })()}
      </View>
      <View style={styles.rowText}>
        <AppText variant="label" style={styles.rowTitle}>{a.title}</AppText>
        <AppText variant="body" style={styles.rowDesc}>{a.description}</AppText>
      </View>
      <View style={[styles.statePill, a.earned ? styles.statePillEarned : styles.statePillLocked]}>
        <AppText
          variant="label"
          style={[styles.stateText, a.earned ? styles.stateTextEarned : styles.stateTextLocked]}
        >
          {stateText}
        </AppText>
      </View>
    </View>
  );
}
