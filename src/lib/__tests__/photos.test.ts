// D1F4 photo clients preserve the server's authoritative commit boundary:
// client Storage success is never a metadata/provenance commit by itself.
import { addFlagPhoto, batchInsertFlagPhotos, listFlagPhotos } from '../photos';

const mockFrom = jest.fn();
const mockGetUser = jest.fn();
const mockUploadFlagPhoto = jest.fn();
const mockCommitFlagPhotoUpload = jest.fn();
const mockRemoveUploadedFlagPhotos = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    storage: { from: jest.fn(() => ({ getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://cdn/canonical.jpg' } })) })) },
  },
}));
jest.mock('../flags', () => ({
  __esModule: true,
  uploadFlagPhoto: (...args: unknown[]) => mockUploadFlagPhoto(...args),
  commitFlagPhotoUpload: (...args: unknown[]) => mockCommitFlagPhotoUpload(...args),
  removeUploadedFlagPhotos: (...args: unknown[]) => mockRemoveUploadedFlagPhotos(...args),
}));

function selectChain(data: unknown, error: unknown = null) {
  return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data, error }) };
}
// insertLegacyFlagPhoto does `.from('flag_photos').insert({...})` with no
// further chaining — the insert call itself is the thenable terminal.
function insertOnlyChain(result: { data?: unknown; error: unknown }) {
  return { insert: jest.fn().mockResolvedValue(result) };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockRemoveUploadedFlagPhotos.mockResolvedValue(undefined);
});

describe('listFlagPhotos', () => {
  it('reads object_key alongside legacy URLs and derives a display URL only for presentation', async () => {
    const chain = selectChain([
      { url: 'legacy.jpg', object_key: null, position: 0, alt_text: null },
      { url: null, object_key: 'uploads/canonical.jpg', position: 1, alt_text: 'Door lip' },
    ]);
    mockFrom.mockReturnValue(chain);
    await expect(listFlagPhotos('flag-1')).resolves.toEqual([
      { url: 'legacy.jpg', position: 0, alt_text: null },
      { url: 'https://cdn/canonical.jpg', position: 1, alt_text: 'Door lip' },
    ]);
    expect(chain.select).toHaveBeenCalledWith('url, object_key, position, alt_text');
  });

  // Prompt B B2/Fable B-UX-002: the old "missing relation -> []" compatibility
  // fallback (isRelationMissing's broad `does not exist` match) misclassified
  // the runtime-confirmed missing-column failure the same way, rendering a
  // real backend defect as an empty gallery on an evidence surface. throws
  // now, every time — [] means zero rows, never a failure in disguise.
  it('throws on a missing relation instead of resolving []', async () => {
    const err = { code: '42P01', message: 'relation "flag_photos" does not exist' };
    mockFrom.mockReturnValue(selectChain(null, err));
    await expect(listFlagPhotos('flag-1')).rejects.toEqual(err);
  });

  it('throws on a missing column (the exact runtime-confirmed Prompt-B failure shape)', async () => {
    const err = {
      code: 'PGRST204',
      message: "Could not find the 'object_key' column of 'flag_photos' in the schema cache",
    };
    mockFrom.mockReturnValue(selectChain(null, err));
    await expect(listFlagPhotos('flag-1')).rejects.toEqual(err);
  });

  it('throws on any other backend error too (auth/network/malformed)', async () => {
    const err = { code: '42501', message: 'permission denied for table flag_photos' };
    mockFrom.mockReturnValue(selectChain(null, err));
    await expect(listFlagPhotos('flag-1')).rejects.toEqual(err);
  });
});

describe('D1F4 photo intent finalization', () => {
  it('requires authentication before an upload/commit is attempted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(addFlagPhoto('flag-1', 'file:///photo.jpg')).rejects.toThrow('Not authenticated');
    expect(mockUploadFlagPhoto).not.toHaveBeenCalled();
    expect(mockCommitFlagPhotoUpload).not.toHaveBeenCalled();
  });

  it('asks the server to commit a prepared intent rather than inserting a URL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue(selectChain([{ url: 'legacy.jpg', object_key: null, position: 0, alt_text: null }]));
    mockUploadFlagPhoto.mockResolvedValue({ intentId: 'intent-1', path: 'uploads/photo.jpg', url: 'https://cdn/photo.jpg' });
    mockCommitFlagPhotoUpload.mockResolvedValue(undefined);
    await expect(addFlagPhoto('flag-1', 'file:///photo.jpg', undefined, undefined, ' Door lip ')).resolves.toMatchObject({
      flag_id: 'flag-1', position: 1, object_key: 'uploads/photo.jpg', alt_text: 'Door lip',
    });
    expect(mockCommitFlagPhotoUpload).toHaveBeenCalledWith('intent-1', 'flag-1', 1, 'Door lip', false);
  });

  it('propagates an authoritative verification failure instead of claiming the upload committed', async () => {
    mockCommitFlagPhotoUpload.mockRejectedValueOnce(new Error('Photo upload could not be verified.'));
    await expect(batchInsertFlagPhotos('flag-1', [{ intentId: 'intent-1' }])).rejects.toThrow('Photo upload could not be verified.');
  });

  it('finalizes each intent and marks only the first as the primary photo', async () => {
    mockCommitFlagPhotoUpload.mockResolvedValue(undefined);
    await batchInsertFlagPhotos('flag-1', [{ intentId: 'intent-a', alt: 'Entry' }, { intentId: 'intent-b', alt: null }]);
    expect(mockCommitFlagPhotoUpload).toHaveBeenNthCalledWith(1, 'intent-a', 'flag-1', 0, 'Entry', true);
    expect(mockCommitFlagPhotoUpload).toHaveBeenNthCalledWith(2, 'intent-b', 'flag-1', 1, null, false);
  });
});

