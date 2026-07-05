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
      glassLite={false}
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
    const summary = getByRole('button', {
      name: 'Blocked path, severity 4, open. Tap to view on map.',
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

describe('FlagCard — material modes (the C-lite runtime switch)', () => {
  it('full glass mounts the row BlurView; glassLite swaps to the engineered gradient', () => {
    const full = renderCard();
    expect(full.queryByTestId('glass-blurview')).toBeTruthy();
    full.unmount();
    const lite = renderCard({ glassLite: true });
    expect(lite.queryByTestId('glass-blurview')).toBeNull();
    expect(lite.queryByTestId('glass-lite-gradient')).toBeTruthy();
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
