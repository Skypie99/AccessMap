/**
 * BP13 / T9 — "Word every wait; never claim a zero." (F5-02 HIGH + F5-01/05/09)
 *
 * Two layers:
 *   1. copy.ts::failureBannerText is pure and importable, so it gets REAL
 *      behavioural coverage (the single-sourced failure register the three
 *      screens now share).
 *   2. The screen wirings are SOURCE-LEVEL invariants (full MapScreen / Home /
 *      Report renders pull maps/nav/location context — see MapScreen.arrival and
 *      MapScreenLocateFailure), pinning that no settled failure ever computes a
 *      "0 barriers" / "Showing 0 flags" census, that the wait is worded, and that
 *      the retry verb / provider message are single-sourced (not re-forked).
 */
import * as fs from 'fs';
import * as path from 'path';
import { failureBannerText, RETRY_VERB } from '@/lib/copy';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
function around(haystack: string, anchor: string, len = 700): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('copy.ts — the one true failure register (behavioural)', () => {
  it('appends the retry verb to a bare provider message', () => {
    expect(failureBannerText('Couldn’t load flags: network down')).toBe(
      `Couldn’t load flags: network down. ${RETRY_VERB}`,
    );
  });

  it('does NOT double the verb when the message already carries it (case-insensitive)', () => {
    expect(failureBannerText('Offline. Tap to retry.')).toBe('Offline. Tap to retry.');
    expect(failureBannerText('offline — TAP TO RETRY.')).toBe('offline — TAP TO RETRY.');
  });

  it('B-UX-001: does NOT double the period when the provider message already ends in one', () => {
    // FEATURE_UNAVAILABLE ends in its own period; the composed banner must have
    // exactly one sentence boundary at the join, not "…yet.. Tap to retry."
    expect(failureBannerText("That feature isn't available yet.")).toBe(
      "That feature isn't available yet. Tap to retry.",
    );
  });

  it('the retry verb is a plain second sentence (not an em-dash status line)', () => {
    expect(RETRY_VERB).toBe('Tap to retry.');
    expect(RETRY_VERB).not.toContain('—');
  });
});

describe('T9 — Home never announces a false census; the wait is worded', () => {
  const home = read('HomeScreen.tsx');
  const headline = around(home, 'error && flags.length === 0', 260);

  it('the headline is gated on a SETTLED failure (error && flags.length === 0), never "0 barriers"', () => {
    // The count branch must sit BEHIND the error gate so a settled failure never
    // computes `${flags.length} barriers` with flags.length === 0.
    expect(headline).toContain('error && flags.length === 0');
    expect(headline).toContain("? '…'");
  });

  it('the first-load wait says "Loading…" instead of a bare display-size em-dash', () => {
    expect(headline).toContain("showFirstLoad");
    expect(headline).toContain("'Loading…'");
  });
});

describe('T9 — Map pill grows an honest fourth arm; the banner speaks one register', () => {
  const map = read('MapScreen.tsx');

  it('the pill has the fourth honest arm — never "Showing 0 flags" on a settled failure', () => {
    const pill = around(map, "'Loading flags…'", 700);
    expect(pill).toContain('loadError && flags.length === 0');
    expect(pill).toContain('Couldn\'t load flags');
    // the S11 loading strings + the count strings are untouched (words the states around it)
    expect(pill).toContain("'Loading flags…'");
    expect(pill).toContain('Showing ${flags.length} flag');
  });

  it('the error banner appends the retry verb via the single source (no new child)', () => {
    expect(map).toContain('failureBannerText(loadError)');
    expect(map).toContain("import { failureBannerText, offlineBannerText } from '@/lib/copy'");
  });
});

describe('T9 — Tasks routes the shared recipe; Report words the submit wait', () => {
  it('Tasks adopts copy.ts::failureBannerText (the recipe it originally held inline)', () => {
    const tasks = read('TasksScreen.tsx');
    expect(tasks).toContain('failureBannerText(flagsError)');
    // the inline `. Tap to retry.` literal is gone from Tasks (single-sourced now)
    expect(tasks).not.toContain('`${flagsError}. Tap to retry.`');
  });

  it('Report keeps WORDS beside the submit spinner while pending', () => {
    const report = read('ReportFlagModal.tsx');
    // anchor on the busy-row itself — there are several `submitting ?` sites
    // (the stall banner, photo-nudge gates), only this one is the submit CTA.
    const busy = around(report, 'styles.submitBusyRow}>', 240);
    expect(busy).toContain('ActivityIndicator');
    expect(busy).toContain('Filing your report…');
    // the words sit BESIDE the spinner (row), not stacked below it
    expect(report).toContain("submitBusyRow: { flexDirection: 'row'");
  });
});
