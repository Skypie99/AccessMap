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

export const RankBadge = React.memo(function RankBadge({ rank }: RankBadgeProps) {
  const color = useColor();
  const variant = variantFor(rank);

  const palette = {
    gold: { bg: color.accentOrange, fg: color.textOnAccent },
    silver: { bg: color.surfaceNeutral, fg: color.textMuted },
    bronze: { bg: color.errorBg, fg: color.errorFg },
    // textMuted (#666 on #e5e5e5 = 4.64:1) — passes AA; textSubtle (#999) fails at 2.2:1.
    default: { bg: color.border, fg: color.textMuted },
  }[variant];

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Rank ${rank}`}
    >
      <Text style={[styles.label, { color: palette.fg }]}>{rank}</Text>
    </View>
  );
});

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
