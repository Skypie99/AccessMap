/**
 * TaskCard composition pin — RE-PINNED 2026-08-21 (art-direction Phase 2a).
 *
 * ─── WHAT CHANGED, AND WHY THIS IS NOT A DIFF MADE TO PASS ────────────────
 * The old contract (Material Lab §8, 2026-07-03) locked SIX elements:
 * SeverityBadge · title · StatusBadge · 2-line description · meta line ·
 * tiered action row. Four of those six are deliberately gone:
 *
 *   the amber SeverityBadge   retired app-wide (Q20). Severity is a disc and a
 *                             word inside the census sentence, so the colour is
 *                             drawn once per object (C2).
 *   the StatusBadge           status is a WORD inside a flag object, not a pill
 *                             (C3). The pill survives where status is the
 *                             SUBJECT — filters, history, admin.
 *   the 2-line clamp          three lines below the recomposition point and
 *                             uncapped above it; never two (T4).
 *   the meta line             absorbed into the census, which now carries
 *                             severity, word, status, distance, walk and age in
 *                             one sentence in one order (F2).
 *
 * The action row is re-ranked rather than removed (F3): one filled verb, its
 * siblings inside one ghost segmented control, and Details demoted from a
 * fourth pill to a text link, because it is navigation and not a verb.
 *
 * ─── WHAT DID NOT CHANGE, AND IS PINNED HARDER BECAUSE OF IT ──────────────
 * Every handler, every accessible name, every hint, and S13's structure — the
 * card is not one accessible leaf, the header is the labelled summary node with
 * the button/checkbox role fork, and each action stays independently reachable.
 * The whole risk of moving a card's insides into a shared component is that the
 * outside moves with them, so those are asserted first and by literal.
 *
 * The component is `TaskCard` now. It was called `FlagCard`, which is the name
 * the shared drawing in components/ui took; two FlagCards in one screen, one of
 * them glass and selection and a lightbox and the other a disc and a sentence,
 * is a name collision waiting to be read wrong.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import useWindowDimensions from 'react-native/Libraries/Utilities/useWindowDimensions';
import { render, fireEvent } from '@testing-library/react-native';
import type { FlagRow } from '@/types/database';
import { color } from '@/theme';
// jest.mock calls below are hoisted above this import at runtime, so the
// tagged stubs still apply to everything TasksScreen pulls in.
import { TaskCard, isCompactLayout } from '../TasksScreen';

// ---------------------------------------------------------------------------
// Mocks (registered before the screen module loads) — the GlassSurface.test
// patterns: tagged material stubs + real light palette + a11y hooks off.
// ---------------------------------------------------------------------------
// RN's jest Dimensions stub does not report a 1.0 fontScale, and the card
// changes shape at 1.5 — so the scale has to be stated rather than inherited,
// or every assertion below would be testing whichever branch the stub happened
// to land in.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })),
}));
jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    BlurView: (props: Record<string, unknown>) =>
      ReactActual.createElement(RNView, { testID: 'glass-blurview', ...props }),
  };
});
jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: Record<string, unknown>) =>
      ReactActual.createElement(RNView, { testID: 'glass-lite-gradient', ...props }),
  };
});
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/lib/accessibility', () => ({
  useReduceTransparency: jest.fn(() => false),
  useReducedMotion: jest.fn(() => false),
  useScreenReader: jest.fn(() => false),
  useFocusOnOpen: jest.fn(),
  decorativeProps: { accessible: false, importantForAccessibility: 'no-hide-descendants' },
  // S9: real helper — emits accessibilityState + flat aria-* (the card calls it).
  a11yToggle: jest.requireActual('@/lib/accessibility').a11yToggle,
  // Real too: the shared FlagCard asks it where the recomposition point is, and
  // a stub would silently pin whichever branch the stub returned.
  isAxRecompose: jest.requireActual('@/lib/accessibility').isAxRecompose,
}));

// created_at is kept a few days in the PAST relative to the test run so the meta
// line always renders a "Xd ago" relative string. relativeTime() caps at
// "30d ago" and then falls back to an absolute locale date (relativeTime.ts:31);
// a hardcoded fixture date silently rotted past that 30-day cap and broke the
// `/ago$/` assertion below once >30 days had elapsed since it was written.
// A dynamic recent date is time-stable and needs no fake timers. 3 days lands
// squarely in the days tier ("3d ago"), well clear of the hours tier (<24h) and
// the 30-day absolute-date cutoff.
const RECENT_CREATED_AT = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

const baseFlag: FlagRow = {
  id: 'flag-1',
  lat: 49.89,
  lng: -119.49,
  category: 'blocked_path',
  severity: 4,
  description: 'Construction barriers fully block the sidewalk.',
  photo_url: null,
  status: 'open',
  user_id: 'user-9',
  created_at: RECENT_CREATED_AT,
} as FlagRow;

const mockWindow = useWindowDimensions as unknown as jest.Mock;
const setFontScale = (fontScale: number) =>
  mockWindow.mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });
beforeEach(() => setFontScale(1));

function renderCard(overrides: Partial<React.ComponentProps<typeof TaskCard>> = {}) {
  const handlers = {
    onPress: jest.fn(),
    onLongPress: jest.fn(),
    onSetStatus: jest.fn(),
    onShowDetails: jest.fn(),
  };
  const utils = render(
    <TaskCard
      flag={baseFlag}
      isBusy={false}
      isOwn={false}
      userLocation={null}
      selectionActive={false}
      selected={false}
      compactActions={false}
      {...handlers}
      {...overrides}
    />,
  );
  return { ...utils, handlers };
}

describe('TaskCard — the composition, re-ranked (F1/F2/F3)', () => {
  it('renders disc, title, census, description and the action row', () => {
    const { getByText } = renderCard();
    expect(getByText('Blocked path')).toBeTruthy(); // category title
    // The census: severity, word, status, then whatever the host appends —
    // one sentence in one order, where five objects used to sit.
    expect(getByText(/^Severity 4 · Significant · Open · .+ ago$/)).toBeTruthy();
    expect(getByText('Construction barriers fully block the sidewalk.')).toBeTruthy();
    for (const label of ['Verify', 'Resolved', 'Reject', 'Details']) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('draws no severity pill and no status pill (C2 / C3)', () => {
    const { queryByText, queryByLabelText } = renderCard();
    // The retired badges each announced themselves; nothing does now except the
    // card's own summary node.
    expect(queryByLabelText('Severity 4: Significant')).toBeNull();
    expect(queryByLabelText('Flag status: Open')).toBeNull();
    // "Open" survives only inside the census sentence, never as its own node.
    expect(queryByText('Open')).toBeNull();
  });

  it('clamps the description to THREE lines, and never to two', () => {
    // Two lines is the clamp that cut two thirds of a reporter's sentence off
    // the screen at large type (T4). Three is the card density's rule.
    const { getByText } = renderCard();
    expect(getByText('Construction barriers fully block the sidewalk.').props.numberOfLines).toBe(3);
  });

  it('uncaps the description at the recomposition point', () => {
    setFontScale(1.5);
    const { getByText } = renderCard();
    expect(
      getByText('Construction barriers fully block the sidewalk.').props.numberOfLines,
    ).toBeUndefined();
  });

  it('puts the distance in the census, in mono, when a location has resolved', () => {
    const { UNSAFE_getAllByType } = renderCard({ userLocation: { lat: 49.9, lng: -119.5 } });
    const mono = UNSAFE_getAllByType(Text).filter(
      (n) => StyleSheet.flatten(n.props.style)?.fontVariant?.[0] === 'tabular-nums',
    );
    expect(mono).toHaveLength(1);
  });
});

describe('TaskCard — F3: one filled verb, one segmented pair, one link', () => {
  /** Action labels whose ink is white-on-brand, i.e. the filled ones. */
  const filledLabels = (utils: ReturnType<typeof renderCard>) =>
    utils.UNSAFE_getAllByType(Text)
      .filter((n) => StyleSheet.flatten(n.props.style)?.color === color.textOnBrand)
      .map((n) => n.props.children);

  it('exactly one control in the card is filled — and it is the lead verb', () => {
    // The 8-question gate, question 6. Before this the row filled Verify AND
    // gave Resolved a neutral fill, so two of four controls were painted.
    expect(filledLabels(renderCard())).toEqual(['Verify']);
  });

  it('when Verify is spent, the lead is Resolved — still exactly one fill', () => {
    const utils = renderCard({ flag: { ...baseFlag, status: 'verified' } as FlagRow });
    expect(utils.queryByText('Verify')).toBeNull();
    expect(filledLabels(utils)).toEqual(['Resolved']);
  });

  it('the siblings share ONE ghost container, which draws the only hairline', () => {
    const { getByTestId, getByText } = renderCard();
    const container = StyleSheet.flatten(getByTestId('card-actions-segmented').props.style);
    // The container owns the border and clips the ends, which is what makes two
    // square cells read as one object rather than as two ghost buttons.
    expect(container.borderWidth).toBe(1);
    expect(container.borderColor).toBe(color.glassGhostEdge);
    expect(container.overflow).toBe('hidden');

    // The cells paint nothing but the divider. Climb from the label to the
    // element that actually carries the control box, rather than assuming
    // `parent` is it — PressableScale renders an Animated wrapper of its own,
    // so a fixed hop lands on a node with no style and every assertion below
    // would compare against `undefined` and pass for the wrong reason.
    const cell = (label: string) => {
      let node: { props?: { style?: unknown }; parent?: unknown } | null = getByText(label) as never;
      for (let i = 0; i < 6 && node; i++) {
        const flat = StyleSheet.flatten(node.props?.style as never) as Record<string, unknown>;
        if (flat && flat.minHeight === 44) return flat;
        node = node.parent as never;
      }
      throw new Error(`no 44pt control box found above "${label}"`);
    };
    expect(cell('Resolved').backgroundColor).toBe('transparent');
    expect(cell('Resolved').borderRadius).toBe(0);
    expect(cell('Resolved').borderLeftWidth).toBeUndefined();
    // Only the SECOND cell carries the divider, or the pair would draw a stray
    // line against the container's own left edge.
    expect(cell('Reject').borderLeftWidth).toBe(1);
    // Both still clear the 44pt floor on their own.
    for (const label of ['Resolved', 'Reject']) {
      expect(cell(label).minHeight).toBe(44);
    }
  });

  it('a lone sibling draws no divider (the already-verified card)', () => {
    const { getByText } = renderCard({ flag: { ...baseFlag, status: 'verified' } as FlagRow });
    const reject = StyleSheet.flatten(getByText('Reject').parent?.props.style);
    expect(reject.borderLeftWidth).toBeUndefined();
  });

  it('Details is a link, not a fourth pill', () => {
    const { getByText } = renderCard();
    const style = StyleSheet.flatten(getByText('Details').props.style);
    // inkSelect, the same ink every other text link on this screen carries.
    expect(style.color).toBe(color.inkSelect);
    expect(style.color).not.toBe(color.inkDetailsGhost);
  });
});

