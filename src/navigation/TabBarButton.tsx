import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import { type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { hapticSelection } from '@/lib/haptics';
import { decorativeProps } from '@/lib/accessibility';

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
interface TabBarButtonProps extends BottomTabBarButtonProps {
  /** Decorative divider after this segment (Home and Tasks only). */
  showDivider?: boolean;
  /** Mirrors the navigator's contrast-safe active ink for the underline. */
  activeInk?: string;
  /** Keeps the crystal divider on the navigation token, not a raw color. */
  dividerInk?: string;
}

export function TabBarButton({
  onPress,
  children,
  style,
  showDivider = false,
  activeInk,
  dividerInk,
  ...rest
}: TabBarButtonProps) {
  const selected = rest['aria-selected'] === true || rest.accessibilityState?.selected === true;
  return (
    <View style={[styles.segment, style]}>
      <PlatformPressable
        {...rest}
        style={styles.pressable}
        pressOpacity={1}
        pressColor="transparent"
        onPress={(e) => {
          hapticSelection();
          onPress?.(e);
        }}
      >
        {children}
      </PlatformPressable>
      {showDivider ? (
        <View
          pointerEvents="none"
          style={[styles.divider, dividerInk ? { borderRightColor: dividerInk } : null]}
          {...decorativeProps}
          testID="tab-segment-divider"
        />
      ) : null}
      {selected ? (
        <View
          pointerEvents="none"
          style={[styles.selectedUnderline, activeInk ? { borderTopColor: activeInk } : null]}
          {...decorativeProps}
          testID="tab-segment-underline"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flex: 1, position: 'relative' },
  pressable: { flex: 1 },
  divider: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    right: 0,
    width: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  selectedUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopWidth: 2,
  },
});
