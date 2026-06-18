/**
 * AppText — Dynamic Type cap-table CONTRACT lock.
 *
 * The expressive overhaul made dynamic-type integrity its #1 accessibility
 * theme. The load-bearing rule (WCAG 1.4.4 "Resize text"): essential reading
 * text must scale freely with the user's system font setting — it must NOT be
 * capped. Decorative/layout-fragile text (display headlines, chip labels, mono
 * stat readouts) may carry a cap so a 2x+ system font doesn't shatter the
 * layout, but body copy never may.
 *
 * AppText encodes this in VARIANT_MAX_FONT_MULTIPLIER. jest can't measure pixel
 * overflow, so this suite locks the CONTRACT instead: it renders each variant
 * and asserts the `maxFontSizeMultiplier` prop that lands on the underlying
 * <Text>. If anyone ever silently re-caps `body`/`bodyMedium` (the WCAG
 * regression we most fear), this suite goes red.
 *
 * Asserting on rendered props (not on the private constant) means the test also
 * covers the wiring — `maxFontSizeMultiplier ?? VARIANT_MAX_FONT_MULTIPLIER[v]`
 * — so a refactor that drops the prop on the way to <Text> also trips it.
 *
 * AppText imports only the static `font` token object from '@/theme'; it needs
 * no ThemeProvider, so a bare render() is sufficient.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AppText, type AppTextVariant } from '../AppText';

/**
 * The full cap table, mirrored from AppText. `undefined` means UNCAPPED (full
 * dynamic-type scaling). This is the spec the implementation must satisfy —
 * if AppText and this table disagree, one of them is wrong, and for body that
 * means a WCAG 1.4.4 regression.
 */
const EXPECTED_CAP: Record<AppTextVariant, number | undefined> = {
  display: 1.3,
  heading: 1.5,
  body: undefined, // UNCAPPED — essential reading text must always scale
  bodyMedium: undefined, // UNCAPPED — same
  label: 1.6,
  mono: 1.4,
  monoMedium: 1.4,
  monoBold: 1.4,
};

const ALL_VARIANTS = Object.keys(EXPECTED_CAP) as AppTextVariant[];

/** Render one AppText and return the maxFontSizeMultiplier on its <Text>. */
function capFor(node: React.ReactElement): number | undefined {
  const { UNSAFE_getAllByType } = render(node);
  // AppText renders exactly one <Text>. Grab the first (outermost).
  const text = UNSAFE_getAllByType(Text)[0];
  return text.props.maxFontSizeMultiplier as number | undefined;
}

describe('AppText dynamic-type cap table (WCAG 1.4.4)', () => {
  it.each(ALL_VARIANTS)(
    'variant "%s" applies the contracted maxFontSizeMultiplier',
    (variant) => {
      const cap = capFor(<AppText variant={variant}>scaling text</AppText>);
      expect(cap).toBe(EXPECTED_CAP[variant]);
    },
  );

  describe('essential reading text stays UNCAPPED (the regression we guard hardest)', () => {
    it('body is uncapped — system font scaling is never clamped', () => {
      const cap = capFor(<AppText variant="body">body copy</AppText>);
      expect(cap).toBeUndefined();
    });

    it('bodyMedium is uncapped too', () => {
      const cap = capFor(<AppText variant="bodyMedium">emphasized body</AppText>);
      expect(cap).toBeUndefined();
    });

    it('default variant (no prop) is body, hence uncapped', () => {
      const cap = capFor(<AppText>defaults to body</AppText>);
      expect(cap).toBeUndefined();
    });
  });

  describe('layout-fragile variants ARE capped (so 2x+ fonts do not shatter layout)', () => {
    it.each(
      ALL_VARIANTS.filter((v) => EXPECTED_CAP[v] !== undefined),
    )('variant "%s" carries a finite cap', (variant) => {
      const cap = capFor(<AppText variant={variant}>x</AppText>);
      expect(typeof cap).toBe('number');
      expect(cap).toBeGreaterThan(1);
    });
  });

  it('an explicit maxFontSizeMultiplier prop overrides the variant cap', () => {
    // Even body — normally uncapped — honors an explicit per-call-site cap.
    const cap = capFor(
      <AppText variant="body" maxFontSizeMultiplier={2}>
        capped on purpose
      </AppText>,
    );
    expect(cap).toBe(2);
  });

  it('an explicit cap can override a capped variant too (display)', () => {
    const cap = capFor(
      <AppText variant="display" maxFontSizeMultiplier={1.1}>
        x
      </AppText>,
    );
    expect(cap).toBe(1.1);
  });
});
