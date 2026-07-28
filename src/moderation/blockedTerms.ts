/**
 * Submit-time content filter — Apple Guideline 1.2(a).
 *
 * Spec: `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` §2, ratified by
 * Sky 2026-07-27. Decision D-2 (DECISIONS §SKY-5): **CURATED, not raw.**
 *
 * ─── WHAT THIS LIST IS, HONESTLY ──────────────────────────────────────────
 * §2 names LDNOOBW as the seed. This file is **NOT a verbatim vendoring of
 * that list** — no network fetch happened in the run that wrote it, and a
 * header claiming otherwise would be a lie in exactly the place someone would
 * later trust it. What this is: a curated seed covering the four classes §2
 * actually names — slurs and hate terms, explicit sexual terms, harassment
 * language — written to be correct-but-small rather than large-but-unreviewed.
 *
 * ⚠ SKY / JORDAN REVIEW WANTED before this is called complete. Two options,
 *   both fine, neither urgent enough to block the leg:
 *     (a) vendor the real LDNOOBW English file and re-apply the D-2 curation
 *         rule to it, replacing SEED below;
 *     (b) keep this seed and extend it in ADDITIONS as real reports come in.
 *   Either way the matcher, the call sites and the tests do not change.
 *
 * ─── THE CURATION RULE (D-2) ──────────────────────────────────────────────
 * KEPT: slurs targeting protected characteristics · explicit sexual terms ·
 *       harassment and self-harm-encouragement phrases.
 * DROPPED: ordinary profanity. Sky's reasoning, recorded because it is the
 *       whole point of this app — "the damn ramp is still broken" is a real
 *       barrier report from a frustrated disabled user, and silently rejecting
 *       it teaches that person their report is unwelcome. A filter that fires
 *       on frustration is worse than no filter here.
 * See DROPPED_MILD_PROFANITY at the bottom: the dropped class is kept visible
 * so the decision stays reversible and auditable rather than vanishing.
 *
 * ─── LIMITS, STATED PLAINLY ───────────────────────────────────────────────
 * This is a CLIENT-SIDE check that runs before insert. It is bypassable by
 * anything that is not this app — a direct PostgREST call sails past it. That
 * is acceptable for 1.2(a), which asks for a filter on the posting path, and
 * it is paired with the reactive report → review → takedown half. **Do not
 * describe this anywhere as making the platform safe.** A server-side mirror
 * (a Postgres CHECK or a trigger) would be the real fence; if that is ever
 * wanted it is a MIGRATION FILE proposal for Sky to apply, never an agent
 * change.
 *
 * Word-boundary matching kills the classic Scunthorpe substring bug. It does
 * not stop deliberate evasion — l33tspeak, homoglyphs, spaced-out letters.
 * That is a knowing trade: aggressive normalisation buys a little evasion
 * resistance at the cost of many more false positives, and in an accessibility
 * reporting tool the false positive is the more expensive error.
 */

/**
 * Terms that block a submission. Lowercase, matched on word boundaries.
 *
 * Grouped by the class §2 names so the curation stays auditable. Multi-word
 * entries are matched as written (whitespace-normalised at match time).
 */
const SEED: readonly string[] = [
  // ── Slurs and hate terms ────────────────────────────────────────────────
  // Racial, ethnic, religious, sexual-orientation, gender-identity, and
  // disability slurs. The disability entries matter especially here: this is
  // an app built by and for disabled users, and "retard"/"retarded" is the
  // single most likely slur to appear in an angry report about a bad ramp.
  'nigger',
  'nigga',
  'chink',
  'gook',
  'spic',
  'wetback',
  'kike',
  'towelhead',
  'raghead',
  'faggot',
  'fag',
  'dyke',
  'tranny',
  'shemale',
  'retard',
  'retarded',
  'cripple',
  'spastic',
  'mongoloid',

  // ── Explicit sexual terms ───────────────────────────────────────────────
  'cunt',
  'blowjob',
  'handjob',
  'cumshot',
  'creampie',
  'gangbang',
  'bukkake',
  'felching',
  'rimjob',
  'dildo',
  'buttplug',
  'jizz',

  // ── Harassment / self-harm encouragement ────────────────────────────────
  // Phrases, not single words, because the harm is in the construction.
  'kill yourself',
  'kys',
  'go die',
  'you should die',
  'hope you die',
  'neck yourself',
];

