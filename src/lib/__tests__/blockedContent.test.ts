/**
 * §SKY-7 — the blocked-content alert's route to the guidelines.
 *
 * Two things are worth testing here and they are not the same thing:
 *
 *   1. that the alert can tell a FILTER REJECTION apart from a network
 *      failure — get this wrong in the permissive direction and every failed
 *      submit invites the user to read the community guidelines, which is both
 *      wrong and faintly insulting;
 *   2. that pressing the button actually navigates.
 *
 * The residual this closes: `CONTENT_BLOCKED_MESSAGE` cites the guidelines from
 * inside an Alert, and an Alert cannot hold a link. It can hold a button.
 */
import fs from 'fs';
import path from 'path';
import { Alert, Platform } from 'react-native';
import { isContentBlockedError, showBlockedContentAlert } from '../blockedContent';
import { CONTENT_BLOCKED_MESSAGE, VIEW_GUIDELINES_LABEL } from '../copy';

type AlertButton = { text?: string; style?: string; onPress?: () => void };

describe('isContentBlockedError', () => {
  it('recognises the filter rejection thrown by comments.ts / flags.ts', () => {
    expect(isContentBlockedError(new Error(CONTENT_BLOCKED_MESSAGE))).toBe(true);
  });

  it('does NOT fire for an ordinary failure', () => {
    // The important negative. A network error offering "View guidelines" tells
    // the user they wrote something abusive when their wifi dropped.
    expect(isContentBlockedError(new Error('network request failed'))).toBe(false);
    expect(isContentBlockedError(new Error(''))).toBe(false);
  });

  it('does not fire for a message that merely CONTAINS the rejection text', () => {
    // Identity, not substring — a wrapped error that quotes the message is
    // still not the filter speaking.
    expect(isContentBlockedError(new Error(`Wrapped: ${CONTENT_BLOCKED_MESSAGE}`))).toBe(false);
  });

  it('survives non-Error throws without crashing the catch block', () => {
    expect(isContentBlockedError(undefined)).toBe(false);
    expect(isContentBlockedError(null)).toBe(false);
    expect(isContentBlockedError({ nope: true })).toBe(false);
  });
});

describe('showBlockedContentAlert — native', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    Platform.OS = 'ios';
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alertSpy.mockRestore());

  it('shows the caller\'s title and the ratified message, unchanged', () => {
    showBlockedContentAlert('Could not post comment', jest.fn());
    const [title, message] = alertSpy.mock.calls[0];
    expect(title).toBe('Could not post comment');
    // The body is Sky's ratified §2 text verbatim — this fix adds a button,
    // it does not reword the rejection.
    expect(message).toBe(CONTENT_BLOCKED_MESSAGE);
  });

  it('offers exactly two buttons: View guidelines, and a cancel-style OK', () => {
    showBlockedContentAlert('Could not post comment', jest.fn());
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text).toBe(VIEW_GUIDELINES_LABEL);
    expect(buttons[1].text).toBe('OK');
    expect(buttons[1].style).toBe('cancel');
  });

  it('the button navigates — this is the whole point of the fix', () => {
    const onViewGuidelines = jest.fn();
    showBlockedContentAlert('Could not post comment', onViewGuidelines);
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];

    expect(onViewGuidelines).not.toHaveBeenCalled(); // not until pressed
    buttons[0].onPress?.();
    expect(onViewGuidelines).toHaveBeenCalledTimes(1);
  });

  it('dismissing via OK navigates nowhere', () => {
    const onViewGuidelines = jest.fn();
    showBlockedContentAlert('Could not post comment', onViewGuidelines);
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    buttons[1].onPress?.();
    expect(onViewGuidelines).not.toHaveBeenCalled();
  });
});

describe('showBlockedContentAlert — web (F46)', () => {
  it('falls back to notify, because a buttoned Alert is a silent no-op on web', () => {
    Platform.OS = 'web';
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const windowAlert = jest.fn();
    (global as unknown as { window: { alert: unknown } }).window = { alert: windowAlert };

    showBlockedContentAlert('Could not post comment', jest.fn());

    expect(alertSpy).not.toHaveBeenCalled();
    expect(windowAlert).toHaveBeenCalledTimes(1);
    expect(String(windowAlert.mock.calls[0][0])).toContain(CONTENT_BLOCKED_MESSAGE);

    alertSpy.mockRestore();
    Platform.OS = 'ios';
  });
});

