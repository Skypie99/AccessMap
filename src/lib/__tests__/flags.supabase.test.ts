/**
 * Tests for the Supabase-backed query helpers in src/lib/flags.ts that
 * aren't covered by the existing flags.test.ts / createFlag.test.ts files:
 *
 *   - listFlags          — basic fetch + error propagation
 *   - listFlagsByUser    — user-scoped fetch + empty result
 *   - updateFlagStatus   — builder chain + error path
 *   - deleteFlag         — success + error
 *   - fetchFlagById      — found / not-found / error
 *   - fetchFlagsByIds    — multi-id fetch + short-circuit for empty input
 *   - listRecentFlags    — default + custom limit
 *   - listFlagStatusHistory — graceful degradation on table-missing error
 *   - listLeaderboard    — top-N users + error propagation
 *
 * All tests use a fully-mocked Supabase client so no network or DB is needed.
 * Pattern mirrors src/lib/__tests__/createFlag.test.ts.
 */

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

// We model the builder chain returned by supabase.from(table):
//   .select()  →  .in()  →  .order()  →  .limit()  →  exec
//   .update()  →  .eq()  →  .select()  →  .single()  →  exec
//   .delete()  →  .eq()  →  exec
//   .select()  →  .eq()  →  .maybeSingle()  →  exec
//   etc.
//
// Rather than trying to model every possible chain, we use a flexible
// chainable mock: every method on the chain builder returns itself and
// the terminal call (exec / single / maybeSingle) resolves from a queue.

const mockTerminal = jest.fn(); // .single() / .maybeSingle() / chain end
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();

// Generic chainable object: every unknown method returns itself.
// This means we don't have to enumerate select/in/order/limit/lt/eq/etc.
function makeChain(terminal: () => unknown): Record<string, unknown> {
  let lastMethod: 'single' | 'maybeSingle' | 'default' = 'default';
  let proxy: any;

  const getTerminal = () => {
    if (lastMethod === 'single') return mockSingle;
    if (lastMethod === 'maybeSingle') return mockMaybeSingle;
    return terminal;
  };

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Make the proxy thenable so it can be awaited.
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const terminalFn = getTerminal();
        const promise = Promise.resolve(terminalFn());
        return (promise as any)[prop].bind(promise);
      }
      // .single() and .maybeSingle() are chain methods that set the terminal handler and return the proxy.
      if (prop === 'single') {
        return () => {
          lastMethod = 'single';
          return proxy;
        };
      }
      if (prop === 'maybeSingle') {
        return () => {
          lastMethod = 'maybeSingle';
          return proxy;
        };
      }
      // Any other method returns a function that returns the proxy (chainable).
      return () => proxy;
    },
  };
  proxy = new Proxy({}, handler);
  return proxy as unknown as Record<string, unknown>;
}

const mockFrom = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after jest.mock)
// ---------------------------------------------------------------------------

import {
  listFlags,
  listFlagsByUser,
  updateFlagStatus,
  deleteFlag,
  fetchFlagById,
  fetchFlagsByIds,
  listRecentFlags,
  listFlagStatusHistory,
  listLeaderboard,
} from '../flags';
import type { FlagRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<FlagRow> = {}): FlagRow {
  return {
    id: 'f1',
    user_id: 'u1',
    lat: 49.28,
    lng: -123.12,
    category: 'no_ramp',
    severity: 3,
    description: null,
    photo_url: null,
    status: 'open',
    created_at: '2026-05-24T00:00:00Z',
    ...overrides,
  };
}

