/**
 * Neighbourhood heat-map clustering.
 *
 * Buckets flags onto a fixed lat/lng grid and emits one cell per bucket,
 * provided the bucket clears the k-anonymity floor. Two non-negotiable
 * conditions baked in by Jordan (privacy review):
 *
 *   1. K-anonymity floor (k>=3): cells with fewer than `kFloor` flags are
 *      dropped entirely. This is the privacy guarantee — a single report
 *      cannot be back-traced to a single reporter through the heat layer.
 *   2. The severity scale must be disclosed in the UI. We surface every
 *      cell's mean severity (1.00–5.00) so the LegendModal + a per-cell
 *      label can name what the color is encoding.
 *
 * The bucketing is intentionally simple (not geohash) so it's easy to
 * read, easy to test, and easy to swap out later. The grid is in raw
 * degrees: 0.005° latitude ≈ 555 m, which sits roughly at the
 * "neighbourhood block" scale Jordan and Dani signed off on.
 */

import type { FlagRow, FlagSeverity } from '@/types/database';

/** Default grid cell size in degrees. ~555 m N–S; shrinks E–W at higher
 *  latitudes. Easy to tune from MapScreen if Sky wants finer/coarser cells. */
export const DEFAULT_CELL_SIZE_DEG = 0.005;

/** k-anonymity floor — Jordan's hard condition. Don't lower without
 *  another privacy review. */
export const DEFAULT_K_FLOOR = 3;

export interface HeatCell {
  /** Stable identifier for the cell — used as a React key. */
  key: string;
  /** Number of flags inside the cell (>= kFloor). */
  count: number;
  /** Mean severity of flags in the cell, 1.00–5.00. The colour ramp and
   *  the on-cell numeric label both read from this. */
  meanSeverity: number;
  /** Highest severity present in the cell — used by the "density" mode
   *  which colours by the worst-case rather than the mean. */
  maxSeverity: FlagSeverity;
  /** Centroid of the flag coordinates inside the cell. Where the cell
   *  label / marker is anchored on the map. */
  lat: number;
  lng: number;
  /** Cell footprint — for rendering a rectangle/polygon outline. */
  latStart: number;
  latEnd: number;
  lngStart: number;
  lngEnd: number;
}

export interface BucketOptions {
  /** Grid cell size in degrees. Defaults to {@link DEFAULT_CELL_SIZE_DEG}. */
  cellSizeDeg?: number;
  /** Minimum flags per cell. Defaults to {@link DEFAULT_K_FLOOR}.
   *  Setting this below 3 violates Jordan's pre-approval; the privacy
   *  guarantee depends on it. */
  kFloor?: number;
}

interface Accumulator {
  count: number;
  severitySum: number;
  maxSeverity: FlagSeverity;
  latSum: number;
  lngSum: number;
  latBucket: number;
  lngBucket: number;
}

// Snap a coordinate onto the nearest grid line below it. Math.floor is
// stable across positive + negative inputs (works for southern + western
// hemispheres). We don't try to normalise across the antimeridian — a
// city-scale heat map never spans 180° longitude.
function bucketIndex(value: number, cellSizeDeg: number): number {
  return Math.floor(value / cellSizeDeg);
}

/**
 * Bucket flags into grid cells and drop cells below the privacy floor.
 *
 * Pure function: same input → same output, no side effects, safe to call
 * in a useMemo. O(n) over the flag list. The output is unordered; the
 * renderer can sort by count/severity if a draw order matters.
 *
 * Cells are keyed by their integer grid coordinates so two flags at very
 * close lat/lng but on opposite sides of a cell boundary land in
 * different buckets — that's a known edge of grid bucketing, and it's
 * acceptable here because the heat layer is a coarse summary, not a
 * precise inference about any single pin.
 */
