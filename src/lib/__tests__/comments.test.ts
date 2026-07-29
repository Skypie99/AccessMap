// Supabase mock — must be declared before jest.mock() hoisting.
import {
  addComment,
  COMMENT_SELECT,
  CommentsTableNotReadyError,
  deleteComment,
  fetchCommentsByIds,
  listComments,
  MAX_COMMENT_LENGTH,
  MAX_COMMENTS,
} from '../comments';

const mockFrom = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockChain = Record<string, jest.Mock>;

// Build a fluent chain mock that resolves the terminal call with `result`.
// Each method returns the chain so callers can set up .select().eq().order()
// without caring about the intermediate return values.
function makeChain(result: unknown): MockChain & { _result: unknown } {
  const chain: MockChain & { _result: unknown } = { _result: result };
  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      const fn = jest.fn().mockReturnValue(self);
      target[prop as string] = fn;
      return fn;
    },
  });
  // The last call in a chain resolves — we make `.order`, `.single`, `.eq`
  // all return a Promise when they have no further chaining expectations.
  // For simplicity, return `self` for all but make it also a thenable.
  return self;
}

// Build a minimal resolved-chain for select queries.
function selectChain(data: unknown[], error: unknown = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data, error }),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: data[0], error }),
    delete: jest.fn().mockReturnThis(),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// MAX_COMMENT_LENGTH
// ---------------------------------------------------------------------------

describe('MAX_COMMENT_LENGTH', () => {
  it('is 500', () => {
    expect(MAX_COMMENT_LENGTH).toBe(500);
  });
});

describe('MAX_COMMENTS', () => {
  it('is 200', () => {
    expect(MAX_COMMENTS).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// listComments
// ---------------------------------------------------------------------------

describe('listComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty array when there are no comments', async () => {
    const chain = selectChain([]);
    mockFrom.mockReturnValue(chain);

    const result = await listComments('flag-1');
    expect(result).toEqual([]);
    expect(mockFrom).toHaveBeenCalledWith('flag_comments');
  });

  it('filters by flag_id and orders by created_at (newest first)', async () => {
    const chain = selectChain([]);
    mockFrom.mockReturnValue(chain);

    await listComments('flag-42');

    expect(chain.eq).toHaveBeenCalledWith('flag_id', 'flag-42');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('caps the fetch at MAX_COMMENTS (200) rows', async () => {
    const chain = selectChain([]);
    mockFrom.mockReturnValue(chain);

    await listComments('flag-42');

    expect(chain.limit).toHaveBeenCalledWith(200);
    expect(chain.limit).toHaveBeenCalledWith(MAX_COMMENTS);
  });

  it('flattens the users.display_name join into display_name', async () => {
    const rawRow = {
      id: 'c1',
      flag_id: 'flag-1',
      user_id: 'user-1',
      content: 'Great spot!',
      created_at: '2026-05-30T12:00:00Z',
      users: { display_name: 'Sky' },
    };
    const chain = selectChain([rawRow]);
    mockFrom.mockReturnValue(chain);

    const result = await listComments('flag-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'c1',
      flag_id: 'flag-1',
      user_id: 'user-1',
      content: 'Great spot!',
      display_name: 'Sky',
    });
  });

  it('sets display_name to null when users is null (deleted user)', async () => {
    const rawRow = {
      id: 'c2',
      flag_id: 'flag-1',
      user_id: 'user-x',
      content: 'Note',
      created_at: '2026-05-30T13:00:00Z',
      users: null,
    };
    const chain = selectChain([rawRow]);
    mockFrom.mockReturnValue(chain);

    const [comment] = await listComments('flag-1');
    expect(comment.display_name).toBeNull();
  });

  it('throws CommentsTableNotReadyError on 42P01 error code', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation "flag_comments" does not exist' },
      }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(listComments('flag-1')).rejects.toBeInstanceOf(CommentsTableNotReadyError);
  });

  it('throws a plain Error on other Supabase errors', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS policy violation' },
      }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(listComments('flag-1')).rejects.toThrow('RLS policy violation');
  });
});

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------

