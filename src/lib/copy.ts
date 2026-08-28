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
 * Hint for the three privacy-policy entry points, which as of B-3 open an
 * in-app sheet rather than a browser. It replaces `OPENS_IN_BROWSER_HINT` on
 * those rows for the same reason `TERMS_LINK_HINT` exists: the policy never
 * leaves the app now, and telling screen-reader users it opens a browser would
 * be a lie told only to them. AGENT-PROPOSED wording.
 * PROPOSED (B-3, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const PRIVACY_POLICY_LINK_HINT = 'Opens the privacy policy';

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
 * The Apple 1.2(c) BLOCK control — the one that actually closes 1.2(c).
 *
 * NOT a synonym for Hide, and the distinctness assertion in copy.test.ts now
 * covers all four words for that reason (§SKY-3c extended by Jordan's
 * 2026-08-18 Phase-0 gate, condition 4). The difference is direction in time:
 * Hide is one bubble the reader has already read; Block is every bubble that
 * account posts from here on. Per-item hiding cannot satisfy 1.2(c) precisely
 * because the abuser can post again.
 *
 * Scoped to COMMENTS this phase — flags carry no visible author — per the same
 * gate, answer 5. See `hiddenContent.ts` for why that is a decision, not a gap.
 *
 * Everything here is one word, chosen because it is the word Apple's own
 * guideline uses; the sentences carrying the honesty load are the four below,
 * whose CONTENT Jordan specified and whose wording is still Sky's.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const BLOCK_CONTROL_LABEL = 'Block';

/**
 * The confirmation body. Jordan's gate (answer 4) requires four things be said
 * before a block is taken, and this string exists to say all four in the order
 * a worried person needs them:
 *
 *   1. WHAT CHANGES — their comments stop appearing for you.
 *   2. ASYMMETRY — they are not told, and nothing stops them. This is the
 *      clause Hide never needed: "Hide" implies nothing about the other party,
 *      but "Block" carries a folk expectation of mutual severance that this
 *      feature does NOT deliver, and letting someone in a real harassment
 *      situation believe otherwise is the specific harm to avoid.
 *   3. SCOPE + PERSISTENCE — this device only, and it will not survive a
 *      reinstall. Same "on this device" fence as COMMENT_HIDDEN_ANNOUNCEMENT.
 *   4. THE REAL LEVER — Report is what reaches a human. A personal filter is
 *      not a moderation verdict, and this must never be read as one.
 *
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const BLOCK_CONFIRM_BODY =
  "You won't see comments from this person again. They aren't told, and this doesn't stop them posting or seeing your reports. It applies on this device only and won't survive reinstalling the app. If something breaks the community guidelines, use Report instead — that's the one that reaches a person.";

/**
 * Confirm-button label on the block dialog. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const BLOCK_CONFIRM_ACTION = 'Block';

/**
 * WCAG 4.1.3 status message when a block takes effect. Inherits the "on this
 * device" fence from `COMMENT_HIDDEN_ANNOUNCEMENT` for the same reason: a bare
 * "Person blocked" could be heard as an account suspension, which is the one
 * thing this control must never imply. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const AUTHOR_BLOCKED_ANNOUNCEMENT = 'Blocked on this device';

/**
 * Title when a block could not be saved. `hideContent` throws on a write
 * failure by design, and a block that silently fails is the worst instance of
 * that class — someone just said "never show me this person again". Shaped
 * after `HIDE_FAILED_TITLE`. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const BLOCK_FAILED_TITLE = "Couldn't block";

/**
 * Settings row title for the unblock surface. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const BLOCKED_PEOPLE_ROW_TITLE = 'Blocked people';

/**
 * Settings row subtitle. Carries the scope fence in the same breath as the
 * count, exactly as `HIDDEN_COMMENTS_ROW_SUBTITLE` does — a reader who never
 * opens the row still learns that this list is device-local.
 * AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const BLOCKED_PEOPLE_ROW_SUBTITLE = "People you've blocked on this device.";

/**
 * Empty state for the unblock surface. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const BLOCKED_PEOPLE_EMPTY = "You haven't blocked anyone on this device.";

/**
 * Settings push-notification row, signed out.
 *
 * SW-20 / SW-49. The switch was correctly `disabled` for a guest, but the row
 * carried no dim and no explanation, so it read as a working control that
 * ignored taps — the walk tapped it twice and got nothing, no alert, not even a
 * console line. Its two neighbours already do this properly: Export explains in
 * an alert, Blocked people greys out and says why in its subtitle. This is the
 * subtitle half of that second pattern.
 *
 * Says what push needs (an account) and why (it is tied to one), rather than
 * just "sign in".
 * AGENT-PROPOSED wording.
 */
export const PUSH_SIGNED_OUT_SUBTITLE =
  'Sign in to turn on push notifications — they follow your account, not this device.';

/**
 * The unblock action. Deliberately "Unblock everyone" rather than a per-person
 * list: the block list stores ACCOUNT IDS ONLY — no display names — because
 * caching someone's name on the blocker's device to render an unblock list
 * would persist a local record of who they blocked BY NAME, which is more
 * identifying than the block itself and is not needed to make the feature work.
 * With no names to show, a per-row list would be a column of bare uuids, which
 * is worse than useless. Sky may replace this with a named list if she decides
 * the local name cache is an acceptable trade — that is escalation 3 from the
 * Phase-0 gate. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNBLOCK_ALL_LABEL = 'Unblock everyone';

/**
 * Confirmation body for the bulk unblock. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNBLOCK_ALL_CONFIRM_BODY =
  "Their comments will start appearing for you again. You can block them again at any time.";

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
 * Body of that acknowledgement.
 *
 * ⚠ THIS STRING MAKES A PROMISE, and it is the ONLY place in the running app
 * that states the 24-hour commitment. It must stay word-identical to the
 * Terms — `14_MODERATION_TEXTS_v1.md` §1 "Reports and moderation" and §4 — or
 * the app and the published policy drift apart on a commitment. `copy.test.ts`
 * guards the interval; change all three together or none.
 *
 * HOW IT GOT HERE, because the history is the reason the guard exists. An
 * earlier agent-written attempt read "Thanks. Reports are reviewed by the
 * Flagstone maintainer." — no cadence, no response time, no outcome, and
 * defensible as a transcription of §SKY-3g's "Triage path (state it visibly)".
 * Two independent reviewers called it a fence breach, and they were right:
 * THE PROMISE IS THE VERB. "are reviewed" asserts, present tense and
 * unconditionally, that a human reviews reports. That is a commitment about a
 * person's behaviour, and 05 §3 ⑯ assigns it to Sky — not to an agent.
 *
 * It was doubly dangerous because the fence guard could not see it: the test
 * banned "will be removed" and a present-tense passive walked straight past, so
 * a green suite would have read as evidence of no promise. The guard was then
 * taught to check the verb, not just the tense.
 *
 * The fence did its job. It held the string at "no promise" until Sky made the
 * promise herself — which she did on 2026-07-27, in her own words, in the
 * ratified Terms. The verb is back, and now it is hers.
 * RATIFIED by Sky 2026-07-27 — DECISIONS §SKY-4, 14_MODERATION_TEXTS_v1.md §5.
 */
export const REPORT_SENT_BODY =
  'Thanks, your report was sent. Reports are reviewed within 24 hours.';

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
 * Shown when the submit-time filter (Apple 1.2(a)) rejects a flag description
 * or a comment. Sky's wording, verbatim from `14_MODERATION_TEXTS_v1.md` §2.
 *
 * ⚠ IT DOES NOT NAME THE MATCHED TERM, deliberately, and `findBlockedTerm` is
 * marked diagnostic-only for the same reason. Echoing the word back does two
 * bad things at once: it hands someone a hint sheet for evading the filter,
 * and it repeats a slur at whoever just read it.
 *
 * "may contain" is doing real work too — the filter is a word list, so it is
 * sometimes wrong, and a sentence that accused the user outright would be
 * unkind exactly when it was mistaken.
 * RATIFIED by Sky 2026-07-27 — DECISIONS §SKY-4, 14_MODERATION_TEXTS_v1.md §2.
 */
export const CONTENT_BLOCKED_MESSAGE =
  "This can't be submitted yet. It may contain language that breaks the community guidelines. Please edit it and try again.";

/**
 * The report-category taxonomy — Apple 1.2(b). Sky's five, verbatim and in her
 * order from `14_MODERATION_TEXTS_v1.md` §3.
 *
 * ⚠ THIS FILE USED TO BE FENCED AGAINST EXACTLY THIS LIST. `copy.test.ts`
 * asserted no report-category taxonomy could appear here, because a taxonomy is
 * a moderation policy wearing UI clothes — the categories you offer decide what
 * users can tell you, and 05 §3 ⑯ assigned that to Sky. She wrote them on
 * 2026-07-27, so the fence inverted: the test now demands these exact five
 * rather than banning any. Adding a sixth is still hers, not ours.
 *
 * `id` is the stable wire token used by the v2 report envelope. **The ids are
 * structural and must never change** — they are written into stored feedback
 * rows and parsed back out. The labels are display copy and can only change
 * with Sky's say-so. Order is hers too: "Something else" is last because a
 * catch-all offered first suppresses the specific answers above it.
 * RATIFIED by Sky 2026-07-27 — DECISIONS §SKY-4, 14_MODERATION_TEXTS_v1.md §3.
 */
export const REPORT_CATEGORIES = [
  { id: 'spam', label: 'Spam or fake report' },
  { id: 'harassment', label: 'Harassment or hate' },
  { id: 'explicit', label: 'Explicit or inappropriate content' },
  { id: 'privacy', label: 'Privacy violation (shows a person, plate, or address)' },
  { id: 'other', label: 'Something else' },
] as const;

export type ReportCategoryId = (typeof REPORT_CATEGORIES)[number]['id'];

/**
 * Heading above the picker. Chrome, not taxonomy — it makes no claim about what
 * happens to a report.
 *
 * It shipped agent-proposed, and the M-run's own record asked Sky to "ratify or
 * replace it" because it was the single new user-visible string that phase
 * introduced. She kept it as written. That is a ratification, not an absence of
 * one, so the marker changes even though the string does not — the fence tracks
 * WHO owns the words, and these are now hers.
 *
 * ⚠ It was never in `copy.test.ts`'s PROPOSED_EXPORTS, so nothing was actually
 * holding it. Enrolling it on the way out closes that hole rather than
 * inheriting it.
 * RATIFIED by Sky 2026-07-28 — DECISIONS §SKY-6.
 */
export const REPORT_CATEGORY_LABEL = "What's wrong?";

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
 * Accessible NAME for a per-comment Block control. Same caller contract as its
 * two siblings — pass the SAME author string the bubble renders.
 *
 * The name says "block <author>", NOT "block comment by <author>", and the
 * difference is deliberate: this control acts on the PERSON, and a screen
 * reader user deciding whether to press it needs the scope from the name, since
 * the honesty fence forbids an accessibilityHint here (see the B-1 header).
 * That is also what keeps it distinct from `hideCommentA11yLabel` in a row
 * where both buttons sit side by side. AGENT-PROPOSED wording.
 * PROPOSED (1.2(c) Block, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export function blockAuthorA11yLabel(author: string): string {
  return `${BLOCK_CONTROL_LABEL} ${author}`;
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

/**
 * Button that takes a user whose content was just rejected to the guidelines
 * it was rejected against (§SKY-7).
 *
 * WHY IT EXISTS. `CONTENT_BLOCKED_MESSAGE` says the text "may contain language
 * that breaks the community guidelines" — and until now the app cited a
 * document the reader had no route to from inside that alert. `12_READY_OR_NOT
 * §3′.12` carried it as a named residual for exactly that reason.
 *
 * It is the ONLY new user-visible string in this fix: the alert's title and
 * body are unchanged, and the second button reuses the shipped 'OK' from the
 * rate-limit alert's identical error-plus-a-way-out shape.
 * AGENT-PROPOSED wording.
 * PROPOSED (B-1/1.2(a), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const VIEW_GUIDELINES_LABEL = 'View guidelines';

/* ───────────────────────────────────────────────────────────────────────────
 * HIGH-2 — the other end of Hide.
 *
 * Until now Hide was immediate, irreversible, and had no undo anywhere in the
 * app, while being drawn as the pixel-identical twin of Report 16pt away. A
 * mis-tap removed a comment from that device forever. These strings are the
 * surface that fixes it (Settings → Feedback → Hidden comments), per the
 * mockup gate Sky answered A · H · S1 in DECISIONS §SKY-7.
 *
 * THE FENCE THAT BINDS THIS SET, inherited from `COMMENT_HIDDEN_ANNOUNCEMENT`:
 * hiding is a PERSONAL, device-local filter, never a takedown. So nothing here
 * may imply the comment was removed for anyone else, and nothing here may imply
 * unhiding restores it for anyone else either. "on this device" carries that in
 * both directions and is load-bearing in both.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Title of the Unhide surface, and the Settings row that opens it. Reads as a
 * plain description of what the list holds rather than an action, because the
 * row is a destination and the screen is a list — the actions are on the rows.
 * AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDDEN_COMMENTS_TITLE = 'Hidden comments';

/**
 * Subtitle on the Settings row. States the scope (comments, not flags — hide is
 * comments-only per §SKY-3h) and the storage boundary in the same breath, so a
 * reader learns the list is device-local before they open it and find their
 * hides missing on another phone. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDDEN_COMMENTS_ROW_SUBTITLE = "Comments you've hidden on this device.";

/** Accessible hint for the Settings row. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDDEN_COMMENTS_LINK_HINT = 'Opens the comments you have hidden on this device';

/**
 * The per-row control. The exact inverse of `HIDE_CONTROL_LABEL`, and
 * deliberately one word for the same reason: it is a personal filter toggle,
 * not a moderation verdict being reversed. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNHIDE_CONTROL_LABEL = 'Unhide';

/**
 * The bulk control, in the sheet header (placement H, Sky's pick). Named for
 * COMMENTS only — and the handler is comment-scoped to match, looping
 * `unhideContent('comment', id)` rather than calling `clearHidden()`, which
 * would also wipe the `flag` bucket this label says nothing about.
 * AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNHIDE_ALL_CONTROL_LABEL = 'Unhide all';

/**
 * Accessible NAME for a per-row Unhide control. Same contract as
 * `hideCommentA11yLabel`: a column of buttons all named "Unhide" is ambiguous
 * to a screen reader, so the name carries the author, and the caller passes the
 * SAME author string the row renders — including the 'Member' fallback for a
 * comment with no display name, or whose author account is gone (SW-34; was
 * 'Anonymous', which is reserved for the deliberate choice a flag makes with
 * user_id IS NULL). AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export function unhideCommentA11yLabel(author: string): string {
  return `${UNHIDE_CONTROL_LABEL} comment by ${author}`;
}

/**
 * Accessible NAME for the Unhide control on a row whose comment could not be
 * re-read. It cannot cite an author because there is no longer a row to take
 * one from, so it names the state instead of inventing a name.
 * AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNHIDE_UNAVAILABLE_A11Y_LABEL = 'Unhide comment that is no longer available';

/**
 * Shown in place of the text of a hidden comment that no longer exists on the
 * server — deleted by its author, or removed by a moderator, since it was
 * hidden. The row still renders and is still unhideable: the hide list is
 * device-local and would otherwise keep an entry the user can never clear.
 *
 * It says "no longer available", not "deleted", because from the client all we
 * know is that the id did not come back. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDDEN_COMMENT_UNAVAILABLE = 'This comment is no longer available.';

/**
 * Shown in place of a hidden comment's text when the re-read did not happen at
 * all — offline, or the request failed. It is deliberately NOT
 * `HIDDEN_COMMENT_UNAVAILABLE`: "no longer available" is a claim that the
 * comment is gone, and reporting a dropped connection as a deletion would be
 * inventing content in the one direction this screen must never invent it.
 *
 * The row stays unhideable either way — unhiding is a local AsyncStorage write
 * and needs no network, so the screen's actual job still works offline; only
 * the preview does not. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDDEN_COMMENT_NOT_LOADED = "Couldn't load this comment right now.";

/**
 * WCAG 4.1.3 status message for a single unhide. The exact mirror of
 * `COMMENT_HIDDEN_ANNOUNCEMENT`, including "on this device" — a bare "Comment
 * unhidden" could be heard as restoring it for everyone, which is the inverse
 * of the misreading the hide announcement guards against and just as wrong.
 * AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const COMMENT_UNHIDDEN_ANNOUNCEMENT = 'Comment unhidden on this device';

/**
 * WCAG 4.1.3 status message for the bulk unhide. Counts, because the row that
 * would have shown the result has just gone — announcing "Comment unhidden"
 * once for an action that cleared eleven of them would under-report what
 * happened. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export function commentsUnhiddenAnnouncement(count: number): string {
  return `${count} ${count === 1 ? 'comment' : 'comments'} unhidden on this device`;
}

/**
 * Title of the confirm shown before the bulk unhide. House rule: any bulk
 * action goes through `confirm()` first. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNHIDE_ALL_CONFIRM_TITLE = 'Unhide all comments?';

/**
 * Body of that confirm. Names the count — the gate board's argument for it was
 * that a bulk control which can say how much it affects should — and states the
 * consequence in the reader's own terms: these become visible again to them,
 * here. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export function unhideAllConfirmBody(count: number): string {
  return `${count} ${count === 1 ? 'comment' : 'comments'} will be visible again on this device.`;
}

/**
 * Title when a single unhide could not be saved. `unhideContent` throws on a
 * write failure for the same reason `hideContent` does, so the caller has to
 * say so out loud rather than leave a row that silently sprang back.
 * AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNHIDE_FAILED_TITLE = "Couldn't unhide comment";

/** Title when the bulk unhide could not be saved. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const UNHIDE_ALL_FAILED_TITLE = "Couldn't unhide comments";

/**
 * Empty state, title. A designed moment, not an error: an empty hide list is
 * the ordinary case for almost every user, and the overwhelming majority who
 * open this screen will never have hidden anything. It must not read as though
 * something went wrong. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDDEN_COMMENTS_EMPTY_TITLE = 'Nothing hidden';

/**
 * Empty state, body. Shaped like the watched-flags empty state — say where the
 * control lives so the screen teaches instead of just reporting a zero — and
 * ends on the promise this whole surface exists to make: the choice is
 * reversible. AGENT-PROPOSED wording.
 * PROPOSED (HIGH-2/1.2(c), S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const HIDDEN_COMMENTS_EMPTY_BODY =
  'Hide a comment from its Hide button and it lands here, so you can always change your mind.';

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

/* ───────────────────────────────────────────────────────────────────────────
 * THE TERMS & COMMUNITY GUIDELINES (Apple 1.2, §SKY-6)
 *
 * Sky ratified this text on 2026-07-27 and approved its D1 Option A account-
 * deletion revision on 2026-08-27. It sat in the repo as a document for a day
 * and could not be read from inside the app — which is the gap `§SKY-6`
 * closes: "Words rendered VERBATIM from 14_MODERATION_TEXTS_v1.md §1; render,
 * never rewrite."
 *
 * ⚑ THESE ARE TRANSCRIPTIONS, NOT COPY. No agent may edit a character of the
 * strings below — not for tone, not for length, not to fix what looks like a
 * typo ("licence" is deliberate). `terms.guard.test.ts` reads §1 out of the
 * markdown on every run and fails if a single paragraph drifts, in either
 * direction. That test is the reason this block can be trusted; do not weaken
 * it into a snapshot.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * The document's own title, verbatim from §1's first line.
 * RATIFIED by Sky 2026-08-27 — D1-AMEND-02, 14_MODERATION_TEXTS_v1.md §1.
 */
export const TERMS_TITLE = 'Flagstone Terms & Community Guidelines';

/**
 * The effective-date line, verbatim from §1's first line. Carries the version
 * because §1's own "Changes" paragraph promises a new date at the top when the
 * terms change — so this string IS the promise being kept.
 * RATIFIED by Sky 2026-08-27 — D1-AMEND-02, 14_MODERATION_TEXTS_v1.md §1.
 */
export const TERMS_EFFECTIVE = 'Effective 2026-08-27 · v1.1';

/**
 * The nine titled paragraphs, verbatim and in Sky's order. `heading` is the
 * bolded lead of each markdown paragraph (its trailing period included, because
 * it is part of the sentence she wrote); `body` is the remainder.
 *
 * The email in "Contact" is a literal rather than an interpolation of
 * `FEEDBACK_EMAIL`, because this block's contract is verbatim transcription and
 * an interpolation would not be. The guard test asserts the two are equal
 * instead, so they cannot drift without going red.
 * RATIFIED by Sky 2026-08-27 — D1-AMEND-02, 14_MODERATION_TEXTS_v1.md §1.
 */
export const TERMS_SECTIONS = [
  {
    heading: 'What Flagstone is.',
    body: "Flagstone is a community map of accessibility barriers. I'm Sky, and I built it and run it on my own so that disabled people get better information about the places they move through. By using the app, you're agreeing to these terms.",
  },
  {
    heading: 'Community-provided information.',
    body: "Barrier reports come from people like you. I do my best to keep them honest through verification and moderation, but I can't promise every report is accurate or up to date. Please don't make Flagstone your only source when your safety is on the line.",
  },
  {
    heading: 'What you can post.',
    body: 'Real barriers, honestly described. Photos should show the barrier, not people. Please keep faces, licence plates, and anything that identifies a person out of frame.',
  },
  {
    heading: "What's not allowed.",
    body: "Anything hateful, harassing, sexually explicit, violent, spammy, deliberately false, or that exposes someone's private information. I remove content that breaks these rules, and I may restrict accounts that post it.",
  },
  {
    heading: 'Reports and moderation.',
    body: 'Every flag and comment can be reported right in the app. I review reports within 24 hours and take down anything that breaks these guidelines. You can also hide comments on your own device whenever you like.',
  },
  {
    heading: 'Your content.',
    body: "What you post stays yours. By posting it, you're letting Flagstone show it in the app so the community can use it.",
  },
  {
    heading: 'Your account.',
    body: 'You can delete your account any time from your Profile. Deleting your account permanently removes your profile information, reports and their associated content, direct contributions, feedback, and uploaded photos. This cannot be undone.',
  },
  {
    heading: 'Changes.',
    body: 'If these terms ever change, the new version will live right here with a new date at the top.',
  },
  {
    heading: 'Contact.',
    body: 'Questions or concerns? Reach me at support@skypistudio.com. Flagstone is made in Canada and operates under the laws of British Columbia.',
  },
] as const;

/**
 * The label on all three entry points into the terms screen — Settings, About,
 * and the report sheet. Sky's own phrase for the surface, transcribed from
 * §SKY-6 ("a Terms & Community Guidelines screen"), which is why it is not
 * PROPOSED: no agent chose these words.
 *
 * One const for three surfaces, deliberately — the same reasoning as
 * `PRIVACY_POLICY_LINK_LABEL`, whose B-2 grammar this mirrors.
 * RATIFIED by Sky 2026-07-28 — DECISIONS §SKY-6.
 */
export const TERMS_LINK_LABEL = 'Terms & Community Guidelines';

/**
 * Hint for those three rows. It is navigational chrome and makes no moderation
 * claim — it says where the tap goes and stops, which is the only kind of hint
 * the B-1 fence permits on a surface like this. Shaped after the shipped
 * `OPENS_IN_BROWSER_HINT`, but this destination is in-app, so it must not
 * borrow that string and promise a browser that never opens.
 * PROPOSED (B-1, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const TERMS_LINK_HINT = 'Opens the terms and community guidelines';

/* ───────────────────────────────────────────────────────────────────────────
 * B-3 — THE PRIVACY POLICY, TRANSCRIBED.
 *
 * ⚑ THESE ARE TRANSCRIPTIONS, NOT COPY. Same law as the TERMS_* block above.
 * Every string below is Sky's `15_PRIVACY_POLICY_v1.md` §"The policy text",
 * character for character, and `src/__tests__/privacy.guard.test.ts` compares
 * them against that markdown in BOTH directions on every run. If a word here
 * looks wrong it is wrong in Sky's document, and only she may change it.
 *
 * ⚑ ONE TRANSFORMATION IS APPLIED, AND ONLY ONE: the inline `[V: …]` and `[V]`
 * verification markers are stripped. They are instructions to the build run
 * ("confirm this against the codebase before rendering"), not policy prose —
 * rendering them verbatim would put `[V: dataExport path]` in front of a user.
 * The guard strips them the same way and asserts the result matches, so the
 * strip rule cannot drift between the document and the app either.
 *
 * WHAT MAKES THESE TRUSTWORTHY. All eleven `[V]` claims were checked against
 * the codebase before one word was rendered — `16_V_VERIFICATION_TABLE.md`
 * carries the file-and-line evidence for each. Two failed. Both were reported
 * to Sky before the render and both were corrected by her (DECISIONS §SKY-9):
 * account deletion lives on Profile, not Settings, and notification settings
 * are device-local rather than stored. B-3 exists because the LIVE policy
 * drifted six ways from the shipped app; shipping a second policy that drifted
 * differently would have been the same defect in a new costume.
 *
 * The title and the effective date are separate consts because the markdown
 * puts them on separate lines — unlike the terms, where they share one.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Document title, as the policy itself states it.
 * RATIFIED by Sky 2026-08-27 — D1-AMEND-02, 15_PRIVACY_POLICY_v1.md §The policy text.
 */
export const PRIVACY_TITLE = 'Flagstone Privacy Policy';

/**
 * Effective date and version, the policy's own second line.
 * RATIFIED by Sky 2026-08-27 — D1-AMEND-02, 15_PRIVACY_POLICY_v1.md §The policy text.
 */
export const PRIVACY_EFFECTIVE = 'Effective 2026-08-27 · v1.1';

/**
 * The fourteen policy paragraphs, in document order. `heading` is the bolded
 * lead-in INCLUDING its trailing period; `body` is the rest of the paragraph.
 * Rendered as separate elements so a screen reader can jump the document by
 * heading — the only practical way to navigate a policy non-visually.
 * RATIFIED by Sky 2026-08-27 — D1-AMEND-02, 15_PRIVACY_POLICY_v1.md §The policy text.
 */
export const PRIVACY_SECTIONS = [
  {
    heading: 'Who runs this.',
    body: 'Flagstone is built and run by one person, Sky, in British Columbia, Canada. If you have a question about your data, email support@skypistudio.com and it comes straight to me.',
  },
  {
    heading: 'The short version.',
    body: 'Flagstone collects as little as it can. You can report a barrier without making an account at all. There is no advertising, no analytics, no crash reporting, and nothing is sold or shared with anyone.',
  },
  {
    heading: 'What you can do without an account.',
    body: 'You can browse the map and submit barrier reports anonymously. Anonymous reports are not linked to you. If you hide a comment, that choice is stored only on your own phone and never leaves it.',
  },
  {
    heading: 'What I store if you make an account.',
    body: 'An email address and password, handled by my hosting provider (Supabase). Your display name and avatar if you add one. The reports, comments, and feedback you submit. Your points total. If you turn notifications on, a push token so the app can reach your device.',
  },
  {
    heading: "What's in a barrier report.",
    body: 'The location of the barrier, its category and severity, your description, any photos you add, and the time you submitted it. Reports are public in the app, because that is what the map is for. Photos are stored on a public link, so please keep faces, licence plates, and anything that identifies a person out of frame.',
  },
  {
    heading: 'Your location.',
    body: 'If you allow location access, the app uses your location on your device to centre the map and work out how far away barriers are. Your own location is not stored on my servers and is not sent anywhere. The only location saved is the location of a barrier you choose to report.',
  },
  {
    heading: 'Notifications.',
    body: 'If you turn them on, I store a push token so the app can notify you about your reports. Turn them off and it stops.',
  },
  {
    heading: 'Who else sees your data.',
    body: "My hosting provider (Supabase) stores it so the app can work. When you type into the address search, that text goes to OpenStreetMap's Nominatim service to look up the place — that's the only thing it receives. Apple sees whatever Apple normally sees when you download an app from the App Store. That's it. I don't sell your data, I don't share it for advertising, and there are no third-party trackers in the app.",
  },
  {
    heading: 'Getting a copy of your data.',
    body: 'You can export your data from inside the app, in Settings.',
  },
  {
    heading: 'Deleting your account.',
    body: 'You can delete your account any time from your Profile. Deleting your account permanently removes your profile information, reports and their associated content, direct contributions, feedback, points history, notification data, and uploaded photos. This cannot be undone.',
  },
  {
    heading: 'Children.',
    body: "Flagstone isn't designed for children and I don't knowingly collect information from anyone under 13.",
  },
  {
    heading: 'Where your data lives.',
    body: 'On servers run by my hosting provider. Data may be stored or processed outside Canada.',
  },
  {
    heading: 'Your rights.',
    body: "Under Canadian privacy law (PIPEDA) you can ask what I hold about you, ask for a copy, and ask me to correct or delete it. Email support@skypistudio.com and I'll sort it out.",
  },
  {
    heading: 'Changes.',
    body: 'If this policy changes, the new version appears here with a new date.',
  },
] as const;

/**
 * A11Y-226 (WCAG 3.3.7) — the guest→sign-in draft handoff strings.
 *
 * Spoken (announce) + hint copy for the report-draft stash: signing in from
 * the anon banner used to silently destroy the filled form. AGENT-PROPOSED
 * wording. PROPOSED (A11Y-226, S-8) — Sky's final wording lands in
 * DECISIONS §A / the next copy gate.
 */
export const REPORT_SIGN_IN_HINT =
  'Closes this form so you can sign in. Your draft is kept and restored when you open Report again.';
export const REPORT_DRAFT_KEPT_ANNOUNCEMENT =
  'Draft saved. After you sign in, open Report again to continue where you left off.';
export const REPORT_DRAFT_RESTORED_ANNOUNCEMENT = 'Your report draft was restored.';

/**
 * THE MISSION STATEMENT — ratified by Sky, and the one string in this file that
 * is not PROPOSED.
 *
 * Q11 (art-direction 2026-08-21): it belongs in the product, on About and on
 * the guest Profile, not only in the documents about the product. It is
 * exported ONCE and read by both surfaces so the two can never drift, and
 * `mission.guard.test.ts` pins the exact characters.
 *
 * ⚠ VERBATIM. Never paraphrase it, never re-wrap it, never "fix" its wording —
 * including the name inside it. It says "AccessMap" because that is what Sky
 * ratified; the app is called Flagstone now, and whether this sentence follows
 * the rename is HERS to decide, not a builder's. The decision is logged in
 * `design-reviews/art-direction/2026-08-21/build/COPY_LEDGER.md`. Changing it
 * is a one-line edit here, and every surface follows.
 */
export const MISSION_STATEMENT =
  "The goal of Flagstone is to make the community and environment better for everyone, through those who have the capacity to help. Progress happens in the background for everyone's benefit, because accessibility benefits everyone.";

/**
 * A3/A4 — THE ASYNC ANNOUNCEMENTS (art-direction Phase 3, D18).
 *
 * These are strings a screen reader SPEAKS and nobody ever reads. That does not
 * make them less user-facing, and it is the reason they live here rather than
 * inline: an announcement is copy, it is the only version of the interface some
 * users get, and it belongs where Sky can see and change it.
 *
 * ⚠ AGENT-PROPOSED WORDING. Listed in the Phase 3 section of
 * `design-reviews/art-direction/2026-08-21/build/COPY_LEDGER.md` for Sky's
 * ratification, same as any visible string.
 *
 * ─── WHY EACH ONE IS SHAPED THE WAY IT IS ─────────────────────────────────
 * A loading announcement says what is being fetched, not "Loading" — a
 * VoiceOver user may have several surfaces in play and a bare gerund names
 * none of them. A completion announcement says what ARRIVED, with the count,
 * because that is the fact a sighted user gets from the screen for free and
 * the one a spinner disappearing cannot convey.
 *
 * No em dashes; sentence case; the same voice as the visible copy around them.
 */
export const STATUS_HISTORY_LOADING_ANNOUNCEMENT = 'Loading status history';
export const statusHistoryLoadedAnnouncement = (n: number) =>
  n === 0
    ? 'Status history loaded. Nothing has happened to this flag yet.'
    : `Status history loaded. ${n} ${n === 1 ? 'change' : 'changes'}.`;

export const NOTIFICATION_PREFS_LOADING_ANNOUNCEMENT = 'Loading your preferences';
export const NOTIFICATION_PREFS_LOADED_ANNOUNCEMENT = 'Preferences loaded.';

export const MY_FEEDBACK_LOADING_ANNOUNCEMENT = 'Loading your feedback';
export const myFeedbackLoadedAnnouncement = (n: number) =>
  n === 0
    ? 'Feedback loaded. You have not sent any yet.'
    : `Feedback loaded. ${n} ${n === 1 ? 'item' : 'items'}.`;

/**
 * OUTCOME ANNOUNCEMENTS — the HiddenCommentsModal pattern, back-ported.
 *
 * Unlike the loading pair above these are NOT iOS-gated. They answer a user's
 * own action rather than narrating a passive state change, there is no live
 * region rendered alongside them to double up with, and on both platforms the
 * result is otherwise silent: a Switch that flips, a row that vanishes, a file
 * that saves. HiddenCommentsModal already announces exactly this way.
 */
export const PUSH_ENABLED_ANNOUNCEMENT = 'Push notifications on.';
export const PUSH_DISABLED_ANNOUNCEMENT = 'Push notifications off.';
export const EXPORT_STARTED_ANNOUNCEMENT = 'Preparing your data export.';
export const authorUnblockedAnnouncement = (n: number) =>
  `${n} ${n === 1 ? 'person' : 'people'} unblocked on this device.`;
export const flagUnwatchedAnnouncement = (name: string) => `Stopped watching ${name}.`;
