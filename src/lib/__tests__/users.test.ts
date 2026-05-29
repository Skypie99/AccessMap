/**
 * Tests for src/lib/users.ts — cycle 4 gap fill.
 *
 * GAP-1: getInitials() — pure function, 9 edge cases
 * GAP-2: uploadAvatar() — success path + 4 error paths, Supabase Storage mocked
 *
 * See qa-reports/2026-05-25-gary-cycle4-coverage-gaps.md for full gap analysis.
 */

// ---------------------------------------------------------------------------
// expo-media-library mock — used by stripExifNative (called by uploadAvatar).
// Must declare the spy variable before jest.mock() so the factory closure
// captures a live reference.
// ---------------------------------------------------------------------------
const mockSaveToLibraryAsync = jest.fn();

jest.mock('expo-media-library', () => ({
  __esModule: true,
  saveToLibraryAsync: (...args: unknown[]) => mockSaveToLibraryAsync(...args),
}));

// ---------------------------------------------------------------------------
// expo-image-manipulator mock — used by stripExifNative.
// Mocks the manipulateAsync function to avoid the native renderAsync call.
// ---------------------------------------------------------------------------
jest.mock('expo-image-manipulator', () => ({
  __esModule: true,
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/stripped.jpg',
    width: 1000,
    height: 1000,
  }),
  SaveFormat: {
    JPEG: 0,
    PNG: 1,
  },
}));

// ---------------------------------------------------------------------------
// Supabase mock — hoisted by Jest before any import runs.
// Chain under test for uploadAvatar:
//   supabase.storage.from(bucket).upload(path, buffer, opts)
//   supabase.storage.from(bucket).getPublicUrl(path)
// ---------------------------------------------------------------------------
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockStorageFrom = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: jest.fn(), // not used by uploadAvatar — present so TypeScript is satisfied
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}));

import { getInitials, uploadAvatar } from '../users';

// ---------------------------------------------------------------------------
// GAP-1: getInitials() — pure function, no I/O
// ---------------------------------------------------------------------------

