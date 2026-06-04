/**
 * Button — design-system primary UI primitive.
 *
 * Three kinds:   primary (brand gradient fill) | secondary (outlined) | ghost (text-only)
 * Three sizes:   sm | md (default) | lg
 * Press feedback: scale(0.97) via Animated (reduced-motion-gated) + a light haptic.
 * Primary carries a brand gradient (gradient.brand) and a soft brand glow.
 * Focus:         a brand focus ring (WCAG 2.4.7/2.4.11) appears on keyboard /
 *                switch-control focus — drawn as an overlay so there's no layout shift.
 *
 * Design system 2026-05-31; more-expressive pass 2026-06-03 (gradient + glow +
 * focus ring + press haptic + AppText label).
 */

import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColor } from '@/theme/ThemeContext';
import { useReducedMotion } from '@/lib/accessibility';
import { hapticImpact } from '@/lib/haptics';
import { motion, radius, shadow, font, spacing, gradient, a11y } from '@/theme';
import { AppText } from './AppText';

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
  /** Haptic impact on press. Defaults to 'light'; pass 'heavy' for destructive confirms, 'none' to mute. */
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
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
  haptic = 'light',
  accessibilityLabel,
}: ButtonProps) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [focused, setFocused] = useState(false);
  const { paddingH, paddingV, fontSize } = SIZE_STYLES[size];

  function handlePressIn() {
    if (reducedMotion) return; // WCAG 2.3.3 — skip the press-scale under reduced motion
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      ...motion.spring.press,
    }).start();
  }

  function handlePressOut() {
    if (reducedMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...motion.spring.pressOut,
    }).start();
  }

  function handlePress() {
    // Haptics are a separate concern from reduce-motion (honored at the OS level).
    if (haptic !== 'none') hapticImpact(haptic);
    onPress();
  }

  // Resolve per-kind colors at render time so they respect light/dark theme
  const kindStyle = resolveKindStyle(kind, color);
  const isPrimary = kind === 'primary';

  // Single surface view: the gradient self-rounds (its own borderRadius) so we
  // never need overflow:hidden — which on iOS would clip the glow shadow.
  const surfaceStyle: ViewStyle = {
    paddingHorizontal: paddingH,
    paddingVertical: paddingV,
    borderRadius: radius.md,
    backgroundColor: kindStyle.bg,
    borderWidth: kindStyle.borderWidth,
    borderColor: kindStyle.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
    ...(isPrimary ? shadow.glowBrand : {}),
  };

  const ringStyle: ViewStyle = {
    position: 'absolute',
    top: -a11y.focusRingOffset,
    left: -a11y.focusRingOffset,
    right: -a11y.focusRingOffset,
    bottom: -a11y.focusRingOffset,
    borderRadius: radius.md + a11y.focusRingOffset,
    borderWidth: a11y.focusRingWidth,
    borderColor: color.brand,
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={disabled ? undefined : handlePress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.pressable, { opacity: disabled ? 0.45 : 1 }, style]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        <View style={surfaceStyle}>
          {isPrimary && (
            <LinearGradient
              colors={gradient.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]}
              pointerEvents="none"
            />
          )}
          <AppText variant="label" size={fontSize} color={kindStyle.fg} style={styles.label}>
            {children}
          </AppText>
        </View>
        {focused && !disabled && <View pointerEvents="none" style={ringStyle} />}
      </Pressable>
    </Animated.View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveKindStyle(
  kind: ButtonKind,
  color: ReturnType<typeof useColor>,
): { bg: string; fg: string; borderWidth: number; borderColor: string } {
  switch (kind) {
    case 'primary':
      // bg is the solid fallback under the gradient (also the iOS shadow surface)
      return {
        bg: color.brand,
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
  pressable: {
    alignSelf: 'flex-start',
  },
  label: {
    textAlign: 'center',
  },
});
