/**
 * Re-sweep FIX A — featureFlags store tests.
 *
 * Covers the in-memory flag store's public API:
 *
 *  - DEFAULTS: PUSH_NOTIF_TYPES_ENABLED ships false (Sky Decision 2,
 *    Option B — the Settings "Push notification types" row stays hidden
 *    until the push pipeline actually reads the saved prefs), and the
 *    pre-existing defaults are pinned so an accidental flip is caught.
 *  - setFlag: dev-only runtime override (no-ops when __DEV__ is false).
 *  - resetFlags: restores compiled defaults.
 *  - useFeatureFlag: reactive — re-renders subscribers on setFlag/resetFlags.
 *
 * The store is module-level state, so every test resets it in beforeEach.
 * jest-expo sets the global __DEV__ to true; the one test that needs the
 * production path flips the global and restores it in finally.
 */

import { act, renderHook } from '@testing-library/react-native';
import { isEnabled, resetFlags, setFlag, useFeatureFlag } from '../featureFlags';

beforeEach(() => {
  resetFlags();
});

afterAll(() => {
  resetFlags();
});

describe('defaults', () => {
  it('PUSH_NOTIF_TYPES_ENABLED defaults to false (hidden until push pipeline reads the prefs)', () => {
    expect(isEnabled('PUSH_NOTIF_TYPES_ENABLED')).toBe(false);
  });

  it('GUEST_SIGNIN_ENABLED defaults to false', () => {
    expect(isEnabled('GUEST_SIGNIN_ENABLED')).toBe(false);
  });

  it('HEATMAP_ENABLED and PUSH_NOTIFICATIONS_ENABLED default to true', () => {
    expect(isEnabled('HEATMAP_ENABLED')).toBe(true);
    expect(isEnabled('PUSH_NOTIFICATIONS_ENABLED')).toBe(true);
  });
});

describe('setFlag', () => {
  it('overrides a flag at runtime in dev', () => {
    setFlag('PUSH_NOTIF_TYPES_ENABLED', true);
    expect(isEnabled('PUSH_NOTIF_TYPES_ENABLED')).toBe(true);
  });

  it('only changes the targeted flag', () => {
    setFlag('PUSH_NOTIF_TYPES_ENABLED', true);
    expect(isEnabled('HEATMAP_ENABLED')).toBe(true);
    expect(isEnabled('PUSH_NOTIFICATIONS_ENABLED')).toBe(true);
    expect(isEnabled('GUEST_SIGNIN_ENABLED')).toBe(false);
  });

  it('is a no-op when __DEV__ is false (production builds cannot flip flags)', () => {
    const g = globalThis as { __DEV__?: boolean };
    const originalDev = g.__DEV__;
    try {
      g.__DEV__ = false;
      setFlag('PUSH_NOTIF_TYPES_ENABLED', true);
      expect(isEnabled('PUSH_NOTIF_TYPES_ENABLED')).toBe(false);
    } finally {
      g.__DEV__ = originalDev;
    }
  });
});

describe('resetFlags', () => {
  it('restores every flag to its compiled default', () => {
    setFlag('PUSH_NOTIF_TYPES_ENABLED', true);
    setFlag('HEATMAP_ENABLED', false);
    resetFlags();
    expect(isEnabled('PUSH_NOTIF_TYPES_ENABLED')).toBe(false);
    expect(isEnabled('HEATMAP_ENABLED')).toBe(true);
  });
});

describe('useFeatureFlag', () => {
  it('returns the current value', () => {
    const { result } = renderHook(() => useFeatureFlag('PUSH_NOTIF_TYPES_ENABLED'));
    expect(result.current).toBe(false);
  });

  it('re-renders when the flag changes via setFlag', () => {
    const { result } = renderHook(() => useFeatureFlag('PUSH_NOTIF_TYPES_ENABLED'));
    act(() => {
      setFlag('PUSH_NOTIF_TYPES_ENABLED', true);
    });
    expect(result.current).toBe(true);
  });

  it('re-renders back to the default when resetFlags is called', () => {
    const { result } = renderHook(() => useFeatureFlag('PUSH_NOTIF_TYPES_ENABLED'));
    act(() => {
      setFlag('PUSH_NOTIF_TYPES_ENABLED', true);
    });
    expect(result.current).toBe(true);
    act(() => {
      resetFlags();
    });
    expect(result.current).toBe(false);
  });
});
