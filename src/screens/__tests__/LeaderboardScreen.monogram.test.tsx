/**
 * SW-44 — the avatar monogram must never read "ME" for someone who isn't you.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * `LeaderboardScreen` built its monogram as:
 *
 *     const name = displayName ?? 'Member';
 *     const initials = name.slice(0, 2).toUpperCase();
 *
 * `display_name` is nullable, so every anonymized contributor fell through to
 * the privacy placeholder 'Member' — and 'Member'.slice(0, 2) is "ME". On screen
 * in the authed pass, 1st, 3rd and 4th place all wore a badge reading ME while
 * the row that actually WAS the signed-in user wore "JA". The one monogram that
 * means "me" appeared in every place the user was not.
 *
 * The 'Member' LABEL is correct and privacy-preserving, and stays. Only the
 * letters derived from it were wrong.
 *
 * ─── WHY A RENDER TEST ────────────────────────────────────────────────────
 * This screen had no behavioural test at all — only source-scan guards for
 * scroll containment and a data-layer test for listLeaderboard(). A source scan
 * could pin the expression, but the defect is what a user SEES, and the rows
 * are behind auth so no walk can measure them. So: mount it, feed it a mixed
 * list, and read the output.
 *
 * The sheet is deliberately mountable standalone — it reads SafeAreaInsetsContext
 * and BottomTabBarHeightContext with `?? 0` fallbacks rather than the hooks that
 * throw without providers.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import LeaderboardScreen from '../LeaderboardScreen';

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-me' } }) }));

const mockListLeaderboard = jest.fn();
jest.mock('@/lib/flags', () => ({
  listLeaderboard: (...args: unknown[]) => mockListLeaderboard(...args),
  getUserLeaderboardRank: jest.fn(async () => null),
}));

jest.mock('@/lib/users', () => {
  const actual = jest.requireActual('@/lib/users');
  return {
    // getInitials is the real, tested helper — the whole point is that this
    // screen now uses it instead of a raw slice.
    getInitials: actual.getInitials,
    listMonthlyLeaderboard: jest.fn(async () => []),
  };
});

const ENTRIES = [
  { id: 'user-a', display_name: null, avatar_url: null, points: 400 },
  { id: 'user-me', display_name: 'Jarvis Mckneil', avatar_url: null, points: 300 },
  { id: 'user-b', display_name: null, avatar_url: null, points: 200 },
  { id: 'user-c', display_name: null, avatar_url: null, points: 100 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockListLeaderboard.mockResolvedValue(ENTRIES);
});

const open = () => render(<LeaderboardScreen visible onClose={jest.fn()} />);

/**
 * The monogram and the "you" badge both carry `decorativeProps`, which RNTL
 * treats as hidden and excludes from queries by default. Without this option a
 * `queryAllByText('ME')` returns [] whether or not the bug is present — the
 * assertion would pass against the BROKEN source. Ask for hidden elements
 * explicitly so the test actually looks at the pixels a sighted user sees.
 */
const HIDDEN = { includeHiddenElements: true } as const;

describe('SW-44 — anonymized contributors', () => {
  it('never render the monogram "ME"', async () => {
    const { queryAllByText } = open();
    await waitFor(() => {
      // Two non-vacuity guards before the real assertion. Without the first,
      // "no ME" is trivially true because nothing has rendered yet. Without the
      // second, it is trivially true because monograms carry decorativeProps
      // and this query would not see them at all.
      expect(queryAllByText('Jarvis Mckneil').length).toBe(1);
      expect(queryAllByText('JM', HIDDEN).length).toBe(1);

      // Three of the four rows are anonymized. Before the fix, all three wore
      // "ME".
      expect(queryAllByText('ME', HIDDEN)).toHaveLength(0);
    });
  });

  it('still carry the "Member" label, which was correct all along', async () => {
    const { queryAllByText } = open();
    await waitFor(() => expect(queryAllByText('Member').length).toBe(3));
  });

  it('are still announced correctly to a screen reader', async () => {
    // The monogram is decorative either way; the row label is what is spoken,
    // and this change must not touch it.
    const { queryByLabelText } = open();
    await waitFor(() =>
      expect(queryByLabelText('1st, Member, 400 points')).not.toBeNull(),
    );
  });
});

describe('SW-44 — named contributors', () => {
  it('get real initials from their own name', async () => {
    // "Jarvis Mckneil" -> JM. The walk saw "JA" because the old code sliced the
    // first two CHARACTERS of the string; getInitials() takes one code point
    // from the first and last word, which is what ProfileScreen's own avatar
    // has always done. A deliberate, visible change for named rows.
    const { queryAllByText } = open();
    await waitFor(() => expect(queryAllByText('JM', HIDDEN).length).toBe(1));
  });

  it('go through getInitials(), so an emoji name is not cut in half', async () => {
    // F59: a raw two-code-unit slice splits a surrogate pair and renders a
    // replacement glyph. getInitials() already handles it and is unit-tested;
    // this asserts the leaderboard is on that path, not its own.
    mockListLeaderboard.mockResolvedValue([
      { id: 'user-x', display_name: '🎉 Party Person', avatar_url: null, points: 10 },
    ]);
    const { queryAllByText, queryByText } = open();
    await waitFor(() => expect(queryAllByText('🎉 Party Person').length).toBe(1));

    expect(queryByText('\uD83C', HIDDEN)).toBeNull();
  });

  it('the signed-in user is still marked as themselves', async () => {
    // The row that IS you keeps its "you" badge — the thing the ME monogram was
    // drowning out.
    const { queryAllByText } = open();
    await waitFor(() => expect(queryAllByText('you', HIDDEN).length).toBe(1));
  });
});
