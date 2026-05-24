/**
 * Tests for src/lib/directionsLink.ts — the pure URL formatter that hands
 * off "give me directions to this flag" to the user's maps app.
 *
 * What this protects against:
 *  - Platform branch silently dropping (an Android user landing on the
 *    web Google URL would lose their default-maps-app choice).
 *  - Sign/hemisphere bugs — flags in the southern/western hemisphere
 *    must round-trip through the URL with their minus signs intact.
 *  - Precision drift — at street level we need at least ~5 decimals
 *    (~1m); any rounding here would push the user onto the wrong block.
 *  - Encoded URL validity — no spaces, no characters that would break
 *    parsing in either the `maps:`, `geo:`, or `https:` schemes.
 *
 * The function is pure; we pass an explicit `platformOverride` so the
 * test doesn't depend on whatever `Platform.OS` Jest happens to report.
 */

import { getDirectionsUrl } from '../directionsLink';

describe('getDirectionsUrl', () => {
  describe('per-platform branching', () => {
    it('iOS → maps: scheme with daddr=lat,lng', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, 'ios');
      expect(url).toBe('maps:?daddr=37.331741,-122.030333');
    });

    it('Android → geo: scheme with q=lat,lng so the OS chooser opens', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, 'android');
      expect(url).toBe(
        'geo:37.331741,-122.030333?q=37.331741,-122.030333',
      );
    });

    it('Web → Google Maps universal dir/?api=1&destination link', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, 'web');
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=37.331741,-122.030333',
      );
    });
  });

  describe('coordinate sign handling', () => {
    it('preserves positive coords (northern + eastern hemisphere)', () => {
      // Tokyo, Japan
      const url = getDirectionsUrl(35.6762, 139.6503, 'ios');
      expect(url).toBe('maps:?daddr=35.6762,139.6503');
    });

    it('preserves negative latitude (southern hemisphere)', () => {
      // Sydney, Australia
      const url = getDirectionsUrl(-33.8688, 151.2093, 'android');
      expect(url).toBe('geo:-33.8688,151.2093?q=-33.8688,151.2093');
    });

    it('preserves negative longitude (western hemisphere)', () => {
      // New York City
      const url = getDirectionsUrl(40.7128, -74.006, 'web');
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=40.7128,-74.006',
      );
    });

    it('preserves both-negative coords (south + west — e.g. Buenos Aires)', () => {
      const url = getDirectionsUrl(-34.6037, -58.3816, 'ios');
      expect(url).toBe('maps:?daddr=-34.6037,-58.3816');
    });

    it('handles the null island (0, 0) without dropping the zero', () => {
      const url = getDirectionsUrl(0, 0, 'web');
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=0,0',
      );
    });
  });

  describe('precision', () => {
    it('preserves 6 decimal places (≈11cm) without truncation', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, 'ios');
      expect(url).toContain('37.331741');
      expect(url).toContain('-122.030333');
    });

    it('preserves sub-meter coords (7+ decimals) — no silent rounding', () => {
      // ~1cm precision — silly for street directions, but the formatter
      // should be a faithful pipe and not chop it.
      const url = getDirectionsUrl(37.3317412, -122.0303335, 'android');
      expect(url).toContain('37.3317412');
      expect(url).toContain('-122.0303335');
    });
  });

  describe('URL validity', () => {
    it('contains no spaces in any platform variant', () => {
      const ios = getDirectionsUrl(37.331741, -122.030333, 'ios');
      const android = getDirectionsUrl(37.331741, -122.030333, 'android');
      const web = getDirectionsUrl(37.331741, -122.030333, 'web');
      expect(ios).not.toMatch(/\s/);
      expect(android).not.toMatch(/\s/);
      expect(web).not.toMatch(/\s/);
    });

    it('iOS URL parses with the expected `maps:` scheme', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, 'ios');
      expect(url.startsWith('maps:')).toBe(true);
      expect(url).toMatch(/^maps:\?daddr=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
    });

    it('Android URL parses with the expected `geo:` scheme', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, 'android');
      expect(url.startsWith('geo:')).toBe(true);
      expect(url).toMatch(
        /^geo:-?\d+(\.\d+)?,-?\d+(\.\d+)?\?q=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
      );
    });

    it('Web URL is a valid https URL with destination query param', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, 'web');
      // URL constructor throws on malformed input — passing = passes.
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('www.google.com');
      expect(parsed.pathname).toBe('/maps/dir/');
      expect(parsed.searchParams.get('api')).toBe('1');
      expect(parsed.searchParams.get('destination')).toBe(
        '37.331741,-122.030333',
      );
    });
  });

  describe('platformOverride default', () => {
    it('omitting platformOverride uses Platform.OS (web in Jest)', () => {
      // The Jest harness reports Platform.OS as 'web' for RN tests, so
      // this exercises the default-branch fall-through. The exact value
      // doesn't matter — we only need to confirm that omitting the
      // argument yields a valid URL containing the coords.
      const url = getDirectionsUrl(37.331741, -122.030333);
      expect(url).toContain('37.331741');
      expect(url).toContain('-122.030333');
    });
  });
});
