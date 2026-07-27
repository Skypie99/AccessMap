/**
 * B-2 / SR-002 — the privacy policy must be reachable from INSIDE the app.
 *
 * Apple 5.1.1(i) requires the policy in App Store Connect metadata AND "within
 * the app in an easily accessible manner". app.json alone only satisfies the
 * metadata half, and AboutScreen carried prose about privacy with no link at
 * all. Three surfaces now link out: Settings, About, and beside sign-up.
 *
 * Source-scan idiom (cf. tasksHeaderReclaim.guard.test.ts): SettingsScreen's
 * render surface is far too heavy to mount, and what matters here is wiring,
 * not pixels.
 *
 * The PROTECT-11 assertions at the bottom are the point of this file as much
 * as the link checks are: the privacy-forward trust voice is a protected
 * asset, and this change is only allowed to ADD to those surfaces.
 */
import fs from 'fs';
import path from 'path';

import { PRIVACY_POLICY_LINK_LABEL, OPENS_IN_BROWSER_HINT } from '@/lib/copy';
import { PRIVACY_POLICY_URL } from '@/lib/links';

const REPO = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, 'src', rel), 'utf8');

const SURFACES: [string, string][] = [
  ['Settings', 'screens/SettingsScreen.tsx'],
  ['About', 'screens/AboutScreen.tsx'],
  ['sign-up', 'screens/SignInScreen.tsx'],
];

describe('B-2 (SR-002) — the policy is linked in-app on all three surfaces', () => {
  it.each(SURFACES)('%s links out to the policy', (_name, rel) => {
    const src = read(rel);
    expect(src).toContain('PRIVACY_POLICY_URL');
    expect(src).toContain('openExternalUrl');
  });

  it.each(SURFACES)('%s announces as a link, not a button', (_name, rel) => {
    // accessibilityRole="link" is the shipped convention for anything that
    // leaves the app (ResourcesScreen's cards). Settings passes role="link"
    // into its local SettingsRow, which defaults to 'button' for every other
    // row — so accept either spelling.
    const src = read(rel);
    expect(/accessibilityRole="link"|role="link"/.test(src)).toBe(true);
  });

  it.each(SURFACES)('%s reads its label from copy.ts, never a literal', (_name, rel) => {
    // Sky's final wording is a one-line change only while all three surfaces
    // share the constant. A hardcoded literal would silently fork it.
    expect(read(rel)).toContain('PRIVACY_POLICY_LINK_LABEL');
  });

  it('the label and hint are single-sourced and non-empty', () => {
    expect(PRIVACY_POLICY_LINK_LABEL.length).toBeGreaterThan(0);
    expect(OPENS_IN_BROWSER_HINT).toBe('Opens in your browser');
  });

  it('the URL matches app.json, so config and code cannot drift', () => {
    const app = JSON.parse(fs.readFileSync(path.join(REPO, 'app.json'), 'utf8')).expo;
    expect(PRIVACY_POLICY_URL).toBe(app.privacyPolicyUrl);
  });
});

describe('PROTECT-11 — the privacy-forward trust voice is unmoved', () => {
  it('SignIn still carries both footnote promises', () => {
    const src = read('screens/SignInScreen.tsx');
    expect(src).toContain('Your location is only used when you place a flag.');
    expect(src).toContain('Your email is never shown publicly.');
  });

  it('the sign-up link is appended BELOW the footnote, not above it', () => {
    // Reading order is the protected property: the two trust lines must still
    // be what a screen reader reaches first.
    const src = read('screens/SignInScreen.tsx');
    expect(src.indexOf('Your email is never shown publicly.')).toBeLessThan(
      src.indexOf('accessibilityHint={OPENS_IN_BROWSER_HINT}'),
    );
  });

  it("About still carries all three of its privacy paragraphs", () => {
    const src = read('screens/AboutScreen.tsx');
    expect(src).toContain('We store flag reports and your profile.');
    expect(src).toContain('Status changes (open → verified → resolved) are logged');
    expect(src).toContain('Map tile images are cached locally on your device');
  });

  it('the About link is appended AFTER the prose', () => {
    // Anchor on a JSX-only marker: the import of PRIVACY_POLICY_LINK_LABEL
    // sits at the top of the file and would always compare "before".
    const src = read('screens/AboutScreen.tsx');
    expect(src.indexOf('Map tile images are cached locally')).toBeLessThan(
      src.indexOf('accessibilityHint={OPENS_IN_BROWSER_HINT}'),
    );
  });
});
