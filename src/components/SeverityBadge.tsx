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
        // SW-36: the digit above is `variant="label"` (capped at 1.6) and this
        // word was `bodyMedium` (deliberately UNCAPPED in AppText, because body
        // copy must always scale). One pill, two scaling rules — so at
        // accessibility-extra-large the word rendered ~47% larger than its own
        // digit and the pill grew without bound, eating the row width the card
        // title needed. Capping per call site rather than switching to
        // `variant="label"`: the label variant would force the 600SemiBold face
        // while styles.label still declares weight 500, changing how the pill
        // LOOKS to fix how it SCALES. SeverityDisc already takes a per-site cap
        // for this same reason; this badge was the family member that never got
        // one. This is the amplifier, not the root cause — see cardTitle.
        <AppText
          variant="bodyMedium"
          maxFontSizeMultiplier={1.6}
          style={[styles.label, { fontSize: textSize, color: textColor }]}
        >
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
