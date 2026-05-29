import {
  bucketFlagsToCells,
  colorForCell,
  DEFAULT_CELL_SIZE_DEG,
  DEFAULT_K_FLOOR,
  DEFAULT_HEATMAP_MODE,
  gradientColorForSeverity,
  HEATMAP_FILL_OPACITY,
  type HeatCell,
  type SeverityToken,
} from '../heatmap';
import type { FlagRow, FlagSeverity } from '@/types/database';

// Minimal severity token map matching the theme palette.
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

// ---------------------------------------------------------------------------
// bucketFlagsToCells
// ---------------------------------------------------------------------------

describe('bucketFlagsToCells', () => {
  it('returns empty array for empty input', () => {
    expect(bucketFlagsToCells([])).toEqual([]);
  });

  it('drops cells below the k-floor (default 3)', () => {
    const flags = [
      makeFlag({ id: '1', lat: 37.001, lng: -122.001 }),
      makeFlag({ id: '2', lat: 37.002, lng: -122.002 }),
    ];
    const cells = bucketFlagsToCells(flags);
    expect(cells).toHaveLength(0);
  });

  it('includes cells that meet the k-floor exactly', () => {
    const base = { lat: 37.001, lng: -122.001 };
    const flags = [
      makeFlag({ id: '1', ...base }),
      makeFlag({ id: '2', ...base }),
      makeFlag({ id: '3', ...base }),
    ];
    const cells = bucketFlagsToCells(flags);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
  });

  it('respects custom kFloor', () => {
    const flags = [
      makeFlag({ id: '1', lat: 37.001, lng: -122.001 }),
      makeFlag({ id: '2', lat: 37.002, lng: -122.002 }),
    ];
    const cellsDefault = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cellsDefault).toHaveLength(0);

    const cellsLow = bucketFlagsToCells(flags, { kFloor: 1 });
    expect(cellsLow.length).toBeGreaterThanOrEqual(1);
  });

  it('places flags in the same cell when they share the same grid bucket', () => {
    // All three fall within the same 0.005° bucket at 37.000–37.005 / -122.005–-122.000
    const flags = [
      makeFlag({ id: '1', lat: 37.001, lng: -122.001 }),
      makeFlag({ id: '2', lat: 37.002, lng: -122.002 }),
      makeFlag({ id: '3', lat: 37.003, lng: -122.003 }),
    ];
    const cells = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
  });

  it('separates flags that cross a grid boundary', () => {
    // Flags at 37.004 and 37.006 cross the 0.005° boundary at 37.005
    const base = { lng: -122.001 };
    const grp1 = [37.001, 37.002, 37.003].map((lat, i) => makeFlag({ id: `a${i}`, lat, ...base }));
    const grp2 = [37.006, 37.007, 37.008].map((lat, i) => makeFlag({ id: `b${i}`, lat, ...base }));
    const cells = bucketFlagsToCells([...grp1, ...grp2], { kFloor: 3 });
    expect(cells).toHaveLength(2);
  });

  it('computes correct meanSeverity', () => {
    const base = { lat: 37.001, lng: -122.001 };
    const flags = [
      makeFlag({ id: '1', ...base, severity: 1 }),
      makeFlag({ id: '2', ...base, severity: 3 }),
      makeFlag({ id: '3', ...base, severity: 5 }),
    ];
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.meanSeverity).toBeCloseTo(3.0);
  });

  it('records maxSeverity', () => {
    const base = { lat: 37.001, lng: -122.001 };
    const flags = [
      makeFlag({ id: '1', ...base, severity: 1 }),
      makeFlag({ id: '2', ...base, severity: 4 }),
      makeFlag({ id: '3', ...base, severity: 2 }),
    ];
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.maxSeverity).toBe(4);
  });

  it('centroid is the mean of flag coordinates', () => {
    const flags = [
      makeFlag({ id: '1', lat: 37.001, lng: -122.001 }),
      makeFlag({ id: '2', lat: 37.002, lng: -122.002 }),
      makeFlag({ id: '3', lat: 37.003, lng: -122.003 }),
    ];
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.lat).toBeCloseTo(37.002);
    expect(cell!.lng).toBeCloseTo(-122.002);
  });

  it('cell boundary spans exactly one cell in each direction', () => {
    const flags = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: String(i), lat: 37.001, lng: -122.001 }),
    );
    const [cell] = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cell!.latEnd - cell!.latStart).toBeCloseTo(DEFAULT_CELL_SIZE_DEG);
    expect(cell!.lngEnd - cell!.lngStart).toBeCloseTo(DEFAULT_CELL_SIZE_DEG);
  });

  it('cell key is stable across multiple calls with the same data', () => {
    const flags = Array.from({ length: 3 }, (_, i) =>
      makeFlag({ id: String(i), lat: 37.001, lng: -122.001 }),
    );
    const cells1 = bucketFlagsToCells(flags, { kFloor: 3 });
    const cells2 = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cells1[0]!.key).toBe(cells2[0]!.key);
  });

  it('skips flags with non-finite coordinates', () => {
    const flags = [
      makeFlag({ id: '1', lat: NaN, lng: -122.001 }),
      makeFlag({ id: '2', lat: 37.001, lng: Infinity }),
      makeFlag({ id: '3', lat: 37.001, lng: -122.001 }),
      makeFlag({ id: '4', lat: 37.002, lng: -122.002 }),
      makeFlag({ id: '5', lat: 37.003, lng: -122.003 }),
    ];
    // flags 3-5 are valid and fall in the same cell
    const cells = bucketFlagsToCells(flags, { kFloor: 3 });
    expect(cells).toHaveLength(1);
    expect(cells[0]!.count).toBe(3);
  });

  it('throws on non-positive cellSizeDeg', () => {
    expect(() => bucketFlagsToCells([], { cellSizeDeg: 0 })).toThrow();
    expect(() => bucketFlagsToCells([], { cellSizeDeg: -1 })).toThrow();
  });

  it('throws on non-integer kFloor < 1', () => {
    expect(() => bucketFlagsToCells([], { kFloor: 0 })).toThrow();
    expect(() => bucketFlagsToCells([], { kFloor: 0.5 })).toThrow();
  });

  it('exports DEFAULT_CELL_SIZE_DEG as a positive number', () => {
    expect(DEFAULT_CELL_SIZE_DEG).toBeGreaterThan(0);
  });

  it('exports DEFAULT_K_FLOOR >= 3 (Jordan privacy requirement)', () => {
    expect(DEFAULT_K_FLOOR).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// gradientColorForSeverity
// ---------------------------------------------------------------------------

describe('gradientColorForSeverity', () => {
  it('returns severity 1 color at mean <= 1', () => {
    expect(gradientColorForSeverity(1.0, SEV_TOKENS)).toBe(SEV_TOKENS[1].color);
    expect(gradientColorForSeverity(0.5, SEV_TOKENS)).toBe(SEV_TOKENS[1].color);
  });

  it('returns severity 5 color at mean >= 5', () => {
    expect(gradientColorForSeverity(5.0, SEV_TOKENS)).toBe(SEV_TOKENS[5].color);
    expect(gradientColorForSeverity(6.0, SEV_TOKENS)).toBe(SEV_TOKENS[5].color);
  });

  it('rounds to nearest integer severity', () => {
    expect(gradientColorForSeverity(2.4, SEV_TOKENS)).toBe(SEV_TOKENS[2].color);
    expect(gradientColorForSeverity(2.5, SEV_TOKENS)).toBe(SEV_TOKENS[3].color);
    expect(gradientColorForSeverity(3.0, SEV_TOKENS)).toBe(SEV_TOKENS[3].color);
  });

  it('returns mid-tone for NaN', () => {
    expect(gradientColorForSeverity(NaN, SEV_TOKENS)).toBe(SEV_TOKENS[3].color);
  });
});

// ---------------------------------------------------------------------------
// colorForCell
// ---------------------------------------------------------------------------

describe('colorForCell', () => {
  const DENSITY_COLOR = '#2f80ed';

  function makeCell(overrides: Partial<HeatCell> = {}): HeatCell {
    return {
      key: '7400:-24481',
      count: 5,
      meanSeverity: 3,
      maxSeverity: 4,
      lat: 37.002,
      lng: -122.002,
      latStart: 37.0,
      latEnd: 37.005,
      lngStart: -122.005,
      lngEnd: -122.0,
      ...overrides,
    };
  }

  it('gradient mode returns the severity-mapped color', () => {
    const cell = makeCell({ meanSeverity: 1 });
    expect(colorForCell(cell, 'gradient', SEV_TOKENS, DENSITY_COLOR)).toBe(SEV_TOKENS[1].color);
  });

  it('density mode always returns the density color', () => {
    const cell = makeCell({ meanSeverity: 5 });
    expect(colorForCell(cell, 'density', SEV_TOKENS, DENSITY_COLOR)).toBe(DENSITY_COLOR);
  });
});

// ---------------------------------------------------------------------------
// Module-level constants
// ---------------------------------------------------------------------------

describe('module constants', () => {
  it('HEATMAP_FILL_OPACITY is in (0, 1]', () => {
    expect(HEATMAP_FILL_OPACITY).toBeGreaterThan(0);
    expect(HEATMAP_FILL_OPACITY).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_HEATMAP_MODE is gradient', () => {
    expect(DEFAULT_HEATMAP_MODE).toBe('gradient');
  });
});
