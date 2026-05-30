// Push notification helpers.
// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).

// expo-notifications is an optional peer dependency — it must be installed
// separately with: npx expo install expo-notifications
// If it is missing at runtime, all functions degrade gracefully (no crash).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export const pushEnabledKey = (userId: string) => `@accessmap/push_enabled:${userId}`;

export async function getPushEnabled(userId: string): Promise<boolean> {
  try {
    // Only check AsyncStorage on native platforms (not web).
    if (Platform.OS === 'web') {
      return false; // Web doesn't use persistent storage for push preference
    }
    const val = await AsyncStorage.getItem(pushEnabledKey(userId));
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Show the PIPEDA-required in-app explanation before requesting OS permission.
 * Returns true if the user confirmed, false if they cancelled.
 */
export function showPushExplanation(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Push notifications',
      'Get notified when your flag is verified or resolved. You can turn this off anytime in Settings.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Enable', onPress: () => resolve(true) },
      ],
    );
  });
}

/**
 * Request the Expo push token after the user has confirmed the in-app
 * explanation. Returns the token string, or null if permissions were denied
 * or expo-notifications is not installed.
 *
 * DO NOT log the returned token value.
 */
// Type-only shape of the expo-notifications API surface we use.
// Defined locally so we don't import the package at the type level
// (it may not be installed yet — Sky must run `npx expo install expo-notifications`).
interface ExpoNotificationsModule {
  getPermissionsAsync(): Promise<{ status: string }>;
  requestPermissionsAsync(): Promise<{ status: string }>;
  getExpoPushTokenAsync(options?: { projectId?: string }): Promise<{ data: string }>;
  cancelAllScheduledNotificationsAsync(): Promise<void>;
}

/**
 * Request the Expo push token after the user has confirmed the in-app
 * explanation. Returns the token string, or null if permissions were denied
 * or expo-notifications is not installed.
 *
 * DO NOT log the returned token value.
 */
export async function requestExpoPushToken(): Promise<string | null> {
  try {
    // Dynamic require so the app doesn't crash if expo-notifications is absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const Notifications = require('expo-notifications') as ExpoNotificationsModule;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // getExpoPushTokenAsync requires a projectId on SDK 49+.
    // Read from the Expo config at runtime to avoid hard-coding it.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch {
    // expo-notifications not installed, or permissions API unavailable (e.g. web).
    return null;
  }
}

/**
 * Save a push token to the database (upsert handles OS token rotation on
 * reinstall). Also persists the preference to AsyncStorage (native only).
 *
 * DO NOT log the token parameter.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  const platform = Platform.OS as 'ios' | 'android' | 'web';
  // Upsert — handles OS token rotation on reinstall.
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform }, { onConflict: 'user_id' });
  if (error) throw error;

  // Persist preference to AsyncStorage (native platforms only).
  if (Platform.OS !== 'web') {
    await AsyncStorage.setItem(pushEnabledKey(userId), 'true');
  }
}

/**
 * Delete the user's push token from the database and clear the local
 * preference. Wrapped in try/catch — failure is best-effort/silent.
 */
export async function deletePushToken(userId: string): Promise<void> {
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId);
    // Clear preference (native platforms only).
    if (Platform.OS !== 'web') {
      await AsyncStorage.setItem(pushEnabledKey(userId), 'false');
    }

    // Cancel any locally scheduled notifications too.
    try {
      // Dynamic require — same optional dep pattern as above.
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const Notifications = require('expo-notifications') as ExpoNotificationsModule;
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // expo-notifications absent — nothing to cancel.
    }
  } catch (e) {
    console.warn('[pushNotifications] deletePushToken failed (silent):', e);
  }
}

/**
 * Full enable flow: show explanation → request OS permission → save token.
 * Returns true if notifications were successfully enabled.
 */
// TODO(analytics): when a foreground notification-received listener is added,
// call track('push_notification_received', { type: notification.request.content.data?.type ?? 'unknown' })
// inside the addNotificationReceivedListener callback. See src/lib/analytics.ts.

export async function enablePushNotifications(userId: string): Promise<boolean> {
  const confirmed = await showPushExplanation();
  if (!confirmed) return false;

  const token = await requestExpoPushToken();
  if (!token) {
    Alert.alert(
      'Notifications unavailable',
      'Could not get a push token. You may need to grant notification permission in your device Settings.',
    );
    return false;
  }

  await savePushToken(userId, token);
  return true;
}
