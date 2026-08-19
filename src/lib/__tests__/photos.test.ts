/**
 * Tests for src/lib/photos.ts — the multi-photo junction-table layer.
 *
 * photos.ts wraps three Supabase calls:
 *   - listFlagPhotos       SELECT ordered by position (graceful [] on missing table)
 *   - addFlagPhoto         upload blob → INSERT junction row at next position
 *   - batchInsertFlagPhotos bulk INSERT pre-uploaded URLs (graceful no-op on missing table)
 *
 * Mock strategy mirrors comments.test.ts: a hand-built fluent chain per call,
 * with the terminal method (`order` / `single` / `eq`) resolving the result.
 * supabase.auth.getUser and the uploadFlagPhoto helper from flags.ts are also
 * mocked so nothing touches the network or a device.
 */

// Supabase mock — declared before jest.mock() hoisting.
import { addFlagPhoto, batchInsertFlagPhotos, listFlagPhotos } from '../photos';

const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

// flags.ts pulls in supabase + expo-image-manipulator at module level; mock the
// single helper photos.ts actually uses so the real module never loads.
const mockUploadFlagPhoto = jest.fn();
jest.mock('../flags', () => ({
  __esModule: true,
  uploadFlagPhoto: (...args: unknown[]) => mockUploadFlagPhoto(...args),
}));

// ---------------------------------------------------------------------------
// Chain builders — each returns a chain whose terminal method resolves.
// ---------------------------------------------------------------------------

/** SELECT ... .eq().order() chain — `order` is the terminal that resolves. */
function selectChain(data: unknown, error: unknown = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

/** INSERT ... .select().single() chain — `single` is the terminal that resolves. */
function insertSingleChain(data: unknown, error: unknown = null) {
  const chain = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

/** INSERT(rows) chain — bare `insert` is the terminal that resolves. */
function insertChain(error: unknown = null) {
  const chain = {
    insert: jest.fn().mockResolvedValue({ data: null, error }),
  };
  return chain;
}


const TABLE_MISSING_CODE = { code: '42P01', message: 'relation "flag_photos" does not exist' };

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listFlagPhotos
// ---------------------------------------------------------------------------

describe('listFlagPhotos', () => {
  it('queries flag_photos ordered by position ascending', async () => {
    const chain = selectChain([
      { url: 'a.jpg', position: 0 },
      { url: 'b.jpg', position: 1 },
    ]);
    mockFrom.mockReturnValue(chain);

    const result = await listFlagPhotos('flag-1');

    expect(mockFrom).toHaveBeenCalledWith('flag_photos');
    // photo_alt (2026-08-19): alt_text rides along for VoiceOver labels.
    expect(chain.select).toHaveBeenCalledWith('url, position, alt_text');
    expect(chain.eq).toHaveBeenCalledWith('flag_id', 'flag-1');
    expect(chain.order).toHaveBeenCalledWith('position', { ascending: true });
    expect(result).toEqual([
      { url: 'a.jpg', position: 0 },
      { url: 'b.jpg', position: 1 },
    ]);
  });

  it('returns the rows as-is (already sorted by the query)', async () => {
    mockFrom.mockReturnValue(selectChain([{ url: 'only.jpg', position: 0 }]));
    const result = await listFlagPhotos('flag-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ url: 'only.jpg', position: 0 });
  });

  it('returns [] when data is null', async () => {
    mockFrom.mockReturnValue(selectChain(null));
    expect(await listFlagPhotos('flag-1')).toEqual([]);
  });

  it('returns [] (no throw) when the table is missing — 42P01 code', async () => {
    mockFrom.mockReturnValue(selectChain(null, TABLE_MISSING_CODE));
    expect(await listFlagPhotos('flag-1')).toEqual([]);
  });

  it('returns [] (no throw) when the error message says "does not exist"', async () => {
    mockFrom.mockReturnValue(
      selectChain(null, { message: 'relation flag_photos does not exist' }),
    );
    expect(await listFlagPhotos('flag-1')).toEqual([]);
  });

  // COR-3 (code-qa 2026-08-06): the next three pins DELIBERATELY flip the old
  // swallow-all contract. [] is reserved for "migration pending"; a real
  // failure must throw so callers can tell "no photos" from "couldn't load"
  // (and so addFlagPhoto can't compute position 0 from a failed read).
  it('rethrows an unexpected (non-table-missing) error instead of masking it as "no photos"', async () => {
    mockFrom.mockReturnValue(selectChain(null, { message: 'permission denied', code: '42501' }));

    await expect(listFlagPhotos('flag-1')).rejects.toMatchObject({ code: '42501' });
  });

  it('rethrows an embed-shaped error (SR-092 class) even though its message says "does not exist"', async () => {
    mockFrom.mockReturnValue(
      selectChain(null, {
        code: 'PGRST201',
        message: 'more than one relationship... column users.nope does not exist',
      }),
    );

    await expect(listFlagPhotos('flag-1')).rejects.toMatchObject({ code: 'PGRST201' });
  });

  it('rethrows a synchronous non-table-missing throw (no defensive swallow)', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('network down');
    });

    await expect(listFlagPhotos('flag-1')).rejects.toThrow('network down');
  });

  it('still returns [] for a synchronously-thrown table-missing error (defensive catch kept)', async () => {
    mockFrom.mockImplementation(() => {
      throw { code: '42P01', message: 'relation "flag_photos" does not exist' };
    });

    expect(await listFlagPhotos('flag-1')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addFlagPhoto
// ---------------------------------------------------------------------------

describe('addFlagPhoto', () => {
  it('throws "Not authenticated" and does not upload when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(addFlagPhoto('flag-1', 'file:///local.jpg')).rejects.toThrow('Not authenticated');
    expect(mockUploadFlagPhoto).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('uploads then inserts a junction row at position = existing count', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // uploadFlagPhoto returns { url, path } (FIX B — path tracked for orphan cleanup).
    mockUploadFlagPhoto.mockResolvedValue({
      url: 'https://cdn/user-1/123.jpg',
      path: 'user-1/123.jpg',
    });

    // 1st from() → listFlagPhotos (two existing photos → next position is 2).
    // 2nd from() → the INSERT.
    const listChain = selectChain([
      { url: 'a.jpg', position: 0 },
      { url: 'b.jpg', position: 1 },
    ]);
    const insChain = insertSingleChain({
      id: 'p3',
      flag_id: 'flag-1',
      url: 'https://cdn/user-1/123.jpg',
      position: 2,
      created_at: '2026-05-30T12:00:00Z',
    });
    mockFrom.mockReturnValueOnce(listChain).mockReturnValueOnce(insChain);

    const result = await addFlagPhoto('flag-1', 'file:///local.jpg');

    // B8: addFlagPhoto forwards optional picker dims (undefined here — no dims
    // supplied) to uploadFlagPhoto, which drives the downscale-on-ingest.
    expect(mockUploadFlagPhoto).toHaveBeenCalledWith('user-1', 'file:///local.jpg', undefined, undefined);
    expect(insChain.insert).toHaveBeenCalledWith({
      flag_id: 'flag-1',
      url: 'https://cdn/user-1/123.jpg',
      position: 2,
      // photo_alt: no description supplied → explicit null.
      alt_text: null,
    });
    expect(result).toMatchObject({ id: 'p3', position: 2, url: 'https://cdn/user-1/123.jpg' });
  });

  it('inserts at position 0 when there are no existing photos', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockUploadFlagPhoto.mockResolvedValue({
      url: 'https://cdn/user-1/first.jpg',
      path: 'user-1/first.jpg',
    });

    const listChain = selectChain([]); // no existing photos
    const insChain = insertSingleChain({
      id: 'p1',
      flag_id: 'flag-1',
      url: 'https://cdn/user-1/first.jpg',
      position: 0,
      created_at: '2026-05-30T12:00:00Z',
    });
    mockFrom.mockReturnValueOnce(listChain).mockReturnValueOnce(insChain);

    await addFlagPhoto('flag-1', 'file:///local.jpg');

    expect(insChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ position: 0 }),
    );
  });

  it('propagates an INSERT error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockUploadFlagPhoto.mockResolvedValue({
      url: 'https://cdn/user-1/x.jpg',
      path: 'user-1/x.jpg',
    });

    const listChain = selectChain([]);
    const insChain = insertSingleChain(null, { message: 'RLS violation' });
    mockFrom.mockReturnValueOnce(listChain).mockReturnValueOnce(insChain);

    await expect(addFlagPhoto('flag-1', 'file:///local.jpg')).rejects.toMatchObject({
      message: 'RLS violation',
    });
  });
});

