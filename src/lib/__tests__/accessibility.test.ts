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
import { a11yToggle, decorativeProps, useReducedMotion, useReduceTransparency } from '../accessibility';

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

  it('sets aria-hidden true (web: keeps decorative images out of the a11y tree)', () => {
    // react-native-web does not derive aria-hidden from accessible={false}, so
    // without this a decorative <Image> still announces "image" to a browser SR.
    expect((decorativeProps as Record<string, unknown>)['aria-hidden']).toBe(true);
  });

  it('has exactly the four expected properties (no extras)', () => {
    const keys = Object.keys(decorativeProps);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('accessible');
    expect(keys).toContain('importantForAccessibility');
    expect(keys).toContain('accessibilityElementsHidden');
    expect(keys).toContain('aria-hidden');
  });
});

/**
 * decorativeProps on WEB.
 *
 * `accessible`, `importantForAccessibility` and `accessibilityElementsHidden`
 * are native-only. react-native-web drops them off a <View>/<Text> allowlist,
 * but react-native-svg's web layer forwards every unknown prop onto the raw DOM
 * node — and this helper is spread onto ~180 lucide icons, which ARE
 * react-native-svg. Emitting them on web produced three React errors on every
 * page load ("Received `false` for a non-boolean attribute `accessible`" et al)
 * that flooded the console and buried a real uncaught error.
 *
 * So web emits ONLY `aria-hidden` — the one member a browser screen reader has
 * ever honored here. The suite above runs on the default (native) platform and
 * pins that all four survive there; this block pins the web shape.
 */
describe('decorativeProps on web', () => {
  /**
   * Re-import the module with Platform.OS forced to 'web'.
   *
   * The mock has to carry a `default` key: react-native's index re-exports
   * Platform as `require('./Libraries/Utilities/Platform').default`, so a bare
   * `{ OS: 'web' }` leaves `Platform` undefined.
   */
  function loadOnWeb(): Record<string, unknown> {
    let webProps: Record<string, unknown> = {};
    jest.isolateModules(() => {
      jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
        __esModule: true,
        default: {
          OS: 'web',
          select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
        },
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      webProps = require('../accessibility').decorativeProps as Record<string, unknown>;
    });
    return webProps;
  }

  afterEach(() => {
    jest.dontMock('react-native/Libraries/Utilities/Platform');
  });

  it('still hides the element from browser screen readers', () => {
    expect(loadOnWeb()['aria-hidden']).toBe(true);
  });

  it('emits none of the three native-only props (they only warn on web)', () => {
    const webProps = loadOnWeb();
    expect(webProps).not.toHaveProperty('accessible');
    expect(webProps).not.toHaveProperty('importantForAccessibility');
    expect(webProps).not.toHaveProperty('accessibilityElementsHidden');
    expect(Object.keys(webProps)).toEqual(['aria-hidden']);
  });
});

/**
 * a11yToggle — emits selection/toggle state so BOTH native and web screen
 * readers hear it. react-native-web@0.21.2 drops the nested accessibilityState
 * dialect, so the flat aria-* aliases are what a browser SR actually reads.
 * The original accessibilityState must be preserved verbatim (native parity,
 * and existing tests that read .props.accessibilityState).
 */
describe('a11yToggle', () => {
  it('preserves the original accessibilityState verbatim', () => {
    const state = { selected: true, disabled: false };
    expect(a11yToggle(state).accessibilityState).toBe(state);
  });

  it('maps each present key to its flat aria alias', () => {
    expect(a11yToggle({ selected: true })).toMatchObject({ 'aria-selected': true });
    expect(a11yToggle({ checked: true })).toMatchObject({ 'aria-checked': true });
    expect(a11yToggle({ checked: 'mixed' })).toMatchObject({ 'aria-checked': 'mixed' });
    expect(a11yToggle({ expanded: false })).toMatchObject({ 'aria-expanded': false });
    expect(a11yToggle({ busy: true })).toMatchObject({ 'aria-busy': true });
    expect(a11yToggle({ disabled: true })).toMatchObject({ 'aria-disabled': true });
  });

  it('emits aria aliases only for keys that are present', () => {
    const out = a11yToggle({ selected: true });
    expect(out).not.toHaveProperty('aria-disabled');
    expect(out).not.toHaveProperty('aria-checked');
    expect(out).not.toHaveProperty('aria-expanded');
    expect(out).not.toHaveProperty('aria-busy');
  });

  it('carries a defined false through (never drops it)', () => {
    expect(a11yToggle({ selected: false })).toMatchObject({ 'aria-selected': false });
    expect(a11yToggle({ disabled: false })).toMatchObject({ 'aria-disabled': false });
  });

  it('is safe on an undefined state (pass-through wrappers)', () => {
    const out = a11yToggle(undefined);
    expect(out.accessibilityState).toEqual({});
    expect(Object.keys(out)).toEqual(['accessibilityState']);
  });
});