describe('addComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects with an error when content is empty', async () => {
    await expect(addComment('flag-1', '')).rejects.toThrow('empty');
    await expect(addComment('flag-1', '   ')).rejects.toThrow('empty');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects when content exceeds MAX_COMMENT_LENGTH', async () => {
    const tooLong = 'x'.repeat(MAX_COMMENT_LENGTH + 1);
    await expect(addComment('flag-1', tooLong)).rejects.toThrow(/500/);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('inserts and returns the flattened comment on success', async () => {
    const rawRow = {
      id: 'c3',
      flag_id: 'flag-1',
      user_id: 'user-1',
      content: 'New comment',
      created_at: '2026-05-30T14:00:00Z',
      users: { display_name: 'Riley' },
    };
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: rawRow, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await addComment('flag-1', 'New comment');
    expect(result).toMatchObject({
      id: 'c3',
      content: 'New comment',
      display_name: 'Riley',
    });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ flag_id: 'flag-1', content: 'New comment' }),
    );
  });

  it('trims whitespace before inserting', async () => {
    const rawRow = {
      id: 'c4',
      flag_id: 'flag-1',
      user_id: 'u1',
      content: 'trimmed',
      created_at: '2026-05-30T14:00:00Z',
      users: { display_name: null },
    };
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: rawRow, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await addComment('flag-1', '  trimmed  ');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'trimmed' }),
    );
  });

  it('accepts content exactly at MAX_COMMENT_LENGTH', async () => {
    const exactly500 = 'a'.repeat(MAX_COMMENT_LENGTH);
    const rawRow = {
      id: 'c5',
      flag_id: 'flag-1',
      user_id: 'u1',
      content: exactly500,
      created_at: '2026-05-30T14:00:00Z',
      users: { display_name: null },
    };
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: rawRow, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(addComment('flag-1', exactly500)).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------

describe('deleteComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls delete().eq(id) and resolves on success', async () => {
    const chain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(deleteComment('c1')).resolves.toBeUndefined();
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'c1');
  });

  it('throws on Supabase error', async () => {
    const chain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(deleteComment('bad-id')).rejects.toThrow('not found');
  });
});

// ---------------------------------------------------------------------------
// B-7 / SR-092 — the disambiguated users embed
//
// Comments were dead in production for every cohort: a bare `users(...)` embed
// is ambiguous because comment_votes carries FKs to BOTH flag_comments and
// users, so PostgREST derives a second many-to-many relationship and answers
// PGRST201 / HTTP 300. Verified against prod on 2026-07-26: the bare form
// returns 300, the hinted form returns 200, and PostgREST's own hint names
// 'users!flag_comments_user_id_fkey'.
//
// jest could never have caught this — supabase is mocked, so the select string
// was never asserted anywhere. These are those assertions.
// ---------------------------------------------------------------------------

describe('B-7 — PGRST201 embed guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('COMMENT_SELECT names the direct FK, never a bare users( embed', () => {
    expect(COMMENT_SELECT).toContain('users!flag_comments_user_id_fkey(display_name)');
    // A bare `users(` anywhere in the string is the bug returning.
    expect(/(^|[\s,])users\(/.test(COMMENT_SELECT)).toBe(false);
  });

  it('listComments sends the disambiguated embed', async () => {
    const chain = selectChain([]);
    mockFrom.mockReturnValue(chain);

    await listComments('flag-42');

    expect(chain.select).toHaveBeenCalledWith(COMMENT_SELECT);
  });

  it("addComment's returning-clause sends the same embed (both paths were broken)", async () => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'c9',
          flag_id: 'flag-1',
          user_id: 'u1',
          content: 'hi',
          created_at: '2026-07-26T00:00:00Z',
          users: { display_name: 'Sky' },
        },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    await addComment('flag-1', 'hi');

    expect(chain.select).toHaveBeenCalledWith(COMMENT_SELECT);
  });

  it('a PGRST201 embed failure is NOT misread as a missing table', async () => {
    // The failure mode this guards: isTableMissingError() matches the loose
    // phrase "does not exist", which a relationship error body can carry. If
    // it swallowed one, the UI would say "Comments coming soon" for a broken
    // join — a worse lie than an honest error.
    const chain = selectChain([], {
      code: 'PGRST201',
      message: "Could not embed because more than one relationship was found for 'flag_comments' and 'users'",
    });
    mockFrom.mockReturnValue(chain);

    await expect(listComments('flag-1')).rejects.not.toBeInstanceOf(CommentsTableNotReadyError);
  });

  it('a PGRST200 body containing "does not exist" is still not a missing table', async () => {
    const chain = selectChain([], {
      code: 'PGRST200',
      message: "Could not find a relationship ... column users.nope does not exist",
    });
    mockFrom.mockReturnValue(chain);

    await expect(listComments('flag-1')).rejects.not.toBeInstanceOf(CommentsTableNotReadyError);
  });

  it('a genuine 42P01 is still reported as a missing table', async () => {
    const chain = selectChain([], { code: '42P01', message: 'relation "flag_comments" does not exist' });
    mockFrom.mockReturnValue(chain);

    await expect(listComments('flag-1')).rejects.toBeInstanceOf(CommentsTableNotReadyError);
  });
});

