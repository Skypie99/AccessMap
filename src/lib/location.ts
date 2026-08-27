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
import { Platform } from 'react-native';
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

/**
 * Native `getCurrentPositionAsync` with a hard timeout. expo-location can hang
 * indefinitely when the GPS never gets a fix (tunnel, indoors, airplane mode),
 * leaving the caller stuck on a spinner forever. We race the read against a
 * 15s timer and reject if it wins, so the caller's existing catch can surface a
 * friendly error. Shared by this hook and MapScreen so both sites behave the same.
 */
export function getCurrentPositionWithTimeout(
  options: Location.LocationOptions,
  timeoutMs = 15_000,
): Promise<Location.LocationObject> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Location request timed out. Check your signal and try again.')),
      timeoutMs,
    );
  });
  return Promise.race([Location.getCurrentPositionAsync(options), timeout]).finally(() =>
    clearTimeout(timer),
  );
}

/**
 * Decide what MapScreen's initial-mount effect should do, given the OS
 * foreground-permission status (probed WITHOUT prompting on mount).
 *
 * MapScreen starts with `locating = true` and shows a "Finding your location…"
 * spinner. The mount effect only fetches when permission is ALREADY granted
 * (the first-time prompt is deferred to onboarding). This helper names the two
 * outcomes so the rule is explicit and unit-tested:
 *
 *   'granted'     → 'fetch'  (requestLocation clears the spinner in its finally)
 *   anything else → 'clear'  (undetermined on first run, or denied): skip the
 *                   fetch and clear `locating` NOW — otherwise the spinner
 *                   hangs forever over an otherwise-working map. The locate
 *                   button / onboarding still trigger the real OS prompt.
 */
export function initialLocationAction(
  status: Location.PermissionStatus | string,
): 'fetch' | 'clear' {
  return status === 'granted' ? 'fetch' : 'clear';
}

/**
 * S4 (L3-2): whether the Map's denied-location banner should surface on ARRIVAL,
 * given the RAW foreground-permission status.
 *
 * `initialLocationAction` deliberately collapses `undetermined` (first run,
 * prompt deferred to onboarding) and `denied` into one `'clear'` outcome. The
 * arrival banner must NOT ride that whole branch: a never-asked first-run user
 * would be told "location is off" they never turned off. Only a genuine prior
 * `'denied'` qualifies — everything else (including `undetermined`) stays false,
 * so a first-run arrival makes no false claim. Companion to
 * `initialLocationAction`, which is unchanged.
 */
export function arrivalPermissionDenied(
  status: Location.PermissionStatus | string,
): boolean {
  return status === 'denied';
}

/** What Home's map-peek caption is allowed to claim about the location probe. */
export type PeekLocationState = 'located' | 'locating' | 'default';

/**
 * D4/C2: collapse the probe's four-field state into the ONE claim the peek
 * caption is entitled to make.
 *
 * The honesty rule is that only a genuine in-flight read may say "Finding your
 * location…". Denied, undetermined, errored and timed-out are all indistinguishable
 * from the user's side — the map simply shows its default region — so they all
 * collapse to `'default'` and the caption renders nothing rather than narrating
 * a search that isn't happening. `permissionDenied` is checked explicitly even
 * though the hook also clears `loading` on that path, so the claim can't survive
 * a future refactor that reorders those.
 *
 * Companion to `initialLocationAction` / `arrivalPermissionDenied`: same house
 * pattern of naming a UI outcome as a pure, unit-tested function instead of
 * scattering the condition through JSX.
 *
 * NOTE the caller still owes a reveal delay — see HomeScreen. A denied check
 * returns in milliseconds, and painting "Finding your location…" for one frame
 * on the way to "denied" would be a false claim, just a brief one.
 */
export function peekLocationState(probe: {
  location: LatLng | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
}): PeekLocationState {
  if (probe.location) return 'located';
  if (probe.loading && !probe.error && !probe.permissionDenied) return 'locating';
  return 'default';
}

export interface UseUserLocationOptions {
  /**
   * When true, only fetch the location if foreground permission has
   * already been granted — NEVER triggers the OS permission prompt.
   *
   * Used by passive Profile and Tasks distance decoration (Constitution Art.
   * 9.6 — Sky's directive: privacy-sensitive prompts must be user-initiated,
   * not surfaced on tab focus). When permission isn't already granted,
   * `permissionDenied` stays true and `location` stays null — the caller
   * renders nothing.
   *
   * Default false is reserved for explicitly initiated location paths.
   */
  requireExistingPermission?: boolean;
}

export function useUserLocation(options: UseUserLocationOptions = {}): UserLocationState {
  const { requireExistingPermission = false } = options;
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
      // Web path — use the browser Geolocation API instead of expo-location,
      // which is native-only. Behaviour mirrors the native path: permission
      // denial → permissionDenied=true, position success → location set.
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          if (mountedRef.current) {
            setPermissionDenied(true);
            setLocation(null);
          }
          return;
        }
        // Browsers may prompt from getCurrentPosition(). Passive consumers use
        // requireExistingPermission, so query the no-prompt Permissions API
        // first and degrade to location-free UI unless access is already
        // granted. If the browser cannot answer, privacy wins over decoration.
        if (requireExistingPermission) {
          try {
            const permission = await navigator.permissions?.query({ name: 'geolocation' });
            if (permission?.state !== 'granted') {
              if (mountedRef.current) {
                setPermissionDenied(true);
                setLocation(null);
              }
              return;
            }
          } catch {
            if (mountedRef.current) {
              setPermissionDenied(true);
              setLocation(null);
            }
            return;
          }
        }
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (mountedRef.current) {
                setPermissionDenied(false);
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              }
              resolve();
            },
            () => {
              if (mountedRef.current) {
                setPermissionDenied(true);
                setLocation(null);
              }
              resolve();
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
          );
        });
        return;
      }

      // Native path — expo-location.
      // Privacy gate (Const. Art. 9.6): if requireExistingPermission is on,
      // use the no-prompt status check. Otherwise (default) request, which
      // will surface the OS prompt the first time.
      const { status } = requireExistingPermission
        ? await Location.getForegroundPermissionsAsync()
        : await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) {
          setPermissionDenied(true);
          setLocation(null);
        }
        return;
      }
      if (mountedRef.current) setPermissionDenied(false);
      // Battery: try a cached fix first (no GPS power) before forcing a fresh
      // lock. Tasks only needs a rough position to sort cards by distance, so a
      // fix up to 60s old is plenty. getLastKnownPositionAsync returns null if
      // there's no recent-enough cached fix, in which case we fall back to a
      // live read. (expo-location has no `maximumAge` on getCurrentPositionAsync
      // — that's the browser geolocation option used on the web path above.)
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
        (await getCurrentPositionWithTimeout({
          accuracy: Location.Accuracy.Balanced,
        }));
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
  }, [requireExistingPermission]);

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
