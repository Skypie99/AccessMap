import React from 'react';
import { PlatformPressable } from '@react-navigation/elements';
import { type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { hapticSelection } from '@/lib/haptics';

/**
 * Custom bottom-tab button (BP11 / T3): the tab bar joins the one press
 * vocabulary. A press fires the selection haptic — the answer the tab bar was
 * missing.
 *
 * It does NOT add a visual press dim. The bottom-tab labels sit right at the AA
 * floor (the inactive slate is ~4.8:1 at rest), so ANY pressed background tint
 * drops them below 4.5:1 — the arbiter proves it (light inactive 3.81:1, dark
 * active 4.03:1, dark inactive 4.37:1 with color.headerBtnBgPressed). A dim and
 * legible labels can't coexist on this bar, and legibility wins. The press is
 * answered by the haptic (OS-governed, RM-independent) plus the tab's own
 * visible active-state switch on tap.
 *
 * Built on React Navigation's own PlatformPressable — the SAME component the
 * default tab button uses — so every injected prop is forwarded verbatim via
 * {...rest}: the load-bearing `aria-selected` (v7 passes the current-tab signal
 * as aria-selected, NOT accessibilityState — dropping it would stop screen
 * readers announcing which tab is active), plus aria-label, role, and the web
 * href link semantics. We only (a) add the haptic on press and (b) disable
 * PlatformPressable's own visual feedback — pressOpacity 1 kills its default
 * group-opacity dip (0.3), pressColor transparent kills the Android ripple — so
 * the tab is genuinely haptic-only, no group opacity, RM-safe.
 *
 * Registered globally at Tab.Navigator screenOptions.tabBarButton. Hidden routes
 * (FullMap / Settings / Admin) keep their per-screen `tabBarButton: () => null`
 * — per-screen options override screenOptions, so they still render nothing.
 *
 * Extracted from RootNavigator so it can be unit-tested in isolation without
 * pulling the whole screen/provider graph.
 */
export function TabBarButton({ onPress, ...rest }: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...rest}
      pressOpacity={1}
      pressColor="transparent"
      onPress={(e) => {
        hapticSelection();
        onPress?.(e);
      }}
    />
  );
}