// ---------------------------------------------------------------------------
// HIGH-2 — fetchCommentsByIds, the Unhide surface's re-read.
//
// The hide list stores bare ids, so this is the only thing standing between a
// reader and a list of unlabelled UUIDs. Two properties matter more than the
// happy path: it must ask about EVERY id (a silently capped fetch would report
// unasked-about comments as deleted), and a missing row must simply be absent
// rather than an error.
// ---------------------------------------------------------------------------
describe('fetchCommentsByIds', () => {
  // `.in(...)` is the terminal call here — no .order, no .limit.
  function inChain(data: unknown[], error: unknown = null) {
    return {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data, error }),
    };
  }

  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('returns [] and never touches the network for an empty id list', async () => {
    await expect(fetchCommentsByIds([])).resolves.toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('flattens display_name out of the joined users row', async () => {
    const chain = inChain([
      {
        id: 'c1',
        flag_id: 'f1',
        user_id: 'u1',
        content: 'hello',
        created_at: '2026-01-01T00:00:00Z',
        users: { display_name: 'Jordan M' },
      },
    ]);
    mockFrom.mockReturnValue(chain);

    const rows = await fetchCommentsByIds(['c1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].display_name).toBe('Jordan M');
    expect(chain.select).toHaveBeenCalledWith(COMMENT_SELECT);
    expect(chain.in).toHaveBeenCalledWith('id', ['c1']);
  });

  it('a comment whose author account is gone flattens to a null display_name', async () => {
    // SR-117: user_id is nullable and the embed has nothing to join to, so the
    // row still comes back — with no author. The caller renders 'Anonymous'.
    mockFrom.mockReturnValue(
      inChain([
        {
          id: 'c1',
          flag_id: 'f1',
          user_id: null,
          content: 'hello',
          created_at: '2026-01-01T00:00:00Z',
          users: null,
        },
      ]),
    );
    const rows = await fetchCommentsByIds(['c1']);
    expect(rows[0].display_name).toBeNull();
  });

  it('ids with no surviving row are simply absent — not an error', async () => {
    mockFrom.mockReturnValue(inChain([]));
    await expect(fetchCommentsByIds(['gone-1', 'gone-2'])).resolves.toEqual([]);
  });

  it('asks about EVERY id when the list exceeds one chunk', async () => {
    // The anti-regression for a silently capped fetch: 250 ids must produce 3
    // requests covering all 250, not one request covering the first 100.
    const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
    const chains = [inChain([]), inChain([]), inChain([])];
    let call = 0;
    mockFrom.mockImplementation(() => chains[call++]);

    await fetchCommentsByIds(ids);

    expect(call).toBe(3);
    const asked = chains.flatMap((c) => c.in.mock.calls[0][1] as string[]);
    expect(asked).toHaveLength(250);
    expect(new Set(asked)).toEqual(new Set(ids));
  });

  it('concatenates rows across chunks', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `c${i}`);
    const row = (id: string) => ({
      id,
      flag_id: 'f1',
      user_id: 'u1',
      content: id,
      created_at: '2026-01-01T00:00:00Z',
      users: { display_name: 'A' },
    });
    const chains = [inChain([row('c0')]), inChain([row('c100')])];
    let call = 0;
    mockFrom.mockImplementation(() => chains[call++]);

    const rows = await fetchCommentsByIds(ids);
    expect(rows.map((r) => r.id)).toEqual(['c0', 'c100']);
  });

  it('surfaces a missing table as CommentsTableNotReadyError', async () => {
    mockFrom.mockReturnValue(
      inChain([], { code: '42P01', message: 'relation "flag_comments" does not exist' }),
    );
    await expect(fetchCommentsByIds(['c1'])).rejects.toBeInstanceOf(CommentsTableNotReadyError);
  });

  it('surfaces any other error as a thrown Error', async () => {
    mockFrom.mockReturnValue(inChain([], { message: 'network down' }));
    await expect(fetchCommentsByIds(['c1'])).rejects.toThrow();
  });
});
