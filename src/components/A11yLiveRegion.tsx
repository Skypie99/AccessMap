import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { installWebAnnounceShim, subscribeAnnounce } from '@/lib/announce';

/**
 * A single, persistently-mounted, visually-hidden `aria-live` region (S9,
 * facet b). On web this is the ONLY thing that makes `announceForAccessibility`
 * audible — react-native-web's imperative API is a no-op, so a rendered live
 * region whose **text mutates** is the sole mechanism a browser screen reader
 * honours. Mounted once at the app root, above the auth/session branch, so the
 * guest-web map path (web IS guest mode) has it too.
 *
 * Renders nothing on native — iOS VoiceOver / Android TalkBack use the real
 * `AccessibilityInfo` API untouched.
 */

// Web-only DOM attributes. Passed through by react-native-web (`aria-live` and
// `aria-atomic` are forwarded props); cast to `any` because they are not part
// of React Native's core View prop types. Using `aria-live` directly (rather
// than the deprecated `accessibilityLiveRegion`) avoids rn-web's dev warning.
const WEB_LIVE_PROPS = { 'aria-live': 'polite', 'aria-atomic': 'true' } as const;

export default function A11yLiveRegion() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    installWebAnnounceShim();
    let flip = false;
    const unsub = subscribeAnnounce((m) => {
      // Toggle a trailing zero-width space so two identical messages in a row
      // still register as a DOM text change and re-announce.
      flip = !flip;
      setMessage(flip ? m + '​' : m);
    });
    return unsub;
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.srOnly} pointerEvents="none" {...(WEB_LIVE_PROPS as object)}>
      <Text>{message}</Text>
    </View>
  );
}

// Visually hidden but present in the DOM + accessibility tree (the classic
// sr-only clip). Not `display:none`/`opacity:0`, which some screen readers drop.
const styles = StyleSheet.create({
  srOnly: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
});