describe('getInitials()', () => {
  it('returns first two chars uppercased for a single word', () => {
    expect(getInitials('Sky')).toBe('SK');
  });

  it('returns first letter of each word for a two-word name', () => {
    expect(getInitials('Sky Pie')).toBe('SP');
  });

  it('returns first + last initials for a three-word name', () => {
    // "Sky Blue Pie" → S + P (first + last words)
    expect(getInitials('Sky Blue Pie')).toBe('SP');
  });

  it('returns "?" for an empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns "?" for a whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('returns single char uppercased for a one-character name', () => {
    expect(getInitials('A')).toBe('A');
  });

  it('handles email prefix — uses chars before the "@"', () => {
    // "sky@example.com" → prefix "sky" → "SK"
    expect(getInitials('sky@example.com')).toBe('SK');
  });

  it('handles non-ASCII / diacritical first chars without throwing', () => {
    // "Ünder Ñame" → U + N uppercased
    const result = getInitials('Ünder Ñame');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('is case-insensitive — always returns uppercase', () => {
    expect(getInitials('alice bob')).toBe('AB');
  });
});

// ---------------------------------------------------------------------------
// GAP-2: uploadAvatar() — success path + 4 error paths
// ---------------------------------------------------------------------------

describe('uploadAvatar()', () => {
  const USER_ID = 'user-abc-123';

  // Wire the storage builder chain before each test.
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });
    mockSaveToLibraryAsync.mockReset();
  });

  // ── Success path ─────────────────────────────────────────────────────────

  it('success: returns the public URL on a valid JPG upload', async () => {
    const fakeBuffer = new ArrayBuffer(1024); // 1 KB — valid size
    // Stamp JPEG magic bytes (FF D8 FF) so detectMimeFromBytes() accepts the buffer.
    const jpegView = new Uint8Array(fakeBuffer);
    jpegView[0] = 0xff; jpegView[1] = 0xd8; jpegView[2] = 0xff;
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      arrayBuffer: async () => fakeBuffer,
    });

    mockUpload.mockResolvedValueOnce({ error: null });
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: 'https://cdn.example.com/user-abc-123/avatar/1234567890.jpg' },
    });

    const url = await uploadAvatar(USER_ID, 'file:///tmp/photo.jpg');

    expect(url).toMatch(/^https:\/\//);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockGetPublicUrl).toHaveBeenCalledTimes(1);
  });

  // ── Error path 1: bad extension ───────────────────────────────────────────

  it('error: rejects with a descriptive message for an unsupported extension (.svg)', async () => {
    // No fetch mock needed — the extension check fires before any I/O.
    await expect(uploadAvatar(USER_ID, 'file:///tmp/image.svg')).rejects.toThrow(
      /jpg|png|webp|heic/i,
    );

    // Supabase storage must NOT be touched.
    expect(mockUpload).not.toHaveBeenCalled();
  });

  // ── Error path 2: empty file ──────────────────────────────────────────────

  it('error: rejects when the fetched file is 0 bytes', async () => {
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    await expect(uploadAvatar(USER_ID, 'file:///tmp/empty.png')).rejects.toThrow(/empty/i);

    expect(mockUpload).not.toHaveBeenCalled();
  });

  // ── Error path 3: file too large ──────────────────────────────────────────

  it('error: rejects when the file exceeds 10 MB', async () => {
    const oversized = new ArrayBuffer(10 * 1024 * 1024 + 1); // 10 MB + 1 byte
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      arrayBuffer: async () => oversized,
    });

    await expect(uploadAvatar(USER_ID, 'file:///tmp/huge.jpg')).rejects.toThrow(/too large|10 MB/i);

    expect(mockUpload).not.toHaveBeenCalled();
  });

  // ── Error path 4: Supabase Storage upload error ───────────────────────────

  it('error: re-throws the Supabase Storage error on upload failure', async () => {
    const fakeBuffer = new ArrayBuffer(512);
    // Stamp WEBP magic bytes (RIFF....WEBP) so detectMimeFromBytes() accepts the buffer.
    const webpView = new Uint8Array(fakeBuffer);
    webpView[0] = 0x52; webpView[1] = 0x49; webpView[2] = 0x46; webpView[3] = 0x46; // RIFF
    webpView[8] = 0x57; webpView[9] = 0x45; webpView[10] = 0x42; webpView[11] = 0x50; // WEBP
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      arrayBuffer: async () => fakeBuffer,
    });

    const storageError = { message: 'Bucket not found', status: 404 };
    mockUpload.mockResolvedValueOnce({ error: storageError });

    await expect(uploadAvatar(USER_ID, 'file:///tmp/photo.webp')).rejects.toEqual(storageError);

    // getPublicUrl must NOT be called when upload fails.
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });

  // ── Error path 5: EXIF verification failure ──────────────────────────────

  it('error: aborts upload when verifyExifStripped detects metadata', async () => {
    // This test ensures that if stripExifNative returns a buffer with EXIF
    // markers still present, the upload aborts before touching Storage.
    // Without this test, a no-op stripExif implementation would silently
    // leak GPS coordinates to the public bucket.
    const exifBuffer = new ArrayBuffer(512);
    const jpegView = new Uint8Array(exifBuffer);
    // Stamp JPEG magic bytes + EXIF marker (FF E1) to simulate stripping failure.
    jpegView[0] = 0xff; jpegView[1] = 0xd8; jpegView[2] = 0xff; // JPEG SOI
    jpegView[10] = 0xff; jpegView[11] = 0xe1; // EXIF marker at position 10

    const cleanBuffer = new ArrayBuffer(512);
    const cleanView = new Uint8Array(cleanBuffer);
    cleanView[0] = 0xff; cleanView[1] = 0xd8; cleanView[2] = 0xff; // JPEG SOI, no EXIF markers

    // First fetch is for the original upload URI (before stripping).
    // Second fetch is for the ImageManipulator-stripped URI (which we'll return EXIF-marked).
    let fetchCallCount = 0;
    const originalFetch = (global as unknown as { fetch: unknown }).fetch;
    (global as unknown as { fetch: unknown }).fetch = async (uri: unknown) => {
      fetchCallCount++;
      // First call: uploadAvatar fetches the original file (the initial fetch)
      if (fetchCallCount === 1) {
        return {
          arrayBuffer: async () => cleanBuffer,
        };
      }
      // Second call: stripExifNative fetches the ImageManipulator result (still has EXIF)
      return {
        arrayBuffer: async () => exifBuffer,
      };
    };

    // Mock saveToLibraryAsync to return an Asset object (this triggers the manipulateAsync)
    mockSaveToLibraryAsync.mockResolvedValue({
      id: 'fake-asset-id',
      filename: 'stripped.jpg',
      uri: 'file:///tmp/stripped.jpg',
      mediaType: 'photo',
    });

    try {
      await expect(uploadAvatar(USER_ID, 'file:///tmp/photo.jpg')).rejects.toThrow(
        /privacy check failed/i,
      );

      // Supabase storage must NOT be touched.
      expect(mockUpload).not.toHaveBeenCalled();
    } finally {
      (global as unknown as { fetch: unknown }).fetch = originalFetch;
    }
  });
});
