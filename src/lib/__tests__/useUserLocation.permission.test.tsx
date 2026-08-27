import { Platform } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useUserLocation } from '../location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockGetPermission = Location.getForegroundPermissionsAsync as jest.Mock;
const mockRequestPermission = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockGetLastKnown = Location.getLastKnownPositionAsync as jest.Mock;
const mockGetCurrent = Location.getCurrentPositionAsync as jest.Mock;
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function installNavigator(value: Partial<Navigator>) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'ios');
  mockGetLastKnown.mockResolvedValue(null);
  mockGetCurrent.mockResolvedValue({ coords: { latitude: 49.8874, longitude: -119.4925 } });
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'navigator');
  }
});

describe('useUserLocation — existing-permission-only mode', () => {
  it('reads an already-granted one-shot location without requesting permission', async () => {
    mockGetPermission.mockResolvedValue({ status: 'granted' });
    mockGetLastKnown.mockResolvedValue({ coords: { latitude: 49.9, longitude: -119.5 } });

    const { result } = renderHook(() =>
      useUserLocation({ requireExistingPermission: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.location).toEqual({ lat: 49.9, lng: -119.5 });
    expect(mockGetPermission).toHaveBeenCalledTimes(1);
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockGetCurrent).not.toHaveBeenCalled();
  });

  it.each(['undetermined', 'denied'])('degrades without prompting when status is %s', async (status) => {
    mockGetPermission.mockResolvedValue({ status });

    const { result } = renderHook(() =>
      useUserLocation({ requireExistingPermission: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.location).toBeNull();
    expect(result.current.permissionDenied).toBe(true);
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockGetLastKnown).not.toHaveBeenCalled();
    expect(mockGetCurrent).not.toHaveBeenCalled();
  });
});

describe('useUserLocation — passive web privacy', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
  });

  it('degrades without querying permission when geolocation is unavailable', async () => {
    const query = jest.fn();
    installNavigator({ permissions: { query } as unknown as Permissions });

    const { result } = renderHook(() =>
      useUserLocation({ requireExistingPermission: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.location).toBeNull();
    expect(result.current.permissionDenied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(query).not.toHaveBeenCalled();
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('degrades without reading geolocation when the Permissions API is unavailable', async () => {
    const getCurrentPosition = jest.fn();
    installNavigator({
      geolocation: { getCurrentPosition } as unknown as Geolocation,
    });

    const { result } = renderHook(() =>
      useUserLocation({ requireExistingPermission: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.location).toBeNull();
    expect(result.current.permissionDenied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it.each(['denied', 'prompt'] as const)(
    'does not turn passive navigation into a geolocation read when permission is %s',
    async (state) => {
      const query = jest.fn().mockResolvedValue({ state });
      const getCurrentPosition = jest.fn();
      installNavigator({
        permissions: { query } as unknown as Permissions,
        geolocation: { getCurrentPosition } as unknown as Geolocation,
      });

      const { result } = renderHook(() =>
        useUserLocation({ requireExistingPermission: true }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith({ name: 'geolocation' });
      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(result.current.location).toBeNull();
      expect(result.current.permissionDenied).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockGetPermission).not.toHaveBeenCalled();
      expect(mockRequestPermission).not.toHaveBeenCalled();
    },
  );

  it('fails closed when the browser permission query rejects', async () => {
    const query = jest.fn().mockRejectedValue(new Error('permission query unavailable'));
    const getCurrentPosition = jest.fn();
    installNavigator({
      permissions: { query } as unknown as Permissions,
      geolocation: { getCurrentPosition } as unknown as Geolocation,
    });

    const { result } = renderHook(() =>
      useUserLocation({ requireExistingPermission: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(query).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(result.current.location).toBeNull();
    expect(result.current.permissionDenied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('reads one location only after the Permissions API reports granted', async () => {
    const query = jest.fn().mockResolvedValue({ state: 'granted' });
    const getCurrentPosition = jest.fn(
      (success: PositionCallback, _failure?: PositionErrorCallback, options?: PositionOptions) => {
        success({
          coords: { latitude: 49.9, longitude: -119.5 },
        } as GeolocationPosition);
        return options;
      },
    );
    installNavigator({
      permissions: { query } as unknown as Permissions,
      geolocation: { getCurrentPosition } as unknown as Geolocation,
    });

    const { result } = renderHook(() =>
      useUserLocation({ requireExistingPermission: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(query).toHaveBeenCalledWith({ name: 'geolocation' });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    });
    expect(result.current.location).toEqual({ lat: 49.9, lng: -119.5 });
    expect(result.current.permissionDenied).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('settles gracefully when an already-authorized geolocation read fails', async () => {
    const query = jest.fn().mockResolvedValue({ state: 'granted' });
    const getCurrentPosition = jest.fn(
      (_success: PositionCallback, failure?: PositionErrorCallback) => {
        failure?.({ code: 2, message: 'position unavailable' } as GeolocationPositionError);
      },
    );
    installNavigator({
      permissions: { query } as unknown as Permissions,
      geolocation: { getCurrentPosition } as unknown as Geolocation,
    });

    const { result } = renderHook(() =>
      useUserLocation({ requireExistingPermission: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(query).toHaveBeenCalledWith({ name: 'geolocation' });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result.current.location).toBeNull();
    expect(result.current.permissionDenied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });
});
