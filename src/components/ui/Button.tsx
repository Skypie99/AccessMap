/**
 * Button — design-system primary UI primitive.
 *
 * Three kinds:   primary (brand-blue fill) | secondary (outlined) | ghost (text-only)
 * Three sizes:   sm | md (default) | lg
 * Press feedback: scale(0.97) via Animated — quick, physical, per design spec.
 *
 * Design system 2026-05-31: radius.md (12), Wayfinder Blue #1466E0, cool shadows.
 */

import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, shadow, font, spacing } from '@/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ButtonKind = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  kind?: ButtonKind;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  /** Forwarded to the accessibility system. Defaults to button text content. */
  accessibilityLabel?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIZE_STYLES: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number }> = {
  sm: { paddingH: spacing.md,  paddingV: spacing.xs,  fontSize: font.size.sm  },
  md: { paddingH: spacing.lg,  paddingV: spacing.sm + 2, fontSize: font.size.base },
  lg: { paddingH: spacing.xxl, paddingV: spacing.md,  fontSize: font.size.lg  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Button({
  onPress,
  children,
  kind = 'primary',
  size = 'md',
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const color = useColor();
  const scale = useRef(new Animated.Value(1)).current;
  const { paddingH, paddingV, fontSize } = SIZE_STYLES[size];

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  }

  // Resolve per-kind colors at render time so they respect light/dark theme
  const kindStyle = resolveKindStyle(kind, color, disabled);

  const containerStyle: ViewStyle = {
    paddingHorizontal: paddingH,
    paddingVertical: paddingV,
    borderRadius: radius.md,
    backgroundColor: kindStyle.bg,
    borderWidth: kindStyle.borderWidth,
    borderColor: kindStyle.borderColor,
    opacity: disabled ? 0.45 : 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    ...(kind === 'primary' ? shadow.e2 : {}),
  };

  const labelStyle: TextStyle = {
    fontSize,
    fontWeight: font.weight.semibold,
    color: kindStyle.fg,
    textAlign: 'center',
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        style={[containerStyle, style]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        <Text style={labelStyle}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveKindStyle(
  kind: ButtonKind,
  color: ReturnType<typeof useColor>,
  disabled: boolean,
): { bg: string; fg: string; borderWidth: number; borderColor: string } {
  switch (kind) {
    case 'primary':
      return {
        bg: disabled ? color.brand : color.brand,
        fg: color.textOnBrand,
        borderWidth: 0,
        borderColor: 'transparent',
      };
    case 'secondary':
      return {
        bg: color.surface,
        fg: color.brand,
        borderWidth: 1.5,
        borderColor: color.brand,
      };
    case 'ghost':
      return {
        bg: 'transparent',
        fg: color.brand,
        borderWidth: 0,
        borderColor: 'transparent',
      };
  }
}

const styles = StyleSheet.create({
  // placeholder so the file has at least one StyleSheet usage — actual styles
  // are constructed inline above so they can react to theme + props.
  _noop: {},
});
void styles; // suppress unused-var warning
