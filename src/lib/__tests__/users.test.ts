/**
 * Tests for src/lib/users.ts — cycle 4 gap fill.
 *
 * GAP-1: getInitials() — pure function, 9 edge cases
 * GAP-2: uploadAvatar() — success paths (incl. codec-APP1 sanitize) + error
 *        paths, Supabase Storage mocked
 *
 * See qa-reports/2026-05-25-gary-cycle4-coverage-gaps.md for full gap analysis.
 */

import { getInitials, uploadAvatar, updateUserProfile } from '../users';

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
// GAP-2: uploadAvatar() — success paths (incl. codec-APP1 sanitize) + error paths
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
  });

  // ── Success path ─────────────────────────────────────────────────────────

  /**
   * Minimal STRUCTURALLY VALID JPEG: SOI + (optional APP1/EXIF) + APP0 + SOS +
   * scan data + EOI. The format-aware verifyExifStripped (F29) walks real
   * marker segments, so fixtures must be well-formed — magic bytes alone now
   * fail closed as malformed.
   */
  function makeJpegBuffer(opts?: { withExifSegment?: boolean }): ArrayBuffer {
    const bytes: number[] = [0xff, 0xd8]; // SOI
    if (opts?.withExifSegment) {
      bytes.push(0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00); // APP1 "Exif\0\0"
    }
    bytes.push(0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46); // APP0, len 4
    bytes.push(0xff, 0xda, 0x00, 0x04, 0x01, 0x00); // SOS, len 4
    bytes.push(0x11, 0x22, 0x33, 0x44); // entropy-coded scan data
    bytes.push(0xff, 0xd9); // EOI
    return new Uint8Array(bytes).buffer;
  }

  it('success: returns the public URL on a valid JPG upload', async () => {
    const fakeBuffer = makeJpegBuffer();
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

  // ── Error path 1b: remote URL rejected by the scheme guard ────────────────

  it('error: rejects an http:// avatar URI (ALLOWED_PHOTO_SCHEMES guard)', async () => {
    // FIX 2: the avatar path now runs through the shared uploadStrippedImage
    // helper, which enforces the same ALLOWED_PHOTO_SCHEMES guard as
    // uploadFlagPhoto. A remote http(s):// URI must be rejected BEFORE any
    // fetch/strip/upload — otherwise uploadAvatar would fetch and re-upload
    // someone else's network image. No fetch mock is needed; the guard fires
    // before any I/O.
    await expect(uploadAvatar(USER_ID, 'http://evil.example.com/photo.jpg')).rejects.toThrow(
      /unsupported photo source/i,
    );
    await expect(uploadAvatar(USER_ID, 'https://evil.example.com/photo.jpg')).rejects.toThrow(
      /unsupported photo source/i,
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
    // .webp URI exercises the extension allowlist; the buffer is a valid JPEG
    // because the (mocked) strip step's output must pass the format-aware
    // post-strip verifier to reach the Storage call under test.
    const fakeBuffer = makeJpegBuffer();
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      arrayBuffer: async () => fakeBuffer,
    });

    const storageError = { message: 'Bucket not found', status: 404 };
    mockUpload.mockResolvedValueOnce({ error: storageError });

    await expect(uploadAvatar(USER_ID, 'file:///tmp/photo.webp')).rejects.toEqual(storageError);

    // getPublicUrl must NOT be called when upload fails.
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });

  // ── Path 5: codec-emitted EXIF is sanitized, not fatal (2026-07-20 fix) ──

  it('sanitizes a manipulator output that still carries an APP1 and uploads clean bytes', async () => {
    // Apple's UIImage.jpegData writes a benign APP1 (orientation/XMP) into
    // every re-encode, so the strip step's REAL output on iOS is APP1-bearing
    // even though the SOURCE metadata was discarded. The old pipeline treated
    // that as a fatal privacy failure — every avatar/photo upload died on
    // device. sanitizeImageMetadata now splices the segment out and the
    // upload proceeds with clean bytes.
    const exifBuffer = makeJpegBuffer({ withExifSegment: true });
    const cleanBuffer = makeJpegBuffer();

    // First fetch is for the original upload URI (before stripping).
    // Second fetch is for the ImageManipulator output (real codec shape: APP1).
    let fetchCallCount = 0;
    const originalFetch = (global as unknown as { fetch: unknown }).fetch;
    (global as unknown as { fetch: unknown }).fetch = async () => {
      fetchCallCount++;
      return { arrayBuffer: async () => (fetchCallCount === 1 ? cleanBuffer : exifBuffer) };
    };

    mockUpload.mockResolvedValueOnce({ error: null });
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: 'https://cdn.example.com/user-abc-123/avatar/1234567890.jpg' },
    });

    try {
      const url = await uploadAvatar(USER_ID, 'file:///tmp/photo.jpg');

      expect(url).toMatch(/^https:\/\//);
      expect(mockUpload).toHaveBeenCalledTimes(1);
      // The uploaded bytes are the APP1-spliced codec output — byte-identical
      // to the same fixture built without the EXIF segment.
      const [, bufferArg] = mockUpload.mock.calls[0];
      expect(new Uint8Array(bufferArg as ArrayBuffer)).toEqual(new Uint8Array(cleanBuffer));
    } finally {
      (global as unknown as { fetch: unknown }).fetch = originalFetch;
    }
  });

  // ── Error path 5: unparseable post-strip bytes still abort (D8) ──────────

  it('error: aborts upload when the post-strip bytes cannot be sanitized/verified', async () => {
    // A truncated JPEG (segment header claims 16 bytes with nothing behind it)
    // is unparseable: sanitizeImageMetadata returns null → fail-closed abort
    // BEFORE Storage is touched. Keeps the D8 abort coverage the old
    // "manipulator output still has EXIF" test provided, now that APP1-bearing
    // output is healed rather than fatal.
    const cleanBuffer = makeJpegBuffer();
    const malformed = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).buffer;

    let fetchCallCount = 0;
    const originalFetch = (global as unknown as { fetch: unknown }).fetch;
    (global as unknown as { fetch: unknown }).fetch = async () => {
      fetchCallCount++;
      return { arrayBuffer: async () => (fetchCallCount === 1 ? cleanBuffer : malformed) };
    };

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

// ---------------------------------------------------------------------------
// GAP-3: updateUserProfile() — display_name validation + Supabase chain
// ---------------------------------------------------------------------------

describe('updateUserProfile()', () => {
  // Build a chainable mock for: supabase.from().update().eq().select().single()
  const mockSingle = jest.fn();
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockUpdate = jest.fn();
  const mockFromUsers = jest.fn();

  const mockSupabase = jest.requireMock('../supabase').supabase as {
    from: jest.Mock;
  };

  beforeEach(() => {
    mockSingle.mockReset();
    mockSelect.mockReset().mockReturnValue({ single: mockSingle });
    mockEq.mockReset().mockReturnValue({ select: mockSelect });
    mockUpdate.mockReset().mockReturnValue({ eq: mockEq });
    mockFromUsers.mockReset().mockReturnValue({ update: mockUpdate });
    mockSupabase.from.mockImplementation(() => ({ update: mockUpdate }));
  });

  const USER_ID = 'user-abc';
  const BASE_ROW = {
    id: USER_ID,
    display_name: 'Alice',
    avatar_url: null,
    points: 0,
    created_at: '2026-01-01T00:00:00Z',
  };

  it('trims display_name whitespace and saves the clean value', async () => {
    mockSingle.mockResolvedValue({ data: { ...BASE_ROW, display_name: 'Alice' }, error: null });
    await updateUserProfile(USER_ID, { display_name: '  Alice  ' });
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: 'Alice' });
  });

  it('converts a whitespace-only display_name to null', async () => {
    mockSingle.mockResolvedValue({ data: { ...BASE_ROW, display_name: null }, error: null });
    await updateUserProfile(USER_ID, { display_name: '   ' });
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: null });
  });

  it('accepts null display_name (explicitly clear the name)', async () => {
    mockSingle.mockResolvedValue({ data: { ...BASE_ROW, display_name: null }, error: null });
    await updateUserProfile(USER_ID, { display_name: null });
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: null });
  });

  it('throws when display_name exceeds 60 characters', async () => {
    await expect(
      updateUserProfile(USER_ID, { display_name: 'x'.repeat(61) })
    ).rejects.toThrow('60 characters or fewer');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('accepts a display_name of exactly 60 characters', async () => {
    mockSingle.mockResolvedValue({ data: { ...BASE_ROW, display_name: 'x'.repeat(60) }, error: null });
    await expect(
      updateUserProfile(USER_ID, { display_name: 'x'.repeat(60) })
    ).resolves.toBeDefined();
  });

  it('returns the saved UserRow on success', async () => {
    const saved = { ...BASE_ROW, display_name: 'Bob' };
    mockSingle.mockResolvedValue({ data: saved, error: null });
    const result = await updateUserProfile(USER_ID, { display_name: 'Bob' });
    expect(result).toEqual(saved);
  });

  it('throws the Supabase error object when the query fails', async () => {
    const dbError = { message: 'row not found', code: 'PGRST116' };
    mockSingle.mockResolvedValue({ data: null, error: dbError });
    await expect(updateUserProfile(USER_ID, { display_name: 'Bob' })).rejects.toEqual(dbError);
  });
});
