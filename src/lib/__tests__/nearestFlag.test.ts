import { findNearestUnresolved, UNRESOLVED_STATUSES } from '../nearestFlag';
import type { FlagRow, FlagStatus } from '@/types/database';

function makeFlag(id: string, lat: number, lng: number, status: FlagStatus = 'open'): FlagRow {
  return {
    id,
    user_id: 'u1',
    lat,
    lng,
    category: 'no_ramp',
    severity: 3,
    description: null,
    photo_url: null,
    status,
    created_at: '2026-05-23T08:00:00Z',
  };
}

describe('UNRESOLVED_STATUSES', () => {
  it('is the documented [open, verified] tuple', () => {
    // The button copy and the SR label both depend on these labels, so
    // a silent reordering would mismatch the UI. Lock it in.
    expect(UNRESOLVED_STATUSES).toEqual(['open', 'verified']);
  });
});

describe('findNearestUnresolved', () => {
  // Three points near SF (close, far) — all open.
  const sfDowntown = { lat: 37.7749, lng: -122.4194 };
  const close = makeFlag('close', 37.78, -122.42); // ~0.6 km from sfDowntown
  const mid = makeFlag('mid', 37.85, -122.5); // ~12 km
  const far = makeFlag('far', 38.5, -123.0); // ~91 km
  const flags = [close, mid, far];

  it('returns null when location is null', () => {
    expect(findNearestUnresolved(flags, null)).toBeNull();
  });

  it('returns null when flag list is empty', () => {
    expect(findNearestUnresolved([], sfDowntown)).toBeNull();
  });

  it('returns null when no flag has an unresolved status', () => {
    const resolved = [
      makeFlag('r1', 37.78, -122.42, 'resolved'),
      makeFlag('r2', 37.79, -122.43, 'rejected'),
    ];
    expect(findNearestUnresolved(resolved, sfDowntown)).toBeNull();
  });

  it('finds the closest open flag', () => {
    const hit = findNearestUnresolved(flags, sfDowntown);
    expect(hit?.flag.id).toBe('close');
    expect(hit?.km).toBeGreaterThan(0);
    expect(hit?.km).toBeLessThan(2);
  });

  it('ignores resolved/rejected flags even when they would be closest', () => {
    // Put a resolved flag almost on top of the user — should still pick the
    // farther open one.
    const onTop = makeFlag('zoom', 37.7749, -122.4194, 'resolved');
    const hit = findNearestUnresolved([onTop, mid, far], sfDowntown);
    expect(hit?.flag.id).toBe('mid');
  });

  it('counts verified flags as unresolved', () => {
    const v = makeFlag('v', 37.775, -122.4195, 'verified');
    const hit = findNearestUnresolved([v, far], sfDowntown);
    expect(hit?.flag.id).toBe('v');
  });

  it('ties resolve to first input order', () => {
    const a = makeFlag('a', 37.7749, -122.4194); // exactly user pos
    const b = makeFlag('b', 37.7749, -122.4194); // also exactly user pos
    expect(findNearestUnresolved([a, b], sfDowntown)?.flag.id).toBe('a');
    expect(findNearestUnresolved([b, a], sfDowntown)?.flag.id).toBe('b');
  });

  it('returns the computed distance with the flag', () => {
    const hit = findNearestUnresolved(flags, sfDowntown);
    expect(hit).not.toBeNull();
    expect(typeof hit?.km).toBe('number');
    // 0.6 km is the expected value for `close` ≈ 37.78 / -122.42 vs SF downtown.
    expect(hit?.km).toBeCloseTo(0.6, 0);
  });
});
