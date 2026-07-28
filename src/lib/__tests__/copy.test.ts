/**
 * copy.test.ts — B9 (L7-02): the offline banner now states the saved data's AGE.
 *
 * `offlineBannerText(cachedAt)` composes the age via the shared `relativeTime`
 * formatter (covered exhaustively in relativeTime.test.ts). Here we only pin the
 * banner's contract:
 *   - no timestamp  → the plain string (nothing regresses)
 *   - a timestamp   → the age is stated, and the "connect" tail is preserved
 */
import fs from 'fs';
import path from 'path';

import {
  OFFLINE_BANNER_TEXT,
  offlineBannerText,
  REPORT_CONTROL_LABEL,
  DISPUTE_CONTROL_LABEL,
  HIDE_CONTROL_LABEL,
  REPORT_REASON_LABEL,
  REPORT_SENT_TITLE,
  REPORT_SENT_BODY,
  REPORT_FAILED_TITLE,
  reportFailedBody,
  reportCommentA11yLabel,
  hideCommentA11yLabel,
  COMMENT_HIDDEN_ANNOUNCEMENT,
  HIDE_FAILED_TITLE,
  DISPUTE_RECORDED_MESSAGE,
  DISPUTE_ALREADY_RECORDED_MESSAGE,
  DISPUTE_STALE_MESSAGE,
  DISPUTE_FAILED_TITLE,
} from '../copy';

