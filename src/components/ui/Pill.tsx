/**
 * Pill — generic rounded chip for filters, category tags, and selection toggles.
 *
 * Two visual states: inactive (subtle background) | active (brand fill).
 * Fully rounded per design spec.
 *
 * Design system 2026-05-31.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, font, spacing } from '@/theme';

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
}

export function Pill({ label, active = false, onPress, style, size = 'md', accessibilityLabel }: PillProps) {
  const color = useColor();

  const paddingH = size === 'sm' ? spacing.sm : spacing.md;
  const paddingV = size === 'sm' ? 3 : spacing.xs;
  const fontSize = size === 'sm' ? font.size.xs : font.size.sm;

  const bg = active ? color.brand : color.surfaceNeutral;
  const fg = active ? color.textOnBrand : color.text;
  const borderColor = active ? color.brand : color.border;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: pressed && !active ? color.brandSofter : bg,
          borderColor,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
        style,
      ]}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.label, { fontSize, color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: font.weight.semibold,
  },
});
