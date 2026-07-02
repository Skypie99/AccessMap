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
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/lib/accessibility';
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
  X,
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
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: color.surfaceMuted,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      maxHeight: '85%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    titleWrap: { flex: 1, gap: 2 },
    title: {
      fontSize: font.size.xxl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: -0.3,
    },
    subtitle: { fontSize: font.size.sm, color: color.textMuted },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: font.size.xl,
      color: color.text,
      fontWeight: font.weight.bold,
      lineHeight: font.size.xl + 2,
    },
    scroll: { paddingBottom: spacing.md, gap: spacing.lg },
    section: { gap: spacing.sm },
    sectionHeader: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
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
    icon: { fontSize: font.size.xxl - 2 },
    iconDimmed: { opacity: 0.55 },
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
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const reducedMotion = useReducedMotion();
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
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <AppText variant="heading" style={styles.title} accessibilityRole="header">
                Achievements
              </AppText>
              <AppText
                variant="body"
                style={styles.subtitle}
                accessibilityLabel={`${totalEarned} of ${achievements.length} achievements earned`}
              >
                {totalEarned} of {achievements.length} earned
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close achievements"
            >
              <X
                size={18}
                color={color.text}
                strokeWidth={2.2}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {grouped.map(({ cat, items }) => (
              <View key={cat} style={styles.section}>
                <AppText variant="heading" style={styles.sectionHeader}>{CATEGORY_LABEL[cat]}</AppText>
                <View style={styles.list}>
                  {items.map((a) => (
                    <AchievementRow key={a.id} achievement={a} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
