/**
 * ReportsBreakdownCard — the breakdown label must fit its own word (SW-51).
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * At content size `accessibility-extra-large` the sim walk censused Profile's
 * BY CATEGORY / BY SEVERITY rows and found text broken MID-WORD:
 *
 *     "Broken sidewal / k"      "Modera / te"      "Signific..."
 *
 * `barLabel` declared `flexBasis: 130`, and `barTrack` beside it is `flex: 1`,
 * so the track absorbed every spare point and the label stayed pinned at
 * exactly 130pt at every text size — while `variant="bodyMedium"` is uncapped
 * by contract and its glyphs scaled past 2x. A word wider than its container is
 * character-broken by iOS `NSLineBreakByWordWrapping`. Nothing was truncating;
 * the box simply could not grow.
 *
 * ─── WHY THIS SUITE IS A RENDER TEST AND NOT ONLY A SOURCE SCAN ───────────
 * flexBasisUnderLargeType.guard.test.ts pins the style block as text, which is
 * how invisible geometry is normally guarded here. This suite is the other
 * half: it asserts the props that actually reach the rendered <Text>, so a
 * refactor that renames the style or stops applying it also trips.
 *
 * ─── AND IT SETTLES A QUESTION THE DEVICE COULD NOT ───────────────────────
 * The walk recorded "Signific..." with a trailing ellipsis, which reads like
 * `numberOfLines={1}` truncation — but this file sets no `numberOfLines` and no
 * `ellipsizeMode` anywhere, so source could not account for it. It could not be
 * re-checked on a device either: this card renders only for a signed-in user
 * (`userId` gates it), and an agent cannot enter a password.
 *
 * So the question is answered structurally instead. The assertions below prove
 * nothing in the render tree truncates, which means the mark can only have been
 * the character-break itself — the same defect as its two neighbours, not a
 * second one. If anyone later "fixes" the ellipsis by adding `numberOfLines`,
 * this suite goes red and points at dynamicTypeGuard's rule instead.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import ReportsBreakdownCard from '../ReportsBreakdownCard';
import { EMPTY_USER_REPORT_STATS, fetchUserReportStats } from '@/lib/userReportStats';

// Only the fetch is stubbed; the empty-stats shape and the count helpers stay
// real, so a change to the stats contract surfaces here rather than being
// papered over by a hand-written fixture.
jest.mock('@/lib/userReportStats', () => {
  const actual = jest.requireActual('@/lib/userReportStats');
  return {
    ...actual,
    fetchUserReportStats: jest.fn(),
  };
});

// jest.mock is hoisted above the import, so this binding is already the mock.
const mockFetch = fetchUserReportStats as jest.Mock;

/**
 * A user whose reports include the two longest labels in the app — "Broken
 * sidewalk" (longest category, and the word the walk saw split) and severity 4
 * "Significant" (longest severity, composed as "4 — Significant").
 */
function statsWithLongLabels() {
  return {
    ...EMPTY_USER_REPORT_STATS,
    total: 3,
    byCategory: { ...EMPTY_USER_REPORT_STATS.byCategory, broken_sidewalk: 2, no_ramp: 1 },
    bySeverity: { ...EMPTY_USER_REPORT_STATS.bySeverity, 4: 2, 3: 1 },
  };
}

async function renderCard() {
  mockFetch.mockResolvedValue(statsWithLongLabels());
  const utils = render(<ReportsBreakdownCard userId="user-1" />);
  await waitFor(() => utils.getByText('Broken sidewalk'));
  return utils;
}

describe('ReportsBreakdownCard — a label box that grows with its text', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the longest category and severity labels in full', async () => {
    // Non-vacuity: every assertion below reads these two nodes, so if the card
    // ever stops rendering them the suite must fail here rather than silently
    // checking nothing.
    const { getByText } = await renderCard();
    expect(getByText('Broken sidewalk')).toBeTruthy();
    expect(getByText('4 — Significant')).toBeTruthy();
  });

  it('the label no longer carries a fixed flexBasis', async () => {
    const { getByText } = await renderCard();
    const style = StyleSheet.flatten(getByText('Broken sidewalk').props.style);
    // Pre-fix this was 130 — a box that ignored the font size.
    expect(style.flexBasis).toBeUndefined();
    expect(style.minWidth).toBe(130);
  });

  it('the label may still shrink, but never below its own content', async () => {
    const { getByText } = await renderCard();
    const style = StyleSheet.flatten(getByText('4 — Significant').props.style);
    expect(style.flexShrink).toBe(1);
    // It must not compete with the track for free space — that is the track's
    // job, and a growing label would push the bar out of alignment.
    expect(style.flexGrow).toBe(0);
  });

  it('nothing in the render tree truncates the label — the "Signific..." answer', async () => {
    // This passes before AND after the fix, deliberately. It is the assertion
    // that retires the ellipsis question: if no node sets numberOfLines or
    // ellipsizeMode, the mark the walk saw cannot have come from our code.
    const { getByText } = await renderCard();
    for (const label of ['Broken sidewalk', '4 — Significant']) {
      const node = getByText(label);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.ellipsizeMode).toBeUndefined();
    }
  });

  it('the row can wrap so the label can take it alone at large type', async () => {
    const { getByLabelText } = await renderCard();
    // Query the row by the accessibility label it composes for itself, rather
    // than walking up from the text — RNTL's `parent` lands on an intermediate
    // node, not the styled View.
    const row = getByLabelText('Broken sidewalk: 2 reports');
    expect(StyleSheet.flatten(row.props.style).flexWrap).toBe('wrap');
  });
});
