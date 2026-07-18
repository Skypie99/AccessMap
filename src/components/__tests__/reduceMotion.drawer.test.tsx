/**
 * B5 (L4-11) — the HamburgerDrawer → sub-screen handoff delay is reduce-motion
 * gated. The drawer defers opening a sub-screen by a "wait for the close slide"
 * delay. Under Reduce Motion the drawer snaps closed instantly, so that wait was
 * dead time for exactly the users who asked for snappier UI. This test presses a
 * nav item and inspects the scheduled setTimeout delay: motion.duration.base
 * (180ms) when motion is on — T12 bound it to the drawer's real close slide,
 * retiring the old off-scale 220 literal — and 0 under Reduce Motion. Covers
 * B5a's own edit.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
// Sub-screens are imported at module scope but only rendered once a sub-screen
// is selected; stub them so their transitive deps stay out of this unit test.
jest.mock('@/screens/ResourcesScreen', () => () => null);
jest.mock('@/screens/HowToHelpScreen', () => () => null);
jest.mock('@/screens/AboutScreen', () => () => null);

const mockRM = useReducedMotion as jest.Mock;

function pressResourcesAndCollectDelays(reducedMotion: boolean): number[] {
  mockRM.mockReturnValue(reducedMotion);
  const { getByLabelText } = render(
    <HamburgerDrawer open onClose={jest.fn()} onSignIn={jest.fn()} onNavigate={jest.fn()} />,
  );
  // Spy AFTER render (render/open-animation timers are irrelevant) and clear
  // immediately before the press so only navigate()'s setTimeout is captured.
  const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
  setTimeoutSpy.mockClear();
  fireEvent.press(getByLabelText('Resources'));
  const delays = setTimeoutSpy.mock.calls.map((c) => c[1]);
  setTimeoutSpy.mockRestore();
  return delays;
}

describe('B5 (L4-11) — drawer sub-screen handoff delay is gated by reduce motion', () => {
  afterEach(() => {
    mockRM.mockReset();
    jest.clearAllMocks();
  });

  it('waits the motion.duration.base (180ms) visual-close delay when reduce motion is off', () => {
    const delays = pressResourcesAndCollectDelays(false);
    expect(delays).toContain(180);
  });

  it('drops the delay to 0 under reduce motion (no dead wait for the snapped-closed drawer)', () => {
    const delays = pressResourcesAndCollectDelays(true);
    expect(delays).not.toContain(220);
    expect(delays).toContain(0);
  });
});
