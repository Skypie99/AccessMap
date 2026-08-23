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
  // RE-PINNED 2026-08-21 (Phase 2a). Home's row label is composed by the shared
  // `FlagCard` now, so the rule is asserted where the sentence is built. This is
  // a strengthening rather than a move: ONE builder serves Home and every future
  // list row, so the abbreviation cannot creep back into one of them alone.
  const src = read('components/ui/FlagCard.tsx');

  it('the row accessible label uses speakDistance, never formatDistance', () => {
    expect(src).toContain('${speakDistance(distanceKm)}');
    // formatDistance still drives the VISIBLE census — that is correct, and this
    // assertion would be wrong to make absolute. Pin only that the a11y label
    // no longer carries the abbreviation.
    expect(src).toContain('formatDistance(distanceKm)');
    expect(src).not.toMatch(/\$\{formatDistance\([^)]*\)\}[^`]*`/);
  });

  it('and Home no longer composes a row label of its own to drift from it', () => {
    expect(read('screens/HomeScreen.tsx')).not.toContain('speakDistance(');
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

/**
 * A3/A4 (D18) — THE ASYNC ESTATE SPEAKS (art-direction Phase 3, 2026-08-22).
 *
 * `accessibilityLiveRegion` is ANDROID-ONLY in React Native. Four surfaces
 * rendered a spinner inside one and called it covered; on iOS VoiceOver they
 * fetched, filled and finished in total silence. Three of them did not even
 * label the spinner, so a VoiceOver user who found it heard nothing at all —
 * worse than silence, because they know something is there.
 *
 * The house pattern, documented at ReportContentModal's "RUNG 1" block, is to
 * pair the region with an explicit iOS-only announce. iOS-only matters: on
 * Android the region already speaks, and firing both is the double-announce
 * ReportFlagModal retired at S10. So each site is asserted for all three
 * facts — a labelled spinner, a live region, and an announce behind an iOS
 * gate — because any one alone is a half-fix that looks finished.
 */
describe('A3/A4 — every async surface names its spinner and speaks its outcome', () => {
  const LOADING_SITES: [string, string][] = [
    ['components/StatusHistoryModal.tsx', 'Loading history'],
    ['components/NotificationPrefsModal.tsx', 'Loading your preferences'],
    ['screens/NotificationPreferencesScreen.tsx', 'Loading your preferences'],
    ['components/MyFeedbackModal.tsx', 'Loading your feedback'],
  ];

  it.each(LOADING_SITES)('%s labels its spinner (A4)', (rel, label) => {
    const src = read(rel);
    // Non-vacuity: the spinner has to be there for the label to mean anything.
    expect(src).toContain('<ActivityIndicator');
    expect(src).toContain(`accessibilityLabel="${label}"`);
  });

  it.each(LOADING_SITES)('%s renders that spinner inside a live region', (rel) => {
    expect(read(rel)).toContain('accessibilityLiveRegion="polite"');
  });

  it.each(LOADING_SITES)('%s pairs the region with an iOS-gated announce (A3)', (rel) => {
    const src = read(rel);
    expect(src).toContain('AccessibilityInfo.announceForAccessibility');
    // The gate itself. Without it Android speaks twice, which is the exact
    // regression S10 was opened to fix.
    expect(src).toMatch(/Platform\.OS [=!]==? 'ios'/);
  });

  /**
   * OUTCOME announcements — the HiddenCommentsModal pattern, back-ported.
   *
   * These are NOT iOS-gated, and the difference is deliberate rather than an
   * inconsistency: they answer the user's OWN action, there is no live region
   * rendered beside them to double up with, and on both platforms the result is
   * otherwise silent (a Switch flips, a row vanishes, a share sheet appears
   * after a pause). HiddenCommentsModal already announces exactly this way.
   */
  const OUTCOME_SITES: [string, string][] = [
    ['screens/SettingsScreen.tsx', 'PUSH_ENABLED_ANNOUNCEMENT'],
    ['screens/SettingsScreen.tsx', 'PUSH_DISABLED_ANNOUNCEMENT'],
    ['screens/SettingsScreen.tsx', 'EXPORT_STARTED_ANNOUNCEMENT'],
    ['screens/SettingsScreen.tsx', 'authorUnblockedAnnouncement'],
    ['components/MyWatchedModal.tsx', 'flagUnwatchedAnnouncement'],
  ];

  it.each(OUTCOME_SITES)('%s announces %s', (rel, symbol) => {
    // Whitespace-tolerant: a call long enough to wrap is still the same call,
    // and pinning the formatting would make this fail on a re-indent.
    const src = read(rel).replace(/\s+/g, ' ');
    expect(src).toMatch(new RegExp(`AccessibilityInfo\\.announceForAccessibility\\( ?${symbol}\\b`));
  });

  it('every announcement string lives in copy.ts, not inline at the call site', () => {
    // An announcement is the only version of the interface some users get, so
    // it is copy — and copy is Sky's, in one file she can read. An inline
    // string literal passed straight to announceForAccessibility is a
    // user-facing sentence written where nobody reviews it.
    const copy = read('lib/copy.ts');
    for (const [, symbol] of OUTCOME_SITES) {
      expect(copy).toContain(`export const ${symbol}`);
    }
    for (const symbol of [
      'STATUS_HISTORY_LOADING_ANNOUNCEMENT',
      'statusHistoryLoadedAnnouncement',
      'NOTIFICATION_PREFS_LOADING_ANNOUNCEMENT',
      'NOTIFICATION_PREFS_LOADED_ANNOUNCEMENT',
      'MY_FEEDBACK_LOADING_ANNOUNCEMENT',
      'myFeedbackLoadedAnnouncement',
    ]) {
      expect(copy).toContain(`export const ${symbol}`);
    }
    // W4: no em dashes in new copy, announcements included.
    const block = copy.slice(copy.indexOf('STATUS_HISTORY_LOADING_ANNOUNCEMENT'));
    expect(block.split('\n').filter((l) => !l.trim().startsWith('*')).join('\n')).not.toContain('—');
  });
});

/**
 * The label/hint parity items D18 collected alongside the announcements.
 * Each is one control that said less than its own siblings did.
 */
describe('A3 follow-ups — the controls that said less than their siblings', () => {
  it('B2: a Changelog row speaks its DATE, which only its badge showed', () => {
    // Every row otherwise sounded like "What's fixed, 4 items", with no way to
    // tell one release from the next.
    expect(read('components/ChangelogModal.tsx')).toContain(
      '${release.title}, ${release.date}, ${itemCount} item',
    );
  });

  it('B4: My Feedback chips sit in a NAMED radiogroup', () => {
    // The chips already declared role="radio". A radio with no group around it
    // announces its state and never its membership.
    const src = read('components/MyFeedbackModal.tsx');
    expect(src).toContain('accessibilityRole="radiogroup"');
    expect(src).toContain('accessibilityLabel="Filter feedback by category"');
  });

  it('B1: the Help search says what typing does, not just what it is', () => {
    const src = read('components/HelpModal.tsx');
    expect(src).toContain('accessibilityLabel="Search FAQ"');
    expect(src).toMatch(/accessibilityHint="Filters the questions and answers/);
  });

  const CLOSE_HINTS: [string, string][] = [
    ['components/MyWatchedModal.tsx', 'closeHint="Returns to your Profile"'],
    ['screens/NotificationPreferencesScreen.tsx', 'accessibilityHint="Returns to Settings"'],
  ];

  it.each(CLOSE_HINTS)('%s: Close says where it returns you', (rel, hint) => {
    expect(read(rel)).toContain(hint);
  });
});
