import React from 'react';
import { Pressable } from 'react-native';
import { type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { hapticSelection } from '@/lib/haptics';

/**
 * Custom bottom-tab button (BP11 / T3): the tab bar joins the one press
 * vocabulary. A press fires the selection haptic — the answer the tab bar was
 * missing.
 *
 * It does NOT carry the fill-swap dim the rest of the estate uses. The bottom-
 * tab labels sit right at the AA floor (the inactive slate is ~4.8:1 at rest),
 * so ANY pressed background tint drops them below 4.5:1 — the arbiter proves it
 * (light inactive 3.81:1, dark active 4.03:1, dark inactive 4.37:1 with
 * color.headerBtnBgPressed). A dim and legible labels can't coexist on this bar,
 * and legibility wins. The press is answered by the haptic (OS-governed,
 * RM-independent) plus the tab's own visible active-state switch on tap.
 *
 * Every injected semantic prop is forwarded verbatim so the tab keeps its
 * accessibilityRole="tab" + accessibilityState.selected for screen readers
 * (the load-bearing invariant, guarded in __tests__/tabBarButton.a11y.test.tsx).
 *
 * Registered globally at Tab.Navigator screenOptions.tabBarButton. Hidden routes
 * (FullMap / Settings / Admin) keep their per-screen `tabBarButton: () => null`
 * — per-screen options override screenOptions, so they still render nothing.
 *
 * Extracted from RootNavigator so it can be unit-tested in isolation without
 * pulling the whole screen/provider graph.
 */
export function TabBarButton({
  children,
  style,
  onPress,
  onLongPress,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
  testID,
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole ?? 'tab'}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={(e) => {
        hapticSelection();
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      style={style}
    >
      {children}
    </Pressable>
  );
}
