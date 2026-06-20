import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { font, motion, radius, shadow, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/lib/accessibility';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  /** Banner text. When null, the banner is hidden. */
  message: string | null;
  /** Called when the banner auto-dismisses or the user taps the close affordance. */
  onDismiss: () => void;
  /** Optional tone — defaults to "success" (green). */
  tone?: 'success' | 'info';
  /** Milliseconds before auto-dismiss. Defaults to 4000. */
  durationMs?: number;
}

/**
 * Floating top-of-screen flash banner used for transient confirmations
 * ("+10 points!", "Saved.", etc.). Pure presentational — the parent owns
 * the message + onDismiss. Auto-dismisses after `durationMs` to keep the
 * UI clean, and is also tap-to-dismiss so a screen-reader user who lands
 * on it has an explicit close path.
 *
 * The reward moment is the app's primary positive feedback, so it earns a
 * crafted entrance/exit: a gentle slide-down + fade, gated behind
 * useReducedMotion() (WCAG 2.3.3) — under Reduce Motion it snaps to its rest
 * state with no movement. `display` + `rendered` keep the text on screen
 * through the exit animation after the parent clears `message`.
 *
 * Lives in src/components/ so any screen can render it without lifting
 * state into App.tsx (today it's only used by App.tsx for the reporter
 * points toast, but the API is generic on purpose).
 */
export default function FlashBanner({
  message,
  onDismiss,
  tone = 'success',
  durationMs = 4000,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  // The text/mount persist through the exit animation: `display` holds the
  // last message, `rendered` keeps the node mounted until the out-animation ends.
  const [display, setDisplay] = useState<string | null>(message);
  const [rendered, setRendered] = useState<boolean>(message != null);

  // Speak the message the moment it appears, in case the user isn't looking at
  // the top of the screen. The visible banner is the visual-channel half.
  useEffect(() => {
    if (message) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);

  // Auto-dismiss timer — unchanged: keyed on the live message prop.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, onDismiss]);

  // Entrance / exit animation, reduced-motion gated.
  useEffect(() => {
    if (message) {
      setDisplay(message);
      setRendered(true);
      if (reducedMotion) {
        progress.setValue(1);
      } else {
        Animated.spring(progress, {
          toValue: 1,
          useNativeDriver: true,
          ...motion.spring.sheet,
        }).start();
      }
    } else if (rendered) {
      if (reducedMotion) {
        progress.setValue(0);
        setRendered(false);
      } else {
        Animated.timing(progress, {
          toValue: 0,
          duration: motion.duration.base,
          easing: Easing.bezier(...motion.easing.accelerate),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setRendered(false);
        });
      }
    }
    // `rendered` is intentionally omitted: this should react to message /
    // reduced-motion changes, not to its own mount toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, reducedMotion]);

  if (!rendered || !display) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });

  return (
    // accessibilityLiveRegion="polite" — screen readers announce the message
    // when this View's content changes (Android TalkBack). The
    // AccessibilityInfo.announceForAccessibility call above handles iOS
    // VoiceOver. "polite" so the announcement waits for current speech to
    // finish — flash banners are confirmations, not urgent alerts.
    <View style={styles.wrap} pointerEvents="box-none" accessibilityLiveRegion="polite">
      <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
        <Pressable
          onPress={onDismiss}
          style={[styles.pill, tone === 'info' ? styles.pillInfo : styles.pillSuccess]}
          accessibilityRole="button"
          accessibilityLabel={display}
          accessibilityHint="Tap to dismiss"
        >
          <AppText variant="label" style={styles.text}>{display}</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.circle,
    minHeight: 44,
    justifyContent: 'center',
    maxWidth: '90%',
    ...shadow.e3,
  },
  pillSuccess: { backgroundColor: color.successStrong },
  pillInfo: { backgroundColor: color.brand },
  text: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.base,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
