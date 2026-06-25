import { type Component, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';

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
 * Moves the screen-reader cursor onto the returned ref's element when `active`
 * flips true — i.e. when a modal opens. Without this the cursor stays on the
 * control that opened the modal (often behind it), so screen-reader users don't
 * know the modal appeared (WCAG 2.4.3 Focus Order).
 *
 * Attach the returned ref to the modal's title element (a host component such as
 * the title <Text>/AppText or a header <View>). A small delay lets the modal
 * present/animate in before focus moves. Safe everywhere: if the element isn't
 * mounted (or on platforms without a native handle) it's a no-op.
 *
 * Usage:
 *   const titleRef = useFocusOnOpen<Text>(visible);
 *   <AppText ref={titleRef} variant="heading" accessibilityRole="header">Title</AppText>
 */
export function useFocusOnOpen<T extends Component>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => {
      const node = ref.current ? findNodeHandle(ref.current) : null;
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    }, 150);
    return () => clearTimeout(id);
  }, [active]);

  return ref;
}

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

/**
 * `true` if the user has the system-level "Reduce Transparency" preference on
 * (iOS: Settings → Accessibility → Display & Text Size → Reduce Transparency).
 * When this is on, decorative blur / translucency should be replaced with a
 * solid surface so contrast and legibility are never compromised. Used by the
 * `GlassSurface` primitive to drop its frosted-glass blur for an opaque fill.
 *
 * Returns the live value: re-renders if the user toggles the preference
 * mid-session. Android / web have no equivalent and quietly resolve to `false`
 * (the GlassSurface still keeps an AA-contrast translucent floor regardless).
 */
export function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((value) => {
        if (!cancelled) setReduced(value);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => {
      setReduced(value);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduced;
}
