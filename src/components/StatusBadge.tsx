/**
 * StatusBadge — shared status pill component.
 *
 * Renders the tinted-background + darker-foreground pill used on every screen
 * that shows a flag's status (open / verified / resolved / rejected). Extracts
 * the inline pattern that was duplicated across FlagDetailModal, MyReportsModal,
 * ActivityFeedModal, and MyWatchedModal.
 *
 * Color source: STATUS_COLORS from @/lib/flags (same values as before — using
 * those constants keeps StatusBadge in sync with any future palette updates
 * to that file, and avoids re-deriving the same colors from theme tokens).
 *
 * Props:
 *   status     — the FlagStatus value to display.
 *   size       — 'sm' (11px label, compact padding) | 'md' (12px label, normal padding).
 *                Defaults to 'md', which matches the historical pill dimensions.
 *   showLabel  — whether to render the text label inside the pill. Defaults to true.
 *   style      — optional extra View style applied to the outer badge container.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, font, spacing } from '../theme';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/flags';
import type { FlagStatus } from '../types/database';

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

interface StatusBadgeProps {
  status: FlagStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  /** Override the default accessibilityLabel. Default: "Flag status: {Status}". */
  accessibilityLabel?: string;
  style?: object;
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function StatusBadge({ status, size = 'md', showLabel = true, accessibilityLabel, style }: StatusBadgeProps) {
  const palette = STATUS_COLORS[status];
  const a11yLabel = accessibilityLabel ?? `Flag status: ${STATUS_LABELS[status]}`;

  return (
    <View
      style={[styles.badge, size === 'sm' ? styles.badgeSm : styles.badgeMd, { backgroundColor: palette.bg }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      {showLabel && (
        <Text style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd, { color: palette.fg }]}>
          {STATUS_LABELS[status]}
        </Text>
      )}
    </View>
  );
}

// -------------------------------------------------------------------------
// Styles
// -------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // md — matches the historical FlagDetailModal / MyReportsModal / ActivityFeedModal pill
  badgeMd: {
    paddingHorizontal: spacing.sm + 2, // 10px — matches MyReportsModal / ActivityFeedModal
    paddingVertical: spacing.tight,    // 4px
  },
  // sm — compact variant for denser layouts (future use; saves callers from inline overrides)
  badgeSm: {
    paddingHorizontal: spacing.sm,     // 8px
    paddingVertical: 2,
  },
  label: {
    fontWeight: font.weight.bold,
  },
  labelMd: {
    fontSize: font.size.caption, // 11px — matches historical statusBadgeText across all screens
  },
  labelSm: {
    fontSize: 10,
  },
});
