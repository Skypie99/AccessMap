import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { AdminReport } from '@/lib/adminReports';
import type { CommentRow, FlagRow } from '@/types/database';
import { FlagDeletionUnavailableError, FlagStatusConflictError } from '@/lib/flags';
import AdminScreen from '../AdminScreen';

jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { BlurView: (props: Record<string, unknown>) => ReactActual.createElement(View, props) };
});
jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: (props: Record<string, unknown>) => ReactActual.createElement(View, props) };
});
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (effect: () => void | (() => void)) => ReactActual.useEffect(effect, [effect]),
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
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'admin-1' } }) }));

const mockConfirm = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/confirm', () => ({ confirm: (...args: unknown[]) => mockConfirm(...args) }));

const mockListRecentFlags = jest.fn();
const mockDeleteFlag = jest.fn();
const mockUpdateFlagStatus = jest.fn();
jest.mock('@/lib/flags', () => {
  const actual = jest.requireActual('@/lib/flags');
  return {
    ...actual,
    listRecentFlags: (...args: unknown[]) => mockListRecentFlags(...args),
    deleteFlag: (...args: unknown[]) => mockDeleteFlag(...args),
    updateFlagStatus: (...args: unknown[]) => mockUpdateFlagStatus(...args),
  };
});

const mockListOpenReports = jest.fn();
const mockRejectFlagReport = jest.fn();
const mockRemoveFlagReport = jest.fn();
const mockRemoveCommentReport = jest.fn();
const mockCloseReport = jest.fn();
jest.mock('@/lib/adminReports', () => ({
  listOpenReports: (...args: unknown[]) => mockListOpenReports(...args),
  rejectFlagReport: (...args: unknown[]) => mockRejectFlagReport(...args),
  removeFlagReport: (...args: unknown[]) => mockRemoveFlagReport(...args),
  removeCommentReport: (...args: unknown[]) => mockRemoveCommentReport(...args),
  closeReport: (...args: unknown[]) => mockCloseReport(...args),
}));

const FLAG: FlagRow = {
  id: 'flag-1',
  user_id: 'reporter-1',
  category: 'blocked_path',
  severity: 3,
  status: 'open',
  description: 'Broken curb ramp',
  lat: 1,
  lng: 1,
  photo_url: null,
  created_at: '2026-08-20T00:00:00.000Z',
};

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
  mockConfirm.mockResolvedValue(true);
  mockListRecentFlags.mockResolvedValue([]);
  mockListOpenReports.mockResolvedValue([]);
  mockUpdateFlagStatus.mockResolvedValue(FLAG);
  mockRejectFlagReport.mockResolvedValue({ closed: true });
  mockRemoveFlagReport.mockResolvedValue({ closed: true });
  mockRemoveCommentReport.mockResolvedValue({ closed: true });
  mockCloseReport.mockResolvedValue({ closed: true });
});

describe('AdminScreen — capability gate', () => {
  it('does not request the report queue for a non-admin', async () => {
    mockIsAdmin = false;
    const { findByText } = render(<AdminScreen />);
    expect(await findByText('Admin access required')).toBeTruthy();
    expect(mockListOpenReports).not.toHaveBeenCalled();
  });

  it('loads the report queue only after admin capability is true', async () => {
    render(<AdminScreen />);
    await waitFor(() => expect(mockListOpenReports).toHaveBeenCalledWith(200));
  });
});

