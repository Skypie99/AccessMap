/**
 * GlassSurface — frosted-glass material primitive.
 *
 * Two generations live here, deliberately:
 *
 * 1. LEGACY (no `variant`) — the 2026-06-17 map-overlay material, byte-stable:
 *    a translucent blurred surface with a solid `overlayGlass` contrast floor
 *    over the blur, dropping to an opaque `overlay` fill under Reduce
 *    Transparency. MapScreen and HomeScreen consume this path;
 *    its behavior (defaults intensity 24, tint 'light') is pinned by tests.
 *
 * 2. VARIANTS (`variant="row" | "chrome" | "banner" | "bulk"`) — the "Deep
 *    Field" liquid-glass tiers (Tasks glass pass, 2026-07-03; law in
 *    GLASS.md). Each variant is a preset of blur intensity + floor + edge +
 *    specular hairline from the theme's glass tokens, with three designed
 *    material modes:
 *      • blur       — BlurView(glass.intensity[variant]) + floor + hairlines
 *      • engineered — the *Lite micro-gradient instead of blur+floor (Android
 *                     always — "C-on-Android = B"; C-lite runtime mode via
 *                     `forceEngineered`)
 *      • opaque     — the designed Reduce-Transparency state (overlay 0.97
 *                     fills + borderStrong hairlines; banner → brandSofter +
 *                     brand border). Never a low-contrast smear.
 *    The blur is DECORATIVE only: every mode keeps AA floors, so removing it
 *    never loses information or contrast (DESIGN.md — color/material is never
 *    the sole signal).
 *
 * Contrast contract: floors and inks are the Material Lab's script-arbitrated
 * values (contrast-check.mjs, exit 0). Changing any floor/edge token requires
 * re-running the arbiter — see GLASS.md.
 *
 * Shadow note (unchanged): the material layer is clipped (overflow:hidden so
 * its corners round), and on iOS an overflow:hidden view clips its OWN shadow
 * — so put the elevation shadow + margins on the outer `style`; this component
 * clips only the inner material layer.
 *
 * Blur budget (__DEV__): every mounted blur pane increments a module counter;
 * exceeding glass.maxLivePanes logs a warning (never throws — jest runs with
 * __DEV__ true). The budget's real bound is the list's virtualization: only
 * visible rows exist. Never defeat it to "help" the material.
 *
 * Usage (legacy):
 *   <GlassSurface style={styles.filterPanel} borderRadius={radius.lg}>
 *     {panelContent}
 *   </GlassSurface>
 * Usage (Deep Field):
 *   <GlassSurface variant="row" style={styles.card}>{cardContent}</GlassSurface>
 * (Remove any solid `backgroundColor` from the panel's own style — GlassSurface
 *  supplies the surface.)
 */

import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReduceTransparency } from '@/lib/accessibility';
import { glass, radius as radiusTokens } from '@/theme';

export type GlassVariant = 'row' | 'chrome' | 'banner' | 'bulk';

// ---------------------------------------------------------------------------
// __DEV__ blur-budget counter (module-level, warn-only).
// ---------------------------------------------------------------------------

let liveBlurPanes = 0;

/** Dev/diagnostic: how many BlurViews GlassSurface has live right now. */
export function __getLiveBlurPaneCount(): number {
  return liveBlurPanes;
}

function useBlurPaneBudget(active: boolean) {
  useEffect(() => {
    if (!__DEV__ || !active) return;
    liveBlurPanes += 1;
    if (liveBlurPanes > glass.maxLivePanes) {
      console.warn(
        `[glass] ${liveBlurPanes} live BlurViews exceeds maxLivePanes ${glass.maxLivePanes} — check list virtualization / variant map (GLASS.md)`,
      );
    }
    return () => {
      liveBlurPanes -= 1;
    };
  }, [active]);
}

// ---------------------------------------------------------------------------
// Variant recipes — pure lookups into the theme's glass tokens.
// ---------------------------------------------------------------------------

interface VariantRecipe {
  intensity: number;
  floor: string;
  lite: readonly [string, string]; // engineered micro-gradient stops
  /** 1px inner light line. Placement: row/banner top, chrome bottom lip, bulk top. */
  specular: string;
  /** Edge color. row/banner: full border; chrome: bottom strip; bulk: top strip. */
  edge: string;
  defaultRadius: number;
}

