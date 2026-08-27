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

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'ios');
  mockGetLastKnown.mockResolvedValue(null);
  mockGetCurrent.mockResolvedValue({ coords: { latitude: 49.8874, longitude: -119.4925 } });
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
