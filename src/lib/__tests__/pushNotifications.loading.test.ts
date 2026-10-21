import { Platform } from 'react-native';

const mockLoadNotifications = jest.fn();
const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetToken = jest.fn();

jest.mock('expo-notifications', () => {
  mockLoadNotifications();
  return {
    getPermissionsAsync: mockGetPermissions,
    requestPermissionsAsync: mockRequestPermissions,
    getExpoPushTokenAsync: mockGetToken,
  };
});
jest.mock('../supabase', () => ({ supabase: {} }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));

const originalOS = Platform.OS;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockGetPermissions.mockResolvedValue({ status: 'granted' });
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockGetToken.mockResolvedValue({ data: 'synthetic-notification-test-value' });
});

afterAll(() => Object.defineProperty(Platform, 'OS', { value: originalOS }));

function helpers(platform: 'ios' | 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Platform: currentPlatform } = require('react-native') as typeof import('react-native');
  Object.defineProperty(currentPlatform, 'OS', { value: platform });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../pushNotifications') as typeof import('../pushNotifications');
}

test('importing notification helpers does not load the optional native SDK', async () => {
  await helpers('ios');
  expect(mockLoadNotifications).not.toHaveBeenCalled();
});

test('web permission checks keep their no-prompt fallback without loading the SDK', async () => {
  const api = await helpers('web');
  await expect(api.getNotificationPermission()).resolves.toBeNull();
  await expect(api.requestNotificationPermission()).resolves.toBe(false);
  expect(mockLoadNotifications).not.toHaveBeenCalled();
});

test('native permission reads load on demand and never request permission', async () => {
  const api = await helpers('ios');
  await expect(api.getNotificationPermission()).resolves.toBe(true);
  expect(mockLoadNotifications).toHaveBeenCalledTimes(1);
  expect(mockGetPermissions).toHaveBeenCalledTimes(1);
  expect(mockRequestPermissions).not.toHaveBeenCalled();
});

test('native permission requests preserve the existing denied-to-granted flow', async () => {
  const api = await helpers('ios');
  mockGetPermissions.mockResolvedValue({ status: 'denied' });
  await expect(api.requestNotificationPermission()).resolves.toBe(true);
  expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
  expect(mockGetToken).not.toHaveBeenCalled();
});

test('a denied permission still prevents requesting a notification token', async () => {
  const api = await helpers('ios');
  mockGetPermissions.mockResolvedValue({ status: 'denied' });
  mockRequestPermissions.mockResolvedValue({ status: 'denied' });
  await expect(api.requestExpoPushToken()).resolves.toBeNull();
  expect(mockGetToken).not.toHaveBeenCalled();
});

test('an existing grant skips the permission prompt and preserves the returned value', async () => {
  const api = await helpers('ios');
  await expect(api.requestExpoPushToken()).resolves.toBe('synthetic-notification-test-value');
  expect(mockRequestPermissions).not.toHaveBeenCalled();
  expect(mockGetToken).toHaveBeenCalledWith(undefined);
});
