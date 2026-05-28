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

    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (value) => {
      setEnabled(value);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return enabled;
}

/**
 * `true` if the user has the system-level "Reduce Motion" preference on
 * (iOS: Settings → Accessibility → Motion → Reduce Motion; Android: Settings
 * → Accessibility → Remove animations). When this is on, callers should
 * suppress non-essential animations — map fly-tos, slide transitions,
 * onboarding paging — so motion-sensitive users (vestibular disorders,
 * migraine triggers) aren't forced through them. WCAG 2.3.3.
 *
 * Returns the live value: re-renders if the user toggles the preference
 * mid-session. Web/unsupported platforms quietly resolve to `false`.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancelled) setReduced(value);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(value);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduced;
}
