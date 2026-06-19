// Supabase mock — must be declared before jest.mock() hoisting.
import {
  addComment,
  CommentsTableNotReadyError,
  deleteComment,
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
