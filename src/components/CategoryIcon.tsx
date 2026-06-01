/**
 * CategoryIcon — bespoke line icon for each AccessMap barrier category.
 *
 * Renders the design system's 24px / 2px / round-cap SVG glyphs (drawn on the
 * same grid as Lucide) via react-native-svg, tinted by `color` (stroke). Maps
 * the app's FlagCategory enum to the closest brand glyph; `blocked_path` and
 * `steep_grade` are drawn in-style since the brand set has no exact match.
 *
 * Design system 2026-06-01 — replaces the Phase-1 text-initial placeholder.
 * Glyph paths come from accessmap-design-system/project/ui_kits/.../primitives.jsx.
 */

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { color as staticColor } from '@/theme';
import { CATEGORY_LABELS } from '@/lib/flags';
import type { FlagCategory } from '@/types/database';

interface Props {
  category: FlagCategory;
  size?: number;
  /** Stroke / foreground color. Defaults to brand blue (same in light + dark). */
  color?: string;
  /** Hide from screen readers when paired with a visible text label. */
  decorative?: boolean;
}

function glyph(category: FlagCategory, fg: string) {
  switch (category) {
    case 'no_ramp': // ramp / incline with handrail
      return (
        <>
          <Path d="M3 20 H21" />
          <Path d="M5 20 L19 7" />
          <Path d="M19 7 V20" />
          <Circle cx={10.5} cy={15} r={1.6} />
        </>
      );
    case 'broken_sidewalk': // cracked paving slabs
      return (
        <>
          <Path d="M8 21 L10 4" />
          <Path d="M16 21 L14 4" />
          <Path d="M11.3 10 H12.7" />
          <Path d="M10.7 15 H13.3" />
        </>
      );
    case 'missing_signal': // crossing stripes
      return (
        <>
          <Path d="M5 21 L8 5" />
          <Path d="M11 21 L12.5 5" />
          <Path d="M17 21 L17 5" />
        </>
      );
    case 'blocked_path': // blocked — circle + slash
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M5.6 5.6 L18.4 18.4" />
        </>
      );
    case 'steep_grade': // steep up-slope with arrow
      return (
        <>
          <Path d="M3 20 H21" />
          <Path d="M6 20 L18 7" />
          <Path d="M18 7 L13.6 8" />
          <Path d="M18 7 L17 11.4" />
        </>
      );
    case 'other':
    default: // generic — dotted circle (ellipsis in a ring)
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Circle cx={7.5} cy={12} r={1} fill={fg} stroke="none" />
          <Circle cx={12} cy={12} r={1} fill={fg} stroke="none" />
          <Circle cx={16.5} cy={12} r={1} fill={fg} stroke="none" />
        </>
      );
  }
}

export default function CategoryIcon({ category, size = 24, color, decorative = false }: Props) {
  const fg = color ?? staticColor.brand;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fg}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityLabel={decorative ? undefined : CATEGORY_LABELS[category]}
    >
      {glyph(category, fg)}
    </Svg>
  );
}
