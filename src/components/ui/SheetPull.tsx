/**
 * SheetPull — pull-down-to-dismiss for the app's transparent half-sheets.
 *
 * ─── WHY THIS FILE IS ALLOWED TO EXIST ────────────────────────────────────
 * `dismissalStandard.guard.test.ts` law F bans custom gesture code repo-wide.
 * This file is its ONE allowlisted exception, ratified by Sky on 2026-08-12
 * (design-reviews/map-gestures/2026-08-12/ SPEC §3.2, her ruling on Q3). A
 * second file importing PanGestureHandler fails that sweep — deliberately.
 * Law F2 keeps the map estate handler-free with no exception at all.
 *
 * The pageSheet class (Nearby, Resources, …) does NOT use this: UIKit gives it
 * a real sheet dismissal for one prop, `allowSwipeDismissal`. The half-sheets
 * are JS-drawn cards over a scrim with no UIKit dismissal to unlock, which is
 * the entire reason a handler is needed here and nowhere else.
 *
 * ─── WHY PanGestureHandler + core Animated ────────────────────────────────
 * This app has NO Reanimated. That rules out the modern `GestureDetector` API,
 * whose per-frame callbacks would land on the JS thread — jank on a thread that
 * is already fetching flags. `PanResponder` is JS-thread-only for the same
 * reason. `PanGestureHandler` pairs with `Animated.event({useNativeDriver:
 * true})`, so the card tracks the finger on the native thread: the drag stays
 * smooth even while React is busy. All three alternatives stay banned.
 *
 * ─── THE RULE THAT MATTERS ────────────────────────────────────────────────
 * On a sheet with a scrolling form (Report), a downward drag must scroll the
 * form, NOT dismiss it — otherwise the user is trapped, unable to reach their
 * own submit button. So the pan arms only when ALL of:
 *   1. `enabled` (callers pass !submitting, !keyboardVisible, …)
 *   2. `atTop` — the content is scrolled to its top
 *   3. ≥ ACTIVATION_PT of DOWNWARD travel, with sideways travel failing first
 * Anything else and the ScrollView keeps the touch. Diagram 2 in
 * design-reviews/map-gestures/2026-08-12/diagrams/gesture-flows.html.
 *
 * ─── WHAT THIS DOES NOT DO ────────────────────────────────────────────────
 * It never becomes the only way out. Every adopting sheet keeps its visible
 * Close/Cancel, and `sheetPull.guard.test.ts` fails the build if one loses it.
 * Under VoiceOver the gesture stands aside entirely — VO owns the touch surface,
 * so screen-reader users dismiss with the escape scrub or the Close button, both
 * untouched. This wrapper adds no accessible node.
 */
import React, { useCallback, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { PanGestureHandler, State, type PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { hapticSelection } from '@/lib/haptics';
import { useReducedMotion } from '@/lib/accessibility';
import { motion } from '@/theme';

// ---------------------------------------------------------------------------
// The numbers. Exported because `sheetPull.guard.test.ts` asserts each one sits
// in a sane band — a refactor that zeroes a threshold (dismiss-on-touch) or
// inflates it (gesture dead) fails loudly instead of shipping as "feel".
// Proposed values; the device pass tunes them. Points, not pixels.
// ---------------------------------------------------------------------------

/** Downward travel before the pan takes over. Above tap wobble, below iOS's ~20. */
export const ACTIVATION_PT = 16;
/** Sideways travel that FAILS the pan, so horizontal chip rails always win. */
export const FAIL_OFFSET_X = 14;
/** Commit past this fraction of the card's own height… */
export const COMMIT_FRACTION = 0.3;
/** …but never less than this, so a short card isn't dismissed by a nudge. */
export const COMMIT_FLOOR_PT = 120;
/** The flick path: this fast, and past COMMIT_VELOCITY_MIN_PT, commits early. */
export const COMMIT_VELOCITY = 700;
/** A flick still has to travel a little, so a twitch can never dismiss. */
export const COMMIT_VELOCITY_MIN_PT = 24;

export interface SheetPullProps {
  children: React.ReactNode;
  /**
   * The surface's OWN close handler — the same one its Close button, its
   * `onRequestClose` and its `onAccessibilityEscape` call. Never a parallel
   * path: the guard asserts this is `onClose` at every call site, so the
   * focus-return contract (release/restore) is inherited, not re-implemented.
   */
  onDismiss: () => void;
  /**
   * Gate for states where dismissing would be wrong or confusing — mid-submit,
   * keyboard up. Mirrors whatever guard the surface's Cancel already uses.
   * Default true.
   */
  enabled?: boolean;
  /**
   * Whether the sheet's scrollable content sits at its top. Sheets with no
   * scrolling content omit it (default true). Wire it with `useAtTop()`.
   */
  atTop?: boolean;
  /** The inner scrollable, so the pan can coexist with it instead of stealing. */
  simultaneousHandlers?: React.Ref<unknown> | React.Ref<unknown>[];
  /** Extra style for the drag wrapper (it already carries flexShrink). */
  style?: ViewStyle;
  testID?: string;
}

/**
 * The scroll-position half of the arm test, as a one-liner for adopters:
 *
 *   const { atTop, onScroll } = useAtTop();
 *   <SheetPull atTop={atTop} …><ScrollView onScroll={onScroll} … /></SheetPull>
 *
 * State, not a ref, because the pan handler's `enabled` prop has to re-render to
 * change — but it only ever sets on a TRANSITION, so a long scroll costs one
 * render at the top edge and nothing after. `<= 0` rather than `=== 0` so iOS's
 * rubber-band overscroll still counts as "at top".
 */
export function useAtTop() {
  const [atTop, setAtTop] = React.useState(true);
  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const next = e.nativeEvent.contentOffset.y <= 0;
      setAtTop((prev) => (prev === next ? prev : next));
    },
    [],
  );
  return { atTop, onScroll, scrollEventThrottle: 16 as const };
}

