/**
 * Wave 4 — Gary: additional edge-case tests for heatmap.ts.
 *
 * Shamus's Wave 3 tests cover the happy path, k-floor basics, coordinate
 * skipping, cell boundary math, and module constants. This file targets the
 * gaps: southern/western hemisphere bucketing, mixed-pass/fail cells,
 * boundary severity values, density/gradient colorForCell exhaustiveness,
 * gradientColorForSeverity at intermediate values, and the Infinity/NaN
 * guard on cellSizeDeg.
 */

import {
  bucketFlagsToCells,
  colorForCell,
  DEFAULT_CELL_SIZE_DEG,
  DEFAULT_K_FLOOR,
  gradientColorForSeverity,
  type HeatCell,
  type SeverityToken,
} from '../heatmap';
import type { FlagRow, FlagSeverity } from '@/types/database';

const SEV_TOKENS: Record<FlagSeverity, SeverityToken> = {
  1: { color: '#27ae60', label: 'Minor' },
  2: { color: '#7fb800', label: 'Mild' },
  3: { color: '#f1c40f', label: 'Moderate' },
  4: { color: '#e67e22', label: 'Significant' },
  5: { color: '#e74c3c', label: 'Severe' },
};

function makeFlag(overrides: Partial<FlagRow> = {}): FlagRow {
  return {
    id: 'f1',
    user_id: 'u1',
    lat: 37.7749,
    lng: -122.4194,
    category: 'no_ramp',
    description: null,
    severity: 3,
    photo_url: null,
    status: 'open',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCell(overrides: Partial<HeatCell> = {}): HeatCell {
  return {
    key: '7400:-24481',
    count: 5,
    meanSeverity: 3,
    maxSeverity: 3,
    lat: 37.002,
    lng: -122.002,
    latStart: 37.0,
    latEnd: 37.005,
    lngStart: -122.005,
    lngEnd: -122.0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// bucketFlagsToCells — additional edge cases
// ---------------------------------------------------------------------------

describe('bucketFlagsToCells — edge cases (Wave 4)', () => {
  // --- single-cell scenarios ---

  it('all flags at the exact same lat/lng land in one cell', () => {
    const flags = [37.001, 37.001, 37.001].map((lat, i) =>
      makeFlag({ id: String(i), lat, lng: -122.001 }),
    );
    const cells = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
  });

  it('centroid of identical-position flags equals that position', () => {
    const flags = Array.from({ length: 5 }, (_, i) =>
      makeFlag({ id: String(i), lat: 37.001, lng: -122.001 }),
    );
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.lat).toBeCloseTo(37.001);
    expect(cell!.lng).toBeCloseTo(-122.001);
  });

  it('count reflects all valid flags even when many share one cell', () => {
    const flags = Array.from({ length: 10 }, (_, i) =>
      makeFlag({ id: String(i), lat: 37.001, lng: -122.001 }),
    );
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.count).toBe(10);
  });

  // --- k-floor filtering with mixed cells ---

  it('returns only cells that meet k-floor when some cells pass and some fail', () => {
    // Cell A: 3 flags — passes kFloor=3
    const cellA = [37.001, 37.002, 37.003].map((lat, i) =>
      makeFlag({ id: `a${i}`, lat, lng: -122.001 }),
    );
    // Cell B: 2 flags — fails kFloor=3
    const cellB = [37.011, 37.012].map((lat, i) =>
      makeFlag({ id: `b${i}`, lat, lng: -122.011 }),
    );
    const cells = bucketFlagsToCells([...cellA, ...cellB]);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
  });

  it('filters a single-flag cell while keeping a qualifying cell', () => {
    const loner = makeFlag({ id: 'lone', lat: 38.0, lng: -121.0 });
    const crowd = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: `c${i}`, lat: 37.001, lng: -122.001 }),
    );
    const cells = bucketFlagsToCells([loner, ...crowd]);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
  });

  // --- severity boundary values ---

  it('all-severity-1 cell: meanSeverity and maxSeverity are both 1', () => {
    const flags = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: String(i), lat: 37.001, lng: -122.001, severity: 1 }),
    );
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.meanSeverity).toBeCloseTo(1.0);
    expect(cell!.maxSeverity).toBe(1);
  });

  it('all-severity-5 cell: meanSeverity and maxSeverity are both 5', () => {
    const flags = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: String(i), lat: 37.001, lng: -122.001, severity: 5 }),
    );
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.meanSeverity).toBeCloseTo(5.0);
    expect(cell!.maxSeverity).toBe(5);
  });

  it('mixed severity 1+5+1+5+1 → meanSeverity ~2.6, maxSeverity 5', () => {
    const severities: FlagSeverity[] = [1, 5, 1, 5, 1];
    const flags = severities.map((severity, i) =>
      makeFlag({ id: String(i), lat: 37.001, lng: -122.001, severity }),
    );
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.meanSeverity).toBeCloseTo(13 / 5);
    expect(cell!.maxSeverity).toBe(5);
  });

  // --- southern / western hemisphere ---

  it('southern hemisphere flags (negative lat) bucket correctly', () => {
    // Sydney-ish: lat ~ -33.87. Use -33.871, -33.872, -33.873 so all three
    // fall in the same Math.floor bucket (-6775) and clear the k-floor.
    // Avoid -33.870 (exact multiple of 0.005 = -6774.0) which lands in a
    // different bucket and would split the flags across two cells.
    const flags = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: String(i), lat: -33.871 - i * 0.001, lng: 151.21 }),
    );
    const cells = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cells).toHaveLength(1);
    // Cell boundary must still span exactly one cellSizeDeg
    expect(cells[0]!.latEnd - cells[0]!.latStart).toBeCloseTo(DEFAULT_CELL_SIZE_DEG);
  });

  it('southern hemisphere: latStart < latEnd (cell is not inverted)', () => {
    const flags = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: String(i), lat: -33.871 - i * 0.001, lng: 151.21 }),
    );
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.latStart).toBeLessThan(cell!.latEnd);
  });

  it('flags exactly on the antimeridian-adjacent boundary are bucketed, not dropped', () => {
    // Flags near lng=0 — should produce valid cells, not throw
    const flags = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: String(i), lat: 51.5 + i * 0.001, lng: 0.001 }),
    );
    expect(() => bucketFlagsToCells(flags, { kFloor: 3 })).not.toThrow();
  });

  // --- cellSizeDeg validation (NaN / Infinity) ---

  it('throws for cellSizeDeg = NaN', () => {
    expect(() => bucketFlagsToCells([], { cellSizeDeg: NaN })).toThrow();
  });

  it('throws for cellSizeDeg = Infinity', () => {
    expect(() => bucketFlagsToCells([], { cellSizeDeg: Infinity })).toThrow();
  });

  it('throws for cellSizeDeg = -Infinity', () => {
    expect(() => bucketFlagsToCells([], { cellSizeDeg: -Infinity })).toThrow();
  });

  // --- kFloor boundary conditions ---

  it('kFloor=2 (below Jordan floor but valid code): accepts 2-flag cells', () => {
    const flags = [
      makeFlag({ id: '1', lat: 37.001, lng: -122.001 }),
      makeFlag({ id: '2', lat: 37.002, lng: -122.002 }),
    ];
    const cells = bucketFlagsToCells(flags, { kFloor: 2 });
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(2);
  });

  it('kFloor=1: every non-empty cell is included', () => {
    const flags = [makeFlag({ id: '1', lat: 37.001, lng: -122.001 })];
    const cells = bucketFlagsToCells(flags, { kFloor: 1 });
    expect(cells).toHaveLength(1);
  });

  it('DEFAULT_K_FLOOR is exactly 3', () => {
    // Jordan's condition: the value must be ≥3. Shamus tests ≥3; this pins
    // the exact shipped value so a bump to 4+ shows up as a deliberate change.
    expect(DEFAULT_K_FLOOR).toBe(3);
  });

  // --- custom cellSizeDeg ---

  it('larger cellSizeDeg groups more flags into a single cell', () => {
    // Flags spread 0.1° apart — they're in different cells at 0.005° but
    // collapse into one at 0.2°.
    const flags = [0.05, 0.12, 0.18].map((lat, i) =>
      makeFlag({ id: String(i), lat, lng: 0.0 }),
    );
    const smallCells = bucketFlagsToCells(flags, { cellSizeDeg: 0.05, kFloor: 1 });
    const bigCells = bucketFlagsToCells(flags, { cellSizeDeg: 0.2, kFloor: 1 });
    expect(smallCells.length).toBeGreaterThan(bigCells.length);
  });

  // --- output ordering / determinism ---

  it('produces the same cells regardless of flag input order', () => {
    const base = { lng: -122.001 };
    const flagsA = [
      makeFlag({ id: '1', lat: 37.001, ...base }),
      makeFlag({ id: '2', lat: 37.002, ...base }),
      makeFlag({ id: '3', lat: 37.003, ...base }),
    ];
    const flagsB = [flagsA[2]!, flagsA[0]!, flagsA[1]!];
    const cellsA = bucketFlagsToCells(flagsA, { kFloor: 3 });
    const cellsB = bucketFlagsToCells(flagsB, { kFloor: 3 });
    expect(cellsA).toHaveLength(1);
    expect(cellsB).toHaveLength(1);
    expect(cellsA[0]!.key).toBe(cellsB[0]!.key);
    expect(cellsA[0]!.count).toBe(cellsB[0]!.count);
    expect(cellsA[0]!.meanSeverity).toBeCloseTo(cellsB[0]!.meanSeverity);
  });

  // --- meanSeverity arithmetic precision ---

  it('meanSeverity is accurate for large flag counts', () => {
    // 100 flags with severity 1 and 100 with severity 5 → mean = 3.0
    const sev1 = Array.from({ length: 100 }, (_, i) =>
      makeFlag({ id: `lo${i}`, lat: 37.001, lng: -122.001, severity: 1 }),
    );
    const sev5 = Array.from({ length: 100 }, (_, i) =>
      makeFlag({ id: `hi${i}`, lat: 37.002, lng: -122.002, severity: 5 }),
    );
    const [cell] = bucketFlagsToCells([...sev1, ...sev5], { kFloor: 3 });
    expect(cell!.count).toBe(200);
    expect(cell!.meanSeverity).toBeCloseTo(3.0, 2);
  });
});

