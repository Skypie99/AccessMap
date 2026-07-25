/**
 * D1 (device-tune 1) — every drawer destination resolves.
 *
 * The class of bug this pins: a drawer row that looks wired but whose
 * destination never appears on device. Resources / How To Help / About are
 * sibling `visible`-prop Modals handed off on the drawer Modal's dismissal
 * (onDismiss on iOS, the latch-release commit elsewhere); Settings / Admin /
 * Sign in are navigations delegated to the host via onNavigate / onSignIn.
 * The route side of that delegation is pinned by
 * src/navigation/__tests__/drawerRoutes.guard.test.ts.
 *
 * jest-expo runs with Platform.OS === 'ios', so the iOS handoff path is the
 * default under test; the Android/web immediate path gets its own case via
 * jest.replaceProperty.
 */

import React from 'react';
import { Animated, Modal, Platform } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import HamburgerDrawer from '@/components/HamburgerDrawer';
import { useReducedMotion } from '@/lib/accessibility';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from '@/lib/admin';
import { confirm } from '@/lib/confirm';
import { signOut } from '@/lib/supabase';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(),
  // Keep GlassSurface (rendered inside the drawer) from probing native a11y.
  useReduceTransparency: () => false,
}));
jest.mock('@/lib/admin', () => ({ useIsAdmin: jest.fn() }));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ signOut: jest.fn(), supabase: {} }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn() }));
// Each sub-screen renders an identifiable marker only while visible, so the
// handoff moment is observable without mounting the real screen trees.
jest.mock('@/screens/ResourcesScreen', () => {
  const RN = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return ({ visible }: { visible: boolean }) =>
    visible ? ReactActual.createElement(RN.View, { testID: 'sub-resources' }) : null;
});
jest.mock('@/screens/HowToHelpScreen', () => {
  const RN = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return ({ visible }: { visible: boolean }) =>
    visible ? ReactActual.createElement(RN.View, { testID: 'sub-howtohelp' }) : null;
});
jest.mock('@/screens/AboutScreen', () => {
  const RN = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return ({ visible }: { visible: boolean }) =>
    visible ? ReactActual.createElement(RN.View, { testID: 'sub-about' }) : null;
});

const mockRM = useReducedMotion as jest.Mock;
const mockAuth = useAuth as jest.Mock;
const mockAdmin = useIsAdmin as jest.Mock;
const mockConfirm = confirm as jest.Mock;
const mockSignOut = signOut as jest.Mock;

const cbs = { onClose: jest.fn(), onSignIn: jest.fn(), onNavigate: jest.fn() };
const ALL_MARKERS = ['sub-resources', 'sub-howtohelp', 'sub-about'] as const;

// The drawer renders exactly one Modal (sub-screen mocks render Views).
const drawerModal = (u: RenderResult) => u.UNSAFE_getByType(Modal);

/** Capture the exit animation's completion callback (exitLatch technique) —
 *  the latch lifecycle stays deterministic regardless of jest-expo's
 *  native-driver animation timing. Returns a getter (the callback is
 *  re-captured on every effect run; the latest one wins). */
function spyExitAnimation(): () => ((r: { finished: boolean }) => void) | null {
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
  return () => done;
}

