/**
 * TIER 1 — the pageSheet class swipes natively, and keeps its door.
 *
 * RN 0.81.5 blocks iOS's interactive sheet dismissal by default
 * (modalInPresentation = YES, RCTModalHostView.m:38). Every pageSheet in this
 * app therefore has to opt in explicitly with `allowSwipeDismissal`, or it
 * regresses to the old behaviour: the sheet resists the finger, rubber-bands,
 * and only then closes — under a grabber pill that promised a drag.
 *
 * Class-wide by construction, not a hand-listed set: the census is parsed from
 * source on every run, so a NEW pageSheet added next year enters it
 * automatically and has to satisfy the same three rules.
 *
 * House idiom: static source scan (cf. dismissalStandard.guard.test.ts, whose
 * tag parser this mirrors deliberately rather than importing — that file
 * excludes itself from its own sweep, and sharing the helper would drag its
 * self-exclusion in here).
 *
 * See design-reviews/map-gestures/2026-08-12/ SPEC §2.2 for the mechanism.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');

/** Blank out comments while preserving line numbers, so prose never matches. */
function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['__tests__', '__mocks__', 'node_modules'].includes(entry.name)) continue;
      out.push(...walkTsx(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

interface Tag {
  rel: string;
  line: number;
  tag: string;
  /** Everything after the tag — where the close button lives. */
  body: string;
}

/**
 * Every <Modal> open tag, brace-depth aware so arrow bodies and ternaries
 * inside props don't truncate the tag early.
 */
function pageSheets(): Tag[] {
  const out: Tag[] = [];
  for (const file of walkTsx(SRC)) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/<Modal[\s>/]/g)) {
      const i = m.index as number;
      let depth = 0;
      let j = i;
      while (j < src.length) {
        const c = src[j];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
        j++;
      }
      const tag = src.slice(i, j + 1);
      if (!/presentationStyle="pageSheet"/.test(tag)) continue;
      out.push({
        rel: path.relative(SRC, file),
        line: src.slice(0, i).split('\n').length,
        tag,
        body: src.slice(j + 1),
      });
    }
  }
  return out;
}

describe('tier 1 · native pageSheet swipe', () => {
  const sheets = pageSheets();

  it('finds the pageSheet class (sanity: the scan is not vacuous)', () => {
    // Nearby, Resources, How to help, Privacy, Terms as of 2026-08-12.
    expect(sheets.length).toBeGreaterThanOrEqual(5);
  });

  it('every pageSheet opts into the native swipe', () => {
    const offenders = sheets
      .filter((s) => !/\ballowSwipeDismissal\b/.test(s.tag))
      .map((s) => `${s.rel}:${s.line} → no allowSwipeDismissal; the drag will fight the user`);
    expect(offenders).toEqual([]);
  });

  it('every pageSheet still routes the swipe through onRequestClose', () => {
    // Not decoration: RN dev-asserts this pairing (Modal.js:204-208) because the
    // completed gesture is the ONLY signal that the sheet is gone. Without it
    // the sheet slides away while JS still believes it is open.
    const offenders = sheets
      .filter((s) => !/\bonRequestClose=/.test(s.tag))
      .map((s) => `${s.rel}:${s.line} → allowSwipeDismissal without onRequestClose = state corruption`);
    expect(offenders).toEqual([]);
  });

  it('every pageSheet keeps a labelled close button (the gesture never becomes the only door)', () => {
    // Sky's rule, as a test: gestures AUGMENT. A future refactor that deletes a
    // visible Close because "you can just swipe" fails here — and it should,
    // since VoiceOver users never perform the swipe at all.
    const offenders = sheets
      .filter((s) => !/accessibilityLabel=["{]?[^\n]*Close/i.test(s.body))
      .map((s) => `${s.rel}:${s.line} → no labelled Close affordance after the tag`);
    expect(offenders).toEqual([]);
  });
});