describe('TaskCard — the action row reflow', () => {
  it('open flag, default layout → the single row', () => {
    const { getByTestId, queryByTestId } = renderCard();
    expect(getByTestId('card-actions-row')).toBeTruthy();
    expect(queryByTestId('card-actions-stack')).toBeNull();
  });

  it('compactActions → everything stacks full-width', () => {
    const { getByTestId } = renderCard({ compactActions: true });
    expect(getByTestId('card-actions-stack')).toBeTruthy();
  });
});

describe('TaskCard — handler wiring (byte-identical behavior)', () => {
  it("Verify → onSetStatus(id, 'verified', isOwn)", () => {
    const { getByText, handlers } = renderCard({ isOwn: true });
    fireEvent.press(getByText('Verify'));
    expect(handlers.onSetStatus).toHaveBeenCalledWith('flag-1', 'verified', true);
  });

  it("Resolved → onSetStatus(id, 'resolved', isOwn)", () => {
    const { getByText, handlers } = renderCard();
    fireEvent.press(getByText('Resolved'));
    expect(handlers.onSetStatus).toHaveBeenCalledWith('flag-1', 'resolved', false);
  });

  it("Reject → onSetStatus(id, 'rejected', isOwn) — confirmation lives upstream in setStatus", () => {
    const { getByText, handlers } = renderCard();
    fireEvent.press(getByText('Reject'));
    expect(handlers.onSetStatus).toHaveBeenCalledWith('flag-1', 'rejected', false);
  });

  it('Details → onShowDetails(flag)', () => {
    const { getByText, handlers } = renderCard();
    fireEvent.press(getByText('Details'));
    expect(handlers.onShowDetails).toHaveBeenCalledWith(baseFlag);
  });

  it('card tap → onPress(flag); long-press → onLongPress(flag)', () => {
    const { getByText, handlers } = renderCard();
    const title = getByText('Blocked path');
    fireEvent.press(title);
    expect(handlers.onPress).toHaveBeenCalledWith(baseFlag);
    fireEvent(title, 'longPress');
    expect(handlers.onLongPress).toHaveBeenCalledWith(baseFlag);
  });
});

