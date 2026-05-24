import { Platform } from 'react-native';

/**
 * Returns the platform-appropriate "Get directions to" URL for a destination.
 *
 * iOS:     `maps:?daddr=lat,lng`
 *          Apple Maps. If the user has uninstalled Apple Maps (rare —
 *          it's a system app), iOS falls back to Google Maps when handed
 *          the `maps:` scheme.
 * Android: `geo:lat,lng?q=lat,lng`
 *          Opens the system map chooser — usually Google Maps but
 *          respects whatever the user has set as their default.
 * Web:     `https://www.google.com/maps/dir/?api=1&destination=lat,lng`
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
 * No mode flag (walking/driving) — we leave the choice to the user's
 * maps app. The pure handoff is intentional: AccessMap is not in the
 * routing business.
 */
export function getDirectionsUrl(
  lat: number,
  lng: number,
  platformOverride?: 'ios' | 'android' | 'web',
): string {
  const p = platformOverride ?? Platform.OS;
  if (p === 'ios') return `maps:?daddr=${lat},${lng}`;
  if (p === 'android') return `geo:${lat},${lng}?q=${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
