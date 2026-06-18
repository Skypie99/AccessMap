/**
 * GlassSurface — frosted-glass material for floating panels over the map.
 *
 * A translucent, blurred surface (expo-blur) that lets the map texture show
 * through — the "frosted glass" look from the 2026-06-17 expressive overhaul.
 * Accessibility is built in, not bolted on:
 *   • A solid `overlayGlass` tint sits OVER the blur as the CONTRAST FLOOR, so
 *     dark text stays AA-legible on any basemap, blurred or not (0.82 white over
 *     black ≈ #333 at >8:1).
 *   • When the user has "Reduce Transparency" on — or on platforms without blur —
 *     it drops the blur for an opaque `overlay` fill. Never a low-contrast smear.
 * The blur is DECORATIVE only: removing it never loses information or contrast
 * (DESIGN.md — color/material is never the sole signal).
 *
 * Shadow note: the blur layer is clipped (overflow:hidden so its corners round),
 * and on iOS an overflow:hidden view clips its OWN shadow — so put the elevation
 * shadow + margins on the outer `style`; this component keeps it on the wrapper
 * and clips only the inner blur layer.
 *
 * Usage:
 *   <GlassSurface style={styles.filterPanel} borderRadius={radius.lg}>
 *     {panelContent}
 *   </GlassSurface>
 * (Remove any solid `backgroundColor` from the panel's own style — GlassSurface
 *  supplies the surface.)
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColor } from '@/theme/ThemeContext';
import { useReduceTransparency } from '@/lib/accessibility';
import { radius as radiusTokens } from '@/theme';

interface GlassSurfaceProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  /** Outer style — borderRadius + shadow + margins + padding belong here. */
  style?: StyleProp<ViewStyle>;
  /** Corner radius for the clipped blur layer; match the radius in `style`. Default radius.lg. */
  borderRadius?: number;
  /** Blur strength (expo-blur intensity 0–100). Default 24 — restrained, not heavy. */
  intensity?: number;
  /** Blur tint. Map overlays are an always-light DESIGN.md exception, so default 'light'. */
  tint?: 'light' | 'dark' | 'default';
  /** Override the translucent contrast floor (default color.overlayGlass). */
  tintColor?: string;
  /** Override the opaque fallback used under Reduce Transparency (default color.overlay). */
  solidColor?: string;
}

export function GlassSurface({
  children,
  style,
  borderRadius = radiusTokens.lg,
  intensity = 24,
  tint = 'light',
  tintColor,
  solidColor,
  ...rest
}: GlassSurfaceProps) {
  const color = useColor();
  const reduceTransparency = useReduceTransparency();

  const floor = tintColor ?? color.overlayGlass;
  const solid = solidColor ?? color.overlay;

  // Reduce Transparency on → opaque surface, no blur. Contrast guaranteed.
  if (reduceTransparency) {
    return (
      <View style={[style, { borderRadius, backgroundColor: solid }]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View style={style} {...rest}>
      {/* Clipped blur layer: rounds its corners and (importantly) does NOT carry
          the shadow, which the outer wrapper owns. */}
      <View style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
        {/* Contrast floor — the AA guarantee. Sits over the blur, under content. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: floor }]} />
      </View>
      {children}
    </View>
  );
}
