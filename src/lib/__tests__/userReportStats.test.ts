/**
 * Tests for userReportStats.ts — per-user category + severity breakdown.
 *
 * Covers:
 *   - emptyCategoryCounts / emptySeverityCounts: every enum key is present
 *     and zeroed; independent objects (no shared mutable state).
 *   - EMPTY_USER_REPORT_STATS: total=0, every category and severity zeroed.
 *   - fetchUserReportStats (Supabase-mocked):
 *       happy path — counts roll up correctly across category + severity
 *       empty result (no rows) returns the zeroed shape
 *       orphan rows (category/severity outside the live enum) count toward
 *         `total` but not toward the breakdowns
 *       Supabase error is rethrown to the caller
 *       the query filters by user_id (Supabase RLS belt-and-suspenders)
 */

// ---------------------------------------------------------------------------
// Supabase mock — hoisted by Jest. Same shape as flags.test.ts.
// Only the chain that fetchUserReportStats uses is wired:
//   supabase.from('flags').select('category, severity').eq('user_id', id)
// The terminal call (.eq) must resolve to a PostgrestResponse-like object.
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  CATEGORY_ORDER,
  SEVERITY_ORDER,
} from '../flags';
import {
  EMPTY_USER_REPORT_STATS,
  emptyCategoryCounts,
  emptySeverityCounts,
  fetchUserReportStats,
} from '../userReportStats';
import type { FlagCategory, FlagSeverity } from '@/types/database';

// ---------------------------------------------------------------------------
// Helper — wire the from→select→eq chain to a resolved value.
// ---------------------------------------------------------------------------

interface MockRow {
  category: FlagCategory;
  severity: FlagSeverity;
}

