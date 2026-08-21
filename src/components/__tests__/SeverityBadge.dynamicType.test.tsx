/**
 * SeverityBadge — one pill, one scaling rule (SW-36).
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * This badge renders two text nodes side by side inside a single pill: the
 * severity DIGIT and the severity WORD. They were built on different AppText
 * variants, and those variants have different Dynamic Type caps:
 *
 *   digit  variant="label"       capped at 1.6
 *   word   variant="bodyMedium"  UNCAPPED, by contract
 *
 * `bodyMedium` is uncapped deliberately and must stay that way in AppText —
 * essential reading text has to scale freely (WCAG 1.4.4), and
 * AppText.dynamicType.test.tsx calls re-capping it "the regression we most
 * fear". But inside a PILL, next to a digit that stops at 1.6, an uncapped word
 * means the two halves of one control scale apart: at
 * `accessibility-extra-large` the word rendered roughly 47% larger than its own
 * digit and the pill grew without bound.
 *
 * That is what made SW-36 visible. The pill is the first child of the Tasks
 * card header, it does not shrink, and every point it gained came out of the
 * card title beside it — until the title was narrower than the word "sidewalk"
 * and iOS character-broke it into "Broken sidewal / k".
 *
 * The fix is a per-call-site cap, which is the documented escape hatch
 * (AppText's own header says so) and the treatment SeverityDisc already carries.
 * It is NOT a variant swap: variant="label" would cap the word but also force
 * the 600SemiBold face while styles.label still declares weight 500, changing
 * how the pill looks in order to fix how it scales.
 *
 * ─── SCOPE ────────────────────────────────────────────────────────────────
 * This badge had NO test file before this one, which is a fair part of why the
 * asymmetry survived. Capping is necessary but NOT sufficient for SW-36 — it
 * returns roughly 60pt to the row and the title still needed more, so the real
 * fix is cardTitle's flex basis. See flexBasisUnderLargeType.guard.test.ts.
 *
 * SeverityBadge imports only static tokens from '@/theme' and needs no
 * ThemeProvider, so a bare render() is sufficient (same as AppText's suite).
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { SeverityBadge } from '../SeverityBadge';
import { font } from '@/theme';

/** Every <Text> the badge renders, outermost first. */
function textsOf(node: React.ReactElement) {
  const { UNSAFE_getAllByType } = render(node);
  return UNSAFE_getAllByType(Text);
}

describe('SeverityBadge — the digit and the word scale together', () => {
  it('renders exactly two text nodes when the label is shown', () => {
    // Non-vacuity floor: if this ever renders one node, the cap assertion
    // below would be checking a set of one and passing for the wrong reason.
    expect(textsOf(<SeverityBadge level={4} showLabel />)).toHaveLength(2);
  });

  it('caps BOTH halves of the pill at the same multiplier', () => {
    const caps = textsOf(<SeverityBadge level={4} showLabel />).map(
      (t) => t.props.maxFontSizeMultiplier,
    );
    // Pre-fix this was [1.6, undefined] — the word scaled past its own digit.
    expect(caps).toEqual([1.6, 1.6]);
  });

  it('caps the digit even with no label beside it', () => {
    const caps = textsOf(<SeverityBadge level={1} />).map((t) => t.props.maxFontSizeMultiplier);
    expect(caps).toEqual([1.6]);
  });

  it('keeps the bold-digit / medium-word weight fork', () => {
    // A must-not-regress pin rather than a fix: this passes before and after,
    // and fails only if someone later "simplifies" the cap into
    // variant="label" and silently changes the pill's face. The fork is
    // deliberate design, not an oversight.
    const [digit, word] = textsOf(<SeverityBadge level={4} showLabel />);
    expect(StyleSheet.flatten(digit.props.style).fontWeight).toBe(font.weight.bold);
    expect(StyleSheet.flatten(word.props.style).fontWeight).toBe(font.weight.medium);
  });

  it('still names the severity for a screen reader', () => {
    // The cap is a visual concern; it must not touch what VoiceOver says.
    const { getByLabelText } = render(<SeverityBadge level={4} showLabel />);
    expect(getByLabelText('Severity 4: Significant')).toBeTruthy();
  });
});
