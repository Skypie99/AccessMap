import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-user onboarding gate. We key on userId so two people sharing a device
 * each get the first-run experience once. The value we write is the timestamp
 * of when they dismissed (not strictly needed today, but cheap and useful for
 * later analytics or a "show me the intro again" button).
 */
const KEY_PREFIX = '@accessmap/onboarding_seen_v1:';

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/**
 * Resolves to `true` if this user has already dismissed the onboarding flow.
 * Defensive on storage errors: returns `false` so a transient failure shows
 * the onboarding rather than silently swallowing it forever.
 */
export async function hasSeenOnboarding(userId: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(storageKey(userId));
    return value !== null;
  } catch {
    return false;
  }
}

/**
 * Marks onboarding as seen for this user. Fire-and-forget from the UI; we
 * intentionally don't surface storage errors because the worst case is the
 * user sees the intro again next time, which is recoverable.
 */
export async function markOnboardingSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), new Date().toISOString());
  } catch {
    // Ignore — see jsdoc above.
  }
}

/**
 * Wipes the "seen" flag for this user, so the next sign-in re-shows the
 * onboarding cards. Used by the "Show me the intro again" button in
 * ProfileScreen. Same fire-and-forget posture as the setter.
 */
export async function clearOnboardingSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // Ignore — see jsdoc above.
  }
}