// ---------------------------------------------------------------------------
// The call sites, as source invariants.
//
// The unit tests above prove the helper behaves. These prove it is actually
// REACHED — and, just as importantly, that it is reached only for the blocked
// case. A catch that routed every failure here would offer the community
// guidelines to someone whose upload timed out.
// ---------------------------------------------------------------------------
describe('both throw sites route their rejection through the helper', () => {
  const SRC = path.resolve(__dirname, '..', '..');
  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

  const comment = read('components/FlagDetailModal.tsx');
  const flag = read('screens/ReportFlagModal.tsx');

  // Non-vacuity: substring checks against an empty read are free green.
  it('the guard is reading real files', () => {
    expect(comment.length).toBeGreaterThan(10000);
    expect(flag.length).toBeGreaterThan(10000);
  });

  // The expected call is written out literally, quoting and all, rather than
  // assembled from the title — the flag site's title contains an apostrophe and
  // is therefore double-quoted in source. Building the string here would be
  // re-deriving the source's own quoting rules in the test, which is exactly
  // the kind of cleverness that makes a guard fail for the wrong reason.
  it.each([
    ['comment submit', () => comment, "showBlockedContentAlert('Could not post comment'"],
    // The owner-EDIT path (code-qa 2026-08-06, Sky's Q-1 YES): editing text
    // into blocked content is the same 1.2(a) surface as posting it, so it
    // owes the same guidelines affordance.
    ['flag edit save', () => comment, "showBlockedContentAlert('Could not save changes'"],
    ['flag description submit', () => flag, 'showBlockedContentAlert("Couldn\'t submit your report"'],
  ])('%s is gated on isContentBlockedError and keeps its existing title', (_n, src, call) => {
    const s = src();
    expect(s).toContain('if (isContentBlockedError(e)) {');
    expect(s).toContain(call);
    // The callback moved from `() => setOpen('terms')` to `legal.openTerms`
    // on 2026-08-19. Not a refactor: both of these files are Modals, and iOS
    // refuses to present a second modal from an already-presenting view
    // controller — so the shared host could never open over them and this
    // affordance, the Apple 1.2(a) one, was dead on device in exactly the
    // place it was built for. `legal.openTerms` mounts the sheet locally and
    // presents from this modal's own VC. `openTerms` is a stable useCallback,
    // so it is passed directly rather than re-wrapped in an arrow.
    expect(s).toContain('legal.openTerms');
  });

  it('the non-blocked branch of each catch is untouched', () => {
    // The three two-argument assertions in ReportFlagModal.test.tsx and the
    // generic comment alert both depend on this staying as it was.
    // QA 2026-08-18: the comment branch moved from Alert.alert to notify() —
    // web-safe, and now consistent with its two siblings below. The invariant
    // this test protects (generic errors never route through
    // showBlockedContentAlert) is unchanged.
    expect(comment).toContain("notify('Could not post comment', errorMessage(e));");
    expect(comment).toContain("notify('Could not save changes', errorMessage(e));");
    expect(flag).toContain('notify("Couldn\'t submit your report", errorMessage(e));');
  });

  it('no site reaches for the terms without going through the helper', () => {
    // THE INVARIANT (unchanged since this guard was written, and unchanged by
    // the 2026-08-19 move to local mounts): opening the terms in these files
    // may only ever be the alert button's callback — never a bare call that
    // opens the guidelines unprompted. Only the expression being counted
    // changed, from setOpen('terms') to legal.openTerms.
    //
    // This used to be spelled "exactly one occurrence per file", which was the
    // same thing while each file had exactly one throw site. The edit path made
    // FlagDetailModal a two-site file, so the invariant is now checked
    // DIRECTLY: every occurrence must be paired with the helper. That detects
    // a bare call the count never could — a bare one added alongside a removed
    // guarded one would have kept the old count at 1 and passed.
    const PAIRED =
      /showBlockedContentAlert\(\s*(?:"[^"]*"|'[^']*')\s*,\s*legal\.openTerms\s*\)/g;
    for (const s of [comment, flag]) {
      const opens = (s.match(/legal\.openTerms/g) ?? []).length;
      const paired = (s.match(PAIRED) ?? []).length;
      expect(opens).toBeGreaterThan(0);
      expect(paired).toBe(opens);
    }
  });
});
