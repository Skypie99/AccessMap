/**
 * SeverityBadge — design-system severity pill.
 *
 * Renders the severity level (1–5) as a colored pill with a label.
 * Color source: severity ramp from @/theme — yellow (1) → red (5).
 *
 * WCAG 1.4.1: color is never the only signal — the number is always shown
 * alongside the colored pill. Severity 1 uses dark ink text because yellow
 * fails contrast with white.
 *
 * Design system 2026-05-31.
 */

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { severity, font, spacing, radius } from '@/theme';
import type { FlagSeverity } from '@/types/database';

interface SeverityBadgeProps {
  level: FlagSeverity;
  /** Show the label ("Minor", "Moderate", etc.) alongside the number. */
  showLabel?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function SeverityBadge({ level, showLabel = false, size = 'md', style }: SeverityBadgeProps) {
  const sev = severity[level];
  const textColor = sev.textOnColor;

  const paddingH = size === 'sm' ? spacing.sm : spacing.md;
  const paddingV = size === 'sm' ? 2 : spacing.tight;
  // sm stays compact via padding, but the text holds the legible floor (11, was
  // 10) — matches StatusBadge sm so the two header badges read at the same size.
  const textSize = font.size.caption;

  const a11yLabel = showLabel
    ? `Severity ${level}: ${sev.label}`
    : `Severity ${level}, ${sev.label}`;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: sev.color,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      <AppText variant="label" style={[styles.number, { fontSize: textSize, color: textColor }]}>
        {level}
      </AppText>
      {showLabel && (
        <AppText variant="bodyMedium" style={[styles.label, { fontSize: textSize, color: textColor }]}>
          {' · '}{sev.label}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  number: {
    fontWeight: font.weight.bold,
  },
  label: {
    fontWeight: font.weight.medium,
  },
});
