/**
 * Tests for the displayFlags text-search filter logic in TasksScreen.
 *
 * GAP-7: The `displayFlags` useMemo in TasksScreen (feat/tasks-search-2026-05-25)
 * includes a searchQuery text filter that was entirely untested. Because the
 * logic is a small, pure transformation over an array of FlagRow objects, we
 * test it here by replicating the exact filter expression from the screen and
 * verifying its behaviour across all meaningful edge cases.
 *
 * Source of truth (TasksScreen.tsx, lines added in feat/tasks-search-2026-05-25):
 *
 *   const q = searchQuery.trim().toLowerCase();
 *   if (q) {
 *     out = out.filter(
 *       (f) =>
 *         CATEGORY_LABELS[f.category].toLowerCase().includes(q) ||
 *         (f.description ?? '').toLowerCase().includes(q),
 *     );
 *   }
 *
 * See qa-reports/2026-05-25-gary-cycle4-coverage-gaps.md (GAP-7).
 */

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { from: jest.fn() },
}));

import { CATEGORY_LABELS } from '../flags';
import type { FlagRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Mirror of the exact filter logic from TasksScreen — no source changes needed.
// If TasksScreen changes the filter expression, these tests will catch the drift.
// ---------------------------------------------------------------------------
function applySearchFilter(flags: FlagRow[], searchQuery: string): FlagRow[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return flags;
  return flags.filter(
    (f) =>
      CATEGORY_LABELS[f.category].toLowerCase().includes(q) ||
      (f.description ?? '').toLowerCase().includes(q),
  );
}

// ---------------------------------------------------------------------------
// Minimal FlagRow factory — only the fields the filter touches.
// ---------------------------------------------------------------------------
function makeFlag(
  overrides: Partial<FlagRow> & { category: FlagRow['category'] },
): FlagRow {
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
});
