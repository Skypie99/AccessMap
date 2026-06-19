/**
 * StatusHistoryModal timeline tests — hardens the vertical-timeline rendering
 * added in the 2026-06-17 expressive overhaul (src/components/StatusHistoryModal.tsx).
 *
 * What this locks in:
 *   1. One timeline row per history entry, each carrying the formatted line as
 *      its accessibilityLabel (the rail dot + connector are decorative; the row
 *      label is the SR-visible content).
 *   2. A status-colored dot per entry — pulled from statusDotColor() via the
 *      themed status*Fg tokens (open/verified/resolved/rejected), brandText for
 *      an unrecognized status.
 *   3. The LAST entry renders NO connector line; every earlier entry does. This
 *      is the timeline invariant — a trailing connector would dangle past the
 *      final dot.
 *   4. Loading + empty states render their placeholders.
 *
 * statusDotColor() is not exported, so dot color + connector presence are
 * asserted via the rendered View tree (style inspection), keyed off the row
 * accessibilityLabel which is stable, public output.
 *
 * Strategy: mock listStatusHistory to feed a fixed history; mock useColor to
 * the real palette; mock relativeTime so the formatted line is deterministic;
 * mock useReducedMotion (consumed for the modal animationType).
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import type { StatusHistoryEntry } from '@/lib/statusHistory';

import StatusHistoryModal from '../StatusHistoryModal';
import { color as realColor } from '@/theme';

// ---------------------------------------------------------------------------
// Tree helpers: a row's rail dot and connector have no testID (they're
// decorative), so we find them by their distinctive inline style on the row's
// descendants. ReactTestInstance.findAll walks the subtree; flattenStyle
// resolves the StyleSheet array into one object we can read.
// ---------------------------------------------------------------------------
import type { ReactTestInstance } from 'react-test-renderer';

// ---------------------------------------------------------------------------
// Mock: @/lib/statusHistory — stub listStatusHistory, keep the real
// formatHistoryEntry so the row labels reflect production formatting.
// ---------------------------------------------------------------------------
const mockListStatusHistory = jest.fn<Promise<StatusHistoryEntry[]>, [string]>();
jest.mock('@/lib/statusHistory', () => {
  const actual = jest.requireActual('@/lib/statusHistory');
  return {
    ...actual,
    listStatusHistory: (...args: [string]) => mockListStatusHistory(...args),
  };
});

// ---------------------------------------------------------------------------
// Mock: @/lib/flags — only STATUS_LABELS is consumed by the modal's
// statusLabel(). flags.ts imports supabase at module level, so a light stub
// keeps the suite hermetic.
// ---------------------------------------------------------------------------
jest.mock('@/lib/flags', () => ({
  STATUS_LABELS: {
    open: 'Open',
    verified: 'Verified',
    resolved: 'Resolved',
    rejected: 'Rejected',
  },
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/relativeTime — deterministic "Xh ago" so labels are stable.
// ---------------------------------------------------------------------------
jest.mock('@/lib/relativeTime', () => ({
  relativeTime: jest.fn(() => '2h ago'),
}));

// ---------------------------------------------------------------------------
// Mock: @/theme/ThemeContext — real light palette so the status*Fg + divider
// tokens resolve without a provider.
// ---------------------------------------------------------------------------
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

// ---------------------------------------------------------------------------
// Mock: @/lib/accessibility — keep the real decorativeProps (the rail uses it)
// but stub useReducedMotion.
// ---------------------------------------------------------------------------
jest.mock('@/lib/accessibility', () => {
  const actual = jest.requireActual('@/lib/accessibility');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function entry(over: Partial<StatusHistoryEntry>): StatusHistoryEntry {
  return {
    id: 'e1',
    flag_id: 'flag-1',
    from_status: null,
    to_status: 'open',
    created_at: '2026-06-17T00:00:00Z',
    ...over,
  };
}

const HISTORY: StatusHistoryEntry[] = [
  entry({ id: 'e1', from_status: null, to_status: 'open' }),
  entry({ id: 'e2', from_status: 'open', to_status: 'verified' }),
  entry({ id: 'e3', from_status: 'verified', to_status: 'resolved' }),
];

// The line text production formatHistoryEntry yields for each fixture entry,
// given our mocked relativeTime() === '2h ago'. These double as the row
// accessibilityLabels, which we use to locate each row.
const LINES = [
  'Reported · 2h ago',
  'Open → Verified · 2h ago',
  'Verified → Resolved · 2h ago',
];

beforeEach(() => {
  jest.clearAllMocks();
  mockListStatusHistory.mockResolvedValue(HISTORY);
});

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flattenStyle));
  }
  return (style as Record<string, unknown>) ?? {};
}

// The 10x10 status node whose backgroundColor is the resolved status*Fg token.
function findDotColor(row: ReactTestInstance): string | undefined {
  const dot = row.findAll((n) => {
    const s = flattenStyle(n.props.style);
    return s.width === 10 && s.height === 10 && typeof s.backgroundColor === 'string';
  })[0];
  return dot ? (flattenStyle(dot.props.style).backgroundColor as string) : undefined;
}

// The thin width:2 connector tinted with color.divider. Absent on the last row.
function hasConnector(row: ReactTestInstance): boolean {
  return (
    row.findAll((n) => {
      const s = flattenStyle(n.props.style);
      return s.width === 2 && s.backgroundColor === realColor.divider;
    }).length > 0
  );
}

describe('StatusHistoryModal — timeline rendering', () => {
  it('renders one row per history entry, each labeled with its formatted line', async () => {
    const { getByLabelText } = render(
      <StatusHistoryModal visible flagId="flag-1" onClose={jest.fn()} />,
    );
    await waitFor(() => {
      for (const line of LINES) {
        expect(getByLabelText(line)).toBeTruthy();
      }
    });
  });

  it('renders a status-colored dot per entry (open/verified/resolved tokens)', async () => {
    const { getByLabelText } = render(
      <StatusHistoryModal visible flagId="flag-1" onClose={jest.fn()} />,
    );
    await waitFor(() => getByLabelText(LINES[0]));

    const expectedDotColors = [
      realColor.statusOpenFg, // entry 1 → to_status 'open'
      realColor.statusVerifiedFg, // entry 2 → 'verified'
      realColor.statusResolvedFg, // entry 3 → 'resolved'
    ];

    LINES.forEach((line, i) => {
      const row = getByLabelText(line);
      expect(findDotColor(row)).toBe(expectedDotColors[i]);
    });
  });

  it('gives every entry EXCEPT the last a connector line', async () => {
    const { getByLabelText } = render(
      <StatusHistoryModal visible flagId="flag-1" onClose={jest.fn()} />,
    );
    await waitFor(() => getByLabelText(LINES[0]));

    expect(hasConnector(getByLabelText(LINES[0]))).toBe(true); // first → connector
    expect(hasConnector(getByLabelText(LINES[1]))).toBe(true); // middle → connector
    expect(hasConnector(getByLabelText(LINES[2]))).toBe(false); // LAST → none
  });

  it('uses the brandText fallback dot color for an unrecognized status', async () => {
    mockListStatusHistory.mockResolvedValueOnce([
      entry({ id: 'eX', from_status: 'open', to_status: 'archived' }),
    ]);
    const { getByLabelText } = render(
      <StatusHistoryModal visible flagId="flag-1" onClose={jest.fn()} />,
    );
    // Unknown status capitalizes in the label: "Open → Archived · 2h ago".
    const row = await waitFor(() => getByLabelText('Open → Archived · 2h ago'));
    expect(findDotColor(row)).toBe(realColor.brandText);
  });
});

describe('StatusHistoryModal — non-timeline states', () => {
  it('renders the empty placeholder when history is empty', async () => {
    mockListStatusHistory.mockResolvedValueOnce([]);
    const { getByText } = render(
      <StatusHistoryModal visible flagId="flag-1" onClose={jest.fn()} />,
    );
    await waitFor(() => expect(getByText('No history yet')).toBeTruthy());
  });

  it('does not fetch (renders nothing to load) when flagId is null', () => {
    render(<StatusHistoryModal visible flagId={null} onClose={jest.fn()} />);
    expect(mockListStatusHistory).not.toHaveBeenCalled();
  });
});
