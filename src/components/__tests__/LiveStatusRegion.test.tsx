/**
 * LiveStatusRegion — the shared persistent-mounted VISIBLE + live status region
 * for S10 (submit success) and S11 ("still trying"). This is also S10's DOM
 * guard: the region is present (empty) before a status, GAINS text when one is
 * set (text mutation, not node insertion), fires the native announce even under
 * Reduce Motion, exposes the optional action, and auto-dismisses when asked.
 *
 * Reduce Motion is mocked ON so the entrance/exit is synchronous (deterministic
 * tree), which ALSO verifies PROTECT-7: the announce fires regardless of motion.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import LiveStatusRegion from '../LiveStatusRegion';
import { __resetLiveStatus, clearLiveStatus, setLiveStatus } from '@/lib/liveStatus';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: () => true,
}));

describe('LiveStatusRegion', () => {
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => clearLiveStatus());
    __resetLiveStatus();
    announceSpy.mockRestore();
    jest.useRealTimers();
  });

  it('renders present-but-empty before any status is set', () => {
    const { toJSON, queryByText } = render(<LiveStatusRegion />);
    // The aria-live wrapper is mounted (tree is not null)…
    expect(toJSON()).not.toBeNull();
    // …but carries no message text yet.
    expect(queryByText(/Report filed/)).toBeNull();
  });

  it('gains text on a new status (text mutation) and announces it', () => {
    const { getByText } = render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Report filed — thanks for flagging this barrier', tone: 'success' }));
    expect(getByText(/Report filed — thanks for flagging this barrier/)).toBeTruthy();
    // Native announce fired even though Reduce Motion is on (PROTECT-7).
    expect(announceSpy).toHaveBeenCalledWith('Report filed — thanks for flagging this barrier');
  });

  it('re-announces an identical message (monotonic key change)', () => {
    render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Still trying — check your signal', tone: 'info' }));
    act(() => setLiveStatus({ message: 'Still trying — check your signal', tone: 'info' }));
    expect(announceSpy).toHaveBeenCalledTimes(2);
  });

  it('renders an optional action button and fires its onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<LiveStatusRegion />);
    act(() =>
      setLiveStatus({ message: 'Still trying — check your signal', tone: 'info', action: { label: 'Retry', onPress } }),
    );
    const retry = getByLabelText('Retry');
    fireEvent.press(retry);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after autoDismissMs', () => {
    jest.useFakeTimers();
    const { queryByText } = render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Report filed', tone: 'success', autoDismissMs: 4000 }));
    expect(queryByText(/Report filed/)).toBeTruthy();
    act(() => jest.advanceTimersByTime(4000));
    expect(queryByText(/Report filed/)).toBeNull();
  });

  it('persists (no auto-dismiss) until cleared when autoDismissMs is omitted', () => {
    jest.useFakeTimers();
    const { queryByText } = render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Still trying — check your signal', tone: 'info' }));
    act(() => jest.advanceTimersByTime(60000));
    expect(queryByText(/Still trying/)).toBeTruthy();
    act(() => clearLiveStatus());
    expect(queryByText(/Still trying/)).toBeNull();
  });
});
