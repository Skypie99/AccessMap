/**
 * Pill — generic rounded chip for filters, category tags, and selection toggles.
 *
 * Two visual states: inactive (subtle background) | active (brand fill).
 * Fully rounded per design spec. Interactive pills show a brand focus ring on
 * keyboard / switch-control focus (WCAG 2.4.7), drawn as an overlay (no shift).
 *
 * Design system 2026-05-31; focus ring 2026-06-04.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { a11y, radius, font, spacing } from '@/theme';
import { AppText } from './AppText';

// Vertical hit-area expansion so a compact chip still hits the 44pt target
// (WCAG 2.5.8 / project a11y.minTargetSize) without inflating its visual height
// — keeps dense filter rows looking premium, not chunky. Only horizontal slop
// is kept small to avoid neighbouring chips' hit areas overlapping in a row.
const HIT_SLOP = { top: 10, bottom: 10, left: 4, right: 4 } as const;

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
  const [focused, setFocused] = useState(false);

  const paddingH = size === 'sm' ? spacing.sm : spacing.md;
  const paddingV = size === 'sm' ? 3 : spacing.xs;
  const fontSize = size === 'sm' ? font.size.xs : font.size.sm;

  const bg = active ? color.brand : color.surfaceNeutral;
  const fg = active ? color.textOnBrand : color.text;
  const borderColor = active ? color.brand : color.border;

  // Visible focus ring on keyboard / switch-control focus (WCAG 2.4.7/2.4.11),
  // drawn as an overlay just outside the pill so there's no layout shift. Only
  // interactive pills (onPress) take focus; it never shows on touch.
  const ringStyle: ViewStyle = {
    position: 'absolute',
    top: -a11y.focusRingOffset,
    left: -a11y.focusRingOffset,
    right: -a11y.focusRingOffset,
    bottom: -a11y.focusRingOffset,
    borderRadius: radius.full,
    borderWidth: a11y.focusRingWidth,
    borderColor: color.brand,
  };

  return (
    <Pressable
      onPress={onPress}
      onFocus={onPress ? () => setFocused(true) : undefined}
      onBlur={onPress ? () => setFocused(false) : undefined}
      hitSlop={onPress ? HIT_SLOP : undefined}
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
      <AppText variant="label" size={fontSize} color={fg}>
        {label}
      </AppText>
      {onPress && focused && <View pointerEvents="none" style={ringStyle} />}
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
});
