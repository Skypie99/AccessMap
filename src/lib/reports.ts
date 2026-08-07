/**
 * The Apple 1.2(b) abuse-report envelope — Option B, encode-in-body.
 *
 * WHOSE DECISION THIS IS. Sky, DECISIONS.md §SKY-3g (2026-07-27), recorded
 * verbatim there: "Schema fork: OPTION B — encode-in-body via the existing
 * feedback pipeline ('[REPORT]' prefix + structured first line: target type/id
 * + reason field in the UI). NO enum ALTER, NO comment_id column now (enum
 * additions are effectively irreversible — post-launch migration to structured
 * columns is the recorded cleanup path)." Her triage path, also hers to state:
 * she reviews [REPORT] feedback on a regular cadence; comment takedowns via the
 * C-8 admin delete policy, flag takedowns via the existing hide/reject levers.
 *
 * WHAT THIS MODULE IS NOT. It is not a moderation policy, a response-time
 * promise, a review SLA, or a report-category taxonomy. Those are Sky's words
 * to write (05 §3 ⑯ assigns the ToS / guidelines / report-category text to
 * her), and nothing here may imply them. The reason field is free text for
 * exactly that reason: a fixed category list would be authored policy.
 *
 * WHY THE HEADER COMES FIRST. `submitFeedback` normalizes with
 * `body.trim().slice(0, 5000)` and the mailto half trims to `MAX_BODY_CHARS`.
 * With the header on line 1, either cut can only ever eat the REASON's tail —
 * the target id is unreachable by truncation. Put the reason first and a long
 * report loses the one field that makes it actionable.
 *
 * WHY `flag=` RIDES ALONG ON COMMENT REPORTS. C-8 deletes a comment by its own
 * id, but triage needs the flag for context, and the flag id survives if the
 * comment is deleted before Sky reads the report.
 *
 * WHY A VERSION TOKEN. `v1` makes the recorded structured-columns cleanup a
 * deterministic parse instead of a guess. `parseReportBody` IS that future
 * backfill tool, which is also what makes the encoding testable as a ROUND TRIP
 * rather than by eyeballing a format string.
 *
 * FINDING REPORTS IN SQL. `[` is not a LIKE metacharacter in Postgres (only `%`
 * and `_` are), so `where body like '[REPORT]%'` is a plain literal prefix match
 * — no ESCAPE clause needed. The recorded post-launch cleanup, written out so it
 * is a review of an existing statement rather than a fresh authoring job. NOT
 * applied by any agent — Sky runs migrations:
 *
 *   alter table public.feedback
 *     add column report_target_kind text,
 *     add column report_target_id   uuid,
 *     add column report_flag_id     uuid;
 *
 *   update public.feedback set
 *     report_target_kind = substring(body from '^\[REPORT\] v\d+ target=(\w+)'),
 *     report_target_id   = nullif(substring(body from ' id=([0-9a-fA-F-]{36})'), '')::uuid,
 *     report_flag_id     = nullif(substring(body from ' flag=([0-9a-fA-F-]{36})'), '')::uuid
 *   where body like '[REPORT]%';
 */
import { submitFeedback } from './feedbackStore';
import { REPORT_CATEGORIES, type ReportCategoryId } from './copy';
import { errorMessage } from './errors';
import type { FeedbackCategory } from './feedback';

/**
 * What a report points at. A comment report carries its parent flag as well;
 * a flag report's parent IS its target, so it omits the token rather than
 * repeating the same uuid twice.
 */
export type ReportTarget = {
  kind: 'flag' | 'comment';
  id: string;
  /** Parent flag of a reported comment. Ignored when `kind` is 'flag'. */
  flagId?: string;
};

/** Line-1 sentinel. Anchored at index 0 of the body, never indented. */
export const REPORT_BODY_PREFIX = '[REPORT]';

/**
 * Envelope generation. Bump only alongside a parser that reads BOTH shapes.
 *
 * v2 (2026-07-27) adds an optional ` cat=<id>` token carrying Sky's ratified
 * report category (§3). Optional, not required: D-1 chose SUPPLEMENT, so a
 * reporter may send a reason with no category, exactly as in v1. The parser
 * still accepts v1 rows unchanged — old rows do not rewrite themselves.
 */
export const REPORT_ENVELOPE_VERSION = 2;

