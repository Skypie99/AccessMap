// Per-user "recently viewed flags" list, on-device only.
//
// Tracks the last N flag IDs the user opened in FlagDetailModal so we can
// surface a quick-jump row on Profile. Pure UX shape — no schema needed,
// no server side. Lives here (not in flagsStore) because it persists
// across launches and is bounded; we don't want stale rows leaking into
// the in-memory flags cache.
//
// Design choices:
//   - Keyed by userId so two accounts on the same device don't see each
//     other's recents.
//   - Bounded to RECENTLY_VIEWED_MAX (10). The 11th open evicts the
//     oldest. Bounding is essential — without it the list would grow
//     monotonically and waste storage.
//   - "Most recent" lives at index 0 (front of the array). recordView()
//     dedupes by id so re-opening a flag bubbles it to the top rather
//     than duplicating.
//   - Defensive on storage errors — load returns []; write fire-and-
//     forget. Worst case: the row briefly shows a stale list, which is
//     recoverable on next view.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

const KEY_PREFIX = '@accessmap/recently_viewed_v1:';

export const RECENTLY_VIEWED_MAX = 10;

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function parse(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

/**
 * Return the user's recent-view list, most-recent first. Empty on read
 * error or absent key.
 */
export async function loadRecentlyViewed(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (raw === null) return [];
    return parse(raw).slice(0, RECENTLY_VIEWED_MAX);
  } catch (e) {
    console.warn(
      '[recentlyViewed] load failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
    return [];
  }
}

/**
 * Push a flag id onto the front of the recent list. Dedupes (re-viewing
 * an existing entry bubbles it back to position 0) and caps the list at
 * RECENTLY_VIEWED_MAX. Fire-and-forget from the UI.
 */
export async function recordView(
  userId: string,
  flagId: string,
): Promise<void> {
  try {
    const existing = await loadRecentlyViewed(userId);
    const deduped = existing.filter((id) => id !== flagId);
    const next = [flagId, ...deduped].slice(0, RECENTLY_VIEWED_MAX);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch (e) {
    console.warn(
      '[recentlyViewed] record failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
  }
}

/**
 * Wipe the user's recent list. Called from sign-out (via the centralised
 * signOut helper if/when we add this there) — keeps cross-user leakage
 * off a shared device.
 */
export async function clearRecentlyViewed(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch (e) {
    console.warn(
      '[recentlyViewed] clear failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
  }
}

/**
 * Remove a single id from the user's recent list. Used after a flag is
 * deleted so we don't dangle a chip that no longer resolves to a row.
 */
export async function dropFromRecent(
  userId: string,
  flagId: string,
): Promise<void> {
  try {
    const existing = await loadRecentlyViewed(userId);
    const next = existing.filter((id) => id !== flagId);
    if (next.length === existing.length) return;
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch (e) {
    console.warn(
      '[recentlyViewed] drop failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
  }
}
