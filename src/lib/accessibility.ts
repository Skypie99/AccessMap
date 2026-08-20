import { type Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, type AccessibilityState, findNodeHandle, Platform } from 'react-native';

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
  'aria-pressed'?: boolean;
};

/** `a11yToggle`'s input: the standard RN state bag plus a web-only `pressed` intent. */
type ToggleState = AccessibilityState & { pressed?: boolean };

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
 *
 * `pressed` intent (toggle/selected chips with `accessibilityRole="button"`):
 * Chromium DROPS `aria-selected` from the accessibility tree on `role=button`,
 * so a chip that carries `{ selected }` looks selected visually but announces no
 * state to a web screen reader on focus/re-query. `aria-pressed` IS honored on
 * `role=button` (in every browser), so pass `{ pressed }` instead of `{ selected }`
 * on those chips. It emits `aria-pressed` for web AND mirrors the value into the
 * nested `accessibilityState.selected` so native VoiceOver still announces
 * "selected" exactly as before (no native change, no double-speak). `pressed` is
 * web-only — RN core has no `pressed` trait, so it never leaks onto native.
 *
 *   {...a11yToggle({ pressed: active, disabled: submitting })}
 */
export function a11yToggle(
  state: ToggleState = {},
): { accessibilityState: AccessibilityState } & FlatAriaState {
  // `pressed` intent: emit web-honored aria-pressed + mirror to the native
  // `selected` trait. Early return so the non-pressed path below still returns
  // the caller's `state` object by reference (identity relied on by tests).
  if (state.pressed !== undefined) {
    const { pressed, ...rest } = state;
    const flat: FlatAriaState = { 'aria-pressed': pressed };
    // Flags passed ALONGSIDE `pressed` (e.g. disabled while submitting) still
    // need their web aliases — do not drop them.
    if (rest.checked !== undefined) flat['aria-checked'] = rest.checked;
    if (rest.expanded !== undefined) flat['aria-expanded'] = rest.expanded;
    if (rest.busy !== undefined) flat['aria-busy'] = rest.busy;
    if (rest.disabled !== undefined) flat['aria-disabled'] = rest.disabled;
    return { accessibilityState: { ...rest, selected: pressed }, ...flat };
  }
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
 * ⚠ WEB IS SKIPPED BY DESIGN, AND THEN DEFENDED ANYWAY — the same two-layer
 * guard `useSurfaceTrigger` carries below, for the same reason. On
 * react-native-web `findNodeHandle` THROWS ("findNodeHandle is not supported on
 * web"), and `AccessibilityInfo.setAccessibilityFocus` is a stub with an empty
 * body there, so there is nothing to move even if the handle existed. Without
 * the skip this fired an uncaught error on EVERY open of EVERY dismissable
 * surface in the web build — observed live, four opens, four throws. It escaped
 * every gate because react-test-renderer implements `findNodeHandle` perfectly
 * well, so all 3,061 jest tests stayed green through it.
 *
 * This hook runs inside a timer rather than a press handler, so the throw could
 * not abort the tap the way the drawer regression did (ee8821d) — but the rule
 * that fix established is the one that matters here too: an accessibility
 * ENHANCEMENT must never be able to throw, on any platform, for any reason.
 *
 * Usage:
 *   const titleRef = useFocusOnOpen<Text>(visible);
 *   <AppText ref={titleRef} variant="heading" accessibilityRole="header">Title</AppText>
 */
export function useFocusOnOpen<T extends Component>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    if (Platform.OS === 'web') return;
    const id = setTimeout(() => {
      try {
        const node = ref.current ? findNodeHandle(ref.current) : null;
        if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
      } catch {
        // Focus is an enhancement; a platform that can't resolve a handle
        // simply doesn't get the cursor move. It never becomes an app error.
      }
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

    // R-13 / SR-104. ⚠ THE COMMENT BELOW USED TO SAY "web rejects — treat as
    // not on". IT DOES NOT REJECT. react-native-web's isScreenReaderEnabled
    // RESOLVES TRUE, unconditionally and for everyone:
    //
    //   function isScreenReaderEnabled() {
    //     return new Promise((resolve, reject) => { resolve(true); });
    //   }
    //   (react-native-web/dist/exports/AccessibilityInfo/index.js)
    //
    // So the catch() never ran and EVERY web visitor was treated as a
    // screen-reader user: Nearby auto-opened over the map, and selecting a
    // flag from the list stopped recentring. The fallback was never reached,
    // which is why nothing looked wrong in the code.
    //
    // There is no reliable browser API for "is a screen reader running" — the
    // deliberate answer to that question is that you cannot ask it, and should
    // build so it does not matter. So web returns false and the sighted default
    // stands; every web surface remains keyboard- and AT-navigable regardless,
    // which is what actually serves an AT user here.
    if (Platform.OS === 'web') {
      return () => {
        cancelled = true;
      };
    }

    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (!cancelled) setEnabled(value);
      })
      .catch(() => {
        // A native platform that cannot answer — treat as "not on" so the
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
 * G5 — the focus-return contract for a LOCAL trigger/surface pair.
 *
 * A screen-reader user presses "List", the nearby-flags sheet opens, they close
 * it — and the cursor is stranded wherever the sheet used to be. This hook is
 * the other half of `useFocusOnOpen`: that one moves the cursor INTO a surface,
 * this one hands it BACK to the control that opened it (WCAG 2.4.3 Focus Order).
 *
 * Usage — the whole contract is four lines at the call site:
 *
 *   const nearbyTrigger = useSurfaceTrigger<View>();
 *   <PressableScale ref={nearbyTrigger.ref}
 *     onPress={() => { nearbyTrigger.register(); setNearbyOpen(true); }} />
 *   <NearbyFlagsModal onDismiss={nearbyTrigger.restore}
 *     onClose={() => { setNearbyOpen(false); nearbyTrigger.release(); }} />
 *
 * WHY NO CONTEXT. The hamburger needs `DrawerContext` because its trigger lives
 * in N different headers while <HamburgerDrawer> is mounted once at the
 * navigator — trigger and surface sit in different subtrees, so the handle has
 * to travel through a provider. The surfaces here are LOCAL pairs: MapScreen
 * owns both the button and the <Modal>, in the same component, so the whole
 * contract fits in one hook with no provider. THE DRAWER DOES NOT ADOPT THIS
 * HOOK — its Modal prop set is frozen by assertion H of
 * src/__tests__/dismissalStandard.guard.test.ts, and its focus return already
 * ships (see HamburgerDrawer's `presentPendingSubScreen` / `releaseDrawer`).
 *
 * WHY `restore` HANGS OFF onDismiss AND NOT onClose. Until the surface has
 * actually left the screen there is nothing to hand focus back to — moving the
 * cursor while the sheet is still presented aims it at an occluded control.
 * onDismiss is the dismissal-COMPLETE event; onClose is only the close INTENT.
 *
 * WHICH PLATFORMS HAVE A REAL DISMISSAL EVENT, and what Android gets instead:
 *   · iOS — RN fires onDismiss from the dismissal completion block. Real event.
 *   · web — rn-web fires its own onDismiss after the exit animation
 *     (exports/Modal/ModalAnimation.js). Also a real event.
 *   · Android — NOTHING. RN's Modal renders a native Dialog whose window
 *     animation JS never hears about, and RN's inline onDismiss route is gated
 *     `if (Platform.OS === 'ios')`.
 * So `release()` is an ANDROID-ONLY stand-in, and it must not fire on the two
 * platforms that already have the real thing: calling it there would consume the
 * armed latch with the EARLIER, wrong event and make the correctly-timed one a
 * no-op.
 *
 * AND IT HAS TO WAIT. An earlier version of this hook called `restore()`
 * synchronously from `release()`, which broke the law stated two paragraphs up:
 * onClose runs beside the `setState` that closes the surface, so the focus call
 * was dispatched before React had even committed `visible=false`, let alone
 * before the Dialog was torn down. Android drops an accessibility-focus request
 * aimed at a view in a non-active window, so the cursor was left stranded
 * exactly where this hook exists to stop it being stranded — with every jest
 * gate green, because jest only proves the call happened. Both in-repo
 * precedents wait, and neither was doing what that version claimed:
 *   · `useFocusOnOpen` (this file) defers 150ms so the surface presents first.
 *   · `releaseDrawer` (HamburgerDrawer) is invoked from the exit-animation
 *     COMPLETION callback — never from close intent.
 * There is no completion callback to hang off here (that absence is the whole
 * reason onDismiss is iOS-only), so the wait is a timer, bounded by
 * ANDROID_DIALOG_EXIT_MS. Reduced motion does NOT shorten it: with
 * animationType='none' the Dialog still tears its window down asynchronously,
 * and landing the cursor a beat late is invisible where landing it early is the
 * bug. The timer is cleared on unmount so it can never fire into a dead tree.
 *
 * ON PROOF: react-native-web stubs `AccessibilityInfo.setAccessibilityFocus` to
 * an EMPTY BODY, so this hook has no web-observable effect whatsoever. Jest can
 * prove the call was made with the right handle and nothing more; only a device
 * pass with VoiceOver / TalkBack can prove the cursor actually moved.
 *
 * ⚠ READ THIS BEFORE FLIPPING `newArchEnabled`. On the NEW architecture, RN's
 * Fabric modal already does this job itself: RCTModalHostViewComponentView saves
 * the focused accessibility element before presenting and posts a screen-changed
 * notification at it in the dismissal completion — which runs right after it
 * emits onDismiss to JS, i.e. the platform's own restore lands just AFTER this
 * hook's. app.json currently sets `"newArchEnabled": false`, so the old-arch
 * RCTModalHostView has no save/restore and this hook is the only mechanism. If
 * that flag flips, every dismissal issues two competing focus commands
 * milliseconds apart, and `markHandoff` stops being a handoff at all — the
 * platform would move the cursor back to the trigger regardless, clobbering the
 * announcement the suppression exists to protect. Re-verify this hook against
 * Fabric before assuming it still helps; it may need to become a no-op on iOS.
 */
/**
 * How long to wait after an Android close-intent before handing the cursor back.
 *
 * Deliberately NOT one of `motion.duration.*`: those tokens describe animations
 * WE author, and this is the Android Dialog's own window animation, which the
 * platform owns and JS cannot observe. It is an upper bound on someone else's
 * timing, not a value we picked for a look — so it lives here as a named
 * constant rather than borrowing a token that would imply we control it.
 * 320ms clears the platform slide comfortably; being late is invisible, being
 * early is the stranded-cursor bug this whole mechanism exists to prevent.
 */
const ANDROID_DIALOG_EXIT_MS = 320;

export function useSurfaceTrigger<T extends Component>() {
  /** Attach to the trigger control (a PressableScale, a Pressable, a Button). */
  const ref = useRef<T>(null);
  /** The trigger's native node handle, captured at press time. */
  const handle = useRef<number | null>(null);
  /** Did THIS session start with a `register()`? Gates every restore. */
  const armed = useRef(false);
  /** Does this close hand focus to another surface instead of back here? */
  const handedOff = useRef(false);
  /** The pending Android exit wait, so it can be superseded and cleaned up. */
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Call inside the trigger's `onPress`, immediately before the setState that
   * opens the surface.
   */
  const register = useCallback(() => {
    // Every open starts as a plain session; a handoff opts out of it below.
    handedOff.current = false;
    armed.current = true;
    // `register()` runs INSIDE the trigger's onPress, immediately before the
    // setState that opens the surface — so anything that throws here stops the
    // surface from opening at all. That is exactly what shipped on the drawer:
    // rn-web's findNodeHandle THROWS ("findNodeHandle is not supported on
    // web"), the press handler aborted, and the hamburger went INERT. Jest
    // could not see it — react-test-renderer implements findNodeHandle just
    // fine — a browser capture caught it.
    //
    // Web is skipped by design, not merely defended: the handle exists only to
    // feed AccessibilityInfo.setAccessibilityFocus, which rn-web stubs to an
    // empty body, so there is nothing to record. The try/catch is the standing
    // rule behind that guard — an accessibility enhancement must never be able
    // to break the primary action, on any platform, ever.
    if (Platform.OS === 'web') return;
    try {
      handle.current = ref.current ? findNodeHandle(ref.current) : null;
    } catch {
      handle.current = null;
    }
  }, []);

  /**
   * "This close hands focus to another surface — do not yank it back." Call it
   * on the branch that navigates onward (a map callout, a confirmation
   * announcement) rather than returning the user to the trigger.
   */
  const markHandoff = useCallback(() => {
    handedOff.current = true;
  }, []);

  /** Wire to the surface's `onDismiss` — the dismissal-complete event. */
  const restore = useCallback(() => {
    // The armed latch does three jobs at once. rn-web's Modal DOES fire
    // onDismiss while RN core's is iOS-only, so on some platforms BOTH
    // release() and onDismiss land and the second must no-op. A surface opened
    // WITHOUT register() — a deep link, an opener that never adopted the hook —
    // must never let a STALE handle steal focus. And a double dismissal is
    // therefore idempotent.
    if (!armed.current) return;
    armed.current = false;
    if (handedOff.current) {
      handedOff.current = false;
      return;
    }
    const node = handle.current;
    if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  /**
   * Call in the opener's `onClose`, beside the setState that closes it.
   *
   * Android-only, and deferred — see the ANDROID_DIALOG_EXIT_MS note in the
   * hook's docblock. On iOS and web this is deliberately a no-op, because both
   * fire a real onDismiss and `restore()` is already wired to it.
   */
  const release = useCallback(() => {
    if (Platform.OS !== 'android') return;
    // Never stack two waits: a second close-intent supersedes the first.
    if (exitTimer.current != null) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      restore();
    }, ANDROID_DIALOG_EXIT_MS);
  }, [restore]);

  // A pending wait must never fire into an unmounted tree.
  useEffect(
    () => () => {
      if (exitTimer.current != null) clearTimeout(exitTimer.current);
    },
    [],
  );

  // Memoized so the returned object has a STABLE identity. Every member is
  // already useCallback([])-stable, but a fresh object literal each render makes
  // `[…, trigger]` re-run a consumer's effect on every render — and
  // react-hooks/exhaustive-deps rejects depending on `trigger.register` instead.
  // The auto-open arming in MapScreen needs exactly that dependency, so the
  // stability belongs here rather than as a workaround at each call site.
  return useMemo(
    () => ({ ref, register, markHandoff, restore, release }),
    [register, markHandoff, restore, release],
  );
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
