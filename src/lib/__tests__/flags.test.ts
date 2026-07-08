/**
 * Tests for the pure data exports in src/lib/flags.ts.
 *
 * Uses Jest globals (describe/it/expect) — these will run unchanged once
 * jest + jest-expo are installed; see qa-reports/proposal-testing-2026-05-23.md
 * for the one-command setup.
 *
 * Sections:
 *  1. Data dictionaries (CATEGORY_LABELS, SEVERITY_LABELS, etc.) — constants
 *     that must be complete and unique.
 *  2. updateFlagContent — Supabase-backed async helper, tested via a mocked
 *     client so no network is required.
 */

// ---------------------------------------------------------------------------
// expo-media-library mock — used by stripExifNative.
// Must declare the spy variable before jest.mock() so the factory closure
// captures a live reference (same pattern as the Supabase mock below).
// ---------------------------------------------------------------------------
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  SEVERITY_ORDER,
  SEVERITY_LABELS,
  SEVERITY_COLOR_NAMES,
  SEVERITY_DESCRIPTIONS,
  STATUS_LABELS,
  STATUS_ORDER,
  DEFAULT_STATUSES,
  FLAG_PHOTOS_BUCKET,
  updateFlagContent,
  uploadFlagPhoto,
  verifyExifStripped,
  stripExifNative,
  stripExifWeb,
  detectMimeFromBytes,
  resizeActionFor,
  scaledCanvasDims,
  PHOTO_MAX_DIMENSION,
} from '../flags';
import type { FlagCategory, FlagSeverity, FlagStatus } from '@/types/database';
import { Platform } from 'react-native';
// Imported (not require()'d) so FIX 3's test can assert on the mocked
// manipulateAsync without tripping @typescript-eslint/no-require-imports.
import { manipulateAsync as mockManipulateAsync } from 'expo-image-manipulator';

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
// Supabase mock — hoisted by Jest before any import runs. Follows the same
// builder-chain pattern used in feedbackStore.test.ts. Only the chain that
// updateFlagContent uses is wired: from → update → eq → select → single.
// Other async helpers (createFlag, listFlags, etc.) are NOT exercised by
// these tests and intentionally left unmocked at this time.
// ---------------------------------------------------------------------------
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSelectAfterUpdate = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    // Wrap in an arrow function so the factory closure captures a live
    // reference to mockFrom rather than the undefined TDZ value at hoist
    // time (jest.mock is hoisted above const declarations).
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const ALL_CATEGORIES: FlagCategory[] = [
  'no_ramp',
  'broken_sidewalk',
  'blocked_path',
  'missing_signal',
  'steep_grade',
  'other',
];

const ALL_SEVERITIES: FlagSeverity[] = [1, 2, 3, 4, 5];

const ALL_STATUSES: FlagStatus[] = ['open', 'verified', 'resolved', 'rejected'];

