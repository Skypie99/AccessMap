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
 * WCAG 2.3.3: the scale animation is gated behind useReducedMotion() — under
 * Reduce Motion the control stays at rest and only the haptic + onPress fire.
 * Pass a STATIC style (object/array), not the ({pressed}) => … function form;
 * press feedback is carried by the scale, so a pressed-opacity style is redundant.
 */
import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { motion } from '@/theme';
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
}

export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  haptic = 'selection',
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedPressable
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e: GestureResponderEvent) => {
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
        if (!reducedMotion) {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            ...motion.spring.pressOut,
          }).start();
        }
        onPressOut?.(e);
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
}