describe('TaskCard — selection mode', () => {
  it('becomes a checkbox with checked state and hides the per-card actions', () => {
    const { queryByText, getByRole } = renderCard({ selectionActive: true, selected: true });
    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState).toMatchObject({ checked: true });
    expect(queryByText('Verify')).toBeNull();
    expect(queryByText('Details')).toBeNull();
  });
});

// S13 (L6-04): the card is no longer a single accessible leaf that swallows its
// action buttons. The header is a labeled SUMMARY node (button/checkbox) and each
// action is independently reachable. (Native VoiceOver focus order is the D1
// device check; these pin the structural contract on the web/JS renderer.)
describe('TaskCard — S13: actions are not trapped in an accessible parent', () => {
  it('exposes a labeled header summary as the card button (severity · category · status)', () => {
    const { getByRole } = renderCard();
    // T8 (F4-02): the card speaks the taught severity/status grammar via the
    // a11yText helpers ("severity 4 of 5, Significant, status Open"), not the
    // raw enums ("severity 4, open" — where a screen reader hears the status
    // like a verb).
    const summary = getByRole('button', {
      name: 'Blocked path, severity 4 of 5, Significant, status Open. Tap to view on map.',
    });
    expect(summary).toBeTruthy();
    // a11yToggle keeps the nested accessibilityState AND emits the flat web alias.
    expect(summary.props['aria-disabled']).toBe(false);
  });

  it('a tap on an action fires ONLY that action — the card open handler is not also triggered', () => {
    const { getByText, handlers } = renderCard();
    fireEvent.press(getByText('Verify'));
    expect(handlers.onSetStatus).toHaveBeenCalledWith('flag-1', 'verified', false);
    expect(handlers.onPress).not.toHaveBeenCalled();
  });

  it('the card open handler still fires from the summary/body (tap-anywhere preserved)', () => {
    const { getByText, handlers } = renderCard();
    fireEvent.press(getByText('Blocked path'));
    expect(handlers.onPress).toHaveBeenCalledWith(baseFlag);
    expect(handlers.onSetStatus).not.toHaveBeenCalled();
  });
});

