// OS notification-permission priming for the first-launch welcome: status and
// prompt only, no token and no database write. Kept apart from
// pushNotifications.ts (which re-exports both) so the welcome doesn't pull the
// Supabase client into the web entry chunk.

import { Platform } from 'react-native';
import { loadNotifications } from './loadNotifications';

// The slice of the expo-notifications API used here (see pushNotifications.ts).
interface NotificationPermissionsModule {
  getPermissionsAsync(): Promise<{ status: string }>;
  requestPermissionsAsync(): Promise<{ status: string }>;
}

/**
 * Read the current OS notification-permission status WITHOUT prompting.
 * Mirrors expo-location's getForegroundPermissionsAsync for the onboarding
 * notifications slide, so a returning user who already granted sees a
 * "you're set" state instead of a redundant button.
 *
 * Returns `true`/`false` for granted/denied, or `null` when we can't tell
 * (web, or expo-notifications not installed) — the caller treats `null` as
 * "no native prompt available here, just continue".
 */
export async function getNotificationPermission(): Promise<boolean | null> {
  try {
    if (Platform.OS === 'web') return null;
    // The existing native permission flow keeps its synchronous SDK lookup.
    const Notifications = loadNotifications() as NotificationPermissionsModule;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return null;
  }
}

/**
 * Fire the OS notification-permission prompt (permission priming only — no
 * token, no DB write). Used by the first-launch onboarding, which runs
 * BEFORE sign-in, so there is no userId to attach a token to yet. The token
 * is registered later by the post-sign-in Settings toggle / enablePushNotifications.
 *
 * Returns true if permission ends up granted. Degrades to false on web or if
 * expo-notifications is absent — denying must never block onboarding.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const Notifications = loadNotifications() as NotificationPermissionsModule;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}
