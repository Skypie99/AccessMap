/**
 * BP10 / T5 — SeverityDisc zero-visual-delta + severity-grammar guards.
 *
 * Two kinds of guard:
 *  1. RENDER — the primitive's resolved styles match the literals each of the
 *     four adoption sites rendered before extraction (width/height/borderRadius/
 *     digit size/weight/ink), so "zero visual delta" is enforced, not asserted.
 *  2. SOURCE — each site invokes <SeverityDisc> with its exact pinned geometry
 *     and no longer carries a dead sevDot/sevDotText StyleSheet copy.
 *
 * borderRadius note: all four discs are `radius.circle`. Legend / Nearby /
 * ActivityFeed matched that literally; RecentlyViewedRow's old literal 12
 * normalizes to the same circle (any radius >= side/2 clips a square
 * identically), so the rendered shape is unchanged.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { SeverityDisc } from '@/components/SeverityDisc';
import { font, radius, severity } from '@/theme';
import { severityColor } from '@/lib/flags';
import type { FlagSeverity } from '@/types/database';

// The four zero-delta adoption sites, each with the geometry it rendered before
// SeverityDisc was extracted (see the recon table in the phase evidence).
const SITES = [
  { name: 'RecentlyViewedRow', size: 24, digitSize: font.size.xs, cap: 1.3 as number | undefined },
  { name: 'ActivityFeedModal', size: 28, digitSize: font.size.xs, cap: undefined },
  { name: 'NearbyFlagsModal', size: 32, digitSize: font.size.sm, cap: undefined },
  { name: 'LegendModal', size: 32, digitSize: font.size.base, cap: undefined },
] as const;

/**
 * The disc is a single root View, so `render(...).toJSON()` returns that View
 * directly — we read its resolved style + digit Text child without depending on
 * where the composite AppText sits in the instance tree.
 */
function discTree(el: React.ReactElement) {
  const tree = render(el).toJSON();
  if (!tree || Array.isArray(tree)) throw new Error('SeverityDisc should render one root View');
  return tree;
}

