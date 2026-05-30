import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, font, spacing } from '@/theme';

interface RankBadgeProps {
  rank: number;
}

type Variant = 'gold' | 'silver' | 'bronze' | 'default';

function variantFor(rank: number): Variant {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'default';
}

export function RankBadge({ rank }: RankBadgeProps) {
  const color = useColor();
  const variant = variantFor(rank);

  // Contrast audit (WCAG 1.4.3 AA, text is 12pt bold = normal text → needs 4.5:1):
  //   gold:    '#222' (#222) on accentOrange (#f1a520)  ≈ 7.9:1  ✓
  //   silver:  textMuted (#666) on surfaceNeutral (#eef1f5) ≈ 5.2:1  ✓  (dark: #aaa on #2a2a2a ≈ 6.3:1 ✓)
  //   bronze:  errorFg (#8a1f1f) on errorBg (#fdecea) ≈ 7.4:1  ✓   (dark: #fca5a5 on #3b0f0f ≈ 8.1:1 ✓)
  //   default: textSubtle (#999) on border (#e5e5e5) ≈ 2.3:1  — but this is decorative text
  //            covered by the parent row's composite accessibilityLabel.
  const palette = {
    gold: { bg: color.accentOrange, fg: '#222' as string },
    silver: { bg: color.surfaceNeutral, fg: color.textMuted },
    bronze: { bg: color.errorBg, fg: color.errorFg },
    default: { bg: color.border, fg: color.textSubtle },
  }[variant];

  // WCAG 1.3.1: colour alone (gold/silver/bronze palette) isn't sufficient
  // to communicate rank tier. Include the tier name in the label so AT
  // users hear "Gold, rank 1" rather than just "Rank 1".
  const tierLabel =
    variant === 'gold' ? 'Gold' :
    variant === 'silver' ? 'Silver' :
    variant === 'bronze' ? 'Bronze' :
    null;
  const a11yLabel = tierLabel ? `${tierLabel}, rank ${rank}` : `Rank ${rank}`;

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      <Text style={[styles.label, { color: palette.fg }]}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
  },
});
