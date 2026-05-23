/**
 * Tests for src/lib/preferences.ts — the per-user landing-tab preference,
 * persisted to AsyncStorage.
 *
 * Uses a tiny in-memory AsyncStorage stub so the mockStorage helpers can be
 * exercised without RN's native bridge. The stub matches the four methods
 * preferences.ts actually calls (getItem/setItem/removeItem). The "mockStorage
 * throws" branch is covered separately by forcing the stub to reject.
 *
 * What this protects against:
 *  - A typo in the mockStorage key prefix that would silently reset every user
 *    to 'Map' on next launch (we'd never notice until someone complained).
 *  - A regression where the validator (`isDefaultTab`) lets through a string
 *    that isn't a real tab — the navigator would then crash on startup.
 *  - The defensive "return 'Map' if mockStorage rejects" path that keeps the
 *    app launchable even when AsyncStorage is broken.
 */

const mockStorage: Record<string, string> = {};
let mockThrowNext = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (mockThrowNext) {
        mockThrowNext = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in mockStorage ? mockStorage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (mockThrowNext) {
        mockThrowNext = false;
        return Promise.reject(new Error('boom'));
      }
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

import {
  DEFAULT_TABS,
  getDefaultTab,
  setDefaultTab,
} from '../preferences';

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowNext = false;
});

describe('DEFAULT_TABS', () => {
  it('lists the three real tabs in the canonical order', () => {
    expect(DEFAULT_TABS).toEqual(['Map', 'Tasks', 'Profile']);
  });
});

describe('getDefaultTab', () => {
  const user = 'user-1';

  it("returns 'Map' the first time we ask (no stored value yet)", async () => {
    expect(await getDefaultTab(user)).toBe('Map');
  });

  it('returns a previously-set tab', async () => {
    await setDefaultTab(user, 'Tasks');
    expect(await getDefaultTab(user)).toBe('Tasks');
  });

  it("falls back to 'Map' for a stored value that isn't a known tab", async () => {
    // Simulate corrupt mockStorage / older schema / hand-edited devtools value.
    mockStorage['@accessmap/default_tab_v1:user-1'] = 'SomethingElse';
    expect(await getDefaultTab(user)).toBe('Map');
  });

  it("falls back to 'Map' if the underlying mockStorage rejects", async () => {
    mockThrowNext = true;
    expect(await getDefaultTab(user)).toBe('Map');
  });

  it('keeps preferences keyed per user (no cross-contamination)', async () => {
    await setDefaultTab('user-1', 'Profile');
    await setDefaultTab('user-2', 'Tasks');
    expect(await getDefaultTab('user-1')).toBe('Profile');
    expect(await getDefaultTab('user-2')).toBe('Tasks');
  });
});

describe('setDefaultTab', () => {
  it('swallows mockStorage errors (the UI never throws)', async () => {
    mockThrowNext = true;
    await expect(setDefaultTab('user-1', 'Tasks')).resolves.toBeUndefined();
  });
});
