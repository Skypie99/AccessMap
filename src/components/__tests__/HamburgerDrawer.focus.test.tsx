/**
 * D2/C3 — the drawer's screen-reader focus contract.
 *
 * A native menu traps focus and hands it back. This drawer already had
 * containment (`accessibilityViewIsModal`) but neither half of the focus
 * journey: opening it left focus on the now-occluded hamburger, and closing it
 * stranded focus wherever the drawer had been. C3 adds both — with one crucial
 * asymmetry:
 *
 *   plain close (X / scrim / hardware back)  → focus RETURNS to the trigger
 *   handoff  (sub-screen / tab / sign-in/out) → focus does NOT return
 *
 * The handoff case matters because the destination owns focus from there
 * (About is accessibilityViewIsModal; the Sheet family self-focuses). Yanking
 * focus back to a hamburger the user has already navigated away from would be
 * worse than doing nothing.
 *
 * The return fires on the drawer's DISMISSAL, not on the close tap — the same
 * seam D1 established, because until the Modal is actually gone there is
 * nothing to hand focus back to.
 */
import React from 'react';
import { AccessibilityInfo, Animated, Modal } from 'react-native';
import { render, fireEvent, act, type RenderResult } from '@testing-library/react-native';
import HamburgerDrawer from '@/components/HamburgerDrawer';
import { DrawerProvider, useDrawer, useDrawerTrigger } from '@/lib/drawerContext';
import { useReducedMotion } from '@/lib/accessibility';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from '@/lib/admin';
import { confirm } from '@/lib/confirm';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(),
  useReduceTransparency: () => false,
}));
jest.mock('@/lib/admin', () => ({ useIsAdmin: jest.fn() }));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ signOut: jest.fn(), supabase: {} }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn() }));
jest.mock('@/screens/ResourcesScreen', () => () => null);
jest.mock('@/screens/HowToHelpScreen', () => () => null);
jest.mock('@/screens/AboutScreen', () => () => null);

const mockRM = useReducedMotion as jest.Mock;
const mockAuth = useAuth as jest.Mock;
const mockAdmin = useIsAdmin as jest.Mock;
const mockConfirm = confirm as jest.Mock;

const cbs = { onClose: jest.fn(), onSignIn: jest.fn(), onNavigate: jest.fn() };

/** A stand-in node handle. Using a fixed number keeps the assertion exact
 *  without depending on what findNodeHandle returns under the test renderer. */
const TRIGGER_HANDLE = 4242;

const drawerModal = (u: RenderResult) => u.UNSAFE_getByType(Modal);

/** Grabs the live context so a test can register a trigger the way a real
 *  header does, without needing a real host node. */
let api: ReturnType<typeof useDrawer> | null = null;
function ContextGrab() {
  api = useDrawer();
  return null;
}

let focusSpy: jest.SpyInstance;

/** The exit animation's completion callback, captured instead of run — the
 *  exitLatch/destinations technique. Installed BEFORE the first render so no
 *  real spring is ever scheduled: a live animation completing during teardown
 *  fires setRendered outside act(). The callback is re-captured on every
 *  effect run; the latest one wins. */
let animationDone: ((r: { finished: boolean }) => void) | null = null;
function stubAnimations() {
  animationDone = null;
  jest.spyOn(Animated, 'parallel').mockImplementation(
    () =>
      ({
        start: (cb?: (r: { finished: boolean }) => void) => {
          animationDone = cb ?? null;
        },
        stop: jest.fn(),
        reset: jest.fn(),
      }) as unknown as Animated.CompositeAnimation,
  );
}

const tree = (open: boolean) => (
  <DrawerProvider>
    <ContextGrab />
    <HamburgerDrawer open={open} {...cbs} />
  </DrawerProvider>
);

function mount(open = true) {
  const u = render(tree(open));
  act(() => api!.registerTrigger(TRIGGER_HANDLE));
  return u;
}

/** Close the drawer and drive it all the way through its dismissal, the way
 *  the platform would: exit animation completes → latch releases → UIKit
 *  reports the dismissal. */
function closeAndDismiss(u: RenderResult, open = false) {
  u.rerender(tree(open));
  act(() => animationDone?.({ finished: true }));
  act(() => {
    drawerModal(u).props.onDismiss?.();
  });
}

