import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import { type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { hapticSelection } from '@/lib/haptics';
import { decorativeProps } from '@/lib/accessibility';
import { radius, spacing } from '@/theme';
import {
  FLOATING_TAB_BAR_CONTROL_BOTTOM_PADDING,
  FLOATING_TAB_BAR_SELECTED_FILL_WIDTH,
} from './tabBarGeometry';

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
 *
 * VP1 (2026-08-29): the selected tab also wears a soft rounded wash behind its
 * icon+label, sized to the content rather than the full segment, so selection
 * reads at a glance. Reuses `color.glassSelectedTint` — the same
 * selection-wash token already shipped on Tasks rows and the report-flag
 * option list — instead of `shadow.glowBrand`, which DESIGN.md §5/§12
 * reserves for Prominent brand/reward surfaces and explicitly says must never
 * signal state.
 *
 * VP1 fix3 (Sky): the selected tab used to carry a THIRD signal — a 2pt
 * underline — alongside this chip and the OS-level active tint
 * (tabBarActiveTintColor, applied by React Navigation itself to the icon and
 * label). Three simultaneous signals read as busy; the underline was the
 * redundant one and is gone. Selection is now chip + ink only, verified against
 * real iOS in both themes (see the VP1 fix3 report) before removal shipped.
 */
interface TabBarButtonProps extends BottomTabBarButtonProps {
  /** Decorative divider after this segment (Home and Tasks only). */
  showDivider?: boolean;
  /** Keeps the crystal divider on the navigation token, not a raw color. */
  dividerInk?: string;
  /** Selection wash behind the active tab's icon+label (color.glassSelectedTint). */
  selectedFill?: string;
}

export function TabBarButton({
  onPress,
  children,
  style,
  showDivider = false,
  dividerInk,
  selectedFill,
  ...rest
}: TabBarButtonProps) {
  const selected = rest['aria-selected'] === true || rest.accessibilityState?.selected === true;
  return (
    <View style={[styles.segment, style]}>
      {selected ? (
        <View
          pointerEvents="none"
          style={[styles.selectedFill, selectedFill ? { backgroundColor: selectedFill } : null]}
          {...decorativeProps}
          testID="tab-segment-fill"
        />
      ) : null}
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
  // Hugs the icon+label content (not the full segment) so the wash reads as a
  // soft chip behind the active tab rather than a full-height highlight band.
  // VP1 fix2: a fixed width centered on the segment (left:50% + a matching
  // negative marginLeft, the same trick SignInScreen already uses) instead of
  // left/right insets — insets scale with the segment's own flex width, so on
  // wider devices the wash stretched into a band instead of staying a chip.
  selectedFill: {
    position: 'absolute',
    left: '50%',
    marginLeft: -(FLOATING_TAB_BAR_SELECTED_FILL_WIDTH / 2),
    width: FLOATING_TAB_BAR_SELECTED_FILL_WIDTH,
    top: spacing.xs,
    bottom: FLOATING_TAB_BAR_CONTROL_BOTTOM_PADDING + spacing.sm,
    borderRadius: radius.lg,
  },
});
