import fs from 'fs';
import path from 'path';
/**
 * Tests for src/lib/reports.ts — the Apple 1.2(b) report envelope (§SKY-3g,
 * Option B: encode-in-body, zero schema).
 *
 * What these protect:
 *  - The ROUND TRIP. `parseReportBody` is the recorded post-launch backfill
 *    tool, so build→parse being a true inverse is the whole design, not a
 *    nicety. If it drifts, historical [REPORT] rows become unparseable.
 *  - TRUNCATION SAFETY. Header-first ordering means neither the 5000-char DB
 *    cap nor MAX_BODY_CHARS can ever reach the target id. This is asserted at
 *    every cut, not argued.
 *  - The 'skipped' ⇒ failed rule (F38). A rate-limited insert must never read
 *    as a delivered report.
 *  - The category is 'other' and stays inside the existing enum — an
 *    `alter type` is the thing §SKY-3g refused.
 *
 * `../feedbackStore` is mocked (not supabase): the primitive already has its
 * own suite, and mocking at the seam keeps this file about the envelope.
 */
import {
  REPORT_BODY_PREFIX,
  REPORT_ENVELOPE_VERSION,
  REPORT_FEEDBACK_CATEGORY,
  MAX_REPORT_REASON_CHARS,
  buildReportBody,
  parseReportBody,
  submitContentReport,
  type ReportTarget,
} from '../reports';
import { REPORT_CATEGORIES } from '../copy';
import { FEEDBACK_CATEGORIES, MAX_BODY_CHARS, buildMailtoUrl } from '../feedback';
import { submitFeedback } from '../feedbackStore';

jest.mock('../feedbackStore', () => ({ submitFeedback: jest.fn() }));

const mockSubmitFeedback = submitFeedback as jest.MockedFunction<typeof submitFeedback>;

// Real uuid shapes — the ids this envelope carries are uuid PKs (flags.id,
// flag_comments.id), and a 36-char id is what the truncation assertions count.
const COMMENT_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const FLAG_ID = 'b1e2c3d4-5678-4abc-9def-0123456789ab';

/** The insert that reached the primitive, for shape assertions. */
function sentPayload(): { body: string; category: string; userId?: string } {
  const call = mockSubmitFeedback.mock.calls[0]?.[0];
  expect(call).toBeDefined();
  return call as unknown as { body: string; category: string; userId?: string };
}

