/**
 * TERMS GUARD — the drift tripwire between Sky's document and the app.
 *
 * §SKY-6: "Words rendered VERBATIM from 14_MODERATION_TEXTS_v1.md §1; render,
 * never rewrite."
 *
 * ⚑ THIS IS THE FIRST TEST IN THE REPO THAT READS A MARKDOWN FILE, and the
 * reason is worth stating. Every other copy fence here checks a JSDoc *marker*
 * — a claim, in a comment, that a string was ratified. A marker cannot catch
 * the failure that actually matters: someone edits the string and leaves the
 * marker in place, and the const goes on asserting a ratification it no longer
 * has. So this one skips the claim and compares the text.
 *
 * It fails in BOTH directions on purpose:
 *   - edit the app's copy   → the const no longer matches §1
 *   - edit Sky's document   → the const no longer matches §1
 * The second is not a false positive. If Sky revises the terms, the app must be
 * revised with them, and a red test is exactly how that gets noticed. §1's own
 * "Changes" paragraph promises a new date at the top when the terms change —
 * `TERMS_EFFECTIVE` is that promise, so it is pinned too.
 *
 * WHAT THIS DOES NOT DO: it does not police what Sky wrote. Only that what she
 * wrote is what ships.
 */
import fs from 'fs';
import path from 'path';

import {
  TERMS_EFFECTIVE,
  TERMS_LINK_HINT,
  TERMS_LINK_LABEL,
  TERMS_SECTIONS,
  TERMS_TITLE,
} from '@/lib/copy';
import { FEEDBACK_EMAIL } from '@/lib/feedback';

const REPO = path.join(__dirname, '..', '..');
const readSrc = (rel: string) => fs.readFileSync(path.join(REPO, 'src', rel), 'utf8');

const DOC_REL = 'design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md';
const DOC = fs.readFileSync(path.join(REPO, DOC_REL), 'utf8');

/**
 * §1 of the moderation texts, sliced between its own heading and the next.
 * Sliced rather than regex-scraped so that a new §1 paragraph Sky adds lands
 * inside the window and trips the count assertion, instead of being quietly
 * skipped by a pattern that only matched what existed on the day this was
 * written.
 */
function sectionOne(): string {
  const start = DOC.indexOf('## 1 · Terms & Community Guidelines');
  const end = DOC.indexOf('## 2 ·', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return DOC.slice(start, end);
}

/** The bolded paragraphs of §1, in document order, as `[heading, body]`. */
function docParagraphs(): [string, string][] {
  return [...sectionOne().matchAll(/^\*\*(.+?)\*\*\s(.+)$/gm)].map((m) => [m[1], m[2]]);
}

describe('the terms screen renders Sky\'s document, verbatim', () => {
  it('the source document still exists where the constants say it does', () => {
    // If §1 is ever renamed or moved, everything below would pass vacuously on
    // an empty slice. Fail loudly here instead.
    expect(sectionOne().length).toBeGreaterThan(500);
  });

  it('the title and effective line match §1', () => {
    const firstLine = sectionOne()
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('Flagstone Terms'));
    expect(firstLine).toBe(`${TERMS_TITLE} ${TERMS_EFFECTIVE}`);
  });

  it('every paragraph of §1 is present in TERMS_SECTIONS, in order and verbatim', () => {
    const doc = docParagraphs();
    expect(doc.length).toBeGreaterThan(0);
    expect(TERMS_SECTIONS.map((s) => [s.heading, s.body])).toEqual(doc);
  });

  it('TERMS_SECTIONS adds nothing §1 does not contain', () => {
    // The paired assertion to the one above. Together they are an equality, not
    // a containment: no agent may append a tenth paragraph of its own.
    expect(TERMS_SECTIONS.length).toBe(docParagraphs().length);
  });

  it('the contact address in the terms is the app\'s real address', () => {
    // The body is a verbatim literal by contract, so it cannot interpolate
    // FEEDBACK_EMAIL. This is the assertion that stands in for that: change one
    // without the other and the terms start naming an address nobody reads.
    const contact = TERMS_SECTIONS.find((s) => s.heading === 'Contact.');
    expect(contact).toBeDefined();
    expect(contact?.body).toContain(FEEDBACK_EMAIL);
  });

  it('the 24-hour commitment is word-identical in the terms and in the app', () => {
    // REPORT_SENT_BODY is the only place in the running binary that states the
    // commitment; §1 "Reports and moderation" is where Sky published it. Their
    // drifting apart is the exact failure copy.ts:158 warns about.
    const moderation = TERMS_SECTIONS.find((s) => s.heading === 'Reports and moderation.');
    expect(moderation?.body).toContain('within 24 hours');
  });
});

