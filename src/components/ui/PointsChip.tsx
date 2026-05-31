/**
 * PointsChip — Civic Gold gamification badge.
 *
 * Reserved EXCLUSIVELY for points, streaks, rewards, and badges.
 * Never use gold for status — it loses meaning if it appears elsewhere.
 *
 * Design system 2026-05-31: Civic Gold #FBB024, always dark ink text.
 */

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, font, spacing } from '@/theme';

interface PointsChipProps {
  /** Points value — typically a number like "+5" or "120". */
  value: string | number;
  /** Optional label rendered after the value ("pts", "points", etc.). */
  label?: string;
  /** 'gold' (default) for gamification. 'blue' for informational point hints. */
  tone?: 'gold' | 'blue';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function PointsChip({ value, label, tone = 'gold', size = 'md', style }: PointsChipProps) {
  const color = useColor();

  const toneColors = {
    gold: { bg: color.goldLight, fg: color.goldDark },
    blue: { bg: color.brandSofter, fg: color.brandText },
  }[tone];

  const textSize = size === 'sm' ? font.size.xs : font.size.sm;
  const paddingH = size === 'sm' ? spacing.sm : spacing.md;
  const paddingV = size === 'sm' ? 2 : spacing.tight;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: toneColors.bg,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
        style,
      ]}
      accessible
      accessibilityLabel={label ? `${value} ${label}` : `${value} points`}
    >
      <Text style={[styles.value, { fontSize: textSize, color: toneColors.fg }]}>
        {value}
      </Text>
      {label ? (
        <Text style={[styles.label, { fontSize: textSize, color: toneColors.fg }]}>
          {' '}{label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  value: {
    fontWeight: font.weight.bold,
  },
  label: {
    fontWeight: font.weight.medium,
  },
});