describe('CATEGORY_LABELS / CATEGORY_DESCRIPTIONS / CATEGORY_ICONS', () => {
  it.each(ALL_CATEGORIES)('has a label for %s', (cat) => {
    expect(typeof CATEGORY_LABELS[cat]).toBe('string');
    expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
  });

  it.each(ALL_CATEGORIES)('has a description for %s', (cat) => {
    expect(typeof CATEGORY_DESCRIPTIONS[cat]).toBe('string');
    expect(CATEGORY_DESCRIPTIONS[cat].length).toBeGreaterThan(0);
  });

  it.each(ALL_CATEGORIES)('has an icon for %s', (cat) => {
    expect(typeof CATEGORY_ICONS[cat]).toBe('string');
    expect(CATEGORY_ICONS[cat].length).toBeGreaterThan(0);
  });

  it('labels are unique (so the filter chips never collide)', () => {
    const labels = ALL_CATEGORIES.map((c) => CATEGORY_LABELS[c]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('CATEGORY_ORDER', () => {
  it('contains every category exactly once', () => {
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length);
    expect(CATEGORY_ORDER).toHaveLength(ALL_CATEGORIES.length);
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_ORDER).toContain(cat);
    }
  });
});

describe('SEVERITY_LABELS / SEVERITY_COLOR_NAMES / SEVERITY_DESCRIPTIONS', () => {
  it.each(ALL_SEVERITIES)('has a label for severity %i', (sev) => {
    expect(typeof SEVERITY_LABELS[sev]).toBe('string');
    expect(SEVERITY_LABELS[sev].length).toBeGreaterThan(0);
  });

  it.each(ALL_SEVERITIES)('has a color name for severity %i', (sev) => {
    expect(typeof SEVERITY_COLOR_NAMES[sev]).toBe('string');
    expect(SEVERITY_COLOR_NAMES[sev].length).toBeGreaterThan(0);
  });

  it.each(ALL_SEVERITIES)('has a description for severity %i', (sev) => {
    expect(typeof SEVERITY_DESCRIPTIONS[sev]).toBe('string');
    expect(SEVERITY_DESCRIPTIONS[sev].length).toBeGreaterThan(0);
  });

  it('color names do not rely on color alone (a screen-reader-readable label exists per severity)', () => {
    // The point of SEVERITY_COLOR_NAMES is to read 'red' aloud rather than
    // signal severity via fill color only. Make sure no two severities share
    // a color name (a duplicate would defeat the readability goal).
    const names = ALL_SEVERITIES.map((s) => SEVERITY_COLOR_NAMES[s]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('SEVERITY_ORDER', () => {
  it('is the canonical 1..5 ascending sequence', () => {
    expect(SEVERITY_ORDER).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('STATUS_LABELS / STATUS_ORDER', () => {
  it.each(ALL_STATUSES)('has a label for %s', (status) => {
    expect(typeof STATUS_LABELS[status]).toBe('string');
    expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
  });

  it('STATUS_ORDER contains every status exactly once', () => {
    expect(new Set(STATUS_ORDER).size).toBe(STATUS_ORDER.length);
    expect(STATUS_ORDER).toHaveLength(ALL_STATUSES.length);
  });

  it('STATUS_ORDER follows the chronological lifecycle', () => {
    expect(STATUS_ORDER).toEqual(['open', 'verified', 'resolved', 'rejected']);
  });
});

describe('DEFAULT_STATUSES', () => {
  it("matches the Map filter's default-on chips (open + verified)", () => {
    // If this changes, MapScreen.tsx and TasksScreen.tsx default filters
    // must move together — they share this constant by design.
    expect(DEFAULT_STATUSES).toEqual(['open', 'verified']);
  });

  it('is a subset of STATUS_ORDER', () => {
    for (const s of DEFAULT_STATUSES) {
      expect(STATUS_ORDER).toContain(s);
    }
  });
});

describe('FLAG_PHOTOS_BUCKET', () => {
  it('matches the bucket name referenced by Supabase Storage RLS in schema.sql', () => {
    // If this constant ever drifts from supabase/schema.sql, uploads will
    // silently 404 against the wrong bucket. Pin it here so the lib +
    // schema can't disagree without a failing test.
    expect(FLAG_PHOTOS_BUCKET).toBe('flag-photos');
  });
});

// ---------------------------------------------------------------------------
// updateFlagContent — Supabase-backed async helper
// Chain under test: supabase.from('flags').update(patch).eq('id', flagId).select().single()
// ---------------------------------------------------------------------------

describe('updateFlagContent', () => {
  const SAMPLE_ROW = {
    id: 'flag-abc',
    user_id: 'user-1',
    lat: 49.25,
    lng: -123.1,
    category: 'no_ramp' as const,
    severity: 3 as const,
    description: 'updated description',
    photo_url: null,
    status: 'open' as const,
    created_at: '2026-05-25T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Wire the builder chain so each method returns the next link.
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelectAfterUpdate });
    mockSelectAfterUpdate.mockReturnValue({ single: mockSingle });
  });

  it('resolves with the FlagRow returned by Supabase on success', async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    const result = await updateFlagContent('flag-abc', { description: 'updated description' });

    expect(result).toEqual(SAMPLE_ROW);
  });

  it('throws when Supabase returns an error', async () => {
    const dbError = { message: 'permission denied', code: '42501' };
    mockSingle.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(updateFlagContent('flag-abc', { severity: 5 })).rejects.toEqual(dbError);
  });

  it('passes only the patch fields to .update() — never readonly fields', async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    const patch = {
      description: 'new text',
      category: 'broken_sidewalk' as const,
      severity: 2 as const,
    };
    await updateFlagContent('flag-abc', patch);

    // .update() must receive exactly the patch — no status, user_id, lat, lng, etc.
    expect(mockUpdate).toHaveBeenCalledWith(patch);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("targets the correct row by id via .eq('id', flagId)", async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    await updateFlagContent('flag-abc', { description: 'x' });

    expect(mockEq).toHaveBeenCalledWith('id', 'flag-abc');
  });

  it("queries the 'flags' table (not a wrong table name)", async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    await updateFlagContent('flag-abc', { severity: 1 });

    expect(mockFrom).toHaveBeenCalledWith('flags');
  });
});

// Validation paths in uploadFlagPhoto are pre-Storage: each one throws
// before any Supabase call, so we can exercise them without a mocked
// client. The "happy path" is still deferred until the wider
// Supabase-mock setup lands (see header comment).
describe('uploadFlagPhoto — input validation', () => {
  const USER = '00000000-0000-0000-0000-000000000001';

  it('rejects an empty URI', async () => {
    await expect(uploadFlagPhoto(USER, '')).rejects.toThrow(/no photo/i);
  });

  it('rejects an http(s) URI (would re-upload a remote image)', async () => {
    await expect(uploadFlagPhoto(USER, 'https://example.com/foo.jpg')).rejects.toThrow(
      /unsupported/i,
    );
  });

  it('rejects a non-image extension on an otherwise valid scheme', async () => {
    await expect(uploadFlagPhoto(USER, 'file:///tmp/payload.svg')).rejects.toThrow(
      /jpg|png|webp|heic/i,
    );
  });

  it('rejects an empty file body', async () => {
    const originalFetch = global.fetch;
    // Cast through unknown so we don't need DOM Fetch types in the test
    // file. The validation path only awaits .arrayBuffer().
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    try {
      await expect(uploadFlagPhoto(USER, 'file:///tmp/empty.jpg')).rejects.toThrow(/empty/i);
    } finally {
      (global as unknown as { fetch: unknown }).fetch = originalFetch;
    }
  });

  it('rejects a file over 10 MB', async () => {
    const originalFetch = global.fetch;
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      // 10 MB + 1 byte
      arrayBuffer: async () => new ArrayBuffer(10 * 1024 * 1024 + 1),
    });
    try {
      await expect(uploadFlagPhoto(USER, 'file:///tmp/huge.jpg')).rejects.toThrow(
        /too large|10 MB/i,
      );
    } finally {
      (global as unknown as { fetch: unknown }).fetch = originalFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// D8 fail-CLOSED: on web, if EXIF stripping cannot be performed, the upload
// must ABORT — never fall through to Storage with the original bytes. This
// locks the privacy fix: a WEBP/HEIC original (whose EXIF lives in a RIFF/ISO
// container, invisible to the JPEG-marker verifier) must not reach the bucket.
// ---------------------------------------------------------------------------
describe('uploadFlagPhoto — D8 web fail-closed', () => {
  const USER = '00000000-0000-0000-0000-000000000001';

  it('aborts the upload (does not touch Storage) when stripExifWeb cannot strip on web', async () => {
    const originalOS = Platform.OS;
    const originalFetch = global.fetch;
    const savedDocument = (global as Record<string, unknown>)['document'];
    // Force the web branch; remove `document` so stripExifWeb fails closed (null).
    (Platform as unknown as { OS: string }).OS = 'web';
    delete (global as Record<string, unknown>)['document'];
    // Valid WEBP magic (RIFF....WEBP) so detectMimeFromBytes passes and we
    // reach the strip step rather than failing the format check.
    (global as unknown as { fetch: unknown }).fetch = async () => ({
      arrayBuffer: async () =>
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00,
        ]).buffer,
    });
    // Storage must NEVER be called on this path — wire it to fail loudly if it is.
    mockFrom.mockImplementation(() => {
      throw new Error('Storage must not be reached when EXIF stripping fails (D8 fail-closed)');
    });
    try {
      await expect(uploadFlagPhoto(USER, 'file:///tmp/photo.webp')).rejects.toThrow(
        /privacy check failed/i,
      );
    } finally {
      (Platform as unknown as { OS: string }).OS = originalOS;
      (global as unknown as { fetch: unknown }).fetch = originalFetch;
      if (savedDocument !== undefined) {
        (global as Record<string, unknown>)['document'] = savedDocument;
      }
      mockFrom.mockReset();
    }
  });
});

// ---------------------------------------------------------------------------
// Section 3 — verifyExifStripped (format-aware, F29 re-sweep fix)
//
// Structural verification of post-strip bytes:
//   JPEG: APP1/APP13/APP9 (EXIF/IPTC/XMP) segments before SOS → false.
//         Marker-like byte pairs inside entropy-coded scan data are IGNORED
//         (the old raw scan false-positived on them).
//   PNG:  an `eXIf` chunk → false. Marker-like pairs inside IDAT are IGNORED
//         (the old raw scan rejected virtually every photo-sized PNG).
//   Unknown/malformed bytes → false (fail closed: strip output must be
//   well-formed JPEG or PNG).
//
// This is the most critical privacy gate in the upload path: if it fires,
// users' GPS coordinates may still be embedded in the photo.
// ---------------------------------------------------------------------------
describe('verifyExifStripped', () => {
  function bufferOf(...bytes: number[]): ArrayBuffer {
    return new Uint8Array(bytes).buffer;
  }

  // ── synthetic-image helpers ──────────────────────────────────────────────
  /** JPEG: SOI + given segments + SOS header + scan bytes + EOI. */
  function jpegOf(opts: { appSegments?: number[][]; scanBytes?: number[] }): ArrayBuffer {
    const bytes: number[] = [0xff, 0xd8]; // SOI
    for (const seg of opts.appSegments ?? []) bytes.push(...seg);
    bytes.push(0xff, 0xda, 0x00, 0x04, 0x01, 0x00); // SOS, len 4
    bytes.push(...(opts.scanBytes ?? [0x12, 0x34, 0x56]));
    bytes.push(0xff, 0xd9); // EOI
    return new Uint8Array(bytes).buffer;
  }
  /** A marker segment: FF <marker> <len hi> <len lo> <payload…>. */
  function segment(marker: number, payload: number[]): number[] {
    const len = payload.length + 2;
    return [0xff, marker, (len >> 8) & 0xff, len & 0xff, ...payload];
  }
  const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  /** A PNG chunk: len(4BE) + type(4 ascii) + data + CRC(4, unvalidated). */
  function chunk(type: string, data: number[]): number[] {
    const len = data.length;
    return [
      (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff,
      ...[...type].map((c) => c.charCodeAt(0)),
      ...data,
      0, 0, 0, 0, // CRC — not validated by the verifier
    ];
  }
  function pngOf(...chunks: number[][]): ArrayBuffer {
    return new Uint8Array([...PNG_SIG, ...chunks.flat()]).buffer;
  }
  const IHDR = chunk('IHDR', new Array(13).fill(1));
  const IEND = chunk('IEND', []);

  // ── JPEG ─────────────────────────────────────────────────────────────────
  it('passes a clean JPEG with only APP0/JFIF before SOS', () => {
    expect(verifyExifStripped(jpegOf({ appSegments: [segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00])] }))).toBe(true);
  });

  it('rejects a JPEG with an APP1 (EXIF) segment', () => {
    const exifPayload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
    expect(verifyExifStripped(jpegOf({ appSegments: [segment(0xe1, exifPayload)] }))).toBe(false);
  });

  it('rejects a JPEG with an APP13 (IPTC) segment', () => {
    expect(verifyExifStripped(jpegOf({ appSegments: [segment(0xed, [0x00, 0x01])] }))).toBe(false);
  });

  it('rejects a JPEG with an APP9 (XMP) segment', () => {
    expect(verifyExifStripped(jpegOf({ appSegments: [segment(0xe9, [0x00, 0x01])] }))).toBe(false);
  });

  it('LOCKING (F29): marker-like bytes inside JPEG scan data are NOT metadata', () => {
    // 0xFF 0xE1 inside the entropy-coded scan — the old raw scan rejected this.
    expect(
      verifyExifStripped(jpegOf({ scanBytes: [0x10, 0xff, 0xe1, 0x22, 0xff, 0xed, 0x33] })),
    ).toBe(true);
  });

  it('fails closed on a truncated JPEG segment header', () => {
    // SOI + APP0 claiming length 16 with no payload behind it.
    expect(verifyExifStripped(bufferOf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe(false);
  });

  // ── PNG ──────────────────────────────────────────────────────────────────
  it('LOCKING (F29): marker-like bytes inside PNG IDAT are NOT metadata', () => {
    // The headline bug: photo-sized PNGs (screenshots) virtually always carry
    // 0xFFE1/0xFFED pairs in compressed IDAT data and were all rejected.
    const idat = chunk('IDAT', [0x00, 0xff, 0xe1, 0x42, 0xff, 0xed, 0x99, 0xff, 0xe9]);
    expect(verifyExifStripped(pngOf(IHDR, idat, IEND))).toBe(true);
  });

  it('rejects a PNG with an eXIf chunk (where PNG actually stores GPS)', () => {
    const exif = chunk('eXIf', [0x4d, 0x4d, 0x00, 0x2a]); // TIFF header start
    expect(verifyExifStripped(pngOf(IHDR, exif, IEND))).toBe(false);
  });

  it('fails closed on a PNG with no IEND (truncated)', () => {
    expect(verifyExifStripped(pngOf(IHDR))).toBe(false);
  });

  // ── unknown formats: fail closed ─────────────────────────────────────────
  it('fails closed on an empty ArrayBuffer', () => {
    expect(verifyExifStripped(new ArrayBuffer(0))).toBe(false);
  });

  it('fails closed on bytes that are neither JPEG nor PNG', () => {
    expect(verifyExifStripped(bufferOf(0xff, 0x00, 0xaa, 0xbb, 0x01, 0x02))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Section 4 — stripExifNative (async, uses expo-media-library)
//
// Tests the native transcode path (iOS/Android).
// All paths are fail-safe: if anything goes wrong, the ORIGINAL buffer is
// returned rather than throwing. User's photo is never lost.
// ---------------------------------------------------------------------------
describe('stripExifNative', () => {
  // A minimal 4-byte "image" to use as input. Real images would be larger
  // but the function treats the buffer as opaque bytes.
  const ORIGINAL = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer;
  const STRIPPED = new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d]).buffer;

  beforeEach(() => {
    mockSaveToLibraryAsync.mockReset();
    (global as unknown as { fetch: unknown }).fetch = jest.fn();
  });

  afterEach(() => {
    // Restore to avoid polluting other test suites.
    (global as unknown as { fetch: unknown }).fetch = undefined as unknown as typeof fetch;
  });

  it('returns the stripped buffer when MediaLibrary succeeds', async () => {
    // MediaLibrary returns an Asset object with id, filename, uri, mediaType.
    // This matches the real expo-media-library return type on iOS/Android.
    mockSaveToLibraryAsync.mockResolvedValue({
      id: 'fake-asset-id',
      filename: 'stripped.jpg',
      uri: 'file:///tmp/stripped.jpg',
      mediaType: 'photo',
    });
    // fetch reads back the stripped bytes.
    (
      global as unknown as {
        fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      }
    ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => STRIPPED });

    const result = await stripExifNative(ORIGINAL, 'jpg');
    expect(result).toBe(STRIPPED);
  });

  it('returns null (fail-closed) when ImageManipulator throws', async () => {
    // Mock ImageManipulator.manipulateAsync to throw an error.
    const ImageManipulator = require('expo-image-manipulator');
    ImageManipulator.manipulateAsync.mockRejectedValueOnce(new Error('Native API unavailable'));

    const result = await stripExifNative(ORIGINAL, 'jpg');
    // Fail-closed: return null on any error (D8 privacy gate).
    expect(result).toBe(null);
  });

  it('returns null (fail-closed) when the transcoded fetch returns empty bytes', async () => {
    // Mock fetch to return an empty ArrayBuffer (simulating failed transcode).
    (
      global as unknown as {
        fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      }
    ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(0) });

    const result = await stripExifNative(ORIGINAL, 'jpg');
    // Fail-closed: return null on any error (D8 privacy gate).
    expect(result).toBe(null);
  });

  it('returns null (fail-closed) when the input buffer is empty', async () => {
    // P3: the empty-input guard must abort before touching the codec — there
    // is nothing to strip, and undecodable bytes must never reach Storage.
    const result = await stripExifNative(new ArrayBuffer(0), 'jpg');
    expect(result).toBe(null);
  });

  it('P3 perf: passes the source file URI straight into manipulateAsync (no base64 data: URI)', async () => {
    // FIX 3: when a source URI is supplied we feed it directly to the codec
    // instead of building a per-byte ~10 MB JS string + `data:` URI. Assert the
    // manipulator received the file URI verbatim — and crucially NOT a data:
    // URI — and that re-encode semantics are preserved (empty actions array).
    const manipulate = mockManipulateAsync as unknown as jest.Mock;
    manipulate.mockClear();
    manipulate.mockResolvedValueOnce({
      uri: 'file:///tmp/stripped.jpg',
      width: 10,
      height: 10,
    });
    (
      global as unknown as {
        fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      }
    ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => STRIPPED });

    const result = await stripExifNative(ORIGINAL, 'jpg', 'file:///tmp/original.jpg');

    expect(result).toBe(STRIPPED);
    const [inputArg, actionsArg] = manipulate.mock.calls[0];
    expect(inputArg).toBe('file:///tmp/original.jpg');
    expect(String(inputArg).startsWith('data:')).toBe(false);
    // Re-encode-only semantics preserved: empty actions array.
    expect(actionsArg).toEqual([]);
  });

  it('REGRESSION: fails if stripExifNative returns the original buffer unchanged', async () => {
    // This test ensures that if stripExifNative is broken and returns the
    // original buffer instead of the transcoded one, this test will fail.
    // A broken implementation would make this test fail, preventing silent
    // privacy leaks (GPS metadata in unverified photos).
    mockSaveToLibraryAsync.mockResolvedValue({
      id: 'fake-asset-id',
      filename: 'stripped.jpg',
      uri: 'file:///tmp/stripped.jpg',
      mediaType: 'photo',
    });
    (
      global as unknown as {
        fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      }
    ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => STRIPPED });

    const result = await stripExifNative(ORIGINAL, 'jpg');

    // The result must be the STRIPPED buffer, not the ORIGINAL.
    // If this assertion fails, stripExifNative is a no-op and GPS data leaks.
    expect(result).toBe(STRIPPED);
    expect(result).not.toBe(ORIGINAL);
  });

  // ── B8 (L7-05): resize rides in the SAME pass as the strip ────────────────
  // A synthetic clean JPEG (APP0/JFIF only) — what the codec emits after the
  // strip+resize re-encode. A version WITH an APP1/EXIF segment is included to
  // prove the verifyExifStripped gate actually catches GPS-bearing metadata, so
  // the "emitted bytes are clean" assertion is meaningful and not vacuous.
  const CLEAN_JPEG = new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x07, 0x4a, 0x46, 0x49, 0x46, 0x00, // APP0 "JFIF\0"
    0xff, 0xda, 0x00, 0x04, 0x01, 0x00, // SOS
    0x12, 0x34, 0x56, // scan
    0xff, 0xd9, // EOI
  ]).buffer;
  const EXIF_JPEG = new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // APP1 "Exif\0\0"
    0xff, 0xda, 0x00, 0x04, 0x01, 0x00, // SOS
    0x12, 0x34, 0x56, // scan
    0xff, 0xd9, // EOI
  ]).buffer;

  it('B8: emits a resized AND EXIF-free asset — the resize action rides in the strip pass, and the FINAL emitted bytes pass the EXIF gate', async () => {
    // Guard that the gate is real: an EXIF-bearing JPEG is rejected, a clean one passes.
    expect(verifyExifStripped(EXIF_JPEG)).toBe(false);
    expect(verifyExifStripped(CLEAN_JPEG)).toBe(true);

    const manipulate = mockManipulateAsync as unknown as jest.Mock;
    manipulate.mockClear();
    manipulate.mockResolvedValueOnce({
      uri: 'file:///mock/resized-stripped.jpg',
      width: PHOTO_MAX_DIMENSION,
      height: 1536,
    });
    // The bytes read back from the emitted file — i.e. what uploadStrippedImage
    // would hand to Storage — are the clean (EXIF-free) re-encode.
    (
      global as unknown as {
        fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      }
    ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => CLEAN_JPEG });

    // 4000×3000 landscape original → cap the LONGER (width) edge.
    const result = await stripExifNative(ORIGINAL, 'jpg', 'file:///tmp/original.jpg', 4000, 3000);

    // (1) The resize action was passed to the SAME manipulateAsync call that
    // re-encodes (strips) — not an earlier pass, not a separate call.
    expect(manipulate).toHaveBeenCalledTimes(1);
    const [inputArg, actionsArg] = manipulate.mock.calls[0];
    expect(inputArg).toBe('file:///tmp/original.jpg');
    expect(actionsArg).toEqual([{ resize: { width: PHOTO_MAX_DIMENSION } }]);
    // (2) The FINAL EMITTED bytes are EXIF-free — GPS is gone from the file that
    // actually gets uploaded, not merely "manipulateAsync was called."
    expect(result).not.toBeNull();
    expect(verifyExifStripped(result as ArrayBuffer)).toBe(true);
  });

  it('B8: a portrait original caps the HEIGHT edge in the same pass', async () => {
    const manipulate = mockManipulateAsync as unknown as jest.Mock;
    manipulate.mockClear();
    manipulate.mockResolvedValueOnce({ uri: 'file:///mock/p.jpg', width: 1536, height: PHOTO_MAX_DIMENSION });
    (
      global as unknown as {
        fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      }
    ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => CLEAN_JPEG });

    await stripExifNative(ORIGINAL, 'jpg', 'file:///tmp/portrait.jpg', 3000, 4000);

    const [, actionsArg] = manipulate.mock.calls[0];
    expect(actionsArg).toEqual([{ resize: { height: PHOTO_MAX_DIMENSION } }]);
  });

  it('B8: a small pick is NOT upscaled — the pass still strips but changes no pixels (empty actions)', async () => {
    const manipulate = mockManipulateAsync as unknown as jest.Mock;
    manipulate.mockClear();
    manipulate.mockResolvedValueOnce({ uri: 'file:///mock/s.jpg', width: 800, height: 600 });
    (
      global as unknown as {
        fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      }
    ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => CLEAN_JPEG });

    await stripExifNative(ORIGINAL, 'jpg', 'file:///tmp/small.jpg', 800, 600);

    const [, actionsArg] = manipulate.mock.calls[0];
    expect(actionsArg).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Section 4b — B8 (L7-05) resize helpers: resizeActionFor (native manipulate
// action) + scaledCanvasDims (web canvas dims). Pure functions — the downscale
// math is unit-tested here without a native codec or a canvas mock.
// ---------------------------------------------------------------------------
describe('resizeActionFor (B8/L7-05)', () => {
  it('caps the WIDTH edge for a landscape original over the cap', () => {
    expect(resizeActionFor(4000, 3000)).toEqual([{ resize: { width: PHOTO_MAX_DIMENSION } }]);
  });
  it('caps the HEIGHT edge for a portrait original over the cap', () => {
    expect(resizeActionFor(3000, 4000)).toEqual([{ resize: { height: PHOTO_MAX_DIMENSION } }]);
  });
  it('returns [] (no resize) when the longer edge already fits', () => {
    expect(resizeActionFor(800, 600)).toEqual([]);
    expect(resizeActionFor(PHOTO_MAX_DIMENSION, 1000)).toEqual([]); // exactly the cap
  });
  it('returns [] (re-encode only) when dimensions are unknown', () => {
    expect(resizeActionFor(undefined, undefined)).toEqual([]);
    expect(resizeActionFor(4000, undefined)).toEqual([]);
  });
  it('returns [] (fail-safe) on zero / negative / non-finite dimensions', () => {
    expect(resizeActionFor(0, 0)).toEqual([]);
    expect(resizeActionFor(-4000, 3000)).toEqual([]);
    expect(resizeActionFor(Number.NaN, 3000)).toEqual([]);
    expect(resizeActionFor(Number.POSITIVE_INFINITY, 3000)).toEqual([]);
  });
});

describe('scaledCanvasDims (B8/L7-05 — web)', () => {
  it('downscales a landscape original so the longer (width) edge hits the cap', () => {
    expect(scaledCanvasDims(4000, 3000)).toEqual({ width: PHOTO_MAX_DIMENSION, height: 1536 });
  });
  it('downscales a portrait original so the longer (height) edge hits the cap', () => {
    expect(scaledCanvasDims(3000, 4000)).toEqual({ width: 1536, height: PHOTO_MAX_DIMENSION });
  });
  it('never upscales a small image (scale clamped to 1)', () => {
    expect(scaledCanvasDims(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledCanvasDims(PHOTO_MAX_DIMENSION, 1024)).toEqual({ width: PHOTO_MAX_DIMENSION, height: 1024 });
  });
});

// ---------------------------------------------------------------------------
// Section 5 — stripExifWeb (Canvas re-encoding, browser-only)
//
// D8 privacy gate — FAIL-CLOSED. When stripping cannot be performed (no
// browser environment, no canvas context, image decode failure), the function
// returns null so the caller aborts the upload. It must NEVER resolve the
// original (unstripped) buffer — that previously let GPS-bearing WEBP/HEIC
// bytes pass the JPEG-only verifyExifStripped check.
// ---------------------------------------------------------------------------
describe('stripExifWeb', () => {
  const ORIGINAL = new Uint8Array([0x20, 0x21, 0x22, 0x23]).buffer;

  it('returns null (fail-closed) when document is undefined (Node/Jest env)', async () => {
    // In Jest, `document` is undefined unless jsdom is configured.
    // The function guards with `typeof document === 'undefined'`.
    const savedDocument = (global as Record<string, unknown>)['document'];
    delete (global as Record<string, unknown>)['document'];
    try {
      const result = await stripExifWeb(ORIGINAL, 'jpg');
      expect(result).toBeNull();
      // Critical: must not leak the original unstripped bytes back to the caller.
      expect(result).not.toBe(ORIGINAL);
    } finally {
      if (savedDocument !== undefined) {
        (global as Record<string, unknown>)['document'] = savedDocument;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Section 6 — detectMimeFromBytes
//
// Inspects the first 12 bytes of a buffer to detect the image MIME type.
// Guards against files that pass the extension check but contain non-image
// content (e.g. a file named evil.jpg with HTML inside).
// ---------------------------------------------------------------------------
describe('detectMimeFromBytes', () => {
  function makeBuffer(...bytes: number[]): ArrayBuffer {
    // Pad to at least 12 bytes so the function doesn't short-circuit.
    const arr = new Uint8Array(Math.max(12, bytes.length));
    bytes.forEach((b, i) => { arr[i] = b; });
    return arr.buffer;
  }

  it('returns "image/jpeg" for JPEG magic bytes (FF D8 FF)', () => {
    const buf = makeBuffer(0xff, 0xd8, 0xff, 0xe0);
    expect(detectMimeFromBytes(buf)).toBe('image/jpeg');
  });

  it('returns "image/png" for PNG magic bytes (89 50 4E 47)', () => {
    const buf = makeBuffer(0x89, 0x50, 0x4e, 0x47);
    expect(detectMimeFromBytes(buf)).toBe('image/png');
  });

  it('returns "image/webp" for WEBP magic bytes (RIFF....WEBP)', () => {
    // Bytes 0-3: RIFF (0x52 49 46 46), bytes 4-7: size (any), bytes 8-11: WEBP (0x57 45 42 50)
    const buf = makeBuffer(
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size (arbitrary)
      0x57, 0x45, 0x42, 0x50, // WEBP
    );
    expect(detectMimeFromBytes(buf)).toBe('image/webp');
  });

  it('returns "image/heic" for HEIC magic bytes (ftyp box + mif1 brand)', () => {
    // Bytes 0-3: box size (any), bytes 4-7: ftyp (0x66 74 79 70), bytes 8-11: mif1 (0x6D 69 66 31)
    const buf = makeBuffer(
      0x00, 0x00, 0x00, 0x18, // box size
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x6d, 0x69, 0x66, 0x31, // mif1 brand
    );
    expect(detectMimeFromBytes(buf)).toBe('image/heic');
  });

  it('returns null for a buffer shorter than 12 bytes', () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff]).buffer; // only 3 bytes
    expect(detectMimeFromBytes(buf)).toBeNull();
  });

  it('returns null for an all-zero 512-byte buffer (no magic bytes match)', () => {
    expect(detectMimeFromBytes(new ArrayBuffer(512))).toBeNull();
  });
});