// T8 (F4-08): each triage action names its flag so an SR user swiping a list
// hears WHICH flag each "Verify"/"Reject" acts on — the "'Verify this flag' six
// times in a row with no idea which flag" problem R2 named. Distance rides only
// when a location has resolved (null-guarded on userLocation via distanceInfo).
describe('TaskCard — T8: each action names its flag', () => {
  it('with no location, action labels are category-only (no distance)', () => {
    const { getByLabelText } = renderCard({ userLocation: null });
    expect(getByLabelText('Verify this flag — Blocked path')).toBeTruthy();
    expect(getByLabelText('Reject this flag — Blocked path')).toBeTruthy();
    expect(getByLabelText('View flag details — Blocked path')).toBeTruthy();
  });

  it('with a location, the label carries category THEN distance', () => {
    const { getByLabelText } = renderCard({ userLocation: { lat: 49.9, lng: -119.5 } });
    expect(getByLabelText(/^Verify this flag — Blocked path, .+/)).toBeTruthy();
  });

  it('no action regresses to the bare, flag-less label', () => {
    const { queryByLabelText } = renderCard();
    expect(queryByLabelText('Verify this flag')).toBeNull();
  });
});

describe('TaskCard — full glass (C-lite switch retired 2026-08-12)', () => {
  it('mounts the row BlurView (real liquid glass) by default on iOS', () => {
    // Sky picked `full` app-wide, so the card blurs by default — there is no
    // glassLite prop and no runtime switch to force the engineered path.
    // (glass-lite-gradient is NOT asserted absent: the press-sheen is itself a
    // LinearGradient, now always live since it no longer gates on glassLite.)
    const card = renderCard();
    expect(card.queryByTestId('glass-blurview')).toBeTruthy();
  });
});

