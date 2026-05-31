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
  it('is the documented WCAG-AA-safe brand-text hex (#0F53BE)', () => {
    // Phase 5 design system update: brandText updated from #1c4f99 to #0F53BE
    // ("Wayfinder Blue" family). All callsites in FlagDetailModal, MapScreen,
    // and AddressSearchModal reference color.brandText — if this drifts, AA
    // for small blue text on white silently breaks.
    expect(color.brandText).toBe('#0F53BE');
  });

  it('passes WCAG 2.2 AA small-text contrast on white (>= 4.5:1)', () => {
    // #0F53BE on #ffffff is ~7.0:1. The 4.5:1 threshold is the minimum
    // for normal text per WCAG 1.4.3.
    const ratio = contrastRatio(color.brandText, color.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('matches the documented ~7.0:1 ratio on white within a reasonable tolerance', () => {
    // Phase 5: #0F53BE on white computes to ~7.0:1. Allow a band of 6.5–7.5
    // to catch accidental token drift while tolerating floating-point variance.
    const ratio = contrastRatio(color.brandText, color.surface);
    expect(ratio).toBeGreaterThan(6.5);
    expect(ratio).toBeLessThan(7.5);
  });

  it('color.brand passes small-text AA (>= 4.5:1) — Phase 5 upgrade from old brand', () => {
    // Phase 5 updated brand from #2f80ed (~3.3:1) to #1466E0 (~5.2:1).
    // The new brand itself passes AA for small text, making brandText the
    // higher-contrast option for max-contrast or AAA contexts.
    const ratio = contrastRatio(color.brand, color.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('brandOnSoft equals brandText (used on brandSoft pill background)', () => {
    // brandOnSoft is the dark brand text used on brandSoft (tinted) surfaces.
    // It should stay coupled to brandText so pill labels and badges match.
    expect(color.brandOnSoft).toBe(color.brandText);
  });

  it('statusVerifiedFg is a semantic green (not blue) — decoupled in Phase 5', () => {
    // Phase 5: statusVerifiedFg (#067A56) is now a semantic green for the
    // "Verified" checkmark badge, no longer aliased to brandText (blue).
    // This preserves WCAG meaning: green = verified, blue = brand action.
    expect(color.statusVerifiedFg).toBe('#067A56');
    expect(color.statusVerifiedFg).not.toBe(color.brandText);
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
  it('color.brand is the documented primary action blue (#1466E0)', () => {
    // Phase 5: brand updated from #2f80ed to #1466E0 ("Wayfinder Blue").
    expect(color.brand).toBe('#1466E0');
  });

  it('color.brandTextAlt is the documented max-contrast brand hex (#0E4499)', () => {
    // Phase 5: brandTextAlt updated from #1a4fa3 to #0E4499 (7.2:1 on white).
    expect(color.brandTextAlt).toBe('#0E4499');
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

  it('color.brandSofter is the documented brand wash (#EEF4FE)', () => {
    // Phase 5: brandSofter updated from #eaf3ff to #EEF4FE (blue-50).
    // Used by tier pill, nearestBtn, UpdateBanner background, place chip
    // manage, FilterPresetsModal newBtn, SavedPlacesModal addBtn, and
    // TasksScreen cardSelected. If this drifts, the whole brand-tinted
    // background family drifts in lockstep.
    expect(color.brandSofter).toBe('#EEF4FE');
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

// -------------------------------------------------------------------------
// Item 1 (E1 carry): color.placeholderText AA token
//
// TextInput placeholder text must pass WCAG 2.2 AA (≥ 4.5:1) on the
// surfaces it appears on. The old color.textSubtle (#999) only hit 2.7:1
// on #f7f9fc — a clear failure. color.placeholderText (#5b6470) is the
// dedicated AA-safe replacement for all placeholderTextColor props.
// -------------------------------------------------------------------------

describe('color.placeholderText (E1 carry)', () => {
  it('exists and is a string', () => {
    expect(typeof color.placeholderText).toBe('string');
  });

  it('is the expected hex (#5b6470)', () => {
    expect(color.placeholderText).toBe('#5b6470');
  });

  it('passes WCAG 2.2 AA small-text contrast on white (>= 4.5:1)', () => {
    const ratio = contrastRatio(color.placeholderText, color.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('passes WCAG 2.2 AA small-text contrast on surfaceMuted (#f7f9fc)', () => {
    // NearbyFlagsModal, HelpModal, MyReportsModal search inputs sit on #f7f9fc.
    const ratio = contrastRatio(color.placeholderText, color.surfaceMuted);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('color.textSubtle does NOT pass small-text AA on white — confirming why placeholderText exists', () => {
    const ratio = contrastRatio(color.textSubtle, color.surface);
    expect(ratio).toBeLessThan(4.5);
  });
});

// -------------------------------------------------------------------------
// Cycle F / F5 — placeholder-sweep contrast lock
//
// Gary + Alex audit (2026-05-25) measured color.textMuted (#666) on
// color.surfaceSoft (#f7f8fa) at ~5.39:1 — above the WCAG AA 4.5:1 floor
// for normal text. This assertion locks that pairing so a future token
// change can't silently drop it below AA.
// -------------------------------------------------------------------------

describe('color.textMuted on color.surfaceSoft (Cycle F / F5)', () => {
  it('color.textMuted on color.surfaceSoft meets WCAG AA (>=4.5:1)', () => {
    const ratio = contrastRatio(color.textMuted, color.surfaceSoft);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// Re-import severity locally so the test above can compare without
// importing the whole module twice at the top.
function severity4Color(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { severity } = require('../../theme');
  return severity[4].color;
}
