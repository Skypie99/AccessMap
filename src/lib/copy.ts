/**
 * Shared user-facing copy strings.
 *
 * Home, Map, and Tasks each render the same "you're offline, showing the saved
 * cache" banner. They had drifted into three slightly different wordings; keeping
 * the one true string here means a future copy tweak lives in exactly one place
 * and every screen stays in sync (same idea as a11yText.ts, but for visible copy).
 */
import { relativeTime } from './relativeTime';

/** Banner shown when a screen is serving the saved offline cache. */
export const OFFLINE_BANNER_TEXT = 'Showing saved data — connect for the latest.';

/**
 * B9 (L7-02): the offline banner, now stating the data's AGE when we know it.
 * The one fact that changes a decision offline is *how old* the saved data is —
 * `cachedAt` already exists in the cache entry, so read it and say it. Falls
 * back to the plain string when the timestamp is unknown (e.g. a screen that
 * hasn't surfaced it yet), so nothing regresses.
 */
export function offlineBannerText(cachedAt?: string | null): string {
  return cachedAt
    ? `Showing saved data from ${relativeTime(cachedAt)} — connect for the latest.`
    : OFFLINE_BANNER_TEXT;
}

/**
 * BP13 (T9): the one true retry verb. A read-failure banner appends it so Home,
 * Map, and Tasks speak ONE failure register instead of three drifting dialects.
 * A second sentence (not a "state — next step" em-dash status line). PROPOSED
 * (BP13, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const RETRY_VERB = 'Tap to retry.';

/**
 * B-2 (SR-002): the in-app privacy-policy link. Apple 5.1.1(i) requires the
 * policy to be reachable from inside the app, not only from App Store Connect
 * metadata — so this label ships on three surfaces (Settings, About, and
 * beside sign-up) and they all read it from here, which makes Sky's final
 * wording a one-line change. PROPOSED (B-2, S-8) — Sky's final wording lands
 * in DECISIONS §A / BP16.
 */
export const PRIVACY_POLICY_LINK_LABEL = 'Privacy Policy';

/**
 * Hint for every external link row. Byte-identical reuse of the string already
 * shipped on ResourcesScreen's link cards — not new copy (device-tune S-1
 * permits byte-identical reuse of shipped strings on the fenced surfaces).
 */
export const OPENS_IN_BROWSER_HINT = 'Opens in your browser';

/**
 * BP13 (T9, F5-05/09): single-source the read-failure banner text (provider
 * message + retry verb). Home / Map / Tasks route the SAME presentation contract
 * through this — NOT a shared component; each screen keeps its own container.
 * Mirrors Tasks' original inline recipe: append the verb unless the provider
 * message already carries it, so a double "Tap to retry." never appears.
 */
export function failureBannerText(providerMessage: string): string {
  return providerMessage.toLowerCase().includes('tap to retry')
    ? providerMessage
    : `${providerMessage}. ${RETRY_VERB}`;
}

