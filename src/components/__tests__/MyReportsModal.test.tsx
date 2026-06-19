/**
 * MyReportsModal — initialStatus seeding tests.
 *
 * Hardens the `initialStatus?: FlagStatus` prop added in the 2026-06-17
 * overhaul (src/components/MyReportsModal.tsx). When ProfileScreen taps a
 * status-breakdown pill (e.g. "3 verified"), it opens this modal with
 * initialStatus set so the list arrives PRE-FILTERED to that status — the
 * matching filter chip reads `selected` (accessibilityState).
 *
 * What this locks in:
 *   1. With initialStatus='verified', the "Verified" filter chip is selected
 *      on open (and "All" / other chips are not).
 *   2. Without initialStatus, the "All" chip is selected (existing default).
 *   3. The seeding re-applies when the modal is re-opened with a new
 *      initialStatus (the useEffect keys on [visible, initialStatus]).
 *
 * The status filter chips only render when the user's reports span more than
 * one status (presentStatuses.length > 1), so the fixture feeds a mix of
 * open + verified + resolved.
 *
 * Strategy: mock @/lib/flags (listFlagsByUser + the label/color maps), @/lib/auth,
 * the real theme palette, and stub the heavier child components so the suite
 * renders without native image / search internals.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import type { FlagRow } from '@/types/database';

import MyReportsModal from '../MyReportsModal';

// ---------------------------------------------------------------------------
// Mock: @/lib/auth — a signed-in user so load() runs.
// ---------------------------------------------------------------------------
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

// ---------------------------------------------------------------------------
// Mock: @/lib/flags — listFlagsByUser feeds the fixture; the rest are the
// label/color lookups MyReportsModal + its children read.
// ---------------------------------------------------------------------------
const mockListFlagsByUser = jest.fn<Promise<FlagRow[]>, [string]>();
jest.mock('@/lib/flags', () => ({
  listFlagsByUser: (...args: [string]) => mockListFlagsByUser(...args),
  CATEGORY_LABELS: {
    no_ramp: 'No ramp',
    broken_sidewalk: 'Broken sidewalk',
    blocked_path: 'Blocked path',
    missing_signal: 'Missing signal',
    steep_grade: 'Steep grade',
    other: 'Other',
  },
  STATUS_LABELS: {
    open: 'Open',
    verified: 'Verified',
    resolved: 'Resolved',
    rejected: 'Rejected',
  },
  STATUS_COLORS: {
    open: { bg: '#e7f0ff', fg: '#1A5FB4' },
    verified: { bg: '#e3f7ee', fg: '#067A56' },
    resolved: { bg: '#e3f6f0', fg: '#047054' },
    rejected: { bg: '#eef1f5', fg: '#4B5563' },
  },
  severityColor: jest.fn(() => '#888'),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/myReportsFilter — pass-through so the search filter doesn't
// interfere (we never type a query in these tests).
// ---------------------------------------------------------------------------
jest.mock('@/lib/myReportsFilter', () => ({
  filterMyReports: (flags: unknown[]) => flags,
}));

// ---------------------------------------------------------------------------
// Mock: @/theme/ThemeContext — real light palette so tokens resolve.
// ---------------------------------------------------------------------------
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/theme', () => jest.requireActual('@/theme'));

// ---------------------------------------------------------------------------
// Stub heavier children — they need native image / icon internals we don't
// exercise here. The filter chips under test live in MyReportsModal itself.
// ---------------------------------------------------------------------------
jest.mock('@/components/ui/RemoteImage', () => ({ RemoteImage: () => null }));
jest.mock('@/components/SearchInputRow', () => () => null);
jest.mock('@/components/StatusBadge', () => ({ StatusBadge: () => null }));
jest.mock('lucide-react-native', () => ({ MapPin: () => null, X: () => null }));

// ---------------------------------------------------------------------------
// Fixture — a mix of statuses so the status filter chip row renders
// (presentStatuses.length > 1).
// ---------------------------------------------------------------------------
function flag(over: Partial<FlagRow>): FlagRow {
  return {
    id: 'f1',
    user_id: 'user-1',
    lat: 49.28,
    lng: -123.12,
    category: 'no_ramp',
    severity: 3,
    description: null,
    photo_url: null,
    status: 'open',
    created_at: '2026-06-17T00:00:00Z',
    ...over,
  } as FlagRow;
}

const MIXED: FlagRow[] = [
  flag({ id: 'f1', status: 'open' }),
  flag({ id: 'f2', status: 'verified' }),
  flag({ id: 'f3', status: 'verified' }),
  flag({ id: 'f4', status: 'resolved' }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockListFlagsByUser.mockResolvedValue(MIXED);
});

const noop = () => {};

function selectedOf(getByLabelText: (l: string | RegExp) => { props: { accessibilityState?: { selected?: boolean } } }, label: string | RegExp) {
  return getByLabelText(label).props.accessibilityState?.selected;
}

// Render the modal (open) and wait for the async load() to settle: the status
// filter chips only appear once flags are loaded, so findByLabelText('Show all
// statuses') resolving means load() has fully run — including the trailing
// setLoading(false) — inside act(). That prevents the "update not wrapped in
// act(...)" warning and gives a stable post-load tree to assert against.
async function renderModal(props: Partial<React.ComponentProps<typeof MyReportsModal>> = {}) {
  const utils = render(
    <MyReportsModal visible onClose={noop} onSelectFlag={noop} {...props} />,
  );
  await utils.findByLabelText('Show all statuses');
  return utils;
}

describe('MyReportsModal — initialStatus seeds the status filter', () => {
  it('selects the "Verified" chip on open when initialStatus="verified"', async () => {
    const { getByLabelText } = await renderModal({ initialStatus: 'verified' });

    // The chip label includes the count: "Show only Verified reports, 2 items".
    await waitFor(() => {
      expect(selectedOf(getByLabelText, /Show only Verified reports/)).toBe(true);
    });
    // The "All" chip is NOT selected when a status is seeded.
    expect(selectedOf(getByLabelText, 'Show all statuses')).toBe(false);
  });

  it('does NOT select the "Open" chip when initialStatus="verified"', async () => {
    const { getByLabelText } = await renderModal({ initialStatus: 'verified' });
    await waitFor(() => {
      expect(selectedOf(getByLabelText, /Show only Verified reports/)).toBe(true);
    });
    expect(selectedOf(getByLabelText, /Show only Open reports/)).toBe(false);
  });

  it('defaults to the "All" chip selected when initialStatus is omitted', async () => {
    const { getByLabelText } = await renderModal();
    await waitFor(() => {
      expect(selectedOf(getByLabelText, 'Show all statuses')).toBe(true);
    });
    expect(selectedOf(getByLabelText, /Show only Verified reports/)).toBe(false);
  });

  it('re-seeds when re-opened with a different initialStatus', async () => {
    const { getByLabelText, rerender } = await renderModal({ initialStatus: 'verified' });
    await waitFor(() => {
      expect(selectedOf(getByLabelText, /Show only Verified reports/)).toBe(true);
    });

    // Close, then re-open seeded to a different status.
    rerender(
      <MyReportsModal visible={false} initialStatus="resolved" onClose={noop} onSelectFlag={noop} />,
    );
    rerender(
      <MyReportsModal visible initialStatus="resolved" onClose={noop} onSelectFlag={noop} />,
    );

    // Wait for the reopened modal to finish loading (chips back in the tree).
    await waitFor(() => {
      expect(selectedOf(getByLabelText, /Show only Resolved reports/)).toBe(true);
    });
    expect(selectedOf(getByLabelText, /Show only Verified reports/)).toBe(false);
  });
});
