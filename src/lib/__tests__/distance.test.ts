import {
  formatDistance,
  formatWalkingEta,
  haversineKm,
  speakDistance,
  walkingMinutes,
} from '../distance';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 47.6062, lng: -122.3321 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it('measures a short street-level distance to within meters', () => {
    // Pike Place Market (47.6097, -122.3422) to Seattle Aquarium
    // (47.6075, -122.3434). Hand-calculated: ~270 m.
    const km = haversineKm(
      { lat: 47.6097, lng: -122.3422 },
      { lat: 47.6075, lng: -122.3434 },
    );
    expect(km).toBeGreaterThan(0.2);
    expect(km).toBeLessThan(0.35);
  });

  it('measures a multi-km city distance to within a few percent', () => {
    // Seattle (47.6062, -122.3321) to Bellevue (47.6101, -122.2015).
    // Real-world: ~9.7 km great-circle.
    const km = haversineKm(
      { lat: 47.6062, lng: -122.3321 },
      { lat: 47.6101, lng: -122.2015 },
    );
    expect(km).toBeGreaterThan(9.5);
    expect(km).toBeLessThan(10.0);
  });

  it('is symmetric: d(a, b) === d(b, a)', () => {
    const a = { lat: 40.7128, lng: -74.006 };
    const b = { lat: 34.0522, lng: -118.2437 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });

  it('handles antipodal points', () => {
    // Halfway around Earth is ~20,015 km. Allow a generous range
    // because perfect antipodes have a degenerate haversine result.
    const km = haversineKm(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 180 },
    );
    expect(km).toBeGreaterThan(20000);
    expect(km).toBeLessThan(20050);
  });

  it('crosses the date line correctly', () => {
    // 1° east of date line vs 1° west — should be ~222 km, not the
    // long way around the globe.
    const km = haversineKm(
      { lat: 0, lng: 179 },
      { lat: 0, lng: -179 },
    );
    expect(km).toBeGreaterThan(200);
    expect(km).toBeLessThan(250);
  });

  it('treats lng=180 and lng=-180 as the same point on the date line', () => {
    // Same physical location, opposite sign conventions. Haversine
    // should yield ~0 km (within floating-point noise).
    const km = haversineKm(
      { lat: 0, lng: 180 },
      { lat: 0, lng: -180 },
    );
    expect(km).toBeLessThan(0.001);
  });

  it('handles the north pole (lat=90) without NaN', () => {
    // From the north pole to the equator at lng=0 is a quarter of
    // Earth's circumference, ~10,007 km. Critically, the result must
    // be a finite number — a naive haversine that doesn't clamp the
    // asin input can produce NaN at the poles.
    const km = haversineKm(
      { lat: 90, lng: 0 },
      { lat: 0, lng: 0 },
    );
    expect(Number.isFinite(km)).toBe(true);
    expect(km).toBeGreaterThan(9900);
    expect(km).toBeLessThan(10100);
  });

  it('handles the south pole (lat=-90) without NaN', () => {
    // Symmetric to the north-pole case.
    const km = haversineKm(
      { lat: -90, lng: 0 },
      { lat: 0, lng: 0 },
    );
    expect(Number.isFinite(km)).toBe(true);
    expect(km).toBeGreaterThan(9900);
    expect(km).toBeLessThan(10100);
  });

  it('pole-to-pole is half Earth circumference (~20,015 km)', () => {
    const km = haversineKm(
      { lat: 90, lng: 0 },
      { lat: -90, lng: 0 },
    );
    expect(Number.isFinite(km)).toBe(true);
    expect(km).toBeGreaterThan(20000);
    expect(km).toBeLessThan(20050);
  });

  it('works in the southern + western hemisphere (sign-agnostic)', () => {
    // Buenos Aires (-34.6037, -58.3816) to Santiago (-33.4489, -70.6693).
    // Real-world great-circle: ~1140 km.
    const km = haversineKm(
      { lat: -34.6037, lng: -58.3816 },
      { lat: -33.4489, lng: -70.6693 },
    );
    expect(km).toBeGreaterThan(1100);
    expect(km).toBeLessThan(1200);
  });
});

describe('walkingMinutes', () => {
  it('returns 0 for zero distance', () => {
    expect(walkingMinutes(0)).toBe(0);
  });

  it('returns 0 for negative distance', () => {
    expect(walkingMinutes(-1)).toBe(0);
  });

  it('rounds tiny distances up to 1 minute, never 0', () => {
    // 1 m walk would round to 0 — we floor at 1.
    expect(walkingMinutes(0.001)).toBe(1);
  });

  it('5 km at 5 km/h is 60 minutes', () => {
    expect(walkingMinutes(5)).toBe(60);
  });

  it('1 km is 12 minutes at the configured pace', () => {
    expect(walkingMinutes(1)).toBe(12);
  });
});

describe('formatDistance', () => {
  it('returns empty string for negative input', () => {
    expect(formatDistance(-0.5)).toBe('');
  });

  it('returns empty string for NaN', () => {
    expect(formatDistance(NaN)).toBe('');
  });

  it('returns empty string for Infinity', () => {
    expect(formatDistance(Infinity)).toBe('');
  });

  it('shows "<50 m" for very close flags', () => {
    expect(formatDistance(0.02)).toBe('<50 m'); // 20 m
    expect(formatDistance(0.049)).toBe('<50 m');
  });

  it('shows meters (rounded) between 50 and 999 m', () => {
    expect(formatDistance(0.05)).toBe('50 m');
    expect(formatDistance(0.123)).toBe('123 m');
    expect(formatDistance(0.999)).toBe('999 m');
  });

  it('shows kilometers with one decimal at 1 km and above', () => {
    expect(formatDistance(1)).toBe('1.0 km');
    expect(formatDistance(2.345)).toBe('2.3 km');
    expect(formatDistance(15.7)).toBe('15.7 km');
  });
});

describe('formatWalkingEta', () => {
  it('returns empty string for invalid input', () => {
    expect(formatWalkingEta(-1)).toBe('');
    expect(formatWalkingEta(NaN)).toBe('');
  });

  it('returns "0 min walk" for zero distance', () => {
    expect(formatWalkingEta(0)).toBe('0 min walk');
  });

  it('floors tiny distances at "1 min walk"', () => {
    expect(formatWalkingEta(0.001)).toBe('1 min walk');
  });

  it('formats a typical city distance', () => {
    expect(formatWalkingEta(1)).toBe('12 min walk');
  });
});

describe('speakDistance', () => {
  it('returns empty string for invalid input', () => {
    expect(speakDistance(-1)).toBe('');
    expect(speakDistance(NaN)).toBe('');
  });

  it('uses full words for very close flags', () => {
    expect(speakDistance(0.02)).toBe('less than 50 meters away');
  });

  it('uses "meters" (full word) below 1 km', () => {
    expect(speakDistance(0.5)).toBe('500 meters away');
  });

  it('uses "kilometers" (full word) at 1 km and above', () => {
    expect(speakDistance(2.5)).toBe('2.5 kilometers away');
  });
});
