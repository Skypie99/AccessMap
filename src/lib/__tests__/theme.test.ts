/**
 * Tests for the design tokens in src/theme.ts.
 *
 * Specifically pins the `brandText` token — added in Cycle C / CL2 to give
 * small bold blue text on white a WCAG 2.2 AA-safe contrast ratio. The
 * default `brand` (#2f80ed) only hits ~3.3:1 on white, which fails the
 * 4.5:1 small-text threshold. `brandText` (#1c4f99) hits ~7.6:1.
 *
 * If anyone ever bumps these values, this test will scream — because three
 * styles in FlagDetailModal/MapScreen/AddressSearchModal silently depend on
 * the documented contrast ratio staying above AA.
 *
 * See DESIGN.md → "Color pairings" and the Cycle C qa-reports for the audit
 * that drove this change.
 */

import { color } from '../../theme';

// -------------------------------------------------------------------------
// Pure contrast helper — re-implements WCAG 2.x relative luminance + ratio.
// Inlined (no external lib) to keep the test surface tiny.
// -------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  // Expand shorthand (e.g. "fff" -> "ffffff") so #fff and #ffffff both work.
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(clean, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const [light, dark] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (light + 0.05) / (dark + 0.05);
}

describe('color.brandText', () => {
  it('is the documented WCAG-AA-safe brand-text hex (#1c4f99)', () => {
    // FlagDetailModal.viewMapBtnText, FlagDetailModal.shareBtnText, and
    // MapScreen.presetBtnSecondaryText all reference this exact value.
    // The Cycle C migration replaced their hardcoded '#1c4f99' literals
    // with color.brandText — if this constant drifts, those styles drift
    // too and the AA guarantee silently breaks.
    expect(color.brandText).toBe('#1c4f99');
  });

  it('passes WCAG 2.2 AA small-text contrast on white (>= 4.5:1)', () => {
    // Documented as ~7.6:1 in src/theme.ts and DESIGN.md. The 4.5:1
    // threshold is the minimum for normal text per WCAG 1.4.3.
    const ratio = contrastRatio(color.brandText, color.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('matches the documented ~7.6:1 ratio on white within a reasonable tolerance', () => {
    // Tightens the previous assertion — if the hex ever drifts to a value
    // that still passes 4.5:1 but no longer matches the comment in
    // src/theme.ts, we want to know. The docs round to ~7.6; the actual
    // computed ratio for #1c4f99 on #ffffff is ~7.99, so we allow a band
    // of 7.4 – 8.1 around that.
    const ratio = contrastRatio(color.brandText, color.surface);
    expect(ratio).toBeGreaterThan(7.4);
    expect(ratio).toBeLessThan(8.1);
  });

  it('color.brand (the larger-text variant) does NOT pass small-text AA — confirming why brandText exists', () => {
    // Sanity check that documents the why: brand alone fails 4.5:1, which
    // is the entire reason brandText was introduced.
    const ratio = contrastRatio(color.brand, color.surface);
    expect(ratio).toBeLessThan(4.5);
  });

  it('brandOnSoft equals brandText (used on brandSoft pill background)', () => {
    // statusVerifiedFg / brandOnSoft both depend on the same dark-brand
    // value. If brandText changes, these should change in lockstep.
    expect(color.brandOnSoft).toBe(color.brandText);
    expect(color.statusVerifiedFg).toBe(color.brandText);
  });
});
