/**
 * OnboardingCards — the composition that holds still, and the word that fits.
 *
 * Three properties board 05 asked for, none of which a source scan can see:
 *
 *  1. D21 — VoiceOver hears "Card N of 5" ONCE. The shipped effect fired on
 *     mount as well as on navigation, which put it on top of the
 *     useFocusOnOpen cursor jump onto card 1's heading and made the app's
 *     first spoken sentence a collision. The sibling replay had a guard for
 *     exactly this; this surface did not.
 *
 *  2. T5, the width rule, MEASURED against the shipped copy rather than
 *     asserted about it. At the recomposition point the column goes full bleed
 *     and the body caps at 2.0; the check below takes the body text that
 *     actually renders, finds its longest word, and asks whether that word fits
 *     the column at the size it will actually be drawn at. Change the copy to
 *     something longer, or raise the cap, and this fails.
 *
 *     Honesty about the model: jest has no layout engine, so the width comes
 *     from a per-character advance UPPER BOUND rather than from real glyph
 *     metrics. 0.55em is comfortably above what a lowercase word in Public Sans
 *     actually takes (the 3XL capture that produced this rule shows
 *     "accessibility" needing ≈0.40em), so the test errs toward failing a
 *     layout that would in fact fit — never toward passing one that shreds. The
 *     real measurement is the simulator at 3XL, in build/05/after/.
 *
 *  3. The composition does not move between cards. Three of the five have no
 *     decline link and one of the five has no Skip, and on the shipped screen
 *     each of those absences slid everything above it — ~60pt between cards 2
 *     and 3, and again the moment a permission flipped to granted.
 */

import React from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import useWindowDimensions from 'react-native/Libraries/Utilities/useWindowDimensions';
import * as Location from 'expo-location';
import OnboardingCards, {
  ONBOARDING_BODY_MAX_FONT_SCALE,
  ONBOARDING_TITLE_MAX_FONT_SCALE,
} from '@/components/OnboardingCards';
import { spacing } from '@/theme';

// The component reads `fontScale` to decide whether to recompose, so the
// recomposition point has to be drivable. Mocking the hook module directly
// (rather than the whole of react-native) keeps every other RN export real —
// the styles asserted on below are flattened by the real StyleSheet.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })),
}));
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
// Permission lookups never settle here, deliberately. This suite is about
// layout, announcement and the funnel; a settling lookup would land a state
// update outside act() on every card and drown the run in warnings. It also
// models the state the CARDS have to survive honestly: "checking", where the
// primary button is inert and the decline link is the only way forward.
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(() => new Promise(() => {})),
  requestForegroundPermissionsAsync: jest.fn(() => new Promise(() => {})),
}));
jest.mock('@/lib/pushNotifications', () => ({
  getNotificationPermission: jest.fn(() => new Promise(() => {})),
  requestNotificationPermission: jest.fn(() => new Promise(() => {})),
}));
jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

const mockWindow = useWindowDimensions as unknown as jest.Mock;
const mockRequestLocation = Location.requestForegroundPermissionsAsync as jest.Mock;
const WIDTH = 390;
const setFontScale = (fontScale: number) =>
  mockWindow.mockReturnValue({ width: WIDTH, height: 844, scale: 3, fontScale });

/**
 * An UPPER bound on the width of one lowercase character, as a fraction of the
 * font size. See the header: this is deliberately generous.
 */
const ADVANCE_EM = 0.55;

beforeEach(() => {
  jest.clearAllMocks();
  setFontScale(1);
});

/** Every <Text> the surface renders, outermost first. */
const textsOf = () => render(<OnboardingCards onDone={jest.fn()} />).UNSAFE_getAllByType(Text);

/** The five card bodies: the 17pt run, one per page of the pager. */
const bodiesOf = () =>
  textsOf().filter((t) => StyleSheet.flatten(t.props.style)?.fontSize === 17);

/**
 * Walk to card `n` the way a user without an OS dialog can. The permission
 * cards' primary button is deliberately inert while the no-prompt status lookup
 * is in flight (so the label cannot flip under a finger), and in a test that
 * promise never settles, so the decline link is the honest path forward — it is
 * the one control on those cards that is never gated.
 */
function toCard(u: ReturnType<typeof render>, n: number) {
  for (let i = 1; i < n; i++) {
    const next = u.queryByLabelText(new RegExp(`^Next\\. Card ${i} of 5\\.$`));
    fireEvent.press(next ?? u.getByLabelText('Not now'));
  }
}

