/**
 * HeatmapLayer — D5 gradient heat-map layer.
 *
 * This component is the public contract for the heat-map feature.
 * The actual pixel rendering is platform-split:
 *
 *   - Native (iOS / Android): PlatformMap.tsx renders each cell as a
 *     Polygon (react-native-maps) + a Marker badge at the centroid.
 *     Both use colorForCell() from @/lib/heatmap for the severity gradient.
 *
 *   - Web: PlatformMap.web.tsx renders each cell as a Rectangle
 *     (react-leaflet) + a Marker with a L.DivIcon badge at the centroid.
 *
 * In both cases the cells arrive pre-bucketed and pre-filtered at the k>=3
 * floor from bucketFlagsToCells() in @/lib/heatmap. This component's
 * job is to own that computation and expose a clean hook for callers.
 *
 * Usage (MapScreen does this already):
 *
 *   const heatCells = useHeatCells(filteredFlags, heatmapEnabled);
 *   <PlatformMap ... heatCells={heatCells} heatmapMode={HEATMAP_MODE} />
 *
 * Jordan Art. 7 conditions enforced here:
 *
 *   1. k-anonymity floor (DEFAULT_K_FLOOR = 3) — bucketFlagsToCells drops
 *      any cell with fewer than 3 flags before the array ever reaches the map.
 *   2. No raw coordinates exposed — only cell centroids (+-0.005 deg, ~555 m)
 *      are passed to the render layer; the original flag lat/lng are lost
 *      in aggregation.
 *   3. Disclaimer text — MapScreen renders the Jordan-mandated text whenever
 *      heatmapEnabled is true (see the heatmapDisclaimer block in MapScreen.tsx).
 */

import { useMemo } from 'react';
import {
  bucketFlagsToCells,
  colorForCell,
  DEFAULT_K_FLOOR,
  HEATMAP_FILL_OPACITY,
  type HeatCell,
  type HeatmapMode,
} from '@/lib/heatmap';
import type { FlagRow } from '@/types/database';

export interface HeatmapLayerProps {
  /** The full (already-filtered) flag list from the store. Cells are
   *  computed here via useMemo so the bucketing cost is zero when
   *  visible is false. */
  flags: readonly FlagRow[];
  visible: boolean;
  /** 'gradient' (default) or 'density'. Passed through to PlatformMap. */
  heatmapMode?: HeatmapMode;
}

/**
 * Hook that produces pre-bucketed, k-anonymous heat cells from a flag list.
 * Use this in MapScreen to feed heatCells into <PlatformMap />.
 *
 * - Returns [] when visible is false (zero compute cost on default-off path).
 * - Cells are memoised: identity only changes when visible or flags changes.
 * - k-anonymity floor enforced inside bucketFlagsToCells (DEFAULT_K_FLOOR = 3).
 *
 * @example
 *   const heatCells = useHeatCells(filteredFlags, heatmapEnabled);
 *   <PlatformMap heatCells={heatCells} heatmapMode={HEATMAP_MODE} />
 */
export function useHeatCells(
  flags: readonly FlagRow[],
  visible: boolean,
): HeatCell[] {
  return useMemo(() => {
    if (!visible) return [];
    return bucketFlagsToCells(flags);
  }, [flags, visible]);
}

// Re-export everything consumers might need so they can import from a
// single place instead of reaching into @/lib/heatmap directly.
export {
  bucketFlagsToCells,
  colorForCell,
  DEFAULT_K_FLOOR,
  HEATMAP_FILL_OPACITY,
};
export type { HeatCell, HeatmapMode };
