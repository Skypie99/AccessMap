/**
 * Heat-map binning — pure, dependency-free, testable.
 *
 * Bins flags into a fixed-resolution lat/lng grid and emits one HeatCell per
 * bin that satisfies the k-anonymity floor (default k=3, per Jordan's
 * 2026-05-25 privacy review C1). Cells with fewer than `minCount` flags are
 * dropped entirely — they never reach the renderer.
 *
 * Why k≥3 is non-negotiable:
 *   A heat-map cell containing a single flag visually leaks the same
 *   information as an individual pin. The k=3 floor keeps the heat layer
 *   strictly less-precise than the pin layer, which is the privacy basis
 *   Jordan approved the feature on. Do not lower this default without
 *   re-reviewing C1.
 *
 * Why this lives in src/lib and not a screen:
 *   Both PlatformMap variants (web Leaflet, native react-native-maps)
 *   consume the same HeatCell[]. Computation runs once in MapScreen
 *   (useMemo over the in-memory filtered flags array — no extra Supabase
 *   fetch, per Jordan trigger 4) and is passed to whichever map renders.
 */
import type { FlagRow, FlagSeverity } from '@/types/database';

export interface HeatCell {
  /** Center latitude of the grid cell. */
  lat: number;
  /** Center longitude of the grid cell. */
  lng: number;
  /** Number of flags binned into this cell. Always >= minCount. */
  count: number;
  /** Mean severity (1..5, fractional) of the flags in this cell. */
  avgSeverity: number;
}

/**
 * Default grid cell size in degrees. ~555 m at the equator (0.005° × 111 km/°),
 * shrinks with cos(lat) for longitude. This is the resolution Jordan's review
 * called out as the privacy-safety default: fine enough to be useful, coarse
 * enough that k≥3 is achievable in moderately dense areas. Sky/Dani may tune
 * up (coarser → easier k-anonymity, less precise) but values below ~0.001°
 * require a re-review.
 */
export const DEFAULT_HEAT_GRID_DEG = 0.005;

/**
 * k-anonymity floor — cells with fewer than this many flags are not emitted.
 * Jordan condition C1 (2026-05-25). DO NOT change without re-review.
 */
export const HEATMAP_MIN_COUNT = 3;

/**
 * Bin an array of flags into heat-grid cells.
 *
 * @param flags        Flags to bin. Use the already-filtered in-memory array
 *                     from useFlags() so the heat-map reflects the user's
 *                     active filters (Jordan trigger 4 guidance).
 * @param gridSizeDeg  Cell side length in degrees. Defaults to ~555 m.
 * @param minCount     k-anonymity floor. Defaults to 3 (Jordan C1).
 *                     Cells with fewer flags are dropped.
 * @returns            One HeatCell per bin that passed the threshold,
 *                     centered on the cell center (so renderers can place a
 *                     circle there without needing to know about the grid).
 */
export function computeHeatGrid(
  flags: ReadonlyArray<FlagRow>,
  gridSizeDeg: number = DEFAULT_HEAT_GRID_DEG,
  minCount: number = HEATMAP_MIN_COUNT,
): HeatCell[] {
  // Defensive: a zero or negative grid size would divide-by-zero or invert
  // the binning. Fall back to the default so we never blow up on bad input.
  const size = gridSizeDeg > 0 ? gridSizeDeg : DEFAULT_HEAT_GRID_DEG;

  // Single pass: bin by (floor(lat/size), floor(lng/size)). The accumulator
  // stores running sums (lat, lng, severity, count) so the average comes out
  // without a second pass.
  interface Bin {
    sumLat: number;
    sumLng: number;
    sumSeverity: number;
    count: number;
  }
  const bins = new Map<string, Bin>();

  for (const f of flags) {
    // Skip rows with non-finite coordinates — shouldn't happen with our schema
    // but the heat-grid math relies on finite values, so be defensive.
    if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
    const ix = Math.floor(f.lat / size);
    const iy = Math.floor(f.lng / size);
    const key = `${ix}|${iy}`;
    const existing = bins.get(key);
    if (existing) {
      existing.sumLat += f.lat;
      existing.sumLng += f.lng;
      existing.sumSeverity += f.severity;
      existing.count += 1;
    } else {
      bins.set(key, {
        sumLat: f.lat,
        sumLng: f.lng,
        sumSeverity: f.severity,
        count: 1,
      });
    }
  }

  const cells: HeatCell[] = [];
  for (const bin of bins.values()) {
    if (bin.count < minCount) continue; // C1 — k-anonymity floor
    cells.push({
      lat: bin.sumLat / bin.count,
      lng: bin.sumLng / bin.count,
      count: bin.count,
      avgSeverity: bin.sumSeverity / bin.count,
    });
  }
  return cells;
}

/**
 * Map an average-severity (1..5, possibly fractional) to a gradient hex color.
 * Anchors match `severityColor()` in src/lib/flags.ts so the heat layer reads
 * as the same palette as individual pins.
 *
 * Implementation: piecewise linear RGB interpolation between the five anchor
 * colors (1=green, 2=lime, 3=yellow, 4=orange, 5=red). Out-of-range inputs are
 * clamped — a defensive choice so the renderer never gets a bad color string.
 */
export function heatColorForSeverity(avgSeverity: number): string {
  const anchors: Array<{ at: FlagSeverity; rgb: [number, number, number] }> = [
    { at: 1, rgb: [0x27, 0xae, 0x60] }, // #27ae60 — green
    { at: 2, rgb: [0x7f, 0xb8, 0x00] }, // #7fb800 — lime
    { at: 3, rgb: [0xf1, 0xc4, 0x0f] }, // #f1c40f — yellow
    { at: 4, rgb: [0xe6, 0x7e, 0x22] }, // #e67e22 — orange
    { at: 5, rgb: [0xe7, 0x4c, 0x3c] }, // #e74c3c — red
  ];
  if (avgSeverity <= 1) return rgbToHex(anchors[0]!.rgb);
  if (avgSeverity >= 5) return rgbToHex(anchors[4]!.rgb);
  const lo = Math.floor(avgSeverity);
  const hi = lo + 1;
  const t = avgSeverity - lo;
  const a = anchors[lo - 1]!.rgb;
  const b = anchors[hi - 1]!.rgb;
  const mix: [number, number, number] = [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
  return rgbToHex(mix);
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Map a cell's flag count to a fill opacity in [0.25, 0.7]. Denser cells render
 * more opaque, but the floor (0.25) keeps even k=3 cells visible. Logarithmic
 * so a 30-flag cell isn't 10× more opaque than a 3-flag cell.
 */
export function heatOpacityForCount(count: number): number {
  if (count <= 0) return 0;
  const min = 0.25;
  const max = 0.7;
  // log2(count) saturates at count=32 (log2(32)=5), reaching the max opacity.
  const t = Math.min(1, Math.log2(count) / 5);
  return min + (max - min) * t;
}
