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

import { initialLocationAction } from '@/lib/location';

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