function variantRecipe(variant: GlassVariant, color: ColorTheme): VariantRecipe {
  switch (variant) {
    case 'row':
      return {
        intensity: glass.intensity.row,
        floor: color.glassRowFloor,
        lite: [color.glassRowLite0, color.glassRowLite1],
        specular: color.glassRowSpecular,
        edge: color.glassRowEdge,
        defaultRadius: radiusTokens.lg,
      };
    case 'chrome':
      return {
        intensity: glass.intensity.chrome,
        floor: color.glassChromeFloor,
        lite: [color.glassChromeLite0, color.glassChromeLite1],
        specular: color.glassChromeLip,
        edge: color.glassChromeEdge,
        defaultRadius: 0,
      };
    case 'banner':
      return {
        intensity: glass.intensity.banner,
        floor: color.glassBannerFloor,
        lite: [color.glassBannerLite0, color.glassBannerLite1],
        specular: color.glassBannerSpecular,
        edge: color.glassBannerEdge,
        defaultRadius: radiusTokens.lg,
      };
    case 'bulk':
      return {
        intensity: glass.intensity.bulk,
        floor: color.glassBulkFloor,
        lite: [color.glassBulkLite0, color.glassBulkLite1],
        specular: color.glassBulkSpecular,
        edge: color.glassChromeEdge, // mockup: bulk's top border shares the chrome edge token
        defaultRadius: 0,
      };
  }
}

interface GlassSurfaceProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  /** Outer style — borderRadius + shadow + margins + padding belong here. */
  style?: StyleProp<ViewStyle>;
  /** Corner radius for the clipped material layer; match the radius in `style`.
   *  Default: radius.lg (legacy / row / banner), 0 (chrome / bulk). */
  borderRadius?: number;
  /** LEGACY blur strength (expo-blur intensity 0–100). Default 24 — restrained,
   *  not heavy. Ignored when `variant` is set (the variant's intensity wins). */
  intensity?: number;
  /** LEGACY blur tint. Map overlays are an always-light DESIGN.md exception, so
   *  default 'light'. Variants derive their tint from color.scheme instead. */
  tint?: 'light' | 'dark' | 'default';
  /** LEGACY: override the translucent contrast floor (default color.overlayGlass). */
  tintColor?: string;
  /** Override the opaque Reduce-Transparency fill (legacy default color.overlay;
   *  variants have designed RT states — this overrides only the fill). */
  solidColor?: string;
  /** Deep Field material tier — see GLASS.md. */
  variant?: GlassVariant;
  /** Override the variant's edge color (e.g. color.brand on a selected card). */
  edgeColor?: string;
  /** Override the variant's edge width (e.g. 2 on a selected card). Default 1. */
  edgeWidth?: number;
  /** Extra wash painted above the floor (e.g. the selected-card tint). */
  overlayTint?: string;
  /** Render the engineered (no-blur) material — the C-lite runtime mode. */
  forceEngineered?: boolean;
  /** Override the variant's engineered micro-gradient stops (the *Lite pair).
   *  Additive: absent → the recipe's own stops. Used by the map command bar's
   *  crystal tier (map-chrome compaction) without minting a new variant. */
  liteColors?: readonly [string, string];
  /** Override the variant's blur-mode contrast floor (default recipe.floor).
   *  Additive: absent → the recipe's own floor. Lets the crystal bar keep the
   *  SAME worst-stop floor under true blur as its engineered bottom stop. */
  floorColor?: string;
}