/** A successful insert. The row shape only has to satisfy the discriminator. */
function insertedOnce(): void {
  mockSubmitFeedback.mockResolvedValueOnce({
    status: 'inserted',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: { id: 'f1' } as any,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// buildReportBody / parseReportBody — the round trip
// ---------------------------------------------------------------------------

describe('the envelope round-trips', () => {
  it('carries a comment report with its parent flag', () => {
    const target: ReportTarget = { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID };
    const reason = 'This is abusive toward the person who reported the ramp.';

    const body = buildReportBody(target, reason);
    expect(body.split('\n')[0]).toBe(
      `[REPORT] v2 target=comment id=${COMMENT_ID} flag=${FLAG_ID}`,
    );

    const parsed = parseReportBody(body);
    expect(parsed).toEqual({
      version: REPORT_ENVELOPE_VERSION,
      target: { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID },
      reason,
    });
  });

  it('carries a flag report, and OMITS the flag= token (its target is the flag)', () => {
    const target: ReportTarget = { kind: 'flag', id: FLAG_ID };
    const reason = 'The photo on this flag shows a stranger, not the entrance.';

    const body = buildReportBody(target, reason);
    expect(body.split('\n')[0]).toBe(`[REPORT] v2 target=flag id=${FLAG_ID}`);
    expect(body).not.toContain('flag=');

    expect(parseReportBody(body)).toEqual({
      version: REPORT_ENVELOPE_VERSION,
      target: { kind: 'flag', id: FLAG_ID },
      reason,
    });
  });

  it('never repeats the uuid: a flag target ignores a stray flagId', () => {
    // The type permits it (one shape for both kinds); the encoder must not.
    const body = buildReportBody({ kind: 'flag', id: FLAG_ID, flagId: FLAG_ID }, 'why');
    expect(body.split('\n')[0]).toBe(`[REPORT] v2 target=flag id=${FLAG_ID}`);
  });

  it('a comment report without a known parent flag still encodes and parses', () => {
    const body = buildReportBody({ kind: 'comment', id: COMMENT_ID }, 'why');
    expect(body.split('\n')[0]).toBe(`[REPORT] v2 target=comment id=${COMMENT_ID}`);
    expect(parseReportBody(body)?.target).toEqual({ kind: 'comment', id: COMMENT_ID });
  });

  describe('v2 · the category token (§3, D-1 SUPPLEMENT)', () => {
    it('appends cat= after flag=, and round-trips', () => {
      const body = buildReportBody({ kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID }, 'why', 'harassment');
      expect(body.split('\n')[0]).toBe(
        `[REPORT] v2 target=comment id=${COMMENT_ID} flag=${FLAG_ID} cat=harassment`,
      );
      expect(parseReportBody(body)?.category).toBe('harassment');
    });

    it('OMITS the token entirely when no category was picked', () => {
      // Not `cat=` — an empty token is indistinguishable from a truncated one.
      const body = buildReportBody({ kind: 'flag', id: FLAG_ID }, 'why');
      expect(body).not.toContain('cat=');
      expect(parseReportBody(body)?.category).toBeUndefined();
    });

    it('encodes a category with an EMPTY reason — the one-tap report D-1 allows', () => {
      const body = buildReportBody({ kind: 'flag', id: FLAG_ID }, '', 'spam');
      const parsed = parseReportBody(body);
      expect(parsed?.category).toBe('spam');
      expect(parsed?.reason).toBe('');
    });

    it.each(REPORT_CATEGORIES.map((c) => c.id))('round-trips category %s', (id) => {
      const body = buildReportBody({ kind: 'flag', id: FLAG_ID }, 'why', id);
      expect(parseReportBody(body)?.category).toBe(id);
    });

    it('DROPS an unknown category rather than rejecting the whole report', () => {
      // Fail-open: a row whose label this build does not know is still a real
      // report with a target and a reason. Losing it would be the worse error.
      const parsed = parseReportBody(`[REPORT] v2 target=flag id=${FLAG_ID} cat=wat\n\nwhy`);
      expect(parsed).not.toBeNull();
      expect(parsed?.category).toBeUndefined();
      expect(parsed?.reason).toBe('why');
    });
  });

  describe('v1 rows still parse — old rows do not rewrite themselves', () => {
    it('reads a stored v1 comment report', () => {
      const parsed = parseReportBody(
        `[REPORT] v1 target=comment id=${COMMENT_ID} flag=${FLAG_ID}\n\nold reason`,
      );
      expect(parsed).toEqual({
        version: 1,
        target: { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID },
        reason: 'old reason',
      });
      // No category key at all on a v1 row, rather than an explicit undefined.
      expect(parsed && 'category' in parsed).toBe(false);
    });

    it('reads a stored v1 flag report', () => {
      expect(parseReportBody(`[REPORT] v1 target=flag id=${FLAG_ID}\n\nold`)?.version).toBe(1);
    });
  });

  it('survives a multi-line reason verbatim (only the ends are trimmed)', () => {
    const reason = 'First line.\n\nSecond paragraph — with an em dash.';
    const body = buildReportBody({ kind: 'flag', id: FLAG_ID }, `  ${reason}\n `);
    expect(parseReportBody(body)?.reason).toBe(reason);
  });

  it('anchors the prefix at index 0 so `body LIKE \'[REPORT]%\'` matches', () => {
    const body = buildReportBody({ kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID }, 'why');
    expect(body.indexOf(REPORT_BODY_PREFIX)).toBe(0);
    // The DB half trims the body; the prefix must survive that untouched.
    expect(body.trim().indexOf(REPORT_BODY_PREFIX)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Truncation safety — the reason for header-first ordering
// ---------------------------------------------------------------------------

describe('truncation can only ever eat the reason', () => {
  const target: ReportTarget = { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID };
  const longReason = 'x'.repeat(4000);
  const body = buildReportBody(target, longReason);
  const headerLength = body.indexOf('\n');

  // Every cut from "header line just terminated" upward, including both real
  // downstream caps. Cuts below headerLength are covered separately (they must
  // fail closed, not half-parse).
  const cuts = [headerLength + 1, headerLength + 2, 200, 500, 1000, MAX_BODY_CHARS, 5000];

  it.each(cuts)('a body cut at %i still yields the intact full-length id', (cut) => {
    const parsed = parseReportBody(body.slice(0, cut));
    expect(parsed).not.toBeNull();
    expect(parsed?.target.id).toBe(COMMENT_ID);
    expect(parsed?.target.id).toHaveLength(36);
    expect(parsed?.target.flagId).toBe(FLAG_ID);
  });

  it.each(cuts)('a body cut at %i yields a PREFIX of the reason, never garbage', (cut) => {
    const parsed = parseReportBody(body.slice(0, cut));
    expect(longReason.startsWith(parsed?.reason ?? '')).toBe(true);
  });

  it('a cut INSIDE the header fails closed rather than reporting half an id', () => {
    // The header line is unterminated, so it cannot be trusted as complete.
    expect(parseReportBody(body.slice(0, headerLength - 5))).toBeNull();
    expect(parseReportBody(body.slice(0, headerLength))).toBeNull();
  });

  it('the worst case fits BOTH the 5000-char DB cap and MAX_BODY_CHARS', () => {
    // Worst case = the longer header (comment + parent flag) at the reason cap.
    const worst = buildReportBody(target, 'y'.repeat(MAX_REPORT_REASON_CHARS));
    expect(worst.length).toBeLessThanOrEqual(5000);
    expect(worst.length).toBeLessThanOrEqual(MAX_BODY_CHARS);
    // And nothing is lost: it round-trips after both caps are applied.
    expect(parseReportBody(worst.slice(0, MAX_BODY_CHARS))?.reason).toHaveLength(
      MAX_REPORT_REASON_CHARS,
    );
  });

  it('the reason cap matches MAX_COMMENT_LENGTH, its stated precedent', () => {
    expect(MAX_REPORT_REASON_CHARS).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// parseReportBody — what it must refuse
// ---------------------------------------------------------------------------

describe('parseReportBody refuses anything that is not an envelope', () => {
  it('a plain feedback body', () => {
    expect(parseReportBody('The map is blank on my phone.\n\nPlease help.')).toBeNull();
  });

  it('a body that only mentions the prefix further in', () => {
    expect(parseReportBody('see the [REPORT] below\n\n[REPORT] v1 target=flag id=x')).toBeNull();
  });

  it('an unknown target kind', () => {
    expect(parseReportBody(`[REPORT] v1 target=user id=${FLAG_ID}\n\nwhy`)).toBeNull();
  });

  it('a missing id', () => {
    expect(parseReportBody('[REPORT] v1 target=comment\n\nwhy')).toBeNull();
    expect(parseReportBody('[REPORT] v1 target=comment id=\n\nwhy')).toBeNull();
  });

  it('a header with trailing junk (half-read is worse than not read)', () => {
    expect(parseReportBody(`[REPORT] v1 target=flag id=${FLAG_ID} extra=1\n\nwhy`)).toBeNull();
  });

  it('a half-written flag= token, rather than reading the comment id alone', () => {
    expect(parseReportBody(`[REPORT] v1 target=comment id=${COMMENT_ID} flag=\n\nwhy`)).toBeNull();
  });

  it('a version this build cannot understand', () => {
    // One ABOVE the current generation, whatever that is — hard-coding a number
    // here would go stale silently the next time the envelope is bumped.
    const future = `v${REPORT_ENVELOPE_VERSION + 1}`;
    expect(parseReportBody(`[REPORT] ${future} target=flag id=${FLAG_ID}\n\nwhy`)).toBeNull();
    expect(parseReportBody(`[REPORT] v0 target=flag id=${FLAG_ID}\n\nwhy`)).toBeNull();
  });

  it('an empty string', () => {
    expect(parseReportBody('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// submitContentReport — the error discipline
// ---------------------------------------------------------------------------

describe('submitContentReport', () => {
  it('reports "submitted" only on a real insert, and sends the envelope', async () => {
    insertedOnce();

    const result = await submitContentReport({
      target: { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID },
      reason: 'Harassing another user.',
      userId: 'u1',
    });

    expect(result).toEqual({ status: 'submitted' });
    const payload = sentPayload();
    expect(parseReportBody(payload.body)).toEqual({
      version: REPORT_ENVELOPE_VERSION,
      target: { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID },
      reason: 'Harassing another user.',
    });
  });

  it('ships as an EXISTING feedback category, and that category is "other"', async () => {
    insertedOnce();
    await submitContentReport({
      target: { kind: 'flag', id: FLAG_ID },
      reason: 'why',
      userId: 'u1',
    });

    expect(sentPayload().category).toBe('other');
    expect(REPORT_FEEDBACK_CATEGORY).toBe('other');
    // The point of 'other': no `alter type ... add value` was needed (§SKY-3g).
    expect(FEEDBACK_CATEGORIES).toContain(REPORT_FEEDBACK_CATEGORY);
  });

  it('never asks for a contact email', async () => {
    insertedOnce();
    await submitContentReport({
      target: { kind: 'flag', id: FLAG_ID },
      reason: 'why',
      userId: 'u1',
    });
    expect(sentPayload()).not.toHaveProperty('contactEmail');
  });

  it('passes a guest through as an anonymous insert (the INSERT policy is public)', async () => {
    insertedOnce();
    await submitContentReport({ target: { kind: 'flag', id: FLAG_ID }, reason: 'why' });
    expect(sentPayload().userId).toBeUndefined();
  });

  it('maps a SKIPPED insert to failed — F38: the insert IS the channel', async () => {
    // The live enforce_feedback_rate_limit trigger caps anon at 30/h globally,
    // so this is a real outcome, not a theoretical one.
    mockSubmitFeedback.mockResolvedValueOnce({
      status: 'skipped',
      reason: 'new row violates rate limit',
    });

    const result = await submitContentReport({
      target: { kind: 'flag', id: FLAG_ID },
      reason: 'why',
    });

    expect(result).toEqual({ status: 'failed', reason: 'new row violates rate limit' });
  });

  it('never throws, even if the primitive rejects', async () => {
    mockSubmitFeedback.mockRejectedValueOnce(new Error('Network down'));

    const result = await submitContentReport({
      target: { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID },
      reason: 'why',
    });

    expect(result).toEqual({ status: 'failed', reason: 'Network down' });
  });

  it('never throws on a non-Error rejection either', async () => {
    mockSubmitFeedback.mockRejectedValueOnce('a string, not an Error');
    const result = await submitContentReport({
      target: { kind: 'flag', id: FLAG_ID },
      reason: 'why',
    });
    expect(result).toEqual({ status: 'failed', reason: 'Unknown error.' });
  });

  it('short-circuits an empty reason WITHOUT calling the primitive', async () => {
    const result = await submitContentReport({
      target: { kind: 'flag', id: FLAG_ID },
      reason: '   \n  ',
    });
    expect(result.status).toBe('failed');
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });

  it('short-circuits an empty target id WITHOUT calling the primitive', async () => {
    const result = await submitContentReport({ target: { kind: 'comment', id: '  ' }, reason: 'x' });
    expect(result.status).toBe('failed');
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });

  it('clamps an over-cap reason instead of letting a downstream cap decide', async () => {
    insertedOnce();
    await submitContentReport({
      target: { kind: 'comment', id: COMMENT_ID, flagId: FLAG_ID },
      reason: 'z'.repeat(4000),
      userId: 'u1',
    });

    const parsed = parseReportBody(sentPayload().body);
    expect(parsed?.reason).toHaveLength(MAX_REPORT_REASON_CHARS);
    // The id is still whole — the clamp cut the tail, not the header.
    expect(parsed?.target.id).toBe(COMMENT_ID);
    expect(sentPayload().body.length).toBeLessThanOrEqual(MAX_BODY_CHARS);
  });
});

describe('the mailto rung keeps [REPORT] on byte 0', () => {
  // REGRESSION GUARD, and it caught a real defect rather than anticipating one:
  // ReportContentModal originally passed `category` to sendFeedback, and
  // buildMailtoUrl prepends `Category: <Label>\n\n` whenever one is present —
  // so the email Sky triages began `Category: Other\n\n[REPORT] v1 …` and the
  // sentinel was no longer the first thing in the message.
  //
  // This rung fires ONLY when the database insert has already failed, and the
  // most likely cause of that is the C-7 anon throttle (30/h, global, shared
  // with ordinary feedback). So it is precisely the path where a report is most
  // at risk of being missed — the marker has to lead.
  //
  // The DB half is unaffected either way (feedbackStore inserts the body
  // verbatim, so `body LIKE '[REPORT]%'` still matches) and still carries
  // category 'other', which is what the recorded structured-columns backfill
  // keys on.
  const mailBody = (url: string) => decodeURIComponent(url.split('body=')[1] ?? '');

  it('a category prefix would displace the sentinel — which is why none is passed', () => {
    const body = buildReportBody({ kind: 'flag', id: 'abc' }, 'a reason');

    // What the app does now.
    expect(mailBody(buildMailtoUrl({ body })).startsWith(REPORT_BODY_PREFIX)).toBe(true);

    // What it must never go back to. Asserted so the failure names the cause.
    expect(mailBody(buildMailtoUrl({ body, category: 'other' })).startsWith(REPORT_BODY_PREFIX)).toBe(
      false,
    );
  });

  it('the report sheet passes no category (and no contact email) to the mailto half', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'ReportContentModal.tsx'),
      'utf8',
    );
    const start = src.indexOf('await sendFeedback(');
    // Comments are stripped before matching. The v2 category work put the WORD
    // "category" into an explanatory comment inside this call — legitimately,
    // since the category now travels INSIDE the envelope as `cat=` — and a raw
    // substring scan read that prose as the forbidden argument. The fence is
    // about the ARGUMENT, so match the argument, not the paragraph next to it.
    const call = src
      .slice(start, start + 600)
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // `category:` as an object property is what would make buildMailtoUrl
    // prepend "Category: <Label>\n\n" and knock [REPORT] off byte 0.
    expect(call).not.toMatch(/\bcategory\s*:/);
    expect(call).not.toMatch(/\bcontactEmail\s*:/);
    // …but the category MUST still reach the envelope builder, or the mailto
    // half would disagree with the insert half on the triage axis.
    expect(call).toMatch(/buildReportBody\([^)]*category/);
  });
});
