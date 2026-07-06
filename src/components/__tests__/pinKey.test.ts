import { pinKey } from '@/lib/pinKey';
import type { FlagRow } from '@/types/database';

// S14 guard (PROTECT-15): the native custom teardrop marker snapshots once
// (tracksViewChanges={false}), so its key MUST change whenever a pixel-affecting
// input changes — and MUST stay stable otherwise, or a status/severity change
// would freeze a stale marker (or a time-varying key would re-rasterize every
// pin every render). This pins the key's exact axes: severity, anon, resolved,
// category, flag id — and, critically, that nothing else (e.g. created_at) leaks
// in. Opacity/focus dimming is a native Marker prop, deliberately NOT keyed.

function flag(overrides: Partial<FlagRow> = {}): FlagRow {
  return {
    id: 'flag-1',
    lat: 49.88,
    lng: -119.5,
    category: 'no_ramp',
    severity: 3,
    description: 'test',
    photo_url: null,
    status: 'open',
    user_id: 'user-1',
    created_at: '2026-07-05T00:00:00.000Z',
    ...overrides,
  } as FlagRow;
}

describe('pinKey — content-derived marker key (S14 / PROTECT-15)', () => {
  it('is stable for identical content', () => {
    expect(pinKey(flag())).toBe(pinKey(flag()));
  });

  it('does NOT change when only created_at (a time value) changes', () => {
    // The steady state must never re-rasterize — no time-derived value in the key.
    expect(pinKey(flag({ created_at: '2020-01-01T00:00:00.000Z' }))).toBe(pinKey(flag()));
  });

  it('changes when severity changes', () => {
    expect(pinKey(flag({ severity: 4 }))).not.toBe(pinKey(flag({ severity: 3 })));
  });

  it('changes when a flag becomes anonymous (severity fill kept, ring differs)', () => {
    expect(pinKey(flag({ user_id: null }))).not.toBe(pinKey(flag({ user_id: 'user-1' })));
  });

  it('changes when status becomes resolved (glyph flips to a check)', () => {
    expect(pinKey(flag({ status: 'resolved' }))).not.toBe(pinKey(flag({ status: 'open' })));
  });

  it('changes when the category changes (different glyph)', () => {
    expect(pinKey(flag({ category: 'broken_sidewalk' }))).not.toBe(
      pinKey(flag({ category: 'no_ramp' })),
    );
  });

  it('changes for different flag ids', () => {
    expect(pinKey(flag({ id: 'a' }))).not.toBe(pinKey(flag({ id: 'b' })));
  });
});
