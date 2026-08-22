/**
 * FlagCard — one grammar, two densities, and the geometry that survives large type.
 *
 * ─── WHAT THIS REPLACES ───────────────────────────────────────────────────
 * `SeverityBadge.dynamicType.test.tsx`. That suite pinned a pill whose two
 * halves scaled on different rules — a digit capped at 1.6 beside a word that
 * was uncapped by contract, so at accessibility-extra-large the word rendered
 * ~47% larger than its own digit and the pill ate the width the Tasks card
 * title needed (SW-36). The pill is retired (Q20): severity is a disc and a
 * word in a sentence now, and a disc is a fixed box that caps by its box.
 *
 * The BUG the old suite guarded did not retire with the component, so its
 * substance moves here: the parts of one card must not scale apart, and a title
 * must never be narrower than its own longest word.
 *
 * ─── WHY A RENDER TEST AND NOT ONLY A SOURCE SCAN ─────────────────────────
 * `flexBasisUnderLargeType.guard.test.ts` reads the StyleSheet; this reads what
 * actually reaches the node, so a renamed style key or a dropped style array
 * trips here even when the source still contains the right words.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import useWindowDimensions from 'react-native/Libraries/Utilities/useWindowDimensions';
import { FlagCard, flagCardA11yLabel } from '../FlagCard';
import { a11yToggle } from '@/lib/accessibility';
import { font } from '@/theme';
import type { FlagCardFlag } from '../FlagCard';

// The component reads `fontScale` to decide whether to recompose, so the
// recomposition point has to be drivable from a test. Mocking the hook module
// directly (rather than the whole of react-native) keeps every other RN export
// real — the styles this suite asserts on are flattened by the real StyleSheet.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })),
}));
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

const mockWindow = useWindowDimensions as unknown as jest.Mock;
const setFontScale = (fontScale: number) =>
  mockWindow.mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });

beforeEach(() => setFontScale(1));

const flag: FlagCardFlag = {
  category: 'broken_sidewalk',
  severity: 4,
  status: 'open',
  description: 'Pavement is heaved by a tree root across the full width of the walkway.',
};

/** Every <Text> the card renders, outermost first. */
const textsOf = (node: React.ReactElement) => render(node).UNSAFE_getAllByType(Text);

describe('F2 — the census is one sentence in one order', () => {
  it('row density reads severity, word, status, distance', () => {
    const { getByText } = render(<FlagCard flag={flag} density="row" distanceKm={0.433} />);
    // Q7 variation A: the "Severity N" prefix stays, so the digit appears in
    // the disc AND in the sentence. Reversing that is a banked question, not a
    // tidy-up, so this pins the ruling.
    expect(getByText(/Severity 4 · Significant · Open · 433 m/)).toBeTruthy();
  });

  it('card density appends the extra segments after the distance', () => {
    const { getByText } = render(
      <FlagCard flag={flag} density="card" distanceKm={0.876} censusExtra={['11 min walk', '2d ago']} />,
    );
    expect(getByText(/Severity 4 · Significant · Open · 876 m · 11 min walk · 2d ago/)).toBeTruthy();
  });

  it('drops the distance segment entirely when no location has resolved', () => {
    const { getByText, queryByText } = render(<FlagCard flag={flag} density="row" />);
    expect(getByText('Severity 4 · Significant · Open')).toBeTruthy();
    expect(queryByText(/·\s*·/)).toBeNull(); // no orphaned separator
  });
});

describe('T1 — the distance is the one numeral, and it is mono with tabular figures', () => {
  it('renders the distance in JetBrains Mono, tabular', () => {
    const { getByText } = render(<FlagCard flag={flag} density="row" distanceKm={0.433} />);
    const style = StyleSheet.flatten(getByText('433 m').props.style);
    expect(style.fontFamily).toBe(font.family.mono);
    // The face alone would not hold a column of distances in line as the digits
    // change width — this is the part that does that work.
    expect(style.fontVariant).toEqual(['tabular-nums']);
  });

  it('leaves the rest of the census in the body face', () => {
    // A whole-sentence mono line would read as data instead of as a sentence.
    const { getByText } = render(<FlagCard flag={flag} density="row" distanceKm={0.433} />);
    const census = getByText(/Severity 4 · Significant/);
    expect(StyleSheet.flatten(census.props.style).fontFamily).toBe(font.family.bodyMedium);
  });
});

describe('F4 — the card recomposes at 1.5x instead of scrolling its default', () => {
  it('below the point: one census line and a chevron', () => {
    const { getByText, UNSAFE_getAllByType } = render(
      <FlagCard flag={flag} density="row" distanceKm={0.433} />,
    );
    expect(getByText(/Severity 4 · Significant · Open · 433 m/)).toBeTruthy();
    // title + census = 2 text nodes, plus the disc's digit and the mono span.
    expect(UNSAFE_getAllByType(Text).length).toBeGreaterThan(0);
  });

  it('at the point: the census breaks BEFORE the status word', () => {
    setFontScale(1.5);
    const { getByText } = render(<FlagCard flag={flag} density="row" distanceKm={0.433} />);
    // Two lines, split at the "·" that separates the severity from the status —
    // not wherever the line happens to run out.
    expect(getByText('Severity 4 · Significant')).toBeTruthy();
    expect(getByText(/Open · 433 m/)).toBeTruthy();
  });

  it('at the point: the row text block takes the full width so the disc sits above it', () => {
    // A 100% basis inside a wrapping row is what pushes the disc onto its own
    // line. Asserted on the tree rather than through `.parent`, which walks
    // composite wrappers as readily as host views.
    const fullWidthBlocks = (scale: number) => {
      setFontScale(scale);
      return render(<FlagCard flag={flag} density="row" />)
        .UNSAFE_getAllByType(View)
        .map((v) => StyleSheet.flatten(v.props.style))
        .filter((s) => s?.flexBasis === '100%');
    };
    expect(fullWidthBlocks(1.5)).toHaveLength(1);
    // Negative control: below the point the row is one line and nothing claims
    // the full width, so the assertion above cannot pass for the wrong reason.
    expect(fullWidthBlocks(1)).toHaveLength(0);
  });

  it('the spoken label is identical on both sides of the point', () => {
    const label = flagCardA11yLabel(flag, 0.433);
    for (const scale of [1, 1.5, 2.35]) {
      setFontScale(scale);
      const { getByLabelText } = render(<FlagCard flag={flag} density="row" distanceKm={0.433} />);
      expect(getByLabelText(label)).toBeTruthy();
    }
  });
});

