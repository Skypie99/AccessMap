// Distance and walking-ETA helpers.
//
// One source of truth so the Map's "nearby" list and the Tasks-tab triage
// cards format distance the same way. Pure functions — no React, no
// platform code — so they're trivial to unit-test once Jest lands.
//
// Internal unit: kilometers (number). One unit avoids the "did this take
// meters or km?" foot-gun. Callers convert at the edges if they need
// meters.

export interface LatLng {
  lat: number;
  lng: number;
}

// Average urban walking pace, in km/h. Matches what Google Maps assumes
// for pedestrian routing. If we ever add a "wheelchair pace" toggle, this
// is the knob to expose.
const WALKING_KMH = 5;

/**
 * Great-circle distance between two lat/lng points, in kilometers
 * (haversine). Accurate to well within a meter at street-level scale,
 * which is all Flagstone needs.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A map viewport, in the shape both PlatformMap halves already take. */
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Is this point inside that map window?
 *
 * D4/C3 uses this to answer one narrow question honestly: does the map peek
 * show a place where nothing has been reported? "Nothing here" is only a claim
 * worth making about the window the user is actually looking at, so the test is
 * against the peek's own region rather than some invented radius.
 *
 * FORK-1 FENCE (verbatim, from design-reviews/fork-briefs BRIEF 1): the peek's
 * SF fallback constant is a PARKED fork and this helper must never be used to
 * justify moving it. Centering the peek correctly makes that fork MORE visible,
 * not less — deciding where an unlocated user's map should point is Sky's call,
 * not a side effect of a containment test.
 *
 * Edge cases are deliberate, not defensive noise:
 *   - any non-finite input → false (never claim containment you can't compute);
 *   - a longitude window of 360 degrees or more contains every longitude;
 *   - the longitude difference is normalized into [-180, 180], so a window
 *     straddling the antimeridian still contains points on the far side of it.
 */
export function regionContainsPoint(region: Region, p: LatLng): boolean {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
  const finite = [latitude, longitude, latitudeDelta, longitudeDelta, p.lat, p.lng].every((n) =>
    Number.isFinite(n),
  );
  if (!finite) return false;
  if (latitudeDelta < 0 || longitudeDelta < 0) return false;
  if (Math.abs(p.lat - latitude) > latitudeDelta / 2) return false;
  if (longitudeDelta >= 360) return true;
  // Both longitudes are within +/-180, so the difference is within +/-360 and
  // the +540 offset keeps the modulo operand positive (JS % keeps the sign of
  // its left operand, which would otherwise break the wrap).
  const dLng = ((p.lng - longitude + 540) % 360) - 180;
  return Math.abs(dLng) <= longitudeDelta / 2;
}

/**
 * A viewport that shows the reports we actually have, for a user we cannot
 * locate yet.
 *
 * SW-08. Home's map peek fell back to a hardcoded San Francisco region while
 * the data it draws is in Kelowna, so a user with no location and no search got
 * an empty ocean of a city the app has never had a report in. The caption
 * beside it ("No reports here yet. You could add the first.") is correct and
 * ratified — it cannot fire without a real centre — but the MAP under it was
 * pointing somewhere arbitrary.
 *
 * Fitting the loaded flags is the honest fallback: it makes no claim about
 * where the USER is (nothing here is ever a distance origin — that still
 * requires a real centre), only about where the reports are.
 *
 * Returns null when there is nothing to fit, because an empty list cannot
 * answer the question and inventing a centre for it would be the same mistake
 * one step further along.
 *
 * The window is padded and floored so a single report, or a tight cluster, does
 * not arrive zoomed to street level with no context around it.
 */
export function regionFittingPoints(
  points: LatLng[],
  { minDelta = 0.05, pad = 1.4 }: { minDelta?: number; pad?: number } = {},
): Region | null {
  const usable = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (usable.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of usable) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * pad),
    longitudeDelta: Math.max(minDelta, (maxLng - minLng) * pad),
  };
}

