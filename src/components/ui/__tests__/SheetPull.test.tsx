/**
 * SheetPull — the behaviour that decides whether a user can still use their own
 * form. These assertions exist because the failure mode is not "the gesture is
 * missing", it is "the gesture fired when the user was trying to scroll", and
 * that traps someone halfway down the Report sheet with the submit button out
 * of reach.
 *
 * What this CANNOT prove: feel. Threshold numbers that read fine here can still
 * be wrong in the hand, and a simulator lies about touch. The real drag is a
 * device row (design-reviews/map-gestures/2026-08-12/ SPEC §3.5), and calling
 * these tests "shipped" would be dressing green as done.
 */
import React from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import {
  ACTIVATION_PT,
  COMMIT_FLOOR_PT,
  COMMIT_VELOCITY,
  COMMIT_VELOCITY_MIN_PT,
  FAIL_OFFSET_X,
  SheetPull,
  useAtTop,
} from '../SheetPull';
import { motion } from '@/theme';

const motionBase = motion.duration.base;

jest.mock('@/lib/haptics', () => ({ hapticSelection: jest.fn() }));

// Reduce Motion is driven, not observed. Most assertions below run with it ON,
// where the commit path is synchronous — that keeps every THRESHOLD test about
// the threshold instead of about animation timing, and it exercises the branch
// a reduce-motion user actually gets. One test drives the animated path.
let mockReducedMotion = true;
jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: () => mockReducedMotion,
}));

beforeEach(() => {
  mockReducedMotion = true;
});

/** The handler instance, so a test can drive its state machine directly. */
function handlerOf(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_getByType(PanGestureHandler);
}

/** Fire a gesture END with the given travel + speed. */
function release(tree: ReturnType<typeof render>, translationY: number, velocityY = 0) {
  act(() => {
    handlerOf(tree).props.onHandlerStateChange({
      nativeEvent: { state: State.END, translationY, velocityY },
    });
  });
}

function setCardHeight(tree: ReturnType<typeof render>, height: number) {
  act(() => {
    tree.UNSAFE_getByType(Animated.View).props.onLayout({
      nativeEvent: { layout: { height } },
    });
  });
}

const renderSheet = (props: Partial<React.ComponentProps<typeof SheetPull>> = {}) => {
  const onDismiss = props.onDismiss ?? jest.fn();
  const tree = render(
    <SheetPull onDismiss={onDismiss} {...props}>
      <View>
        <Text>sheet body</Text>
      </View>
    </SheetPull>,
  );
  return { tree, onDismiss };
};

describe('SheetPull · commit vs cancel', () => {
  it('a short drag springs back and dismisses NOTHING', () => {
    const { tree, onDismiss } = renderSheet();
    release(tree, COMMIT_FLOOR_PT - 1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('a drag past the floor dismisses, exactly once', () => {
    const { tree, onDismiss } = renderSheet();
    release(tree, COMMIT_FLOOR_PT + 1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('on a TALL card the fraction governs, so the floor alone is not enough', () => {
    // 30% of an 800pt card is 240 — a 150pt drag clears the 120 floor but is
    // nowhere near a deliberate dismissal of a sheet that size.
    const { tree, onDismiss } = renderSheet();
    setCardHeight(tree, 800);
    release(tree, 150);
    expect(onDismiss).not.toHaveBeenCalled();
    release(tree, 260);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a fast flick dismisses early, without the full distance', () => {
    const { tree, onDismiss } = renderSheet();
    release(tree, COMMIT_VELOCITY_MIN_PT + 5, COMMIT_VELOCITY + 100);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a fast TWITCH does not — speed alone can never dismiss', () => {
    const { tree, onDismiss } = renderSheet();
    release(tree, COMMIT_VELOCITY_MIN_PT - 1, COMMIT_VELOCITY * 3);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('an upward drag never dismisses (negative travel)', () => {
    const { tree, onDismiss } = renderSheet();
    release(tree, -400, -900);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('a cancelled or failed gesture springs back silently', () => {
    const { tree, onDismiss } = renderSheet();
    act(() => {
      handlerOf(tree).props.onHandlerStateChange({
        nativeEvent: { state: State.CANCELLED, translationY: 999, velocityY: 9999 },
      });
      handlerOf(tree).props.onHandlerStateChange({
        nativeEvent: { state: State.FAILED, translationY: 999, velocityY: 9999 },
      });
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('WITH motion on, the card finishes its slide BEFORE the sheet is torn down', () => {
    // Ordering, not decoration: calling onDismiss first would flip the Modal's
    // `visible` while the card still sits mid-drag, and the reset to zero would
    // snap it back up for a frame on the way out. So the dismissal must land
    // only when the slide-out completes.
    mockReducedMotion = false;
    jest.useFakeTimers();
    try {
      const { tree, onDismiss } = renderSheet();
      release(tree, COMMIT_FLOOR_PT + 50);
      expect(onDismiss).not.toHaveBeenCalled(); // still sliding
      act(() => {
        jest.advanceTimersByTime(motionBase * 4);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('SheetPull · the arm test (the trap this exists to prevent)', () => {
  it('is disabled when the caller says so — mid-submit, keyboard up', () => {
    const { tree } = renderSheet({ enabled: false });
    expect(handlerOf(tree).props.enabled).toBe(false);
  });

  it('is disabled when the content is NOT scrolled to the top', () => {
    // The whole rule: mid-form, a downward drag belongs to the ScrollView.
    const { tree } = renderSheet({ atTop: false });
    expect(handlerOf(tree).props.enabled).toBe(false);
  });

  it('arms only when enabled AND at the top', () => {
    const { tree } = renderSheet({ enabled: true, atTop: true });
    expect(handlerOf(tree).props.enabled).toBe(true);
  });

  it('claims only deliberate DOWNWARD travel, and yields sideways', () => {
    const { tree } = renderSheet();
    const p = handlerOf(tree).props;
    // Positive-only activation: an upward drag can never activate the pan, so
    // scrolling back up is never interrupted.
    expect(p.activeOffsetY).toBe(ACTIVATION_PT);
    // Horizontal travel FAILS the pan, so the chip rails inside Report win.
    expect(p.failOffsetX).toEqual([-FAIL_OFFSET_X, FAIL_OFFSET_X]);
  });
});

describe('useAtTop', () => {
  function Probe({ spy }: { spy: (v: boolean) => void }) {
    const { atTop, onScroll, scrollEventThrottle } = useAtTop();
    spy(atTop);
    return (
      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} testID="s">
        <Text>x</Text>
      </ScrollView>
    );
  }

  it('starts true, goes false once scrolled, and returns true at the top', () => {
    const seen: boolean[] = [];
    const tree = render(<Probe spy={(v) => seen.push(v)} />);
    const scroll = tree.getByTestId('s');

    expect(seen[seen.length - 1]).toBe(true);

    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 120 } } });
    expect(seen[seen.length - 1]).toBe(false);

    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 0 } } });
    expect(seen[seen.length - 1]).toBe(true);
  });

  it('counts iOS rubber-band overscroll as "at top"', () => {
    // A bounced-past-the-top offset is negative. `=== 0` would have missed it
    // and left the sheet undismissable at exactly the moment it looks most
    // dismissable.
    const seen: boolean[] = [];
    const tree = render(<Probe spy={(v) => seen.push(v)} />);
    const scroll = tree.getByTestId('s');
    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(seen[seen.length - 1]).toBe(false);
    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: -30 } } });
    expect(seen[seen.length - 1]).toBe(true);
  });
});