describe('SW-36 — the title box must fit its own word', () => {
  it('the card title grows and shrinks but takes its basis from its text', () => {
    const { getByText } = render(<FlagCard flag={flag} density="card" />);
    const style = StyleSheet.flatten(getByText('Broken sidewalk').props.style);
    // Pre-fix this was `flex: 1` — shorthand for grow 1 / shrink 1 / BASIS 0% —
    // which contributes nothing to the line-break test, so the wrap could never
    // fire however large the glyphs got.
    expect(style.flex).toBeUndefined();
    expect(style.flexGrow).toBe(1);
    expect(style.flexShrink).toBe(1);
    expect(style.flexBasis).toBeUndefined();
    // ...and the floor, without which the rest is not a fix: flexShrink still
    // lets a non-shrinking sibling squeeze the title below "sidewalk".
    expect(style.minWidth).toBe(130);
  });

  it('the title is not truncated to buy the room instead', () => {
    const title = render(<FlagCard flag={flag} density="card" />).getByText('Broken sidewalk');
    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.ellipsizeMode).toBeUndefined();
  });
});

describe('T4 — the description never clamps to two lines', () => {
  it('three lines below the recomposition point', () => {
    const { getByText } = render(<FlagCard flag={flag} density="card" showDescription />);
    expect(getByText(flag.description!).props.numberOfLines).toBe(3);
  });

  it('uncapped at or above it', () => {
    setFontScale(1.5);
    const { getByText } = render(<FlagCard flag={flag} density="card" showDescription />);
    expect(getByText(flag.description!).props.numberOfLines).toBeUndefined();
  });

  it('uncapped at every size when the host opts out (the accessible list)', () => {
    const { getByText } = render(
      <FlagCard flag={flag} density="card" showDescription clampDescription={false} />,
    );
    expect(getByText(flag.description!).props.numberOfLines).toBeUndefined();
  });
});

describe('the header summary node is opt-in', () => {
  it('without headerA11y the header announces nothing of its own', () => {
    // Nearby's host Pressable owns the card's one-breath PROTECT-1 label; a
    // nested accessible node here would fragment it.
    const { queryByRole } = render(<FlagCard flag={flag} density="card" />);
    expect(queryByRole('button')).toBeNull();
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('with headerA11y the header is the labeled summary node, role forked', () => {
    const { getByRole } = render(
      <FlagCard
        flag={flag}
        density="card"
        headerA11y={{
          role: 'checkbox',
          label: 'Broken sidewalk, severity 4 of 5, Significant. Selected.',
          state: a11yToggle({ checked: true, disabled: false }),
        }}
      />,
    );
    const node = getByRole('checkbox');
    expect(node.props.accessibilityState).toMatchObject({ checked: true });
    // a11yToggle's flat web alias survives the spread.
    expect(node.props['aria-checked']).toBe(true);
  });
});

describe('the default composite label is the one the app already spoke', () => {
  it('uses speakDistance, never the abbreviated visible string', () => {
    // SR-042: "433 m" read aloud becomes "four hundred thirty three em".
    const label = flagCardA11yLabel(flag, 0.433);
    expect(label).toBe(
      'Broken sidewalk, severity 4 of 5, Significant, status Open, 433 meters away',
    );
    // The visible string is the abbreviation "433 m"; the spoken one must not be.
    expect(label).not.toMatch(/433 m\b/);
  });

  it('omits the distance clause when there is no distance', () => {
    expect(flagCardA11yLabel(flag)).toBe(
      'Broken sidewalk, severity 4 of 5, Significant, status Open',
    );
  });

  it('a host may override it (Nearby keeps its own PROTECT-1 sentence)', () => {
    const { getByLabelText } = render(
      <FlagCard flag={flag} density="row" accessibilityLabel="a host sentence" />,
    );
    expect(getByLabelText('a host sentence')).toBeTruthy();
  });
});

describe('C2 / C3 — the severity colour appears once, and status is a word', () => {
  it('renders no pill: the status is text inside the census', () => {
    const { getByText, queryByText } = render(<FlagCard flag={flag} density="card" />);
    // "Open" exists only as part of the census sentence, never as its own node.
    expect(queryByText('Open')).toBeNull();
    expect(getByText(/· Open$/)).toBeTruthy();
  });

  it('the disc digit is the only place the severity colour is drawn', () => {
    const nodes = textsOf(<FlagCard flag={flag} density="card" />);
    const filled = nodes.filter((t) => {
      const s = StyleSheet.flatten(t.props.style) ?? {};
      return s.color === require('@/theme').severity[4].textOnColor;
    });
    expect(filled).toHaveLength(1);
  });
});
