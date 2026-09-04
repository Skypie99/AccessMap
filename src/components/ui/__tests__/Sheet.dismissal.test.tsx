/**
 * The dismissal standard, proved on the shared Sheet primitive.
 *
 * `ui/Sheet` had NO test file at all before this, despite being the primitive
 * behind ChangelogModal and the Tasks filter sheet. It is also where the
 * dismissal standard is easiest to state, so it is the reference:
 *
 *   button path  — the visible labelled close calls onClose
 *   escape path  — the VoiceOver escape gesture calls the SAME handler
 *   backdrop     — deliberately does NOT close (Sheet's shipped contract)
 *
 * THE PLACEMENT ASSERTION IS THE POINT. `onAccessibilityEscape` must sit on
 * the containment View, not on <Modal> — RN forwards an allowlist to the
 * native modal host and this prop is not in it, so a Modal-level prop is a
 * silent no-op that still typechecks and still reads "present" to a naive
 * source-scan guard. The test therefore reaches for the node carrying
 * accessibilityViewIsModal and asserts the handler is on THAT node — the
 * MyWatchedModal.containment.test.tsx idiom.
 */
import React from 'react';
import { Modal, View } from 'react-native';
import { fireEvent, render, act } from '@testing-library/react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

import { Sheet } from '../Sheet';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(() => false),
  // Keep GlassSurface from probing native a11y (house idiom, cf.
  // HamburgerDrawer.focus.test.tsx).
  useReduceTransparency: () => false,
}));

const TITLE = 'Filter & sort';

function mount(onClose = jest.fn()) {
  const utils = render(
    <Sheet visible onClose={onClose} title={TITLE} testID="sheet-backdrop">
      <View testID="sheet-body" />
    </Sheet>,
  );
  return { utils, onClose };
}

/** The node that owns AT containment — and therefore the escape gesture. */
const containment = (utils: ReturnType<typeof render>) =>
  utils.UNSAFE_getByProps({ accessibilityViewIsModal: true });

describe('ui/Sheet — the dismissal standard', () => {
  it('BUTTON PATH: the visible close calls onClose exactly once', () => {
    const { utils, onClose } = mount();
    fireEvent.press(utils.getByLabelText(`Close ${TITLE}`));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESCAPE PATH: the escape gesture calls onClose exactly once', () => {
    const { utils, onClose } = mount();
    act(() => {
      containment(utils).props.onAccessibilityEscape();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the escape handler is the SAME reference as the Modal close handler', () => {
    // Parity, not merely presence: a different handler would drift silently.
    const { utils } = mount();
    expect(containment(utils).props.onAccessibilityEscape).toBe(
      utils.UNSAFE_getByType(Modal).props.onRequestClose,
    );
  });

  it('the escape handler is NOT on <Modal>, where RN would drop it', () => {
    // If a future edit "tidies" the prop up onto the Modal tag, the gesture
    // dies silently. This is the assertion that catches it.
    const { utils } = mount();
    expect(utils.UNSAFE_getByType(Modal).props.onAccessibilityEscape).toBeUndefined();
    expect(typeof containment(utils).props.onAccessibilityEscape).toBe('function');
  });

  it('BACKDROP: pressing outside does NOT close (Sheet ships no backdrop-close)', () => {
    const { utils, onClose } = mount();
    fireEvent.press(containment(utils));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the grabber stays hidden from assistive tech', () => {
    // It is a visual signifier for swipe; announcing it would add noise and
    // duplicate the labelled Close.
    const { utils } = mount();
    const handle = utils.UNSAFE_getByProps({ accessibilityElementsHidden: true });
    expect(handle.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('a committed pull owns one card-and-scrim exit instead of starting a second Modal slide', () => {
    jest.useFakeTimers();
    try {
      const { utils, onClose } = mount();
      const modal = () => utils.UNSAFE_getByType(Modal);
      const pull = utils.UNSAFE_getByType(PanGestureHandler);

      expect(modal().props.animationType).toBe('slide');
      act(() => {
        pull.props.onHandlerStateChange({
          nativeEvent: { state: State.END, translationY: 200, velocityY: 0 },
        });
      });

      // SheetPull now owns the card and the containing Animated backdrop for
      // this exit; disabling Modal's own slide prevents the trailing grey
      // panel / close-reopen-close sequence after the card is already gone.
      expect(modal().props.animationType).toBe('none');
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
