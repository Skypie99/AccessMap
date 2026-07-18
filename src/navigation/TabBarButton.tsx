import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useColor } from '@/theme/ThemeContext';
import { hapticSelection } from '@/lib/haptics';

/**
 * Custom bottom-tab button (BP11 / T3): the tab bar joins the one press
 * vocabulary. A press fires the selection haptic and paints the nav-chrome
 * pressed dim — color.headerBtnBgPressed, the same translucent tint the header
 * Feedback button uses — over the frosted bar. Dim-only, no scale: a full tab
 * cell shouldn't bounce.
 *
 * Every injected semantic prop is forwarded verbatim so the tab keeps its
 * accessibilityRole="tab" + accessibilityState.selected for screen readers
 * (the load-bearing invariant, guarded in __tests__/tabBarButton.a11y.test.tsx).
 * The dim is a static backgroundColor swap — no Animated node — so it survives
 * Reduce Motion by construction, and the haptic is OS-governed / RM-independent.
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
  const color = useColor();
  const [pressed, setPressed] = useState(false);
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
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[style, pressed && { backgroundColor: color.headerBtnBgPressed }]}
    >
      {children}
    </Pressable>
  );
}
