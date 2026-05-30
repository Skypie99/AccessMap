import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/lib/accessibility';
import { useColor } from '@/theme/ThemeContext';

interface RealtimePulseProps {
  connected: boolean;
}

const DOT_SIZE = 10;

export function RealtimePulse({ connected }: RealtimePulseProps) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  const dotColor = connected ? color.success : color.textSubtle;

  useEffect(() => {
    if (!connected || reducedMotion) {
      // WCAG 2.3.3: stop non-essential animation when reduced motion is requested.
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [connected, reducedMotion, opacity]);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      // WCAG 4.1.3: announce connection state changes as status messages so
      // VoiceOver / TalkBack users learn when realtime goes offline without
      // having to find and focus this indicator manually.
      accessibilityLiveRegion="polite"
      accessibilityLabel={connected ? 'Realtime connected' : 'Realtime disconnected'}
    >
      <Animated.View
        style={[styles.dot, { backgroundColor: dotColor, opacity }]}
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
