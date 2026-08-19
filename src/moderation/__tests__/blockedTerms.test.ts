/**
 * The submit-time filter — Apple 1.2(a).
 *
 * ⚠ THE MUST-PASS CORPUS IS THE MORE IMPORTANT HALF OF THIS SUITE, and it is
 * first on purpose. A content filter is trivially "correct" if it blocks
 * everything; what makes this one safe to ship in Flagstone is that a
 * frustrated disabled person describing a real barrier gets through. Those
 * cases are the regression guard on Sky's D-2 curation decision, so if this
 * block ever goes red, the filter got greedier and someone's report is being
 * silently rejected — fix the list, do not relax the test.
 */
import fs from 'fs';
import path from 'path';

import {
  ADDITIONS,
  allBlockedTerms,
  containsBlockedTerm,
  findBlockedTerm,
  resetMatcher,
} from '../blockedTerms';

afterEach(() => {
  ADDITIONS.length = 0;
  resetMatcher();
});

describe('MUST PASS — real barrier reports are never blocked', () => {
  /**
   * Written as things an actual user would type into this app. The profane
   * ones are not padding: they are the exact class D-2 chose to allow, and
   * they are why the curation exists.
   */
  const REAL_REPORTS = [
    'No ramp at the main entrance, only three steps.',
    'The damn ramp is still broken after six months.',
    'This curb cut is a joke — shit design, water pools at the bottom.',
    'Elevator out of service again. This is bullshit for wheelchair users.',
    'Automatic door button is broken, you have to pull it manually.',
    'Bathroom stall is too narrow for a chair to turn around in.',
    'Damn thing has no braille on any of the buttons.',
    'The staff were assholes about letting my service dog in.',
    'Tactile paving stops halfway across the crossing.',
    'Hell of a steep gradient, unusable without assistance.',
    'Accessible parking is always occupied by delivery vans.',
    'Counter is too high to reach from a seated position.',
    'No hearing loop in the assessment room.',
    'Passable, but only just — the gap is about 70cm.',
    'The assistance desk was unstaffed for the whole hour.',
    'Sign says accessible but the route is a gravel path.',
  ];

  it.each(REAL_REPORTS)('passes: %s', (text) => {
    expect(containsBlockedTerm(text)).toBe(false);
  });

  /**
   * The classic substring bug. Word-boundary matching is the whole reason
   * these are safe, and every one is a word a barrier report plausibly uses.
   */
  const SCUNTHORPE = [
    'Scunthorpe station has no step-free access.',
    'Staff need assistance training.',
    'Please assess the gradient here.',
    'The surface is passable in dry weather.',
    'Classic entrance, no ramp.',
    'Therapist office is on the second floor, no lift.',
    'Cassette player for audio guides is broken.',
    'The analysis of the route was wrong.',
  ];

  it.each(SCUNTHORPE)('substring is not a match: %s', (text) => {
    expect(containsBlockedTerm(text)).toBe(false);
  });

  it('empty and whitespace input is not a match', () => {
    for (const s of ['', '   ', '\n\t']) expect(containsBlockedTerm(s)).toBe(false);
  });
});

describe('MUST FAIL — the four classes §2 names', () => {
  it('blocks a disability slur, the one most likely to appear here', () => {
    expect(containsBlockedTerm('the staff are retarded')).toBe(true);
  });

  it('blocks a racial slur', () => {
    expect(containsBlockedTerm('no ramp you nigger')).toBe(true);
  });

  it('blocks an explicit sexual term', () => {
    expect(containsBlockedTerm('what a cunt')).toBe(true);
  });

  it('blocks a harassment phrase, matched across the whole phrase', () => {
    expect(containsBlockedTerm('kill yourself')).toBe(true);
    // The individual words are innocuous — the harm is the construction.
    expect(containsBlockedTerm('the lift will kill the schedule')).toBe(false);
    expect(containsBlockedTerm('please help yourself to a leaflet')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(containsBlockedTerm('RETARDED')).toBe(true);
    expect(containsBlockedTerm('ReTaRdEd')).toBe(true);
  });

  it('sees through a combining diacritic', () => {
    // "retarded" with a combining acute on the first e.
    expect(containsBlockedTerm('rétarded'.normalize('NFD'))).toBe(true);
  });

  it('matches a phrase split across a line break', () => {
    expect(containsBlockedTerm('kill\nyourself')).toBe(true);
  });

  it('matches mid-sentence, not only at the start', () => {
    expect(containsBlockedTerm('the entrance is fine but you are a faggot')).toBe(true);
  });
});

describe('the list itself', () => {
  it('is all lowercase, so the matcher cannot be defeated by list casing', () => {
    for (const term of allBlockedTerms()) expect(term).toBe(term.toLowerCase());
  });

  it('has no duplicates', () => {
    expect(new Set(allBlockedTerms()).size).toBe(allBlockedTerms().length);
  });

  it('carries no term short enough to be a common fragment', () => {
    // A 2-character entry inside a `\b…\b` alternation is a false-positive
    // factory. The shortest legitimate entry is "kys".
    for (const term of allBlockedTerms()) expect(term.length).toBeGreaterThanOrEqual(3);
  });

  it('honours ADDITIONS after a reset — the Sky-editable path §2 promises', () => {
    expect(containsBlockedTerm('flarpwaggle')).toBe(false);
    ADDITIONS.push('flarpwaggle');
    resetMatcher();
    expect(containsBlockedTerm('flarpwaggle')).toBe(true);
    // Still word-boundary, even for a runtime addition.
    expect(containsBlockedTerm('flarpwagglez')).toBe(false);
  });

  it('findBlockedTerm returns the most specific match, longest-first', () => {
    // "kill yourself" contains no other listed term, but the sort order is what
    // guarantees a phrase beats a word when both could match.
    expect(findBlockedTerm('kill yourself')).toBe('kill yourself');
    expect(findBlockedTerm('perfectly fine report')).toBeNull();
  });
});

describe('the fences around where this filter may be applied', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

  /**
   * ⚠ THE ONE THAT MATTERS MOST.
   *
   * The report sheet's free-text reason must NEVER be filtered. Reporting
   * abuse routinely means quoting it — "this comment called me a <slur>" is
   * the single most useful report a moderator can receive. Filtering that
   * field would block the abuse reports the filter exists to support, and it
   * would fail silently, because the user would just see their report refused.
   *
   * §2 scopes the filter to flag descriptions and comments. This test is here
   * so a future "we filter user text everywhere, surely?" tidy-up goes red.
   */
  it('reports.ts does NOT filter the report reason — quoting abuse is the point', () => {
    const src = read('lib/reports.ts');
    expect(src).not.toContain('blockedTerms');
    expect(src).not.toContain('containsBlockedTerm');
  });

  it('the filter runs before the network call in every call site', () => {
    for (const [file, guard] of [
      ['lib/comments.ts', 'containsBlockedTerm(trimmed)'],
      ['lib/flags.ts', 'containsBlockedTerm(input.description)'],
      // Added 2026-08-18. display_name is rendered under its owner's byline on
      // OTHER people's barrier reports (comments.ts joins it onto every
      // comment) and on the public leaderboard, so it reaches more readers than
      // any single report does. It was the one user-authored string with no
      // filter. `.update(` rather than `.insert(` because a profile edit is an
      // update — the assertion is the same one: guard before the network call.
      ['lib/users.ts', 'containsBlockedTerm(trimmed)'],
    ] as const) {
      const src = read(file);
      expect(src).toContain(guard);
      // The guard has to precede the write it is guarding.
      const write = file === 'lib/users.ts' ? '.update(' : '.insert(';
      expect(src.indexOf(guard)).toBeLessThan(src.indexOf(write));
    }
  });

  it('the rejection copy never names the matched term', () => {
    // §2: "Deliberately does not echo or name the matched term." Both call
    // sites throw the bare constant, never an interpolation of the match.
    for (const file of ['lib/comments.ts', 'lib/flags.ts']) {
      const src = read(file);
      expect(src).toContain('throw new Error(CONTENT_BLOCKED_MESSAGE)');
      expect(src).not.toContain('findBlockedTerm');
    }
  });
});