describe('FDA-019 legacy uid-folder fallback (Phase 04A)', () => {
  it('addFlagPhoto inserts the flag_photos row directly when uploadFlagPhoto returns intentId: null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom
      .mockReturnValueOnce(selectChain([])) // listFlagPhotos (existing count)
      .mockReturnValueOnce(insertOnlyChain({ error: null })); // insertLegacyFlagPhoto
    mockUploadFlagPhoto.mockResolvedValue({
      intentId: null,
      path: 'user-1/1700000000000.jpg',
      url: 'https://cdn/user-1/1700000000000.jpg',
    });

    const result = await addFlagPhoto('flag-1', 'file:///photo.jpg', undefined, undefined, 'Door lip');

    expect(mockCommitFlagPhotoUpload).not.toHaveBeenCalled();
    const insertChain = mockFrom.mock.results[1]!.value as { insert: jest.Mock };
    expect(insertChain.insert).toHaveBeenCalledWith({
      flag_id: 'flag-1',
      url: 'https://cdn/user-1/1700000000000.jpg',
      position: 0,
      alt_text: 'Door lip',
    });
    expect(result).toMatchObject({
      flag_id: 'flag-1',
      position: 0,
      alt_text: 'Door lip',
      object_key: null,
    });
  });

  it('addFlagPhoto cleans up the just-uploaded object when the legacy row insert is denied', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom
      .mockReturnValueOnce(selectChain([]))
      .mockReturnValueOnce(insertOnlyChain({ error: { message: 'permission denied' } }));
    mockUploadFlagPhoto.mockResolvedValue({
      intentId: null,
      path: 'user-1/1700000000000.jpg',
      url: 'https://cdn/user-1/1700000000000.jpg',
    });

    await expect(addFlagPhoto('flag-1', 'file:///photo.jpg')).rejects.toEqual({ message: 'permission denied' });
    expect(mockRemoveUploadedFlagPhotos).toHaveBeenCalledWith(['user-1/1700000000000.jpg']);
  });

  it('batchInsertFlagPhotos inserts a legacy entry directly, in position order alongside intent entries', async () => {
    mockCommitFlagPhotoUpload.mockResolvedValue(undefined);
    const legacyInsertChain = insertOnlyChain({ error: null });
    mockFrom.mockReturnValue(legacyInsertChain);

    await batchInsertFlagPhotos('flag-1', [
      { intentId: 'intent-a', alt: 'Entry' },
      { intentId: null, url: 'https://cdn/user-1/2.jpg', path: 'user-1/2.jpg', alt: null },
    ]);

    expect(mockCommitFlagPhotoUpload).toHaveBeenCalledWith('intent-a', 'flag-1', 0, 'Entry', true);
    expect(legacyInsertChain.insert).toHaveBeenCalledWith({
      flag_id: 'flag-1',
      url: 'https://cdn/user-1/2.jpg',
      position: 1,
      alt_text: null,
    });
  });

  it('batchInsertFlagPhotos cleans up the object when a legacy insert is denied and rejects', async () => {
    mockFrom.mockReturnValue(insertOnlyChain({ error: { message: 'permission denied' } }));

    await expect(
      batchInsertFlagPhotos('flag-1', [
        { intentId: null, url: 'https://cdn/user-1/1.jpg', path: 'user-1/1.jpg', alt: null },
      ]),
    ).rejects.toEqual({ message: 'permission denied' });
    expect(mockRemoveUploadedFlagPhotos).toHaveBeenCalledWith(['user-1/1.jpg']);
  });

  it('batchInsertFlagPhotos throws if a legacy entry is missing its Storage location', async () => {
    await expect(
      batchInsertFlagPhotos('flag-1', [{ intentId: null, alt: null }]),
    ).rejects.toThrow('missing its Storage location');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
