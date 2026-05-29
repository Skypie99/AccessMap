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
const mockSaveToLibraryAsync = jest.fn();

jest.mock('expo-media-library', () => ({
  __esModule: true,
  saveToLibraryAsync: (...args: unknown[]) => mockSaveToLibraryAsync(...args),
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
} from '../flags';
import type { FlagCategory, FlagSeverity, FlagStatus } from '@/types/database';

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
// Section 3 — verifyExifStripped
//
// Pure function: scans raw bytes for JPEG metadata markers.
//   0xFFE1 → EXIF      (GPS coords live here)
//   0xFFED → IPTC
//   0xFFE9 → XMP
// Returns true  when no markers found (safe to upload).
// Returns false when a marker is detected (stripping may have failed).
//
// This is the most critical privacy gate in the upload path: if it fires,
// users' GPS coordinates may still be embedded in the photo.
// ---------------------------------------------------------------------------
describe("verifyExifStripped", () => {
  function bufferOf(...bytes: number[]): ArrayBuffer {
    return new Uint8Array(bytes).buffer;
  }

  it("returns true for an empty ArrayBuffer (nothing to scan)", () => {
    expect(verifyExifStripped(new ArrayBuffer(0))).toBe(true);
  });

  it("returns true for benign bytes with no metadata markers", () => {
    expect(verifyExifStripped(bufferOf(0xff, 0x00, 0xaa, 0xbb, 0x01, 0x02))).toBe(true);
  });

  it("returns false when EXIF marker 0xFFE1 is present at position 0", () => {
    expect(verifyExifStripped(bufferOf(0xff, 0xe1, 0x00, 0x01))).toBe(false);
  });

  it("returns false when EXIF marker 0xFFE1 is present mid-buffer", () => {
    // Marker is not at the start — the scan loop must reach it.
    expect(verifyExifStripped(bufferOf(0xaa, 0xbb, 0xff, 0xe1, 0x00))).toBe(false);
  });

  it("returns false when IPTC marker 0xFFED is present", () => {
    expect(verifyExifStripped(bufferOf(0xff, 0xed, 0x00))).toBe(false);
  });

  it("returns false when XMP marker 0xFFE9 is present", () => {
    expect(verifyExifStripped(bufferOf(0xff, 0xe9))).toBe(false);
  });

  it("returns true for a realistic JPEG SOI (0xFFD8) + no metadata markers", () => {
    // 0xFFD8 is the JPEG start-of-image marker — benign. Should NOT trigger false.
    expect(verifyExifStripped(bufferOf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Section 4 — stripExifNative (async, uses expo-media-library)
//
// Tests the native transcode path (iOS/Android).
// All paths are fail-safe: if anything goes wrong, the ORIGINAL buffer is
// returned rather than throwing. User's photo is never lost.
// ---------------------------------------------------------------------------
describe("stripExifNative", () => {
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

  it("returns the stripped buffer when MediaLibrary succeeds", async () => {
    // MediaLibrary returns a transcoded asset URI.
    mockSaveToLibraryAsync.mockResolvedValue({ uri: "file:///tmp/stripped.jpg" });
    // fetch reads back the stripped bytes.
    (global as unknown as { fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }> }).fetch =
      jest.fn().mockResolvedValue({ arrayBuffer: async () => STRIPPED });

    const result = await stripExifNative(ORIGINAL, "jpg");
    expect(result).toBe(STRIPPED);
  });

  it("returns the original buffer (fail-safe) when MediaLibrary returns null", async () => {
    mockSaveToLibraryAsync.mockResolvedValue(null);

    const result = await stripExifNative(ORIGINAL, "jpg");
    expect(result).toBe(ORIGINAL);
  });

  it("returns the original buffer (fail-safe) when MediaLibrary throws", async () => {
    mockSaveToLibraryAsync.mockRejectedValue(new Error("Native API unavailable"));

    const result = await stripExifNative(ORIGINAL, "jpg");
    expect(result).toBe(ORIGINAL);
  });

  it("returns the original buffer (fail-safe) when the transcoded fetch returns empty bytes", async () => {
    mockSaveToLibraryAsync.mockResolvedValue({ uri: "file:///tmp/empty.jpg" });
    (global as unknown as { fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }> }).fetch =
      jest.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(0) });

    const result = await stripExifNative(ORIGINAL, "jpg");
    expect(result).toBe(ORIGINAL);
  });
});

// ---------------------------------------------------------------------------
// Section 5 — stripExifWeb (Canvas re-encoding, browser-only)
//
// In the Jest/Node environment, `document` is undefined. The function must
// detect this and fall back to the original buffer (fail-safe). This
// ensures the web build degrades gracefully in server-side or test envs.
// ---------------------------------------------------------------------------
describe("stripExifWeb", () => {
  const ORIGINAL = new Uint8Array([0x20, 0x21, 0x22, 0x23]).buffer;

  it("returns the original buffer (fail-safe) when document is undefined (Node/Jest env)", async () => {
    // In Jest, `document` is undefined unless jsdom is configured.
    // The function guards with `typeof document === 'undefined'`.
    const savedDocument = (global as Record<string, unknown>)["document"];
    delete (global as Record<string, unknown>)["document"];
    try {
      const result = await stripExifWeb(ORIGINAL, "jpg");
      expect(result).toBe(ORIGINAL);
    } finally {
      if (savedDocument !== undefined) {
        (global as Record<string, unknown>)["document"] = savedDocument;
      }
    }
  });
});
