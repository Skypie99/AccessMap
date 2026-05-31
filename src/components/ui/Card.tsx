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

interface CardProps {
  children: React.ReactNode;
  /** When provided, the card is tappable and calls onPress. */
  onPress?: () => void;
  style?: ViewStyle;
  /** Extra padding override — defaults to spacing.md (12). */
  padding?: number;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, style, padding = spacing.md, accessibilityLabel }: CardProps) {
  const color = useColor();

  const cardStyle: ViewStyle = {
    backgroundColor: color.surface,
    borderRadius: radius.lg,       // 16px per design spec
    borderWidth: 1,
    borderColor: color.border,     // slate-200
    padding,
    ...(onPress ? shadow.e2 : shadow.e1),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
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