describe('AdminScreen — explicit reject/restore reasons', () => {
  it('does not reject until an admin explicitly selects a reason', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    const { findByText, getByText } = render(<AdminScreen />);
    await findByText('No flags to moderate');
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');

    fireEvent.press(getByText('Reject flag'));
    expect(await findByText('Why reject this report?')).toBeTruthy();
    expect(mockRejectFlagReport).not.toHaveBeenCalled();

    await act(async () => fireEvent.press(getByText('Duplicate')));

    await waitFor(() =>
      expect(mockRejectFlagReport).toHaveBeenCalledWith({
        reportId: 'report-1',
        previousFlagStatus: 'open',
        reason: 'duplicate',
      }),
    );
    expect(mockConfirm).toHaveBeenCalledWith(
      'Reject this report?',
      'It will be hidden from public views. The reporter will be notified. No points will change. An admin can restore it.',
      'Reject',
      true,
    );
  });

  it('requires a restore reason and passes the exact approved confirmation', async () => {
    const rejected = { ...FLAG, status: 'rejected' } as FlagRow;
    mockListRecentFlags.mockResolvedValue([rejected]);
    const { findByText, getByText } = render(<AdminScreen />);
    await findByText('Restore');

    fireEvent.press(getByText('Restore'));
    expect(await findByText('Why restore this report?')).toBeTruthy();
    expect(mockUpdateFlagStatus).not.toHaveBeenCalled();

    await act(async () => fireEvent.press(getByText('Moderator error')));

    await waitFor(() =>
      expect(mockUpdateFlagStatus).toHaveBeenCalledWith('flag-1', 'open', 'rejected', {
        moderationReason: 'moderator_error',
      }),
    );
    expect(mockConfirm).toHaveBeenCalledWith(
      'Restore this report?',
      'It will return to public views. The reporter will be notified. No points will change.',
      'Restore',
      false,
    );
  });

  it('refreshes after an atomic reject reports a stale target', async () => {
    mockListOpenReports
      .mockResolvedValueOnce([flagReport()])
      .mockResolvedValueOnce([]);
    mockRejectFlagReport.mockRejectedValueOnce(new FlagStatusConflictError());
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByText, getByText } = render(<AdminScreen />);
    await findByText('No flags to moderate');
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');
    fireEvent.press(getByText('Reject flag'));
    await act(async () => fireEvent.press(getByText('Inaccurate')));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'This flag changed',
        expect.stringContaining('refreshing'),
      ),
    );
    await waitFor(() => expect(mockListOpenReports).toHaveBeenCalledTimes(2));
    alertSpy.mockRestore();
  });
});

describe('AdminScreen — atomic report actions', () => {
  it('routes comment removal through the report RPC wrapper using only report id', async () => {
    mockListOpenReports.mockResolvedValue([
      flagReport({
        targetKind: 'comment',
        targetId: 'comment-1',
        comment: COMMENT,
        reason: 'harassment',
      }),
    ]);
    const { findByText, getByText } = render(<AdminScreen />);
    await findByText('No flags to moderate');
    fireEvent.press(getByText(/^Reports/));
    await findByText('harassment');
    await act(async () => fireEvent.press(getByText('Delete comment')));
    await waitFor(() =>
      expect(mockRemoveCommentReport).toHaveBeenCalledWith({ reportId: 'report-1' }),
    );
  });

  it('closes no-action through the atomic wrapper without a client actor id', async () => {
    mockListOpenReports.mockResolvedValue([flagReport()]);
    const { findByText, getByText } = render(<AdminScreen />);
    await findByText('No flags to moderate');
    fireEvent.press(getByText(/^Reports/));
    await findByText('This looks fake');
    await act(async () => fireEvent.press(getByText('No action')));
    await waitFor(() => expect(mockCloseReport).toHaveBeenCalledWith('report-1', 'no_action'));
  });
});

describe('AdminScreen — refused flag removal', () => {
  it('keeps the flag in the moderation list and shows an error on repeated refusal', async () => {
    mockListRecentFlags.mockResolvedValue([FLAG]);
    mockDeleteFlag.mockRejectedValue(new FlagDeletionUnavailableError());
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const { findByLabelText, getByLabelText, queryByText } = render(<AdminScreen />);
      const remove = await findByLabelText('Remove Blocked path flag');
      fireEvent.press(remove);

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
        'Error', new FlagDeletionUnavailableError().message,
      ));
      expect(mockConfirm).toHaveBeenCalledWith(
        'Remove flag?', 'This permanently deletes the flag and cannot be undone.',
      );
      expect(mockDeleteFlag).toHaveBeenCalledWith(FLAG.id);
      expect(getByLabelText('Remove Blocked path flag')).toBeTruthy();
      expect(queryByText('No flags to moderate')).toBeNull();
      expect(mockListRecentFlags).toHaveBeenCalledTimes(1);
      fireEvent.press(getByLabelText('Remove Blocked path flag'));
      await waitFor(() => expect(mockDeleteFlag).toHaveBeenCalledTimes(2));
      expect(getByLabelText('Remove Blocked path flag')).toBeTruthy();
    } finally {
      alertSpy.mockRestore();
    }
  });
});
