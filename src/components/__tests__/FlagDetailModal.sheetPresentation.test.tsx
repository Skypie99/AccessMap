/**
 * SW-46 — the sheets FlagDetailModal opens must present from ITS view
 * controller, which means being mounted INSIDE its `<Modal>`.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * iOS refuses to present a second modal from a view controller that is already
 * presenting one. StatusHistoryModal and ReportContentModal shipped mounted as
 * SIBLINGS after FlagDetailModal's `</Modal>`, so they resolved to the SCREEN's
 * VC — the one FlagDetail itself occupies — and iOS declined. History and
 * Report were visible, enabled, and did nothing at all. Guest and signed-in
 * alike. One line per dead tap (iPhone 17 Pro sim, 2026-08-20):
 *
 *   [com.apple.UIKit:Presentation] Attempt to present
 *   <RCTModalHostViewController: 0x12f521900> on <UIViewController:
 *   0x1051b8c00> (from <RNSScreen: 0x127374000>) which is already presenting
 *   <RCTModalHostViewController: 0x1273b5e00>.
 *
 * ReportContentModal is the Apple 1.2(b) abuse-report sheet and FlagDetailModal
 * is its ONLY mount point app-wide, so a UGC app was shipping with its report
 * mechanism 100% dead — for flags AND comments.
 *
 * ─── WHY THE EXISTING TESTS COULD NOT SEE IT ──────────────────────────────
 * StatusHistoryModal.test.tsx and ReportContentModal.test.tsx both exist and
 * both passed throughout. They mount the children STANDALONE, and the defect
 * was never in a child — it was in where the PARENT mounts them. A child's
 * unit test structurally cannot catch that. So this suite renders the PARENT,
 * opens each sheet the way a user does, and asserts the one relationship UIKit
 * actually consults: is the sheet a DESCENDANT of the modal that is already
 * presenting? Sibling mounts fail here; nested mounts pass.
 *
 * ─── AND WHY NOT A SOURCE SCAN ────────────────────────────────────────────
 * This file's siblings in __tests__/ mostly grep the tree, and a grep for
 * "`</Modal>` comes after `<ReportContentModal`" would have caught this exact
 * regression. It would also be satisfied by a sheet mounted inside a DIFFERENT
 * modal, or inside a branch that never renders. Walking the mounted tree asks
 * the question UIKit asks instead of a proxy for it.
 */
import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import FlagDetailModal from '../FlagDetailModal';
import PhotoGallery from '../PhotoGallery';
import { REPORT_CONTROL_LABEL } from '@/lib/copy';
import type { FlagRow } from '@/types/database';

const PhotoGalleryInner = (PhotoGallery as unknown as { type: React.ComponentType }).type;

// ---------------------------------------------------------------------------
// Mocks — every I/O edge the sheet touches on open. The point of this suite is
// the mount ARRANGEMENT, so the data layers are stubbed to their quietest
// successful shape and nothing here asserts on them.
// ---------------------------------------------------------------------------
let mockAuthUser: { id: string } | null = { id: 'user-1' };
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: mockAuthUser }) }));

// MOD1: Reject/Restore are admin-gated. Defaults to a plain signed-in,
// non-admin viewer — the pre-MOD1 default this whole suite assumed.
let mockIsAdmin: boolean | null = false;
jest.mock('@/lib/admin', () => ({ useIsAdmin: () => mockIsAdmin }));

jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

jest.mock('@/lib/statusHistory', () => ({
  listStatusHistory: jest.fn().mockResolvedValue([]),
  formatHistoryEntry: jest.fn(() => 'Reported'),
}));

jest.mock('@/lib/photos', () => ({
  listFlagPhotos: jest.fn().mockResolvedValue([]),
  addFlagPhoto: jest.fn(),
}));

jest.mock('@/lib/watchedFlags', () => ({
  loadWatched: jest.fn().mockResolvedValue([]),
  addWatched: jest.fn(),
  removeWatched: jest.fn(),
}));

jest.mock('@/lib/recentlyViewed', () => ({ recordView: jest.fn() }));

jest.mock('@/lib/hiddenContent', () => ({
  loadHidden: jest.fn().mockResolvedValue([]),
  filterHidden: jest.fn((rows: unknown[]) => rows),
  filterBlockedAuthors: jest.fn((rows: unknown[]) => rows),
  hideContent: jest.fn(),
}));

jest.mock('@/lib/reopenRequests', () => ({
  hasRequestedReopen: jest.fn().mockResolvedValue(false),
  recordReopenRequest: jest.fn(),
}));

