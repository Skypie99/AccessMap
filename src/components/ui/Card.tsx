/**
 * Card — design-system surface primitive.
 *
 * White surface, 1px slate-200 border, shadow-sm (cool-tinted), 16px radius.
 * Rises to shadow-md when interactive (pressable=true).
 * Focus: tappable cards show a brand focus ring on keyboard / switch-control
 * focus (WCAG 2.4.7), drawn as an overlay so there's no layout shift.
 *
 * Design system 2026-05-31; focus ring 2026-06-04.
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { a11y, radius, shadow, spacing } from '@/theme';
import { hapticSelection } from '@/lib/haptics';

interface CardProps {
  children: React.ReactNode;
  /** When provided, the card is tappable and calls onPress. */
  onPress?: () => void;
  style?: ViewStyle;
  /** Extra padding override — defaults to spacing.md (12). */
  padding?: number;
  /** Lift a feature/hero card with a deeper shadow (shadow.e3). */
  elevated?: boolean;
  /** Light selection tick on tap. Defaults on for tappable cards; pass false to mute. */
  haptic?: boolean;
  accessibilityLabel?: string;
}

export function Card({
  children,
  onPress,
  style,
  padding = spacing.md,
  elevated = false,
  haptic = true,
  accessibilityLabel,
}: CardProps) {
  const color = useColor();
  const [focused, setFocused] = useState(false);

  const cardStyle: ViewStyle = {
    backgroundColor: color.surface,
    borderRadius: radius.lg,       // 16px per design spec
    borderWidth: 1,
    borderColor: color.border,     // slate-200
    padding,
    ...(elevated ? shadow.e3 : onPress ? shadow.e2 : shadow.e1),
    // Theme-aware shadow color: cool navy stays in light; dark gets a soft cool
    // glow so the (now-lighter) card reads as lifted, not flat. (overhaul Phase 2)
    shadowColor: color.shadowTint,
  };

  if (onPress) {
    const handlePress = () => {
      if (haptic) hapticSelection();
      onPress();
    };
    // Visible focus ring on keyboard / switch-control focus (WCAG 2.4.7/2.4.11).
    // Drawn as an absolute overlay just outside the card frame so there's no
    // layout shift — and it never shows on touch, so touch users see no change.
    const ringStyle: ViewStyle = {
      position: 'absolute',
      top: -a11y.focusRingOffset,
      left: -a11y.focusRingOffset,
      right: -a11y.focusRingOffset,
      bottom: -a11y.focusRingOffset,
      borderRadius: radius.lg + a11y.focusRingOffset,
      borderWidth: a11y.focusRingWidth,
      borderColor: color.brand,
    };
    return (
      <Pressable
        onPress={handlePress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
          style,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
        {focused && <View pointerEvents="none" style={ringStyle} />}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
  },
});
