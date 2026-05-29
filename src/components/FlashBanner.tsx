import React, { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, shadow, spacing } from '@/theme';

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
 * ("+5 points!", "Saved.", etc.). Pure presentational — the parent owns
 * the message + onDismiss. Auto-dismisses after `durationMs` to keep the
 * UI clean, and is also tap-to-dismiss so a screen-reader user who lands
 * on it has an explicit close path.
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
  // Speak the message the moment it appears, in case the user isn't
  // looking at the top of the screen. The visible banner is the
  // visual-channel half of the same announcement.
  useEffect(() => {
    if (message) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={onDismiss}
        style={[styles.pill, tone === 'info' ? styles.pillInfo : styles.pillSuccess]}
        accessibilityRole="button"
        accessibilityLabel={message}
        accessibilityHint="Tap to dismiss"
      >
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  pillSuccess: { backgroundColor: '#1e8449' }, // deeper-than-success green for AA on white text
  pillInfo: { backgroundColor: color.brand },
  text: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.base,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