/**
 * ⚑ SKY-EDITABLE. Add terms here rather than editing SEED — this array is the
 * one §2 promises, and keeping additions separate means a future re-vendoring
 * of LDNOOBW can replace SEED wholesale without losing anything Sky added.
 *
 * Same rules apply: lowercase, and prefer a whole word or phrase over a
 * fragment. A fragment like 'ass' would block "assistance", "assess" and
 * "passable" — all words a barrier report genuinely needs.
 */
export const ADDITIONS: string[] = [];

/**
 * Every term the filter checks, read live.
 *
 * A function, not a `const` array, on purpose: a const would snapshot ADDITIONS
 * at module load, so anything pushed later — a Settings-driven list, a test —
 * would be silently ignored while the export still *looked* authoritative.
 * That was a real bug in the first draft of this file, caught by the ADDITIONS
 * test below.
 */
export function allBlockedTerms(): readonly string[] {
  return [...SEED, ...ADDITIONS];
}

/** Escape a term for safe interpolation into the matcher. */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One alternation regex, built once. Sorted longest-first so a phrase wins
 * over a word it contains, which keeps `findBlockedTerm`'s answer the most
 * specific true one rather than an arbitrary shorter match.
 *
 * `\b` on both ends is what makes this word-boundary rather than substring —
 * the difference between blocking "cunt" and blocking "Scunthorpe".
 */
let matcher: RegExp | null = null;

function getMatcher(): RegExp {
  if (matcher) return matcher;
  const alternation = [...allBlockedTerms()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  matcher = new RegExp(`\\b(${alternation})\\b`, 'i');
  return matcher;
}

/**
 * Call after mutating ADDITIONS at runtime. Exists for tests and for a future
 * Settings-driven list; the shipped app never needs it.
 */
export function resetMatcher(): void {
  matcher = null;
}

/**
 * Normalise before matching: collapse whitespace so a multi-word phrase still
 * matches across a line break, and strip combining marks so a diacritic cannot
 * trivially smuggle a slur past ("nigger" with a combining acute).
 *
 * Deliberately does NOT collapse repeated letters or map leetspeak — see the
 * false-positive trade in the file header.
 */
function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * The matched term, or null. **Diagnostic and test use only — never show this
 * to the user.** §2 is explicit that the rejection copy does not echo or name
 * the matched term, and that is not decoration: naming it turns the filter
 * into a hint sheet for getting past it, and repeats the slur back at whoever
 * just read it.
 */
export function findBlockedTerm(text: string): string | null {
  const found = getMatcher().exec(normalise(text));
  return found?.[1] ? found[1].toLowerCase() : null;
}

/** Whether the text may not be submitted. */
export function containsBlockedTerm(text: string): boolean {
  return findBlockedTerm(text) !== null;
}

/**
 * ─── DROPPED BY THE D-2 CURATION ──────────────────────────────────────────
 * Kept visible, not deleted, so the decision is reversible and a future reader
 * can see what the curation actually did rather than having to diff against an
 * upstream file. These are in LDNOOBW and are DELIBERATELY NOT BLOCKED:
 *
 *   damn · hell · crap · shit · piss · bastard · bitch · asshole · dick ·
 *   prick · bollocks · bugger · wanker · fuck (and inflections)
 *
 * A user swearing about a genuine barrier is still filing a genuine barrier
 * report. If Sky ever wants these blocked, move them into ADDITIONS — but the
 * must-pass corpus in `__tests__/blockedTerms.test.ts` will go red, and that
 * red is the point: it is the regression guard on this decision.
 */
