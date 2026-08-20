/**
 * `useFocusOnOpen` can never throw — the second half of the ee8821d rule.
 *
 * ee8821d ("the focus enhancement could kill the drawer on web") fixed exactly
 * this defect in `useDrawerTrigger`/`useSurfaceTrigger`: on react-native-web
 * `findNodeHandle` THROWS ("findNodeHandle is not supported on web"). That fix
 * was never applied to `useFocusOnOpen`, the OTHER call site — so every open of
 * every dismissable surface (Privacy, Terms, About, Legend, Nearby, Report,
 * Onboarding, HowToHelp, …) raised an uncaught error in the web build.
 * Confirmed live in a browser: four modal opens, four throws.
 *
 * Jest could not see it, for the same reason it could not see the drawer
 * regression: react-test-renderer implements `findNodeHandle` perfectly well,
 * so all 3,061 tests stayed green. These tests therefore FORCE the throw
 * instead of waiting for a platform to produce it.
 *
 * The rule: focus-on-open is an ENHANCEMENT. It may fail, on any platform, for
 * any reason — and the surface must still open, silently and without error.
 */
import React from 'react';
import { Platform, Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useFocusOnOpen } from '@/lib/accessibility';

jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(jest.requireActual('react-native/Libraries/ReactNative/RendererProxy').findNodeHandle),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rendererProxy = require('react-native/Libraries/ReactNative/RendererProxy');
const nodeHandle = rendererProxy.findNodeHandle as jest.Mock;

/** A minimal stand-in for a real sheet title — the shape every adopter uses. */
function Sheet({ visible }: { visible: boolean }) {
  const titleRef = useFocusOnOpen<Text>(visible);
  return <Text ref={titleRef}>Privacy Policy</Text>;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('useFocusOnOpen — an enhancement that can never become an app error', () => {
  it('web: the handle is never requested, so rn-web cannot throw', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const u = render(<Sheet visible={false} />);

    expect(() => {
      u.rerender(<Sheet visible />);
      act(() => {
        jest.advanceTimersByTime(300);
      });
    }).not.toThrow();

    // Skipped by design, not merely defended: setAccessibilityFocus is a stub
    // with an empty body on web, so there is nothing to move.
    expect(nodeHandle).not.toHaveBeenCalled();
  });

  it('a THROWING findNodeHandle is swallowed — the surface still opens', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    nodeHandle.mockImplementation(() => {
      throw new Error('findNodeHandle is not supported on web.');
    });
    const u = render(<Sheet visible={false} />);

    expect(() => {
      u.rerender(<Sheet visible />);
      act(() => {
        jest.advanceTimersByTime(300);
      });
    }).not.toThrow();
  });

  it('native: the guard is not so defensive that it disables the feature', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
    nodeHandle.mockImplementation(() => 4242);
    const u = render(<Sheet visible={false} />);

    u.rerender(<Sheet visible />);
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(focus).toHaveBeenCalledWith(4242);
  });
});
