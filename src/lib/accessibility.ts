import { type Component, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, type AccessibilityState, findNodeHandle } from 'react-native';

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
  // Web: react-native-web does not derive aria-hidden from accessible={false},
  // so a decorative <Image> without alt still announces "image". This keeps the
  // element and its subtree out of the browser accessibility tree. (Tasks used
  // to open its screen reader traversal on a bare "image".)
  'aria-hidden': true,
} as const;

/** The flat ARIA aliases `a11yToggle` emits alongside `accessibilityState`. */
type FlatAriaState = {
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-expanded'?: boolean;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
};

/**
 * Emit selection/toggle state so BOTH native AND web screen readers hear it.
 *
 * `react-native-web@0.21.2` does not translate the nested `accessibilityState`
 * dialect into DOM ARIA attributes, so on web (the only surface a guest has) a
 * screen reader can't hear "selected / checked / expanded / busy / disabled".
 * This returns the original `accessibilityState` UNCHANGED (native keeps working
 * exactly as before) PLUS the flat `aria-*` aliases derived from the same values
 * — which rn-web DOES render. On native the flat props map to the same traits,
 * so there is no regression; they are purely additive (adoption, not redesign).
 *
 * Usage — replace:
 *   accessibilityState={{ selected, disabled }}
 * with:
 *   {...a11yToggle({ selected, disabled })}
 */
export function a11yToggle(
  state: AccessibilityState = {},
): { accessibilityState: AccessibilityState } & FlatAriaState {
  const flat: FlatAriaState = {};
  if (state.selected !== undefined) flat['aria-selected'] = state.selected;
  if (state.checked !== undefined) flat['aria-checked'] = state.checked;
  if (state.expanded !== undefined) flat['aria-expanded'] = state.expanded;
  if (state.busy !== undefined) flat['aria-busy'] = state.busy;
  if (state.disabled !== undefined) flat['aria-disabled'] = state.disabled;
  return { accessibilityState: state, ...flat };
}

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
 * mid-session. On react-native-web this is LIVE, not a stub:
 * `AccessibilityInfo.isReduceMotionEnabled()` resolves from the
 * `prefers-reduced-motion` media query (it resolves — it does NOT reject), so
 * `reducedMotion` is a real signal on web and the map camera's RM gating is
 * load-bearing there (a `duration: 0` "instant" that Leaflet treats as falsy
 * really does fire the long default flight for web RM users — see
 * PlatformMap.web.tsx). Only genuinely unsupported platforms fall back to
 * `false` via the `.catch` below.
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
