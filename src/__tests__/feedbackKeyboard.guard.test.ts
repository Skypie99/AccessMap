/**
 * BUG-3 feedback-sheet keyboard guard (2026-08-13, build 27).
 *
 * The Send-feedback sheet must lift above the keyboard AND keep the whole form
 * (incl. the reply-email field) + Cancel/Send visible. Two mechanisms, both pinned:
 *   1. KeyboardAvoidingView lifts the card (the base G9 fix).
 *   2. While the keyboard is up the card RECLAIMS the space the keyboard covers —
 *      the bottom safe-area inset + a shorter writing box — so the lower field is
 *      not squeezed out of view (the build-27 defect). It is keyboard-up ONLY, so
 *      the card only ever gets SHORTER: it can never push the close-X off the top
 *      (it must not fight the G6/SR-099 / 9235e3b cap).
 *
 * Source-scan (the render surface is heavy to mount; the wiring is what matters,
 * and jest can't simulate the native keyboard). Device rows still own the actual
 * on-screen geometry — this only guards that the wiring does not silently drift.
 * Non-vacuity proven: reverting the paddingBottom reclaim fails the third test.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'components/FeedbackModal.tsx'),
  'utf8',
);
const sheetSrc = fs.readFileSync(
  path.join(__dirname, '..', 'components/ui/Sheet.tsx'),
  'utf8',
);

describe('BUG-3 — the feedback sheet stays fully visible above the keyboard', () => {
  it('delegates the card lift to the shared Sheet KeyboardAvoidingView (iOS padding)', () => {
    expect(src).toMatch(/<Sheet[\s\S]*?presentation="expanded"[\s\S]*?keyboardAvoiding/);
    expect(sheetSrc).toMatch(/<KeyboardAvoidingView/);
    expect(sheetSrc).toContain("behavior={Platform.OS === 'ios' ? 'padding' : undefined}");
  });

  it('tracks keyboard visibility via keyboardDidShow/Hide (both platforms)', () => {
    expect(src).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(src).toContain("Keyboard.addListener('keyboardDidHide'");
  });

  it('reclaims the bottom inset while the keyboard is up (card gets shorter, never taller)', () => {
    expect(src).toContain('minBottomPad={kbVisible ? spacing.md : spacing.xl}');
    expect(sheetSrc).toContain('{ paddingBottom: Math.max(minBottomPad, insets.bottom) }');
  });

  it('shrinks the writing box only while the keyboard is up (reply-email + actions stay in view)', () => {
    expect(src).toContain('kbVisible && styles.bodyInputKbUp');
    expect(src).toMatch(/bodyInputKbUp:\s*\{\s*minHeight:\s*88\s*\}/);
  });
});
