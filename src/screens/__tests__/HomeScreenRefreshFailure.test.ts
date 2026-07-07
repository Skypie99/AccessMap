/**
 * HomeScreenRefreshFailure.test.ts — B9b (L7-02) source invariants.
 *
 * Home's error card only renders when the list is EMPTY (`error && flags.length
 * === 0`). So a refresh that fails while barriers are already on screen used to
 * be swallowed — the stale data read as current. B9b adds a sibling, live,
 * tappable notice for exactly that case, ceding to the offline banner when we
 * actually fell back to the cache.
 *
 * Like reportFabFreshLocation.test.ts these are SOURCE-LEVEL invariants (a full
 * HomeScreen render pulls navigation/drawer/map context); they pin the fix's
 * semantic anchors, not line numbers — they survive refactors but trip if the
 * notice or its guard is removed.
 */
import * as fs from 'fs';
import * as path from 'path';

const home = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.tsx'), 'utf8');

/** A window of `len` chars from the first occurrence of `anchor`. */
function around(haystack: string, anchor: string, len = 600): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('B9b — Home surfaces a refresh that failed while data is on screen', () => {
  it('guards the notice on error + non-empty list + not-already-offline', () => {
    // The offline banner owns the cache-fallback case; this notice is the
    // no-cache failure that would otherwise be silent behind existing rows.
    expect(home).toContain('error && flags.length > 0 && !isOfflineCache');
  });

  it('shows an honest, tappable message', () => {
    const block = around(home, 'error && flags.length > 0 && !isOfflineCache');
    expect(block).toContain('refresh — showing older data');
    expect(block).toContain('Tap to try again');
  });

  it('is a live region and retries via refresh() when tapped', () => {
    const block = around(home, 'error && flags.length > 0 && !isOfflineCache');
    expect(block).toContain('accessibilityLiveRegion="polite"');
    expect(block).toContain('accessibilityRole="button"');
    expect(block).toContain('void refresh()');
  });

  it('still states the cache age on the offline banner (B9a)', () => {
    // The offline banner composes its age through the shared copy helper.
    expect(home).toContain('offlineBannerText(offlineCachedAt)');
  });
});
