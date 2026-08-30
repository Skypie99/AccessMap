/**
 * location.ts — initialLocationAction (MapScreen initial-mount permission gate).
 *
 * Regression guard for the "Finding your location…" banner hang: MapScreen
 * starts with `locating = true` and only fetches on mount when permission is
 * already granted. When it is NOT granted (undetermined on a fresh install, or
 * denied), the mount effect must skip the fetch AND clear the spinner —
 * otherwise the banner sits over an otherwise-working map forever. This locks
 * the decision that drives that behavior: only 'granted' fetches; everything
 * else resolves to 'clear'.
 */

import { initialLocationAction, locationErrorMessage, peekLocationState } from '@/lib/location';

describe('initialLocationAction — MapScreen mount permission gate', () => {
  it("fetches when permission is already granted", () => {
    expect(initialLocationAction('granted')).toBe('fetch');
  });

  it("clears the spinner when permission is undetermined (fresh install)", () => {
    // The exact hang scenario: first run, prompt deferred to onboarding.
    expect(initialLocationAction('undetermined')).toBe('clear');
  });

  it("clears the spinner when permission is denied", () => {
    expect(initialLocationAction('denied')).toBe('clear');
  });

  it("clears the spinner for any non-granted status (no hang)", () => {
    // Defensive: any unexpected/future status must never leave it fetching.
    for (const status of ['undetermined', 'denied', '', 'restricted', 'unknown']) {
      expect(initialLocationAction(status)).toBe('clear');
    }
  });
});

/**
 * D4/C2 — peekLocationState: what Home's map-peek caption may claim.
 *
 * The rule under test is an honesty rule, not a display rule. Only a read that
 * is genuinely in flight may say "Finding your location…"; denied, undetermined,
 * errored and timed-out are all indistinguishable from the user's side (the map
 * just shows its default region), so they collapse to one silent outcome rather
 * than narrating a search that isn't happening.
 */
describe('peekLocationState — the peek caption tells the truth', () => {
  const base = { location: null, loading: false, error: null, permissionDenied: false };
  const KELOWNA = { lat: 49.8874, lng: -119.4925 };

  it('reports located the moment a real fix exists', () => {
    expect(peekLocationState({ ...base, location: KELOWNA })).toBe('located');
  });

  it('a resolved fix wins even while a refresh is still in flight', () => {
    // We have a place to show, so the caption must not regress to "looking".
    expect(peekLocationState({ ...base, location: KELOWNA, loading: true })).toBe('located');
  });

  it('reports locating only for a genuine in-flight read', () => {
    expect(peekLocationState({ ...base, loading: true })).toBe('locating');
  });

  it('never claims to be looking once permission is denied', () => {
    // The load-bearing case: a denied check is briefly `loading` too.
    expect(peekLocationState({ ...base, loading: true, permissionDenied: true })).toBe('default');
  });

  it('never claims to be looking over a failure or a timeout', () => {
    expect(
      peekLocationState({ ...base, loading: true, error: 'Location request timed out.' }),
    ).toBe('default');
    expect(peekLocationState({ ...base, error: 'Could not get location.' })).toBe('default');
  });

  it('says nothing at all when the probe was never mounted (undetermined)', () => {
    expect(peekLocationState(base)).toBe('default');
  });

  it('only ever answers with one of the three honest states', () => {
    const flags = [false, true];
    for (const location of [null, KELOWNA]) {
      for (const loading of flags) {
        for (const permissionDenied of flags) {
          for (const error of [null, 'boom']) {
            expect(['located', 'locating', 'default']).toContain(
              peekLocationState({ location, loading, error, permissionDenied }),
            );
          }
        }
      }
    }
  });
});

describe('locationErrorMessage — Prompt B B2/Fable B-UX-003 presentation boundary', () => {
  it('passes the specific timeout message through unchanged', () => {
    expect(
      locationErrorMessage(new Error('Location request timed out. Check your signal and try again.')),
    ).toBe('Location request timed out. Check your signal and try again.');
  });

  it('replaces a raw native diagnostic with the calm, actionable copy', () => {
    // The exact shape expo-location/CoreLocation can surface on iOS — this is
    // precisely the text that must never reach the user.
    expect(locationErrorMessage(new Error('kCLErrorDomain error 0.'))).toBe(
      "Couldn't get your location. Check that Location Services is on and try again. You can keep using the map without it.",
    );
  });

  it('replaces a bare/empty error the same way', () => {
    expect(locationErrorMessage(new Error())).toBe(
      "Couldn't get your location. Check that Location Services is on and try again. You can keep using the map without it.",
    );
    expect(locationErrorMessage(undefined)).toBe(
      "Couldn't get your location. Check that Location Services is on and try again. You can keep using the map without it.",
    );
  });

  it('never leaks a raw native code/domain string into the returned copy', () => {
    const result = locationErrorMessage(new Error('kCLErrorDomain error 1: some native detail'));
    expect(result).not.toContain('kCLErrorDomain');
    expect(result).not.toContain('error 1');
  });
});
