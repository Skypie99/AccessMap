/**
 * ANNOUNCE-COVERAGE guard (A11Y-204/205/206/207 — the status-message cluster).
 *
 * WCAG 4.1.3 says a status message must reach assistive tech without taking
 * focus. The house has real infrastructure for this (announce.ts, the web
 * shim, A11yLiveRegion, LiveStatusRegion) — the cluster this guard pins was
 * never about missing infrastructure, it was about branches nobody wired:
 *
 *   204 — MapScreen's filter result count rode accessibilityLiveRegion, which
 *         RN implements on ANDROID ONLY. iOS VoiceOver heard the zero case and
 *         nothing else.
 *   205 — TasksScreen's flash pill announced per call site, so the branches
 *         nobody remembered were silent: bulk-watch-all-already-watched, and
 *         both post-action refresh-reconcile failures. Fixed AT showFlash, so
 *         a future flash cannot be silent by omission.
 *   206 — FlagDetailModal's single-flag Watch/Unwatch was silent (the bulk
 *         path announced). VoiceOver does not re-read a focused button whose
 *         label changed, so the press appeared to do nothing.
 *   207 — SavedPlacesModal had no announce path at all, and surfaced failures
 *         through Alert.alert, a NO-OP on web: a failed save of the user's own
 *         data was silent AND invisible there.
 *
 * BLIND SPOT, stated plainly: this pins that the wiring EXISTS in source. That
 * the utterance actually reaches VoiceOver is device-script territory (rows
 * N-8/N-9) — react-native-web stubs announceForAccessibility, so jest can only
 * ever prove the call is made. "Verified wired, not assumed" is the ceiling
 * a static guard can reach; the device script is the rest.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('A11Y-204 — the map announces filter result counts on every platform', () => {
  const src = read('screens/MapScreen.tsx');

  it('announces the non-zero count explicitly, not via the Android-only live region', () => {
    expect(src).toContain('`${filteredFlags.length} of ${flags.length} flags shown`');
  });

  it('keeps the zero case on its richer recovery sentence (no bare "0 of N" ahead of it)', () => {
    expect(src).toContain('No flags match your active filters. Try clearing one, or reset them all.');
  });

  it('the live-region comment no longer overclaims platform coverage', () => {
    // The old comment said the live region "ensures AT announces" — false on
    // iOS, and exactly the kind of note that waves a reviewer past a real gap.
    expect(src).not.toContain('live region ensures AT announces');
  });
});

describe('A11Y-205 — every Tasks flash is a status message', () => {
  const src = read('screens/TasksScreen.tsx');

  it('showFlash announces by default (so a new flash cannot be silent by omission)', () => {
    expect(src).toMatch(
      /if \(opts\?\.announce !== false\) AccessibilityInfo\.announceForAccessibility\(msg\)/,
    );
  });

  it('the refresh-reconcile failure — an action with no other feedback — rides that path', () => {
    const failures = src.match(/showFlash\("Couldn't refresh — pull down to update\.", 'muted'\)/g);
    // Both post-action reconcile sites (bulk and single).
    expect(failures).toHaveLength(2);
  });

  it('bulk-watch with nothing new to watch still speaks', () => {
    expect(src).toContain('Already watching all ');
    // It reaches the user through showFlash, which now announces.
    expect(src).toMatch(/showFlash\(\s*\n?\s*alreadyWatched === 1/);
  });
});

describe('A11Y-206 — single-flag watch toggle announces its outcome', () => {
  const src = read('components/FlagDetailModal.tsx');

  it('both directions announce', () => {
    expect(src).toContain("announceForAccessibility('Stopped watching this flag')");
    expect(src).toContain("announceForAccessibility('Watching this flag')");
  });
});

describe('A11Y-207 — SavedPlaces surfaces its writes on every platform', () => {
  const src = read('components/SavedPlacesModal.tsx');

  it('a successful save announces', () => {
    expect(src).toContain('announceForAccessibility(`Saved ${trimmed}`)');
  });

  it('failed user-data writes announce AND render on web (notify, never Alert.alert)', () => {
    expect(src).toContain("notify('Could not save place', msg)");
    expect(src).toContain("notify('Could not remove place', msg)");
    expect(src).toContain('Could not save place. ${msg}');
    expect(src).toContain('Could not remove place. ${msg}');
  });

  it('no Alert.alert remains in the file (it is a no-op on web)', () => {
    expect(src).not.toContain('Alert.alert(');
  });
});

describe('SR-042 — spoken distances are spoken, not abbreviated', () => {
  const src = read('screens/HomeScreen.tsx');

  it('the Home row accessible label uses speakDistance, never formatDistance', () => {
    expect(src).toContain('${speakDistance(item.km)}');
    // formatDistance still drives the VISIBLE chip — that is correct, and this
    // assertion would be wrong to make absolute. Pin only that the a11y label
    // no longer carries the abbreviation.
    expect(src).not.toContain('${formatDistance(item.km)} away`');
  });
});

describe('A11Y-208 — every ReportFlagModal opener arms the focus-return latch', () => {
  const src = read('screens/MapScreen.tsx');

  it('the map long-press path registers before opening (both web and native branches)', () => {
    // Slice the REAL callback body, not a fixed character window. The window
    // used to be 2200 chars, which meant a long enough comment inside the
    // handler pushed register() out of view and failed this for a reason that
    // had nothing to do with focus return — exactly what happened when the
    // stale "Jordan Condition 2" note was corrected in place (2026-08-20).
    const start = src.indexOf('const handleMapLongPress');
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start, src.indexOf('\n  }, [', start));
    // register() sits ABOVE the platform split, so it covers both branches.
    const registerAt = fn.indexOf('reportTrigger.register()');
    const webBranchAt = fn.indexOf("Platform.OS === 'web'");
    expect(registerAt).toBeGreaterThan(-1);
    expect(registerAt).toBeLessThan(webBranchAt);
  });
});

describe('A11Y-222 — every list sheet has a NON-DRAG refresh path (2.5.7)', () => {
  const SHEETS: [string, string][] = [
    ['components/MyReportsModal.tsx', 'Reloads your reports'],
    ['components/MyWatchedModal.tsx', 'Reloads your watched flags'],
    ['components/ActivityFeedModal.tsx', 'Reloads recent activity'],
    ['components/MyFeedbackModal.tsx', 'Reloads your feedback'],
  ];

  it.each(SHEETS)('%s offers a labelled Refresh button beside Close', (rel, hint) => {
    const src = read(rel);
    // Pull-to-refresh is a DRAGGING movement. The alternatives that already
    // existed (close+reopen, tab-focus refetch) are real but undiscoverable
    // as refresh — which is what made this a finding rather than a pass.
    expect(src).toContain('accessibilityLabel="Refresh"');
    expect(src).toContain(hint);
    // Still a pull-refresh surface — the button is an ADDITION, not a swap.
    expect(src).toContain('RefreshControl');
  });
});
