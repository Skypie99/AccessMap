/**
 * L8 + L10 (re-sweep 2026-06-09) — deep-link config factory.
 *
 *  - L8: createLinking(takePendingUrl) lets App.tsx's Gate hand the
 *        navigator a warm deep link captured while the user was signed out
 *        (no NavigationContainer mounted to receive the 'url' event).
 *        getInitialURL prefers the pending URL, falls back to RN's
 *        Linking.getInitialURL, and the Gate-style getter is consume-once.
 *  - L10: the Map path is `flag/:flagId?` — the OPTIONAL param keeps
 *        getPathFromState from serializing the paramless Map route as
 *        /flag/undefined in the web address bar, while `flag/abc` still
 *        parses to { flagId: 'abc' }.
 *
 * getStateFromPath / getPathFromState are React Navigation's own pure
 * helpers, so this exercises the exact parse/serialize logic the container
 * uses — no render harness needed (navigation is excluded from render
 * coverage, see jest.config.js).
 */

import { Linking } from 'react-native';
import {
  getPathFromState,
  getStateFromPath,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import { createLinking } from '../linking';

// ===========================================================================
// L8 — getInitialURL: pending URL from the Gate vs. platform cold-start URL
// ===========================================================================

describe('createLinking — getInitialURL (L8 warm link while signed out)', () => {
  let getInitialURLSpy: jest.SpyInstance;

  beforeEach(() => {
    getInitialURLSpy = jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue('accessmap://flag/cold-start');
  });

  afterEach(() => {
    getInitialURLSpy.mockRestore();
  });

  it('a pending URL captured by the Gate wins over the cold-start URL', async () => {
    const take = jest.fn(() => 'accessmap://flag/warm-1');
    const linking = createLinking(take);
    await expect(linking.getInitialURL()).resolves.toBe('accessmap://flag/warm-1');
    expect(take).toHaveBeenCalledTimes(1);
    expect(getInitialURLSpy).not.toHaveBeenCalled();
  });

  it('falls back to Linking.getInitialURL when nothing is pending', async () => {
    const linking = createLinking(() => null);
    await expect(linking.getInitialURL()).resolves.toBe('accessmap://flag/cold-start');
    expect(getInitialURLSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to Linking.getInitialURL when no getter is provided at all', async () => {
    const linking = createLinking();
    await expect(linking.getInitialURL()).resolves.toBe('accessmap://flag/cold-start');
    expect(getInitialURLSpy).toHaveBeenCalledTimes(1);
  });

  it('consume-once: a Gate-style getter delivers the link exactly once', async () => {
    // Mirrors the pendingUrlRef + clear-on-read getter in App.tsx's Gate.
    let pending: string | null = 'accessmap://flag/once';
    const take = () => {
      const url = pending;
      pending = null;
      return url;
    };
    const linking = createLinking(take);
    await expect(linking.getInitialURL()).resolves.toBe('accessmap://flag/once');
    // Second mount (sign out → sign in again): nothing pending anymore, so
    // the stale link must NOT re-fire — platform fallback instead.
    await expect(linking.getInitialURL()).resolves.toBe('accessmap://flag/cold-start');
    expect(getInitialURLSpy).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// L10 — optional :flagId path param
// ===========================================================================

describe('linking config — optional :flagId path param (L10)', () => {
  const { config } = createLinking();

  it("getStateFromPath('flag/abc') resolves the Map screen with flagId", () => {
    const state = getStateFromPath('flag/abc', config);
    expect(state).toBeTruthy();
    const route = state?.routes[0];
    expect(route?.name).toBe('Map');
    expect(route?.params).toEqual(expect.objectContaining({ flagId: 'abc' }));
  });

  it('serializing the Map route WITHOUT a flagId yields no "undefined" segment', () => {
    const paramless = { routes: [{ name: 'Map' }] } as PartialState<NavigationState>;
    const path = getPathFromState(paramless, config);
    expect(path).not.toContain('undefined');
  });

  it('round-trips: path → state → path → state preserves flagId', () => {
    const state1 = getStateFromPath('flag/abc', config);
    expect(state1).toBeTruthy();
    const path = getPathFromState(state1 as PartialState<NavigationState>, config);
    expect(path).toContain('flag/abc');
    expect(path).not.toContain('undefined');
    const state2 = getStateFromPath(path, config);
    expect(state2?.routes[0]?.name).toBe('Map');
    expect(state2?.routes[0]?.params).toEqual(expect.objectContaining({ flagId: 'abc' }));
  });
});
