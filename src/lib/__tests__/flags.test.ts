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
} from "../flags";
import type {
  FlagCategory,
  FlagSeverity,
  FlagStatus,
} from "@/types/database";

const ALL_CATEGORIES: FlagCategory[] = [
  "no_ramp",
  "broken_sidewalk",
  "blocked_path",
  "missing_signal",
  "steep_grade",
  "other",
];

const ALL_SEVERITIES: FlagSeverity[] = [1, 2, 3, 4, 5];

const ALL_STATUSES: FlagStatus[] = ["open", "verified", "resolved", "rejected"];

describe("CATEGORY_LABELS / CATEGORY_DESCRIPTIONS / CATEGORY_ICONS", () => {
  it.each(ALL_CATEGORIES)("has a label for %s", (cat) => {
    expect(typeof CATEGORY_LABELS[cat]).toBe("string");
    expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
  });

  it.each(ALL_CATEGORIES)("has a description for %s", (cat) => {
    expect(typeof CATEGORY_DESCRIPTIONS[cat]).toBe("string");
    expect(CATEGORY_DESCRIPTIONS[cat].length).toBeGreaterThan(0);
  });

  it.each(ALL_CATEGORIES)("has an icon for %s", (cat) => {
    expect(typeof CATEGORY_ICONS[cat]).toBe("string");
    expect(CATEGORY_ICONS[cat].length).toBeGreaterThan(0);
  });

  it("labels are unique (so the filter chips never collide)", () => {
    const labels = ALL_CATEGORIES.map((c) => CATEGORY_LABELS[c]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("CATEGORY_ORDER", () => {
  it("contains every category exactly once", () => {
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length);
    expect(CATEGORY_ORDER).toHaveLength(ALL_CATEGORIES.length);
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_ORDER).toContain(cat);
    }
  });
});

describe("SEVERITY_LABELS / SEVERITY_COLOR_NAMES / SEVERITY_DESCRIPTIONS", () => {
  it.each(ALL_SEVERITIES)("has a label for severity %i", (sev) => {
    expect(typeof SEVERITY_LABELS[sev]).toBe("string");
    expect(SEVERITY_LABELS[sev].length).toBeGreaterThan(0);
  });

  it.each(ALL_SEVERITIES)("has a color name for severity %i", (sev) => {
    expect(typeof SEVERITY_COLOR_NAMES[sev]).toBe("string");
    expect(SEVERITY_COLOR_NAMES[sev].length).toBeGreaterThan(0);
  });

  it.each(ALL_SEVERITIES)("has a description for severity %i", (sev) => {
    expect(typeof SEVERITY_DESCRIPTIONS[sev]).toBe("string");
    expect(SEVERITY_DESCRIPTIONS[sev].length).toBeGreaterThan(0);
  });

  it("color names do not rely on color alone (a screen-reader-readable label exists per severity)", () => {
    // The point of SEVERITY_COLOR_NAMES is to read 'red' aloud rather than
    // signal severity via fill color only. Make sure no two severities share
    // a color name (a duplicate would defeat the readability goal).
    const names = ALL_SEVERITIES.map((s) => SEVERITY_COLOR_NAMES[s]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("SEVERITY_ORDER", () => {
  it("is the canonical 1..5 ascending sequence", () => {
    expect(SEVERITY_ORDER).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("STATUS_LABELS / STATUS_ORDER", () => {
  it.each(ALL_STATUSES)("has a label for %s", (status) => {
    expect(typeof STATUS_LABELS[status]).toBe("string");
    expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
  });

  it("STATUS_ORDER contains every status exactly once", () => {
    expect(new Set(STATUS_ORDER).size).toBe(STATUS_ORDER.length);
    expect(STATUS_ORDER).toHaveLength(ALL_STATUSES.length);
  });

  it("STATUS_ORDER follows the chronological lifecycle", () => {
    expect(STATUS_ORDER).toEqual(["open", "verified", "resolved", "rejected"]);
  });
});

describe("DEFAULT_STATUSES", () => {
  it("matches the Map filter's default-on chips (open + verified)", () => {
    // If this changes, MapScreen.tsx and TasksScreen.tsx default filters
    // must move together — they share this constant by design.
    expect(DEFAULT_STATUSES).toEqual(["open", "verified"]);
  });

  it("is a subset of STATUS_ORDER", () => {
    for (const s of DEFAULT_STATUSES) {
      expect(STATUS_ORDER).toContain(s);
    }
  });
});

describe("FLAG_PHOTOS_BUCKET", () => {
  it("matches the bucket name referenced by Supabase Storage RLS in schema.sql", () => {
    // If this constant ever drifts from supabase/schema.sql, uploads will
    // silently 404 against the wrong bucket. Pin it here so the lib +
    // schema can't disagree without a failing test.
    expect(FLAG_PHOTOS_BUCKET).toBe("flag-photos");
  });
});

// ---------------------------------------------------------------------------
// updateFlagContent — Supabase-backed async helper
// Chain under test: supabase.from('flags').update(patch).eq('id', flagId).select().single()
// ---------------------------------------------------------------------------

describe("updateFlagContent", () => {
  const SAMPLE_ROW = {
    id: "flag-abc",
    user_id: "user-1",
    lat: 49.25,
    lng: -123.1,
    category: "no_ramp" as const,
    severity: 3 as const,
    description: "updated description",
    photo_url: null,
    status: "open" as const,
    created_at: "2026-05-25T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Wire the builder chain so each method returns the next link.
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelectAfterUpdate });
    mockSelectAfterUpdate.mockReturnValue({ single: mockSingle });
  });

  it("resolves with the FlagRow returned by Supabase on success", async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    const result = await updateFlagContent("flag-abc", { description: "updated description" });

    expect(result).toEqual(SAMPLE_ROW);
  });

  it("throws when Supabase returns an error", async () => {
    const dbError = { message: "permission denied", code: "42501" };
    mockSingle.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(
      updateFlagContent("flag-abc", { severity: 5 })
    ).rejects.toEqual(dbError);
  });

  it("passes only the patch fields to .update() — never readonly fields", async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    const patch = { description: "new text", category: "broken_sidewalk" as const, severity: 2 as const };
    await updateFlagContent("flag-abc", patch);

    // .update() must receive exactly the patch — no status, user_id, lat, lng, etc.
    expect(mockUpdate).toHaveBeenCalledWith(patch);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("targets the correct row by id via .eq('id', flagId)", async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    await updateFlagContent("flag-abc", { description: "x" });

    expect(mockEq).toHaveBeenCalledWith("id", "flag-abc");
  });

  it("queries the 'flags' table (not a wrong table name)", async () => {
    mockSingle.mockResolvedValueOnce({ data: SAMPLE_ROW, error: null });

    await updateFlagContent("flag-abc", { severity: 1 });

    expect(mockFrom).toHaveBeenCalledWith("flags");
  });
});
