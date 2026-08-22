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
import { Text } from 'react-native';
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
