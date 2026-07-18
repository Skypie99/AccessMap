import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { font, motion, radius, shadow, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/lib/accessibility';
import { type LiveStatus, clearLiveStatus, subscribeLiveStatus } from '@/lib/liveStatus';
import {
  LIVE_STATUS_OCCUPANT,
  LIVE_STATUS_PRIORITY,
  computeLedgeTop,
  useHeaderHeight,
  useOccupantSlot,
} from '@/lib/statusLedge';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

/**
 * The single, persistently-mounted, VISIBLE + live status region that S10
 * (submit "Report filed") and S11 (read "Still trying — check your signal")
 * both deliver through. Mounted once at the app root ABOVE the auth/session
 * branch (`App.tsx`, beside `<A11yLiveRegion/>`) so the guest-web cohort has it.
 *
 * Persistent-mount contract: the `aria-live` wrapper `View` is ALWAYS rendered
 * (present-but-empty when idle) — TEXT MUTATION, not node insertion, is what a
 * browser screen reader observes (the reason FlashBanner, which returns `null`
 * when idle, does NOT reliably announce on web). This region stands alone: it
 * carries its own live region and its own native announce, so it does NOT
 * depend on S9's announce-shim.
 *
 * Announcement is decoupled from motion (PROTECT-7): it fires even under Reduce
 * Motion; only the entrance animation is RM-gated.
 */

// Web-only DOM live-region attrs, forwarded by react-native-web. Using `aria-*`
// directly (not `accessibilityLiveRegion`) avoids rn-web's dev warning — same
// choice as A11yLiveRegion. "polite" matches the app's deliberate FlashBanner
// posture: confirmations wait for current speech, they don't interrupt.
const WEB_LIVE_PROPS = { 'aria-live': 'polite', 'aria-atomic': 'true' } as const;
const LIVE_PROPS =
  Platform.OS === 'web'
    ? (WEB_LIVE_PROPS as object)
    : ({ accessibilityLiveRegion: 'polite' } as const);

export default function LiveStatusRegion() {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };

  const [status, setStatus] = useState<LiveStatus | null>(null);
  // Hold the last status through the exit animation so the pill doesn't vanish
  // mid-fade; the aria-live WRAPPER stays mounted regardless.
  const [display, setDisplay] = useState<LiveStatus | null>(null);
  const [rendered, setRendered] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  // BP12 (T6): dock the pill below the focused editorial header, and stack below
  // any higher-priority status vehicle instead of superimposing. headerHeight
  // null (Map, or a screen with no plain header) → today's exact placement.
  // Registering keyed on `rendered` keeps the slot reserved through the exit
  // fade, so an arriving pill never overlaps this one mid-animation.
  const headerHeight = useHeaderHeight();
  const slot = useOccupantSlot(LIVE_STATUS_OCCUPANT, LIVE_STATUS_PRIORITY, rendered);

  useEffect(() => subscribeLiveStatus(setStatus), []);

  // Speak the message the moment it appears (iOS VoiceOver — the real API;
  // web goes through the aria-live wrapper below). Keyed on `key` so an
  // identical message re-announces.
  useEffect(() => {
    if (status && Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(status.message);
    }
    // A new status is always a new object with a new key, so this re-runs once
    // per status (re-announcing an identical repeated message).
  }, [status]);

  // Auto-dismiss (S10 success). S11's "still trying" omits autoDismissMs and
  // persists until the read settles calls clearLiveStatus().
  useEffect(() => {
    if (status?.autoDismissMs) {
      const t = setTimeout(() => clearLiveStatus(), status.autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [status]);

  // Entrance / exit animation, reduced-motion gated (PROTECT-7).
  useEffect(() => {
    if (status) {
      setDisplay(status);
      setRendered(true);
      if (reducedMotion) {
        progress.setValue(1);
      } else {
        Animated.spring(progress, { toValue: 1, useNativeDriver: true, ...motion.spring.sheet }).start();
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
    // React to status/reduced-motion changes, not to the `rendered` toggle.
  }, [status?.key, status == null, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });
  // Zero-width-space toggle on parity so two identical messages still read as a
  // DOM text change and re-announce on web (mirrors A11yLiveRegion).
  const spoken =
    display && rendered ? (display.key % 2 === 0 ? display.message : display.message + '​') : '';

  // The aria-live WRAPPER is ALWAYS mounted (empty when idle). box-none so the
  // idle region never intercepts taps on the screen beneath it.
  return (
    <View
      style={[styles.wrap, { top: computeLedgeTop(insets.top, headerHeight, slot) }]}
      pointerEvents="box-none"
      {...LIVE_PROPS}
    >
      {rendered && display ? (
        <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
          <View
            style={[styles.pill, display.tone === 'info' ? styles.pillInfo : styles.pillSuccess]}
            // The message text carrier — this is what the aria-live wrapper
            // announces on web (text mutation on an always-mounted region).
            accessibilityRole="text"
          >
            <AppText variant="label" style={styles.text}>
              {spoken}
            </AppText>
            {display.action ? (
              <Pressable
                onPress={display.action.onPress}
                style={styles.action}
                accessibilityRole="button"
                accessibilityLabel={display.action.label}
                hitSlop={8}
              >
                <AppText variant="label" style={styles.actionText}>
                  {display.action.label}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 50,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.circle,
      minHeight: 44,
      maxWidth: '92%',
      ...shadow.e3,
    },
    pillSuccess: { backgroundColor: color.successStrong },
    pillInfo: { backgroundColor: color.ctaFill },
    text: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.base,
      letterSpacing: 0.2,
      flexShrink: 1,
    },
    // Inline action (Retry): a 44pt-tall pressable pill on the banner.
    // Dark scrim (0,0,0,0.25) not a light wash — white actionText was 3.21/3.54/
    // 2.54 over the 0.22 white fill; darkening the chip restores AA on the pill.
    action: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    actionText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.base,
    },
  });
