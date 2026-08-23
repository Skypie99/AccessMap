/**
 * PrefsRow — ONE drawing of "a labelled preference with a switch".
 *
 * D3: `NotificationPrefsModal` and `NotificationPreferencesScreen` are twins.
 * They ask different questions of different data (which flag STATUSES surface
 * on your Profile, versus which NOTIFICATION kinds you receive), and that is a
 * real difference worth keeping — so both keep their own data hooks and their
 * own row lists.
 *
 * What was not a real difference was how the rows LOOKED. Two surfaces one tap
 * apart wore the same recipe at two sizes:
 *
 *              modal              screen
 *   radius     md (12)            lg (16)
 *   padding    md (12)            lg (16)
 *   height     56                 64
 *   title      base / 600         lg / bold
 *   subtitle   xs                 sm
 *   shadow     none               e1
 *
 * Nobody chose that; it is what two files drifting apart looks like. One row,
 * at §S6's `size.row` (64) and the family's `radius.xl`, settles it.
 *
 * ─── WHY THE ROW IS NOT `accessible` ──────────────────────────────────────
 * Do NOT add `accessible={true}` to the container. The row holds an
 * interactive <Switch>, and collapsing children under a parent label steals
 * focus from it and makes it unreachable to a screen reader (QA Pass-2 #4).
 * The Switch carries the full label + hint + state instead, and the two text
 * lines stay individually discoverable for a user who scans the row. Both
 * surfaces already did this correctly; it is written here so a future edit
 * cannot undo it in one place and leave the other right.
 */

import React from 'react';
import { Platform, StyleSheet, Switch, View, type ViewStyle } from 'react-native';
import { useColor, type ColorTheme } from '@/theme/ThemeContext';
import { a11yToggle } from '@/lib/accessibility';
import { androidSwitchThumbOff, font, radius, size, spacing } from '@/theme';
import { AppText } from './AppText';

export interface PrefsRowProps {
  title: string;
  /** The explanatory second line. Also the Switch's hint, so the spoken row
   *  says the same thing the visible one does. */
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  /** Optional leading element (the modal's StatusBadge). Rendered decorative
   *  by the CALLER — the Switch already speaks the whole row, so a badge that
   *  announced itself would repeat "Flag status: X" on every line. */
  leading?: React.ReactNode;
  /** Spoken label, when the visible title is not the sentence to say. */
  a11yLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export function PrefsRow({
  title,
  subtitle,
  value,
  onValueChange,
  leading,
  a11yLabel,
  style,
  testID,
}: PrefsRowProps) {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <View style={[styles.row, style]} testID={testID}>
      {leading}
      <View style={styles.text}>
        <AppText variant="label" size={font.size.base} color={color.textStrong} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="body" size={font.size.sm} color={color.textMuted}>
          {subtitle}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityRole="switch"
        accessibilityLabel={a11yLabel ?? title}
        accessibilityHint={subtitle}
        // Explicit state — RN's Switch usually reports its own value, but
        // pairing it with accessibilityState is the documented contract
        // (QA Pass-2 #5), and a11yToggle adds the web aria-* alias.
        {...a11yToggle({ checked: value })}
        // BP-6: the estate Switch recipe — brand track, themed false-track.
        trackColor={{ false: color.borderStrong, true: color.brand }}
        thumbColor={Platform.OS === 'android' ? (value ? color.brand : androidSwitchThumbOff) : undefined}
      />
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: color.surfaceMuted,
      // The family corner. C13's radius fix, at row scale.
      borderRadius: radius.xl,
      // S6: ONE list-row height. Both twins drew a two-line row; only one of
      // them was tall enough to hold it above the 44pt floor comfortably.
      minHeight: size.row,
    },
    text: { flex: 1, gap: 2 },
    title: { fontWeight: font.weight.semibold },
  });
