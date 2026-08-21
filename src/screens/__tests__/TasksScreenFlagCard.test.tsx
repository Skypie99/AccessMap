/**
 * FlagCard composition pin — the Tasks glass build's contract item 6
 * (Material Lab §8, 2026-07-03): "FlagCard renders the same locked 6 elements
 * before/after — material-only diff."
 *
 * What this locks in (structural assertions, no snapshot files — project norm):
 *   1. The SIX locked elements render: SeverityBadge ("4 · Significant") ·
 *      category title · StatusBadge · 2-line description · meta line ·
 *      the tiered action row. (The photo is element 6's peer — exercised via
 *      the no-photo path here; photo behavior is data-dependent, not
 *      compositional.)
 *   2. The tiered action row: open flag → Verify leads a single row
 *      (testID card-actions-row); compactActions → the deliberate 2-row stack
 *      (card-actions-stack); verified flag → no Verify, Resolved leads.
 *   3. Handler wiring is BYTE-IDENTICAL in behavior: Verify → onSetStatus(id,
 *      'verified', isOwn) · Resolved → 'resolved' · Reject → 'rejected'
 *      (confirm lives in setStatus, not here) · Details → onShowDetails(flag)
 *      · card tap/long-press → onPress/onLongPress(flag).
 *   4. Selection mode: role checkbox + checked state, per-card actions hidden.
 *   5. isCompactLayout — the M16 reflow threshold, incl. the ×1.6 Dynamic
 *      Type case (the headless stand-in for the web capture's fontScale gap).
 *
 * If a change here is intentional (a NEW ratified composition), update the
 * assertion WITH the design decision — never to make a diff pass.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import type { FlagRow } from '@/types/database';
// jest.mock calls below are hoisted above this import at runtime, so the
// tagged stubs still apply to everything TasksScreen pulls in.
import { FlagCard, isCompactLayout } from '../TasksScreen';

// ---------------------------------------------------------------------------
// Mocks (registered before the screen module loads) — the GlassSurface.test
// patterns: tagged material stubs + real light palette + a11y hooks off.
// ---------------------------------------------------------------------------
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

function renderCard(overrides: Partial<React.ComponentProps<typeof FlagCard>> = {}) {
  const handlers = {
    onPress: jest.fn(),
    onLongPress: jest.fn(),
    onSetStatus: jest.fn(),
    onShowDetails: jest.fn(),
  };
  const utils = render(
    <FlagCard
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

describe('FlagCard — the locked 6-element composition', () => {
  it('renders severity badge, title, status badge, description, meta, and actions', () => {
    const { getByText, getByLabelText } = renderCard();
    // SeverityBadge: number + word ("4 · Significant" — the number and label
    // are sibling text nodes, so assert via its accessibility label).
    expect(getByLabelText('Severity 4: Significant')).toBeTruthy();
    expect(getByText(/Significant/)).toBeTruthy();
    expect(getByText('Blocked path')).toBeTruthy(); // category title
    expect(getByText('Open')).toBeTruthy(); // StatusBadge
    expect(getByText('Construction barriers fully block the sidewalk.')).toBeTruthy();
    expect(getByText(/ago$/)).toBeTruthy(); // meta line (relative time)
    for (const label of ['Verify', 'Resolved', 'Reject', 'Details']) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('clamps the description to 2 lines (the locked clamp)', () => {
    const { getByText } = renderCard();
    const desc = getByText('Construction barriers fully block the sidewalk.');
    expect(desc.props.numberOfLines).toBe(2);
  });
});

describe('FlagCard — the tiered action row', () => {
  it('open flag, default layout → single tiered row, Verify leads', () => {
    const { getByTestId, queryByTestId } = renderCard();
    expect(getByTestId('card-actions-row')).toBeTruthy();
    expect(queryByTestId('card-actions-stack')).toBeNull();
  });

  it('compactActions → the deliberate 2-row stack (lead full-width + sub-row)', () => {
    const { getByTestId } = renderCard({ compactActions: true });
    expect(getByTestId('card-actions-stack')).toBeTruthy();
  });

  it('verified flag → Verify absent, Resolved leads the row', () => {
    const { queryByText, getByText } = renderCard({
      flag: { ...baseFlag, status: 'verified' } as FlagRow,
    });
    expect(queryByText('Verify')).toBeNull();
    expect(getByText('Resolved')).toBeTruthy();
  });
});

describe('FlagCard — handler wiring (byte-identical behavior)', () => {
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

describe('FlagCard — selection mode', () => {
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
describe('FlagCard — S13: actions are not trapped in an accessible parent', () => {
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
describe('FlagCard — T8: each action names its flag', () => {
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

describe('FlagCard — full glass (C-lite switch retired 2026-08-12)', () => {
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

describe('FlagCard — SW-36: the title box must fit its own word', () => {
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
