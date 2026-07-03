/**
 * ScreenStage — the "Deep Field" designed screen background (GLASS.md).
 *
 * The stage is the light source the liquid glass floats over: a diagonal
 * 165° wash + one (dark) or two (light) radial brand pools + a 2.5% film
 * grain. Row/chrome glass blurs THIS — over a flat wash, blur is invisible,
 * so the stage is what makes the material readable.
 *
 * Layer order (bottom → top): base linear gradient → SVG pools → noise tile.
 * Purely decorative: pointerEvents none, hidden from the accessibility tree.
 *
 * Recipe (Material Lab, candidate C, script-arbitrated — all values are
 * theme tokens; the arbiter measured worst-case text over the pools' darkest
 * stops, so do NOT deepen the pools without re-running contrast-check.mjs):
 *   light: linear 165° stage0 → stage1 (52%) → stage2, pool A (brand, 90%×58%
 *          ellipse at 14%,4%), pool B (counter, 86%×54% at 88%,98%), 2.5% grain
 *   dark:  linear 165° stage0 → stage1 (2-stop), pool A only — the field
 *          itself is the light source; stagePoolB === 'transparent' skips B.
 *
 * Honesty note: the mockup's grain uses mix-blend-mode: overlay; RN ships the
 * same 128px feTurbulence tile as plain 2.5% alpha (blend-mode support is
 * uneven across RN/web) — imperceptible at this opacity, and the arbiter's
 * 3% grain dip already bounds it.
 *
 * Portability: mount as the first child of a screen root (with the root's
 * backgroundColor set to color.stage1 so any pre-mount frame matches), then
 * follow the GLASS.md rollout recipe (stage → chrome → rows → completions).
 */

import React, { useId } from 'react';
import { Image, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useColor } from '@/theme/ThemeContext';

// The grain, per platform. Native: the pre-rendered 128px PNG of the lab's
// feTurbulence tile, tiled by RN's own resizeMode="repeat". Web: react-native-
// web ignores "repeat" (the tile rendered once, top-left — caught in the
// Stage-A render-compare), so the web build uses the Material Lab's EXACT SVG
// data-URI as a repeating CSS background — pixel-identical to the mockup.
const NOISE_SVG_URI =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27128%27%20height%3D%27128%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.9%27%20numOctaves%3D%272%27%20stitchTiles%3D%27stitch%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27128%27%20height%3D%27128%27%20filter%3D%27url(%23n)%27%2F%3E%3C%2Fsvg%3E";

// Web-only CSS, passed through react-native-web's style system. Typed via a
// cast because these props are (deliberately) not in RN's ViewStyle.
const WEB_NOISE_STYLE =
  Platform.OS === 'web'
    ? ({
        backgroundImage: `url("${NOISE_SVG_URI}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
      } as unknown as ViewStyle)
    : null;

// CSS `linear-gradient(165deg, …)` translated to unit coordinates: the
// gradient line points 165° clockwise from north, i.e. (sin165°, -cos165°) ≈
// (0.259, 0.966) — down and slightly right, through the center.
const GRADIENT_START = { x: 0.371, y: 0.017 };
const GRADIENT_END = { x: 0.629, y: 0.983 };

export function ScreenStage() {
  const color = useColor();
  // Instance-unique SVG gradient ids: tab screens stay mounted concurrently,
  // and duplicate ids break url(#…) refs on web once other screens adopt the
  // stage. useId's colons are stripped — they're invalid in url() references.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const poolAId = `stage-pool-a-${uid}`;
  const poolBId = `stage-pool-b-${uid}`;
  const hasPoolB = color.stagePoolB !== 'transparent';

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[color.stage0, color.stage1, color.stage2]}
        locations={[0, 0.52, 1]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Circular gradients in objectBoundingBox units stretch to each
              ellipse's box, giving the elliptical falloff of the CSS
              radial-gradient(90% 58% at …) originals. The end stop reuses the
              pool color at opacity 0 so the fade never shifts hue. */}
          <RadialGradient id={poolAId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color.stagePoolA} />
            <Stop offset="0.64" stopColor={color.stagePoolA} stopOpacity="0" />
          </RadialGradient>
          {hasPoolB ? (
            <RadialGradient id={poolBId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color.stagePoolB} />
              <Stop offset="0.62" stopColor={color.stagePoolB} stopOpacity="0" />
            </RadialGradient>
          ) : null}
        </Defs>
        <Ellipse cx="14%" cy="4%" rx="90%" ry="58%" fill={`url(#${poolAId})`} />
        {hasPoolB ? (
          <Ellipse cx="88%" cy="98%" rx="86%" ry="54%" fill={`url(#${poolBId})`} />
        ) : null}
      </Svg>
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.noise, WEB_NOISE_STYLE]} />
      ) : (
        <Image
          source={require('../../../assets/textures/noise-128.png')}
          resizeMode="repeat"
          fadeDuration={0}
          style={[StyleSheet.absoluteFill, styles.noise]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noise: { opacity: 0.025 },
});
