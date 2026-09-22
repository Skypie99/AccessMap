import React from 'react';
import { AccessibilityInfo, Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { FlagRow } from '@/types/database';
import {
  FlagPhotoAttachmentUnavailableError,
  FlagDeletionUnavailableError,
} from '@/lib/flags';
import FlagDetailModal from '../FlagDetailModal';

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/lib/admin', () => ({ useIsAdmin: () => false }));
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/lib/statusHistory', () => ({
  listStatusHistory: jest.fn().mockResolvedValue([]),
  formatHistoryEntry: jest.fn(() => 'Reported'),
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
jest.mock('@/hooks/useComments', () => ({
  useComments: () => ({
    comments: [], loading: false, error: null, tableNotReady: false,
    addComment: jest.fn(), deleteComment: jest.fn(), refetch: jest.fn(),
  }),
}));

const mockListFlagPhotos = jest.fn();
const mockAddFlagPhoto = jest.fn();
jest.mock('@/lib/photos', () => ({
  listFlagPhotos: (...args: unknown[]) => mockListFlagPhotos(...args),
  addFlagPhoto: (...args: unknown[]) => mockAddFlagPhoto(...args),
}));

const mockDeleteFlag = jest.fn();
jest.mock('@/lib/flags', () => {
  const actual = jest.requireActual('@/lib/flags');
  return { ...actual, deleteFlag: (...args: unknown[]) => mockDeleteFlag(...args) };
});

const mockConfirm = jest.fn();
const mockNotify = jest.fn();
jest.mock('@/lib/confirm', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
  notify: (...args: unknown[]) => mockNotify(...args),
}));

const mockRequestLibraryPermission = jest.fn();
const mockLaunchLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockRequestLibraryPermission(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchLibrary(...args),
}));

const FLAG: FlagRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'user-1',
  category: 'sidewalk',
  severity: 3,
  status: 'open',
  description: 'Cracked kerb ramp',
  lat: 49.888,
  lng: -119.496,
  photo_url: null,
  photo_alt: null,
  created_at: '2026-08-01T12:00:00.000Z',
} as FlagRow;

function renderDetail() {
  const onDeleted = jest.fn();
  const onClose = jest.fn();
  const screen = render(
    <FlagDetailModal
      visible flag={FLAG} onClose={onClose} onChanged={jest.fn()}
      onDeleted={onDeleted} onViewOnMap={jest.fn()}
    />,
  );
  return { screen, onDeleted, onClose };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListFlagPhotos.mockResolvedValue([]);
  mockConfirm.mockResolvedValue(true);
  mockRequestLibraryPermission.mockResolvedValue({ granted: true });
  mockLaunchLibrary.mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///picked.jpg', width: 100, height: 100 }],
  });
});

it('keeps a refused photo attachment pending without announcing attachment success', async () => {
  mockAddFlagPhoto.mockRejectedValueOnce(new FlagPhotoAttachmentUnavailableError());
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  try {
    const { screen } = renderDetail();
    await screen.findByLabelText('Add photo');
    fireEvent.press(screen.getByLabelText('Add photo'));
    const sourceAlert = alertSpy.mock.calls.find(([title]) => title === 'Add photo');
    expect(sourceAlert).toBeDefined();
    const library = sourceAlert?.[2]?.find((choice) => choice.text === 'Choose from library');
    await act(async () => { await library?.onPress?.(); });
    expect(screen.getByLabelText('Photo ready to attach')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Attach photo'));
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(
      'Could not upload photo', new FlagPhotoAttachmentUnavailableError().message,
    ));
    expect(mockAddFlagPhoto).toHaveBeenCalledWith(FLAG.id, 'file:///picked.jpg', 100, 100, '');
    expect(screen.getByLabelText('Photo ready to attach')).toBeTruthy();
    expect(screen.getByLabelText('Attach photo')).toBeTruthy();
    expect(mockListFlagPhotos).toHaveBeenCalledTimes(1);
    expect(announceSpy).not.toHaveBeenCalledWith('Photo attached.');
  } finally {
    alertSpy.mockRestore();
    announceSpy.mockRestore();
  }
});

it('keeps any flag visible on repeated deletion refusal', async () => {
  mockDeleteFlag.mockRejectedValue(new FlagDeletionUnavailableError());
  const { screen, onDeleted, onClose } = renderDetail();
  await screen.findByLabelText('Delete this flag');

  fireEvent.press(screen.getByLabelText('Delete this flag'));
  await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(
    'Could not delete flag', new FlagDeletionUnavailableError().message,
  ));
  expect(mockConfirm).toHaveBeenCalledWith(
    'Delete this flag?', 'This permanently removes your report. This cannot be undone.', 'Delete', true,
  );
  expect(mockDeleteFlag).toHaveBeenCalledWith(FLAG.id);
  expect(onDeleted).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Delete this flag')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Delete this flag'));
  await waitFor(() => expect(mockDeleteFlag).toHaveBeenCalledTimes(2));
  expect(onDeleted).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
