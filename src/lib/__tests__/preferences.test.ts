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
 *    to 'Home' on next launch (we'd never notice until someone complained).
 *  - A regression where the validator (`isDefaultTab`) lets through a string
 *    that isn't a real tab — the navigator would then crash on startup.
 *  - The defensive "return 'Home' if mockStorage rejects" path that keeps the
 *    app launchable even when AsyncStorage is broken.
 *  - The Phase 7a migration: a stored 'Map' (the old tab) resolves to 'Home'.
 */

import { DEFAULT_TABS, getDefaultTab, setDefaultTab } from '../preferences';

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

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowNext = false;
});

describe('DEFAULT_TABS', () => {
  it('lists the three real tabs in the canonical order', () => {
    expect(DEFAULT_TABS).toEqual(['Home', 'Tasks', 'Profile']);
  });
});

describe('getDefaultTab', () => {
  const user = 'user-1';

  it("returns 'Home' the first time we ask (no stored value yet)", async () => {
    expect(await getDefaultTab(user)).toBe('Home');
  });

  it('returns a previously-set tab', async () => {
    await setDefaultTab(user, 'Tasks');
    expect(await getDefaultTab(user)).toBe('Tasks');
  });

  it("migrates a stored 'Map' (the old tab) to 'Home'", async () => {
    // Phase 7a renamed the Map tab to Home (the full map became a hidden
    // route). Existing users with 'Map' saved must keep a valid landing tab.
    mockStorage['@accessmap/default_tab_v1:user-1'] = 'Map';
    expect(await getDefaultTab(user)).toBe('Home');
  });

  it("falls back to 'Home' for a stored value that isn't a known tab", async () => {
    // Simulate corrupt mockStorage / older schema / hand-edited devtools value.
    mockStorage['@accessmap/default_tab_v1:user-1'] = 'SomethingElse';
    expect(await getDefaultTab(user)).toBe('Home');
  });

  it("falls back to 'Home' if the underlying mockStorage rejects", async () => {
    mockThrowNext = true;
    expect(await getDefaultTab(user)).toBe('Home');
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
