/**
 * ScreenHeader — the editorial header shared across screens (overhaul Phase 7b).
 *
 * The clean-editorial pattern Sky picked: a small all-caps eyebrow, a big
 * confident display title, an optional subtitle, and an optional slot of
 * right-aligned controls on the title row (menu / Feedback on Home, etc.).
 *
 * Lifted verbatim from HomeScreen's inline header so the look is identical;
 * Profile / Leaderboard / future screens consume it for one consistent type
 * rhythm. Presentation only — no data, no app logic.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { font, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

// All-caps micro-label tracking for the eyebrow + section labels.
export const EYEBROW_TRACKING = 1.2;

interface ScreenHeaderProps {
  /** Big display title. */
  title: string;
  /** Small all-caps eyebrow above the title. */
  eyebrow?: string;
  /** One-line subtitle below the title. */
  subtitle?: string;
  /** Right-aligned controls on the title row (e.g. menu / Feedback buttons). */
  actions?: React.ReactNode;
  /** Display title size. Default 34. */
  titleSize?: number;
  /** Override/extend the outer container style (e.g. padding tweaks). */
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  titleSize = 34,
  style,
}: ScreenHeaderProps) {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <View style={[styles.header, style]}>
      {eyebrow ? (
        <AppText variant="label" style={styles.eyebrow}>
          {eyebrow}
        </AppText>
      ) : null}
      <View style={styles.titleRow}>
        <AppText variant="display" size={titleSize} style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {subtitle ? (
        <AppText variant="body" style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
    eyebrow: {
      fontSize: font.size.xs,
      letterSpacing: EYEBROW_TRACKING,
      color: color.textSubtle,
      fontWeight: font.weight.semibold,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { flex: 1, color: color.textStrong, marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    subtitle: { fontSize: font.size.md, color: color.textMuted, marginTop: 3 },
  });