export function bucketFlagsToCells(
  flags: ReadonlyArray<FlagRow>,
  opts: BucketOptions = {},
): HeatCell[] {
  const cellSizeDeg = opts.cellSizeDeg ?? DEFAULT_CELL_SIZE_DEG;
  const kFloor = opts.kFloor ?? DEFAULT_K_FLOOR;

  if (!Number.isFinite(cellSizeDeg) || cellSizeDeg <= 0) {
    throw new Error('cellSizeDeg must be a positive finite number');
  }
  if (!Number.isInteger(kFloor) || kFloor < 1) {
    throw new Error('kFloor must be a positive integer');
  }

  const buckets = new Map<string, Accumulator>();

  for (const flag of flags) {
    // Skip rows with invalid coordinates so a corrupt insert can't take
    // down the heat layer. The pin layer already handles these the same
    // way (it just renders nothing at NaN coords).
    if (!Number.isFinite(flag.lat) || !Number.isFinite(flag.lng)) continue;

    const latBucket = bucketIndex(flag.lat, cellSizeDeg);
    const lngBucket = bucketIndex(flag.lng, cellSizeDeg);
    const key = `${latBucket}:${lngBucket}`;

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.severitySum += flag.severity;
      if (flag.severity > existing.maxSeverity) {
        existing.maxSeverity = flag.severity;
      }
      existing.latSum += flag.lat;
      existing.lngSum += flag.lng;
    } else {
      buckets.set(key, {
        count: 1,
        severitySum: flag.severity,
        maxSeverity: flag.severity,
        latSum: flag.lat,
        lngSum: flag.lng,
        latBucket,
        lngBucket,
      });
    }
  }

  const cells: HeatCell[] = [];
  for (const [key, acc] of buckets) {
    if (acc.count < kFloor) continue;
    const latStart = acc.latBucket * cellSizeDeg;
    const lngStart = acc.lngBucket * cellSizeDeg;
    cells.push({
      key,
      count: acc.count,
      meanSeverity: acc.severitySum / acc.count,
      maxSeverity: acc.maxSeverity,
      lat: acc.latSum / acc.count,
      lng: acc.lngSum / acc.count,
      latStart,
      latEnd: latStart + cellSizeDeg,
      lngStart,
      lngEnd: lngStart + cellSizeDeg,
    });
  }
  return cells;
}

/**
 * Map a mean severity (1.00–5.00) to a colour from the severity gradient.
 * Uses the same green→yellow→orange→red ramp as individual flag pins so
 * the heat layer reads as a smoothed-out version of the pin colours.
 *
 * The colour values come from the design tokens — pass `severity` (from
 * `@/theme`) so the function stays pure and easy to test. Defaults to a
 * neutral mid-tone if `mean` is outside the expected range.
 */
export interface SeverityToken {
  color: string;
  label: string;
}

export function gradientColorForSeverity(
  mean: number,
  severityTokens: Readonly<Record<FlagSeverity, SeverityToken>>,
): string {
  if (!Number.isFinite(mean)) return severityTokens[3].color;
  if (mean <= 1) return severityTokens[1].color;
  if (mean >= 5) return severityTokens[5].color;
  // Round to the nearest integer severity rather than interpolating —
  // matches Dani's "distinct color bands" leaning from the design compile
  // gate and keeps the palette readable without alpha blending tricks.
  const nearest = Math.round(mean) as FlagSeverity;
  return severityTokens[nearest].color;
}

/**
 * Heat-map render mode. Defaulted to `gradient` per Sky's D5 answer; the
 * `density` branch is the contingency Sky asked for so the colour scheme
 * can flip with a single config-constant change.
 */
export type HeatmapMode = 'gradient' | 'density';

/**
 * ── CONFIG ──────────────────────────────────────────────────────────────────
 * Change to `'density'` to switch from the severity-gradient colour scheme
 * (green → yellow → red) to a uniform brand-tinted density view.
 * This is the single knob Sky asked for — one edit here flips both the
 * native and web map layers simultaneously.
 */
export const DEFAULT_HEATMAP_MODE: HeatmapMode = 'gradient';

/**
 * Opacity used by both modes. 0.65 leaves the underlying map tiles and
 * the pin layer readable on top — Dani's compiler called for the heat
 * layer to not obscure markers.
 */
export const HEATMAP_FILL_OPACITY = 0.65;

/**
 * Pick the cell fill colour based on the current mode.
 *
 * - `gradient`: green→red ramp keyed off the cell's MEAN severity.
 * - `density`: uniform brand-tinted dot regardless of severity. The user
 *   reads density from the cell's count badge instead of the colour.
 */
export function colorForCell(
  cell: HeatCell,
  mode: HeatmapMode,
  severityTokens: Readonly<Record<FlagSeverity, SeverityToken>>,
  densityColor: string,
): string {
  if (mode === 'density') return densityColor;
  return gradientColorForSeverity(cell.meanSeverity, severityTokens);
}
