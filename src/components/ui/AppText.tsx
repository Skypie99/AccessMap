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
 * Dynamic Type: each variant carries a `maxFontSizeMultiplier` cap so the app
 * supports large system fonts (accessibility) without runaway scaling breaking
 * layouts. `body`/`bodyMedium` are uncapped on purpose — body copy MUST scale
 * freely. Pass an explicit `maxFontSizeMultiplier` to override per call site.
 *
 * Tracking: display/heading get tight letter-spacing derived from `size`
 * (font.tracking.*) rather than a flat magic number.
 *
 * Usage:
 *   <AppText variant="display" size={28} color={color.textStrong}>AccessMap</AppText>
 *   <AppText variant="mono" size={20}>+25 pts</AppText>
 *
 * Design system 2026-05-31; Dynamic Type + tracking added 2026-06-01.
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

/**
 * Per-variant Dynamic Type cap. `undefined` = no cap (full scaling).
 * Display/label/mono cap tighter because their layouts break sooner; body
 * stays uncapped so essential reading text always honors the user's setting.
 */
const VARIANT_MAX_FONT_MULTIPLIER: Record<AppTextVariant, number | undefined> = {
  display:    1.3,
  heading:    1.5,
  body:       undefined,
  bodyMedium: undefined,
  label:      1.6,
  mono:       1.4,
  monoMedium: 1.4,
  monoBold:   1.4,
};

/**
 * Resolve tight tracking for display/heading from the rendered size.
 * Replaces the old flat `-0.3` (only correct near 15pt). Explicit `tracking`
 * prop always wins; body/mono get no tracking.
 */
function resolveTracking(
  variant: AppTextVariant,
  size: number | undefined,
  explicit: number | undefined,
): number | undefined {
  if (explicit !== undefined) return explicit;
  if (variant !== 'display' && variant !== 'heading') return undefined;
  const s = size ?? font.size.lg; // heading default sits near 16pt
  if (s >= 40) return font.tracking.display;
  if (s >= 24) return font.tracking.h1;
  if (s >= 18) return font.tracking.xl;
  return font.tracking.heading;
}

interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  size?: number;
  color?: string;
  /** Letter-spacing override. Display/heading otherwise derive it from `size`. */
  tracking?: number;
}

export function AppText({
  variant = 'body',
  size,
  color,
  tracking,
  maxFontSizeMultiplier,
  accessibilityRole,
  style,
  children,
  ...rest
}: AppTextProps) {
  const family = VARIANT_FAMILY[variant];
  const letterSpacing = resolveTracking(variant, size, tracking);
  const cap = maxFontSizeMultiplier ?? VARIANT_MAX_FONT_MULTIPLIER[variant];

  // `heading` is a section/screen title — expose it as a header to screen
  // readers (WCAG 1.3.1) so VoiceOver/TalkBack rotor navigation works. An
  // explicit accessibilityRole always wins. `display` stays unset because it
  // also covers non-heading hero numerals (e.g. the Profile points figure).
  const resolvedRole = accessibilityRole ?? (variant === 'heading' ? 'header' : undefined);

  const resolvedStyle: TextStyle = {
    fontFamily: family,
    ...(size !== undefined ? { fontSize: size } : {}),
    ...(color !== undefined ? { color } : {}),
    ...(letterSpacing !== undefined ? { letterSpacing } : {}),
  };

  return (
    <Text
      style={[resolvedStyle, style]}
      maxFontSizeMultiplier={cap}
      accessibilityRole={resolvedRole}
      {...rest}
    >
      {children}
    </Text>
  );
}