export function GlassSurface({
  children,
  style,
  borderRadius,
  intensity = 24,
  tint = 'light',
  tintColor,
  solidColor,
  variant,
  edgeColor,
  edgeWidth,
  overlayTint,
  forceEngineered,
  liteColors,
  floorColor,
  ...rest
}: GlassSurfaceProps) {
  const color = useColor();
  const reduceTransparency = useReduceTransparency();

  const recipe = variant ? variantRecipe(variant, color) : null;
  // Material mode (variant path): RT → opaque designed state · Android →
  // engineered ("C-on-Android = B", chrome included; the dimezisBlurView fork
  // was NOT taken) · C-lite → engineered · else true blur. The legacy path
  // also flows through 'blur'/'opaque' so the budget counter sees it.
  const material: 'opaque' | 'engineered' | 'blur' = reduceTransparency
    ? 'opaque'
    : recipe && (Platform.OS === 'android' || forceEngineered)
      ? 'engineered'
      : 'blur';

  // Budget counter — active only when this instance actually mounts a BlurView.
  useBlurPaneBudget(material === 'blur');

  // -------------------------------------------------------------------------
  // LEGACY path (no variant) — byte-stable with the 2026-06-17 primitive.
  // -------------------------------------------------------------------------
  if (!recipe) {
    const legacyRadius = borderRadius ?? radiusTokens.lg;
    const floor = tintColor ?? color.overlayGlass;
    const solid = solidColor ?? color.overlay;

    // Reduce Transparency on → opaque surface, no blur. Contrast guaranteed.
    if (reduceTransparency) {
      return (
        <View style={[style, { borderRadius: legacyRadius, backgroundColor: solid }]} {...rest}>
          {children}
        </View>
      );
    }
    return (
      <View style={style} {...rest}>
        {/* Clipped blur layer: rounds its corners and (importantly) does NOT
            carry the shadow, which the outer wrapper owns. */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: legacyRadius, overflow: 'hidden' }]}>
          <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
          {/* Contrast floor — the AA guarantee. Sits over the blur, under content. */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: floor }]} />
        </View>
        {children}
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // VARIANT path — Deep Field tiers.
  // -------------------------------------------------------------------------
  const r = borderRadius ?? recipe.defaultRadius;
  const line = edgeColor ?? recipe.edge;
  const lineW = edgeWidth ?? 1;

  if (material === 'opaque') {
    // The DESIGNED Reduce-Transparency state (mockup body.rt): opaque fills,
    // hairlines kept as solid 1px lines, blur and speculars dropped.
    const rtFill = solidColor ?? (variant === 'banner' ? color.brandSofter : color.overlay);
    const rtLine = variant === 'banner' ? color.brand : color.borderStrong;
    const rtEdge: ViewStyle =
      variant === 'chrome'
        ? { borderBottomWidth: 1, borderBottomColor: rtLine }
        : variant === 'bulk'
          ? { borderTopWidth: 1, borderTopColor: rtLine }
          : { borderWidth: lineW, borderColor: edgeColor ?? rtLine };
    return (
      <View style={[style, { borderRadius: r, backgroundColor: rtFill }, rtEdge]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    // zIndex 0 (caller's style can still override, e.g. the chrome pane's 50)
    // forces a stacking context so the negative-z material layer below can
    // never sink beneath the screen; the children paint above it even when
    // they're position-static on web (bare react-native-svg icons — caught in
    // the Stage-B render-compare: the banner's MapPin ghosted under the floor).
    <View style={[styles.stackRoot, style]} {...rest}>
      {/* Clipped material layer — decorative, always under the children. */}
      <View
        style={[StyleSheet.absoluteFill, styles.materialBelow, { borderRadius: r, overflow: 'hidden' }]}
        pointerEvents="none"
      >
        {material === 'blur' ? (
          <>
            <BlurView
              intensity={recipe.intensity}
              tint={color.scheme}
              style={StyleSheet.absoluteFill}
            />
            {/* Contrast floor — the AA guarantee. Over the blur, under content.
                floorColor override keeps the crystal bar's blur floor identical
                to its engineered bottom stop (mode-independent floor math). */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: floorColor ?? recipe.floor }]} />
          </>
        ) : (
          // Engineered: the *Lite vertical micro-gradient replaces blur+floor
          // (B's opaline architecture wearing this tier's tint — GLASS.md).
          // liteColors override swaps the stops (crystal tier) with no new variant.
          <LinearGradient
            colors={[...(liteColors ?? recipe.lite)]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {overlayTint ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayTint }]} />
        ) : null}
        {/* Specular hairline — the "lit edge" of the pane. Placement per tier:
            row/banner inner top line · chrome inner lip above the bottom edge
            · bulk inner line under the top edge. (RN has no inset box-shadow —
            1px strips are the honest translation; the clip container rounds
            them at the corners.) */}
        {variant === 'chrome' ? (
          <>
            <View style={[styles.hairline, { bottom: 1, backgroundColor: recipe.specular }]} />
            <View style={[styles.hairline, { bottom: 0, backgroundColor: line }]} />
          </>
        ) : variant === 'bulk' ? (
          <>
            <View style={[styles.hairline, { top: 0, backgroundColor: line }]} />
            <View style={[styles.hairline, { top: 1, backgroundColor: recipe.specular }]} />
          </>
        ) : (
          <>
            <View
              style={[
                styles.hairline,
                { top: lineW, left: lineW, right: lineW, backgroundColor: recipe.specular },
              ]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: r, borderWidth: lineW, borderColor: line },
              ]}
            />
          </>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hairline: { position: 'absolute', left: 0, right: 0, height: 1 },
  stackRoot: { zIndex: 0 },
  materialBelow: { zIndex: -1 },
});
