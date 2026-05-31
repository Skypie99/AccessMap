/**
 * AppText — design-system Text wrapper.
 *
 * Applies the correct font family based on `variant`. Falls back to system
 * font if custom fonts haven't loaded yet (graceful degradation).
 *
 * Variants:
 *   display     — Plus Jakarta Sans 800 ExtraBold  — hero headings, app name
 *   heading     — Plus Jakarta Sans 700 Bold       — screen titles, section heads
 *   body        — Public Sans 400 Regular          — default body text
 *   bodyMedium  — Public Sans 500 Medium           — emphasized body
 *   label       — Public Sans 600 SemiBold         — button/chip labels, nav
 *   mono        — JetBrains Mono 400 Regular       — points, stats, coordinates
 *   monoMedium  — JetBrains Mono 500 Medium        — emphasized stats
 *   monoBold    — JetBrains Mono 600 SemiBold      — headline points
 *
 * Usage:
 *   <AppText variant="display" size={28} color={color.textStrong}>AccessMap</AppText>
 *   <AppText variant="mono" size={20}>+25 pts</AppText>
 *
 * Design system 2026-05-31.
 */

import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { font } from '@/theme';

export type AppTextVariant =
  | 'display'
  | 'heading'
  | 'body'
  | 'bodyMedium'
  | 'label'
  | 'mono'
  | 'monoMedium'
  | 'monoBold';

const VARIANT_FAMILY: Record<AppTextVariant, string> = {
  display:    font.family.display,
  heading:    font.family.displayBold,
  body:       font.family.body,
  bodyMedium: font.family.bodyMedium,
  label:      font.family.bodySemibold,
  mono:       font.family.mono,
  monoMedium: font.family.monoMedium,
  monoBold:   font.family.monoBold,
};

interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  size?: number;
  color?: string;
  /** Letter spacing override. Display variants default to -0.02em via letterSpacing. */
  tracking?: number;
}

export function AppText({
  variant = 'body',
  size,
  color,
  tracking,
  style,
  children,
  ...rest
}: AppTextProps) {
  const family = VARIANT_FAMILY[variant];

  const resolvedStyle: TextStyle = {
    fontFamily: family,
    ...(size !== undefined ? { fontSize: size } : {}),
    ...(color !== undefined ? { color } : {}),
    ...(tracking !== undefined ? { letterSpacing: tracking } : {}),
    // Tight tracking on display/heading per design spec
    ...(variant === 'display' || variant === 'heading'
      ? { letterSpacing: tracking ?? -0.3 }
      : {}),
  };

  return (
    <Text style={[resolvedStyle, style]} {...rest}>
      {children}
    </Text>
  );
}
