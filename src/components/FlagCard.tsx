/**
 * FlagCard — shared list-row component for flag items.
 *
 * Renders the tappable card used in modal list views: category title,
 * severity dot, StatusBadge, optional description, severity+date meta,
 * and an optional photo thumbnail. Extracts the inline pattern that is
 * duplicated across MyReportsModal, ActivityFeedModal, and MyWatchedModal.
 *
 * Props:
 *   flag        — the FlagRow to display.
 *   onPress     — called when the card is tapped.
 *   compact     — when true, collapses the description to 1 line and hides
 *                 the photo thumb. Useful for dense lists. Defaults to false.
 *   showDate    — whether to show the created_at date in the meta line.
 *                 Defaults to true.
 *   style       — optional extra style applied to the outer Pressable.
 *
 * Design notes:
 *   - Uses StatusBadge (Dana's component) for visual + a11y consistency.
 *   - All color comes from useColor() / theme tokens — dark-mode ready.
 *   - The severity dot is a11y-hidden; severity is also communicated via
 *     the meta text ("Severity N") and the accessibilityLabel.
 */

import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, size, spacing } from '@/theme';
import { CATEGORY_LABELS, severityColor, STATUS_LABELS } from '@/lib/flags';
import type { FlagRow } from '@/types/database';
import { StatusBadge } from './StatusBadge';

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

interface FlagCardProps {
  flag: FlagRow;
  onPress?: () => void;
  /** Collapse description to 1 line and hide the photo thumb. Default: false. */
  compact?: boolean;
  /** Show the created_at date in the meta line. Default: true. */
  showDate?: boolean;
  style?: StyleProp<ViewStyle>;
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export const FlagCard = memo(function FlagCard({
  flag,
  onPress,
  compact = false,
  showDate = true,
  style,
}: FlagCardProps) {
  const color = useColor();
  const styles = makeStyles(color);

  const dateLabel = showDate
    ? new Date(flag.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const metaParts: string[] = [`Severity ${flag.severity}`];
  if (dateLabel) metaParts.push(dateLabel);

  const a11yLabel =
    `${CATEGORY_LABELS[flag.category]}, severity ${flag.severity} of 5, ` +
    `status ${STATUS_LABELS[flag.status]}` +
    (dateLabel ? `, reported ${dateLabel}` : '') +
    (flag.description ? `. ${flag.description}` : '');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens the full report"
    >
      {/* Header row: severity dot + category title + StatusBadge */}
      <View style={styles.header}>
        <View
          style={[styles.sevDot, { backgroundColor: severityColor(flag.severity) }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.category} numberOfLines={1}>
          {CATEGORY_LABELS[flag.category]}
        </Text>
        <StatusBadge status={flag.status} size="sm" />
      </View>

      {/* Body row: optional thumbnail + description + meta */}
      <View style={styles.body}>
        {!compact && flag.photo_url ? (
          <Image
            source={{ uri: flag.photo_url }}
            style={styles.thumb}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
        <View style={styles.bodyText}>
          {flag.description ? (
            <Text style={styles.description} numberOfLines={compact ? 1 : 2}>
              {flag.description}
            </Text>
          ) : (
            <Text style={styles.descriptionMuted}>No description.</Text>
          )}
          <Text style={styles.meta}>{metaParts.join(' • ')}</Text>
        </View>
      </View>
    </Pressable>
  );
});

// -------------------------------------------------------------------------
// Styles
// -------------------------------------------------------------------------

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      ...shadow.e1,
      marginBottom: spacing.sm,
    },
    cardPressed: {
      backgroundColor: color.surfaceMuted,
      opacity: 0.85,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sevDot: {
      width: 10,
      height: 10,
      borderRadius: radius.circle,
      flexShrink: 0,
    },
    category: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    body: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    thumb: {
      width: size.thumb,
      height: size.thumb,
      borderRadius: radius.md,
      flexShrink: 0,
    },
    bodyText: {
      flex: 1,
      gap: spacing.tight,
    },
    description: {
      fontSize: font.size.sm,
      color: color.text,
      lineHeight: font.lineHeight.base,
    },
    descriptionMuted: {
      fontSize: font.size.sm,
      color: color.textMuted,
      fontStyle: 'italic',
    },
    meta: {
      fontSize: font.size.xs,
      color: color.textMuted,
    },
  });
