// One-shot location hook for non-Map screens.
//
// MapScreen owns its own location state (with imperative animate-to-me
// behavior). Other screens — currently Tasks, possibly more — just want
// to know "where is the user, roughly?" so they can sort or annotate
// rows by distance. This hook is that.
//
// Behavior:
// - Requests foreground permission on mount, once.
// - On grant: fetches a single Balanced-accuracy position and stores it.
// - On deny / error / web-without-permission: location stays null and
//   the screen gracefully degrades (no error surfaced to the user — the
//   caller decides how loud to be).
// - Returns a `refresh()` callback so a screen can manually retry (e.g.
//   after the user enables location in OS settings).
//
// Not a live tracker — Tasks doesn't need sub-second precision and
// continuous watching would burn battery for cards a triager scans for a
// few seconds.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from './distance';
import { errorMessage } from './errors';

export interface UserLocationState {
  location: LatLng | null;
  loading: boolean;
  /** True iff the permission request returned `denied`. */
  permissionDenied: boolean;
  /** Human-readable error message, or null. */
  error: string | null;
  refresh: () => void;
}

export function useUserLocation(): UserLocationState {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard async setState across unmount — the hook can be unmounted (tab
  // change) before expo-location resolves.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchLocation = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) {
          setPermissionDenied(true);
          setLocation(null);
        }
        return;
      }
      if (mountedRef.current) setPermissionDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!mountedRef.current) return;
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError(errorMessage(e, 'Could not get location.'));
        setLocation(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    loading,
    permissionDenied,
    error,
    refresh: fetchLocation,
  };
}
