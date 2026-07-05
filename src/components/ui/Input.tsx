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
import { a11y, font, radius, spacing } from '@/theme';
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

  const borderColor = hasError
    ? color.error
    : focused
      ? color.brand
      : disabled
        ? color.borderSubtle
        : color.border;
  const borderWidth = focused || hasError ? 2 : 1;
  // Compensate horizontal padding for the 1→2px border so text doesn't shift.
  const compensate = borderWidth - 1;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="label" size={font.size.sm} color={color.text} style={styles.label}>
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
            backgroundColor: disabled ? color.surfaceNeutral : color.surfaceSoft,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {LeftIcon ? (
          <LeftIcon size={18} color={focused ? color.brand : color.textMuted} strokeWidth={2} />
        ) : null}

        <TextInput
          editable={!disabled}
          style={[styles.input, { color: disabled ? color.textMuted : color.text }]}
          placeholderTextColor={color.placeholderText}
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
          <AppText variant="body" size={font.size.xs} color={color.error} style={styles.subtext}>
            {errorText}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="body" size={font.size.xs} color={color.textMuted} style={styles.subtext}>
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
  },
  subtext: { marginTop: spacing.tight },
});
