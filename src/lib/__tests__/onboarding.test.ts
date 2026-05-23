/**
 * Tests for src/lib/onboarding.ts — the per-user "has dismissed onboarding"
 * gate.
 *
 * The behavior we lock in:
 *  - First-launch: not seen.
 *  - After mark: seen.
 *  - After clear: not seen again (so "Show me the intro again" works).
 *  - On storage error: defaults to "not seen" — never silently hides the
 *    onboarding forever just because AsyncStorage hiccuped.
 *  - Keys are user-scoped, so two accounts on one device each get the
 *    first-run experience exactly once.
 */

const storage: Record<string, string> = {};
let throwOnGet = false;
let throwOnSet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (throwOnGet) {
        throwOnGet = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in storage ? storage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (throwOnSet) {
        throwOnSet = false;
        return Promise.reject(new Error('boom'));
      }
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
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
  for (const k of Object.keys(storage)) delete storage[k];
  throwOnGet = false;
  throwOnSet = false;
});

describe('hasSeenOnboarding', () => {
  it('is false on first launch', async () => {
    expect(await hasSeenOnboarding('u1')).toBe(false);
  });

  it('is true after markOnboardingSeen', async () => {
    await markOnboardingSeen('u1');
    expect(await hasSeenOnboarding('u1')).toBe(true);
  });

  it("returns false (not true) if storage rejects — so we don't bury the intro forever", async () => {
    await markOnboardingSeen('u1');
    throwOnGet = true;
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
    const written = storage['@accessmap/onboarding_seen_v1:u1'];
    expect(written).toBeDefined();
    // Sanity-check it parses as a real date close to now (within 5s).
    const ts = Date.parse(written);
    expect(Number.isFinite(ts)).toBe(true);
    expect(Math.abs(Date.now() - ts)).toBeLessThan(5000);
  });

  it('swallows storage errors (UI never throws)', async () => {
    throwOnSet = true;
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
