/**
 * StatusBadge component tests.
 *
 * Verifies that the shared status pill renders for all four flag statuses,
 * exposes correct accessibility labels, and respects the showLabel prop.
 *
 * flags.ts imports supabase.ts at module level; mock it to keep tests
 * hermetic and avoid "missing env vars" warnings.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../StatusBadge';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

describe('StatusBadge', () => {
  it('renders without crashing for each status', () => {
    (['open', 'verified', 'rejected', 'resolved'] as const).forEach((status) => {
      const { toJSON } = render(<StatusBadge status={status} />);
      expect(toJSON()).not.toBeNull();
    });
  });

  it('has the correct accessibilityLabel for each status', () => {
    const expected = {
      open: 'Flag status: Open',
      verified: 'Flag status: Verified',
      rejected: 'Flag status: Rejected',
      resolved: 'Flag status: Resolved',
    } as const;

    (['open', 'verified', 'rejected', 'resolved'] as const).forEach((status) => {
      const { getByLabelText } = render(<StatusBadge status={status} />);
      expect(getByLabelText(expected[status])).toBeTruthy();
    });
  });

  it('accepts a custom accessibilityLabel override', () => {
    const { getByLabelText } = render(
      <StatusBadge status="open" accessibilityLabel="status Open" />,
    );
    expect(getByLabelText('status Open')).toBeTruthy();
  });

  it('renders the status label text by default (showLabel=true)', () => {
    const { UNSAFE_getAllByType } = render(<StatusBadge status="verified" />);
    const texts = UNSAFE_getAllByType(Text).map((n) => n.props.children as string);
    expect(texts).toContain('Verified');
  });

  it('does not render any text when showLabel=false', () => {
    const { UNSAFE_queryAllByType } = render(
      <StatusBadge status="verified" showLabel={false} />,
    );
    const texts = UNSAFE_queryAllByType(Text);
    expect(texts).toHaveLength(0);
  });

  it('applies accessibilityRole="text" and accessible={true} on the container', () => {
    const { getAllByRole } = render(<StatusBadge status="open" />);
    // Both the outer View and inner Text report role "text". Confirm at least
    // one element with role "text" is present (the badge container).
    const textRoles = getAllByRole('text');
    expect(textRoles.length).toBeGreaterThanOrEqual(1);
    // The outer badge View has accessible={true} explicitly set
    const badgeContainer = textRoles.find((el) => el.props.accessible === true);
    expect(badgeContainer).toBeTruthy();
  });
});
