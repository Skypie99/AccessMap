/**
 * MOD1 — AdminScreen's two queues: the pre-existing Flags queue (admin gate,
 * Remove/Dismiss/Restore — see AdminScreen's own long-standing behavior) and
 * the new Reports queue this checkpoint adds. This file focuses on the NEW
 * behavior: the Flags/Reports toggle, and per-report action gating by target
 * kind / availability / malformed-ness.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { FlagRow, CommentRow } from '@/types/database';
import type { AdminReport } from '@/lib/adminReports';
// The real class — @/lib/flags is NOT mocked in this file, so `instanceof`
// checks in AdminScreen.tsx against this same import resolve correctly.
import { FlagStatusConflictError } from '@/lib/flags';
import AdminScreen from '../AdminScreen';

jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    BlurView: (props: Record<string, unknown>) => ReactActual.createElement(RNView, props),
  };
});
jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: Record<string, unknown>) => ReactActual.createElement(RNView, props),
  };
});

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(effect, [effect]);
    },
  };
});
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 0 }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/lib/drawerContext', () => ({
  useDrawer: () => ({ open: false, setOpen: jest.fn() }),
  useDrawerTrigger: () => ({ ref: { current: null }, register: jest.fn() }),
}));
jest.mock('@/lib/sharedModalsContext', () => ({
  useSharedModals: () => ({ open: null, setOpen: jest.fn() }),
}));

let mockIsAdmin: boolean | null = true;
jest.mock('@/lib/admin', () => ({ useIsAdmin: () => mockIsAdmin }));

const ADMIN_USER = { id: 'admin-1' };
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: ADMIN_USER }) }));

// Auto-confirm every confirm() dialog — these tests exercise what happens
// AFTER confirmation, not the dialog itself (already covered elsewhere).
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn().mockResolvedValue(true) }));

const mockListRecentFlags = jest.fn().mockResolvedValue([]);
const mockDeleteFlag = jest.fn().mockResolvedValue(undefined);
const mockUpdateFlagStatus = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/flags', () => {
  const actual = jest.requireActual('@/lib/flags');
  return {
    ...actual,
    listRecentFlags: (...a: unknown[]) => mockListRecentFlags(...a),
    deleteFlag: (...a: unknown[]) => mockDeleteFlag(...a),
    updateFlagStatus: (...a: unknown[]) => mockUpdateFlagStatus(...a),
  };
});

const mockListOpenReports = jest.fn();
const mockRejectFlagReport = jest.fn();
const mockRemoveFlagReport = jest.fn();
const mockRemoveCommentReport = jest.fn();
const mockCloseReport = jest.fn();
const mockRetryClose = jest.fn();
jest.mock('@/lib/adminReports', () => ({
  listOpenReports: (...a: unknown[]) => mockListOpenReports(...a),
  rejectFlagReport: (...a: unknown[]) => mockRejectFlagReport(...a),
  removeFlagReport: (...a: unknown[]) => mockRemoveFlagReport(...a),
  removeCommentReport: (...a: unknown[]) => mockRemoveCommentReport(...a),
  closeReport: (...a: unknown[]) => mockCloseReport(...a),
  retryClose: (...a: unknown[]) => mockRetryClose(...a),
}));

const FLAG: FlagRow = {
  id: 'flag-1',
  user_id: 'reporter-1',
  category: 'sidewalk',
  severity: 3,
  status: 'open',
  description: 'Broken curb ramp',
  lat: 1,
  lng: 1,
  photo_url: null,
  created_at: '2026-08-20T00:00:00.000Z',
} as unknown as FlagRow;

const COMMENT: CommentRow = {
  id: 'comment-1',
  flag_id: 'flag-1',
  user_id: 'author-1',
  content: 'unkind comment',
  created_at: '2026-08-20T00:00:00.000Z',
  display_name: 'Alex',
};

function flagReport(overrides: Partial<AdminReport> = {}): AdminReport {
  return {
    id: 'report-1',
    createdAt: '2026-08-20T00:00:00.000Z',
    reason: 'This looks fake',
    category: 'spam',
    malformed: false,
    rawBody: '[REPORT] v2 target=flag id=flag-1\n\nThis looks fake',
    targetKind: 'flag',
    targetId: 'flag-1',
    flag: FLAG,
    comment: null,
    targetAvailable: true,
    reviewedAt: null,
    resolution: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAdmin = true;
  mockListRecentFlags.mockResolvedValue([]);
  mockListOpenReports.mockResolvedValue([]);
});

describe('AdminScreen — access gate (unchanged)', () => {
  it('shows a spinner while admin status is loading', () => {
    mockIsAdmin = null;
    const { queryByText } = render(<AdminScreen />);
    expect(queryByText('Admin access required')).toBeNull();
  });

  it('blocks a non-admin', async () => {
    mockIsAdmin = false;
    const { findByText } = render(<AdminScreen />);
    expect(await findByText('Admin access required')).toBeTruthy();
  });
});

describe('AdminScreen — MOD1 Flags queue: the Dismiss/Restore swap', () => {
  it('a non-rejected flag shows Dismiss, not Restore', async () => {
    mockListRecentFlags.mockResolvedValue([FLAG]); // status: 'open'
    const { findByText, queryByText } = render(<AdminScreen />);

    expect(await findByText('Dismiss')).toBeTruthy();
    expect(queryByText('Restore')).toBeNull();
  });

  it('a rejected flag shows Restore, not Dismiss', async () => {
    const rejectedFlag = { ...FLAG, status: 'rejected' } as FlagRow;
    mockListRecentFlags.mockResolvedValue([rejectedFlag]);
    const { findByText, queryByText } = render(<AdminScreen />);

    expect(await findByText('Restore')).toBeTruthy();
    expect(queryByText('Dismiss')).toBeNull();
  });

  it('pressing Restore calls updateFlagStatus(id, "open", "rejected") and removes the busy row correctly', async () => {
    const rejectedFlag = { ...FLAG, status: 'rejected' } as FlagRow;
    mockListRecentFlags.mockResolvedValue([rejectedFlag]);
    mockUpdateFlagStatus.mockResolvedValue(undefined);
    const { findByText, getByText } = render(<AdminScreen />);
    await findByText('Restore');

    await act(async () => {
      fireEvent.press(getByText('Restore'));
    });

    await waitFor(() =>
      expect(mockUpdateFlagStatus).toHaveBeenCalledWith('flag-1', 'open', 'rejected'),
    );
  });
});

describe('AdminScreen — MOD1 Flags/Reports toggle', () => {
  it('defaults to the Flags queue and can switch to Reports', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    const { findByText, getByText } = render(<AdminScreen />);

    await findByText('No flags to moderate');
    expect(mockListOpenReports).toHaveBeenCalled();

    fireEvent.press(getByText(/^Reports/));

    await findByText('This looks fake');
  });
});

describe('AdminScreen — MOD1 report actions, gated by target kind and availability', () => {
  it('an available flag report offers Reject, Remove, and No action', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    expect(getByText('Reject flag')).toBeTruthy();
    expect(getByText('Remove flag')).toBeTruthy();
    expect(getByText('No action')).toBeTruthy();
    expect(queryByText('Target unavailable')).toBeNull();
  });

  it('pressing Reject flag calls rejectFlagReport and removes the row on success', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    mockRejectFlagReport.mockResolvedValue({ closed: true });
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    await act(async () => {
      fireEvent.press(getByText('Reject flag'));
    });

    await waitFor(() => expect(mockRejectFlagReport).toHaveBeenCalledWith({
      reportId: 'report-1',
      flagId: 'flag-1',
      previousFlagStatus: 'open',
      reviewedBy: 'admin-1',
    }));
    await waitFor(() => expect(queryByText('This looks fake')).toBeNull());
  });

  it('a stale flag status (FlagStatusConflictError) shows a friendly message and refreshes the queue, not a generic error', async () => {
    // Reachable two ways: someone else acted on the flag since this queue
    // loaded, OR a prior partial-failure retry already applied THIS reject
    // and the admin pressed the same button again. Either way there's
    // nothing new to mutate — the fix is to refresh, not to error out.
    mockListOpenReports
      .mockResolvedValueOnce([flagReport()])
      .mockResolvedValueOnce([]); // the refresh after the conflict finds it already handled
    mockRejectFlagReport.mockRejectedValue(new FlagStatusConflictError());
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    await act(async () => {
      fireEvent.press(getByText('Reject flag'));
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'This flag changed',
        expect.stringContaining('refreshing'),
      ),
    );
    expect(alertSpy).not.toHaveBeenCalledWith('Error', expect.anything());
    // The refresh actually ran — a second listOpenReports call — rather than
    // leaving the stale report sitting there for an identical failed retry.
    await waitFor(() => expect(mockListOpenReports).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(queryByText('This looks fake')).toBeNull());
    alertSpy.mockRestore();
  });

  it('a comment report offers Delete comment, not the flag actions', async () => {
    mockListOpenReports.mockResolvedValue([
      flagReport({
        targetKind: 'comment',
        targetId: 'comment-1',
        comment: COMMENT,
        flag: FLAG, // parent, for context
        reason: 'harassment',
      }),
    ]);
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('harassment');

    expect(getByText('Delete comment')).toBeTruthy();
    expect(queryByText('Reject flag')).toBeNull();
    expect(queryByText('Remove flag')).toBeNull();
  });

  it('pressing Delete comment calls removeCommentReport', async () => {
    mockListOpenReports.mockResolvedValue([
      flagReport({ targetKind: 'comment', targetId: 'comment-1', comment: COMMENT, reason: 'harassment' }),
    ]);
    mockRemoveCommentReport.mockResolvedValue({ closed: true });
    const { findByText, getByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('harassment');

    await act(async () => {
      fireEvent.press(getByText('Delete comment'));
    });

    await waitFor(() =>
      expect(mockRemoveCommentReport).toHaveBeenCalledWith({
        reportId: 'report-1',
        commentId: 'comment-1',
        reviewedBy: 'admin-1',
      }),
    );
  });

  it('a report whose target is already gone offers ONLY Target unavailable and No action', async () => {
    mockListOpenReports.mockResolvedValue([flagReport({ flag: null, targetAvailable: false })]);
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    expect(getByText('This flag no longer exists.')).toBeTruthy();
    expect(getByText('Target unavailable')).toBeTruthy();
    expect(getByText('No action')).toBeTruthy();
    expect(queryByText('Reject flag')).toBeNull();
    expect(queryByText('Remove flag')).toBeNull();
  });

  it('a malformed report offers ONLY No action', async () => {
    mockListOpenReports.mockResolvedValue([
      flagReport({
        malformed: true,
        targetKind: null,
        targetId: null,
        flag: null,
        targetAvailable: false,
        rawBody: '[REPORT] v99 target=flag id=flag-1',
        reason: '',
        category: undefined,
      }),
    ]);
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('Unreadable report');

    expect(getByText('No action')).toBeTruthy();
    expect(queryByText('Reject flag')).toBeNull();
    expect(queryByText('Remove flag')).toBeNull();
    expect(queryByText('Target unavailable')).toBeNull();
  });

  it('pressing No action closes the report directly, without any content mutation', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    mockCloseReport.mockResolvedValue({ ok: true });
    const { findByText, getByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    await act(async () => {
      fireEvent.press(getByText('No action'));
    });

    await waitFor(() => expect(mockCloseReport).toHaveBeenCalledWith('report-1', 'no_action', 'admin-1'));
    expect(mockRejectFlagReport).not.toHaveBeenCalled();
    expect(mockRemoveFlagReport).not.toHaveBeenCalled();
  });

  it('a partial-failure outcome (content applied, close write failed) keeps the report open and truthful', async () => {
    // rejectFlagReport already retries the close write internally (see
    // adminReports.test.ts) — `{closed: false}` reaching the UI means even
    // those retries were exhausted. The screen must not pretend it closed.
    mockListOpenReports.mockResolvedValue([flagReport()]);
    mockRejectFlagReport.mockResolvedValue({ closed: false, closeError: 'timeout', resolution: 'flag_rejected' });
    const { findByText, getByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    await act(async () => {
      fireEvent.press(getByText('Reject flag'));
    });

    await waitFor(() => expect(mockRejectFlagReport).toHaveBeenCalledTimes(1));
    // Still open — the whole point of not lying about closure. The flag's
    // content action already succeeded (that's what rejectFlagReport does
    // first); only the bookkeeping write failed, so this stays visible for a
    // deliberate, human-initiated retry rather than being silently dropped.
    expect(getByText('This looks fake')).toBeTruthy();
  });
});

describe('MOD1R FIX1 — pending close: only a Finish-review retry, never the original actions again', () => {
  it('after a partial-failure outcome, the original action buttons are replaced by Finish review alone', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    mockRejectFlagReport.mockResolvedValue({ closed: false, closeError: 'timeout', resolution: 'flag_rejected' });
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    await act(async () => {
      fireEvent.press(getByText('Reject flag'));
    });
    await waitFor(() => expect(mockRejectFlagReport).toHaveBeenCalledTimes(1));

    // The content action already happened — these must never be offered again.
    expect(queryByText('Reject flag')).toBeNull();
    expect(queryByText('Remove flag')).toBeNull();
    expect(queryByText('No action')).toBeNull();
    expect(getByText('Finish review')).toBeTruthy();
  });

  it('pressing Finish review calls retryClose with the original resolution, never rejectFlagReport again', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    mockRejectFlagReport.mockResolvedValue({ closed: false, closeError: 'timeout', resolution: 'flag_rejected' });
    mockRetryClose.mockResolvedValue({ closed: true });
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    await act(async () => {
      fireEvent.press(getByText('Reject flag'));
    });
    await waitFor(() => expect(mockRejectFlagReport).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.press(getByText('Finish review'));
    });

    await waitFor(() =>
      expect(mockRetryClose).toHaveBeenCalledWith('report-1', 'flag_rejected', 'admin-1'),
    );
    expect(mockRejectFlagReport).toHaveBeenCalledTimes(1); // never repeated
    await waitFor(() => expect(queryByText('This looks fake')).toBeNull()); // now truly closed
  });

  it('a report that is ALREADY pending close on load (reloaded from a prior session) also offers only Finish review', async () => {
    // Simulates markPendingResolution having survived a reload: the durable
    // column says pending, not any local state from this render.
    mockListOpenReports.mockResolvedValue([flagReport({ resolution: 'comment_removed' })]);
    const { findByText, getByText, queryByText } = render(<AdminScreen />);
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    expect(queryByText('Reject flag')).toBeNull();
    expect(queryByText('Remove flag')).toBeNull();
    expect(getByText('Finish review')).toBeTruthy();
  });
});