function wireMockResponse(
  data: MockRow[] | Array<{ category: string; severity: number }> | null,
  error: { message: string } | null = null,
) {
  mockFrom.mockReturnValue({
    select: (...args: unknown[]) => mockSelect(...args),
  });
  mockSelect.mockReturnValue({
    eq: (...args: unknown[]) => mockEq(...args),
  });
  mockEq.mockResolvedValue({ data, error });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// emptyCategoryCounts / emptySeverityCounts — shape + independence
// ---------------------------------------------------------------------------

describe('emptyCategoryCounts', () => {
  it('returns a key for every category in CATEGORY_ORDER, all zero', () => {
    const counts = emptyCategoryCounts();
    for (const c of CATEGORY_ORDER) {
      expect(counts[c]).toBe(0);
    }
    // No extra keys beyond CATEGORY_ORDER
    expect(Object.keys(counts).sort()).toEqual([...CATEGORY_ORDER].sort());
  });

  it('returns independent objects per call (no shared mutable state)', () => {
    const a = emptyCategoryCounts();
    const b = emptyCategoryCounts();
    expect(a).not.toBe(b);
    a[CATEGORY_ORDER[0]!] = 99;
    expect(b[CATEGORY_ORDER[0]!]).toBe(0);
  });
});

describe('emptySeverityCounts', () => {
  it('returns a key for every severity in SEVERITY_ORDER, all zero', () => {
    const counts = emptySeverityCounts();
    for (const s of SEVERITY_ORDER) {
      expect(counts[s]).toBe(0);
    }
    expect(Object.keys(counts).map(Number).sort((a, b) => a - b)).toEqual(
      [...SEVERITY_ORDER].sort((a, b) => a - b),
    );
  });

  it('returns independent objects per call', () => {
    const a = emptySeverityCounts();
    const b = emptySeverityCounts();
    a[SEVERITY_ORDER[0]!] = 42;
    expect(b[SEVERITY_ORDER[0]!]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// EMPTY_USER_REPORT_STATS — frozen-ish shape
// ---------------------------------------------------------------------------

describe('EMPTY_USER_REPORT_STATS', () => {
  it('reports total of 0', () => {
    expect(EMPTY_USER_REPORT_STATS.total).toBe(0);
  });

  it('has zeroed category counts for every enum value', () => {
    for (const c of CATEGORY_ORDER) {
      expect(EMPTY_USER_REPORT_STATS.byCategory[c]).toBe(0);
    }
  });

  it('has zeroed severity counts for every enum value', () => {
    for (const s of SEVERITY_ORDER) {
      expect(EMPTY_USER_REPORT_STATS.bySeverity[s]).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// fetchUserReportStats — happy path
// ---------------------------------------------------------------------------

describe('fetchUserReportStats — counts roll up correctly', () => {
  it('aggregates a single row into category + severity buckets', async () => {
    const c0 = CATEGORY_ORDER[0]!;
    const s0 = SEVERITY_ORDER[0]!;
    wireMockResponse([{ category: c0, severity: s0 }]);

    const stats = await fetchUserReportStats('user-1');
    expect(stats.total).toBe(1);
    expect(stats.byCategory[c0]).toBe(1);
    expect(stats.bySeverity[s0]).toBe(1);

    // All other buckets remain zero.
    for (const c of CATEGORY_ORDER) {
      if (c === c0) continue;
      expect(stats.byCategory[c]).toBe(0);
    }
    for (const s of SEVERITY_ORDER) {
      if (s === s0) continue;
      expect(stats.bySeverity[s]).toBe(0);
    }
  });

  it('aggregates multiple rows, grouping by category + severity', async () => {
    const c0 = CATEGORY_ORDER[0]!;
    const c1 = CATEGORY_ORDER[1]!;
    const s0 = SEVERITY_ORDER[0]!;
    const s1 = SEVERITY_ORDER[1]!;
    wireMockResponse([
      { category: c0, severity: s0 },
      { category: c0, severity: s1 },
      { category: c1, severity: s0 },
      { category: c1, severity: s0 },
      { category: c1, severity: s1 },
    ]);

    const stats = await fetchUserReportStats('user-1');
    expect(stats.total).toBe(5);
    expect(stats.byCategory[c0]).toBe(2);
    expect(stats.byCategory[c1]).toBe(3);
    expect(stats.bySeverity[s0]).toBe(3);
    expect(stats.bySeverity[s1]).toBe(2);
  });

  it('returns the zeroed shape when the user has no flags', async () => {
    wireMockResponse([]);
    const stats = await fetchUserReportStats('user-zero');
    expect(stats.total).toBe(0);
    for (const c of CATEGORY_ORDER) expect(stats.byCategory[c]).toBe(0);
    for (const s of SEVERITY_ORDER) expect(stats.bySeverity[s]).toBe(0);
  });

  it('returns zeroed shape when Supabase returns null data', async () => {
    wireMockResponse(null);
    const stats = await fetchUserReportStats('user-null');
    expect(stats.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fetchUserReportStats — defensive against drifted enums
// ---------------------------------------------------------------------------

describe('fetchUserReportStats — orphan rows', () => {
  it('counts orphan rows into total but not into category/severity breakdowns', async () => {
    const c0 = CATEGORY_ORDER[0]!;
    const s0 = SEVERITY_ORDER[0]!;
    wireMockResponse([
      { category: c0, severity: s0 },
      // Drifted values that aren't in the live enums.
      { category: 'no_longer_a_category', severity: 99 },
      { category: c0, severity: s0 },
    ]);

    const stats = await fetchUserReportStats('user-orphan');
    // total counts every row, even the orphan.
    expect(stats.total).toBe(3);
    // Only the in-enum rows landed in the buckets.
    expect(stats.byCategory[c0]).toBe(2);
    expect(stats.bySeverity[s0]).toBe(2);

    // The drifted category did not create a new bucket.
    expect((stats.byCategory as Record<string, number>)['no_longer_a_category'])
      .toBeUndefined();
    expect((stats.bySeverity as Record<number, number>)[99])
      .toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// fetchUserReportStats — error path + query shape
// ---------------------------------------------------------------------------

describe('fetchUserReportStats — error + query', () => {
  it('throws when Supabase returns an error', async () => {
    wireMockResponse(null, { message: 'permission denied' });
    await expect(fetchUserReportStats('user-err')).rejects.toMatchObject({
      message: 'permission denied',
    });
  });

  it('queries the flags table, selects only category + severity', async () => {
    wireMockResponse([]);
    await fetchUserReportStats('user-shape');
    expect(mockFrom).toHaveBeenCalledWith('flags');
    expect(mockSelect).toHaveBeenCalledWith('category, severity');
  });

  it('filters by user_id (server-side scoping, belt-and-suspenders with RLS)', async () => {
    wireMockResponse([]);
    await fetchUserReportStats('user-scope-xyz');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-scope-xyz');
  });
});