// A helper that sets up mockFrom so the final chain resolves with `result`.
// We use the flexible chain proxy; the terminal resolves via mockTerminal.
function setupChain(result: { data: unknown; error: unknown }) {
  mockTerminal.mockResolvedValueOnce(result);
  mockSingle.mockResolvedValueOnce(result);
  mockMaybeSingle.mockResolvedValueOnce(result);
  mockFrom.mockReturnValue(makeChain(() => Promise.resolve(result)));
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listFlags
// ---------------------------------------------------------------------------

describe('listFlags', () => {
  it('returns rows from the DB on success', async () => {
    const rows = [makeRow({ id: 'f1', status: 'open' }), makeRow({ id: 'f2', status: 'verified' })];
    setupChain({ data: rows, error: null });

    const result = await listFlags();
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('f1');
  });

  it('returns [] when data is null (Supabase null-data edge case)', async () => {
    setupChain({ data: null, error: null });
    const result = await listFlags();
    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    setupChain({ data: null, error: { code: '42P01', message: 'relation does not exist' } });
    await expect(listFlags()).rejects.toMatchObject({ code: '42P01' });
  });

  it('accepts a custom statuses array', async () => {
    setupChain({ data: [makeRow({ status: 'resolved' })], error: null });
    const result = await listFlags(['resolved']);
    expect(result[0]?.status).toBe('resolved');
  });
});

// ---------------------------------------------------------------------------
// listFlagsByUser
// ---------------------------------------------------------------------------

describe('listFlagsByUser', () => {
  it('returns all rows belonging to the user', async () => {
    const rows = [makeRow({ user_id: 'alice', id: 'f1' }), makeRow({ user_id: 'alice', id: 'f2' })];
    setupChain({ data: rows, error: null });

    const result = await listFlagsByUser('alice');
    expect(result).toHaveLength(2);
    expect(result[1]?.id).toBe('f2');
  });

  it('returns [] when the user has no flags', async () => {
    setupChain({ data: [], error: null });
    const result = await listFlagsByUser('nobody');
    expect(result).toEqual([]);
  });

  it('returns [] when data is null', async () => {
    setupChain({ data: null, error: null });
    const result = await listFlagsByUser('nobody');
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    setupChain({ data: null, error: { message: 'permission denied' } });
    await expect(listFlagsByUser('u1')).rejects.toMatchObject({ message: 'permission denied' });
  });
});

// ---------------------------------------------------------------------------
// updateFlagStatus
// ---------------------------------------------------------------------------

describe('updateFlagStatus', () => {
  it('returns the updated row on success', async () => {
    const updated = makeRow({ id: 'f1', status: 'verified' });
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });
    mockFrom.mockReturnValue(makeChain(() => {}));

    const result = await updateFlagStatus('f1', 'verified');
    expect(result.status).toBe('verified');
    expect(result.id).toBe('f1');
  });

  it('throws when Supabase returns an error', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS violation', code: '42501' },
    });
    mockFrom.mockReturnValue(makeChain(() => {}));

    await expect(updateFlagStatus('f1', 'resolved')).rejects.toMatchObject({ code: '42501' });
  });
});

// ---------------------------------------------------------------------------
// deleteFlag
// ---------------------------------------------------------------------------

describe('deleteFlag', () => {
  it('resolves without throwing on success', async () => {
    setupChain({ data: null, error: null });
    await expect(deleteFlag('f1')).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    setupChain({ data: null, error: { message: 'not found', code: '404' } });
    await expect(deleteFlag('f1')).rejects.toMatchObject({ code: '404' });
  });
});

// ---------------------------------------------------------------------------
// fetchFlagById
// ---------------------------------------------------------------------------

describe('fetchFlagById', () => {
  it('returns the flag row when found', async () => {
    const row = makeRow({ id: 'f42' });
    mockMaybeSingle.mockResolvedValueOnce({ data: row, error: null });
    mockFrom.mockReturnValue(makeChain(() => {}));

    const result = await fetchFlagById('f42');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('f42');
  });

  it('returns null when the flag does not exist (maybeSingle returns null data)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockFrom.mockReturnValue(makeChain(() => {}));

    const result = await fetchFlagById('stale-id');
    expect(result).toBeNull();
  });

  it('throws on a Supabase error', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'network error' },
    });
    mockFrom.mockReturnValue(makeChain(() => {}));

    await expect(fetchFlagById('f1')).rejects.toMatchObject({ message: 'network error' });
  });
});

// ---------------------------------------------------------------------------
// fetchFlagsByIds
// ---------------------------------------------------------------------------

