/**
 * NearbyFlagsModal — A11Y-202 guard: focus-in on open.
 *
 * The Nearby list is the app's flagship screen-reader alternative to the map —
 * and for SR users it AUTO-opens with no press at all (MapScreen's
 * screenReaderOn effect). The G5 work wired the RETURN half of the focus
 * contract (onDismiss → trigger), but nothing ever moved the cursor IN: on
 * open, VoiceOver stayed stranded on the (now occluded) control behind the
 * sheet. House doctrine (accessibility.ts → useFocusOnOpen) says every
 * dismissable moves focus to its title on present.
 *
 * These tests pin the entry half: presenting the modal must issue a
 * setAccessibilityFocus call (aimed at the title's node) after the present
 * delay — once per open, including re-opens, and never while closed.
 *
 * (react-native-web stubs setAccessibilityFocus, so jest proves the call is
 * made with a real handle; the cursor's actual landing is device row N-7.)
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, act } from '@testing-library/react-native';
import NearbyFlagsModal from '../NearbyFlagsModal';

// Real native tags are device-only — react-test-renderer cannot mint one for
// the title's host <Text>, so findNodeHandle answers null and the hook's
// null-guard (correctly) goes quiet. Same recipe as surfaceTrigger.test.tsx:
// mock RendererProxy so findNodeHandle returns a fixed handle, and prove the
// PLUMBING — the call is made, with whatever the title's node resolves to.
const TITLE_HANDLE = 4242;
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(() => TITLE_HANDLE),
}));

jest.mock('@/theme/ThemeContext', () => ({
  useColor: jest.fn(() => ({
    scheme: 'light',
    brand: '#1466E0',
    text: '#333',
    textStrong: '#222',
    textMuted: '#666',
    textSubtle: '#5b6470',
    surface: '#fff',
    surfaceMuted: '#f7f9fc',
    surfaceNeutral: '#eef1f5',
    border: '#e3e8ef',
    borderPressed: '#d5dbe4',
    scrim: 'rgba(0,0,0,0.4)',
    inkGlassMuted: '#3d4654',
    shadowTint: '#0b1626',
  })),
}));

const baseProps = {
  location: null,
  flags: [],
  onClose: jest.fn(),
  onSelectFlag: jest.fn(),
};

describe('A11Y-202 guard — Nearby moves the SR cursor in on open', () => {
  let focusSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    focusSpy = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
  });

  afterEach(() => {
    focusSpy.mockRestore();
    jest.useRealTimers();
  });

  it('presents → focus lands (one call, with a node handle) after the present delay', () => {
    render(<NearbyFlagsModal visible {...baseProps} />);

    // Before the present delay: nothing (moving focus mid-animation aims at
    // a not-yet-presented surface).
    expect(focusSpy).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith(TITLE_HANDLE);
  });

  it('does not fire while closed, and fires again on re-open (incl. the SR auto-open path — any visible flip)', () => {
    const { rerender } = render(<NearbyFlagsModal visible={false} {...baseProps} />);

    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(focusSpy).not.toHaveBeenCalled();

    // Open — this is the same transition MapScreen's auto-open effect drives.
    rerender(<NearbyFlagsModal visible {...baseProps} />);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);

    // Close, then re-open: the contract holds per session, not once.
    rerender(<NearbyFlagsModal visible={false} {...baseProps} />);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    rerender(<NearbyFlagsModal visible {...baseProps} />);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(focusSpy).toHaveBeenCalledTimes(2);
  });
});