/**
 * Cap on the user's reason text, matching `MAX_COMMENT_LENGTH` — the nearest
 * shipped precedent for user prose about one specific piece of content.
 *
 * Exported for the same reason `MAX_BODY_CHARS` is (F19): the input's
 * `maxLength` must be this exact number, or the UI accepts text that a
 * downstream cap silently drops. `submitContentReport` clamps as well, so a
 * caller that forgets cannot overflow the wire — see the note there.
 */
export const MAX_REPORT_REASON_CHARS = 500;

/**
 * The feedback category a report ships as.
 *
 * 'other' is the only existing enum member a report does not lie as: 'bug'
 * would title the mailto "AccessMap feedback: Bug" and file an abuse report as
 * an engineering defect. There is deliberately NO `alter type ... add value` —
 * per §SKY-3g, enum additions are effectively irreversible.
 */
export const REPORT_FEEDBACK_CATEGORY: FeedbackCategory = 'other';

/** What `parseReportBody` recovers from a stored feedback body. */
export type ParsedReport = {
  version: number;
  target: ReportTarget;
  reason: string;
  /** v2+ only, and optional even there — see REPORT_ENVELOPE_VERSION. */
  category?: ReportCategoryId;
};

/** Outcome of a report submission. See the error-discipline note below. */
export type SubmitReportResult =
  | { status: 'submitted' }
  | { status: 'failed'; reason: string };

// The whole of line 1. `\S` cannot cross the separating space, so the greedy id
// capture stops on its own before an optional ` flag=` token. The `$` anchor
// means a header with trailing junk — including a half-written `flag=` — is
// rejected rather than half-read.
//
// The id group is `\S*`, not `\S+`, on purpose: a bare `id=` then matches the
// shape and is refused by the explicit emptiness check in the parser, which is
// both reachable in tests and what narrows the capture to `string` for the
// compiler. A `\S+` group would be unfalsifiable and force a dead guard.
//
// v2 appends an optional ` cat=(\S+)` AFTER the optional ` flag=` token. Order
// is fixed, not free: a floating token set would make the greedy id capture
// ambiguous, and a v1 body — which has neither token — still matches because
// both groups are optional. That is what keeps the v1 reader alive for free.
const HEADER_RE =
  /^\[REPORT\] v(\d+) target=(flag|comment) id=(\S*)(?: flag=(\S+))?(?: cat=(\S+))?$/;

/** Category ids the parser will accept. Unknown ids are dropped, not fatal. */
const KNOWN_CATEGORY_IDS = new Set<string>(REPORT_CATEGORIES.map((c) => c.id));

/**
 * Encode a report as a feedback body: header line, blank line, reason.
 *
 * Faithful, not clamping: this is the exact inverse of `parseReportBody`, and a
 * lossy encoder would make the round trip untestable. The length cap lives at
 * the two edges that own it — the input's `maxLength` and
 * `submitContentReport`.
 *
 * The reason IS trimmed. Not a truncation: `submitFeedback` trims the whole
 * body anyway, so trimming here makes the round trip deterministic instead of
 * dependent on which side of the pipeline you read it from.
 */
export function buildReportBody(
  target: ReportTarget,
  reason: string,
  category?: ReportCategoryId | null,
): string {
  const header = [
    REPORT_BODY_PREFIX,
    `v${REPORT_ENVELOPE_VERSION}`,
    `target=${target.kind}`,
    `id=${target.id.trim()}`,
  ];
  if (target.kind === 'comment' && target.flagId) {
    header.push(`flag=${target.flagId.trim()}`);
  }
  // Omitted entirely when absent rather than written as `cat=` — an empty token
  // would be indistinguishable from a truncated one to the parser.
  if (category) {
    header.push(`cat=${category}`);
  }
  return `${header.join(' ')}\n\n${reason.trim()}`;
}

/**
 * Recover a report from a feedback body, or `null` if it is not one.
 *
 * Fails CLOSED on a truncated header: the header line must be terminated by a
 * newline to be considered complete, so a body cut mid-uuid returns null rather
 * than handing the backfill half an id that matches no row. A body cut inside
 * the REASON still parses — that is the whole point of header-first ordering.
 *
 * A future v2 parser must accept v1 too (old rows do not rewrite themselves);
 * a version this build does not know is rejected rather than mis-read.
 */