describe('D21 — the first thing VoiceOver says is said once', () => {
  let announce: jest.SpyInstance;
  beforeEach(() => {
    announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
  });
  afterEach(() => announce.mockRestore());

  it('mounts SILENT — the focus jump onto card 1 is the announcement', () => {
    render(<OnboardingCards onDone={jest.fn()} />);
    expect(announce).not.toHaveBeenCalled();
  });

  it('announces exactly once per genuine card change', () => {
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    fireEvent.press(u.getByLabelText('Next. Card 1 of 5.'));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('Card 2 of 5');
    fireEvent.press(u.getByLabelText('Next. Card 2 of 5.'));
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith('Card 3 of 5');
  });

  it('going back announces the card arrived at, not the one left', () => {
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    fireEvent.press(u.getByLabelText('Next. Card 1 of 5.'));
    announce.mockClear();
    fireEvent.press(u.getByLabelText('Back to card 1 of 5'));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('Card 1 of 5');
  });
});

describe('T5 — no word breaks mid-word at the largest size the app supports', () => {
  it('the body caps at the width-derived multiplier, not at the system scale', () => {
    setFontScale(2.35);
    for (const body of bodiesOf()) {
      expect(body.props.maxFontSizeMultiplier).toBe(ONBOARDING_BODY_MAX_FONT_SCALE);
    }
  });

  it('the heading is capped ABOVE the body it labels (T3 does not invert here)', () => {
    setFontScale(2.35);
    expect(ONBOARDING_TITLE_MAX_FONT_SCALE).toBeGreaterThan(0);
    const titles = textsOf().filter(
      (t) => StyleSheet.flatten(t.props.style)?.fontSize === 34,
    );
    expect(titles).toHaveLength(5);
    for (const title of titles) {
      expect(title.props.maxFontSizeMultiplier).toBe(ONBOARDING_TITLE_MAX_FONT_SCALE);
      // 34 x 1.6 = 54.4 against the body's 17 x 2.0 = 34. The heading stays the
      // biggest thing on the screen at every size, which is the whole of T3.
      expect(34 * ONBOARDING_TITLE_MAX_FONT_SCALE).toBeGreaterThan(
        17 * ONBOARDING_BODY_MAX_FONT_SCALE,
      );
    }
  });

  it('the widened column is what the cap was derived from', () => {
    // Widen FIRST (T5). The assertion has to see the full-bleed padding
    // REACHING the node, not merely present in the StyleSheet — a dropped entry
    // in a style array is exactly the kind of miss a source scan cannot catch.
    const columnPad = (fontScale: number) => {
      setFontScale(fontScale);
      const u = render(<OnboardingCards onDone={jest.fn()} />);
      const pages = u.UNSAFE_getAllByType(ScrollView).filter((v) =>
        StyleSheet.flatten(v.props.contentContainerStyle)?.justifyContent !== undefined,
      );
      expect(pages).toHaveLength(5);
      return StyleSheet.flatten(pages[0]!.props.contentContainerStyle);
    };

    const narrow = columnPad(1);
    expect(narrow.paddingHorizontal).toBe(spacing.xxl);
    expect(narrow.justifyContent).toBe('flex-end'); // copy anchored to the bottom

    const wide = columnPad(2.35);
    expect(wide.paddingHorizontal).toBe(spacing.lg); // ~358pt on a 390pt screen
    expect(wide.justifyContent).toBe('flex-start'); // hero moves to the top
  });

  it('every shipped body word fits the full-bleed column at its rendered size', () => {
    setFontScale(2.35);
    const column = WIDTH - 2 * spacing.lg; // heroWide gives the padding back
    for (const body of bodiesOf()) {
      const text = String(body.props.children);
      const size = 17 * ONBOARDING_BODY_MAX_FONT_SCALE;
      const longest = text
        .split(/\s+/)
        .map((w) => w.replace(/[(),.?]/g, ''))
        .reduce((a, w) => (w.length > a.length ? w : a), '');
      expect(longest.length * size * ADVANCE_EM).toBeLessThanOrEqual(column);
    }
  });

  it('"accessibility" is actually in the copy, or the check above is vacuous', () => {
    const words = bodiesOf().map((b) => String(b.props.children)).join(' ');
    expect(words).toContain('accessibility');
  });
});

