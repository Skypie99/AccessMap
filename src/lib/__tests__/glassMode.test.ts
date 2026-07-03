/**
 * glassMode tests — the Deep Field C-lite runtime switch (GLASS.md).
 *
 * What this locks in:
 *   1. Default is 'full' (Candidate C as designed) until told otherwise.
 *   2. toggle/set flips + notifies subscribers + persists to the standard
 *      '@accessmap/glass_mode_v1' key.
 *   3. Hydration restores a saved mode; a READ failure warns and keeps the
 *      'full' fallback (ephemeral-preference tier — never throws).
 *   4. Every flip announces to screen readers (the switch is a hidden
 *      long-press with no persistent UI — WCAG 4.1.3).
 *   5. NOT __DEV__-gated: the module has no __DEV__ branch — the one
 *      TestFlight build must carry both material modes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import {
  __resetGlassModeForTests,
  getGlassMode,
  hydrateGlassMode,
  setGlassMode,
  subscribeGlassMode,
  toggleGlassMode,
} from '../glassMode';

const STORAGE_KEY = '@accessmap/glass_mode_v1';

describe('glassMode', () => {
  let announceSpy: jest.SpyInstance;

  beforeEach(async () => {
    __resetGlassModeForTests();
    await AsyncStorage.clear();
    announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
  });

  afterEach(() => {
    announceSpy.mockRestore();
  });

  it("defaults to 'full'", () => {
    expect(getGlassMode()).toBe('full');
  });

  it('toggle flips full → lite → full and returns the new mode', () => {
    expect(toggleGlassMode()).toBe('lite');
    expect(getGlassMode()).toBe('lite');
    expect(toggleGlassMode()).toBe('full');
    expect(getGlassMode()).toBe('full');
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const fn = jest.fn();
    const unsubscribe = subscribeGlassMode(fn);
    setGlassMode('lite');
    expect(fn).toHaveBeenCalledTimes(1);
    setGlassMode('lite'); // no-op — same mode
    expect(fn).toHaveBeenCalledTimes(1);
    unsubscribe();
    setGlassMode('full');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('persists the mode under the standard key', async () => {
    setGlassMode('lite');
    // The write is fire-and-forget — flush the microtask queue.
    await Promise.resolve();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('lite');
  });

  it('hydrates a saved mode and notifies', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'lite');
    const fn = jest.fn();
    subscribeGlassMode(fn);
    expect(await hydrateGlassMode()).toBe('lite');
    expect(getGlassMode()).toBe('lite');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('hydrate is one-shot (later saves do not re-hydrate)', async () => {
    expect(await hydrateGlassMode()).toBe('full');
    await AsyncStorage.setItem(STORAGE_KEY, 'lite');
    expect(await hydrateGlassMode()).toBe('full');
  });

  it("ignores a corrupt stored value (stays 'full')", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'maximum-glass');
    expect(await hydrateGlassMode()).toBe('full');
  });

  it("a READ failure warns and keeps the 'full' fallback (never throws)", async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const getSpy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(hydrateGlassMode()).resolves.toBe('full');
    expect(warnSpy).toHaveBeenCalled();
    getSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('announces every flip to screen readers', () => {
    setGlassMode('lite');
    expect(announceSpy).toHaveBeenCalledWith('Glass effects reduced');
    setGlassMode('full');
    expect(announceSpy).toHaveBeenCalledWith('Glass effects full');
  });
});
