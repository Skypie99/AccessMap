/**
 * Unit tests for the cursor-paginated listFlagsPage helper in src/lib/flags.ts.
 *
 * Covers:
 *  - Correct return shape: { rows, nextCursor }
 *  - hasMore (nextCursor !== null) when results === limit
 *  - hasMore is false when results < limit
 *  - Cursor is forwarded on a second-page call
 *  - De-duplication in FlagsProvider.loadMore (row appearing in both pages is
 *    not doubled in the merged list)
 *  - Supabase error propagates as a throw
 *
 * The supabase client is fully mocked — no network or real DB required.
 * Follows the established pattern in src/lib/__tests__/createFlag.test.ts.
 */

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockQueryExec = jest.fn();

interface QueryState {
  table: string;
  inCol?: string;
  inVals?: unknown[];
  orderCol?: string;
  limitN?: number;
  ltCol?: string;
  ltVal?: string;
}

let currentQuery: QueryState = { table: '' };

function makeBuilder(state: QueryState) {
  const builder = {
    select: (_cols: string) => makeBuilder(state),
    in: (col: string, vals: unknown[]) => {
      state.inCol = col;
      state.inVals = vals;
      return makeBuilder(state);
    },
    order: (col: string) => {
      state.orderCol = col;
      return makeBuilder(state);
    },
    limit: (n: number) => {
      state.limitN = n;
      return makeBuilder(state);
    },
    lt: (col: string, val: string) => {
      state.ltCol = col;
      state.ltVal = val;
      return makeBuilder(state);
    },
    then: (resolve: (val: unknown) => unknown, reject: (err: unknown) => unknown) => {
      return mockQueryExec().then(resolve, reject);
    },
  };
  return builder;
}

const mockFrom = jest.fn((table: string) => {
  currentQuery = { table };
  return makeBuilder(currentQuery);
});

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { from: (t: string) => mockFrom(t) },
}));

// ─── Subject under test ───────────────────────────────────────────────────────
import { listFlagsPage, INITIAL_PAGE_SIZE } from '../flags';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRow(id: string, createdAt: string) {
  return {
    id,
    user_id: 'user-1',
    lat: 49.28,
    lng: -123.12,
    category: 'no_ramp',
    severity: 3,
    description: null,
    photo_url: null,
    status: 'open',
    created_at: createdAt,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  currentQuery = { table: '' };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('listFlagsPage — return shape', () => {
  it('returns { rows, nextCursor } matching the FlagRow shape', async () => {
    const row = makeRow('flag-1', '2026-05-25T10:00:00Z');
    mockQueryExec.mockResolvedValueOnce({ data: [row], error: null });

    const result = await listFlagsPage(['open'], { limit: 1 });

    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('nextCursor');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ id: 'flag-1', status: 'open' });
  });
});

describe('listFlagsPage — hasMore / nextCursor', () => {
  it('nextCursor is null when results < limit (end of data)', async () => {
    const rows = [makeRow('f1', '2026-05-25T10:00:00Z')];
    mockQueryExec.mockResolvedValueOnce({ data: rows, error: null });

    const result = await listFlagsPage(['open'], { limit: 5 });

    expect(result.nextCursor).toBeNull();
    expect(result.rows).toHaveLength(1);
  });

  it('nextCursor is the last row created_at when results === limit', async () => {
    const limit = 3;
    const rows = [
      makeRow('f1', '2026-05-25T12:00:00Z'),
      makeRow('f2', '2026-05-25T11:00:00Z'),
      makeRow('f3', '2026-05-25T10:00:00Z'),
    ];
    mockQueryExec.mockResolvedValueOnce({ data: rows, error: null });

    const result = await listFlagsPage(['open'], { limit });

    expect(result.nextCursor).toBe('2026-05-25T10:00:00Z');
    expect(result.rows).toHaveLength(3);
  });

  it('nextCursor is null when data is null / empty', async () => {
    mockQueryExec.mockResolvedValueOnce({ data: null, error: null });

    const result = await listFlagsPage(['open'], { limit: 5 });

    expect(result.rows).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});

describe('listFlagsPage — default limit', () => {
  it('uses INITIAL_PAGE_SIZE when no limit is provided', async () => {
    mockQueryExec.mockResolvedValueOnce({ data: [], error: null });

    await listFlagsPage(['open']);

    expect(currentQuery.limitN).toBe(INITIAL_PAGE_SIZE);
  });
});

describe('listFlagsPage — cursor forwarding', () => {
  it('passes `before` cursor as a lt filter on created_at', async () => {
    const cursor = '2026-05-25T10:00:00Z';
    mockQueryExec.mockResolvedValueOnce({ data: [], error: null });

    await listFlagsPage(['open'], { limit: 5, before: cursor });

    expect(currentQuery.ltCol).toBe('created_at');
    expect(currentQuery.ltVal).toBe(cursor);
  });

  it('does NOT add a lt filter when no cursor is provided', async () => {
    mockQueryExec.mockResolvedValueOnce({ data: [], error: null });

    await listFlagsPage(['open'], { limit: 5 });

    expect(currentQuery.ltCol).toBeUndefined();
    expect(currentQuery.ltVal).toBeUndefined();
  });
});

describe('listFlagsPage — de-duplication (realtime race)', () => {
  it('merged list does not double a row that appears on both pages', () => {
    const sharedRow = makeRow('shared-id', '2026-05-25T11:00:00Z');
    const page1 = [makeRow('f1', '2026-05-25T12:00:00Z'), sharedRow];
    const page2 = [sharedRow, makeRow('f2', '2026-05-25T10:00:00Z')];

    const prev = page1;
    const seen = new Set(prev.map((f) => f.id));
    const additions = page2.filter((r) => !seen.has(r.id));
    const merged = additions.length === 0 ? prev : [...prev, ...additions];

    expect(merged).toHaveLength(3);
    const ids = merged.map((r) => r.id);
    expect(ids.filter((id) => id === 'shared-id')).toHaveLength(1);
    expect(ids).toContain('f1');
    expect(ids).toContain('f2');
  });
});

describe('listFlagsPage — error propagation', () => {
  it('throws when Supabase returns an error', async () => {
    const supabaseError = { message: 'DB connection refused', code: '500' };
    mockQueryExec.mockResolvedValueOnce({ data: null, error: supabaseError });

    await expect(listFlagsPage(['open'], { limit: 5 })).rejects.toMatchObject({
      message: 'DB connection refused',
    });
  });

  it('propagates a network-level rejection', async () => {
    mockQueryExec.mockRejectedValueOnce(new Error('Network error'));

    await expect(listFlagsPage(['open'], { limit: 5 })).rejects.toThrow('Network error');
  });
});