describe('fetchFlagsByIds', () => {
  it('returns [] immediately for an empty ids array (no round-trip)', async () => {
    const result = await fetchFlagsByIds([]);
    expect(result).toEqual([]);
    // The Supabase client must NOT be called for an empty input.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns matching rows for a non-empty ids array', async () => {
    const rows = [makeRow({ id: 'a' }), makeRow({ id: 'b' })];
    setupChain({ data: rows, error: null });

    const result = await fetchFlagsByIds(['a', 'b']);
    expect(result).toHaveLength(2);
  });

  it('returns [] when data is null', async () => {
    setupChain({ data: null, error: null });
    const result = await fetchFlagsByIds(['missing']);
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    setupChain({ data: null, error: { message: 'DB down' } });
    await expect(fetchFlagsByIds(['x'])).rejects.toMatchObject({ message: 'DB down' });
  });
});

// ---------------------------------------------------------------------------
// listRecentFlags
// ---------------------------------------------------------------------------

describe('listRecentFlags', () => {
  it('returns rows newest-first', async () => {
    const rows = [makeRow({ id: 'new' }), makeRow({ id: 'old' })];
    setupChain({ data: rows, error: null });

    const result = await listRecentFlags();
    expect(result[0]?.id).toBe('new');
  });

  it('returns [] when data is null', async () => {
    setupChain({ data: null, error: null });
    const result = await listRecentFlags();
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    setupChain({ data: null, error: { message: 'timeout' } });
    await expect(listRecentFlags()).rejects.toMatchObject({ message: 'timeout' });
  });

  it('accepts a custom limit argument', async () => {
    setupChain({ data: [makeRow()], error: null });
    // Just verifying it resolves (the limit is forwarded to the chain; we
    // don't inspect the chain calls because the proxy absorbs them).
    await expect(listRecentFlags(10)).resolves.toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// listFlagStatusHistory — graceful degradation
// ---------------------------------------------------------------------------

describe('listFlagStatusHistory', () => {
  it('returns the history entries when the table exists and data is present', async () => {
    const entries = [
      { old_status: null, new_status: 'open', changed_by: 'u1', changed_at: '2026-05-01T00:00:00Z' },
      { old_status: 'open', new_status: 'verified', changed_by: 'u2', changed_at: '2026-05-02T00:00:00Z' },
    ];
    setupChain({ data: entries, error: null });

    const result = await listFlagStatusHistory('f1');
    expect(result).toHaveLength(2);
    expect(result[0]?.new_status).toBe('open');
    expect(result[1]?.new_status).toBe('verified');
  });

  it('returns [] (graceful degradation) when Supabase returns an error', async () => {
    // This covers the "table may not exist yet" case — PGRST204 or similar.
    setupChain({ data: null, error: { code: 'PGRST204', message: 'relation does not exist' } });

    const result = await listFlagStatusHistory('f1');
    expect(result).toEqual([]);
  });

  it('returns [] when data is null (no history recorded yet)', async () => {
    setupChain({ data: null, error: null });
    const result = await listFlagStatusHistory('f1');
    expect(result).toEqual([]);
  });

  it('returns [] when an unexpected exception is thrown (total failure guard)', async () => {
    // Simulate the chain throwing synchronously (e.g. network error in fetch).
    mockFrom.mockImplementationOnce(() => {
      throw new Error('network exploded');
    });

    const result = await listFlagStatusHistory('f1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listLeaderboard
// ---------------------------------------------------------------------------

describe('listLeaderboard', () => {
  it('returns the top users sorted by points descending', async () => {
    const users = [
      { id: 'u1', display_name: 'Alice', points: 100 },
      { id: 'u2', display_name: 'Bob', points: 50 },
    ];
    setupChain({ data: users, error: null });

    const result = await listLeaderboard();
    expect(result).toHaveLength(2);
    expect(result[0]?.points).toBe(100);
    expect(result[1]?.display_name).toBe('Bob');
  });

  it('returns [] when data is null', async () => {
    setupChain({ data: null, error: null });
    const result = await listLeaderboard();
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    setupChain({ data: null, error: { message: 'permission denied', code: '42501' } });
    await expect(listLeaderboard()).rejects.toMatchObject({ code: '42501' });
  });

  it('accepts a custom limit', async () => {
    setupChain({ data: [{ id: 'u1', display_name: 'Top', points: 999 }], error: null });
    const result = await listLeaderboard(1);
    expect(result).toHaveLength(1);
  });
});
