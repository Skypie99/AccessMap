import { Alert, Linking, Platform } from 'react-native';
import { errorMessage } from './errors';

/**
 * Open the user's native maps app with walking directions to a point.
 *
 * Per-platform URL scheme:
 *   iOS:     maps://?daddr=<lat>,<lng>&dirflg=w
 *            (Apple Maps. dirflg=w = walking.)
 *   Android: geo:<lat>,<lng>?q=<lat>,<lng>(<label>)
 *            (Android picks the default maps app; most users have
 *            Google Maps. The label after the q= renders as the pin
 *            title in the chooser.)
 *   web:     https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=walking
 *            (Google Maps web — works in any browser, no auth.)
 *
 * Why platform-split instead of always Google Maps:
 *   - On iOS, the user may not have Google Maps installed; Apple Maps
 *     is guaranteed.
 *   - On Android, the geo: scheme lets the OS pick (respects the user's
 *     default maps app choice).
 *   - On web, no native app to launch, so a direct URL is the only
 *     option.
 *
 * Walking mode by default — AccessMap is fundamentally a pedestrian
 * accessibility tool, so driving directions would be the wrong default.
 */
export async function openDirections(
  lat: number,
  lng: number,
  label?: string,
): Promise<void> {
  const url = buildDirectionsUrl(Platform.OS, lat, lng, label);
  try {
    // Skip canOpenURL on web (browsers handle it inline) and on iOS for
    // the maps:// scheme since canOpenURL on iOS requires the scheme to
    // be declared in app.json's LSApplicationQueriesSchemes for non-web
    // returns to be reliable — easier to just try openURL and trust the
    // OS to handle it.
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert(
      "Couldn't open maps",
      `${errorMessage(e, 'No maps app responded.')}\n\nLocation:\n${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    );
  }
}

/**
 * Build the platform-appropriate directions URL. Exported separately so
 * it's unit-testable without needing to mock Linking.openURL.
 */
export function buildDirectionsUrl(
  platform: typeof Platform.OS,
  lat: number,
  lng: number,
  label?: string,
): string {
  // Coordinate-precision matches what the rest of the app uses elsewhere
  // (5 decimals is ~1m, plenty for street-level directions).
  const latStr = lat.toFixed(5);
  const lngStr = lng.toFixed(5);
  const safeLabel = (label ?? 'AccessMap flag').slice(0, 80);
  if (platform === 'ios') {
    // dirflg=w → walking. saddr omitted → uses current location.
    return `maps://?daddr=${latStr},${lngStr}&dirflg=w`;
  }
  if (platform === 'android') {
    // geo: lets Android pick the default maps app. q= places a pin at
    // the destination with the provided label.
    return `geo:${latStr},${lngStr}?q=${latStr},${lngStr}(${encodeURIComponent(safeLabel)})`;
  }
  // web (and any other platform) — Google Maps URL with walking mode.
  return `https://www.google.com/maps/dir/?api=1&destination=${latStr},${lngStr}&travelmode=walking`;
}
