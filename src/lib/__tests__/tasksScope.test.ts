/**
 * Tests for src/lib/tasksScope.ts
 *
 * Verifies that the "mine only" toggle value is correctly persisted to and
 * loaded from AsyncStorage, and that both functions fail-soft when the
 * storage layer throws.
 */

import { loadScope, saveScope } from '../tasksScope';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockGet = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSet = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

describe('loadScope', () => {
  it('returns false when no stored value exists (null → default "show all")', async () => {
    mockGet.mockResolvedValueOnce(null);
    const result = await loadScope();
    expect(result).toBe(false);
  });

  it('returns true when stored value is "true"', async () => {
    mockGet.mockResolvedValueOnce('true');
    const result = await loadScope();
    expect(result).toBe(true);
  });

  it('returns false when stored value is "false"', async () => {
    mockGet.mockResolvedValueOnce('false');
    const result = await loadScope();
    expect(result).toBe(false);
  });

  it('returns false (safe default) and logs a warning when AsyncStorage read throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('disk full'));
    const result = await loadScope();
    expect(result).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      '[tasksScope] load failed:',
      expect.stringContaining('disk full'),
    );
  });
});

describe('saveScope', () => {
  it('writes "true" when mineOnly is true', async () => {
    mockSet.mockResolvedValueOnce(undefined);
    await saveScope(true);
    expect(mockSet).toHaveBeenCalledWith('@accessmap/tasks_scope_v1', 'true');
  });

  it('writes "false" when mineOnly is false', async () => {
    mockSet.mockResolvedValueOnce(undefined);
    await saveScope(false);
    expect(mockSet).toHaveBeenCalledWith('@accessmap/tasks_scope_v1', 'false');
  });

  it('swallows AsyncStorage write failures and logs a warning (fire-and-forget)', async () => {
    mockSet.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(saveScope(true)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      '[tasksScope] save failed:',
      expect.stringContaining('quota exceeded'),
    );
  });
});
