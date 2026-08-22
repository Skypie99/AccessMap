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
  /**
   * RE-PINNED 2026-08-22 (Phase 2b, board 05). SW-02's finding was that the
   * decline link's `marginBottom: 28` ended its box 6pt INSIDE the home
   * indicator, because it was the last child on the screen and guessed the pad
   * the row above it derived.
   *
   * On the new template it is no longer the last child: the decline sits ABOVE
   * the CTA row, in a slot reserved on every card, and the CTA row is what
   * touches the bottom of the screen. So the property to pin moved with it —
   * whatever is bottom-anchored derives the inset. Keeping the old assertion
   * would have demanded a margin on a control that is now nowhere near the
   * indicator, which is a guard pinning a coordinate instead of a rule.
   */
  it('the bottom-most control derives its pad from the safe-area inset', () => {
    const src = read('components/OnboardingCards.tsx');
    expect(src).toMatch(/paddingBottom:\s*Math\.max\([^)]*insets\.bottom/);
  });

  it('the decline link sits above that row, so it needs no inset of its own', () => {
    // Non-vacuity for the above: if the decline ever became the last child
    // again it would need its own derived pad, and this ordering check is what
    // notices. Source order IS screen order here — both are static siblings.
    const src = read('components/OnboardingCards.tsx');
    const decline = src.indexOf('styles.declineSlot');
    const cta = src.indexOf('styles.ctaRow,');
    expect(decline).toBeGreaterThan(-1);
    expect(cta).toBeGreaterThan(-1);
    expect(decline).toBeLessThan(cta);
  });

  it('the top bar still derives its own inset too (non-vacuity)', () => {
    // The family the rule belongs to: every edge-anchored row on this surface
    // reads the inset rather than guessing a number.
    const src = read('components/OnboardingCards.tsx');
    expect(src).toMatch(/paddingTop:\s*Math\.max\(insets\.top,\s*48\)/);
  });
});
