/**
 * B5 (L4-11) → D1 (device-tune 1) — the HamburgerDrawer → sub-screen handoff
 * has NO clock.
 *
 * History: the drawer once deferred opening a sub-screen with a setTimeout —
 * first a raw 220, then motion.duration.base (180) gated to 0 under Reduce
 * Motion (B5). On device that clock raced the T12 exit latch: the timer
 * presented the sub-screen Modal in the same frame the drawer Modal's
 * dismissal began, and iOS silently dropped the presentation (D1 — the "dead
 * drawer destinations"). The fix retires the clock entirely: navigate() parks
 * the request in a ref, and the presentation is driven by the drawer Modal's
 * own dismissal (onDismiss on iOS; the latch-release commit elsewhere).
 *
 * These tests pin the strengthened contract in both motion modes:
 *   1. running every pending timer presents NOTHING (no clock exists), and
 *   2. the dismissal event alone presents the requested sub-screen.
 * B5's promise survives: under Reduce Motion there is no dead wait — and now
 * no timer at all, in either mode.
 */

import React from 'react';
import { Animated, Modal } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import HamburgerDrawer from '@/components/HamburgerDrawer';
import { useReducedMotion } from '@/lib/accessibility';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(),
  // Keep GlassSurface (rendered inside the drawer) from probing native a11y.
  useReduceTransparency: () => false,
}));
jest.mock('@/lib/admin', () => ({ useIsAdmin: () => false }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/lib/supabase', () => ({ signOut: jest.fn(), supabase: {} }));
// Sub-screens render an identifiable marker when (and only when) visible, so
// the handoff moment is observable without mounting their real trees.
jest.mock('@/screens/ResourcesScreen', () => {
  const RN = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return ({ visible }: { visible: boolean }) =>
    visible ? ReactActual.createElement(RN.View, { testID: 'sub-resources' }) : null;
});
jest.mock('@/screens/HowToHelpScreen', () => () => null);
jest.mock('@/screens/AboutScreen', () => () => null);

const mockRM = useReducedMotion as jest.Mock;
const cbs = { onClose: jest.fn(), onSignIn: jest.fn(), onNavigate: jest.fn() };

// The drawer renders exactly one Modal (sub-screen mocks render Views).
const drawerModal = (u: ReturnType<typeof render>) => u.UNSAFE_getByType(Modal);

afterEach(() => {
  mockRM.mockReset();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('D1 — the drawer sub-screen handoff is event-driven (no clock, either motion mode)', () => {
  it('motion: no pending timer presents the sub-screen; the dismissal event does', () => {
    // Capture the exit animation's completion callback (exitLatch technique).
    let done: ((r: { finished: boolean }) => void) | null = null;
    jest.spyOn(Animated, 'parallel').mockImplementation(
      () =>
        ({
          start: (cb?: (r: { finished: boolean }) => void) => {
            done = cb ?? null;
          },
          stop: jest.fn(),
          reset: jest.fn(),
        }) as unknown as Animated.CompositeAnimation,
    );
    mockRM.mockReturnValue(false);
    jest.useFakeTimers();

    const u = render(<HamburgerDrawer open {...cbs} />);
    fireEvent.press(u.getByLabelText('Resources'));
    expect(cbs.onClose).toHaveBeenCalledTimes(1);
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);

    // The retired clock would fire here. Nothing may present.
    act(() => {
      jest.runAllTimers();
    });
    expect(u.queryByTestId('sub-resources')).toBeNull();

    // Exit animation completes → latch releases → Modal flips closed. On iOS
    // (jest-expo default) the sub-screen must STILL wait for the dismissal.
    act(() => done?.({ finished: true }));
    expect(drawerModal(u).props.visible).toBe(false);
    expect(u.queryByTestId('sub-resources')).toBeNull();

    // UIKit reports the dismissal complete → the handoff lands.
    act(() => {
      drawerModal(u).props.onDismiss?.();
    });
    expect(u.queryByTestId('sub-resources')).toBeTruthy();
  });

  it('reduce motion: snap-close schedules zero timers; the dismissal event presents instantly', () => {
    mockRM.mockReturnValue(true);
    jest.useFakeTimers();

    const u = render(<HamburgerDrawer open {...cbs} />);
    fireEvent.press(u.getByLabelText('Resources'));
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);

    // Designed stillness: the drawer snapped closed same-tick, and no timer
    // stands in for the removed animation or the removed handoff clock.
    expect(drawerModal(u).props.visible).toBe(false);
    act(() => {
      jest.runAllTimers();
    });
    expect(u.queryByTestId('sub-resources')).toBeNull();

    act(() => {
      drawerModal(u).props.onDismiss?.();
    });
    expect(u.queryByTestId('sub-resources')).toBeTruthy();
  });
});
