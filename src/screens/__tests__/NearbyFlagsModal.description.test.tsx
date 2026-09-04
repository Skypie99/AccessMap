/**
 * Nearby list — the reporter's sentence never truncates (defect D2, rule T4).
 *
 * The Nearby list is the map's accessible equal: screen-reader users are
 * auto-steered to it, and large-type users reach for it because the map's
 * callouts are the hardest thing on the screen to read. It carried
 * `numberOfLines={2}` on the description, so at accessibility-extra-large the
 * ONE surface built for those users showed a third of the sentence and an
 * ellipsis — "Bollard spacing is too narrow for a…"
 * (design-reviews/art-direction/2026-08-21/captures/17e_light_axl_C6_nearby.png).
 *
 * jest cannot render at 3x system font, so what is pinned here is the PROPERTY
 * that produced the clip: no line cap and no ellipsize mode on the description
 * node, with the full string still in the tree. The visual proof is the
 * simulator walk at AXL.
 */
import React from 'react';
import { FlatList, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import NearbyFlagsModal from '../NearbyFlagsModal';
import type { FlagRow } from '@/types/database';

jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(() => 4242),
}));

// The real sentence from the AXL capture — the one that lost its second half.
const DESCRIPTION =
  'Bollard spacing is too narrow for a wider wheelchair or a mobility scooter. Confirmed by measurement.';

const flag = {
  id: 'f1',
  lat: 49.888,
  lng: -119.496,
  category: 'blocked_path',
  severity: 2,
  description: DESCRIPTION,
  photo_url: null,
  status: 'verified',
  user_id: 'u1',
  created_at: '2026-08-19T12:00:00.000Z',
} as unknown as FlagRow;

const secondFlag = {
  ...flag,
  id: 'f2',
  category: 'no_ramp',
  description: 'A second flag keeps the search and category controls available.',
} as unknown as FlagRow;

const baseProps = {
  visible: true as const,
  location: null,
  flags: [flag],
  onClose: jest.fn(),
  onSelectFlag: jest.fn(),
};

describe('D2 / T4 — the Nearby card description is never clamped', () => {
  it('renders the whole sentence with no line cap and no ellipsis', () => {
    const { UNSAFE_getAllByType } = render(<NearbyFlagsModal {...baseProps} />);

    const desc = UNSAFE_getAllByType(Text).find((n) => n.props.children === DESCRIPTION);

    // Non-vacuity: if the card stopped rendering the description at all, the
    // two assertions below would pass against `undefined` forever.
    expect(`description node found: ${Boolean(desc)}`).toBe('description node found: true');
    expect(desc?.props.numberOfLines).toBeUndefined();
    expect(desc?.props.ellipsizeMode).toBeUndefined();
  });
});

/**
 * PROTECT-1 — the one-breath row label, pinned across the FlagCard adoption.
 *
 * Phase 2a moved this card's insides into the shared `FlagCard`, and the whole
 * point of the risk was that the OUTSIDE — what a screen-reader user hears —
 * must not move with them. This card's label is not the family's default
 * sentence: it is older, it says "severity 2" rather than "severity 2 of 5",
 * and it carries the reporter's description at the end so the whole card
 * arrives in one breath. That is a deliberate difference, so it is pinned as a
 * literal here rather than composed from the same helpers it would be checked
 * against.
 */
describe('PROTECT-1 — the card speaks in one breath, and the words did not move', () => {
  it('is byte-identical to the sentence that shipped', () => {
    const { getByLabelText } = render(<NearbyFlagsModal {...baseProps} />);
    expect(
      getByLabelText(`Blocked path, severity 2. Status verified. ${DESCRIPTION}`),
    ).toBeTruthy();
  });

  it('the card renders no accessible node of its own to fragment it', () => {
    // FlagCard's header summary node is opt-in precisely so this list can
    // decline it. If it ever arrives here, iOS collapses to the outer node on
    // some paths and to the inner one on others, and the one breath becomes two.
    const { UNSAFE_root } = render(<NearbyFlagsModal {...baseProps} />);
    const labelled = UNSAFE_root
      .findAll((n) => typeof n.type === 'string' && Boolean(n.props.accessibilityLabel))
      .map((n) => n.props.accessibilityLabel);
    expect(labelled.filter((l: string) => l.includes('Blocked path'))).toHaveLength(1);
  });
});

describe('R2-F1 — secondary chrome scrolls with Nearby content', () => {
  it('supplies the notice, search, and category controls through the FlatList header', () => {
    const { UNSAFE_getByType } = render(
      <NearbyFlagsModal {...baseProps} flags={[flag, secondFlag]} />,
    );

    const list = UNSAFE_getByType(FlatList);
    const header = list.props.ListHeaderComponent;

    // The title/Close row stays outside FlatList as recovery chrome. Everything
    // below it is a list header, so it can scroll away at accessibility sizes.
    expect(header).toBeTruthy();

    const headerUtils = render(header);
    expect(headerUtils.getByText('Allow location access to sort flags by distance. Showing the most recent first.')).toBeTruthy();
    expect(headerUtils.getByLabelText('Search flags')).toBeTruthy();
    expect(headerUtils.getByLabelText('Filter by category')).toBeTruthy();
  });
});
