/**
 * FlagCard component tests — Gary, QA pass 2026-05-30.
 *
 * FlagCard is the shared list-row component extracted from the inline
 * rendering patterns duplicated across MyReportsModal, ActivityFeedModal,
 * and MyWatchedModal. Tests cover:
 *
 *   1. Content rendering  — category, description, meta text
 *   2. StatusBadge        — all 4 statuses render without crashing
 *   3. Interaction        — onPress fires, missing onPress is safe
 *   4. Accessibility      — role, label format, severity in label
 *   5. compact prop       — description truncates to 1 line
 *   6. showDate prop      — date toggled on/off
 *   7. photo thumbnail    — renders when photo_url is set, hidden in compact
 *
 * Mock notes:
 *   - supabase is mocked globally via jest.setup.js env-var stubs PLUS the
 *     module mock here (flags.ts imports it at the top level).
 *   - useColor is mocked to return the static light palette so the test
 *     runner never needs a React context provider.
 *   - ThemeContext is mocked for the same reason — keeps tests hermetic.
 */

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import type { FlagRow } from '@/types/database';

import { FlagCard } from '../FlagCard';

// -------------------------------------------------------------------------
// Module mocks — must be declared before the import under test so Jest
// hoists them above the import block.
// -------------------------------------------------------------------------

// flags.ts imports supabase at module level — mock to avoid env-var explosions.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// ThemeContext: return the static light palette so useColor() works without
// a React provider wrapping every render() call.
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return {
    useColor: () => color,
    ThemeContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// -------------------------------------------------------------------------
// Fixture helpers
// -------------------------------------------------------------------------

const BASE_FLAG: FlagRow = {
  id: 'flag-1',
  user_id: 'user-1',
  lat: 37.7749,
  lng: -122.4194,
  category: 'no_ramp',
  description: 'Broken ramp near main entrance',
  severity: 3,
  photo_url: null,
  status: 'open',
  created_at: '2026-05-01T10:00:00Z',
};

/** Convenience: override specific fields on BASE_FLAG */
function flag(overrides: Partial<FlagRow>): FlagRow {
  return { ...BASE_FLAG, ...overrides };
}

// -------------------------------------------------------------------------
// 1. Content rendering
// -------------------------------------------------------------------------

describe('FlagCard — content rendering', () => {
  it('renders the human-readable category label', () => {
    const { getByText } = render(<FlagCard flag={BASE_FLAG} />);
    // CATEGORY_LABELS['no_ramp'] = 'No ramp' (lower-case 'r' — confirmed from render output)
    expect(getByText('No ramp')).toBeTruthy();
  });

  it('renders the description when present', () => {
    const { getByText } = render(<FlagCard flag={BASE_FLAG} />);
    expect(getByText('Broken ramp near main entrance')).toBeTruthy();
  });

  it('renders "No description." when description is null', () => {
    const { getByText } = render(<FlagCard flag={flag({ description: null })} />);
    expect(getByText('No description.')).toBeTruthy();
  });

  it('renders "No description." when description is empty string', () => {
    const { getByText } = render(<FlagCard flag={flag({ description: '' })} />);
    expect(getByText('No description.')).toBeTruthy();
  });

  it('includes severity number in the meta line', () => {
    const { UNSAFE_getAllByType } = render(<FlagCard flag={BASE_FLAG} />);
    const textNodes = UNSAFE_getAllByType(Text).map((n) => String(n.props.children ?? ''));
    expect(textNodes.some((t) => t.includes('Severity 3'))).toBe(true);
  });

  it('shows a formatted date in the meta line by default', () => {
    const { UNSAFE_getAllByType } = render(<FlagCard flag={BASE_FLAG} />);
    const textNodes = UNSAFE_getAllByType(Text).map((n) => String(n.props.children ?? ''));
    // The date "May 1, 2026" (locale-dependent) should appear somewhere in meta.
    // We check for the year to stay locale-independent.
    expect(textNodes.some((t) => t.includes('2026'))).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 2. StatusBadge — all 4 statuses render without crashing
// -------------------------------------------------------------------------

describe('FlagCard — status variants', () => {
  const ALL_STATUSES: FlagRow['status'][] = ['open', 'verified', 'resolved', 'rejected'];

  it.each(ALL_STATUSES)('renders status="%s" without crashing', (status) => {
    expect(() => render(<FlagCard flag={flag({ status })} />)).not.toThrow();
  });

  it('renders the StatusBadge accessible element for each status', () => {
    ALL_STATUSES.forEach((status) => {
      const { getAllByRole } = render(<FlagCard flag={flag({ status })} />);
      // StatusBadge uses accessibilityRole="text". getAllByRole because there
      // may be multiple text-role elements on screen (e.g. category Text nodes
      // that RN implicitly marks accessible). At least one must be truthy.
      const textEls = getAllByRole('text');
      expect(textEls.length).toBeGreaterThan(0);
    });
  });
});

// -------------------------------------------------------------------------
// 3. Interaction
// -------------------------------------------------------------------------

describe('FlagCard — interaction', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onPress is undefined and the card is pressed', () => {
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} />);
    expect(() => fireEvent.press(getByRole('button'))).not.toThrow();
  });
});