/**
 * ─── THE VENDORING (§SKY-6, 2026-07-28) ───────────────────────────────────
 *
 * These do not test the matcher. They test that the LIST is still the list the
 * header claims it is — which is the thing a future re-vendoring is most likely
 * to break, silently, while every behavioural test above stays green.
 *
 * The existing "has no duplicates" test already proves the three tiers are
 * disjoint (a term in two tiers would surface as a duplicate in the union), so
 * that is not restated here.
 */
describe('the vendored list is still what the header says it is', () => {
  const all = () => allBlockedTerms();

  it('carries the vendored bulk — this is not a hand-written seed any more', () => {
    // 354 vendored + 15 curated extra. A wholesale replace that dropped the
    // extras would land near 354; a revert to the old seed would land near 38.
    expect(all().length).toBe(369);
  });

  /**
   * ⚠ THE MOST IMPORTANT TEST IN THIS FILE.
   *
   * LDNOOBW contains NO disability slurs and NO self-harm phrases — verified by
   * set difference against upstream. They live only in CURATED_EXTRA. A future
   * "just re-vendor the list" would delete exactly the class most likely to be
   * aimed at this app's users, and would do it without touching a single line
   * of matcher code. This is what notices.
   */
  it('still blocks the classes LDNOOBW does not contain at all', () => {
    for (const term of ['retard', 'retarded', 'cripple', 'mongoloid']) {
      expect(all()).toContain(term);
    }
    for (const phrase of ['kill yourself', 'kys', 'go die', 'neck yourself']) {
      expect(all()).toContain(phrase);
    }
  });

  it('does not block ordinary profanity, however the list is re-vendored', () => {
    // The D-2 decision, asserted against the union rather than against the
    // dropped-list comment — a comment cannot go red.
    for (const term of ['shit', 'fuck', 'bitch', 'ass', 'damn', 'bullshit']) {
      expect(all()).not.toContain(term);
    }
  });

  /**
   * The class the vendoring itself introduced. LDNOOBW is written for
   * general-purpose moderation; this app's users write these words in genuine
   * barrier reports, and the raw list would have rejected every one.
   */
  it('does not block words that are neutral vocabulary in an accessibility app', () => {
    for (const term of ['sex', 'sexual', 'escort', 'rectum', 'anus', 'grope', 'butt', 'suck']) {
      expect(all()).not.toContain(term);
    }
  });

  it('the neutral drops did not take their sexual compounds with them', () => {
    // Dropping the bare word `sex` must not disarm `sexo`/`sexcam`/`sexy` — the
    // ambiguity was in the standalone word, not the compounds.
    expect(containsBlockedTerm('want some sexcam action')).toBe(true);
    expect(containsBlockedTerm('the single-sex washroom is locked')).toBe(false);
    expect(containsBlockedTerm('staff would not escort me to the lift')).toBe(false);
    expect(containsBlockedTerm('I had to grope along the wall to find the door')).toBe(false);
  });

  it('every term is still lowercase and boundary-safe after vendoring', () => {
    for (const term of all()) {
      expect(term).toBe(term.toLowerCase());
      expect(term.trim()).toBe(term);
      expect(term.length).toBeGreaterThanOrEqual(3);
    }
  });
});