export function parseReportBody(body: string): ParsedReport | null {
  if (!body.startsWith(REPORT_BODY_PREFIX)) return null;

  const firstBreak = body.indexOf('\n');
  if (firstBreak === -1) return null;

  const match = HEADER_RE.exec(body.slice(0, firstBreak));
  if (!match) return null;

  const version = Number(match[1]);
  if (!Number.isInteger(version) || version < 1 || version > REPORT_ENVELOPE_VERSION) return null;

  const kind = match[2] as ReportTarget['kind'];
  const id = match[3];
  const flagId = match[4];
  const rawCategory = match[5];

  // A target with no id is untriageable, so it is not a report.
  if (!id) return null;

  // An unrecognised category is DROPPED, not fatal. A report whose category
  // this build does not know is still a report with a target and a reason, and
  // refusing the whole row over a label would lose real abuse reports if the
  // taxonomy ever gains a member. Same fail-open reasoning as the reason field.
  const category =
    rawCategory && KNOWN_CATEGORY_IDS.has(rawCategory)
      ? (rawCategory as ReportCategoryId)
      : undefined;

  // Drop the blank separator line when it survived the cut; a body sliced
  // exactly at the header boundary yields an empty reason, not a lost id.
  const rest = body.slice(firstBreak + 1);
  const reason = (rest.startsWith('\n') ? rest.slice(1) : rest).trim();

  return {
    version,
    target: kind === 'comment' && flagId ? { kind, id, flagId } : { kind, id },
    reason,
    ...(category ? { category } : {}),
  };
}

/**
 * Submit a report through the feedback pipeline's DB half.
 *
 * ERROR DISCIPLINE — the one rule of this module. It does not throw (it wraps a
 * primitive that never throws), but it NEVER reports success on a skipped
 * insert. `feedbackStore`'s 'skipped' is ignorable for FeedbackModal only
 * because that modal has a second channel; a report's insert IS the channel,
 * and the live `enforce_feedback_rate_limit` trigger (anon capped at 30/h
 * global, applied 2026-07-27) makes 'skipped' an outcome that really happens.
 * So 'skipped' maps to `failed`, never to `submitted`.
 *
 * `reason` is DIAGNOSTIC ONLY. Callers log it; they must never render it — it
 * can carry raw PostgREST text, and the failure copy the user sees is a
 * separate string in copy.ts. The two short-circuit diagnostics below are
 * programmer-facing for the same reason: they are not user copy.
 *
 * No `contactEmail`: a report is not a support thread, and asking for one on an
 * abuse surface would be collecting an identifier we have no stated use for.
 */
export async function submitContentReport(input: {
  target: ReportTarget;
  reason: string;
  category?: ReportCategoryId | null;
  userId?: string;
}): Promise<SubmitReportResult> {
  const id = input.target.id.trim();
  // Defence in depth against a caller that forgot the input's maxLength. Only
  // ever cuts the reason's tail — the header is composed after this.
  const reason = input.reason.trim().slice(0, MAX_REPORT_REASON_CHARS);
  const category = input.category ?? null;

  // Short-circuit before touching the network: an insert with no target is
  // untriageable, and a report carrying NEITHER a category nor a reason is a
  // mis-tap rather than a report.
  //
  // ⚠ It used to be `if (!reason)`, and D-1 (SUPPLEMENT) made that wrong: a
  // reporter may now tap one category and send without typing, so an
  // empty-reason check alone would have failed exactly the fastest, most
  // accessible path through the sheet — and failed it AFTER the UI had already
  // enabled Send. The gate here and `canSend` in ReportContentModal must agree;
  // if you change one, change both.
  if (!id) return { status: 'failed', reason: 'Missing target id.' };
  if (!reason && !category) return { status: 'failed', reason: 'Empty report.' };

  try {
    const result = await submitFeedback({
      body: buildReportBody({ ...input.target, id }, reason, category),
      category: REPORT_FEEDBACK_CATEGORY,
      userId: input.userId,
    });
    return result.status === 'inserted'
      ? { status: 'submitted' }
      : { status: 'failed', reason: result.reason };
  } catch (e) {
    // submitFeedback's contract says it never rejects. Belt and braces: a
    // report surface must not crash on a broken promise upstream.
    return { status: 'failed', reason: errorMessage(e) };
  }
}