describe('F4 — the recomposition, and a composition that holds still', () => {
  it('the CTA stacks and the primary gives up its fixed width at >=1.5x', () => {
    setFontScale(1);
    const at1 = render(<OnboardingCards onDone={jest.fn()} />);
    const narrow = StyleSheet.flatten(at1.getByLabelText('Next. Card 1 of 5.').props.style);
    expect(narrow.width).toBe(200);

    setFontScale(2.35);
    const atAx = render(<OnboardingCards onDone={jest.fn()} />);
    const wide = StyleSheet.flatten(atAx.getByLabelText('Next. Card 1 of 5.').props.style);
    expect(wide.width).toBeUndefined();
    expect(wide.alignSelf).toBe('stretch');
  });

  it('the five stones stay inside the column at every size', () => {
    // The teaching moment is that all five are visible AT ONCE, so the row is
    // width-bound. This is the arithmetic that decides the disc size, checked
    // at the three sizes the acceptance walk uses.
    for (const [fontScale, pad] of [
      [1, spacing.xxl],
      [1.4, spacing.xxl],
      [2.35, spacing.lg],
    ] as const) {
      setFontScale(fontScale);
      const u = render(<OnboardingCards onDone={jest.fn()} />);
      const row = u.getByLabelText(/^Severity scale/);
      const discs = row.props.children;
      expect(discs).toHaveLength(5);
      const column = WIDTH - 2 * pad;
      // Each disc is a square View whose width reaches the node.
      const widths = u.UNSAFE_getAllByType(Text)
        .filter((t) => ['1', '2', '3', '4', '5'].includes(String(t.props.children)))
        .map((t) => StyleSheet.flatten(t.props.style)?.fontSize ?? 0);
      expect(widths).toHaveLength(5);
      // digit = round(size * 20/48), so size = digit * 48/20; five of them plus
      // four gaps must fit.
      const size = Math.round((widths[0] ?? 0) * (48 / 20));
      expect(size * 5 + 4 * spacing.sm).toBeLessThanOrEqual(column + 5);
    }
  });

  it('the decline slot is reserved on cards that do not use it', () => {
    // Three of five cards have no decline link. If the slot only existed when
    // the link did, everything above it would jump card to card — the ~60pt
    // slide the critic pass caught between cards 2 and 3.
    setFontScale(1);
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    // Card 1 shows no decline…
    expect(u.queryByLabelText('Not now')).toBeNull();
    // …and the slot that would hold one is still in the tree, with its floor.
    const slots = u.UNSAFE_root.findAll(
      (n) => StyleSheet.flatten(n.props?.style)?.minHeight === 44
        && StyleSheet.flatten(n.props?.style)?.paddingHorizontal === spacing.xxl,
    );
    expect(slots.length).toBeGreaterThan(0);
  });

  it('one decline word, and it is the same one on both permission cards (Q12)', () => {
    setFontScale(1);
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    toCard(u, 3);
    // Card 3 (location) declines with…
    expect(u.getByLabelText('Not now')).toBeTruthy();
    fireEvent.press(u.getByLabelText('Not now'));
    // …and card 4 (notifications) declines with the same word, where it used to
    // say "Maybe later" for the identical gesture.
    expect(u.getByLabelText('Not now')).toBeTruthy();
    expect(u.queryByText('Maybe later')).toBeNull();
  });

  it('Skip is gone from the finisher, where there is nothing left to skip', () => {
    setFontScale(1);
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    expect(u.getByLabelText('Skip the tutorial')).toBeTruthy();
    toCard(u, 5);
    expect(u.getByLabelText('Continue')).toBeTruthy();
    expect(u.queryByLabelText('Skip the tutorial')).toBeNull();
  });
});

describe('analytics parity with the replay (the consequential flow reported nothing)', () => {
  const events = () => jest.requireMock('@/lib/analytics').trackEvent as jest.Mock;

  it('skip fires, tagged with the card the user left from', () => {
    setFontScale(1);
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    fireEvent.press(u.getByLabelText('Next. Card 1 of 5.'));
    fireEvent.press(u.getByLabelText('Skip the tutorial'));
    expect(events()).toHaveBeenCalledWith('onboarding_skipped', {
      platform: expect.any(String),
      card: 2,
    });
  });

  it('complete fires from the finisher', () => {
    setFontScale(1);
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    toCard(u, 5);
    fireEvent.press(u.getByLabelText('Continue'));
    expect(events()).toHaveBeenCalledWith('onboarding_completed', {
      platform: expect.any(String),
    });
  });

  it('a declined permission is an OUTCOME, not silence', () => {
    // The funnel question this surface could never answer: of the users who
    // reach the location card, how many say no here rather than to the OS?
    setFontScale(1);
    const u = render(<OnboardingCards onDone={jest.fn()} />);
    toCard(u, 3);
    fireEvent.press(u.getByLabelText('Not now'));
    expect(events()).toHaveBeenCalledWith('onboarding_permission', {
      permission: 'location',
      outcome: 'declined',
      platform: expect.any(String),
    });
  });

  it('Not now never requests location, including through the remaining onboarding flow', () => {
    setFontScale(1);
    const onDone = jest.fn();
    const u = render(<OnboardingCards onDone={onDone} />);
    toCard(u, 3);

    fireEvent.press(u.getByLabelText('Not now'));
    expect(mockRequestLocation).not.toHaveBeenCalled();

    // Card 4 is the unrelated notification decision; card 5 is the finisher.
    // Neither may retroactively turn the location deferral into an OS request.
    fireEvent.press(u.getByLabelText('Not now'));
    fireEvent.press(u.getByLabelText('Continue'));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockRequestLocation).not.toHaveBeenCalled();
  });

  it('and onDone still runs on every exit path (the gate is one-way)', () => {
    setFontScale(1);
    const onDone = jest.fn();
    const u = render(<OnboardingCards onDone={onDone} />);
    fireEvent.press(u.getByLabelText('Skip the tutorial'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