beforeEach(() => {
  api = null;
  mockRM.mockReturnValue(false);
  mockAuth.mockReturnValue({ user: null });
  mockAdmin.mockReturnValue(false);
  focusSpy = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
  stubAnimations();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('D2/C3 — focus returns to the trigger on a PLAIN close', () => {
  it('the close X returns focus to the registered trigger', () => {
    const u = mount();
    fireEvent.press(u.getByLabelText('Close menu'));
    closeAndDismiss(u);
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
  });

  it('the return waits for the DISMISSAL — not the close tap', () => {
    const u = mount();
    fireEvent.press(u.getByLabelText('Close menu'));
    // Panel is on its way out but still presented: nothing to return to yet.
    expect(focusSpy).not.toHaveBeenCalled();
    closeAndDismiss(u);
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
  });

  it('reduce motion snaps closed and still returns focus', () => {
    mockRM.mockReturnValue(true);
    const u = mount();
    fireEvent.press(u.getByLabelText('Close menu'));
    u.rerender(tree(false));
    act(() => {
      drawerModal(u).props.onDismiss?.();
    });
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
  });

  it('with no registered trigger it stays silent rather than guessing', () => {
    const u = render(tree(true));
    fireEvent.press(u.getByLabelText('Close menu'));
    closeAndDismiss(u);
    expect(focusSpy).not.toHaveBeenCalled();
  });
});

describe('D2/C3 — focus does NOT return on a handoff', () => {
  it.each(['Resources', 'How To Help', 'About the App'])(
    '%s hands off — the destination owns focus',
    (label) => {
      const u = mount();
      fireEvent.press(u.getByLabelText(label));
      closeAndDismiss(u);
      expect(focusSpy).not.toHaveBeenCalled();
    },
  );

  it('Settings hands off to a tab route', () => {
    const u = mount();
    fireEvent.press(u.getByLabelText('Settings'));
    closeAndDismiss(u);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('Sign in hands off to the auth route', () => {
    const u = mount();
    fireEvent.press(u.getByLabelText('Sign in'));
    expect(cbs.onSignIn).toHaveBeenCalledTimes(1);
    closeAndDismiss(u);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('Sign out hands off — the trigger unmounts with the session', async () => {
    mockAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockConfirm.mockResolvedValue(true);
    const u = mount();
    await act(async () => {
      fireEvent.press(u.getByLabelText('Sign out'));
    });
    closeAndDismiss(u);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('a CANCELLED sign-out is not a handoff — the drawer stays, then returns', async () => {
    mockAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockConfirm.mockResolvedValue(false);
    const u = mount();
    await act(async () => {
      fireEvent.press(u.getByLabelText('Sign out'));
    });
    expect(cbs.onClose).not.toHaveBeenCalled();
    // The user then closes it normally — that IS a plain close.
    fireEvent.press(u.getByLabelText('Close menu'));
    closeAndDismiss(u);
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
  });

  it('a handoff does not poison the NEXT plain close', () => {
    const u = mount();
    fireEvent.press(u.getByLabelText('Settings'));
    closeAndDismiss(u);
    expect(focusSpy).not.toHaveBeenCalled();
    // Reopen, then close plainly: the close reason must have reset on open.
    u.rerender(tree(true));
    fireEvent.press(u.getByLabelText('Close menu'));
    closeAndDismiss(u);
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
  });
});

describe('D2/C3 — the scrim no longer duplicates the close button', () => {
  it('exactly one element is labelled "Close menu"', () => {
    const u = mount();
    expect(u.getAllByLabelText('Close menu')).toHaveLength(1);
  });

  it('the scrim still dismisses on a sighted tap', () => {
    const u = mount();
    const scrim = u.UNSAFE_getByProps({ accessible: false });
    fireEvent.press(scrim);
    expect(cbs.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('D2/C3 — useDrawerTrigger is safe without a provider', () => {
  it('registering outside a DrawerProvider no-ops instead of throwing', () => {
    // HeaderActions is rendered bare in several screen suites; a throwing hook
    // there would take real screens down for an a11y enhancement.
    function Bare() {
      const t = useDrawerTrigger();
      t.register();
      return null;
    }
    expect(() => render(<Bare />)).not.toThrow();
  });
});