/* ───────────────────────────────────────────────────────────────────────────
 * B-1 — the moderation controls: Report (Apple 1.2(b)), Hide (1.2(c)), and
 * W1's "Flag as wrong" (product accuracy).
 *
 * SKY'S GOVERNING STATEMENT (DECISIONS.md §SKY-3c): THE THREE ARE DISTINCT AND
 * MUST NOT BE COLLAPSED. She caught an agent offering "Hide" as a wording for
 * the report control and put the correction on the record. The distinctness
 * assertion in copy.test.ts is that correction made machine-checkable, not
 * decoration — do not weaken it.
 *
 * DELIBERATELY ABSENT — no accessibilityHint const for any of these. Every hint
 * that would actually be useful on a moderation control ("we'll review this",
 * "this removes the comment") is a moderation promise, and authoring one is a
 * breach of the honesty fence. A missing hint is NOT a WCAG failure: the
 * accessible NAME carries the meaning, which is what the per-row label helpers
 * at the bottom of this block are for.
 *
 * ALSO DELIBERATELY ABSENT — a report-category taxonomy. Spam / Harassment /
 * Hate speech / … is Sky's copy, assigned to her at 05 §3 ⑯. The reason field
 * is free text so that no agent authors that list by implication.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * The Apple 1.2(b) abuse-report control, on flags and on other people's
 * comments. Sky's word, verbatim (DECISIONS.md §SKY-3c/§SKY-3g). The report
 * sheet reuses this as its own title so there is ONE string to arbitrate rather
 * than a control label and a near-synonym heading that can drift apart.
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const REPORT_CONTROL_LABEL = 'Report';

/**
 * W1's accuracy control — `requestFlagDispute`, a doubt counter that does NOT
 * change a flag's status. Sky's word, verbatim (§SKY-3c). It is NOT the abuse
 * path: it takes no reason, carries no identity, and cannot target a comment at
 * all, which is exactly why it lives in the triage row beside Verify / Resolved
 * / Reject rather than next to Report.
 * PROPOSED (W1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const DISPUTE_CONTROL_LABEL = 'Flag as wrong';

/**
 * The Apple 1.2(c) personal hide control (`hiddenContent.ts`), scoped to
 * COMMENTS this phase per §SKY-3h. Sky's word, verbatim. It is a personal
 * filter, not a moderation verdict — nothing here may imply the content was
 * removed for anyone else.
 * PROPOSED (B-1/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDE_CONTROL_LABEL = 'Hide';

/**
 * Label for the report sheet's free-text reason field. AGENT-PROPOSED wording:
 * a question, so it asks without promising anything about what follows. It is
 * deliberately not a category prompt — see the taxonomy note above.
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const REPORT_REASON_LABEL = 'Why are you reporting this?';

/**
 * Title of the acknowledgement after a report reaches the server.
 * AGENT-PROPOSED wording: states what happened, nothing about what happens next.
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const REPORT_SENT_TITLE = 'Report sent';

/**
 * Body of that acknowledgement — the visible triage statement §SKY-3g asks for
 * ("Triage path (state it visibly)"). AGENT-PROPOSED wording, and the single
 * riskiest string in this block: it deliberately carries NO cadence, NO
 * response time, and NO outcome, because Sky's recorded triage sentence is a
 * cadence she owns and any number an agent picked would be an invented promise.
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const REPORT_SENT_BODY = 'Thanks. Reports are reviewed by the AccessMap maintainer.';

/**
 * Title shown when the report could not be sent. AGENT-PROPOSED wording.
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const REPORT_FAILED_TITLE = "Couldn't send report";

/**
 * The last rung of the submit ladder: name the address so a failed report is
 * still deliverable by hand. A helper rather than a const so the address comes
 * from `FEEDBACK_EMAIL` at the call site and the two can never drift.
 * AGENT-PROPOSED wording, modelled on the shipped `openFeedbackComposer`
 * fallback ("Send your feedback to: …").
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export function reportFailedBody(email: string): string {
  return `We couldn't send your report. You can email it to ${email} instead.`;
}

/**
 * Accessible NAME for a per-comment Report control. A row of buttons all named
 * "Report" is ambiguous to a screen reader — which comment? — so the name
 * carries the author, the same way a11yText.ts pairs a severity number with its
 * word. Pass the SAME author string the bubble renders (including its anonymous
 * fallback for a comment whose author account is gone), so the label never
 * claims a name the row does not show. AGENT-PROPOSED wording.
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export function reportCommentA11yLabel(author: string): string {
  return `${REPORT_CONTROL_LABEL} comment by ${author}`;
}

/**
 * Accessible NAME for a per-comment Hide control. Same reasoning, same caller
 * contract as `reportCommentA11yLabel`. AGENT-PROPOSED wording.
 * PROPOSED (B-1/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export function hideCommentA11yLabel(author: string): string {
  return `${HIDE_CONTROL_LABEL} comment by ${author}`;
}

/**
 * WCAG 4.1.3 status message, announced when a comment disappears because the
 * reader hid it. The delete path in the same thread already announces its
 * removal — the bubble vanishes silently otherwise — and Hide makes a bubble
 * vanish in exactly the same way, so staying silent here would be a knowingly
 * introduced regression against a rule that thread already states out loud.
 *
 * "on this device" is load-bearing, not padding: 1.2(c) is a PERSONAL filter
 * and `hiddenContent.ts` stores it in AsyncStorage. A bare "Comment hidden"
 * could be heard as a takedown, which is the one thing this control must never
 * imply. AGENT-PROPOSED wording.
 * PROPOSED (B-1/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const COMMENT_HIDDEN_ANNOUNCEMENT = 'Comment hidden on this device';

/**
 * Title shown when a hide could not be saved. `hideContent` THROWS on a write
 * failure by design — a hide that fails silently has quietly ignored somebody
 * who just said "never show me this again" — so the caller has to say so out
 * loud. Shaped after `REPORT_FAILED_TITLE`, and it promises nothing about what
 * happens next because nothing happened at all. AGENT-PROPOSED wording.
 * PROPOSED (B-1/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDE_FAILED_TITLE = "Couldn't hide comment";

/* ───────────────────────────────────────────────────────────────────────────
 * W1 — the answers the "Flag as wrong" control gives back.
 *
 * `DISPUTE_CONTROL_LABEL` above is the control's word; these four are what the
 * sheet says AFTER it is pressed. They are separated from the B-1 block on
 * purpose: W1 is an ACCURACY signal, not moderation (§SKY-3c), and the register
 * that follows from that is different — nothing here reviews, removes, or
 * judges anything, it only reports whether an anonymous counter moved.
 *
 * THE ONE FENCE THAT BINDS THIS SET. `increment_dispute_request` returns the
 * new count and `DISPUTE_THRESHOLD` is 2, so it is tempting to say "1 more
 * needed" the way the reopen flow does. Nothing may say that. The threshold's
 * documented consequence is an additive `Disputed` treatment on the flag, and
 * that treatment IS NOT SHIPPED — `dispute_requests` is absent from `FlagRow`
 * and from every select() in flags.ts, so no surface can read it. A countdown
 * to a badge that does not exist is an invented promise, and it is the specific
 * one this feature is positioned to make by accident. The count is therefore
 * used only to tell "counted" from "discarded", and never rendered.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Shown in place of the pill once the doubt is on the server. AGENT-PROPOSED
 * wording: it states what was recorded and stops — no cadence, no threshold, no
 * claim that anything happens to the flag, because on today's surfaces nothing
 * visibly does. Uses Sky's own "is wrong" so the answer echoes the control.
 * PROPOSED (W1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const DISPUTE_RECORDED_MESSAGE = "Thanks — we've recorded that you think this flag is wrong.";

/**
 * Shown when this device has already spent its one vote on this flag
 * (`disputeRequests.ts`). AGENT-PROPOSED wording, shaped after the shipped
 * reopen equivalent ("You've already requested a reopen for this flag."). It
 * does not mention the device: the dedup is per-device, and naming that would
 * read as an invitation to go and vote again from another one.
 * PROPOSED (W1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const DISPUTE_ALREADY_RECORDED_MESSAGE = "You've already flagged this as wrong.";

/**
 * Shown when the RPC answers 0 — the UPDATE matched no row because the flag
 * left `open`/`verified` while this sheet held a stale snapshot, so the vote was
 * DISCARDED. Saying "recorded" here would be the F38 lie in a new place, which
 * is why this branch exists at all. AGENT-PROPOSED wording, carried over from
 * the shipped F37 reopen sentence so the two stale-snapshot paths speak one
 * dialect.
 * PROPOSED (W1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const DISPUTE_STALE_MESSAGE =
  'This flag changed while you had it open, so flagging it as wrong is no longer needed. Close and reopen it to see the latest.';

/**
 * Title for the alert shown when the vote did not reach the server at all —
 * a throw, or the RPC missing from the schema cache. Shaped after
 * `REPORT_FAILED_TITLE` / `HIDE_FAILED_TITLE`: it admits the failure and
 * invents no next step. The BODY is not a new string — it is whatever
 * `errorMessage` already says for that failure, so this path speaks the same
 * words as the other ~98 catch sites in the app. AGENT-PROPOSED wording.
 * PROPOSED (W1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const DISPUTE_FAILED_TITLE = "Couldn't record that";
