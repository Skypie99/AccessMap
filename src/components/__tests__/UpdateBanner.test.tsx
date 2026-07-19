/**
 * UpdateBanner — emoji census (BP16 / T17, M2).
 *
 * Regression lock: the banner must contain ZERO emoji text nodes. 🔔 was the
 * last decorative emoji survivor app-wide (BENCH-1 census); it is now a Lucide
 * <Bell/> (an SVG — no string leaves), completing PROTECT-24's house style.
 * Walking the rendered tree for string leaves and matching the Unicode
 * Extended_Pictographic property catches any emoji regardless of nesting or
 * a11y flags — this test FAILS on the pre-fix 🔔 and PASSES on the Bell.
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render } from '@testing-library/react-native';
import UpdateBanner from '../UpdateBanner';

// GlassSurface's useReduceTransparency does an async AccessibilityInfo probe +
// setState; pin it so the render is deterministic (matches the drawer tests).
jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReduceTransparency: () => false,
}));

const EMOJI = /\p{Extended_Pictographic}/u;

// Collect every string leaf in a react-test-renderer toJSON() tree.
function collectStrings(node: unknown, out: string[] = []): string[] {
  if (node == null) return out;
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const c of node) collectStrings(c, out);
    return out;
  }
  if (typeof node === 'object') {
    collectStrings((node as { children?: unknown }).children, out);
  }
  return out;
}

describe('UpdateBanner — emoji census (BP16 / T17)', () => {
  let announceSpy: jest.SpyInstance;
  beforeEach(() => {
    // The banner announces its count on mount; keep it a quiet no-op.
    announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
  });
  afterEach(() => {
    announceSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('renders NO emoji text nodes (singular count)', () => {
    const { toJSON } = render(
      <UpdateBanner count={1} onView={jest.fn()} onDismiss={jest.fn()} />,
    );
    const offenders = collectStrings(toJSON()).filter((t) => EMOJI.test(t));
    expect(offenders).toEqual([]);
  });

  it('renders NO emoji text nodes (plural count)', () => {
    const { toJSON } = render(
      <UpdateBanner count={3} onView={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(collectStrings(toJSON()).filter((t) => EMOJI.test(t))).toEqual([]);
  });

  it('still renders the update label (content intact after the glyph swap)', () => {
    const { getByText } = render(
      <UpdateBanner count={3} onView={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('3 updates since your last visit')).toBeTruthy();
  });
});