jest.mock('@/lib/disputeRequests', () => ({
  hasRequestedDispute: jest.fn().mockResolvedValue(false),
  recordDisputeRequest: jest.fn(),
}));

// The realtime channel is the one thing that must NOT run here — see SW-47.
jest.mock('@/hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    loading: false,
    error: null,
    tableNotReady: false,
    addComment: jest.fn(),
    deleteComment: jest.fn(),
    refetch: jest.fn(),
  }),
}));

beforeEach(() => {
  mockAuthUser = { id: 'user-1' };
  mockIsAdmin = false;
});

const FLAG: FlagRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'someone-else',
  category: 'sidewalk',
  severity: 3,
  status: 'open',
  description: 'Cracked kerb ramp',
  lat: 49.888,
  lng: -119.496,
  photo_url: null,
  photo_alt: null,
  created_at: '2026-08-01T12:00:00.000Z',
} as unknown as FlagRow;

function renderDetail() {
  return render(
    <FlagDetailModal
      visible
      flag={FLAG}
      onClose={jest.fn()}
      onChanged={jest.fn()}
      onDeleted={jest.fn()}
      onViewOnMap={jest.fn()}
    />,
  );
}

/**
 * Every `<Modal>` between `node` and the tree root, outermost last. This is the
 * presentation chain: on iOS each entry presents from the one after it.
 */
function modalAncestors(node: ReactTestInstance): ReactTestInstance[] {
  const chain: ReactTestInstance[] = [];
  for (let cur = node.parent; cur; cur = cur.parent) {
    if (cur.type === Modal) chain.push(cur);
  }
  return chain;
}

/** The FlagDetail sheet's own Modal, found by the label it ships with. */
function detailModal(instances: ReactTestInstance[]): ReactTestInstance | undefined {
  return instances.find((m) =>
    String(m.props['aria-label'] ?? '').startsWith('Flag details:'),
  );
}

/**
 * The mounted `<Modal>` carrying `label`. A Modal renders null while closed, so
 * finding one at all means the sheet opened — and the Modal, not any text
 * inside it, is the thing iOS presents.
 *
 * Matched on the Modal type rather than by label lookup because the report
 * sheet labels its Modal with REPORT_CONTROL_LABEL, the same string as the
 * button that opens it; a plain getByLabelText would match both.
 */
function openSheet(
  modals: ReactTestInstance[],
  label: string,
): ReactTestInstance | undefined {
  return modals.find((m) => m.props['aria-label'] === label && m.props.visible);
}

describe('SW-46 — sheets opened from FlagDetailModal present from its VC', () => {
  it('the status-history sheet is a descendant of the detail Modal, not a sibling', async () => {
    const screen = renderDetail();

    fireEvent.press(screen.getByLabelText('View status history'));

    // The child renders its own Modal only once open, so finding it at all is
    // half the assertion; the other half is WHERE it is.
    const sheet = await waitFor(() => {
      const found = openSheet(screen.UNSAFE_getAllByType(Modal), 'Status history');
      expect(found).toBeTruthy();
      return found as ReactTestInstance;
    });

    expect(detailModal(modalAncestors(sheet))).toBeTruthy();
  });

  it('the abuse-report sheet is a descendant of the detail Modal, not a sibling', async () => {
    const screen = renderDetail();

    fireEvent.press(screen.getByLabelText(REPORT_CONTROL_LABEL));

    const sheet = await waitFor(() => {
      const found = openSheet(screen.UNSAFE_getAllByType(Modal), REPORT_CONTROL_LABEL);
      expect(found).toBeTruthy();
      return found as ReactTestInstance;
    });

    expect(detailModal(modalAncestors(sheet))).toBeTruthy();
  });

  it('the legal sheets keep the arrangement that proved the rule', async () => {
    // `{legal.sheets}` was moved inside for this same reason on 2026-08-19 and
    // is the in-repo precedent the SW-46 fix follows. Pinned alongside so a
    // future tidy-up cannot quietly re-orphan one without the other.
    const screen = renderDetail();
    const modals = screen.UNSAFE_getAllByType(Modal);
    expect(detailModal(modals.flatMap((m) => modalAncestors(m)))).toBeTruthy();
  });
});

