import { deleteFlag, FLAG_PHOTOS_BUCKET } from '../flags';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FOREIGN_ID = '99999999-9999-4999-8999-999999999999';
const mockRemove = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: () => ({ remove: mockRemove }) },
    auth: { getUser: () => mockGetUser() },
  },
}));
jest.mock('../analytics', () => ({ __esModule: true, trackEvent: jest.fn() }));

type Fixture = {
  primaryKey?: string | null;
  primaryUploader?: string | null;
  primaryUrl?: string | null;
  gallery?: { object_key?: string | null; uploader_id?: string | null; url?: string | null }[];
};

function wireFlagDelete(fixture: Fixture, events: string[] = []): jest.Mock {
  const deleteEq = jest.fn().mockReturnValue({
    select: async () => {
      events.push('relational-delete');
      return { data: [{ id: 'flag-1' }], error: null };
    },
  });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'flags') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                photo_object_key: fixture.primaryKey ?? null,
                photo_uploader_id: fixture.primaryUploader ?? null,
                photo_url: fixture.primaryUrl ?? null,
              },
              error: null,
            }),
          }),
        }),
        delete: () => ({ eq: deleteEq }),
      };
    }
    if (table === 'flag_photos') {
      return {
        select: () => ({
          eq: async () => ({ data: fixture.gallery ?? [], error: null }),
        }),
      };
    }
    throw new Error('unexpected table');
  });
  return deleteEq;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  mockRemove.mockResolvedValue({ data: [], error: null });
});

describe('D1F4R2 canonical ordinary report deletion', () => {
  it('cleans only the exact primary and gallery canonical keys before relational deletion', async () => {
    const events: string[] = [];
    wireFlagDelete({
      primaryKey: 'uploads/primary.jpg',
      primaryUploader: USER_ID,
      gallery: [
        { object_key: 'uploads/gallery-a.jpg', uploader_id: USER_ID },
        { object_key: 'uploads/gallery-b.jpg', uploader_id: USER_ID },
      ],
    }, events);
    mockRemove.mockImplementation(async () => {
      events.push('storage-remove');
      return { data: [], error: null };
    });

    await deleteFlag('flag-1');

    expect(mockRemove).toHaveBeenCalledWith([
      'uploads/primary.jpg',
      'uploads/gallery-a.jpg',
      'uploads/gallery-b.jpg',
    ]);
    expect(mockRemove.mock.calls[0][0]).not.toContain('uploads/unrelated.jpg');
    expect(events).toEqual(['storage-remove', 'relational-delete']);
    expect(FLAG_PHOTOS_BUCKET).toBe('flag-photos');
  });

  it('handles mixed canonical and legacy rows without deriving a canonical key from a URL', async () => {
    const legacyUrl = 'https://abc.supabase.co/storage/v1/object/public/flag-photos/'
      + USER_ID + '/legacy.jpg';
    wireFlagDelete({
      primaryKey: 'uploads/primary.jpg',
      primaryUploader: USER_ID,
      primaryUrl: legacyUrl,
      gallery: [{ object_key: 'uploads/gallery.jpg', uploader_id: USER_ID }],
    });

    await deleteFlag('flag-1');

    expect(mockRemove).toHaveBeenCalledWith([
      'uploads/primary.jpg',
      USER_ID + '/legacy.jpg',
      'uploads/gallery.jpg',
    ]);
  });

  it('fails closed before either cleanup or relational deletion for a foreign canonical owner', async () => {
    const deleteEq = wireFlagDelete({
      primaryKey: 'uploads/foreign.jpg',
      primaryUploader: FOREIGN_ID,
    });

    await expect(deleteFlag('flag-1')).rejects.toThrow('unverified ownership');

    expect(mockRemove).not.toHaveBeenCalled();
    expect(deleteEq).not.toHaveBeenCalled();
  });

  it('treats a missing exact object as idempotent but surfaces other cleanup failures', async () => {
    const deleteEq = wireFlagDelete({
      primaryKey: 'uploads/missing.jpg',
      primaryUploader: USER_ID,
    });
    mockRemove.mockResolvedValueOnce({ data: [], error: { statusCode: 404, message: 'not found' } });
    await expect(deleteFlag('flag-1')).resolves.toBeUndefined();
    expect(deleteEq).toHaveBeenCalled();

    const deniedDelete = wireFlagDelete({
      primaryKey: 'uploads/refused.jpg',
      primaryUploader: USER_ID,
    });
    mockRemove.mockResolvedValueOnce({ data: [], error: { statusCode: 403, message: 'forbidden' } });
    await expect(deleteFlag('flag-1')).rejects.toMatchObject({ message: 'forbidden' });
    expect(deniedDelete).not.toHaveBeenCalled();
  });
});
