/**
 * CategoryIcon — renders a category-specific icon for the six AccessMap
 * barrier types (ramp, curb, pothole, crosswalk, sidewalk, other).
 *
 * Phase 1: text-initial placeholder using brand colors.
 * Phase 2: swap internals for react-native-svg paths from assets/icons/category/*.svg
 * when react-native-svg is added to the project.
 *
 * SVG source files live at assets/icons/category/<category>.svg
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color } from '@/theme';

export type CategoryKey = 'ramp' | 'curb' | 'pothole' | 'crosswalk' | 'sidewalk' | 'other';

const CATEGORY_META: Record<CategoryKey, { label: string; initial: string }> = {
  ramp:      { label: 'Ramp',      initial: 'R' },
  curb:      { label: 'Curb',      initial: 'C' },
  pothole:   { label: 'Pothole',   initial: 'P' },
  crosswalk: { label: 'Crosswalk', initial: 'X' },
  sidewalk:  { label: 'Sidewalk',  initial: 'S' },
  other:     { label: 'Other',     initial: '?' },
};

interface Props {
  category: CategoryKey;
  size?: number;
  /** Override foreground color (defaults to brand blue). */
  tint?: string;
  /** Whether to render on a tinted background pill. */
  pill?: boolean;
}

export default function CategoryIcon({ category, size = 24, tint, pill = false }: Props) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
  const fg = tint ?? color.brand;
  const fontSize = Math.round(size * 0.5);

  if (pill) {
    return (
      <View
        style={[
          styles.pill,
          { width: size * 1.5, height: size, borderRadius: size / 2, backgroundColor: color.brandSofter },
        ]}
        accessibilityLabel={meta.label}
      >
        <Text style={[styles.initial, { fontSize, color: fg }]}>{meta.initial}</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.icon, { width: size, height: size }]}
      accessibilityLabel={meta.label}
    >
      <Text style={[styles.initial, { fontSize, color: fg }]}>{meta.initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
