/**
 * Wave 4 — Gary: HeatmapLegend component tests.
 *
 * HeatmapLegend is Jordan's UI condition: the severity scale must be
 * disclosed whenever the heat layer is visible. These tests verify that
 * every severity level renders, text labels match the flags.ts constants,
 * and the accessibility attributes satisfy the a11y contract.
 *
 * flags.ts imports supabase.ts at the top level; mock it to keep tests
 * hermetic and avoid the "missing env vars" warning path.
 *
 * RNTL 13 note: The title and severity row elements have
 * `accessibilityElementsHidden={true}` / `importantForAccessibility="no-hide-descendants"`
 * so they're intentionally hidden from the a11y tree (the parent container's
 * accessibilityLabel carries all the a11y information). RNTL 13+ skips these
 * elements in `getByText` by default, so structural content checks use
 * `UNSAFE_getAllByType(Text)` which queries the raw render tree.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
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

describe('HeatmapLegend', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HeatmapLegend />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays the "Heat map" title in the rendered tree', () => {
    const textStrings = getAllTextStrings(render(<HeatmapLegend />));
    expect(textStrings).toContain('Heat map');
  });

  it('shows all 5 severity numeric labels in the rendered tree', () => {
    const textStrings = getAllTextStrings(render(<HeatmapLegend />));
    // The component renders "${severity} ${label}" via template literal
    expect(textStrings).toContain('1 Minor');
    expect(textStrings).toContain('2 Mild');
    expect(textStrings).toContain('3 Moderate');
    expect(textStrings).toContain('4 Significant');
    expect(textStrings).toContain('5 Severe');
  });

  it('renders exactly 6 Text nodes (1 title + 5 severity labels)', () => {
    const textStrings = getAllTextStrings(render(<HeatmapLegend />));
    // 1 title "Heat map" + 5 severity labels. This pins the output size so
    // an accidental duplicate or missing severity shows up immediately.
    expect(textStrings).toHaveLength(6);
  });

  it('does not render severity 0 or 6', () => {
    const textStrings = getAllTextStrings(render(<HeatmapLegend />));
    expect(textStrings.some((t) => /^0 /.test(t))).toBe(false);
    expect(textStrings.some((t) => /^6 /.test(t))).toBe(false);
  });

  it('has accessibilityRole="image" on the container', () => {
    const { getByRole } = render(<HeatmapLegend />);
    const container = getByRole('image');
    expect(container).toBeTruthy();
  });

  it('accessibilityLabel mentions all 5 severity word labels', () => {
    const { getByRole } = render(<HeatmapLegend />);
    const label: string = getByRole('image').props.accessibilityLabel ?? '';
    expect(label).toContain('Minor');
    expect(label).toContain('Mild');
    expect(label).toContain('Moderate');
    expect(label).toContain('Significant');
    expect(label).toContain('Severe');
  });

  it('accessibilityLabel includes all 5 numeric severity levels', () => {
    const { getByRole } = render(<HeatmapLegend />);
    const label: string = getByRole('image').props.accessibilityLabel ?? '';
    for (const n of ['1', '2', '3', '4', '5']) {
      expect(label).toContain(n);
    }
  });

  it('accessibilityLabel mentions colour names (WCAG: colour is not the only signal)', () => {
    const { getByRole } = render(<HeatmapLegend />);
    const label: string = getByRole('image').props.accessibilityLabel ?? '';
    // Heatmap uses the D5 palette (yellow→orange→red), not pin-marker green.
    expect(label).toContain('yellow');
    expect(label).toContain('red');
  });

  it('container is marked accessible={true}', () => {
    const { getByRole } = render(<HeatmapLegend />);
    const container = getByRole('image');
    expect(container.props.accessible).toBe(true);
  });
});
