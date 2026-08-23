/**
 * THE MISSION STATEMENT — pinned character for character.
 *
 * Q11 (art-direction 2026-08-21) put Sky's ratified sentence into the product:
 * About carries it, and the guest Profile will (Prompt 06). Everything else in
 * `copy.ts` is marked PROPOSED and waits on Sky's §A pass. This one is not —
 * it is already hers, which is exactly why it needs a guard the others do not:
 *
 *   · a re-wrap, a smart-quote substitution or a "tightened" clause is the kind
 *     of edit that looks like tidying and is actually rewriting somebody's
 *     ratified words;
 *   · two surfaces render it, so a second copy is how the two drift;
 *   · it used to say "AccessMap" in an app now called Flagstone. SKY RULED
 *     2026-08-23 ("fix the mission statement") that it should follow the
 *     rename, so it now says Flagstone. That was hers to decide and she
 *     decided it; the guard below flipped rather than being deleted, so the
 *     old name cannot creep back in and the new one cannot be quietly
 *     re-edited. It rendered under a "Why Flagstone" heading on About AND on
 *     the guest Profile, so the mismatch was visible to signed-out users.
 *
 * The expected value is written out in full below rather than imported and
 * compared to itself, which would assert nothing.
 */
import fs from 'fs';
import path from 'path';

import { MISSION_STATEMENT } from '@/lib/copy';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Sky's sentence, verbatim. Straight apostrophe, two sentences, no em dash. */
const RATIFIED =
  "The goal of Flagstone is to make the community and environment better for everyone, " +
  "through those who have the capacity to help. Progress happens in the background for " +
  "everyone's benefit, because accessibility benefits everyone.";

describe('the mission statement is Sky\'s, verbatim', () => {
  it('matches the ratified text character for character', () => {
    expect(MISSION_STATEMENT).toBe(RATIFIED);
  });

  it('carries no typographic substitutions', () => {
    // A smart quote, an em dash or a non-breaking space would all render fine
    // and all mean somebody edited it. Codepoint check, not a look.
    const nonAscii = [...MISSION_STATEMENT].filter((c) => c.charCodeAt(0) > 127);
    expect(nonAscii).toEqual([]);
  });

  it('says Flagstone, and the old name cannot come back', () => {
    // Flipped 2026-08-23 on Sky's ruling. Asserting BOTH directions: a revert
    // to the old name fails, and so does a half-done edit that leaves both.
    expect(MISSION_STATEMENT).toContain('Flagstone');
    expect(MISSION_STATEMENT).not.toContain('AccessMap');
  });
});

describe('one source, every surface', () => {
  it('is declared exactly once', () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!/^(__tests__|__mocks__|node_modules)$/.test(e.name)) walk(p, out);
        } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
          out.push(path.relative(SRC, p).split(path.sep).join('/'));
        }
      }
      return out;
    };
    const files = walk(SRC);
    expect(files.filter((f) => /export const MISSION_STATEMENT\b/.test(read(f)))).toEqual([
      'lib/copy.ts',
    ]);
    // …and nobody has pasted the sentence as a literal instead of importing it.
    const pasted = files.filter(
      (f) => f !== 'lib/copy.ts' && read(f).includes('who have the capacity to help'),
    );
    expect(pasted).toEqual([]);
  });

  it('About renders it from the constant', () => {
    const about = read('screens/AboutScreen.tsx');
    expect(about).toContain('{MISSION_STATEMENT}');
    expect(about).toMatch(/MISSION_STATEMENT,/); // imported, not shadowed
  });
});
