/**
 * Tests for src/lib/onboarding.ts — the per-user "has dismissed onboarding"
 * gate.
 *
 * The behavior we lock in:
 *  - First-launch: not seen.
 *  - After mark: seen.
 *  - After clear: not seen again (so "Show me the intro again" works).
 *  - On mockStorage error: defaults to "not seen" — never silently hides the
 *    onboarding forever just because AsyncStorage hiccuped.
 *  - Keys are user-scoped, so two accounts on one device each get the
 *    first-run experience exactly once.
 */

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

import {
  hasSeenOnboarding,
  markOnboardingSeen,
  clearOnboardingSeen,
} from '../onboarding';

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowOnGet = false;
  mockThrowOnSet = false;
});

describe('hasSeenOnboarding', () => {
  it('is false on first launch', async () => {
    expect(await hasSeenOnboarding('u1')).toBe(false);
  });

  it('is true after markOnboardingSeen', async () => {
    await markOnboardingSeen('u1');
    expect(await hasSeenOnboarding('u1')).toBe(true);
  });

  it("returns false (not true) if mockStorage rejects — so we don't bury the intro forever", async () => {
    await markOnboardingSeen('u1');
    mockThrowOnGet = true;
    expect(await hasSeenOnboarding('u1')).toBe(false);
  });
});

describe('clearOnboardingSeen', () => {
  it('lets the intro show again', async () => {
    await markOnboardingSeen('u1');
    expect(await hasSeenOnboarding('u1')).toBe(true);
    await clearOnboardingSeen('u1');
    expect(await hasSeenOnboarding('u1')).toBe(false);
  });
});

describe('markOnboardingSeen', () => {
  it('writes an ISO timestamp (cheap signal for later analytics)', async () => {
    await markOnboardingSeen('u1');
    const written = mockStorage['@accessmap/onboarding_seen_v1:u1'];
    expect(written).toBeDefined();
    // Sanity-check it parses as a real date close to now (within 5s).
    // The `!` satisfies tsconfig's noUncheckedIndexedAccess after the
    // toBeDefined assertion above.
    const ts = Date.parse(written!);
    expect(Number.isFinite(ts)).toBe(true);
    expect(Math.abs(Date.now() - ts)).toBeLessThan(5000);
  });

  it('swallows mockStorage errors (UI never throws)', async () => {
    mockThrowOnSet = true;
    await expect(markOnboardingSeen('u1')).resolves.toBeUndefined();
  });
});

describe('per-user isolation', () => {
  it('two users on the same device each have their own flag', async () => {
    await markOnboardingSeen('alice');
    expect(await hasSeenOnboarding('alice')).toBe(true);
    expect(await hasSeenOnboarding('bob')).toBe(false);
  });
});
