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
    // The banner announces its count on mount. Silenced here so the emoji
    // census below stays quiet — and ASSERTED in its own block at the bottom
    // of this file (A11Y-210: a spy that is silenced but never asserted looks
    // exactly like coverage and provides none).
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

// ---------------------------------------------------------------------------
// A11Y-210 — the announce is WIRED, not merely silenced.
//
// The train's law is "verified wired, not assumed". This file used to spy on
// announceForAccessibility purely to keep it quiet, which is the one shape of
// test that cannot fail: the call could disappear entirely and every assertion
// here would still pass. These assert the utterance itself.
// ---------------------------------------------------------------------------
describe('UpdateBanner — the status announcement fires (A11Y-210)', () => {
  let announceSpy: jest.SpyInstance;
  beforeEach(() => {
    announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
  });
  afterEach(() => {
    announceSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('announces the singular count on mount', () => {
    render(<UpdateBanner count={1} onView={jest.fn()} onDismiss={jest.fn()} />);
    expect(announceSpy).toHaveBeenCalledWith(
      '1 of your flags has a status update since your last visit.',
    );
  });

  it('announces the plural count on mount', () => {
    render(<UpdateBanner count={4} onView={jest.fn()} onDismiss={jest.fn()} />);
    expect(announceSpy).toHaveBeenCalledWith(
      '4 of your flags have status updates since your last visit.',
    );
  });

  it('says nothing when there is nothing to report', () => {
    render(<UpdateBanner count={0} onView={jest.fn()} onDismiss={jest.fn()} />);
    expect(announceSpy).not.toHaveBeenCalled();
  });
});
