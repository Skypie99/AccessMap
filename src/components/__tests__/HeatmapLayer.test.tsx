/**
 * HeatmapLayer — D5 severity token tests.
 *
 * Verifies that:
 *   1. Severity 1 maps to #fde047 (yellow) — Dani D5 COMMIT token.
 *   2. Severity 5 maps to #dc2626 (deep red) — Dani D5 COMMIT token.
 *   3. useHeatCells returns [] for empty flags (no crash).
 *   4. The heatmapSeverity tokens from theme.ts match the D5 COMMIT spec.
 *
 * HeatmapLayer.tsx exports useHeatCells (a hook) and re-exports helpers
 * from @/lib/heatmap. The token-level assertions work directly against
 * the theme and heatmap lib functions without mounting native map components
 * (which would need complex mocks). This is the correct test altitude —
 * the render contract is covered by PlatformMap's integration tests.
 *
 * Supabase is mocked because flags.ts (pulled in transitively) imports it
 * at module level.
 */

import { renderHook } from '@testing-library/react-native';
import { heatmapSeverity } from '@/theme';
import { colorForCell, gradientColorForSeverity, type HeatCell } from '@/lib/heatmap';
import { useHeatCells } from '../HeatmapLayer';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// -------------------------------------------------------------------------
// D5 token contract — each expected hex is from the Dani Design Compiler
// COMMIT in qa-reports/2026-05-29_Dani_HeatmapColorDecision.md.
// -------------------------------------------------------------------------

describe('heatmapSeverity D5 token spec', () => {
  it('severity 1 maps to #fde047 (yellow-300)', () => {
    expect(heatmapSeverity[1].color).toBe('#fde047');
  });

  it('severity 2 maps to #fb923c (orange-400)', () => {
    expect(heatmapSeverity[2].color).toBe('#fb923c');
  });

  it('severity 3 maps to #f97316 (orange-500)', () => {
    expect(heatmapSeverity[3].color).toBe('#f97316');
  });

  it('severity 4 maps to #ef4444 (red-500)', () => {
    expect(heatmapSeverity[4].color).toBe('#ef4444');
  });

  it('severity 5 maps to #dc2626 (deep red — red-600)', () => {
    expect(heatmapSeverity[5].color).toBe('#dc2626');
  });
});

// -------------------------------------------------------------------------
// gradientColorForSeverity with heatmapSeverity tokens
// -------------------------------------------------------------------------

describe('gradientColorForSeverity with D5 heatmapSeverity tokens', () => {
  it('severity 1 (mean=1) returns #fde047', () => {
    expect(gradientColorForSeverity(1, heatmapSeverity)).toBe('#fde047');
  });

  it('severity 5 (mean=5) returns #dc2626', () => {
    expect(gradientColorForSeverity(5, heatmapSeverity)).toBe('#dc2626');
  });

  it('severity 3 (mean=3.0) returns #f97316', () => {
    expect(gradientColorForSeverity(3.0, heatmapSeverity)).toBe('#f97316');
  });

  it('rounds 2.5 up to severity 3 → #f97316', () => {
    expect(gradientColorForSeverity(2.5, heatmapSeverity)).toBe('#f97316');
  });
});

// -------------------------------------------------------------------------
// colorForCell with heatmapSeverity tokens
// -------------------------------------------------------------------------

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

describe('colorForCell — gradient mode with D5 tokens', () => {
  it('severity 1 cell returns #fde047 in gradient mode', () => {
    const cell = makeCell({ meanSeverity: 1, maxSeverity: 1 });
    expect(colorForCell(cell, 'gradient', heatmapSeverity, '#2f80ed')).toBe('#fde047');
  });

  it('severity 5 cell returns #dc2626 in gradient mode', () => {
    const cell = makeCell({ meanSeverity: 5, maxSeverity: 5 });
    expect(colorForCell(cell, 'gradient', heatmapSeverity, '#2f80ed')).toBe('#dc2626');
  });

  it('density mode always returns the density color regardless of severity', () => {
    const DENSITY = '#2f80ed';
    ([1, 2, 3, 4, 5] as const).forEach((s) => {
      const cell = makeCell({ meanSeverity: s, maxSeverity: s });
      expect(colorForCell(cell, 'density', heatmapSeverity, DENSITY)).toBe(DENSITY);
    });
  });
});

// -------------------------------------------------------------------------
// useHeatCells hook — rendering safety
// -------------------------------------------------------------------------

describe('useHeatCells', () => {
  it('returns empty array for empty flags input', () => {
    const { result } = renderHook(() => useHeatCells([], true));
    expect(result.current).toEqual([]);
  });

  it('returns empty array when visible=false (zero compute)', () => {
    const { result } = renderHook(() => useHeatCells([], false));
    expect(result.current).toEqual([]);
  });

  it('does not crash with visible=true and empty flags', () => {
    expect(() => renderHook(() => useHeatCells([], true))).not.toThrow();
  });
});
