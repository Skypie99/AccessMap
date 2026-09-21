/**
 * Phase 04A (FDA-002): ordinary report deletion moved OFF the never-deployed
 * `delete-flag` Edge route and onto a versioned, strict direct Data API
 * DELETE adapter, authorized entirely by the live 'flags delete own' /
 * 'admin delete any flag' RLS (confirmed in the 2026-09-04 production catalog
 * capture — see supabase/contract/client-expectations.v1.json's flag-delete
 * surface). This file's name predates that move; it still owns the core
 * owner/admin deletion client-seam contract.
 */
import { deleteFlag, FlagDeleteRefusedError } from '../flags';

const mockFrom = jest.fn();
const mockRemove = jest.fn();

function mockDeleteFlagFrom(opts: {
  flagResult: { data: unknown; error: unknown };
  photosResult?: { data: unknown; error: unknown };
  deleteResult: { data: unknown; error: unknown };
}) {
  const photosResult = opts.photosResult ?? { data: [], error: null };
  const deleteEq = jest.fn(() => ({ select: jest.fn().mockResolvedValue(opts.deleteResult) }));
  mockFrom.mockImplementation((table: unknown) => {
    if (table === 'flags') {
      return {
        select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue(opts.flagResult) })) })),
        delete: jest.fn(() => ({ eq: deleteEq })),
      };
    }
    if (table === 'flag_photos') {
      return { select: jest.fn(() => ({ eq: jest.fn().mockResolvedValue(photosResult) })) };
    }
    throw new Error(`unexpected table ${String(table)}`);
  });
  return { deleteEq };
}

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: () => ({ remove: (...args: unknown[]) => mockRemove(...args) }) },
  },
}));
jest.mock('../analytics', () => ({ __esModule: true, trackEvent: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockRemove.mockResolvedValue({ data: [], error: null });
});

describe('D1F4R3 -> Phase 04A canonical ordinary report deletion client seam', () => {
  it('deletes via the owner/admin-authorized direct DELETE and does not assemble a client Storage plan up front', async () => {
    mockDeleteFlagFrom({
      flagResult: { data: { id: 'f1', user_id: 'owner-1', photo_url: null, photo_object_key: null }, error: null },
      deleteResult: { data: [{ id: 'f1' }], error: null },
    });
    await expect(deleteFlag('f1')).resolves.toBeUndefined();
  });

  it('does not claim success for a silently-refused (zero-row) delete', async () => {
    mockDeleteFlagFrom({
      flagResult: { data: { id: 'f2', user_id: 'someone-else', photo_url: null, photo_object_key: null }, error: null },
      deleteResult: { data: [], error: null },
    });
    await expect(deleteFlag('f2')).rejects.toBeInstanceOf(FlagDeleteRefusedError);
  });

  it('surfaces a genuine DELETE error rather than erasing relational UI state optimistically', async () => {
    const error = { message: 'Forbidden', code: '42501' };
    mockDeleteFlagFrom({
      flagResult: { data: { id: 'f3', user_id: 'owner-1', photo_url: null, photo_object_key: null }, error: null },
      deleteResult: { data: null, error },
    });
    await expect(deleteFlag('f3')).rejects.toMatchObject(error);
  });

  it('LOCKING (BLOCKER D3, mutation safety): the destructive DELETE targets the flag\'s own id, never the actor\'s user_id', async () => {
    const { deleteEq } = mockDeleteFlagFrom({
      flagResult: { data: { id: 'f4', user_id: 'owner-1', photo_url: null, photo_object_key: null }, error: null },
      deleteResult: { data: [{ id: 'f4' }], error: null },
    });
    await deleteFlag('f4');
    // A mutation from .eq('id', flagId) to .eq('user_id', flagId) must fail
    // this assertion — the whole point of pinning the exact call args.
    expect(deleteEq).toHaveBeenCalledWith('id', 'f4');
    expect(deleteEq).not.toHaveBeenCalledWith('user_id', 'f4');
  });
});