beforeEach(() => {
  mockRM.mockReturnValue(false);
  mockAuth.mockReturnValue({ user: null });
  mockAdmin.mockReturnValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('D1 — in-drawer destinations (Resources / How To Help / About the App)', () => {
  it.each([
    ['Resources', 'sub-resources'],
    ['How To Help', 'sub-howtohelp'],
    ['About the App', 'sub-about'],
  ])('%s: press → close → dismissal → its screen (and only its screen) mounts', (label, marker) => {
    const exitDone = spyExitAnimation();
    const u = render(<HamburgerDrawer open {...cbs} />);

    fireEvent.press(u.getByLabelText(label));
    expect(cbs.onClose).toHaveBeenCalledTimes(1);
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);

    // Latch releases when the exit really finishes…
    act(() => exitDone()?.({ finished: true }));
    expect(drawerModal(u).props.visible).toBe(false);
    // …but on iOS nothing may present until the dismissal completes.
    ALL_MARKERS.forEach((id) => expect(u.queryByTestId(id)).toBeNull());

    act(() => {
      drawerModal(u).props.onDismiss?.();
    });
    expect(u.getByTestId(marker)).toBeTruthy();
    ALL_MARKERS.filter((id) => id !== marker).forEach((id) =>
      expect(u.queryByTestId(id)).toBeNull(),
    );
  });

  it('Android/web: the handoff lands at latch release, no onDismiss needed', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const exitDone = spyExitAnimation();
    const u = render(<HamburgerDrawer open {...cbs} />);

    fireEvent.press(u.getByLabelText('Resources'));
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);
    act(() => exitDone()?.({ finished: true }));

    expect(u.getByTestId('sub-resources')).toBeTruthy();
  });

  it('a reopen before the close finishes cancels the pending handoff', () => {
    const exitDone = spyExitAnimation();
    const u = render(<HamburgerDrawer open {...cbs} />);

    fireEvent.press(u.getByLabelText('Resources'));
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);
    // User reopens mid-exit — the parked request must not fire later.
    u.rerender(<HamburgerDrawer open {...cbs} />);
    u.rerender(<HamburgerDrawer open={false} {...cbs} />);
    act(() => exitDone()?.({ finished: true }));
    act(() => {
      drawerModal(u).props.onDismiss?.();
    });

    ALL_MARKERS.forEach((id) => expect(u.queryByTestId(id)).toBeNull());
  });
});

describe('D1 — delegated destinations (Settings / Admin / Sign in)', () => {
  it('Settings: press hands the registered tab route to the host', () => {
    const u = render(<HamburgerDrawer open {...cbs} />);
    fireEvent.press(u.getByLabelText('Settings'));
    expect(cbs.onNavigate).toHaveBeenCalledTimes(1);
    expect(cbs.onNavigate).toHaveBeenCalledWith('Settings');
  });

  it('Admin: hidden for non-admins, delegated for admins (isAdmin === true only)', () => {
    const u = render(<HamburgerDrawer open {...cbs} />);
    expect(u.queryByLabelText('Admin')).toBeNull();

    mockAdmin.mockReturnValue(true);
    u.rerender(<HamburgerDrawer open {...cbs} />);
    fireEvent.press(u.getByLabelText('Admin'));
    expect(cbs.onNavigate).toHaveBeenCalledWith('Admin');
  });

  it('Sign in (guest): press delegates to onSignIn', () => {
    const u = render(<HamburgerDrawer open {...cbs} />);
    fireEvent.press(u.getByLabelText('Sign in'));
    expect(cbs.onSignIn).toHaveBeenCalledTimes(1);
  });
});

describe('D1 — Sign out confirms (parity with the Settings row)', () => {
  beforeEach(() => {
    mockAuth.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('cancel keeps the session AND the open drawer', async () => {
    mockConfirm.mockResolvedValue(false);
    const u = render(<HamburgerDrawer open {...cbs} />);

    await act(async () => {
      fireEvent.press(u.getByLabelText('Sign out'));
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      'Sign out?',
      'Are you sure you want to sign out?',
      'Sign out',
      true,
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(cbs.onClose).not.toHaveBeenCalled();
  });

  it('confirm closes the drawer and signs out once, with the userId', async () => {
    mockConfirm.mockResolvedValue(true);
    const u = render(<HamburgerDrawer open {...cbs} />);

    await act(async () => {
      fireEvent.press(u.getByLabelText('Sign out'));
    });

    expect(cbs.onClose).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith('user-1');
  });

  it('the row speaks its destructive intent (verbatim the Settings hint)', () => {
    const u = render(<HamburgerDrawer open {...cbs} />);
    expect(u.getByLabelText('Sign out').props.accessibilityHint).toBe(
      'Destructive. Confirms before signing out.',
    );
  });
});
