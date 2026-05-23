/**
 * Tests for src/lib/directions.ts — the URL builder for native maps app
 * directions. openDirections() itself calls Linking.openURL which would
 * need a mock; the builder is pure and is what controls per-platform
 * behavior, so that's what we cover here.
 *
 * What this protects against:
 *  - A platform branch silently dropping (e.g. android falling through to
 *    web's Google URL would lose the user's default-maps-app preference).
 *  - The walking-mode flag being lost on iOS — a driver app wouldn't fit
 *    the "I want to walk around a broken sidewalk" use case.
 *  - Coordinate precision drift (5 decimals = ~1m; less and the user lands
 *    on the wrong street).
 *  - Label injection: a malicious or weird flag category sneaking control
 *    characters into the URL.
 */

import { buildDirectionsUrl } from '../directions';

const LAT = 37.331741;
const LNG = -122.030333;

describe('buildDirectionsUrl', () => {
  it('iOS — Apple Maps with walking mode (dirflg=w)', () => {
    const url = buildDirectionsUrl('ios', LAT, LNG);
    expect(url).toBe('maps://?daddr=37.33174,-122.03033&dirflg=w');
  });

  it('Android — geo: scheme with q=lat,lng(label) for the OS picker', () => {
    const url = buildDirectionsUrl('android', LAT, LNG, 'Broken sidewalk');
    expect(url).toBe(
      'geo:37.33174,-122.03033?q=37.33174,-122.03033(Broken%20sidewalk)',
    );
  });

  it('web — Google Maps URL with travelmode=walking', () => {
    const url = buildDirectionsUrl('web', LAT, LNG);
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=37.33174,-122.03033&travelmode=walking',
    );
  });

  it('uses 5 decimal places of precision (~1m, enough for street-level)', () => {
    // A noisy GPS double should be rounded down to the same precision
    // the rest of the app uses elsewhere.
    const noisy = buildDirectionsUrl('ios', 37.331741234567, -122.030333987);
    expect(noisy).toContain('37.33174,-122.03033');
  });

  it('encodes the Android label so spaces / parens / unicode survive', () => {
    const url = buildDirectionsUrl(
      'android',
      LAT,
      LNG,
      'Curb cut missing (south corner)',
    );
    const labelStart = url.indexOf('(') + 1;
    const labelEnd = url.lastIndexOf(')');
    const encoded = url.slice(labelStart, labelEnd);
    expect(decodeURIComponent(encoded)).toBe(
      'Curb cut missing (south corner)',
    );
  });

  it('truncates very long labels (Android only — keeps the URL short)', () => {
    const huge = 'X'.repeat(500);
    const url = buildDirectionsUrl('android', LAT, LNG, huge);
    const labelStart = url.indexOf('(') + 1;
    const labelEnd = url.lastIndexOf(')');
    const decoded = decodeURIComponent(url.slice(labelStart, labelEnd));
    // 80-char cap defined in directions.ts.
    expect(decoded.length).toBeLessThanOrEqual(80);
  });

  it('falls back to web URL for unknown platforms (windows / macos)', () => {
    // Platform.OS is typed as a union; we cast for the test since the
    // real runtime can surface other values during unit testing.
    const url = buildDirectionsUrl(
      'windows' as Parameters<typeof buildDirectionsUrl>[0],
      LAT,
      LNG,
    );
    expect(url.startsWith('https://www.google.com/maps/dir/')).toBe(true);
  });

  it('defaults the label to "AccessMap flag" when not provided', () => {
    const url = buildDirectionsUrl('android', LAT, LNG);
    expect(decodeURIComponent(url)).toContain('(AccessMap flag)');
  });
});
