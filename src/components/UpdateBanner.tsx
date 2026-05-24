/**
 * UpdateBanner — shows when one or more of the user's tracked flags
 * (own reports + watched) have changed status since their last visit.
 *
 * Pure presentation: the parent computes the count, decides when to
 * render the banner, and handles the dismiss / view actions. The banner
 * is dismissible (✕) and tappable (View). Both actions tell the parent
 * to mark all tracked flags as "seen" so the banner doesn't re-appear
 * for the same changes.
 *
 * Accessibility: role=alert + live region polite so VoiceOver announces
 * the count when the banner first appears, without interrupting other
 * speech.
 */
import React from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color } from '@/theme';

interface Props {
  count: number;
  /** Tap on the main "View" pill — usually opens the Activity Feed. */
  onView: () => void;
  /** Tap the ✕ — hides the banner and marks all as seen. */
  onDismiss: () => void;
}

export default function UpdateBanner({ count, onView, onDismiss }: Props) {
  // Announce the count once when the banner mounts so screen-reader users
  // hear it even if they aren't focused on the top of the screen.
  React.useEffect(() => {
    if (count <= 0) return;
    const message =
      count === 1
        ? '1 of your flags has a status update since your last visit.'
        : `${count} of your flags have status updates since your last visit.`;
    // The announce call is best-effort — if TalkBack/VoiceOver isn't
    // running it's a no-op.
    AccessibilityInfo.announceForAccessibility(message);
  }, [count]);

  if (count <= 0) return null;

  const label =
    count === 1
      ? '1 update since your last visit'
      : `${count} updates since your last visit`;

  return (
    <View
      style={styles.banner}
      // Use a polite live region on Android (announces non-intrusively)
      // and the explicit announceForAccessibility above on iOS. Dropped
      // accessibilityRole="alert" because alerts are semantically
      // assertive — combining with polite was contradictory (QA #8).
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
        🔔
      </Text>
      <Text style={styles.text}>{label}</Text>
      <Pressable
        onPress={onView}
        style={({ pressed }) => [styles.viewBtn, pressed && styles.viewBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={`View ${count} ${count === 1 ? 'update' : 'updates'}`}
        accessibilityHint="Opens the Activity Feed and marks these updates as seen"
      >
        <Text style={styles.viewBtnText}>View</Text>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Dismiss updates banner"
        accessibilityHint="Hides the banner and marks all updates as seen"
      >
        <Text style={styles.dismissText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.brandSofter,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#c7defb',
    marginBottom: 12,
  },
  icon: { fontSize: 18 },
  text: { flex: 1, fontSize: 14, color: color.brandTextAlt, fontWeight: '600' },
  viewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: color.brand,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnPressed: { backgroundColor: '#1c5fc0' },
  viewBtnText: { color: color.textOnBrand, fontWeight: '700', fontSize: 13 },
  dismissBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnPressed: { backgroundColor: '#d3e3f5' },
  dismissText: { fontSize: 14, color: color.brandTextAlt, fontWeight: '700' },
});
