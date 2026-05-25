/**
 * Pure helpers to find the nearest unresolved flag to a coordinate.
 *
 * "Unresolved" = currently open or verified — i.e., the flags that
 * could still benefit from someone showing up. Resolved/rejected are
 * dropped from consideration so the Profile's "nearest" jump button
 * doesn't take the user to a flag that's already done.
 *
 * No side effects, no AsyncStorage, no Supabase. Easy to test.
 */
import { haversineKm, type LatLng } from './distance';
import type { FlagRow, FlagStatus } from '@/types/database';

/**
 * Statuses considered "still actionable" for the nearest-jump CTA.
 * Reordering or extending requires updating the test cases too.
 */
export const UNRESOLVED_STATUSES: ReadonlyArray<FlagStatus> = [
  'open',
  'verified',
] as const;

export interface NearestFlagHit {
  flag: FlagRow;
  /** Distance from the user's coordinate to this flag, in kilometres. */
  km: number;
}

/**
 * Pure: returns the nearest open-or-verified flag to `from`, with its
 * computed distance. Returns null when:
 *  - `from` is null (no user location).
 *  - `flags` is empty.
 *  - No flag in the list has an unresolved status.
 *
 * Ties (same distance, e.g. two coincident pins) resolve to the first
 * one in input order — deterministic, no shuffle on re-render.
 */
export function findNearestUnresolved(
  flags: FlagRow[],
  from: LatLng | null,
): NearestFlagHit | null {
  if (!from) return null;
  if (flags.length === 0) return null;

  let best: NearestFlagHit | null = null;
  for (const f of flags) {
    if (!UNRESOLVED_STATUSES.includes(f.status)) continue;
    const km = haversineKm(from, { lat: f.lat, lng: f.lng });
    // Strictly less-than so ties go to the first match (deterministic).
    if (best === null || km < best.km) {
      best = { flag: f, km };
    }
  }
  return best;
}
