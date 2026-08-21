/**
 * SW-06 / SW-19 — two onboarding surfaces, and copy that described neither.
 *
 * ─── THE SHAPE OF IT ──────────────────────────────────────────────────────
 * This app has TWO onboarding surfaces and they are not the same component:
 *
 *   first launch   OnboardingCards   FIVE cards    mounted by App.tsx
 *   Settings replay OnboardingModal  THREE steps   mounted by SettingsScreen
 *
 * OnboardingModal announces "Step N of 3" and the word "card" appears nowhere
 * in it. OnboardingCards announces "Card N of 5". They drifted apart behind a
 * comment in SettingsScreen asserting they were the same component and
 * therefore "in lockstep" — which is how three separate copy sites came to
 * describe a "3-card" intro, one of them while describing the FIVE-card flow.
 *
 * Sky's call, 2026-08-21: keep both surfaces — they do different jobs, since
 * the first-launch flow carries live permission priming a replay should not
 * re-run — and make the copy honest.
 *
 * ─── THE SW-19 COPY WAS FIXED BY SUBTRACTION ──────────────────────────────
 * New user-facing wording routes through copy.ts and Sky's section A pass, and
 * the first pass of this wave shipped none. Every false claim here was
 * therefore REMOVED rather than reworded: "the 3-card welcome intro" becomes
 * "the welcome intro", and "the welcome intro you saw the first time you signed
 * in" becomes "Opens the welcome intro". Deleting a false clause invents no
 * vocabulary, and each sentence is true afterwards.
 *
 * The CTA labels below (SW-17) went the other way: they needed genuinely new
 * words, so they waited for Sky and were ratified 2026-08-21.
 *
 * ─── SW-06 ────────────────────────────────────────────────────────────────
 * Both final CTAs rendered "Open the Map" and labelled themselves "Open the
 * map". Worth being accurate about: that was NOT a WCAG 2.5.3 failure. The
 * criterion exists for speech input, voice control is not case-sensitive, and
 * this repo's own labelInName.guard case-folds both sides for exactly that
 * reason — it passed before the fix and passes after. It was two strings for
 * one button, which would mislead the next editor.
 *
 * ─── SW-17 — and the deeper problem under SW-06 ───────────────────────────
 * Neither button ever opened a map. Verified on device: the first-launch CTA
 * runs the auth gate and lands on SignIn; the replay's finisher returns to
 * Settings. Both destinations are CORRECT — a replay opened from Settings
 * belongs back in Settings, and the auth gate cannot be skipped — so the labels
 * moved and the behaviour did not.
 *
 *   first launch  ->  "Continue"   (honest about the next step, not a place)
 *   replay        ->  "Done"       (the iOS convention for finishing a modal)
 *
 * Sky ratified both, 2026-08-21.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const raw = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const code = (rel: string) => stripComments(raw(rel));

describe('SW-06 / SW-17 — one button, one name, and a name that is true', () => {
  it.each([
    ['components/OnboardingCards.tsx', 'Continue'],
    ['screens/OnboardingModal.tsx', 'Done'],
  ])('%s labels its CTA "%s", matching the string it renders', (file, label) => {
    const src = code(file);
    // Non-vacuity: the visible string must actually be there, or the label
    // assertion below is checking a button that no longer exists.
    expect(src).toContain(label);
    expect(src).toContain(`accessibilityLabel="${label}"`);
  });

  it.each([
    ['components/OnboardingCards.tsx'],
    ['screens/OnboardingModal.tsx'],
  ])('%s no longer promises a map it does not open (SW-17)', (file) => {
    const src = code(file);
    // Neither CTA ever opened the map: the first-launch one runs the auth gate
    // and lands on SignIn, the replay one returns to Settings. Both were
    // verified on device. The labels moved; the destinations are correct and
    // did not.
    expect(src).not.toContain('Open the Map');
    expect(src).not.toContain('accessibilityLabel="Open the map"');
    expect(src).not.toContain('opens the map');
  });
});

describe('SW-19 — the copy no longer describes a surface that does not exist', () => {
  it('the Settings replay row claims no card count', () => {
    const src = code('screens/SettingsScreen.tsx');
    expect(src).toContain('title="Replay tutorial"'); // non-vacuity
    expect(src).toContain('subtitle="Re-show the welcome intro."');
    expect(src).not.toContain('3-card');
  });

  it('the Settings hint no longer claims you saw THIS intro at first launch', () => {
    // You did not: first launch shows OnboardingCards, and this row is the
    // only way to reach OnboardingModal at all.
    const src = code('screens/SettingsScreen.tsx');
    expect(src).toContain('accessibilityHint="Opens the welcome intro"');
    expect(src).not.toContain('you saw the first time you signed in');
  });

  it('the Profile reset confirm no longer calls the 5-card flow "3-card"', () => {
    const src = code('screens/ProfileScreen.tsx');
    expect(src).toContain('Show intro again?'); // non-vacuity
    expect(src).toContain(
      'The introduction will appear the next time you open the app on this device.',
    );
    expect(src).not.toContain('3-card');
  });

  it('the false lockstep comment is gone', () => {
    // Read RAW here, deliberately — this is the one assertion in the file that
    // is ABOUT a comment, so stripping comments would make it vacuous.
    const src = raw('screens/SettingsScreen.tsx');
    expect(src).not.toContain('same OnboardingModal App.tsx mounts on first');
    expect(src).not.toContain('stays in lockstep with the original');
  });
});

describe('SW-19 — the structural facts the comment got wrong', () => {
  it('App.tsx mounts OnboardingCards on first launch, not OnboardingModal', () => {
    const app = stripComments(fs.readFileSync(path.join(SRC, '..', 'App.tsx'), 'utf8'));
    expect(app).toContain('OnboardingCards');
    expect(app).not.toContain('OnboardingModal');
  });

  it('SettingsScreen is the only mount point for OnboardingModal', () => {
    // If a second one ever appears, "the replay" stops being a single surface
    // and this suite's whole premise needs revisiting.
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['__tests__', '__mocks__', 'node_modules'].includes(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && e.name !== 'OnboardingModal.tsx') {
          if (/from '@\/screens\/OnboardingModal'|from '\.\.?\/OnboardingModal'/.test(
            fs.readFileSync(p, 'utf8'),
          )) {
            hits.push(path.relative(SRC, p));
          }
        }
      }
    };
    walk(SRC);
    expect(hits).toEqual(['screens/SettingsScreen.tsx']);
  });

  it('the two surfaces still count themselves differently', () => {
    // The drift this suite exists for. Not a defect — a fact the copy must
    // respect. If these ever converge, the copy above should be revisited
    // deliberately rather than left describing a split that no longer exists.
    expect(code('screens/OnboardingModal.tsx')).toContain('Step ');
    expect(code('components/OnboardingCards.tsx')).toContain('Card ');
  });
});