/** An ISO string `seconds` in the past relative to real now. */
function ago(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

describe('offlineBannerText (B9 / L7-02)', () => {
  it('falls back to the ageless banner when cachedAt is missing', () => {
    expect(offlineBannerText()).toBe(OFFLINE_BANNER_TEXT);
    expect(offlineBannerText(null)).toBe(OFFLINE_BANNER_TEXT);
    expect(offlineBannerText(undefined)).toBe(OFFLINE_BANNER_TEXT);
  });

  it('states the age for a known cachedAt (e.g. "from 2h ago")', () => {
    // 2h + a margin keeps us comfortably inside relativeTime's hour bucket.
    const text = offlineBannerText(ago(2 * 3600 + 30));
    expect(text).toContain('Showing saved data from 2h ago');
    // The decision-changing tail ("connect for the latest") is preserved.
    expect(text).toContain('connect for the latest');
  });

  it('says "just now" for a very fresh cache rather than an empty age', () => {
    expect(offlineBannerText(ago(5))).toContain('from just now');
  });

  it('never returns an empty or age-less string when a timestamp is present', () => {
    const text = offlineBannerText(ago(3 * 24 * 3600));
    expect(text).toContain('Showing saved data from 3d ago');
  });
});

/**
 * B-1 — the moderation control strings.
 *
 * Sky's governing statement (DECISIONS.md §SKY-3c) is that the three controls
 * are DISTINCT and must not be collapsed; she corrected an agent for offering
 * "Hide" as a wording for the report control. The distinctness assertion below
 * is that correction turned into a test, so the collapse cannot come back
 * quietly through a copy edit.
 *
 * The marker scan is the honesty fence made mechanical: every string here is a
 * PROPOSAL awaiting Sky's BP16 pass, and a const that loses its marker is a
 * string that has silently promoted itself to final.
 */
describe('B-1 moderation copy', () => {
  const THREE_CONTROLS = {
    REPORT_CONTROL_LABEL,
    DISPUTE_CONTROL_LABEL,
    HIDE_CONTROL_LABEL,
  };

  it('the three controls are three DISTINCT strings, never collapsed (§SKY-3c)', () => {
    const labels = Object.values(THREE_CONTROLS);
    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
  });

  it('the three controls are Sky\'s words, verbatim', () => {
    expect(REPORT_CONTROL_LABEL).toBe('Report');
    expect(DISPUTE_CONTROL_LABEL).toBe('Flag as wrong');
    expect(HIDE_CONTROL_LABEL).toBe('Hide');
  });

  it('no control label is a prefix or substring of another (a UI can tell them apart)', () => {
    const labels = Object.values(THREE_CONTROLS);
    for (const a of labels) {
      for (const b of labels) {
        if (a !== b) expect(a.includes(b)).toBe(false);
      }
    }
  });

  it('the per-row a11y names disambiguate WHICH comment, and carry the control verb', () => {
    // A row of buttons all named "Report" is ambiguous to a screen reader.
    expect(reportCommentA11yLabel('Ada')).toBe('Report comment by Ada');
    expect(hideCommentA11yLabel('Ada')).toBe('Hide comment by Ada');
    expect(reportCommentA11yLabel('Ada')).not.toBe(hideCommentA11yLabel('Ada'));
    // The author is interpolated, not assumed — an orphaned comment passes the
    // bubble's own anonymous fallback through unchanged.
    expect(reportCommentA11yLabel('Someone')).toContain('Someone');
  });

  it('the failure rung names the address it was handed, and promises nothing', () => {
    const body = reportFailedBody('help@example.com');
    expect(body).toContain('help@example.com');
    expect(body).not.toMatch(/\d+\s*(hour|day|business)/i);
  });

  it('no report string invents a response time, a review window, or an outcome', () => {
    const strings = [
      REPORT_REASON_LABEL,
      REPORT_SENT_TITLE,
      REPORT_SENT_BODY,
      REPORT_FAILED_TITLE,
      reportFailedBody('a@b.co'),
    ];
    for (const s of strings) {
      expect(s.length).toBeGreaterThan(0);
      // No promised interval ("within 24 hours", "in 2 business days").
      expect(s).not.toMatch(/\d+\s*(hour|day|business|week)/i);
      // No promised outcome ("will be removed", "will be banned").
      expect(s).not.toMatch(/will be (removed|deleted|banned|taken down)/i);
      // THE PROMISE IS THE VERB, not the tense. This rule exists because the
      // two above did not catch the real breach: "Reports are reviewed by the
      // AccessMap maintainer" shipped past them, since a present-tense passive
      // contains neither an interval nor "will be". A green fence test then
      // reads as evidence there is no promise, which is worse than no test.
      // Any claim that a review/moderation process happens is Sky's to make
      // (05 §3 ⑯), in any tense and any voice.
      expect(s).not.toMatch(
        /\b(are|is|was|were|get|gets|being|be)\s+(reviewed|moderated|investigated|actioned|assessed|triaged)\b/i,
      );
      expect(s).not.toMatch(/\bwe (review|moderate|investigate|check|read|action)\b/i);
      // No naming a human or team as the responsible reviewer.
      expect(s).not.toMatch(/\b(maintainer|moderator|our team|the team|support team)\b/i);
    }
  });

  it('the 1.2(c) strings stay a PERSONAL filter — never a takedown claim (§SKY-3h)', () => {
    // Hide is device-local (AsyncStorage). Any word implying the comment went
    // away for other people would be a moderation verdict this control cannot
    // deliver — and Sky's §SKY-3c correction was specifically about not letting
    // Hide and Report bleed into each other's meaning.
    for (const s of [HIDE_CONTROL_LABEL, COMMENT_HIDDEN_ANNOUNCEMENT, HIDE_FAILED_TITLE]) {
      expect(s).not.toMatch(/remov|delet|taken down|ban|moderat|report/i);
    }
    // And the announcement says WHOSE view changed, so "hidden" cannot be heard
    // as "hidden from everyone".
    expect(COMMENT_HIDDEN_ANNOUNCEMENT).toMatch(/this device/i);
  });

  it('the hide failure title admits failure without inventing a next step', () => {
    expect(HIDE_FAILED_TITLE.length).toBeGreaterThan(0);
    expect(HIDE_FAILED_TITLE).not.toMatch(/\d+\s*(hour|day|business|week)/i);
    expect(HIDE_FAILED_TITLE).not.toMatch(/try again|retry|we will|we'll/i);
  });

  it('no W1 answer counts down to a badge that is not shipped', () => {
    // `DISPUTE_THRESHOLD` is 2 and the RPC hands back the running total, so
    // "1 more needed" is one line away at all times. It must never be written:
    // the threshold's documented consequence is an additive `Disputed`
    // treatment, and NO surface renders one (`dispute_requests` is absent from
    // FlagRow and from every select() in flags.ts). A countdown would promise
    // an outcome the user cannot ever be shown.
    for (const s of [
      DISPUTE_RECORDED_MESSAGE,
      DISPUTE_ALREADY_RECORDED_MESSAGE,
      DISPUTE_STALE_MESSAGE,
      DISPUTE_FAILED_TITLE,
    ]) {
      expect(s.length).toBeGreaterThan(0);
      // No running tally and no countdown ("1 more", "2 people", "3 others").
      expect(s).not.toMatch(/\d+\s*(more|other|people|person|vote|report)/i);
      // No claim the flag now wears a mark, or that anything will happen to it.
      expect(s).not.toMatch(/disputed|marked|under review|will be/i);
      // No invented interval, same fence the report strings sit behind.
      expect(s).not.toMatch(/\d+\s*(hour|day|business|week)/i);
    }
  });

  it('the W1 answers stay distinct from the B-1 report answers (§SKY-3c)', () => {
    // Two different controls with two different meanings must not converge on
    // one sentence — that convergence is exactly what Sky corrected.
    const w1 = [DISPUTE_RECORDED_MESSAGE, DISPUTE_STALE_MESSAGE, DISPUTE_FAILED_TITLE];
    const b1 = [REPORT_SENT_BODY, REPORT_SENT_TITLE, REPORT_FAILED_TITLE];
    for (const a of w1) expect(b1).not.toContain(a);
    // And no W1 answer borrows the abuse register.
    for (const s of w1) expect(s).not.toMatch(/moderat|abuse|maintainer reviews/i);
  });

  it('carries no report-category taxonomy — that list is Sky\'s copy (05 §3 ⑯)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'copy.ts'), 'utf8');
    // Named in the fence, so named here. The words may appear in prose about
    // the taxonomy, but never as an exported string constant.
    for (const word of ['Harassment', 'Hate speech', 'Spam', 'Nudity', 'Violence']) {
      expect(src).not.toMatch(new RegExp(`=\\s*['"\`]${word}`, 'i'));
    }
  });
});

describe('B-1 copy carries the PROPOSED marker (the honesty fence, mechanised)', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'copy.ts'), 'utf8');
  const MARKER = "S-8) — Sky's final wording lands in DECISIONS §A / BP16.";

  const PROPOSED_EXPORTS = [
    'REPORT_CONTROL_LABEL',
    'DISPUTE_CONTROL_LABEL',
    'HIDE_CONTROL_LABEL',
    'REPORT_REASON_LABEL',
    'REPORT_SENT_TITLE',
    'REPORT_SENT_BODY',
    'REPORT_FAILED_TITLE',
    'reportFailedBody',
    'reportCommentA11yLabel',
    'hideCommentA11yLabel',
    'COMMENT_HIDDEN_ANNOUNCEMENT',
    'HIDE_FAILED_TITLE',
    'DISPUTE_RECORDED_MESSAGE',
    'DISPUTE_ALREADY_RECORDED_MESSAGE',
    'DISPUTE_STALE_MESSAGE',
    'DISPUTE_FAILED_TITLE',
  ];

  /**
   * The JSDoc block immediately preceding an export, flattened to one line.
   *
   * Flattening matters: the marker legitimately wraps across comment lines
   * (PRIVACY_POLICY_LINK_LABEL's does), so a raw substring scan would fail on a
   * perfectly compliant const and the guard would be reporting formatting, not
   * the fence.
   */
  function prose(name: string): string {
    const declaration = [`export const ${name}`, `export function ${name}`]
      .map((d) => SRC.indexOf(d))
      .find((i) => i >= 0);
    expect(declaration).toBeDefined();
    const before = SRC.slice(0, declaration);
    return before
      .slice(before.lastIndexOf('/**'))
      .replace(/^\s*\/\*\*/, '')
      .replace(/\*\/\s*$/, '')
      .replace(/^\s*\*\s?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  it.each(PROPOSED_EXPORTS)('%s is marked PROPOSED', (name) => {
    const doc = prose(name);
    expect(doc).toContain('PROPOSED (');
    expect(doc).toContain(MARKER);
  });

  it.each(PROPOSED_EXPORTS)('%s ends its JSDoc with the marker, exactly', (name) => {
    // The marker is the LAST thing said about the string — a const that buries
    // it mid-paragraph reads as final copy to the next person to skim the file.
    expect(prose(name).endsWith(MARKER)).toBe(true);
  });

  it('the precedent consts are untouched and still marked', () => {
    // RETRY_VERB and PRIVACY_POLICY_LINK_LABEL are the style this block copies.
    expect(prose('RETRY_VERB')).toContain(MARKER);
    expect(prose('PRIVACY_POLICY_LINK_LABEL')).toContain(MARKER);
  });
});
