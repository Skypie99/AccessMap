/**
 * Wave 4 — Gary: heatmapPrefs persistence tests.
 *
 * loadHeatmapEnabled / saveHeatmapEnabled are the only paths to the
 * '@accessmap/heatmap_enabled_v1' AsyncStorage key. These tests verify the
 * full round-trip: defaults, save+load, graceful degradation on storage
 * failure, and that arbitrary stored strings are treated as false (not true).
 *
 * AsyncStorage is mocked by jest.setup.js via the official
 * @react-native-async-storage/async-storage/jest/async-storage-mock.
 * Between each test we clear storage so state doesn't leak.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadHeatmapEnabled, saveHeatmapEnabled } from '../heatmapPrefs';

const STORAGE_KEY = '@accessmap/heatmap_enabled_v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('loadHeatmapEnabled', () => {
  it('returns false when nothing has been stored (fresh install default)', async () => {
    const result = await loadHeatmapEnabled();
    expect(result).toBe(false);
  });

  it('returns true after saveHeatmapEnabled(true)', async () => {
    await saveHeatmapEnabled(true);
    const result = await loadHeatmapEnabled();
    expect(result).toBe(true);
  });

  it('returns false after saveHeatmapEnabled(false)', async () => {
    // Set to true first, then write false, so the test doesn't pass trivially
    // because of an empty store.
    await saveHeatmapEnabled(true);
    await saveHeatmapEnabled(false);
    const result = await loadHeatmapEnabled();
    expect(result).toBe(false);
  });

  it('returns false when stored value is null (key exists but value is null)', async () => {
    // AsyncStorage.getItem returns null for a missing key; verify loadHeatmapEnabled
    // treats null as false without throwing.
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const result = await loadHeatmapEnabled();
    expect(result).toBe(false);
  });

  it('returns false for an unexpected stored string (only "true" maps to true)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'yes');
    const result = await loadHeatmapEnabled();
    expect(result).toBe(false);
  });

  it('returns false for the string "True" (case-sensitive check)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'True');
    const result = await loadHeatmapEnabled();
    expect(result).toBe(false);
  });

  it('returns false and warns when AsyncStorage.getItem throws', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk full'));

    const result = await loadHeatmapEnabled();
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[heatmapPrefs] load failed:'),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });
});

describe('saveHeatmapEnabled', () => {
  it('persists "true" to AsyncStorage when called with true', async () => {
    await saveHeatmapEnabled(true);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBe('true');
  });

  it('persists "false" to AsyncStorage when called with false', async () => {
    await saveHeatmapEnabled(false);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBe('false');
  });

  it('overwrites an existing value', async () => {
    await saveHeatmapEnabled(true);
    await saveHeatmapEnabled(false);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBe('false');
  });

  it('does not throw when AsyncStorage.setItem rejects — degrades to warn', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(saveHeatmapEnabled(true)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[heatmapPrefs] save failed:'),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });

  it('round-trip: save true → load → save false → load', async () => {
    await saveHeatmapEnabled(true);
    expect(await loadHeatmapEnabled()).toBe(true);
    await saveHeatmapEnabled(false);
    expect(await loadHeatmapEnabled()).toBe(false);
  });
});
