/**
 * FDA-003 / Phase 04B — the Profile account-deletion flow, end to end at the
 * screen level (FDA-014: destructive paths had no screen-level tests).
 *
 * The REAL deletion client runs here — src/lib/account.ts,
 * src/lib/accountDeletionReceipt.ts (on the jest SecureStore mock) and the
 * production capability default — with only the network boundary mocked:
 * `supabase.functions.invoke` stands in for deployed `delete-account` v4,
 * which deletes synchronously and answers 200 {status:'deleted'} or
 * 500 {status:'error'} (archived Phase 02A capture). Nothing contacts a
 * backend. `signOut` and `notify` are mocked so the tests can read exactly
 * what the person is told.
 *
 * Invariants pinned:
 *   - a confirmed deletion is announced once and never as a failure;
 *   - an unconfirmed reply is never announced as success, never signs out,
 *     and is never re-sent automatically;
 *   - one confirmation press sends at most one request;
 *   - the absent async status route is never called.
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, configure, fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../ProfileScreen';
import {
  clearAccountDeletionReceipt,
  getOrCreateAccountDeletionReceipt,
  isConfirmedAccountDeletionReceipt,
  loadAccountDeletionReceipts,
  markAccountDeletionReceiptConfirmed,
} from '@/lib/accountDeletionReceipt';

configure({ asyncUtilTimeout: 10_000 });

const USER_ID = 'a921b42e-4953-4f0b-a42e-55d2fa5a7710';
const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockNotify = jest.fn();
const mockConfirm = jest.fn();
let mockAsyncStatusAvailable = false;

jest.mock('expo-crypto', () => ({
  randomUUID: () => '94cd495b-d74a-45c3-8ca0-89548ec9e3ef',
  getRandomBytesAsync: async () => Uint8Array.from({ length: 32 }, (_, index) => index),
}));
jest.mock('@/lib/supabase', () => ({
  __esModule: true,
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: () => {
      throw new Error('unexpected table access in the deletion test');
    },
  },
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('@/lib/accountDeletionAvailability', () => ({
  ...jest.requireActual('@/lib/accountDeletionAvailability'),
  accountDeletionAsyncStatusAvailable: () => mockAsyncStatusAvailable,
}));
jest.mock('@/lib/confirm', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));
jest.mock('@/lib/auth', () => {
  const user = { id: 'a921b42e-4953-4f0b-a42e-55d2fa5a7710', email: 'person@example.com' };
  return { useAuth: () => ({ user, loading: false }) };
});

// Jest's CommonJS runner cannot execute the screen's dynamic import (the lazy
// FlagDetailModal leaf). Same precedent as TasksScreen.guestHandoff.test.tsx:
// React stays real; only `lazy` returns a synchronous leaf that renders nothing.
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, lazy: () => () => null };
});

// Screen scaffolding that is irrelevant to deletion.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: () => undefined,
}));
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 0 }));
jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  return {
    useSafeAreaInsets: () => insets,
    SafeAreaInsetsContext: ReactActual.createContext(insets),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  };
});
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/lib/drawerContext', () => ({ useDrawer: () => ({ setOpen: jest.fn() }) }));
jest.mock('@/lib/sharedModalsContext', () => ({ useSharedModals: () => ({ setOpen: jest.fn() }) }));
jest.mock('@/lib/flagsStore', () => ({ useFlags: () => ({ flags: [] }) }));
jest.mock('@/lib/location', () => ({ useUserLocation: () => ({ location: null }) }));
jest.mock('@/lib/realtimePrefs', () => ({
  useRealtimeEnabled: () => ({ realtimeEnabled: false, setRealtimeEnabled: jest.fn() }),
}));
jest.mock('@/lib/users', () => ({
  getInitials: () => 'P',
  updateUserProfile: jest.fn(),
  uploadAvatar: jest.fn(),
  withAvatarDisplayUrl: (value: unknown) => value,
}));
jest.mock('@/lib/flags', () => ({
  CATEGORY_LABELS: {},
  SEVERITY_LABELS: {},
  STATUS_LABELS: {},
  fetchFlagsByIds: jest.fn(async () => []),
  listFlagsByUser: jest.fn(async () => []),
}));
jest.mock('@/lib/flagUpdates', () => ({
  diffUpdates: jest.fn(() => []),
  loadLastSeen: jest.fn(async () => ({})),
  markAllSeen: jest.fn(async () => undefined),
}));
jest.mock('@/lib/watchedFlags', () => ({ loadWatched: jest.fn(async () => []) }));
jest.mock('@/lib/streak', () => {
  const actual = jest.requireActual('@/lib/streak');
  return { ...actual, loadStreak: jest.fn(async () => actual.EMPTY_STREAK), tickVisit: jest.fn() };
});
jest.mock('@/lib/preferences', () => ({
  ...jest.requireActual('@/lib/preferences'),
  getDefaultTab: jest.fn(() => new Promise(() => undefined)),
  setDefaultTab: jest.fn(),
}));
jest.mock('@/lib/points', () => ({ setLastSeenPoints: jest.fn() }));
jest.mock('@/lib/pointEvents', () => ({
  getLifetimeReportOutcomes: jest.fn(async () => ({ verified: 0, resolved: 0 })),
  getPointEventHistory: jest.fn(async () => []),
  pointEventLabel: () => '',
}));
jest.mock('@/lib/onboardingState', () => ({ clearOnboarded: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ hapticSelection: jest.fn() }));
jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: () => true,
}));
jest.mock('@/components/ui/GlassSurface', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    GlassSurface: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, rest, children),
  };
});
jest.mock('@/components/ui/ScreenStage', () => ({ ScreenStage: () => null }));
jest.mock('@/components/ui/ScreenHeader', () => ({ ScreenHeader: () => null }));
jest.mock('@/components/ui/HeaderActions', () => ({ HeaderActions: () => null }));
jest.mock('@/components/ui/RemoteImage', () => ({ RemoteImage: () => null }));
jest.mock('@/screens/GuestProfile', () => ({ GuestProfile: () => null }));
jest.mock('@/screens/SignInScreen', () => () => null);
jest.mock('@/screens/AboutScreen', () => () => null);
jest.mock('@/screens/LeaderboardScreen', () => () => null);
jest.mock('@/components/MyReportsModal', () => () => null);
jest.mock('@/components/MyWatchedModal', () => () => null);
jest.mock('@/components/FlagDetailModal', () => () => null);
jest.mock('@/components/ActivityFeedModal', () => () => null);
jest.mock('@/components/UpdateBanner', () => () => null);
jest.mock('@/components/NotificationPrefsModal', () => () => null);
jest.mock('@/components/AchievementsModal', () => () => null);
jest.mock('@/components/RecentlyViewedRow', () => () => null);
jest.mock('@/components/ReportsBreakdownCard', () => () => null);
jest.mock('@/components/TierIcon', () => () => null);

const SUCCESS_TITLE = 'Account deleted';
const SUCCESS_BODY = 'Your account has been deleted, and this device is signed out.';
const UNCONFIRMED_TITLE = 'Could not confirm deletion request';
const TERMINAL_BODY = 'Your account has been deleted. This device has not finished signing out.';

const httpError = (status: number) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: { status },
});
const fetchError = { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function', context: {} };

const edgeCalls = () => mockInvoke.mock.calls.map(([name]) => name as string);
const titles = () => mockNotify.mock.calls.map(([title]) => title as string);

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

async function renderProfile() {
  const u = render(<ProfileScreen />);
  // The mount-time receipt read settles before any interaction.
  await act(async () => undefined);
  return u;
}

function openConfirmation(u: ReturnType<typeof render>) {
  fireEvent.press(u.getByLabelText('Delete Account'));
  return u.getByLabelText('Delete Account, confirm');
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockAsyncStatusAvailable = false;
  mockSignOut.mockResolvedValue({ error: null });
  mockConfirm.mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  await clearAccountDeletionReceipt();
});

afterEach(() => {
  // The async status and review routes are absent from the deployed backend.
  expect(edgeCalls()).not.toContain('account-deletion-status');
  expect(edgeCalls()).not.toContain('account-deletion-review');
});

describe('confirmed deletion (deployed v4 status=deleted)', () => {
  it('sends one request, signs out, clears the receipt, and announces success exactly once', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });
    const u = await renderProfile();

    fireEvent.press(openConfirmation(u));
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(SUCCESS_TITLE, SUCCESS_BODY));

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(titles()).not.toContain(UNCONFIRMED_TITLE);
    expect(edgeCalls()).toEqual(['delete-account']);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
    await expect(loadAccountDeletionReceipts()).resolves.toEqual([]);
    // The settled confirmation is closed; nothing is left to press again.
    await waitFor(() => expect(u.queryByLabelText('Delete Account, confirm')).toBeNull());
  });
});

describe('duplicate activation', () => {
  it('a rapid double press sends exactly one request and announces once', async () => {
    const reply = deferred<unknown>();
    mockInvoke.mockReturnValue(reply.promise);
    const u = await renderProfile();

    const confirmButton = openConfirmation(u);
    // Both presses land inside one act scope, i.e. BEFORE React re-renders the
    // button as disabled — only the handler's own lock can stop the second.
    await act(async () => {
      fireEvent.press(confirmButton);
      fireEvent.press(confirmButton);
    });
    fireEvent.press(u.getByLabelText('Delete Account, confirm'));

    await act(async () => reply.resolve({ data: { status: 'deleted' }, error: null }));
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(SUCCESS_TITLE, SUCCESS_BODY));
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('keeps the confirmation busy and disabled — and locked across a re-render — while the request is pending', async () => {
    const reply = deferred<unknown>();
    mockInvoke.mockReturnValue(reply.promise);
    const u = await renderProfile();

    fireEvent.press(openConfirmation(u));
    await act(async () => undefined);
    const busy = u.getByLabelText('Delete Account, confirm');
    expect(busy.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(u.getByLabelText('Cancel account deletion').props.accessibilityState).toMatchObject({ disabled: true });

    u.rerender(<ProfileScreen />);
    fireEvent.press(u.getByLabelText('Delete Account, confirm'));
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    await act(async () => reply.resolve({ data: null, error: fetchError }));
    await waitFor(() => expect(titles()).toContain(UNCONFIRMED_TITLE));
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});

describe('unconfirmed replies never show success and never sign out', () => {
  it.each([
    ['network timeout after the request may have completed', { data: null, error: fetchError }, 'network'],
    ['explicit v4 error (500)', { data: null, error: httpError(500) }, 'server'],
    ['401 — session not verified', { data: null, error: httpError(401) }, 'auth'],
    ['malformed reply', { data: '<html>502</html>', error: null }, 'malformed'],
    ['status=requested without the async capability', { data: { status: 'requested' }, error: null }, 'async_unavailable'],
  ] as const)('%s', async (_label, reply) => {
    mockInvoke.mockResolvedValue(reply);
    const u = await renderProfile();

    fireEvent.press(openConfirmation(u));
    await waitFor(() => expect(mockNotify).toHaveBeenCalledTimes(1));

    const [title, body] = mockNotify.mock.calls[0] as [string, string];
    expect(title).toBe(UNCONFIRMED_TITLE);
    expect(body).toContain("can't confirm whether your account was deleted");
    expect(body).toContain('It did not try again.');
    expect(titles()).not.toContain(SUCCESS_TITLE);
    // No automatic retry, no sign-out, receipt kept for a deliberate later attempt.
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();
    const kept = await loadAccountDeletionReceipts();
    expect(kept).toHaveLength(1);
    expect(isConfirmedAccountDeletionReceipt(kept[0])).toBe(false);
    // Safe recoverable state: signed in, confirmation closed, Delete available,
    // and no async status workflow on screen.
    await waitFor(() => expect(u.queryByLabelText('Delete Account, confirm')).toBeNull());
    expect(u.getByLabelText('Delete Account').props.accessibilityState?.disabled).not.toBe(true);
    expect(u.queryByText('Account deletion status')).toBeNull();
    expect(u.queryByLabelText('Check account deletion status')).toBeNull();
    expect(u.queryByText(TERMINAL_BODY)).toBeNull();
  });

  it('a deliberate second attempt goes through the confirmation again', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: fetchError });
    const u = await renderProfile();
    fireEvent.press(openConfirmation(u));
    await waitFor(() => expect(titles()).toEqual([UNCONFIRMED_TITLE]));
    await waitFor(() => expect(u.queryByLabelText('Delete Account, confirm')).toBeNull());

    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    fireEvent.press(openConfirmation(u));
    await waitFor(() => expect(mockNotify).toHaveBeenLastCalledWith(SUCCESS_TITLE, SUCCESS_BODY));
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});

describe('confirmed deletion, local sign-out failed', () => {
  it('says the account was deleted (never failed), shows the terminal state, and blocks a second request', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce({ error: new Error('offline') });
    const u = await renderProfile();

    fireEvent.press(openConfirmation(u));
    await waitFor(() => expect(mockNotify).toHaveBeenCalledTimes(1));
    const [title, body] = mockNotify.mock.calls[0] as [string, string];
    expect(title).toBe(SUCCESS_TITLE);
    expect(body).toMatch(/^Your account was deleted, but this device could not finish signing out\./);
    expect(titles()).not.toContain(UNCONFIRMED_TITLE);

    await waitFor(() => expect(u.getByText(TERMINAL_BODY)).toBeTruthy());
    expect(u.getByLabelText('Delete Account').props.accessibilityState).toMatchObject({ disabled: true });
    // The terminal confirmation survives on the device for a relaunch.
    const [stored] = await loadAccountDeletionReceipts();
    expect(isConfirmedAccountDeletionReceipt(stored)).toBe(true);

    // Finishing the sign-out never sends another deletion request.
    fireEvent.press(u.getByLabelText('Finish signing out'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(2));
    await waitFor(async () => expect(await loadAccountDeletionReceipts()).toEqual([]));
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});

describe('relaunch', () => {
  it('after a confirmed deletion whose sign-out never finished: terminal state, no request of any kind', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(USER_ID);
    await markAccountDeletionReceiptConfirmed(receipt);

    const u = await renderProfile();
    await waitFor(() => expect(u.getByText(TERMINAL_BODY)).toBeTruthy());
    expect(u.getByLabelText('Delete Account').props.accessibilityState).toMatchObject({ disabled: true });
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();

    fireEvent.press(u.getByLabelText('Finish signing out'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith(USER_ID));
    await waitFor(async () => expect(await loadAccountDeletionReceipts()).toEqual([]));
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('with an unconfirmed receipt from an earlier attempt: no status call, no status card, Delete stays available', async () => {
    await getOrCreateAccountDeletionReceipt(USER_ID);

    const u = await renderProfile();
    await act(async () => undefined);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(u.queryByText('Account deletion status')).toBeNull();
    expect(u.queryByLabelText('Check account deletion status')).toBeNull();
    expect(u.queryByText(TERMINAL_BODY)).toBeNull();
    expect(u.getByLabelText('Delete Account').props.accessibilityState?.disabled).not.toBe(true);
  });
});

describe('Phase 05 async protocol stays behind its capability', () => {
  it('with the capability present, REQUESTED signs out and is not announced as a completed deletion', async () => {
    mockAsyncStatusAvailable = true;
    mockInvoke.mockImplementation(async (name: string) =>
      name === 'delete-account'
        ? { data: { status: 'requested', requestedAt: '2026-09-21T00:00:00Z' }, error: null }
        : { data: { status: 'REQUESTED', requestedAt: '2026-09-21T00:00:00Z', completedAt: null }, error: null },
    );
    const u = await renderProfile();

    fireEvent.press(openConfirmation(u));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith(USER_ID));
    expect(titles()).not.toContain(SUCCESS_TITLE);
    expect(titles()).not.toContain(UNCONFIRMED_TITLE);
    // Allowed only here: the capability is explicitly present in this test.
    mockInvoke.mockReset();
  });
});
