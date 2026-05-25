/**
 * Notification preferences — per-user toggles controlling which flag
 * status transitions surface in the "Since your last visit" banner.
 *
 * Each toggle gates updates whose RESULTING status matches. Defaults to
 * all-on, preserving the original behavior (every status change surfaces)
 * — users opt OUT of noise rather than opt INTO signal.
 *
 * Storage key '@accessmap/notification_prefs_v1:{userId}', defensive
 * parse (boolean coercion, missing fields default true). Fail-soft on
 * read/write.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';
import type { FlagStatus } from '@/types/database';

const STORAGE_KEY_PREFIX = '@accessmap/notification_prefs_v1:';

/**
 * One boolean per status — true means "show me banner updates that land
 * on this status." Default-all-true preserves prior behavior.
 */
export interface NotificationPrefs {
  notifyOnOpen: boolean;
  notifyOnVerified: boolean;
  notifyOnResolved: boolean;
  notifyOnRejected: boolean;
}

// Frozen so accidental mutation throws in dev (silently no-ops in
// non-strict prod, but the immutability contract is what matters).
// Callers needing a writable copy should use `{ ...DEFAULT_PREFS }`.
// QA Pass-1 #3.
export const DEFAULT_PREFS: Readonly<NotificationPrefs> = Object.freeze({
  notifyOnOpen: true,
  notifyOnVerified: true,
  notifyOnResolved: true,
  notifyOnRejected: true,
});

function storageKey(userId: string): string {
  return STORAGE_KEY_PREFIX + userId;
}

/**
 * Defensive parser — drops to defaults on anything unexpected. Missing
 * fields default to `true` so a partial write (e.g. older client wrote
 * fewer keys) still works.
 */
function parsePrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PREFS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    notifyOnOpen:
      typeof obj.notifyOnOpen === 'boolean' ? obj.notifyOnOpen : true,
    notifyOnVerified:
      typeof obj.notifyOnVerified === 'boolean' ? obj.notifyOnVerified : true,
    notifyOnResolved:
      typeof obj.notifyOnResolved === 'boolean' ? obj.notifyOnResolved : true,
    notifyOnRejected:
      typeof obj.notifyOnRejected === 'boolean' ? obj.notifyOnRejected : true,
  };
}

export async function loadPrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_PREFS };
    return parsePrefs(JSON.parse(raw));
  } catch (e) {
    console.warn(
      '[notificationPrefs] load failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch (e) {
    console.warn(
      '[notificationPrefs] save failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
  }
}

/**
 * Maps a status to the pref key that gates updates landing on it. Pure;
 * exposed for diffUpdates' optional prefs filter.
 */
export function prefKeyForStatus(status: FlagStatus): keyof NotificationPrefs {
  switch (status) {
    case 'open':
      return 'notifyOnOpen';
    case 'verified':
      return 'notifyOnVerified';
    case 'resolved':
      return 'notifyOnResolved';
    case 'rejected':
      return 'notifyOnRejected';
  }
}

/**
 * Pure: returns true iff the user wants to be notified when a flag
 * transitions to `toStatus`. Used by diffUpdates' optional prefs param.
 */
export function isNotifiable(
  toStatus: FlagStatus,
  prefs: NotificationPrefs,
): boolean {
  return prefs[prefKeyForStatus(toStatus)];
}
