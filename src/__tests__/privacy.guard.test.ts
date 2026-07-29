/**
 * PRIVACY GUARD — the drift tripwire between Sky's policy and the app.
 *
 * §SKY-8: the policy "ships rendered VERBATIM into an in-app Privacy Policy
 * screen … with a drift tripwire test reading the markdown."
 *
 * The sibling of `terms.guard.test.ts`, and it exists for the same reason: a
 * JSDoc marker only records a CLAIM that a string was ratified, and cannot catch
 * someone editing the string while leaving the marker in place. So this compares
 * the text, in both directions:
 *
 *   - edit the app's copy      → the const no longer matches the document
 *   - edit Sky's document      → the const no longer matches the document
 *
 * The second is not a false positive. The policy's own "Changes" paragraph
 * promises "the new version appears here with a new date"; a revision that never
 * reached the binary would break that promise silently, and a red test is how
 * that gets noticed. `PRIVACY_EFFECTIVE` is that date, so it is pinned too.
 *
 * ⚑ WHY THIS ONE IS NOT A COPY-PASTE OF THE TERMS GUARD. `15_` differs from
 * `14_` in three structural ways, each of which would have made a copied
 * assertion pass vacuously or fail wrongly:
 *
 *   1. the title is a bold line of its OWN, with the effective date on the NEXT
 *      line — in `14_` they share one line;
 *   2. the slice anchors are `## The policy text` → `## Ratification block`;
 *   3. **the prose carries inline `[V: …]` / `[V]` verification markers.** They
 *      are instructions to the build run, not policy text, and rendering them
 *      would put `[V: dataExport path]` in front of a user. The strip rule is
 *      defined ONCE, here, and asserted — see `stripV` below.
 *
 * WHAT THIS DOES NOT DO: it does not police what Sky wrote. Only that what she
 * wrote is what ships. Whether what she wrote is TRUE of the app is a different
 * question, answered once per render by `16_V_VERIFICATION_TABLE.md`.
 */
import fs from 'fs';
import path from 'path';

import {
  PRIVACY_EFFECTIVE,
  PRIVACY_POLICY_LINK_HINT,
  PRIVACY_POLICY_LINK_LABEL,
  PRIVACY_SECTIONS,
  PRIVACY_TITLE,
} from '@/lib/copy';
import { FEEDBACK_EMAIL } from '@/lib/feedback';

const REPO = path.join(__dirname, '..', '..');
const readSrc = (rel: string) => fs.readFileSync(path.join(REPO, 'src', rel), 'utf8');

const DOC_REL = 'design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md';
const DOC = fs.readFileSync(path.join(REPO, DOC_REL), 'utf8');

/**
 * The policy body, sliced between its own heading and the ratification block.
 * Sliced rather than regex-scraped so a paragraph Sky adds lands inside the
 * window and trips the count assertion, instead of being quietly skipped by a
 * pattern that only matched what existed the day this was written.
 */
function policyText(): string {
  const start = DOC.indexOf('## The policy text');
  const end = DOC.indexOf('## Ratification block', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return DOC.slice(start, end);
}

/**
 * THE ONE TRANSFORMATION. Removes `[V: …]` and bare `[V]`, plus the single
 * space that precedes them, so a marker mid-sentence closes cleanly rather than
 * leaving a double space behind.
 *
 * Defined here and imported nowhere: `copy.ts` holds the already-stripped
 * result, so this function is what proves the stripping was done correctly
 * rather than approximately.
 */
function stripV(text: string): string {
  return text.replace(/\s*\[V(?::[^\]]*)?\]/g, '');
}

/** The bolded paragraphs of the policy, in order, as `[heading, body]`. */
function docParagraphs(): [string, string][] {
  return [...policyText().matchAll(/^\*\*(.+?)\*\*\s(.+)$/gm)].map((m) => [m[1], stripV(m[2])]);
}

describe('the privacy screen renders Sky\'s document, verbatim', () => {
  it('the source document still exists where the constants say it does', () => {
    // Without this, a renamed heading would make every assertion below pass
    // against an empty slice. Fail loudly here instead.
    expect(policyText().length).toBeGreaterThan(500);
  });

  it('the title and the effective date match the document', () => {
    // Unlike the terms, these are two separate lines — the title is bold on its
    // own line and the date follows it.
    const [heading, body] = docParagraphs()[0];
    expect(heading).toBe(PRIVACY_TITLE);
    expect(body).toBe(PRIVACY_EFFECTIVE);
  });

  it('every policy paragraph is present in PRIVACY_SECTIONS, in order and verbatim', () => {
    // docParagraphs()[0] is the title/date pair, not a section.
    const doc = docParagraphs().slice(1);
    expect(doc.length).toBeGreaterThan(0);
    expect(PRIVACY_SECTIONS.map((s) => [s.heading, s.body])).toEqual(doc);
  });

  it('PRIVACY_SECTIONS adds nothing the document does not contain', () => {
    // The paired assertion to the one above. Together they are an equality, not
    // a containment: no agent may append a paragraph of its own to a policy.
    expect(PRIVACY_SECTIONS.length).toBe(docParagraphs().length - 1);
  });

  it('the contact address in the policy is the app\'s real address', () => {
    // The body is a verbatim literal by contract, so it cannot interpolate
    // FEEDBACK_EMAIL. This stands in for that: change one without the other and
    // the policy starts naming an address nobody reads.
    const who = PRIVACY_SECTIONS.find((s) => s.heading === 'Who runs this.');
    expect(who).toBeDefined();
    expect(who?.body).toContain(FEEDBACK_EMAIL);
  });
});

