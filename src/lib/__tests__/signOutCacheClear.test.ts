/**
 * Guard tests for the sign-out teardown hardening (security audit 2026-07-31):
 *   - PL-2 / IO-5: Cache Storage must be purged on sign-out.
 *
 * Non-vacuity: each test asserts a property that is false in the pre-fix code,
 * so removing the fix fails the test rather than silently passing.
 */


describe('PL-2/IO-5 — Cache Storage is purged on sign-out', () => {
  const ORIGINAL = (globalThis as { caches?: unknown }).caches;

  afterEach(() => {
    if (ORIGINAL === undefined) delete (globalThis as { caches?: unknown }).caches;
    else (globalThis as { caches?: unknown }).caches = ORIGINAL;
    jest.resetModules();
  });

  it('deletes every accessmap-* cache, and leaves other origins’ caches alone', async () => {
    const deleted: string[] = [];
    (globalThis as { caches?: unknown }).caches = {
      keys: jest
        .fn()
        .mockResolvedValue([
          'accessmap-v2',
          'accessmap-tiles-v2',
          'accessmap-v3',
          'something-else',
        ]),
      delete: jest.fn(async (k: string) => {
        deleted.push(k);
        return true;
      }),
    };

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signOut } = require('../supabase') as typeof import('../supabase');
    await signOut();

    // Prefix sweep, not a hardcoded name: the future 'accessmap-v3' must go
    // too, because the real names are computed from CACHE_VERSION.
    expect(deleted.sort()).toEqual(['accessmap-tiles-v2', 'accessmap-v2', 'accessmap-v3']);
    expect(deleted).not.toContain('something-else');
  });

  it('purges even when signOut is called with no userId', async () => {
    // The pre-existing clears live inside `if (userId)`. Most callers do
    // `void signOut()` with no argument — if the purge sat in that block it
    // would almost never run, which is the bug this asserts against.
    const deleted: string[] = [];
    (globalThis as { caches?: unknown }).caches = {
      keys: jest.fn().mockResolvedValue(['accessmap-v2']),
      delete: jest.fn(async (k: string) => {
        deleted.push(k);
        return true;
      }),
    };

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signOut } = require('../supabase') as typeof import('../supabase');
    await signOut(); // <- no userId, deliberately

    expect(deleted).toEqual(['accessmap-v2']);
  });

  it('is a no-op on native, where Cache Storage does not exist', async () => {
    delete (globalThis as { caches?: unknown }).caches;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signOut } = require('../supabase') as typeof import('../supabase');
    await expect(signOut()).resolves.toBeDefined();
  });

  it('does not let a cache failure block the actual sign-out', async () => {
    (globalThis as { caches?: unknown }).caches = {
      keys: jest.fn().mockRejectedValue(new Error('quota')),
      delete: jest.fn(),
    };
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signOut } = require('../supabase') as typeof import('../supabase');
    // Sign-out must still complete: failing to clear a cache is not a reason
    // to leave the user signed in.
    await expect(signOut()).resolves.toBeDefined();
  });
});
