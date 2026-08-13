/**
 * Wave 4 — Gary: HeatmapLegend component tests.
 *
 * (Rewritten 2026-08-12 for the map-chrome compaction. The legend now floats on
 * a 0.65 always-light pin with #222 inks and gains a close X that collapses it
 * to a "Legend" chip — so the disclosure Jordan's condition requires stays ONE
 * tap away. The A11Y-213 restructure means the GlassSurface container is no
 * longer the accessible leaf: a SUMMARY node carries the image semantics + label,
 * the close X is its own reachable button, and the collapsed chip is a separate
 * render branch. These tests pin all three.)
 *
 * HeatmapLegend is Jordan's UI condition: the severity scale must be disclosed
 * whenever the heat layer is visible. flags.ts imports supabase.ts at the top
 * level; mock it to keep tests hermetic.
 *
 * RNTL 13 note: the summary's title + severity row carry decorativeProps
 * (accessibilityElementsHidden / no-hide-descendants) so they're hidden from the
 * a11y tree (the summary's accessibilityLabel carries the info). RNTL 13+ skips
 * these in `getByText` by default, so structural content checks use
 * `UNSAFE_getAllByType(Text)` which queries the raw render tree.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import HeatmapLegend from '../HeatmapLegend';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

/** Extract text content from all rendered Text nodes (bypasses a11y-hidden filter). */
function getAllTextStrings(component: ReturnType<typeof render>): string[] {
  return component.UNSAFE_getAllByType(Text).map((node) => node.props.children as string);
}

describe('HeatmapLegend — expanded (default)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HeatmapLegend />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows all 5 severity numeric labels + the title in the rendered tree', () => {
    const textStrings = getAllTextStrings(render(<HeatmapLegend />));
    expect(textStrings).toContain('Heat map');
    expect(textStrings).toContain('1 Minor');
    expect(textStrings).toContain('2 Mild');
    expect(textStrings).toContain('3 Moderate');
    expect(textStrings).toContain('4 Significant');
    expect(textStrings).toContain('5 Severe');
  });

  it('renders exactly 6 Text nodes (1 title + 5 severity labels; the close X is an icon, not text)', () => {
    const textStrings = getAllTextStrings(render(<HeatmapLegend />));
    expect(textStrings).toHaveLength(6);
  });

  it('does not render severity 0 or 6', () => {
    const textStrings = getAllTextStrings(render(<HeatmapLegend />));
    expect(textStrings.some((t) => /^0 /.test(t))).toBe(false);
    expect(textStrings.some((t) => /^6 /.test(t))).toBe(false);
  });

  it('the SUMMARY node (not the container) carries the image role, accessible=true, and the full label', () => {
    const { getByRole } = render(<HeatmapLegend />);
    const summary = getByRole('image');
    expect(summary).toBeTruthy();
    expect(summary.props.accessible).toBe(true);
    const label: string = summary.props.accessibilityLabel ?? '';
    for (const word of ['Minor', 'Mild', 'Moderate', 'Significant', 'Severe']) {
      expect(label).toContain(word);
    }
    for (const n of ['1', '2', '3', '4', '5']) expect(label).toContain(n);
    // WCAG: colour is not the only signal — the label names colours too.
    expect(label).toContain('yellow');
    expect(label).toContain('red');
  });

  it('exposes the close X as its OWN reachable button (A11Y-213: not swallowed by the container)', () => {
    const { getByLabelText } = render(<HeatmapLegend />);
    expect(getByLabelText('Collapse heat map legend')).toBeTruthy();
  });
});

describe('HeatmapLegend — collapse to chip (Sky-locked, keeps the disclosure one tap away)', () => {
  it('pressing the close X collapses to a "Legend" chip that re-expands', () => {
    const view = render(<HeatmapLegend />);
    // Collapse.
    fireEvent.press(view.getByLabelText('Collapse heat map legend'));
    // The chip is a labelled button carrying just the word "Legend".
    const chip = view.getByLabelText('Show heat map legend');
    expect(chip).toBeTruthy();
    expect(getAllTextStrings(view)).toContain('Legend');
    // The full expanded legend is gone in the collapsed branch.
    expect(view.queryByLabelText('Collapse heat map legend')).toBeNull();
    // Re-expand.
    fireEvent.press(chip);
    expect(view.getByLabelText('Collapse heat map legend')).toBeTruthy();
    expect(getAllTextStrings(view)).toHaveLength(6);
  });
});
