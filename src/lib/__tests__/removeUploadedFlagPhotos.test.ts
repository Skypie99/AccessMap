/**
 * Tests for removeUploadedFlagPhotos in src/lib/flags.ts (FIX B, Decision 5
 * Option A — Storage orphan cleanup on failed flag submit).
 *
 * Contract we lock in:
 *  - Calls supabase.storage.from('flag-photos').remove(paths) with exactly
 *    the paths it was given.
 *  - NEVER throws — neither on a { error } result nor on a thrown/rejected
 *    remove() call. The caller is surfacing the ORIGINAL submit error to the
 *    user; cleanup failures must not mask it.
 *  - console.warns on failure so orphans are at least visible in dev logs.
 *  - Empty input skips the round-trip entirely.
 *
 * The supabase client is fully mocked — same pattern as createFlag.test.ts.
 */

// jest.mock below is hoisted above this import, so '../flags' sees the
// mocked supabase client. Imported up top to keep import/first happy.
import { FLAG_PHOTOS_BUCKET, removeUploadedFlagPhotos } from '../flags';

// Storage chain mock: storage.from(bucket).remove(paths) → { data, error }.
// Jest insists outer-scope mock vars start with "mock" because the
// jest.mock factory runs before the module's top-level code; the factory
// only closes over them (no dereference until a test calls the chain), so
// the TDZ at module-load time is safe.
const mockRemove = jest.fn();
const mockStorageFrom = jest.fn((_bucket: string) => ({ remove: mockRemove }));

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    storage: {
      from: (bucket: string) => mockStorageFrom(bucket),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRemove.mockResolvedValue({ data: null, error: null });
});

describe('removeUploadedFlagPhotos', () => {
  it('calls storage remove on the flag-photos bucket with the given paths', async () => {
    const paths = ['user-1/111.jpg', 'user-1/222.png'];

    await removeUploadedFlagPhotos(paths);

    expect(mockStorageFrom).toHaveBeenCalledWith(FLAG_PHOTOS_BUCKET);
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith(paths);
  });

  it('skips the round-trip entirely for an empty paths array', async () => {
    await removeUploadedFlagPhotos([]);

    expect(mockStorageFrom).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('resolves (never throws) and warns when remove returns an error result', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRemove.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });

    await expect(removeUploadedFlagPhotos(['user-1/x.jpg'])).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      '[flags] Failed to clean up orphaned flag photos:',
      expect.objectContaining({ message: 'RLS violation' }),
    );
    warn.mockRestore();
  });

  it('resolves (never throws) and warns when remove rejects', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRemove.mockRejectedValue(new Error('network down'));

    await expect(removeUploadedFlagPhotos(['user-1/x.jpg'])).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      '[flags] Failed to clean up orphaned flag photos:',
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it('resolves (never throws) even when the storage accessor itself throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Once-only so the default chain implementation survives for later tests
    // (clearAllMocks does not reset implementations).
    mockStorageFrom.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });

    await expect(removeUploadedFlagPhotos(['user-1/x.jpg'])).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn on a successful remove', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await removeUploadedFlagPhotos(['user-1/ok.jpg']);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
