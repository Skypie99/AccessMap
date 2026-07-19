/**
 * HamburgerDrawer exit latch (T12 / F3-02, F3-07).
 *
 * The drawer Modal's visibility is driven by a local `rendered` latch, not the
 * `open` prop directly, so on close the Modal stays mounted while the exit
 * slide/fade actually plays, then unmounts in the animation's completion
 * callback. Under reduce motion it snaps closed same-tick (no timers). These
 * guard the fix against a regression back to `visible={open}` (instant unmount,
 * dead exit animation — "arrives like glass, vanishes like a light switch").
 */
import React from 'react';
import { Animated, Modal } from 'react-native';
import { render } from '@testing-library/react-native';
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
jest.mock('@/screens/ResourcesScreen', () => () => null);
jest.mock('@/screens/HowToHelpScreen', () => () => null);
jest.mock('@/screens/AboutScreen', () => () => null);

const mockRM = useReducedMotion as jest.Mock;
const cbs = { onClose: jest.fn(), onSignIn: jest.fn(), onNavigate: jest.fn() };

// The drawer renders exactly one Modal (sub-screens are mocked to null).
const drawerVisible = (u: ReturnType<typeof render>): boolean =>
  u.UNSAFE_getByType(Modal).props.visible;

afterEach(() => {
  mockRM.mockReset();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('HamburgerDrawer exit latch (T12 / F3-02, F3-07)', () => {
  it('mounts closed: visible=false when open=false', () => {
    mockRM.mockReturnValue(false);
    const u = render(<HamburgerDrawer open={false} {...cbs} />);
    expect(drawerVisible(u)).toBe(false);
  });

  it('reduce motion: snaps closed same-tick — the Modal unmounts immediately on close (no timers)', () => {
    mockRM.mockReturnValue(true);
    const u = render(<HamburgerDrawer open {...cbs} />);
    expect(drawerVisible(u)).toBe(true);
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);
    expect(drawerVisible(u)).toBe(false);
  });

  it('reduce motion: reopen after a close re-mounts the panel', () => {
    mockRM.mockReturnValue(true);
    const u = render(<HamburgerDrawer open {...cbs} />);
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);
    expect(drawerVisible(u)).toBe(false);
    u.rerender(<HamburgerDrawer open {...cbs} />);
    expect(drawerVisible(u)).toBe(true);
  });

  it('motion: latches the Modal mounted through the close, then unmounts only when the exit finishes', () => {
    // Capture the exit animation's completion callback so the latch lifecycle is
    // deterministic regardless of jest-expo's native-driver animation timing.
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
    const u = render(<HamburgerDrawer open {...cbs} />);
    expect(drawerVisible(u)).toBe(true);

    u.rerender(<HamburgerDrawer open={false} {...cbs} />);
    // Regression guard: the old `visible={open}` would already be false here.
    // The latch keeps the Modal mounted so the exit slide/fade can play.
    expect(drawerVisible(u)).toBe(true);

    // An interrupted exit (finished:false — e.g. reopen) must NOT unmount.
    act(() => done?.({ finished: false }));
    expect(drawerVisible(u)).toBe(true);

    // A completed exit flips the Modal closed.
    act(() => done?.({ finished: true }));
    expect(drawerVisible(u)).toBe(false);
  });
});
