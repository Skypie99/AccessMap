/**
 * SW-08 — the map peek must point at the data, not at San Francisco.
 *
 * ─── THE FINDING, AND THE PART OF IT THAT WAS WRONG ───────────────────────
 * The walk saw Home's map card captioned "No reports here yet. You could add
 * the first." over a San Francisco viewport, against a database of Kelowna
 * reports, and read it as the copy lying.
 *
 * The copy was telling the truth. `emptyLocal` requires `hasCenter`, so the
 * caption cannot appear on the fallback at all — what the walk hit was a
 * simulator located in San Francisco, where "no reports here" was exactly
 * right. Distances were correct throughout, as the finding itself noted.
 *
 * What WAS wrong is the thing underneath: `FALLBACK_PEEK_REGION` hardcodes
 * San Francisco, so a user with no location and no search — the case the
 * fallback exists for — got an empty map of a city this app has never had a
 * report in. Sky's call (2026-08-20): fix the viewport, leave the ratified copy
 * and its byte-pinned test alone.
 *
 * ─── THE HONESTY LINE THIS HELPER SITS ON ─────────────────────────────────
 * Fitting the loaded reports claims nothing about where the USER is. That
 * matters, because `regionContainsPoint`'s own docblock records the same fence:
 * a viewport is not a distance origin, and distances stay gated on a real
 * centre. This helper answers "where are the reports", never "where are you".
 */
import { regionFittingPoints } from '../distance';

describe('regionFittingPoints — the honest fallback', () => {
  it('returns null for an empty list rather than inventing a centre', () => {
    // The whole point. A made-up centre for no data is the San Francisco
    // mistake one step further along.
    expect(regionFittingPoints([])).toBeNull();
  });

  it('centres on a single report', () => {
    const r = regionFittingPoints([{ lat: 49.888, lng: -119.496 }]);
    expect(r?.latitude).toBeCloseTo(49.888, 6);
    expect(r?.longitude).toBeCloseTo(-119.496, 6);
  });

  it('does not zoom a single report to street level', () => {
    // One report has zero extent; without a floor the window would collapse and
    // arrive with no context around the pin.
    const r = regionFittingPoints([{ lat: 49.888, lng: -119.496 }]);
    expect(r?.latitudeDelta).toBeGreaterThanOrEqual(0.05);
    expect(r?.longitudeDelta).toBeGreaterThanOrEqual(0.05);
  });

  it('centres on the middle of a spread and covers all of it', () => {
    const pts = [
      { lat: 49.80, lng: -119.60 },
      { lat: 49.95, lng: -119.40 },
    ];
    const r = regionFittingPoints(pts)!;
    expect(r.latitude).toBeCloseTo(49.875, 6);
    expect(r.longitude).toBeCloseTo(-119.5, 6);
    // Padded, so the outermost reports are not flush against the edge.
    expect(r.latitudeDelta).toBeGreaterThan(0.15);
    expect(r.longitudeDelta).toBeGreaterThan(0.2);
  });

  it('ignores non-finite coordinates instead of producing a NaN viewport', () => {
    const r = regionFittingPoints([
      { lat: 49.888, lng: -119.496 },
      { lat: Number.NaN, lng: -119.4 },
    ])!;
    expect(Number.isFinite(r.latitude)).toBe(true);
    expect(Number.isFinite(r.longitudeDelta)).toBe(true);
    expect(r.latitude).toBeCloseTo(49.888, 6);
  });

  it('returns null when every point is unusable', () => {
    expect(regionFittingPoints([{ lat: Number.NaN, lng: Number.NaN }])).toBeNull();
  });
});

describe('SW-08 — HomeScreen wiring', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'HomeScreen.tsx'),
    'utf8',
  );

  it('the peek fits the loaded flags before falling back', () => {
    expect(src).toContain('regionFittingPoints(flags.map(');
    expect(src).toMatch(/\?\?\s*\n?\s*FALLBACK_PEEK_REGION/);
  });

  it('the peek map remounts when the fitted region changes', () => {
    // The no-centre view now depends on data that arrives after first paint.
    // PlatformMap takes `initialRegion`, so without a data-dependent key it
    // keeps whatever it mounted with and the fit never shows.
    expect(src).toContain('peek:fit:');
  });

  it('the ratified empty-local copy is untouched', () => {
    // Sky ratified this string at the Phase 3 gate and HomeScreen.emptyLocal
    // pins it byte-for-byte. SW-08 was not licence to reword it.
    expect(src).toContain(
      "const EMPTY_LOCAL_INVITE = 'No reports here yet. You could add the first.';",
    );
  });

  it('the caption still cannot fire without a real centre', () => {
    // The reason the copy was never the bug. If `hasCenter` ever leaves this
    // condition, a fitted-but-unlocated user starts being told there is nothing
    // "here" about a place they are not standing in.
    const block = src.slice(src.indexOf('const emptyLocal'), src.indexOf('const items'));
    expect(block).toContain('hasCenter');
  });
});