describe('the terms are reachable from all three surfaces (§SKY-6)', () => {
  // Mirrors privacyLink.guard.test.ts's SURFACES table. A screen that renders
  // the terms but that nobody can reach is the gap this whole car closes, so
  // the entry points are guarded as hard as the text is.
  const SURFACES: readonly [label: string, rel: string][] = [
    ['Settings', 'screens/SettingsScreen.tsx'],
    ['About', 'screens/AboutScreen.tsx'],
    ['the report sheet', 'components/ReportContentModal.tsx'],
  ];

  it.each(SURFACES)('%s opens the terms', (_label, rel) => {
    const src = readSrc(rel);
    expect(src).toContain('TERMS_LINK_LABEL');
    expect(src).toContain("setOpen('terms')");
  });

  it.each(SURFACES)('%s labels the entry from the shared const, never a literal', (_label, rel) => {
    const src = readSrc(rel);
    // One const for three surfaces is the B-2 privacy-link grammar. A literal
    // here would let the three drift apart the way the offline banner once did.
    expect(src).not.toMatch(/['"`]Terms & Community Guidelines['"`]/);
  });

  it('the About entry is appended AFTER the privacy link, so no prose moves', () => {
    // PROTECT-11: the privacy-forward trust voice in About is insertion-only.
    const src = readSrc('screens/AboutScreen.tsx');
    expect(src.indexOf('PRIVACY_POLICY_LINK_LABEL}\n              </AppText>')).toBeLessThan(
      src.indexOf('TERMS_LINK_LABEL}\n              </AppText>'),
    );
  });

  it('the terms sheet is mounted exactly once, in the shared host', () => {
    const nav = readSrc('navigation/RootNavigator.tsx');
    expect(nav).toContain("<TermsScreen visible={open === 'terms'}");
    // Two mounts would mean two <Modal>s racing the same context slot — the
    // duplicate-mount bug sharedModalsContext was created to end.
    const mounts = [...nav.matchAll(/<TermsScreen\b/g)];
    expect(mounts).toHaveLength(1);
  });

  it('no entry point announces an in-app sheet as a browser link', () => {
    // The terms never leave the app. Reusing OPENS_IN_BROWSER_HINT would be a
    // lie told only to screen-reader users, which is the worst kind to ship.
    expect(TERMS_LINK_HINT).not.toMatch(/browser/i);
    expect(TERMS_LINK_LABEL.length).toBeGreaterThan(0);
  });
});

/**
 * §SKY-7 added two MORE ways into the terms, and they are a different species
 * from the three above.
 *
 * The SURFACES table guards NAVIGATIONAL entry points: a control labelled
 * `TERMS_LINK_LABEL` that a user chooses to press. These two are alert BUTTONS
 * on a rejection the user did not ask for, labelled `VIEW_GUIDELINES_LABEL`
 * ("View guidelines") because in that moment the reader wants the rules they
 * apparently broke, not a document title.
 *
 * They are deliberately NOT rows in SURFACES — they would fail its
 * label-and-hint contract, and weakening that contract to admit them would cost
 * more than it bought. They are pinned here instead so the next reader learns
 * from this file that there are five doors, not three. Their behaviour is
 * covered in `src/lib/__tests__/blockedContent.test.ts`.
 */
describe('the terms are also reachable from the blocked-content alert (§SKY-7)', () => {
  const ALERT_SURFACES: readonly [label: string, rel: string][] = [
    ['comment submit', 'components/FlagDetailModal.tsx'],
    ['flag description submit', 'screens/ReportFlagModal.tsx'],
  ];

  it.each(ALERT_SURFACES)('%s opens the shared terms modal', (_label, rel) => {
    const src = readSrc(rel);
    expect(src).toContain("setOpen('terms')");
    expect(src).toContain('showBlockedContentAlert(');
  });

  it('the button label lives in copy.ts, never as a literal at the call site', () => {
    // Same fence as the SURFACES table, applied to the string these actually
    // render. The literal must appear in exactly one place: its own const.
    for (const [, rel] of ALERT_SURFACES) {
      expect(readSrc(rel)).not.toMatch(/['"`]View guidelines['"`]/);
    }
    expect(readSrc('lib/blockedContent.ts')).toContain('VIEW_GUIDELINES_LABEL');
  });

  it('the alert body is the ratified rejection, not new prose', () => {
    // §SKY-7 permits exactly one new user-visible string — the button label.
    const helper = readSrc('lib/blockedContent.ts');
    expect(helper).toContain('CONTENT_BLOCKED_MESSAGE');
    expect(helper).not.toMatch(/Alert\.alert\(\s*['"`]/);
  });
});