describe('SeverityDisc — resolved styles === prior literals (render)', () => {
  it.each(SITES)('$name ($size px): disc geometry + digit + ink fork', ({ size, digitSize, cap }) => {
    const sev: FlagSeverity = 4;
    const disc = discTree(
      <SeverityDisc severity={sev} size={size} digitSize={digitSize} maxFontSizeMultiplier={cap} />,
    );
    const discStyle = StyleSheet.flatten(disc.props.style);
    expect(discStyle.width).toBe(size);
    expect(discStyle.height).toBe(size);
    expect(discStyle.borderRadius).toBe(radius.circle);
    expect(discStyle.backgroundColor).toBe(severityColor(sev));

    const text = disc.children?.[0];
    if (!text || typeof text === 'string') throw new Error('expected a digit Text');
    expect(text.children?.[0]).toBe('4');
    const digitStyle = StyleSheet.flatten(text.props.style);
    expect(digitStyle.fontSize).toBe(digitSize);
    expect(digitStyle.fontWeight).toBe(font.weight.bold);
    expect(digitStyle.color).toBe(severity[sev].textOnColor); // the ink fork
    // AppText's label variant caps at 1.6 unless a call overrides it — matches
    // what every old site effectively rendered (none passed a cap except RVR).
    expect(text.props.maxFontSizeMultiplier).toBe(cap ?? 1.6);
  });

  it('bakes the designed ink fork: 1–4 dark ink, 5 white — never uniform', () => {
    ([1, 2, 3, 4, 5] as FlagSeverity[]).forEach((s) => {
      const text = discTree(<SeverityDisc severity={s} size={24} />).children?.[0];
      if (!text || typeof text === 'string') throw new Error('expected a digit Text');
      expect(StyleSheet.flatten(text.props.style).color).toBe(severity[s].textOnColor);
    });
    // The asymmetry is the system, not an accident — a "fix" to uniform would trip this.
    expect(severity[4].textOnColor).toBe('#0F1B2D');
    expect(severity[5].textOnColor).toBe('#ffffff');
    expect(severity[4].textOnColor).not.toBe(severity[5].textOnColor);
  });

  it('is decorative by default — the digit is hidden; the host row speaks it', () => {
    const disc = discTree(<SeverityDisc severity={3} size={24} />);
    expect(disc.props.accessibilityElementsHidden).toBe(true);
    expect(disc.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(disc.props.accessible).toBe(false);
  });
});

describe('SeverityDisc — primitive contract (source)', () => {
  const src = readFileSync('src/components/SeverityDisc.tsx', 'utf8');

  it('digit ink is the theme fork, never a uniform literal', () => {
    expect(src).toMatch(/color:\s*severity\[sev\]\.textOnColor/);
  });
  it('fill is severityColor and the disc is a full circle', () => {
    expect(src).toMatch(/backgroundColor:\s*severityColor\(sev\)/);
    expect(src).toMatch(/borderRadius:\s*radius\.circle/);
  });
  it('digit is bold', () => {
    expect(src).toMatch(/fontWeight:\s*font\.weight\.bold/);
  });
  it('decorative by default via the house helper', () => {
    expect(src).toMatch(/decorative\s*=\s*true/);
    expect(src).toMatch(/decorative\s*\?\s*decorativeProps\s*:\s*null/);
  });
});

describe('zero-delta adoption pinning (source)', () => {
  const cases: [string, RegExp][] = [
    ['src/screens/LegendModal.tsx', /size=\{32\}\s+digitSize=\{font\.size\.base\}/],
    ['src/screens/NearbyFlagsModal.tsx', /size=\{32\}\s+digitSize=\{font\.size\.sm\}/],
    ['src/components/ActivityFeedModal.tsx', /size=\{28\}\s+digitSize=\{font\.size\.xs\}/],
    [
      'src/components/RecentlyViewedRow.tsx',
      /size=\{24\}\s+digitSize=\{font\.size\.xs\}\s+maxFontSizeMultiplier=\{1\.3\}/,
    ],
  ];

  it.each(cases)('%s renders SeverityDisc with pinned geometry, no dead styles', (path, re) => {
    const s = readFileSync(path, 'utf8');
    expect(s).toMatch(/<SeverityDisc\s/);
    expect(s).toMatch(re);
    expect(s).not.toMatch(/sevDot:\s*\{/);
    expect(s).not.toMatch(/sevDotText:\s*\{/);
  });
});

describe('the severity grammar speaks on every surface (source)', () => {
  it('FlagDetail: chip shows number · word, a11y keeps "of 5", stake line present', () => {
    const s = readFileSync('src/components/FlagDetailModal.tsx', 'utf8');
    // visible chip: "Severity {n} · {word}"
    expect(s).toMatch(/Severity \{shownFlag\.severity\} · \{SEVERITY_LABELS\[shownFlag\.severity\]\}/);
    // the "of 5" anchor cannot regress — a11y stays pinned to severityA11y
    expect(s).toMatch(/accessibilityLabel=\{severityA11y\(shownFlag\.severity\)\}/);
    // the quiet stake line (SEVERITY_DESCRIPTIONS, flags.ts — not theme.ts)
    expect(s).toMatch(/SEVERITY_DESCRIPTIONS\[shownFlag\.severity\]/);
  });

  it('Home Recent: numbered mini-disc; visible meta still speaks number · word', () => {
    const s = readFileSync('src/screens/HomeScreen.tsx', 'utf8');
    expect(s).toMatch(
      /<SeverityDisc\s+severity=\{item\.f\.severity\}\s+size=\{24\}[^>]*maxFontSizeMultiplier=\{1\.3\}/,
    );
    expect(s).toMatch(/Severity \$\{item\.f\.severity\} · \$\{SEVERITY_LABELS\[item\.f\.severity\]\}/);
    expect(s).not.toMatch(/dot:\s*\{\s*width: 11/); // the 11px dot is gone
  });

  it('Profile: pill shows Severity · word; a11y routed to severityA11y', () => {
    const s = readFileSync('src/screens/ProfileScreen.tsx', 'utf8');
    expect(s).toMatch(/· Severity\{' '\}/);
    expect(s).toMatch(/SEVERITY_LABELS\[nearestUnresolved\.flag\.severity\]/);
    expect(s).toMatch(/severityA11y\(nearestUnresolved\.flag\.severity\)/);
    expect(s).not.toMatch(/· severity\{' '\}/); // lowercase, wordless — gone
  });

  it('MyReports: meta shows number · word · date; a11y routed to severityA11y', () => {
    const s = readFileSync('src/components/MyReportsModal.tsx', 'utf8');
    expect(s).toMatch(/Severity \{item\.severity\} · \{SEVERITY_LABELS\[item\.severity\]\} · \{dateLabel\}/);
    expect(s).toMatch(/severityA11y\(item\.severity\)/);
    expect(s).not.toMatch(/Severity \{item\.severity\} • /); // the U+2022 bullet is gone
  });

  it('MyWatched: colour dot becomes a numbered SeverityDisc (a11y already speaks it)', () => {
    const s = readFileSync('src/components/MyWatchedModal.tsx', 'utf8');
    expect(s).toMatch(/<SeverityDisc\s+severity=\{item\.severity\}\s+size=\{24\}/);
    expect(s).toMatch(/severityA11y\(item\.severity\)/); // row a11y already on-spine
    expect(s).not.toMatch(/severityDot:\s*\{/); // dead colour-dot style gone
  });

  it('Tasks: nearest-barrier pill gains Severity {n}; a11y gains severityA11y', () => {
    const s = readFileSync('src/screens/TasksScreen.tsx', 'utf8');
    expect(s).toMatch(/· Severity \$\{nearestOpenHit\.flag\.severity\} ·/);
    expect(s).toMatch(/severityA11y\(nearestOpenHit\.flag\.severity\)/);
  });
});