export function SheetPull({
  children,
  onDismiss,
  enabled = true,
  atTop = true,
  simultaneousHandlers,
  style,
  testID,
}: SheetPullProps) {
  const reducedMotion = useReducedMotion();
  const rawY = useRef(new Animated.Value(0)).current;
  const cardHeight = useRef(0);

  // Clamp upward drags to zero WITHOUT leaving the native thread: an
  // interpolation with extrapolateLeft:'clamp' is native-driver-safe, whereas
  // doing the same in a JS listener would defeat the whole point of the driver.
  // The sheet follows the finger down and refuses to lift.
  const translateY = rawY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: 'clamp',
  });

  const onGestureEvent = useRef(
    Animated.event([{ nativeEvent: { translationY: rawY } }], { useNativeDriver: true }),
  ).current;

  const settleBack = useCallback(() => {
    if (reducedMotion) {
      rawY.setValue(0);
      return;
    }
    Animated.spring(rawY, {
      toValue: 0,
      useNativeDriver: true,
      ...motion.spring.sheet,
    }).start();
  }, [rawY, reducedMotion]);

  const commit = useCallback(() => {
    // Haptic at COMMIT, not at threshold-crossing. The crossing tick would read
    // better, but detecting it means an addListener on a native-driven value —
    // ~60 bridge events a second during the drag, which is exactly the cost the
    // native driver exists to avoid. Device pass can tell us if it's worth it.
    hapticSelection();
    const finish = () => {
      // Reset BEFORE handing over, so reopening the sheet never flashes the
      // half-dragged position from last time.
      rawY.setValue(0);
      onDismiss();
    };
    if (reducedMotion) {
      finish();
      return;
    }
    Animated.timing(rawY, {
      toValue: cardHeight.current > 0 ? cardHeight.current : 600,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing.accelerate),
      useNativeDriver: true,
    }).start(finish);
  }, [rawY, reducedMotion, onDismiss]);

  const onHandlerStateChange = useCallback(
    (e: PanGestureHandlerStateChangeEvent) => {
      const { state, translationY, velocityY } = e.nativeEvent;
      if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) return;
      if (state !== State.END) {
        settleBack();
        return;
      }
      const distanceGate = Math.max(COMMIT_FLOOR_PT, cardHeight.current * COMMIT_FRACTION);
      const flicked = velocityY > COMMIT_VELOCITY && translationY > COMMIT_VELOCITY_MIN_PT;
      if (translationY > distanceGate || flicked) commit();
      else settleBack();
    },
    [commit, settleBack],
  );

  // Web ships no pull-to-dismiss (SPEC §3.3 / Q8): a desktop pointer does not
  // drag sheets anywhere, and the web build already has Close, the scrim and
  // Escape. Pass the card straight through rather than mounting a handler that
  // would only add surface area.
  if (Platform.OS === 'web') return <>{children}</>;

  return (
    <PanGestureHandler
      enabled={enabled && atTop}
      // Downward-only activation: a positive activeOffsetY means the pan cannot
      // claim an upward drag at all, so scrolling back up is never interrupted.
      activeOffsetY={ACTIVATION_PT}
      failOffsetX={[-FAIL_OFFSET_X, FAIL_OFFSET_X]}
      simultaneousHandlers={simultaneousHandlers}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      testID={testID}
    >
      <Animated.View
        style={[styles.wrap, style, { transform: [{ translateY }] }]}
        onLayout={(e) => {
          cardHeight.current = e.nativeEvent.layout.height;
        }}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  // flexShrink mirrors what every adopting card already carries, so inserting
  // this wrapper into a backdrop → KAV → card chain does not break the height
  // caps those sheets depend on (Report's 88%, Sheet's 90%).
  wrap: { flexShrink: 1 },
});

export default SheetPull;
