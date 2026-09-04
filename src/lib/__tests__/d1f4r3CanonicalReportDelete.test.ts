import { deleteFlag } from '../flags';

const mockInvoke = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));
jest.mock('../analytics', () => ({ __esModule: true, trackEvent: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockInvoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });
});

describe('D1F4R3 canonical ordinary report deletion client seam', () => {
  it('uses the narrow server route for the owner and does not assemble a client Storage plan', async () => {
    await expect(deleteFlag('00000000-0000-4000-8000-000000000001')).resolves.toBeUndefined();
    expect(mockInvoke).toHaveBeenCalledWith('delete-flag', {
      body: { flagId: '00000000-0000-4000-8000-000000000001' },
    });
  });

  it('does not claim success for an incomplete or partial server outcome', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
    await expect(deleteFlag('00000000-0000-4000-8000-000000000002'))
      .rejects.toThrow('confirmed terminal result');
  });

  it('surfaces a refused owner/admin route rather than erasing relational UI state optimistically', async () => {
    const error = new Error('Forbidden');
    mockInvoke.mockResolvedValueOnce({ data: null, error });
    await expect(deleteFlag('00000000-0000-4000-8000-000000000003')).rejects.toBe(error);
  });
});
