import { Platform } from 'react-native';

/**
 * Travel mode for the directions handoff. AccessMap is pedestrian-first
 * (wheelchairs, walkers, sidewalks) so `'walking'` is the default — callers
 * can override per-call if a future feature ever needs driving / transit.
 */
export type TravelMode = 'walking' | 'driving' | 'transit';

/**
 * Returns the platform-appropriate "Get directions to" URL for a destination.
 *
 * iOS:     `maps:?daddr=lat,lng&dirflg=w`
 *          Apple Maps. `dirflg=w` = walking. If the user has uninstalled
 *          Apple Maps (rare — it's a system app), iOS falls back to Google
 *          Maps when handed the `maps:` scheme.
 * Android: `google.navigation:q=lat,lng&mode=w`
 *          Google Maps navigation intent — carries the `mode=w` flag
 *          reliably (the generic `geo:` URI tends to drop the mode hint
 *          when the chooser picks a non-Google app). On the rare device
 *          without Google Maps the OS will surface a chooser anyway.
 * Web:     `https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=walking`
 *          Universal Google Maps deep link — opens in the user's browser
 *          map of choice (Google Maps web app on desktop, Google Maps app
 *          on mobile browsers if installed).
 *
 * Pure URL formatter — no network, no Linking, no side effects. Lets us
 * unit-test the per-platform branching without mocking Linking.openURL.
 * The actual `Linking.openURL(...)` call happens at the caller (e.g.
 * FlagDetailModal's Directions button).
 *
 * `platformOverride` is for tests only — production callers omit it and
 * the function reads `Platform.OS`.
 *
 * Walking mode by default — AccessMap is fundamentally a pedestrian
 * accessibility tool, so driving directions would be the wrong default.
 * Pass `{ mode: 'driving' }` or `{ mode: 'transit' }` to override.
 */
export function getDirectionsUrl(
  lat: number,
  lng: number,
  options?: { mode?: TravelMode; platformOverride?: 'ios' | 'android' | 'web' },
): string {
  const mode = options?.mode ?? 'walking';
  const p = options?.platformOverride ?? Platform.OS;

  if (p === 'ios') {
    // Apple Maps: dirflg=w walking, d driving, r transit.
    const flag = mode === 'walking' ? 'w' : mode === 'driving' ? 'd' : 'r';
    return `maps:?daddr=${lat},${lng}&dirflg=${flag}`;
  }

  if (p === 'android') {
    // Google Maps navigation intent — mode=w walking, d driving, transit.
    const flag = mode === 'walking' ? 'w' : mode === 'driving' ? 'd' : 'transit';
    return `google.navigation:q=${lat},${lng}&mode=${flag}`;
  }

  // Web (and any other platform): Google Maps universal directions link.
  // travelmode accepts the full word.
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${mode}`;
}