describe('the [V] markers never reach a user', () => {
  it('the source document really does contain markers to strip', () => {
    // Non-vacuity for the whole describe. If the markers were ever removed from
    // the document, every assertion below would pass while proving nothing —
    // and the strip rule would silently stop being exercised.
    expect(policyText()).toMatch(/\[V(?::[^\]]*)?\]/);
    expect([...policyText().matchAll(/\[V(?::[^\]]*)?\]/g)].length).toBeGreaterThanOrEqual(10);
  });

  it('no rendered string contains a marker', () => {
    const rendered = [
      PRIVACY_TITLE,
      PRIVACY_EFFECTIVE,
      ...PRIVACY_SECTIONS.flatMap((s) => [s.heading, s.body]),
    ];
    for (const s of rendered) {
      expect(s).not.toMatch(/\[V\b/);
    }
  });

  it('stripping leaves no double spaces or space-before-punctuation behind', () => {
    // The failure mode of a naive strip: "not linked to you.  If you hide…"
    // reads as a typo in a legal document, and would be invisible to the
    // equality assertions above because both sides strip identically.
    for (const s of PRIVACY_SECTIONS.map((x) => x.body)) {
      expect(s).not.toMatch(/ {2}/);
      expect(s).not.toMatch(/\s+[.,;]/);
    }
  });

  it('stripping removes ONLY the markers — the surrounding sentence survives', () => {
    // A regex that ate too much would silently truncate the policy. Anchor on a
    // paragraph that carries a marker mid-sentence AND ends with one.
    const noAccount = PRIVACY_SECTIONS.find(
      (s) => s.heading === 'What you can do without an account.',
    );
    expect(noAccount?.body).toContain('Anonymous reports are not linked to you.');
    expect(noAccount?.body).toMatch(/never leaves it\.$/);
  });
});

describe('the policy is reachable from all three surfaces (B-2 / §SKY-8 P-2)', () => {
  // Mirrors terms.guard.test.ts's SURFACES table. A policy nobody can reach
  // fails Apple 5.1.1(i) just as surely as one that does not exist.
  const SURFACES: readonly [label: string, rel: string][] = [
    ['Settings', 'screens/SettingsScreen.tsx'],
    ['About', 'screens/AboutScreen.tsx'],
    ['sign-up', 'screens/SignInScreen.tsx'],
  ];

  it.each(SURFACES)('%s opens the in-app policy, not a browser', (_label, rel) => {
    const src = readSrc(rel);
    expect(src).toContain('PRIVACY_POLICY_LINK_LABEL');
    // The old behaviour, explicitly banned at these three sites.
    expect(src).not.toContain('openExternalUrl(PRIVACY_POLICY_URL)');
  });

  it.each(SURFACES)('%s labels the entry from the shared const, never a literal', (_label, rel) => {
    expect(readSrc(rel)).not.toMatch(/['"`]Privacy Policy['"`]/);
  });

  it.each(SURFACES)('%s no longer announces the policy as a browser link', (_label, rel) => {
    const src = readSrc(rel);
    // The policy never leaves the app now. Keeping OPENS_IN_BROWSER_HINT on
    // these rows would be a lie told only to screen-reader users, which is the
    // worst kind to ship.
    expect(src).toContain('PRIVACY_POLICY_LINK_HINT');
  });

  it('Settings and About go through the shared modal pool', () => {
    for (const rel of ['screens/SettingsScreen.tsx', 'screens/AboutScreen.tsx']) {
      expect(readSrc(rel)).toContain("setOpen('privacy')");
    }
  });

  it('sign-up mounts its own instance, because it lives outside the provider', () => {
    // App.tsx renders SignInScreen as a SIBLING of RootNavigator, so this screen
    // is outside SharedModalsProvider entirely: setOpen would throw, and the
    // host's PrivacyScreen is not mounted while signed out. The two instances
    // can never be alive at once — the auth gate makes them exclusive.
    const signIn = readSrc('screens/SignInScreen.tsx');
    expect(signIn).toContain('<PrivacyScreen visible={privacyOpen}');
    expect(signIn).not.toContain('useSharedModals');

    const app = fs.readFileSync(path.join(REPO, 'App.tsx'), 'utf8');
    expect(app).toContain('<SignInScreen');
    expect(app).toContain('<RootNavigator');
  });

  it('the context-driven mount appears exactly once, in the shared host', () => {
    const nav = readSrc('navigation/RootNavigator.tsx');
    expect(nav).toContain("<PrivacyScreen visible={open === 'privacy'}");
    // Two context-driven mounts would mean two <Modal>s racing the same slot —
    // the duplicate-mount bug sharedModalsContext was created to end.
    expect([...nav.matchAll(/<PrivacyScreen\b/g)]).toHaveLength(1);
  });

  it('the hint does not claim a browser, and the label is non-empty', () => {
    expect(PRIVACY_POLICY_LINK_HINT).not.toMatch(/browser/i);
    expect(PRIVACY_POLICY_LINK_LABEL.length).toBeGreaterThan(0);
  });
});
