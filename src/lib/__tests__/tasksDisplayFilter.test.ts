/**
 * Tests for the displayFlags text-search filter logic in TasksScreen.
 *
 * GAP-7 (original): the searchQuery text filter in the `displayFlags`
 * useMemo was untested, so this file pinned a hand-copied mirror of the
 * inline filter expression.
 *
 * L6 (ReSweep 2026-06-09): TasksScreen now delegates that search to the
 * SHARED `searchFlags()` helper from `@/lib/flagSearch` — the same one
 * NearbyFlagsModal uses — so this file now exercises the REAL helper.
 * Behaviour change vs the old inline filter: the haystack also includes
 * the STATUS label, and multi-token queries use AND semantics (every
 * whitespace-separated token must match at least one field).
 *
 * Source of truth (TasksScreen.tsx, displayFlags useMemo after L6):
 *
 *   out = searchFlags(out, debouncedSearchText);
 *
 * See qa-reports/2026-05-25-gary-cycle4-coverage-gaps.md (GAP-7) and
 * qa-reports/2026-06-09_AccessMap_ReSweep_Triage.md (L6).
 */

import { STATUS_LABELS } from '../flags';
import { searchFlags } from '../flagSearch';
import type { FlagRow } from '@/types/database';

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { from: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Thin alias over the REAL shared helper, applied exactly as TasksScreen does.
// If TasksScreen stops delegating to searchFlags, these tests must move back
// to mirroring whatever replaces it.
// ---------------------------------------------------------------------------
function applySearchFilter(flags: FlagRow[], searchQuery: string): FlagRow[] {
  return searchFlags(flags, searchQuery);
}

// ---------------------------------------------------------------------------
// Minimal FlagRow factory — only the fields the filter touches.
// ---------------------------------------------------------------------------
function makeFlag(overrides: Partial<FlagRow> & { category: FlagRow['category'] }): FlagRow {
  return {
    id: 'flag-' + Math.random().toString(36).slice(2),
    user_id: 'user-1',
    lat: 49.25,
    lng: -123.1,
    severity: 3,
    description: overrides.description ?? null,
    photo_url: null,
    status: 'open',
    created_at: '2026-05-25T00:00:00Z',
    ...overrides,
  } as FlagRow;
}

const rampFlag = makeFlag({ category: 'no_ramp', description: 'Curb cut missing' });
const sidewalkFlag = makeFlag({ category: 'broken_sidewalk', description: 'Broken handrail' });
const nullDescFlag = makeFlag({ category: 'blocked_path', description: null });
const noDescFlag = makeFlag({ category: 'steep_grade', description: null });
const ALL_FLAGS = [rampFlag, sidewalkFlag, nullDescFlag, noDescFlag];

describe('displayFlags text-search filter (GAP-7)', () => {
  // ── Empty / blank query ───────────────────────────────────────────────────

  it('empty query returns all flags unmodified', () => {
    expect(applySearchFilter(ALL_FLAGS, '')).toEqual(ALL_FLAGS);
  });

  it('whitespace-only query returns all flags (trim short-circuits the filter)', () => {
    expect(applySearchFilter(ALL_FLAGS, '   ')).toEqual(ALL_FLAGS);
  });

  // ── Category label matching ───────────────────────────────────────────────

  it('matches on exact category label (case-insensitive, lowercase query)', () => {
    // CATEGORY_LABELS.no_ramp === 'No ramp'
    const result = applySearchFilter(ALL_FLAGS, 'no ramp');
    expect(result).toContain(rampFlag);
    expect(result).not.toContain(sidewalkFlag);
  });

  it('matches on category label with uppercase query (case-insensitive)', () => {
    const result = applySearchFilter(ALL_FLAGS, 'RAMP');
    expect(result).toContain(rampFlag);
    expect(result).not.toContain(sidewalkFlag);
  });

  it('matches on partial category label substring', () => {
    // 'ramp' is a substring of 'No ramp'
    const result = applySearchFilter(ALL_FLAGS, 'ramp');
    expect(result).toContain(rampFlag);
  });

  // ── Description matching ──────────────────────────────────────────────────

  it('matches on description substring (case-insensitive)', () => {
    const result = applySearchFilter(ALL_FLAGS, 'broken');
    expect(result).toContain(sidewalkFlag);
    expect(result).not.toContain(rampFlag);
  });

  it('matches description with mixed-case query', () => {
    const result = applySearchFilter(ALL_FLAGS, 'HANDRAIL');
    expect(result).toContain(sidewalkFlag);
  });

  // ── Null / undefined description — must NOT throw ─────────────────────────

  it('does not throw when f.description is null', () => {
    // noDescFlag has description: null
    expect(() => applySearchFilter([noDescFlag], 'ramp')).not.toThrow();
  });

  it('does not throw when f.description is null (second null-desc flag)', () => {
    // Both noDescFlag and nullDescFlag have null descriptions — test filter over nullDescFlag
    expect(() => applySearchFilter([nullDescFlag], 'path')).not.toThrow();
  });

  it('null-description flag is included when its category label matches', () => {
    // noDescFlag: category='steep_grade' → label 'Steep grade'
    const result = applySearchFilter([noDescFlag], 'steep');
    expect(result).toContain(noDescFlag);
  });

  it('null-description flag is excluded when query matches neither label nor description', () => {
    const result = applySearchFilter([noDescFlag], 'ramp');
    expect(result).not.toContain(noDescFlag);
  });

  // ── No matches ────────────────────────────────────────────────────────────

  it('returns empty array when query matches no flags', () => {
    const result = applySearchFilter(ALL_FLAGS, 'zzznomatch999');
    expect(result).toHaveLength(0);
  });

  // ── Multiple matches ──────────────────────────────────────────────────────

  it('returns all matching flags when multiple flags share a label substring', () => {
    // Both 'blocked_path' → 'Blocked path' and the query 'a' appear in many labels —
    // use a unique substring 'sidewalk' that only matches one category.
    const result = applySearchFilter(ALL_FLAGS, 'sidewalk');
    expect(result).toContain(sidewalkFlag);
    expect(result).not.toContain(rampFlag);
  });

  // ── AND semantics across tokens (L6 — shared searchFlags helper) ─────────

  it('multi-token query requires EVERY token to match (AND, not OR)', () => {
    // 'broken' matches sidewalkFlag (label + description) — 'handrail' only
    // matches sidewalkFlag's description. rampFlag matches neither token pair.
    const result = applySearchFilter(ALL_FLAGS, 'broken handrail');
    expect(result).toContain(sidewalkFlag);
    expect(result).toHaveLength(1);
  });

  it('tokens can match across DIFFERENT fields of the same flag', () => {
    // rampFlag: 'curb' hits the description ('Curb cut missing'), 'ramp'
    // hits the category label ('No ramp').
    const result = applySearchFilter(ALL_FLAGS, 'curb ramp');
    expect(result).toContain(rampFlag);
    expect(result).toHaveLength(1);
  });

  it('returns [] when tokens only match across DIFFERENT flags', () => {
    // 'curb' only matches rampFlag, 'handrail' only matches sidewalkFlag —
    // no single flag satisfies both, so AND semantics yield nothing.
    const result = applySearchFilter(ALL_FLAGS, 'curb handrail');
    expect(result).toHaveLength(0);
  });

  // ── Status-label matching (L6 — new field vs the old inline filter) ──────

  it('pins the STATUS_LABELS strings the search haystack is built from', () => {
    expect(STATUS_LABELS).toEqual({
      open: 'Open',
      verified: 'Verified',
      resolved: 'Resolved',
      rejected: 'Rejected',
    });
  });

  it('matches on the human-readable status label (case-insensitive)', () => {
    const verifiedFlag = makeFlag({ category: 'other', status: 'verified' });
    const openFlag = makeFlag({ category: 'other', status: 'open' });
    const result = applySearchFilter([verifiedFlag, openFlag], 'VERIFIED');
    expect(result).toContain(verifiedFlag);
    expect(result).not.toContain(openFlag);
  });

  it('status label participates in AND semantics with other tokens', () => {
    const verifiedRamp = makeFlag({
      category: 'no_ramp',
      status: 'verified',
      description: null,
    });
    const openRamp = makeFlag({ category: 'no_ramp', status: 'open', description: null });
    const result = applySearchFilter([verifiedRamp, openRamp], 'verified ramp');
    expect(result).toContain(verifiedRamp);
    expect(result).not.toContain(openRamp);
  });
});
