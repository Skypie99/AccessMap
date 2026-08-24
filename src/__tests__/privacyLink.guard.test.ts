/**
 * B-2 / SR-002 — the privacy policy must be reachable from INSIDE the app.
 *
 * Apple 5.1.1(i) requires the policy in App Store Connect metadata AND "within
 * the app in an easily accessible manner". app.json alone only satisfies the
 * metadata half, and AboutScreen carried prose about privacy with no link at
 * all. Three surfaces reach it: Settings, About, and beside sign-up.
 *
 * ⚑ REWRITTEN FOR B-3 (§SKY-8 P-2). This file used to assert that all three
 * surfaces called `openExternalUrl(PRIVACY_POLICY_URL)` and announced as
 * `role="link"`. Both are now false BY DESIGN: the surfaces open the ratified
 * in-app screen instead. Those assertions did not become wrong, they became
 * assertions about the OLD behaviour, so they were replaced rather than
 * loosened — and the replacements are stronger, because they ban the old call
 * instead of merely not requiring it.
 *
 * WHAT THIS FILE OWNS NOW:
 *   · the hosted URL still exists and still matches app.json (App Store Connect
 *     needs a reachable URL — that half of 5.1.1(i) did not go away);
 *   · none of the three surfaces opens it any more;
 *   · PROTECT-11 — the privacy-forward trust voice is unmoved.
 *
 * Reachability and the verbatim-render contract live in `privacy.guard.test.ts`.
 *
 * Source-scan idiom (cf. tasksHeaderReclaim.guard.test.ts): SettingsScreen's
 * render surface is far too heavy to mount, and what matters here is wiring,
 * not pixels.
 */
import fs from 'fs';
import path from 'path';

import { PRIVACY_POLICY_LINK_HINT, PRIVACY_POLICY_LINK_LABEL } from '@/lib/copy';
import { PRIVACY_POLICY_URL } from '@/lib/links';
import { stripComments } from './support/stripComments';

const REPO = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, 'src', rel), 'utf8');


const SURFACES: [string, string][] = [
  ['Settings', 'screens/SettingsScreen.tsx'],
  ['About', 'screens/AboutScreen.tsx'],
  ['sign-up', 'screens/SignInScreen.tsx'],
];

describe('B-2 (SR-002) — the policy is reachable in-app on all three surfaces', () => {
  it.each(SURFACES)('%s reads its label from copy.ts, never a literal', (_name, rel) => {
    // Sky's final wording is a one-line change only while all three surfaces
    // share the constant. A hardcoded literal would silently fork it.
    expect(read(rel)).toContain('PRIVACY_POLICY_LINK_LABEL');
  });

  it.each(SURFACES)('%s no longer sends the user to a browser for the privacy policy', (_name, rel) => {
    // The ban, not merely the absence of a requirement. The hosted copy at that
    // URL is the DRIFTED v1.1 text B-3 exists to replace — a surface that
    // reopened it would quietly serve the wrong policy again.
    //
    // Narrowed 2026-08-24: this used to also ban the bare string
    // 'openExternalUrl' from appearing at all, back when PRIVACY_POLICY_URL
    // was its only caller anywhere in the app. AboutScreen now legitimately
    // calls it for the Accessibility Statement and Support links, which have
    // no in-app equivalent to route to instead — a real, different reason to
    // open a browser, not a regression of this one. The invariant that
    // actually matters — PRIVACY_POLICY_URL is never referenced, let alone
    // opened, on these three surfaces — is still fully covered by the
    // constant-name ban below.
    const code = stripComments(read(rel));
    expect(code).not.toContain('PRIVACY_POLICY_URL');
  });

  it('the label and hint are single-sourced and non-empty', () => {
    expect(PRIVACY_POLICY_LINK_LABEL.length).toBeGreaterThan(0);
    expect(PRIVACY_POLICY_LINK_HINT.length).toBeGreaterThan(0);
    expect(PRIVACY_POLICY_LINK_HINT).not.toMatch(/browser/i);
  });

  it('the URL still matches app.json, so config and code cannot drift', () => {
    // KEPT, deliberately, even though no screen opens it. App Store Connect
    // requires a reachable privacy-policy URL and hosting that text is
    // Sky-physical (§SKY-8 P-3). The constant is the app's record of what she
    // must host; letting it drift from app.json would break the metadata half
    // of 5.1.1(i) while the in-app half looked fine.
    const app = JSON.parse(fs.readFileSync(path.join(REPO, 'app.json'), 'utf8')).expo;
    expect(PRIVACY_POLICY_URL).toBe(app.privacyPolicyUrl);
  });
});

describe('PROTECT-11 — the privacy-forward trust voice is unmoved', () => {
  it('SignIn still carries both footnote promises', () => {
    const src = read('screens/SignInScreen.tsx');
    // PC-8 (security audit 2026-07-31): the location line used to read "Your
    // location is only used when you place a flag." That was inaccurate —
    // location is also read to centre the map and compute distances, on grant,
    // independent of any report. The protected property here is that BOTH trust
    // promises are still present (and, below, in the right reading order), not
    // that the wording is frozen; so this asserts the promise, not the literal.
    // ⚠️ This edits ratified copy — Sky may veto the exact phrasing.
    expect(src).toMatch(/Your location is used to[^']*place a flag\./);
    expect(src).toContain('Your email is never shown publicly.');
  });

  it('the location promise does not overclaim', () => {
    // Non-vacuity for the above: the old, false phrasing must not come back.
    const src = read('screens/SignInScreen.tsx');
    expect(src).not.toContain('Your location is only used when you place a flag.');
  });

  it('the sign-up link is appended BELOW the footnote, not above it', () => {
    // Reading order is the protected property: the two trust lines must still
    // be what a screen reader reaches first.
    //
    // ⚑ RE-ANCHORED for B-3. This assertion used to locate the link by
    // `accessibilityHint={OPENS_IN_BROWSER_HINT}`, which this surface no longer
    // renders. Left as it was, indexOf would return -1, and -1 < everything, so
    // the ordering check would have passed forever while checking nothing.
    const src = read('screens/SignInScreen.tsx');
    const anchor = src.indexOf('accessibilityHint={PRIVACY_POLICY_LINK_HINT}');
    expect(anchor).toBeGreaterThan(-1);
    expect(src.indexOf('Your email is never shown publicly.')).toBeLessThan(anchor);
  });

  it('About still carries all three of its privacy paragraphs', () => {
    const src = read('screens/AboutScreen.tsx');
    expect(src).toContain('We store flag reports and your profile.');
    expect(src).toContain('Status changes (open → verified → resolved) are logged');
    expect(src).toContain('Map tile images are cached locally on your device');
  });

  it('the About link is appended AFTER the prose', () => {
    // Anchor on a JSX-only marker: the import of PRIVACY_POLICY_LINK_LABEL
    // sits at the top of the file and would always compare "before".
    // Same re-anchoring, and the same -1 trap, as the sign-up case above.
    const src = read('screens/AboutScreen.tsx');
    const anchor = src.indexOf('accessibilityHint={PRIVACY_POLICY_LINK_HINT}');
    expect(anchor).toBeGreaterThan(-1);
    expect(src.indexOf('Map tile images are cached locally')).toBeLessThan(anchor);
  });
});
