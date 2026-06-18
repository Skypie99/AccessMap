/**
 * Tests for src/lib/accessibility.ts
 *
 * Pins the decorativeProps constant added in Item 2 (E1 carry-forward).
 * decorativeProps is the canonical triple that suppresses a purely decorative
 * element (glyph, dot, icon) from the accessibility tree on both iOS
 * (accessibilityElementsHidden) and Android (importantForAccessibility).
 *
 * If any of these values drift, decorative glyphs would re-enter the
 * screen-reader tree and VoiceOver / TalkBack would announce them aloud —
 * WCAG 1.1.1 failure.
 */

import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { decorativeProps, useReduceTransparency } from '../accessibility';

describe('decorativeProps', () => {
  it('exists as a constant object', () => {
    expect(decorativeProps).toBeDefined();
    expect(typeof decorativeProps).toBe('object');
  });

  it('sets accessible to false (suppresses the element from a11y tree)', () => {
    // accessible={false} is the primary mechanism on iOS to hide an element.
    expect(decorativeProps.accessible).toBe(false);
  });

  it('sets importantForAccessibility to "no-hide-descendants" (Android)', () => {
    // "no-hide-descendants" hides the element AND its subtree on Android.
    // "no" alone only hides the element itself — subtree glyph children
    // would still be announced.
    expect(decorativeProps.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('sets accessibilityElementsHidden to true (iOS subtree suppression)', () => {
    // accessibilityElementsHidden=true hides the subtree on iOS (equivalent
    // to Android's importantForAccessibility="no-hide-descendants").
    expect(decorativeProps.accessibilityElementsHidden).toBe(true);
  });

  it('has exactly the three expected properties (no extras)', () => {
    const keys = Object.keys(decorativeProps);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('accessible');
    expect(keys).toContain('importantForAccessibility');
    expect(keys).toContain('accessibilityElementsHidden');
  });
});

/**
 * useReduceTransparency — the hook GlassSurface uses to drop its frosted-glass
 * blur for a solid opaque surface when the user has iOS "Reduce Transparency"
 * on. Mirrors useReducedMotion: an initial probe of
 * AccessibilityInfo.isReduceTransparencyEnabled() plus a live subscription to
 * the 'reduceTransparencyChanged' event.
 *
 * These tests drive the hook through @testing-library/react-native's
 * renderHook and a mocked AccessibilityInfo so no native bridge is needed.
 * If this hook ever stops returning the live value, GlassSurface would keep
 * blurring for users who explicitly asked for opaque surfaces — a contrast /
 * legibility regression.
 */
describe('useReduceTransparency', () => {
  // Capture the event listener the hook registers so a test can fire it.
  let changeHandler: ((value: boolean) => void) | undefined;
  let removeSpy: jest.Mock;
  let probeResult: Promise<boolean>;

  beforeEach(() => {
    changeHandler = undefined;
    removeSpy = jest.fn();
    probeResult = Promise.resolve(false);

    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockImplementation(() => probeResult);

    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((event: string, handler: (value: boolean) => void) => {
        if (event === 'reduceTransparencyChanged') {
          changeHandler = handler;
        }
        return { remove: removeSpy } as ReturnType<typeof AccessibilityInfo.addEventListener>;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false initially (before the async probe resolves)', () => {
    const { result } = renderHook(() => useReduceTransparency());
    // First synchronous render, before the probe promise settles.
    expect(result.current).toBe(false);
  });

  it('resolves to the probed value once isReduceTransparencyEnabled settles (true)', async () => {
    probeResult = Promise.resolve(true);
    const { result } = renderHook(() => useReduceTransparency());

    await act(async () => {
      await probeResult;
    });

    expect(result.current).toBe(true);
  });

  it('stays false when the probe resolves false', async () => {
    probeResult = Promise.resolve(false);
    const { result } = renderHook(() => useReduceTransparency());

    await act(async () => {
      await probeResult;
    });

    expect(result.current).toBe(false);
  });

  it('subscribes to the "reduceTransparencyChanged" event', () => {
    renderHook(() => useReduceTransparency());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'reduceTransparencyChanged',
      expect.any(Function),
    );
  });

  it('updates live when the user toggles the preference on, then off', async () => {
    const { result } = renderHook(() => useReduceTransparency());

    // Flush the initial probe (false).
    await act(async () => {
      await probeResult;
    });
    expect(result.current).toBe(false);

    // User flips "Reduce Transparency" ON mid-session.
    act(() => {
      changeHandler?.(true);
    });
    expect(result.current).toBe(true);

    // ...and back OFF.
    act(() => {
      changeHandler?.(false);
    });
    expect(result.current).toBe(false);
  });

  it('removes its event subscription on unmount (no leak)', () => {
    const { unmount } = renderHook(() => useReduceTransparency());
    unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('quietly stays false when the probe rejects (web / unsupported platform)', async () => {
    const rejected = Promise.reject(new Error('unsupported'));
    // Swallow the rejection so it doesn't surface as an unhandled rejection.
    rejected.catch(() => {});
    probeResult = rejected;

    const { result } = renderHook(() => useReduceTransparency());

    await act(async () => {
      await rejected.catch(() => {});
    });

    expect(result.current).toBe(false);
  });
});
