import {
  computeHeatGrid,
  heatColorForSeverity,
  heatOpacityForCount,
  DEFAULT_HEAT_GRID_DEG,
  HEATMAP_MIN_COUNT,
} from '../heatmap';
import type { FlagRow } from '@/types/database';

// Tiny factory — only the fields heat-grid binning cares about. Everything
// else gets a fixed dummy value so tests focus on lat/lng/severity.
function flag(
  lat: number,
  lng: number,
  severity: 1 | 2 | 3 | 4 | 5,
  id = `${lat}|${lng}|${severity}`,
): FlagRow {
  return {
    id,
    lat,
    lng,
    severity,
    category: 'no_ramp',
    status: 'open',
    description: null,
    photo_url: null,
    user_id: 'test-user',
    created_at: '2026-05-26T00:00:00Z',
    updated_at: null,
    edited_at: null,
  } as unknown as FlagRow;
}

describe('computeHeatGrid', () => {
  it('returns an empty array when given no flags', () => {
    expect(computeHeatGrid([])).toEqual([]);
  });

  it('drops cells below the k=3 floor (Jordan C1)', () => {
    // 2 flags in the same cell — should NOT emit (k=3 floor).
    const flags = [flag(37.7749, -122.4194, 3), flag(37.7750, -122.4195, 4)];
    expect(computeHeatGrid(flags)).toEqual([]);
  });

  it('emits a cell when exactly k=3 flags fall in it', () => {
    // All three lats in [37.770, 37.775) → cell 7554. All three lngs in
    // [-122.425, -122.420) → cell -24485. Single shared bucket.
    const flags = [
      flag(37.771, -122.421, 3),
      flag(37.772, -122.422, 4),
      flag(37.773, -122.423, 5),
    ];
    const cells = computeHeatGrid(flags);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
    expect(cells[0]!.avgSeverity).toBeCloseTo(4, 5); // (3+4+5)/3
  });

  it('separates flags into different cells by grid bucket', () => {
    // Two clusters far enough apart to bucket into different cells.
    const flags = [
      // Cluster A — three flags inside cell (7554, -24485)
      flag(37.771, -122.421, 5),
      flag(37.772, -122.422, 5),
      flag(37.773, -122.423, 5),
      // Cluster B — three flags near (40.71, -74.00) — well over a degree away
      flag(40.711, -74.001, 1),
      flag(40.712, -74.002, 1),
      flag(40.713, -74.003, 1),
    ];
    const cells = computeHeatGrid(flags);
    expect(cells).toHaveLength(2);
    const sevs = cells.map((c) => c.avgSeverity).sort();
    expect(sevs).toEqual([1, 5]);
  });

  it('respects a custom minCount when provided', () => {
    // 2 flags in one cell — would be dropped at the default k=3, kept at k=2.
    const flags = [flag(37.771, -122.421, 3), flag(37.772, -122.422, 5)];
    const cellsK2 = computeHeatGrid(flags, DEFAULT_HEAT_GRID_DEG, 2);
    expect(cellsK2).toHaveLength(1);
    expect(cellsK2[0]!.count).toBe(2);
    expect(cellsK2[0]!.avgSeverity).toBeCloseTo(4, 5);
  });

  it('falls back to the default grid size when given a non-positive size', () => {
    const flags = [
      flag(37.771, -122.421, 3),
      flag(37.772, -122.422, 3),
      flag(37.773, -122.423, 3),
    ];
    // 0 and negative both fall back — no divide-by-zero, no inverted binning.
    expect(computeHeatGrid(flags, 0)).toHaveLength(1);
    expect(computeHeatGrid(flags, -1)).toHaveLength(1);
  });

  it('skips flags with non-finite coordinates without throwing', () => {
    const flags = [
      flag(NaN, -122.421, 3),
      flag(37.771, Infinity, 4),
      // Three valid flags so the cell does get emitted.
      flag(37.771, -122.421, 3),
      flag(37.772, -122.422, 4),
      flag(37.773, -122.423, 5),
    ];
    const cells = computeHeatGrid(flags);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
  });

  it('returns the centroid of each cell, not an arbitrary flag position', () => {
    // Three flags clustered tightly INSIDE one grid bucket — centroid should
    // be the mean of their lats/lngs. Lats in [37.000, 37.005); lngs in
    // (-122.005, -122.000] both round (via Math.floor on negatives) into
    // a single bucket.
    const flags = [
      flag(37.001, -122.001, 3),
      flag(37.002, -122.002, 3),
      flag(37.003, -122.003, 3),
    ];
    const cells = computeHeatGrid(flags);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.lat).toBeCloseTo(37.002, 5);
    expect(cells[0]!.lng).toBeCloseTo(-122.002, 5);
  });
});

describe('heatColorForSeverity', () => {
  it('returns the anchor green for severity 1', () => {
    expect(heatColorForSeverity(1)).toBe('#27ae60');
  });

  it('returns the anchor red for severity 5', () => {
    expect(heatColorForSeverity(5)).toBe('#e74c3c');
  });

  it('clamps below 1 to the green anchor', () => {
    expect(heatColorForSeverity(0)).toBe('#27ae60');
    expect(heatColorForSeverity(-100)).toBe('#27ae60');
  });

  it('clamps above 5 to the red anchor', () => {
    expect(heatColorForSeverity(6)).toBe('#e74c3c');
    expect(heatColorForSeverity(1000)).toBe('#e74c3c');
  });

  it('interpolates a fractional severity between two anchors', () => {
    // 2.5 falls midway between lime (#7fb800) and yellow (#f1c40f).
    // Expected channel values: R≈(0x7f+0xf1)/2=0xb8, G≈(0xb8+0xc4)/2=0xbe, B≈(0x00+0x0f)/2=0x08
    const c = heatColorForSeverity(2.5);
    expect(c).toMatch(/^#[0-9a-f]{6}$/);
    // Sanity check — the interpolated color should be between the two anchors
    // on each channel.
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    expect(r).toBeGreaterThan(0x7f);
    expect(r).toBeLessThan(0xf1);
    expect(g).toBeGreaterThan(0xb8);
    expect(g).toBeLessThan(0xc4);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(0x0f);
  });
});

describe('heatOpacityForCount', () => {
  it('returns 0 for a zero count', () => {
    expect(heatOpacityForCount(0)).toBe(0);
  });

  it('returns the floor opacity at the k=3 minimum', () => {
    // 3 flags is the k-anonymity floor; opacity should be visible but low.
    const op = heatOpacityForCount(HEATMAP_MIN_COUNT);
    expect(op).toBeGreaterThanOrEqual(0.25);
    expect(op).toBeLessThanOrEqual(0.7);
  });

  it('saturates at the ceiling for very dense cells', () => {
    expect(heatOpacityForCount(1000)).toBeCloseTo(0.7, 5);
  });

  it('grows monotonically with count', () => {
    expect(heatOpacityForCount(5)).toBeLessThan(heatOpacityForCount(10));
    expect(heatOpacityForCount(10)).toBeLessThan(heatOpacityForCount(20));
  });
});