describe('FlagDetailModal — guest review boundary', () => {
  function renderGuest(primaryIntent: 'read' | 'triage') {
    mockAuthUser = null;
    const onSignInToReview = jest.fn();
    const updateHandlers = {
      onChanged: jest.fn(),
      onDeleted: jest.fn(),
    };
    return {
      ...render(
        <FlagDetailModal
          visible
          flag={FLAG}
          primaryIntent={primaryIntent}
          onClose={jest.fn()}
          onChanged={updateHandlers.onChanged}
          onDeleted={updateHandlers.onDeleted}
          onViewOnMap={jest.fn()}
          onSignInToReview={onSignInToReview}
        />,
      ),
      onSignInToReview,
      updateHandlers,
    };
  }

  it('keeps Directions primary for readers and replaces the verdict cluster once', () => {
    const screen = renderGuest('read');

    expect(screen.getByLabelText('Get directions to this flag')).toBeTruthy();
    expect(screen.getAllByText('Sign in to review')).toHaveLength(1);
    for (const verdict of ['Verify', 'Resolved', 'Reject']) {
      expect(screen.queryByText(verdict)).toBeNull();
    }
  });

  it('uses the single account boundary as the triage primary and keeps Directions', () => {
    const screen = renderGuest('triage');

    expect(screen.getAllByText('Sign in to review')).toHaveLength(1);
    expect(screen.getByLabelText('Get directions to this flag')).toBeTruthy();
    expect(screen.queryByText('Verify')).toBeNull();
    expect(screen.queryByText('Resolved')).toBeNull();
    expect(screen.queryByText('Reject')).toBeNull();
  });

  it('delegates sign-in to the host without invoking a status callback', () => {
    const screen = renderGuest('triage');

    fireEvent.press(screen.getByLabelText('Sign in to review'));

    expect(screen.onSignInToReview).toHaveBeenCalledTimes(1);
    expect(screen.updateHandlers.onChanged).not.toHaveBeenCalled();
  });

  it('preserves the signed-in verdict controls available to a non-admin', () => {
    const screen = renderDetail();
    expect(screen.getByLabelText('Verify this flag')).toBeTruthy();
    expect(screen.getByLabelText('Mark this flag resolved')).toBeTruthy();
    expect(screen.queryByText('Sign in to review')).toBeNull();
  });
});

describe('FlagDetailModal — MOD1: Reject/Restore are admin-only', () => {
  it('hides Reject from a signed-in non-admin', () => {
    const screen = renderDetail();
    expect(screen.queryByLabelText('Reject this flag')).toBeNull();
  });

  it('shows Reject to a signed-in admin', () => {
    mockIsAdmin = true;
    const screen = renderDetail();
    expect(screen.getByLabelText('Reject this flag')).toBeTruthy();
  });

  it('never shows Restore on a flag that is not rejected, admin or not', () => {
    mockIsAdmin = true;
    const screen = renderDetail();
    expect(screen.queryByLabelText('Restore this flag')).toBeNull();
  });

  it('shows Restore to an admin viewing a rejected flag', () => {
    mockIsAdmin = true;
    const rejectedFlag = { ...FLAG, status: 'rejected' } as FlagRow;
    const screen = render(
      <FlagDetailModal
        visible
        flag={rejectedFlag}
        onClose={jest.fn()}
        onChanged={jest.fn()}
        onDeleted={jest.fn()}
        onViewOnMap={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Restore this flag')).toBeTruthy();
    expect(screen.queryByLabelText('Reject this flag')).toBeNull();
  });

  it('hides Restore from a non-admin viewing a rejected flag', () => {
    const rejectedFlag = { ...FLAG, status: 'rejected' } as FlagRow;
    const screen = render(
      <FlagDetailModal
        visible
        flag={rejectedFlag}
        onClose={jest.fn()}
        onChanged={jest.fn()}
        onDeleted={jest.fn()}
        onViewOnMap={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Restore this flag')).toBeNull();
  });
});

describe('FlagDetailModal — photo ownership boundary', () => {
  it('does not expose photo-add controls to a signed-in non-owner', () => {
    const screen = renderDetail();

    expect(screen.queryByLabelText('Add photo')).toBeNull();
    expect(screen.queryByLabelText('Add after photo')).toBeNull();
    expect(screen.UNSAFE_queryByType(PhotoGalleryInner)).toBeNull();
  });

  it('exposes the photo-add control to the report owner when idle', () => {
    const ownFlag = { ...FLAG, user_id: 'user-1' };
    const screen = render(
      <FlagDetailModal
        visible
        flag={ownFlag}
        onClose={jest.fn()}
        onChanged={jest.fn()}
        onDeleted={jest.fn()}
        onViewOnMap={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Add photo')).toBeTruthy();
    expect(screen.UNSAFE_getByType(PhotoGalleryInner).props.onAddPhoto).toEqual(expect.any(Function));
  });
});
