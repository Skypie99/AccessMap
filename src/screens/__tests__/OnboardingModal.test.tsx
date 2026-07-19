/**
 * OnboardingModal — the replay-tutorial announce gate (BP16 / T18, M1).
 *
 * The modal is kept PERMANENTLY MOUNTED by SettingsScreen (only `visible`
 * toggles), so a position announce that fires on the closed mount leaks a
 * phantom "Step 1 of 3" straight to VoiceOver while the user is just sitting on
 * Settings. These tests lock the four post-fix invariants:
 *   S1  closed mount (visible=false) is SILENT — the phantom regression lock.
 *   S2  opening announces the POST-RESET "Step 1 of 3" exactly once.
 *   S3  reopen-after-navigating announces "Step 1 of 3" once (reset wins — never
 *       the stale "Step 3 of 3").
 *   S4  navigation while open still announces each new position, once each.
 *
 * Wording is unchanged ("Step N of M") — the 'Step'→'Card' flip is a deferred
 * S-8 copy-table row, not part of this mechanics-only change.
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OnboardingModal from '@/screens/OnboardingModal';

// useReducedMotion does an async isReduceMotionEnabled().then(setState); pin it
// to a constant so there is no post-render act() churn. The announce is
// motion-decoupled, so the value is irrelevant to what we assert.
jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: () => false,
}));
// Defensive: keep analytics a silent no-op (only fired by skip/complete, which
// these tests never trigger).
jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderModal(visible: boolean) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <OnboardingModal visible={visible} onDone={jest.fn()} />
    </SafeAreaProvider>,
  );
}
function setVisible(utils: ReturnType<typeof renderModal>, visible: boolean) {
  utils.rerender(
    <SafeAreaProvider initialMetrics={METRICS}>
      <OnboardingModal visible={visible} onDone={jest.fn()} />
    </SafeAreaProvider>,
  );
}

describe('OnboardingModal — announce gate (BP16 / T18)', () => {
  let announceSpy: jest.SpyInstance;
  beforeEach(() => {
    announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
  });
  afterEach(() => {
    announceSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('S1: mounts SILENT when visible=false (no phantom announce)', () => {
    renderModal(false);
    expect(announceSpy).not.toHaveBeenCalled();
  });

  it('S2: opening from card 0 announces "Step 1 of 3" exactly once', () => {
    const utils = renderModal(false);
    expect(announceSpy).toHaveBeenCalledTimes(0);
    setVisible(utils, true);
    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenLastCalledWith('Step 1 of 3');
  });

  it('S3: reopen after navigating to card 3 announces "Step 1 of 3" once (reset wins, no stale)', () => {
    const utils = renderModal(false);
    setVisible(utils, true); // "Step 1 of 3"
    fireEvent.press(utils.getByLabelText('Next. Step 1 of 3.')); // → "Step 2 of 3"
    fireEvent.press(utils.getByLabelText('Next. Step 2 of 3.')); // → "Step 3 of 3" (index 2)
    setVisible(utils, false); // close — silent
    announceSpy.mockClear();
    setVisible(utils, true); // reopen
    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith('Step 1 of 3'); // never "Step 3 of 3"
  });

  it('S4: navigation while open announces each new position exactly once', () => {
    const utils = renderModal(false);
    setVisible(utils, true); // "Step 1 of 3"
    announceSpy.mockClear();
    fireEvent.press(utils.getByLabelText('Next. Step 1 of 3.'));
    fireEvent.press(utils.getByLabelText('Next. Step 2 of 3.'));
    expect(announceSpy.mock.calls.map((c) => c[0])).toEqual([
      'Step 2 of 3',
      'Step 3 of 3',
    ]);
  });
});
