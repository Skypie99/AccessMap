/**
 * Tests for the notification-permission priming helpers in
 * src/lib/pushNotifications.ts — getNotificationPermission and
 * requestNotificationPermission.
 *
 * These are used by the first-launch onboarding (src/components/OnboardingCards.tsx),
 * which runs BEFORE sign-in, so they only read/request the OS permission —
 * no token, no DB write. We virtual-mock expo-notifications (an optional dep
 * that isn't installed until `npx expo install expo-notifications`) so we can
 * drive the permission status without a real OS prompt.
 */

// ── expo-notifications mock ─────────────────────────────────────────────────
// The helpers `require('expo-notifications')` dynamically. The package is a
// real installed dependency now (package.json: expo-notifications ~0.32),
// so this must be a REGULAR mock — not `{ virtual: true }`. A virtual mock
// of a module that physically exists is order-dependent: if another suite in
// the same Jest worker loads the real module first (pushNotifications.test.ts
// does), the virtual mock silently fails to apply, the helpers' require()
// throws, and 5 of these tests fail. Names are `mock`-prefixed because jest
// hoists jest.mock() above imports and forbids referencing non-`mock` vars.
import { getNotificationPermission, requestNotificationPermission } from '../pushNotifications';

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

// ── Supabase mock ───────────────────────────────────────────────────────────
// pushNotifications.ts imports the supabase client at module load. We never
// call it from the permission helpers, but mock it so importing the module
// doesn't spin up a real client (repo convention: stub supabase at the top).
jest.mock('../supabase', () => ({
  supabase: { from: jest.fn() },
}));

// Default Platform.OS under jest-expo is 'ios', so the helpers take the
// native path and hit our mocked expo-notifications.

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNotificationPermission', () => {
  it('returns true when the OS reports granted', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    await expect(getNotificationPermission()).resolves.toBe(true);
    // Read-only: must never prompt.
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns false when the OS reports denied / undetermined', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    await expect(getNotificationPermission()).resolves.toBe(false);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns null (not false) when the permissions API throws', async () => {
    // null = "can't tell here" so the UI shows a neutral Continue rather than
    // a false "not granted" state.
    mockGetPermissionsAsync.mockRejectedValueOnce(new Error('module unavailable'));
    await expect(getNotificationPermission()).resolves.toBeNull();
  });
});

describe('requestNotificationPermission', () => {
  it('returns true without prompting when permission is already granted', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts when undetermined and returns true on grant', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('prompts when undetermined and returns false on denial', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns false and does not throw when the permissions API throws', async () => {
    mockGetPermissionsAsync.mockRejectedValueOnce(new Error('module unavailable'));
    await expect(requestNotificationPermission()).resolves.toBe(false);
  });
});