// ---------------------------------------------------------------------------
// batchInsertFlagPhotos
// ---------------------------------------------------------------------------

describe('batchInsertFlagPhotos', () => {
  it('is a no-op (no query) when the photo list is empty', async () => {
    await batchInsertFlagPhotos('flag-1', []);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // photo_alt (2026-08-19): the signature takes {url, alt} pairs now so the
  // per-photo VoiceOver descriptions from ReportFlagModal ride the same insert.
  it('inserts every photo as a junction row with ascending positions and alt text', async () => {
    const chain = insertChain();
    mockFrom.mockReturnValue(chain);

    await batchInsertFlagPhotos('flag-1', [
      { url: 'a.jpg', alt: 'Steps with no ramp at the main door' },
      { url: 'b.jpg' },
      { url: 'c.jpg', alt: '   ' }, // whitespace-only → null, not ''
    ]);

    expect(mockFrom).toHaveBeenCalledWith('flag_photos');
    expect(chain.insert).toHaveBeenCalledWith([
      { flag_id: 'flag-1', url: 'a.jpg', position: 0, alt_text: 'Steps with no ramp at the main door' },
      { flag_id: 'flag-1', url: 'b.jpg', position: 1, alt_text: null },
      { flag_id: 'flag-1', url: 'c.jpg', position: 2, alt_text: null },
    ]);
  });

  it('silently returns when the table is missing — 42P01 code', async () => {
    mockFrom.mockReturnValue(insertChain(TABLE_MISSING_CODE));
    await expect(batchInsertFlagPhotos('flag-1', [{ url: 'a.jpg' }])).resolves.toBeUndefined();
  });

  it('silently returns when the error message says "does not exist"', async () => {
    mockFrom.mockReturnValue(insertChain({ message: 'relation does not exist' }));
    await expect(batchInsertFlagPhotos('flag-1', [{ url: 'a.jpg' }])).resolves.toBeUndefined();
  });

  it('throws on any other Supabase error', async () => {
    mockFrom.mockReturnValue(insertChain({ message: 'permission denied' }));
    await expect(batchInsertFlagPhotos('flag-1', [{ url: 'a.jpg' }])).rejects.toMatchObject({
      message: 'permission denied',
    });
  });

  it('swallows a thrown table-missing exception but rethrows others', async () => {
    // table-missing exception → silent
    mockFrom.mockImplementationOnce(() => {
      throw { code: '42P01', message: 'does not exist' };
    });
    await expect(batchInsertFlagPhotos('flag-1', [{ url: 'a.jpg' }])).resolves.toBeUndefined();

    // unrelated exception → rethrown
    mockFrom.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(batchInsertFlagPhotos('flag-1', [{ url: 'a.jpg' }])).rejects.toThrow('boom');
  });
});
