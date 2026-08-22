/**
 * Input — design-system text-field primitive.
 *
 * Wraps TextInput with themed states (default / focus / error / disabled), an
 * optional label, helper text, error text, a left icon, and a right slot.
 * Always ≥ 44pt tall (WCAG 2.5.5). Supports Dynamic Type (capped) and surfaces
 * the error via a polite live region + accessibilityHint.
 *
 * Replaces the bespoke inline TextInputs across SignIn, ReportFlag, Profile
 * (display name), and Tasks (search). Matches the Button/Card primitive pattern:
 * useColor() at render, inline StyleSheet at the bottom.
 *
 * `onDark` (2026-08-22) — for the fixed-dark covers that paint their own
 * background (the sign-in wall). The themed palette is wrong there by
 * construction: in LIGHT mode `surfaceSoft` + `text` would draw a white field
 * with dark ink on a navy gradient. The flag swaps the four colour choices for
 * `fixedDark` (theme.ts), which holds the exact arbitrated literals SignIn
 * shipped by hand, so an adopting screen renders byte-identically. Everything
 * else — the 44pt floor, the focus ring, the polite error live region, the
 * error-as-hint wiring — is the primitive's and stops being re-implemented.
 *
 * Design system 2026-06-01.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { a11y, fixedDark, font, radius, spacing } from '@/theme';
import { a11yToggle } from '@/lib/accessibility';
import { AppText } from './AppText';

/** Lucide-style icon component (size / color / strokeWidth). */
type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Visible label rendered above the field. */
  label?: string;
  /** Helper text below the field (hidden when `errorText` is set). */
  helperText?: string;
  /** Error text below the field; also flips the field into the error state. */
  errorText?: string;
  /** Lucide icon component shown on the left (decorative). */
  leftIcon?: IconComponent;
  /** Arbitrary node on the right (e.g. a clear button or password toggle). */
  rightSlot?: React.ReactNode;
  disabled?: boolean;
  /**
   * Draw for a fixed-dark cover (the sign-in wall) instead of the themed
   * palette. See the file header: this is not "dark mode", it is "this surface
   * has one appearance in both modes".
   */
  onDark?: boolean;
  /** Outer wrapper style override. */
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  helperText,
  errorText,
  leftIcon: LeftIcon,
  rightSlot,
  disabled = false,
  onDark = false,
  containerStyle,
  accessibilityLabel,
  accessibilityHint,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const color = useColor();
  const [focused, setFocused] = useState(false);
  const hasError = !!errorText;

  // One place decides every ink, so the on-dark fork cannot drift field by
  // field the way the hand-rolled twin did.
  const ink = onDark
    ? {
        label: fixedDark.label,
        text: fixedDark.fieldText,
        placeholder: fixedDark.fieldPlaceholder,
        // Disabled keeps the same fill on a cover: the wrapper's opacity 0.6
        // already reads as inert there, and a second dark-on-dark neutral would
        // be a new ink nobody arbitrated.
        fill: fixedDark.fieldBg,
        fillFocused: fixedDark.fieldFocusBg,
        border: fixedDark.fieldBorder,
        borderFocused: fixedDark.fieldFocusBorder,
        borderError: color.errorOnDark,
        error: color.errorOnDark,
        helper: fixedDark.label,
      }
    : {
        label: color.text,
        text: disabled ? color.textMuted : color.text,
        placeholder: color.placeholderText,
        fill: disabled ? color.surfaceNeutral : color.surfaceSoft,
        fillFocused: disabled ? color.surfaceNeutral : color.surfaceSoft,
        border: disabled ? color.borderSubtle : color.border,
        borderFocused: color.brand,
        borderError: color.error,
        error: color.error,
        helper: color.textMuted,
      };

  const borderColor = hasError
    ? ink.borderError
    : focused
      ? ink.borderFocused
      : ink.border;
  const borderWidth = focused || hasError ? 2 : 1;
  // Compensate horizontal padding for the 1→2px border so text doesn't shift.
  const compensate = borderWidth - 1;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="label" size={font.size.sm} color={ink.label} style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.row,
          {
            borderColor,
            borderWidth,
            paddingHorizontal: spacing.md - compensate,
            backgroundColor: focused ? ink.fillFocused : ink.fill,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {LeftIcon ? (
          <LeftIcon size={18} color={focused ? ink.borderFocused : ink.helper} strokeWidth={2} />
        ) : null}

        <TextInput
          editable={!disabled}
          style={[styles.input, { color: ink.text }]}
          placeholderTextColor={ink.placeholder}
          maxFontSizeMultiplier={1.5}
          accessible
          accessibilityLabel={accessibilityLabel ?? label}
          {...a11yToggle({ disabled })}
          accessibilityHint={hasError ? errorText : accessibilityHint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {rightSlot ?? null}
      </View>

      {hasError ? (
        <View accessibilityLiveRegion="polite">
          <AppText variant="body" size={font.size.xs} color={ink.error} style={styles.subtext}>
            {errorText}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="body" size={font.size.xs} color={ink.helper} style={styles.subtext}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.tight },
  label: { marginBottom: spacing.tight },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    gap: spacing.sm,
    minHeight: a11y.minTargetSize,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: font.size.lg,
    paddingVertical: spacing.sm + 2,
    fontFamily: font.family.body,
    // SW-40. The 44 above is on the WRAPPER, but the accessibility element is
    // this TextInput — so every Input in the app reported a ~39pt frame while
    // looking 44 tall. Measured: display-name 286x39, Tasks "Search flags"
    // 274x43, Feedback "Reply email" 398x42. The wrapper is already 44 and
    // centres its child, so this floor changes the frame, not the layout.
    minHeight: a11y.minTargetSize,
  },
  subtext: { marginTop: spacing.tight },
});
