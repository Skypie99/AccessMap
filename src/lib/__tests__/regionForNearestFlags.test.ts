/**
 * M2 — the map's first frame must open on the product's own markers.
 *
 * ─── THE FINDING ──────────────────────────────────────────────────────────
 * The cold walk tapped "Open full map" in Kelowna and got a street-level box
 * around the user with ZERO flags in it, under a command-bar chip reading
 * "13 flags". The nearest report was 314 m away — just outside a 0.01-deg
 * viewport. One tap earlier the Home peek had drawn the clusters, so the full
 * map was the surface that dropped them.
 *
 * ─── WHAT THIS HELPER PROMISES, AND WHAT IT DOES NOT ──────────────────────
 * It fits the nearest N reports PLUS the viewer's own point. The centre is a
 * MEMBER of the fit, never merely its origin — that is the difference between
 * a frame that answers "what is around me" and one that loses the user's dot
 * off the edge when they stand just outside a tight cluster.
 *
 * It makes no claim the caller has not already earned: it needs a real centre,
 * so it inherits the same honesty fence `regionFittingPoints` and
 * `regionContainsPoint` sit on — a viewport is not a distance origin.
 */
import { regionForNearestFlags, regionContainsPoint } from '../distance';

// Downtown Kelowna, the walk's own coordinates.
const USER = { lat: 49.888, lng: -119.496 };

describe('regionForNearestFlags — the first frame', () => {
  it('returns null when there is nothing to fit, rather than inventing a frame', () => {
    expect(regionForNearestFlags(USER, [])).toBeNull();
  });

  it('returns null for an unusable centre (never a NaN viewport)', () => {
    expect(regionForNearestFlags({ lat: Number.NaN, lng: -119.496 }, [USER])).toBeNull();
  });

  it('drops unusable rows and still answers from the ones that are real', () => {
    const r = regionForNearestFlags(USER, [
      { lat: Number.NaN, lng: Number.NaN },
      { lat: 49.892, lng: -119.49 },
    ]);
    expect(r).not.toBeNull();
    expect(Number.isFinite(r!.latitude)).toBe(true);
    expect(Number.isFinite(r!.longitudeDelta)).toBe(true);
  });

  it('THE BUG: the frame contains the nearest flags — not an empty street', () => {
    // Three reports at ~300-600 m, the spread that produced the empty frame.
    const flags = [
      { lat: 49.8908, lng: -119.4935 },
      { lat: 49.8855, lng: -119.4995 },
      { lat: 49.8893, lng: -119.5011 },
    ];
    const r = regionForNearestFlags(USER, flags)!;
    for (const f of flags) {
      expect(regionContainsPoint(r, f)).toBe(true);
    }
  });

  it('the user dot is a MEMBER of the fit, not just its origin', () => {
    // Every flag is north-east of the user; a bounds-of-the-flags-only fit
    // would leave the dot outside the frame.
    const flags = [
      { lat: 49.9, lng: -119.48 },
      { lat: 49.905, lng: -119.475 },
      { lat: 49.91, lng: -119.47 },
    ];
    const r = regionForNearestFlags(USER, flags)!;
    expect(regionContainsPoint(r, USER)).toBe(true);
  });

  it('takes the NEAREST count and ignores the far ones, so one outlier cannot zoom the world out', () => {
    const near = [
      { lat: 49.8885, lng: -119.4955 },
      { lat: 49.8875, lng: -119.4965 },
    ];
    const far = { lat: 51.0447, lng: -114.0719 }; // Calgary, ~600 km away
    const r = regionForNearestFlags(USER, [far, ...near], { count: 2 })!;
    expect(regionContainsPoint(r, far)).toBe(false);
    for (const f of near) expect(regionContainsPoint(r, f)).toBe(true);
  });

  it('floors the zoom at 0.02 deg so a tight cluster does not arrive rammed into one street', () => {
    // Two reports ~20 m apart: the raw span is far below the floor.
    const r = regionForNearestFlags(USER, [
      { lat: 49.8881, lng: -119.4961 },
      { lat: 49.8879, lng: -119.4959 },
    ])!;
    expect(r.latitudeDelta).toBeGreaterThanOrEqual(0.02);
    expect(r.longitudeDelta).toBeGreaterThanOrEqual(0.02);
  });

  it('a wide spread keeps its own span — the floor is a floor, never a cap', () => {
    const r = regionForNearestFlags(USER, [
      { lat: 49.83, lng: -119.56 },
      { lat: 49.95, lng: -119.43 },
    ])!;
    expect(r.latitudeDelta).toBeGreaterThan(0.02);
  });

  it('defaults to five, the top of the 3-5 band the plan asks for', () => {
    // Five reports inside a block, and a sixth across town. If the default
    // count were six, the sixth would drag the frame open to ~0.4 deg; at five
    // the frame is the 0.02 floor and the sixth is nowhere in it.
    const near = Array.from({ length: 5 }, (_, i) => ({
      lat: 49.888 + (i + 1) * 0.0002,
      lng: -119.496,
    }));
    const acrossTown = { lat: 50.188, lng: -119.496 };
    const r = regionForNearestFlags(USER, [...near, acrossTown])!;
    expect(r.latitudeDelta).toBeCloseTo(0.02, 10);
    expect(regionContainsPoint(r, acrossTown)).toBe(false);

    // And the count is a real knob, not a constant hiding in the signature.
    const six = regionForNearestFlags(USER, [...near, acrossTown], { count: 6 })!;
    expect(regionContainsPoint(six, acrossTown)).toBe(true);
  });
});
