/**
 * Tests for src/lib/onboardingState.ts — the DEVICE-WIDE first-launch
 * onboarding gate. Distinct from src/lib/onboarding.ts (which is the
 * per-user gate that runs after sign-in).
 *
 * The behavior we lock in:
 *  - First launch: key absent → loadOnboarded() returns false.
 *  - After setOnboarded(): loadOnboarded() returns true.
 *  - After clearOnboarded(): loadOnboarded() returns false (so a debug
 *    "reset onboarding" path works).
 *  - Corrupt / invalid stored value: returns false (defensive — show the
 *    intro rather than bury it forever).
 *  - AsyncStorage error on read: returns false (same defensive posture).
 */
import { ONBOARDED_KEY, loadOnboarded, setOnboarded, clearOnboarded } from '../onboardingState';

const mockStorage: Record<string, string> = {};
let mockThrowOnGet = false;
let mockThrowOnSet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (mockThrowOnGet) {
        mockThrowOnGet = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in mockStorage ? mockStorage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (mockThrowOnSet) {
        mockThrowOnSet = false;
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
  mockThrowOnGet = false;
  mockThrowOnSet = false;
});

describe('onboardingState', () => {
  it('uses the documented storage key (contract — App.tsx and any future migration depend on this)', () => {
    expect(ONBOARDED_KEY).toBe('@accessmap/onboarded_v1');
  });

  it('returns false when the key has never been written', async () => {
    expect(await loadOnboarded()).toBe(false);
  });

  it('returns true after setOnboarded()', async () => {
    await setOnboarded();
    expect(await loadOnboarded()).toBe(true);
  });

  it('returns false again after clearOnboarded() — so a reset path can re-show the intro', async () => {
    await setOnboarded();
    expect(await loadOnboarded()).toBe(true);
    await clearOnboarded();
    expect(await loadOnboarded()).toBe(false);
  });

  it('returns false on a corrupt stored value (defensive — never bury the intro forever)', async () => {
    mockStorage[ONBOARDED_KEY] = '{not-our-shape}';
    expect(await loadOnboarded()).toBe(false);
  });

  it('returns false when AsyncStorage throws on read', async () => {
    await setOnboarded();
    mockThrowOnGet = true;
    expect(await loadOnboarded()).toBe(false);
  });

  it('swallows AsyncStorage errors on write (UI never throws)', async () => {
    mockThrowOnSet = true;
    await expect(setOnboarded()).resolves.toBeUndefined();
  });
});
