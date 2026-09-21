/**
 * The legacy URL helper still protects failed-upload cleanup
 * (removeUploadedFlagPhotos and its callers). deleteFlag itself no longer
 * calls it (Phase 04A FINAL repair, D-04A-2, 2026-09-21): storage.remove()
 * returning `error: null` is not proof of removal, so deleteFlag now refuses
 * outright on ANY photo presence rather than trying to resolve and clean up
 * an exact path first. See flags.supabase.test.ts's `deleteFlag` describe
 * block for the full D-04A-2 behavior contract.
 */
import { deleteFlag, FlagPhotoCleanupUnprovenError, storagePathFromPublicUrl } from '../flags';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '99999999-9999-4999-8999-999999999999';
const BASE = 'https://abc.supabase.co/storage/v1/object/public/flag-photos';
const mockFrom = jest.fn();
const mockRemove = jest.fn();
const mockTrackEvent = jest.fn();

function mockDeleteFlagFrom(opts: {
  flagResult: { data: unknown; error: unknown };
  photosResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
}) {
  const photosResult = opts.photosResult ?? { data: [], error: null };
  const deleteResult = opts.deleteResult ?? { data: [{ id: 'f1' }], error: null };
  mockFrom.mockImplementation((table: unknown) => {
    if (table === 'flags') {
      return {
        select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue(opts.flagResult) })) })),
        delete: jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn().mockResolvedValue(deleteResult) })) })),
      };
    }
    if (table === 'flag_photos') {
      return { select: jest.fn(() => ({ eq: jest.fn().mockResolvedValue(photosResult) })) };
    }
    throw new Error(`unexpected table ${String(table)}`);
  });
}

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: () => ({ remove: (...args: unknown[]) => mockRemove(...args) }) },
  },
}));
jest.mock('../analytics', () => ({
  __esModule: true,
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

let warn: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockRemove.mockResolvedValue({ data: [], error: null });
});
afterEach(() => warn.mockRestore());

describe('storagePathFromPublicUrl — the one legacy cleanup carve-out', () => {
  it('recovers an exact path from the normal fixed public object form', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1700000000000.jpg`, UID)).toBe(`${UID}/1700000000000.jpg`);
  });

  it('ignores query and fragment components that are not part of the object key', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1.jpg?width=200&t=9`, UID)).toBe(`${UID}/1.jpg`);
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1.jpg#frag`, UID)).toBe(`${UID}/1.jpg`);
  });

  it('refuses unrecognized, malformed, and foreign-user URL shapes', () => {
    expect(storagePathFromPublicUrl('https://example.com/some/photo.jpg', UID)).toBeNull();
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/%E0%A4%A.jpg`, UID)).toBeNull();
    expect(storagePathFromPublicUrl(`${BASE}/${OTHER}/1.jpg`, UID)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('emits no URL or identifier when a derivation refusal is recorded', () => {
    storagePathFromPublicUrl(`${BASE}/${OTHER}/1.jpg`, UID);
    expect(mockTrackEvent).toHaveBeenCalledWith('storage_path_derivation_failed', { reason: 'foreign_folder' });
    expect(JSON.stringify(mockTrackEvent.mock.calls.at(-1)?.[1])).not.toContain(UID);
    expect(JSON.stringify(mockTrackEvent.mock.calls.at(-1)?.[1])).not.toContain(OTHER);
  });
});

describe('Phase 04A FINAL repair (D-04A-2) deleteFlag — any photo presence refuses the delete, storagePathFromPublicUrl is no longer consulted', () => {
  it('a legacy flags.photo_url that WOULD have resolved cleanly still refuses — deleteFlag never calls storagePathFromPublicUrl any more', async () => {
    mockDeleteFlagFrom({
      flagResult: {
        data: { id: 'f1', user_id: UID, photo_url: `${BASE}/${UID}/1700000000000.jpg`, photo_object_key: null },
        error: null,
      },
      deleteResult: { data: [{ id: 'f1' }], error: null },
    });
    // D-04A-2 (2026-09-21): storage.remove() returning `error: null` is not
    // proof of removal, so a resolvable legacy URL no longer earns a
    // best-effort cleanup-then-delete — ANY photo refuses outright.
    await expect(deleteFlag('f1')).rejects.toThrow(FlagPhotoCleanupUnprovenError);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('a foreign-folder / unresolvable legacy URL refuses the same way — no special-casing by resolvability', async () => {
    mockDeleteFlagFrom({
      flagResult: {
        data: { id: 'f1', user_id: UID, photo_url: `${BASE}/${OTHER}/1.jpg`, photo_object_key: null },
        error: null,
      },
      deleteResult: { data: [{ id: 'f1' }], error: null },
    });
    await expect(deleteFlag('f1')).rejects.toThrow(FlagPhotoCleanupUnprovenError);
    expect(mockRemove).not.toHaveBeenCalled();
    // storagePathFromPublicUrl's own foreign-folder warn (asserted in the
    // block above) is a property of that pure function called directly —
    // deleteFlag itself never calls it, so nothing here should warn.
    expect(warn).not.toHaveBeenCalled();
  });

  it('an exact object_key present alongside a stale legacy url still refuses — deleteFlag never inspects which path would have been "correct"', async () => {
    mockDeleteFlagFrom({
      flagResult: {
        data: { id: 'f1', user_id: UID, photo_url: `${BASE}/${UID}/stale.jpg`, photo_object_key: `${UID}/canonical.jpg` },
        error: null,
      },
      deleteResult: { data: [{ id: 'f1' }], error: null },
    });
    await expect(deleteFlag('f1')).rejects.toThrow(FlagPhotoCleanupUnprovenError);
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