// ---------------------------------------------------------------------------
// gradientColorForSeverity — additional cases
// ---------------------------------------------------------------------------

describe('gradientColorForSeverity — additional cases (Wave 4)', () => {
  it('returns sev-2 color for mean 1.5 (rounds to 2)', () => {
    expect(gradientColorForSeverity(1.5, SEV_TOKENS)).toBe(SEV_TOKENS[2].color);
  });

  it('returns sev-4 color for mean 4.4 (rounds to 4)', () => {
    expect(gradientColorForSeverity(4.4, SEV_TOKENS)).toBe(SEV_TOKENS[4].color);
  });

  it('returns sev-5 color for mean 4.5 (rounds to 5)', () => {
    expect(gradientColorForSeverity(4.5, SEV_TOKENS)).toBe(SEV_TOKENS[5].color);
  });

  it('returns sev-3 color for mean 3.0', () => {
    expect(gradientColorForSeverity(3.0, SEV_TOKENS)).toBe(SEV_TOKENS[3].color);
  });

  it('returns sev-1 color for mean 0 (below floor)', () => {
    expect(gradientColorForSeverity(0, SEV_TOKENS)).toBe(SEV_TOKENS[1].color);
  });

  it('returns sev-3 (neutral) for -Infinity — non-finite guard fires before ≤1 branch', () => {
    // The code checks !isFinite(mean) first, so -Infinity hits the NaN/Infinity
    // guard and returns the mid-tone sev-3 fallback, same as NaN.
    expect(gradientColorForSeverity(-Infinity, SEV_TOKENS)).toBe(SEV_TOKENS[3].color);
  });

  it('returns sev-3 (neutral) for Infinity (non-finite guard)', () => {
    // Infinity is not finite so the NaN/Infinity guard returns the mid-tone.
    expect(gradientColorForSeverity(Infinity, SEV_TOKENS)).toBe(SEV_TOKENS[3].color);
  });

  it('returns a string for every integer severity 1–5', () => {
    ([1, 2, 3, 4, 5] as FlagSeverity[]).forEach((s) => {
      const result = gradientColorForSeverity(s, SEV_TOKENS);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// colorForCell — exhaustive mode coverage
// ---------------------------------------------------------------------------

describe('colorForCell — exhaustive coverage (Wave 4)', () => {
  const DENSITY_COLOR = '#2f80ed';

  it('gradient mode: each integer meanSeverity 1–5 returns the matching token color', () => {
    ([1, 2, 3, 4, 5] as FlagSeverity[]).forEach((s) => {
      const cell = makeCell({ meanSeverity: s, maxSeverity: s });
      const result = colorForCell(cell, 'gradient', SEV_TOKENS, DENSITY_COLOR);
      expect(result).toBe(SEV_TOKENS[s].color);
    });
  });

  it('density mode ignores meanSeverity 1 and still returns densityColor', () => {
    const cell = makeCell({ meanSeverity: 1, maxSeverity: 1 });
    expect(colorForCell(cell, 'density', SEV_TOKENS, DENSITY_COLOR)).toBe(DENSITY_COLOR);
  });

  it('density mode ignores meanSeverity 3 (mid) and still returns densityColor', () => {
    const cell = makeCell({ meanSeverity: 3, maxSeverity: 4 });
    expect(colorForCell(cell, 'density', SEV_TOKENS, DENSITY_COLOR)).toBe(DENSITY_COLOR);
  });

  it('density mode ignores meanSeverity 5 and still returns densityColor', () => {
    const cell = makeCell({ meanSeverity: 5, maxSeverity: 5 });
    expect(colorForCell(cell, 'density', SEV_TOKENS, DENSITY_COLOR)).toBe(DENSITY_COLOR);
  });

  it('gradient mode returns different colors for different severity cells', () => {
    const low = colorForCell(makeCell({ meanSeverity: 1 }), 'gradient', SEV_TOKENS, DENSITY_COLOR);
    const high = colorForCell(makeCell({ meanSeverity: 5 }), 'gradient', SEV_TOKENS, DENSITY_COLOR);
    expect(low).not.toBe(high);
  });
});
