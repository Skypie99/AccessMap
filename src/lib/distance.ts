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
 * Human-readable walking ETA, e.g. "4 min walk". Pairs with formatDistance
 * on the same line.
 */
export function formatWalkingEta(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  const m = walkingMinutes(km);
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
