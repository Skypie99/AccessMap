/**
 * StatusBadge — shared status pill component.
 *
 * Renders the tinted-background + darker-foreground pill used on every screen
 * that shows a flag's status (open / verified / resolved / rejected).
 *
 * Color source: STATUS_COLORS from @/lib/flags, which is now synced with
 * the design-system status tokens in src/theme.ts.
 * Dot indicator added per design system 2026-05-31.
 *
 * Props:
 *   status     — the FlagStatus value to display.
 *   size       — 'sm' (compact) | 'md' (default).
 *   showLabel  — whether to render the text label. Defaults to true.
 *   showDot    — whether to show the colored dot before the label. Defaults to true.
 *   style      — optional extra View style applied to the outer badge container.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './ui/AppText';
import { radius, font, spacing } from '../theme';
import { useColor, type ColorTheme } from '../theme/ThemeContext';
import { STATUS_LABELS } from '../lib/flags';
import type { FlagStatus } from '../types/database';

// Status pill colors come from the themed status tokens (light + dark) rather
// than the static STATUS_COLORS map, so badges adapt on dark surfaces.
function statusPalette(c: ColorTheme, status: FlagStatus): { bg: string; fg: string } {
  switch (status) {
    case 'open':
      return { bg: c.statusOpenBg, fg: c.statusOpenFg };
    case 'verified':
      return { bg: c.statusVerifiedBg, fg: c.statusVerifiedFg };
    case 'resolved':
      return { bg: c.statusResolvedBg, fg: c.statusResolvedFg };
    case 'rejected':
      return { bg: c.statusRejectedBg, fg: c.statusRejectedFg };
  }
}

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

interface StatusBadgeProps {
  status: FlagStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  /** Show the colored dot before the label. Defaults to true. */
  showDot?: boolean;
  /** Override the default accessibilityLabel. Default: "Flag status: {Status}". */
  accessibilityLabel?: string;
  style?: object;
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function StatusBadge({ status, size = 'md', showLabel = true, showDot = true, accessibilityLabel, style }: StatusBadgeProps) {
  const color = useColor();
  const palette = statusPalette(color, status);
  const a11yLabel = accessibilityLabel ?? `Flag status: ${STATUS_LABELS[status]}`;
  const dotSize = size === 'sm' ? 5 : 6;

  return (
    <View
      style={[styles.badge, size === 'sm' ? styles.badgeSm : styles.badgeMd, { backgroundColor: palette.bg }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      {showDot && (
        <View style={[styles.dot, { width: dotSize, height: dotSize, backgroundColor: palette.fg }]} />
      )}
      {showLabel && (
        <AppText variant="label" style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd, { color: palette.fg }]}>
          {STATUS_LABELS[status]}
        </AppText>
      )}
    </View>
  );
}

// -------------------------------------------------------------------------
// Styles
// -------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.circle,
  },
  badgeMd: {
    paddingHorizontal: spacing.sm + 2, // 10px
    paddingVertical: spacing.tight,    // 4px
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,     // 8px
    paddingVertical: 2,
  },
  dot: {
    borderRadius: radius.circle,
  },
  label: {
    fontWeight: font.weight.bold,
  },
  labelMd: {
    fontSize: font.size.caption, // 11px
  },
  labelSm: {
    fontSize: font.size.caption, // 11 — was 10, below the legible floor
  },
});
