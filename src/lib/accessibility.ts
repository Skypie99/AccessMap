import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Spread onto a purely decorative View/Text that screen readers should
 * skip. Suppresses the element and its subtree from the accessibility tree.
 *
 * Usage:
 *   <Text {...decorativeProps}>★</Text>
 *
 * Do NOT use on Pressable/TouchableOpacity buttons — those need their own
 * explicit accessible/role handling.
 */
export const decorativeProps = {
  accessible: false,
  importantForAccessibility: 'no-hide-descendants' as const,
  accessibilityElementsHidden: true,
} as const;

/**
 * `true` if VoiceOver / TalkBack / a generic screen reader is currently on.
 * Returns the live value: re-renders the caller when the user toggles their
 * screen reader mid-session.
 *
 * Used by MapScreen to auto-open the accessible list view, and is the natural
 * home for any future "is the user using assistive tech?" branches.
 */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (!cancelled) setEnabled(value);
      })
      .catch(() => {
        // Web / unsupported platforms reject — treat as "not on" so the
        // sighted-user experience stays the default fallback.
      });

    const sub = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (value) => {
        setEnabled(value);
      },
    );

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return enabled;
}
