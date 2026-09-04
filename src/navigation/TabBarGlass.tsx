import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReduceTransparency } from '@/lib/accessibility';
import {
  FLOATING_TAB_BAR_CAPSULE_RADIUS,
  FLOATING_TAB_BAR_CAPSULE_SIDE_INSET,
} from './tabBarGeometry';

/**
 * Floating glass background for the native bottom tab bar. VP1 fix3: the
 * capsule now spans the FULL bar container — the 68pt control band AND the
 * bottom safe-area strip below it — so the material is grounded flush to the
 * device edge instead of floating above a transparent gap. Button content
 * still lives entirely inside the top 68pt band (TabBarButton/tabBarStyle are
 * unchanged), so nothing sits under the home indicator; only the visual
 * material now occupies that inset. Android retains the established blur +
 * opaque-floor recipe and Reduce Transparency remains entirely opaque.
 */
export function TabBarGlass() {
  const color = useColor();
  const reduceTransparency = useReduceTransparency();
  const liquidGlass = Platform.OS === 'ios' && !reduceTransparency;
  if (reduceTransparency) {
    // Preserve the established full-band opaque fallback. The transparent
    // safe-area treatment is intentionally limited to normal iOS liquid glass.
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: color.tabBarBg }]} />;
  }
  if (!liquidGlass) {
    // Android retains its existing blur + opaque-floor composition.
    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView intensity={24} tint={color.tabBarBlurTint as 'light' | 'dark'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.tabBarGlassFloor }]} />
      </View>
    );
  }
  return (
    <View style={[tabBarGlassStyles.capsule, { borderColor: color.navBorder }]}>
      <BlurView intensity={24} tint={color.tabBarBlurTint as 'light' | 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[color.glassMapCrystal0, color.glassMapCrystal1]}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[tabBarGlassStyles.highlight, { backgroundColor: color.glassRowSpecular }]}
      />
    </View>
  );
}

export const tabBarGlassStyles = StyleSheet.create({
  capsule: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: FLOATING_TAB_BAR_CAPSULE_SIDE_INSET,
    right: FLOATING_TAB_BAR_CAPSULE_SIDE_INSET,
    overflow: 'hidden',
    borderRadius: FLOATING_TAB_BAR_CAPSULE_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: spacing.sm,
    right: spacing.sm,
    height: StyleSheet.hairlineWidth,
  },
});

export function liquidTabInk(color: ColorTheme, reduceTransparency: boolean) {
  const usesLiquidTabBar = Platform.OS === 'ios' && !reduceTransparency;
  return {
    active: usesLiquidTabBar
      ? color.scheme === 'light' ? color.brandTextAlt : color.inkSelect
      : color.tabBarActiveTint,
    inactive: usesLiquidTabBar ? color.textStrong : color.tabBarInactiveTint,
  };
}
