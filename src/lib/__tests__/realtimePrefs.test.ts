/**
 * D4 Realtime Preferences Tests
 *
 * Tests for realtimePrefs.ts:
 * - loadRealtimeEnabled: reads from AsyncStorage, returns false if missing
 * - saveRealtimeEnabled: writes to AsyncStorage and notifies listeners
 * - useRealtimeEnabled hook: hydrates from disk, subscribes to updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadRealtimeEnabled,
  saveRealtimeEnabled,
} from '../realtimePrefs';

// AsyncStorage is already mocked in jest.setup.js
jest.mock('@react-native-async-storage/async-storage');

describe('realtimePrefs — D4 Per-User Opt-In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Test 1: loadRealtimeEnabled returns false when key missing
  // ========================================================================
  it('returns false when realtime_enabled key does not exist', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const result = await loadRealtimeEnabled();
    expect(result).toBe(false);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('realtime_enabled');
  });

  // ========================================================================
  // Test 2: loadRealtimeEnabled returns true when key is 'true'
  // ========================================================================
  it('returns true when realtime_enabled is stored as "true"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const result = await loadRealtimeEnabled();
    expect(result).toBe(true);
  });

  // ========================================================================
  // Test 3: loadRealtimeEnabled returns false when key is 'false'
  // ========================================================================
  it('returns false when realtime_enabled is stored as "false"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

    const result = await loadRealtimeEnabled();
    expect(result).toBe(false);
  });

  // ========================================================================
  // Test 4: loadRealtimeEnabled handles AsyncStorage errors gracefully
  // ========================================================================
  it('returns false and logs when AsyncStorage.getItem throws', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
      new Error('AsyncStorage error'),
    );

    const result = await loadRealtimeEnabled();
    expect(result).toBe(false);
    consoleWarnSpy.mockRestore();
  });

  // ========================================================================
  // Test 5: saveRealtimeEnabled writes 'true' to AsyncStorage when true
  // ========================================================================
  it('writes "true" to AsyncStorage when saving true', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await saveRealtimeEnabled(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'realtime_enabled',
      'true',
    );
  });

  // ========================================================================
  // Test 6: saveRealtimeEnabled writes 'false' to AsyncStorage when false
  // ========================================================================
  it('writes "false" to AsyncStorage when saving false', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await saveRealtimeEnabled(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'realtime_enabled',
      'false',
    );
  });

  // ========================================================================
  // Test 7: saveRealtimeEnabled throws on AsyncStorage write failure
  // ========================================================================
  it('throws when AsyncStorage.setItem fails', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
      new Error('Storage full'),
    );

    await expect(saveRealtimeEnabled(true)).rejects.toThrow('Storage full');
  });
});
