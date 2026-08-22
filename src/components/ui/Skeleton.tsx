/**
 * Skeleton — content-shaped loading placeholders.
 *
 * A premium alternative to bare spinners: render the shape of the content
 * that's loading. `Skeleton` is the base box; `SkeletonRow` and `SkeletonCard`
 * are composed presets for list rows and FlagCard-shaped rows.
 *
 * Motion: a gentle opacity pulse via Animated.loop, gated by useReducedMotion
 * (static at 0.5 opacity when the user prefers reduced motion — WCAG 2.3.3).
 * Always hidden from assistive tech (placeholders carry no information).
 *
 * Generalizes the private SkeletonRow that lived in LeaderboardScreen.
 * Design system 2026-06-01.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PixelRatio,
  StyleSheet,
  View,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { decorativeProps, useReducedMotion } from '@/lib/accessibility';
import { font, motion, radius, spacing } from '@/theme';

export interface SkeletonProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = radius.xs, style }: SkeletonProps) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(reducedMotion ? 0.5 : 1)).current;

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0.5);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: motion.duration.pulse, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: motion.duration.pulse, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [reducedMotion, pulse]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius, backgroundColor: color.surfaceNeutral, opacity: pulse },
        style,
      ]}
    />
  );
}

/**
 * The placeholder's line box, at the reader's text size.
 *
 * The bars were pinned to the UNSCALED `font.size.base` / `.sm`, so at
 * accessibility sizes the skeleton was drawn at the shape of a row nobody was
 * about to get: three short bars, then a jump to rows two or three times taller
 * when the data landed. A placeholder that lies about the size of what is
 * coming is worse than no placeholder — the jump is the thing skeletons exist
 * to avoid (banners-and-primitives §11.2).
 *
 * `PixelRatio.getFontScale()` is read at render (not subscribed) deliberately:
 * a text-size change on iOS restarts the JS anyway, and a skeleton lives for a
 * second or two.
 */
function scaledLine(size: number): number {
  return Math.round(size * PixelRatio.getFontScale());
}

/** List-row placeholder: leading circle + two stacked text lines. */
export function SkeletonRow() {
  return (
    <View
      style={styles.row} {...decorativeProps}
    >
      <Skeleton width={36} height={36} borderRadius={radius.circle} />
      <View style={styles.lines}>
        <Skeleton width="60%" height={scaledLine(font.size.base)} />
        <Skeleton width="40%" height={scaledLine(font.size.sm)} />
      </View>
    </View>
  );
}

/** Card-row placeholder: square thumbnail + two text lines (FlagCard shape). */
export function SkeletonCard() {
  return (
    <View
      style={styles.card} {...decorativeProps}
    >
      <Skeleton width={56} height={56} borderRadius={radius.md} />
      <View style={styles.lines}>
        <Skeleton width="70%" height={scaledLine(font.size.base)} />
        <Skeleton width="45%" height={scaledLine(font.size.sm)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  lines: { flex: 1, gap: spacing.sm },
});
