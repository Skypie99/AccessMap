/**
 * D-04A-4 (FDA-002): the owner/admin client seam refuses all flag deletion.
 * This file's name and old mock builders predate the temporary capability
 * removal. A later backend phase may provide an atomic deletion contract.
 */
import { deleteFlag, FlagDeletionUnavailableError } from '../flags';

const mockFrom = jest.fn();
const mockRemove = jest.fn();

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

describe('D1F4R3 -> Phase 04 FDA-002 client deletion seam', () => {
  it('refuses owner and admin targets before reading photos or deleting rows', async () => {
    for (const id of ['owner-flag', 'admin-target', 'zero-photo-flag']) {
      await expect(deleteFlag(id)).rejects.toBeInstanceOf(FlagDeletionUnavailableError);
    }
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
