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

// -------------------------------------------------------------------------
// Cycle D / d2 — Theme token foundation lock
//
// These tests pin the exact hex values of the new tokens added to support
// a future dark-mode swap. If any of these drift, every callsite that
// migrated off the raw literal would silently change shade — so we lock
// them here.
// -------------------------------------------------------------------------

describe('theme token foundation (Cycle D / d2)', () => {
  it('color.brand is the documented primary action blue (#2f80ed)', () => {
    expect(color.brand).toBe('#2f80ed');
  });

  it('color.brandTextAlt is the documented near-brandText hex (#1a4fa3)', () => {
    expect(color.brandTextAlt).toBe('#1a4fa3');
  });

  it('color.brandTextAlt passes WCAG 2.2 AA small-text contrast on white', () => {
    // UpdateBanner text, SavedPlacesModal addBtnText, FilterPresetsModal
    // newBtnText, MapScreen placeChipText all use this for small bold
    // text on near-white surfaces. Must pass 4.5:1.
    const ratio = contrastRatio(color.brandTextAlt, color.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('color.surface is white (#fff)', () => {
    expect(color.surface).toBe('#fff');
  });

  it('color.surfaceMuted is the screen wash (#f7f9fc)', () => {
    expect(color.surfaceMuted).toBe('#f7f9fc');
  });

  it('color.brandSofter is the documented brand wash (#eaf3ff)', () => {
    // Used by tier pill, nearestBtn, UpdateBanner background, place chip
    // manage, FilterPresetsModal newBtn, SavedPlacesModal addBtn, and
    // TasksScreen cardSelected. If this drifts, the whole brand-tinted
    // background family drifts in lockstep — which is fine for dark mode
    // (intentional) but should NEVER happen as a typo.
    expect(color.brandSofter).toBe('#eaf3ff');
  });

  it('color.borderPressed is the documented pressed-chip background (#dde3eb)', () => {
    // Pressed state on MyReportsModal/ActivityFeedModal/NearbyFlagsModal/
    // MyWatchedModal "view on map" + search-clear buttons.
    expect(color.borderPressed).toBe('#dde3eb');
  });

  it('color.textMutedAlt is the documented AA-safe muted body (#5b6470)', () => {
    expect(color.textMutedAlt).toBe('#5b6470');
  });

  it('color.textMutedAlt passes WCAG 2.2 AA small-text contrast on white', () => {
    // ReportFlagModal tagChipTextDisabled / tagHelper, NotificationPrefsModal
    // footer, TasksScreen sortLabel all depend on this for AA on the screen
    // wash / white. Documented as 4.6:1 on #f4f6f8; on pure white it's
    // even better (~6.5:1), so this test asserts the floor.
    const ratio = contrastRatio(color.textMutedAlt, color.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('color.accentOrange is the documented amber accent (#f1a520)', () => {
    // Watched-flag accent. Distinct from severity[4] (#e67e22) on purpose
    // — different semantic (user state vs hazard level).
    expect(color.accentOrange).toBe('#f1a520');
    expect(color.accentOrange).not.toBe(severity4Color());
  });
});

// Re-import severity locally so the test above can compare without
// importing the whole module twice at the top.
function severity4Color(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { severity } = require('../../theme');
  return severity[4].color;
}
