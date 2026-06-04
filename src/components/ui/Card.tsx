/**
 * Card — design-system surface primitive.
 *
 * White surface, 1px slate-200 border, shadow-sm (cool-tinted), 16px radius.
 * Rises to shadow-md when interactive (pressable=true).
 *
 * Design system 2026-05-31.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, shadow, spacing } from '@/theme';
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

  const cardStyle: ViewStyle = {
    backgroundColor: color.surface,
    borderRadius: radius.lg,       // 16px per design spec
    borderWidth: 1,
    borderColor: color.border,     // slate-200
    padding,
    ...(elevated ? shadow.e3 : onPress ? shadow.e2 : shadow.e1),
  };

  if (onPress) {
    const handlePress = () => {
      if (haptic) hapticSelection();
      onPress();
    };
    return (
      <Pressable
        onPress={handlePress}
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
