/**
 * PressableScale — the design-system press language as a drop-in <Pressable>.
 *
 * Applies the same crafted press feedback the Button primitive uses — a gentle
 * scale-down on press-in (spring) that springs back on release, plus an optional
 * haptic — so custom-styled controls (triage buttons, the FAB, chips) all respond
 * identically instead of being inert.
 *
 * Built on Animated.createAnimatedComponent(Pressable) so it's a true drop-in:
 * there's no wrapper View, so it occupies the exact same layout box as a plain
 * <Pressable> (flex children keep working). The scale lives on the element's own
 * transform.
 *
 * PRESS ACKNOWLEDGMENT — the "one press vocabulary" (BP11): the element also
 * carries an internal static pressed/hover dim. It is a FILL-SWAP of the element's
 * own backgroundColor to a house token (default color.borderPressed) — never a
 * group opacity — so label and icon children stay at full opacity and AA-legible
 * on the dimmed fill. This dim is the *truth* layer: it is static (no Animated
 * node) and therefore SURVIVES Reduce Motion by construction. WCAG 2.3.3 gates
 * only the scale spring — the *garnish*. Haptics are OS-governed and fire
 * independently of reduce-motion.
 *
 * On active / brand-filled controls, greying to the neutral fill would break
 * contrast (e.g. a white label on the light pressed grey). For those, pass
 * dimOnPress={false}, or redirect the dim into the same colour family with
 * pressedTint (e.g. color.brandText to deepen a brand-filled button). An active
 * brand chip is never greyed.
 */
import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import { motion } from '@/theme';
import { useColor } from '@/theme/ThemeContext';
import { useReducedMotion } from '@/lib/accessibility';
import { hapticImpact, hapticSelection } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Press-in scale target. Default 0.97 (matches Button). */
  scaleTo?: number;
  /** Haptic on press. 'selection' (default) | 'light' | 'medium' | 'heavy' | 'none'. */
  haptic?: 'selection' | 'light' | 'medium' | 'heavy' | 'none';
  /**
   * House pressed/hover dim — a backgroundColor fill-swap; ink stays full opacity.
   * Default true. Set false on active / brand-filled controls where greying to the
   * neutral fill would fail contrast (an active brand chip is never greyed).
   */
  dimOnPress?: boolean;
  /**
   * Override the dim fill colour. Default color.borderPressed (neutral chrome).
   * Over the live map use color.overlayBtnPressed; to deepen a brand fill instead
   * of greying it, pass a darker in-family colour (e.g. color.brandText).
   */
  pressedTint?: string;
}

/**
 * G5 — the ref is forwarded so a PressableScale can be a focus-RETURN target:
 * `useSurfaceTrigger` needs a node handle for the control that opened a surface,
 * so it can hand the screen-reader cursor back there on dismissal (WCAG 2.4.3).
 *
 * Why forward a ref instead of wrapping each trigger in a <View ref>: Android's
 * NativeViewHierarchyOptimizer DELETES layout-only Views, so a tag taken from a
 * wrapper could resolve to a view that no longer exists — a silent failure
 * visible only on a device. And PressableScale IS the button (there is no
 * wrapper View by construction, see above), so the ref must point at the real
 * accessibility element. House precedent: ui/AppText is already a forwardRef.
 *
 * The inner function is NAMED on purpose — an anonymous one trips
 * react/display-name, and this repo's lint warning count is a gate.
 */
export const PressableScale = React.forwardRef<View, PressableScaleProps>(function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  haptic = 'selection',
  dimOnPress = true,
  pressedTint,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...rest
}, ref) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const tint = pressedTint ?? color.borderPressed;

  return (
    <AnimatedPressable
      ref={ref}
      style={[
        style,
        // Static fill-swap — no Animated node, so it survives Reduce Motion.
        dimOnPress && (pressed || hovered) ? { backgroundColor: tint } : null,
        { transform: [{ scale }] },
      ]}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        if (!reducedMotion) {
          Animated.spring(scale, {
            toValue: scaleTo,
            useNativeDriver: true,
            ...motion.spring.press,
          }).start();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        if (!reducedMotion) {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            ...motion.spring.pressOut,
          }).start();
        }
        onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        setHovered(true);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        onHoverOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        // Haptics are an OS-level concern, honored independently of reduce-motion.
        if (haptic === 'selection') hapticSelection();
        else if (haptic !== 'none') hapticImpact(haptic);
        onPress?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