/**
 * a11yToggle — `pressed` intent (BP2 / T11 / F1-03). Chromium DROPS aria-selected
 * from the AX tree on role=button (proven by the CDP probe
 * design-reviews/r2-audit/tools/probe-bp2-perception.mjs), so a role=button chip
 * that carried { selected } announced no state to a web screen reader. aria-pressed
 * IS honored on role=button, so the stateful chips pass { pressed } instead. The
 * repair must: emit aria-pressed for web, mirror the value into the nested
 * accessibilityState.selected so native VoiceOver still says "selected", NOT emit
 * aria-selected, keep any co-passed flags, and leave the ~90 non-pressed call
 * sites (and the object-identity contract above) untouched.
 */
describe('a11yToggle — pressed intent', () => {
  it('emits aria-pressed for a pressed toggle', () => {
    expect(a11yToggle({ pressed: true })).toMatchObject({ 'aria-pressed': true });
    expect(a11yToggle({ pressed: false })).toMatchObject({ 'aria-pressed': false });
  });

  it('mirrors pressed into accessibilityState.selected (native VoiceOver parity)', () => {
    expect(a11yToggle({ pressed: true }).accessibilityState).toMatchObject({ selected: true });
    expect(a11yToggle({ pressed: false }).accessibilityState).toMatchObject({ selected: false });
  });

  it('does NOT emit aria-selected on a pressed toggle (the whole point)', () => {
    // aria-selected is the channel Chromium drops on role=button — never emit it here.
    expect(a11yToggle({ pressed: true })).not.toHaveProperty('aria-selected');
  });

  it('does not leave a phantom `pressed` key on the nested accessibilityState', () => {
    // RN's AccessibilityState has no `pressed` field; it must be stripped.
    expect(a11yToggle({ pressed: true }).accessibilityState).not.toHaveProperty('pressed');
  });

  it('keeps co-passed flags (disabled while submitting) as web aliases', () => {
    const out = a11yToggle({ pressed: true, disabled: true });
    expect(out).toMatchObject({ 'aria-pressed': true, 'aria-disabled': true });
    expect(out.accessibilityState).toMatchObject({ selected: true, disabled: true });
  });

  it('leaves the non-pressed path (and its object identity) untouched', () => {
    const state = { selected: true };
    // No `pressed` key → the original selected/aria-selected behaviour, same ref.
    expect(a11yToggle(state).accessibilityState).toBe(state);
    expect(a11yToggle(state)).toMatchObject({ 'aria-selected': true });
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

/**
 * useReducedMotion — B5 (L4-05). The motion law (DESIGN.md §8: "ALWAYS gate
 * non-trivial motion behind useReducedMotion()") had ZERO test enforcement —
 * the hook itself was untested. That is exactly how the falsy-zero reduce-motion
 * trap (L4-01/02, fixed by S12) shipped and survived a flagged report. This
 * suite pins the hook's probe / live-subscription / fail-safe contract so a
 * regression that silently stops returning the live value is caught in CI, not
 * on a disabled user's device. Mirrors the useReduceTransparency suite above.
 */
describe('useReducedMotion', () => {
  let changeHandler: ((value: boolean) => void) | undefined;
  let removeSpy: jest.Mock;
  let probeResult: Promise<boolean>;

  beforeEach(() => {
    changeHandler = undefined;
    removeSpy = jest.fn();
    probeResult = Promise.resolve(false);

    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockImplementation(() => probeResult);

    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((event: string, handler: (value: boolean) => void) => {
        if (event === 'reduceMotionChanged') {
          changeHandler = handler;
        }
        return { remove: removeSpy } as ReturnType<typeof AccessibilityInfo.addEventListener>;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false initially (before the async probe resolves)', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('resolves to the probed value once isReduceMotionEnabled settles (true)', async () => {
    probeResult = Promise.resolve(true);
    const { result } = renderHook(() => useReducedMotion());

    await act(async () => {
      await probeResult;
    });

    expect(result.current).toBe(true);
  });

  it('subscribes to the "reduceMotionChanged" event', () => {
    renderHook(() => useReducedMotion());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function),
    );
  });

  it('updates live when the user toggles Reduce Motion on, then off', async () => {
    const { result } = renderHook(() => useReducedMotion());

    await act(async () => {
      await probeResult;
    });
    expect(result.current).toBe(false);

    act(() => {
      changeHandler?.(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      changeHandler?.(false);
    });
    expect(result.current).toBe(false);
  });

  it('removes its event subscription on unmount (no leak)', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('quietly stays false when the probe rejects (web / unsupported platform)', async () => {
    const rejected = Promise.reject(new Error('unsupported'));
    rejected.catch(() => {});
    probeResult = rejected;

    const { result } = renderHook(() => useReducedMotion());

    await act(async () => {
      await rejected.catch(() => {});
    });

    expect(result.current).toBe(false);
  });
});
