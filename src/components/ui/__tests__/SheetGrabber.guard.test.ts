/**
 * G3 GRABBER GUARD — declared == shipped, made checkable.
 *
 * `08_G3_GRABBER_ARBITER.md` measured five candidate inks across five surface
 * variants in both themes and both transparency states, and the numbers, not a
 * preference, picked `color.inkGlassMuted`. Sky shipped it in §SKY-6.
 *
 * The failure this exists to catch is not a broken render — it is DRIFT. The
 * grabber is four points tall and hidden from assistive tech, so an ink change
 * here would show up in no test, no screen-reader pass, and quite possibly no
 * code review. The proof set `shipready-grabber-shipped-stacks.json` declares
 * `#414B5A`/`#B8BEC9`; these assertions are what keep the code and that
 * declaration talking to each other.
 *
 * Source-scanning rather than rendering, deliberately: what matters is that
 * there is exactly ONE definition and that all four sheets route through it. A
 * render test would prove one sheet at a time and say nothing about the fourth
 * one somebody adds next year.
 */
import fs from 'fs';
import path from 'path';

const REPO = path.join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, 'src', rel), 'utf8');

const SHEET = 'components/ui/Sheet.tsx';

/** The three pageSheets G3 names, plus the primitive every other sheet uses. */
const GRABBER_SURFACES: readonly [label: string, rel: string][] = [
  ['Resources', 'screens/ResourcesScreen.tsx'],
  ['How to help', 'screens/HowToHelpScreen.tsx'],
  ['Nearby', 'screens/NearbyFlagsModal.tsx'],
  // Not one of G3's original three — TermsScreen was built in Run 2, after the
  // arbitration. Enrolled because it is the same pageSheet + chrome recipe, and
  // a sheet without the pill beside two that have one is the exact
  // inconsistency G3 existed to remove.
  ['Terms', 'screens/TermsScreen.tsx'],
];

describe('the grabber ships the arbitrated ink, once', () => {
  it('SheetGrabber is declared exactly once, in the ui primitive', () => {
    const declarers = ['components/ui/Sheet.tsx', ...GRABBER_SURFACES.map(([, r]) => r)].filter(
      (rel) => /export function SheetGrabber\b/.test(read(rel)),
    );
    expect(declarers).toEqual([SHEET]);
  });

  it('uses color.inkGlassMuted — the only ink that cleared 3.0 on all ten measurements', () => {
    const src = read(SHEET);
    expect(src).toMatch(/styles\.handle,\s*\{\s*backgroundColor:\s*color\.inkGlassMuted\s*\}/);
  });

  it('does NOT use borderStrong, which the arbiter measured at 1.01–1.71:1', () => {
    // The pre-G3 ink. It failed on every surface INCLUDING Nearby's opaque
    // header, which Phase 2 had hoped would rescue it. A revert to "match the
    // platform" has to be Sky's call with a fresh run, not a quiet edit.
    const grabber = read(SHEET).slice(read(SHEET).indexOf('export function SheetGrabber'));
    expect(grabber.slice(0, 600)).not.toContain('borderStrong');
  });

  it.each(GRABBER_SURFACES)('%s renders the shared grabber, not a hand-rolled pill', (_l, rel) => {
    const src = read(rel);
    expect(src).toContain('<SheetGrabber />');
    // A local 36x4 pill would be a second definition wearing the first's
    // clothes — the exact shape this file exists to prevent.
    expect(src).not.toMatch(/width:\s*36,\s*height:\s*4/);
  });

  it.each(GRABBER_SURFACES)('%s places it ABOVE the header — Sky\'s Decision 2', (_l, rel) => {
    const src = read(rel);
    const grabber = src.indexOf('<SheetGrabber />');
    const header = src.indexOf('<View style={styles.header', grabber);
    expect(grabber).toBeGreaterThan(-1);
    expect(header).toBeGreaterThan(grabber);
  });

  it('stays hidden from assistive tech on BOTH platforms', () => {
    // One prop covers VoiceOver, the other TalkBack; dropping either leaks a
    // nameless element into one platform's tab order. Every sheet with a
    // grabber also has a labelled Close, so it is never the only way out.
    const src = read(SHEET);
    const grabber = src.slice(src.indexOf('export function SheetGrabber'));
    // A11Y-234: decorativeProps carries accessibilityElementsHidden +
    // importantForAccessibility + aria-hidden — and aria-hidden is the ONLY
    // one react-native-web honours, so the spread strictly widens coverage
    // from "both native platforms" to "both native platforms and the web".
    expect(grabber).toMatch(/decorativeProps|accessibilityElementsHidden/);
    expect(grabber).toMatch(/decorativeProps|importantForAccessibility="no-hide-descendants"/);
  });

  it('the two chrome-pane sheets reserve room for it pre-measure', () => {
    // Both hide their body for ONE frame while the chrome pane measures. If the
    // fallback under-reserves, that frame reserves too little and the first
    // paint after measure jumps. onLayout still supplies the real number.
    for (const rel of [
      'screens/ResourcesScreen.tsx',
      'screens/HowToHelpScreen.tsx',
      'screens/TermsScreen.tsx',
    ]) {
      expect(read(rel)).toMatch(/_CHROME_FALLBACK = 84;/);
    }
  });
});

describe('the SEAM — ui/Sheet is shared, so this moved a fourth surface', () => {
  it('is recorded in the primitive, not left for someone to discover', () => {
    // `ui/Sheet`'s pill is used by the Tasks filter sheet, which belongs to the
    // device-tune train. G3 §"What happens next" required a SEAM note rather
    // than a silent ride-along. This asserts the note exists.
    const src = read(SHEET);
    expect(src).toMatch(/08_G3_GRABBER_ARBITER/);
  });
});
