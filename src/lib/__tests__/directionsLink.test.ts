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
 *    parsing in either the `maps:`, `google.navigation:`, or `https:` schemes.
 *  - Walking-mode default — Flagstone is pedestrian-first (wheelchairs,
 *    walkers, sidewalks). If this default ever silently flips to driving,
 *    we want a test failure, not a user out on a freeway shoulder.
 *
 * The function is pure; we pass an explicit `platformOverride` so the
 * test doesn't depend on whatever `Platform.OS` Jest happens to report.
 */

import { getDirectionsUrl } from '../directionsLink';

describe('getDirectionsUrl', () => {
  describe('per-platform branching (walking-mode default)', () => {
    it('iOS → maps: scheme with daddr=lat,lng and dirflg=w', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'ios' });
      expect(url).toBe('maps:?daddr=37.331741,-122.030333&dirflg=w');
    });

    it('Android → google.navigation: scheme with mode=w (walking)', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'android' });
      expect(url).toBe('google.navigation:q=37.331741,-122.030333&mode=w');
    });

    it('Web → Google Maps universal dir/?api=1 link with travelmode=walking', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'web' });
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=37.331741,-122.030333&travelmode=walking',
      );
    });
  });

  describe('travel-mode option (override default)', () => {
    it('mode: driving → iOS uses dirflg=d', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, {
        mode: 'driving',
        platformOverride: 'ios',
      });
      expect(url).toBe('maps:?daddr=37.331741,-122.030333&dirflg=d');
    });

    it('mode: driving → Android uses mode=d', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, {
        mode: 'driving',
        platformOverride: 'android',
      });
      expect(url).toBe('google.navigation:q=37.331741,-122.030333&mode=d');
    });

    it('mode: driving → web uses travelmode=driving', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, {
        mode: 'driving',
        platformOverride: 'web',
      });
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=37.331741,-122.030333&travelmode=driving',
      );
    });

    it('mode: transit → iOS uses dirflg=r', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, {
        mode: 'transit',
        platformOverride: 'ios',
      });
      expect(url).toBe('maps:?daddr=37.331741,-122.030333&dirflg=r');
    });

    it('mode: transit → Android uses mode=transit', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, {
        mode: 'transit',
        platformOverride: 'android',
      });
      expect(url).toBe('google.navigation:q=37.331741,-122.030333&mode=transit');
    });

    it('mode: transit → web uses travelmode=transit', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, {
        mode: 'transit',
        platformOverride: 'web',
      });
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=37.331741,-122.030333&travelmode=transit',
      );
    });

    it('omitted mode defaults to walking (Flagstone is pedestrian-first)', () => {
      // No mode key on any platform → all three should yield walking URLs.
      expect(getDirectionsUrl(1, 2, { platformOverride: 'ios' })).toContain('dirflg=w');
      expect(getDirectionsUrl(1, 2, { platformOverride: 'android' })).toContain('mode=w');
      expect(getDirectionsUrl(1, 2, { platformOverride: 'web' })).toContain('travelmode=walking');
    });

    it('explicit mode: walking matches the default (round-trip safety)', () => {
      const explicit = getDirectionsUrl(1, 2, { mode: 'walking', platformOverride: 'web' });
      const implicit = getDirectionsUrl(1, 2, { platformOverride: 'web' });
      expect(explicit).toBe(implicit);
    });
  });

  describe('coordinate sign handling', () => {
    it('preserves positive coords (northern + eastern hemisphere)', () => {
      // Tokyo, Japan
      const url = getDirectionsUrl(35.6762, 139.6503, { platformOverride: 'ios' });
      expect(url).toBe('maps:?daddr=35.6762,139.6503&dirflg=w');
    });

    it('preserves negative latitude (southern hemisphere)', () => {
      // Sydney, Australia
      const url = getDirectionsUrl(-33.8688, 151.2093, { platformOverride: 'android' });
      expect(url).toBe('google.navigation:q=-33.8688,151.2093&mode=w');
    });

    it('preserves negative longitude (western hemisphere)', () => {
      // New York City
      const url = getDirectionsUrl(40.7128, -74.006, { platformOverride: 'web' });
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=40.7128,-74.006&travelmode=walking',
      );
    });

    it('preserves both-negative coords (south + west — e.g. Buenos Aires)', () => {
      const url = getDirectionsUrl(-34.6037, -58.3816, { platformOverride: 'ios' });
      expect(url).toBe('maps:?daddr=-34.6037,-58.3816&dirflg=w');
    });

    it('handles the null island (0, 0) without dropping the zero', () => {
      const url = getDirectionsUrl(0, 0, { platformOverride: 'web' });
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=0,0&travelmode=walking');
    });
  });

  describe('precision', () => {
    it('preserves 6 decimal places (≈11cm) without truncation', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'ios' });
      expect(url).toContain('37.331741');
      expect(url).toContain('-122.030333');
    });

    it('preserves sub-meter coords (7+ decimals) — no silent rounding', () => {
      // ~1cm precision — silly for street directions, but the formatter
      // should be a faithful pipe and not chop it.
      const url = getDirectionsUrl(37.3317412, -122.0303335, { platformOverride: 'android' });
      expect(url).toContain('37.3317412');
      expect(url).toContain('-122.0303335');
    });
  });

  describe('URL validity', () => {
    it('contains no spaces in any platform variant', () => {
      const ios = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'ios' });
      const android = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'android' });
      const web = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'web' });
      expect(ios).not.toMatch(/\s/);
      expect(android).not.toMatch(/\s/);
      expect(web).not.toMatch(/\s/);
    });

    it('iOS URL parses with the expected `maps:` scheme and dirflg', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'ios' });
      expect(url.startsWith('maps:')).toBe(true);
      expect(url).toMatch(/^maps:\?daddr=-?\d+(\.\d+)?,-?\d+(\.\d+)?&dirflg=[wdr]$/);
    });

    it('Android URL parses with the expected `google.navigation:` scheme and mode', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'android' });
      expect(url.startsWith('google.navigation:')).toBe(true);
      expect(url).toMatch(/^google\.navigation:q=-?\d+(\.\d+)?,-?\d+(\.\d+)?&mode=(w|d|transit)$/);
    });

    it('Web URL is a valid https URL with destination + travelmode params', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { platformOverride: 'web' });
      // URL constructor throws on malformed input — passing = passes.
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('www.google.com');
      expect(parsed.pathname).toBe('/maps/dir/');
      expect(parsed.searchParams.get('api')).toBe('1');
      expect(parsed.searchParams.get('destination')).toBe('37.331741,-122.030333');
      expect(parsed.searchParams.get('travelmode')).toBe('walking');
    });
  });

  describe('platformOverride / options default', () => {
    it('omitting options entirely uses Platform.OS and walking mode', () => {
      // The Jest harness reports Platform.OS as 'web' for RN tests, so
      // this exercises the default-branch fall-through. The exact value
      // doesn't matter — we only need to confirm that omitting the
      // argument yields a valid URL containing the coords AND walking.
      const url = getDirectionsUrl(37.331741, -122.030333);
      expect(url).toContain('37.331741');
      expect(url).toContain('-122.030333');
      // Whichever branch fires, walking should be present.
      expect(url).toMatch(/dirflg=w|mode=w|travelmode=walking/);
    });

    it('omitting platformOverride but passing mode still works', () => {
      const url = getDirectionsUrl(37.331741, -122.030333, { mode: 'driving' });
      expect(url).toContain('37.331741');
      expect(url).toMatch(/dirflg=d|mode=d|travelmode=driving/);
    });
  });
});