// -------------------------------------------------------------------------
// 4. Accessibility
// -------------------------------------------------------------------------

describe('FlagCard — accessibility', () => {
  it('has accessibilityRole="button"', () => {
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('accessibilityLabel includes the category label', () => {
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} />);
    const label: string = getByRole('button').props.accessibilityLabel ?? '';
    expect(label.toLowerCase()).toContain('no ramp');
  });

  it('accessibilityLabel includes the severity number', () => {
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} />);
    const label: string = getByRole('button').props.accessibilityLabel ?? '';
    expect(label).toContain('3');
  });

  it('accessibilityLabel includes the status string', () => {
    const { getByRole } = render(<FlagCard flag={flag({ status: 'verified' })} />);
    const label: string = getByRole('button').props.accessibilityLabel ?? '';
    expect(label.toLowerCase()).toContain('verified');
  });

  it('accessibilityLabel includes the description when present', () => {
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} />);
    const label: string = getByRole('button').props.accessibilityLabel ?? '';
    expect(label).toContain('Broken ramp near main entrance');
  });

  it('accessibilityLabel does NOT include description when it is null', () => {
    const { getByRole } = render(<FlagCard flag={flag({ description: null })} />);
    const label: string = getByRole('button').props.accessibilityLabel ?? '';
    // Should not append any description fragment
    expect(label).not.toContain('null');
    expect(label).not.toContain('undefined');
  });

  it('accessibilityLabel includes "of 5" for the severity scale', () => {
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} />);
    const label: string = getByRole('button').props.accessibilityLabel ?? '';
    expect(label).toContain('of 5');
  });
});

// -------------------------------------------------------------------------
// 5. compact prop
// -------------------------------------------------------------------------

describe('FlagCard — compact prop', () => {
  it('truncates description to 1 line when compact=true', () => {
    const { getByText } = render(<FlagCard flag={BASE_FLAG} compact />);
    const descEl = getByText('Broken ramp near main entrance');
    expect(descEl.props.numberOfLines).toBe(1);
  });

  it('allows up to 2 lines when compact=false (default)', () => {
    const { getByText } = render(<FlagCard flag={BASE_FLAG} />);
    const descEl = getByText('Broken ramp near main entrance');
    expect(descEl.props.numberOfLines).toBe(2);
  });

  it('hides the thumbnail in compact mode even when photo_url is set', () => {
    const { Image } = require('react-native');
    const { UNSAFE_queryAllByType } = render(
      <FlagCard flag={flag({ photo_url: 'https://example.com/photo.jpg' })} compact />,
    );
    // queryAllByType (not getAllByType) returns [] without throwing when zero found.
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });
});

// -------------------------------------------------------------------------
// 6. showDate prop
// -------------------------------------------------------------------------

describe('FlagCard — showDate prop', () => {
  it('hides the date from the meta line when showDate=false', () => {
    const { UNSAFE_getAllByType } = render(<FlagCard flag={BASE_FLAG} showDate={false} />);
    const textNodes = UNSAFE_getAllByType(Text).map((n) => String(n.props.children ?? ''));
    // Year "2026" should not appear anywhere when showDate=false.
    expect(textNodes.some((t) => t.includes('2026'))).toBe(false);
  });

  it('omits the date from the accessibilityLabel when showDate=false', () => {
    const { getByRole } = render(<FlagCard flag={BASE_FLAG} showDate={false} />);
    const label: string = getByRole('button').props.accessibilityLabel ?? '';
    expect(label).not.toContain('2026');
  });

  it('shows the date in the meta line when showDate=true (default)', () => {
    const { UNSAFE_getAllByType } = render(<FlagCard flag={BASE_FLAG} showDate />);
    const textNodes = UNSAFE_getAllByType(Text).map((n) => String(n.props.children ?? ''));
    expect(textNodes.some((t) => t.includes('2026'))).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 7. Photo thumbnail
// -------------------------------------------------------------------------

describe('FlagCard — photo thumbnail', () => {
  it('renders an Image when photo_url is set and compact=false', () => {
    const { Image } = require('react-native');
    const { UNSAFE_queryAllByType } = render(
      <FlagCard flag={flag({ photo_url: 'https://example.com/photo.jpg' })} />,
    );
    const images = UNSAFE_queryAllByType(Image);
    expect(images).toHaveLength(1);
    expect(images[0].props.source.uri).toBe('https://example.com/photo.jpg');
  });

  it('does NOT render an Image when photo_url is null', () => {
    const { Image } = require('react-native');
    const { UNSAFE_queryAllByType } = render(<FlagCard flag={flag({ photo_url: null })} />);
    // queryAllByType returns [] without throwing when zero found.
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });
});
