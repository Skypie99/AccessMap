/**
 * Bottom-anchored controls must derive their inset, and consent must not scroll.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * Measured on the sim walk (2026-08-19/20), signed out, at rest — no scrolling,
 * no keyboard, no Dynamic Type change:
 *
 *   iPhone 17 Pro Max (440x956, safe-area boundary y922)
 *     SignIn "you agree to the Terms" consent row ... y948-993  (below the fold)
 *     SignIn Privacy Policy link .................. ends y929  (7pt into the inset)
 *     Onboarding "Not now" / "Maybe later" ........ y884-928   (6pt into the inset)
 *
 *   iPhone 17e (390x844, safe-area boundary y810)
 *     SignIn consent row .......................... y933-978   (ENTIRELY off-screen)
 *     SignIn Privacy Policy link .................. y869-914   (ENTIRELY off-screen)
 *
 * Two different mistakes with one shape — a bottom-anchored control positioned
 * against the raw screen edge instead of the home-indicator inset:
 *
 *   SW-01  The Apple 1.2 UGC consent line was the LAST CHILD of SignIn's
 *          ScrollView. The screen's own comment says consent "must be visible
 *          where the account is created"; a line you have to scroll to does not
 *          satisfy that, and it got strictly worse as the screen got smaller.
 *          App Review walks this surface signed out, on a small device.
 *
 *   SW-02  OnboardingCards' decline link carried `marginBottom: 28` — a
 *          hardcoded guess, 6pt short of the 34pt home indicator. Its own
 *          sibling action row three lines above already derived its pad from
 *          `insets.bottom`, and a comment claimed the link "carries it instead".
 *          It was the last hardcoded number in that family. 956 - 28 = 928,
 *          which is exactly where the walk measured the link's bottom edge.
 *
 * ─── WHY THE EXISTING TESTS MISSED IT ─────────────────────────────────────
 * Nothing about the JS is wrong. Both surfaces render every element, label it
 * correctly, and pass their render tests — the elements simply land in pixels
 * the user cannot see. Geometry is invisible to jest, so this guard pins the
 * two STRUCTURAL properties that produce the geometry instead.
 *
 * ─── WHAT THIS TEST ENFORCES ──────────────────────────────────────────────
 *   1. SignIn's consent + policy links are rendered OUTSIDE the ScrollView, so
 *      they cannot be pushed below the fold by anything above them.
 *   2. That pinned footer derives its bottom pad from `insets.bottom`.
 *   3. Onboarding's decline link derives its bottom margin from `insets.bottom`.
 *
 * House idiom: static source scan (cf. legalSheetPresentation.guard.test.ts,
 * keyboardClass.guard.test.ts) — fast, no mount, fails the moment it breaks.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('SW-01 — the Apple 1.2 consent line cannot be scrolled out of sight', () => {
  const src = read('screens/SignInScreen.tsx');

  it('the consent + policy links render OUTSIDE the ScrollView', () => {
    const scrollEnd = src.indexOf('</ScrollView>');
    const privacyLink = src.indexOf('accessibilityHint={PRIVACY_POLICY_LINK_HINT}');
    const consentLink = src.indexOf('accessibilityHint={TERMS_LINK_HINT}');

    // Non-vacuity: all three anchors must actually exist. Left unchecked, a
    // renamed prop would make indexOf return -1 and the ordering below would
    // pass forever while checking nothing.
    expect(scrollEnd).toBeGreaterThan(-1);
    expect(privacyLink).toBeGreaterThan(-1);
    expect(consentLink).toBeGreaterThan(-1);

    // This is the whole fix: both links come AFTER the scroller closes.
    expect(scrollEnd).toBeLessThan(privacyLink);
    expect(scrollEnd).toBeLessThan(consentLink);
  });

  it('the pinned footer derives its bottom pad from the safe-area inset', () => {
    expect(src).toMatch(/policyFooter[\s\S]{0,120}?insets\.bottom/);
  });

  it('PROTECT-11 reading order survives the move', () => {
    // The two trust lines must still be what a screen reader reaches first.
    // Pinning the links below the scroller keeps them last in source order,
    // which is what this property has always actually meant.
    expect(src.indexOf('Your email is never shown publicly.')).toBeLessThan(
      src.indexOf('accessibilityHint={PRIVACY_POLICY_LINK_HINT}'),
    );
  });
});

describe('SW-02 — bottom-anchored controls derive their inset, never guess it', () => {
  it("OnboardingCards' decline link no longer hardcodes its bottom margin", () => {
    const src = read('components/OnboardingCards.tsx');
    // The style block keeps 28 as the no-inset FLOOR; the render site must lift
    // it to the real inset. Pinning the render site is what stops the 6pt miss.
    expect(src).toMatch(/marginBottom:\s*Math\.max\(28,\s*insets\.bottom\)/);
  });

  it('the sibling action row still derives its pad too (non-vacuity)', () => {
    // If this ever stops matching, the family moved and the assertion above is
    // pinning a pattern that no longer represents the house rule.
    const src = read('components/OnboardingCards.tsx');
    expect(src).toMatch(/paddingBottom:\s*Math\.max\([^)]*insets\.bottom/);
  });
});