/**
 * M2 — the map's FIRST FRAME, for a viewer whose centre is known.
 *
 * The full map used to open on a street-level box around the user: 0.01 deg of
 * latitude, which in Kelowna put the nearest report 314 m outside the viewport.
 * A user tapped "Open full map" under a chip reading "13 flags" and saw Apple's
 * map with none of them on it. The Home peek, one tap earlier, had shown the
 * clusters — so the product's own markers were the thing the full map dropped.
 *
 * Fit the nearest `count` of them PLUS the centre itself, so the frame answers
 * both questions at once: where am I, and what is around me. The centre is a
 * member of the fit, not the origin of it — drop it and a user standing just
 * outside a tight cluster loses their own dot off the edge.
 *
 * `minDelta` floors the zoom so a tight cluster does not arrive rammed into one
 * street; `regionFittingPoints` pads the span so nothing sits flush to an edge.
 * Returns null when there is nothing to fit, and the caller keeps its own frame.
 */
export function regionForNearestFlags(
  centre: LatLng,
  rows: readonly LatLng[],
  { count = 5, minDelta = 0.02 }: { count?: number; minDelta?: number } = {},
): Region | null {
  if (!Number.isFinite(centre.lat) || !Number.isFinite(centre.lng)) return null;
  const usable = rows.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (usable.length === 0) return null;

  // Measure once per row, then sort on the number. Sorting on a comparator that
  // recomputes haversine would run it O(n log n) times for an answer that does
  // not change between comparisons.
  const nearest = usable
    .map((p) => ({ p, km: haversineKm(centre, p) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
    .map((e) => e.p);

  return regionFittingPoints([{ lat: centre.lat, lng: centre.lng }, ...nearest], { minDelta });
}

/**
 * Walking time in minutes for a given distance, rounded up to at least 1
 * minute. "Standing across the street" still reads as a 1-minute walk —
 * better than rounding to zero and looking broken.
 */
export function walkingMinutes(km: number): number {
  if (km <= 0) return 0;
  return Math.max(1, Math.round((km / WALKING_KMH) * 60));
}

/**
 * Human-readable distance string. Mirrors what NearbyFlagsModal does
 * today: meters under 1 km (rounded), kilometers with one decimal above.
 * Adds a "<50 m" sentinel so very-close flags don't read as "0 m" once
 * we start surfacing this on Tasks cards.
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  const meters = km * 1000;
  // U+00A0 (non-breaking space) keeps the value and its unit on one line — "297 m"
  // can never orphan the "m" across a wrap (F2-13). Visible text only; the SR path
  // (speakDistance) stays a plain ASCII space so VoiceOver wording is unchanged.
  if (meters < 50) return '<50\u00A0m';
  if (meters < 1000) return `${Math.round(meters)}\u00A0m`;
  return `${km.toFixed(1)}\u00A0km`;
}

/**
 * Past this many minutes, a walking ETA stops informing a decision and starts
 * looking broken. The sim walk caught a Tasks card reading "279.2 km · 3351 min
 * walk" — about 56 hours, rendered as if it were a plan (SW-27).
 *
 * 60 is not an arbitrary round number here: at WALKING_KMH it is exactly 5 km,
 * which is both a real bucket in DISTANCE_OPTIONS (mapFilters.ts) and the case
 * distance.test.ts already pins as the reference (`walkingMinutes(5) === 60`).
 * Expressed in minutes rather than km so it keeps meaning "an hour on foot" if
 * the pace constant is ever changed.
 */
const MAX_USEFUL_WALK_MINUTES = 60;

/**
 * Human-readable walking ETA, e.g. "4 min walk". Pairs with formatDistance
 * on the same line.
 *
 * Returns '' beyond MAX_USEFUL_WALK_MINUTES — the same empty string this
 * function already returns for a nonsense distance, so the one caller
 * (TasksScreen's card meta line, which joins its parts through `.filter(Boolean)`)
 * simply drops the segment. The distance itself still renders, which is the part
 * that was carrying the information. Deliberately NOT a new string like "over an
 * hour": suppressing reuses shipped behaviour, whereas new user-facing wording
 * routes through copy.ts and Sky's §A pass.
 *
 * `walkingMinutes` is untouched — the arithmetic was never wrong, only the
 * decision to show it.
 */
export function formatWalkingEta(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  const m = walkingMinutes(km);
  if (m > MAX_USEFUL_WALK_MINUTES) return '';
  return `${m} min walk`;
}

/**
 * Screen-reader-friendly distance — full words, no abbreviation. Used by
 * accessibilityLabel composition where the abbreviated forms ("m" / "km")
 * would otherwise be read out as the letters.
 */
export function speakDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  const meters = km * 1000;
  if (meters < 50) return 'less than 50 meters away';
  if (meters < 1000) return `${Math.round(meters)} meters away`;
  return `${km.toFixed(1)} kilometers away`;
}