describe('isCompactLayout — the M16 reflow threshold (binding ×1.6 check)', () => {
  it.each([
    [375, 1, true], // exactly-375 device stacks (the M16 fix)
    [376, 1, false], // one point wider, default type → single row
    [376, 1.15, true], // large type tips it
    [390, 1.6, true], // ×1.6 Dynamic Type — the hard-gate extreme
    [430, 1.0, false],
  ])('width %d @ fontScale %s → compact=%s', (width, fontScale, expected) => {
    expect(isCompactLayout(width as number, fontScale as number)).toBe(expected);
  });
});

describe('TaskCard — SW-36: the title box must fit its own word', () => {
  // At accessibility-extra-large the sim walk found the category title broken
  // MID-WORD next to the status badge: "Broken sidewal / k". The cause was
  // `flex: 1` on cardTitle — shorthand for grow 1 / shrink 1 / BASIS 0% — which
  // left the title's width purely residual, whatever the two non-shrinking
  // badges beside it did not take, and contributing nothing to the wrap
  // decision. iOS then character-breaks a word wider than its box.
  //
  // flexBasisUnderLargeType.guard.test.ts pins this in the source; this pins
  // the style that actually reaches the rendered node, so a rename or a
  // dropped style array also trips.

  it('the title grows and shrinks but takes its basis from its text', () => {
    const { getByText } = renderCard();
    const style = StyleSheet.flatten(getByText('Blocked path').props.style);

    // Pre-fix: flex === 1.
    expect(style.flex).toBeUndefined();
    expect(style.flexGrow).toBe(1);
    expect(style.flexShrink).toBe(1);
    // Unwritten, so RN's default 'auto' applies and the box measures the text.
    expect(style.flexBasis).toBeUndefined();
  });

  it('the title is not truncated to buy the room instead', () => {
    // The reflex fix for a crushed title is numberOfLines={1}, which
    // dynamicTypeGuard forbids on a *Title style precisely because truncating
    // a title at large type is the defect rather than the remedy. Passes both
    // before and after — it exists to stop a later "simplification".
    const title = renderCard().getByText('Blocked path');
    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.ellipsizeMode).toBeUndefined();
  });
});
