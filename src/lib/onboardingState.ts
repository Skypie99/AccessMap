import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-wide "has finished first-launch onboarding" gate.
 *
 * This is intentionally separate from src/lib/onboarding.ts, which is a
 * per-user gate that runs AFTER sign-in. This module runs BEFORE sign-in:
 * the very first time the app boots on a device, we want to show a short
 * intro to the whole experience (reporting, verifying, points) regardless
 * of whether the user has signed in yet.
 *
 * The value stored is just a fixed truthy marker — we only care whether
 * the key exists. We also defend against a corrupt value (someone hand-
 * editing storage, schema collision in a future version, etc.) by treating
 * anything other than the expected marker as "not onboarded".
 */
export const ONBOARDED_KEY = '@accessmap/onboarded_v1';

const ONBOARDED_VALUE = '1';

/**
 * Resolves to `true` if first-launch onboarding has already been completed
 * (or skipped) on this device. Defensive on storage errors and on invalid
 * stored values: returns `false`, so a transient failure shows the intro
 * once more rather than silently swallowing it forever.
 */
export async function loadOnboarded(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDED_KEY);
    if (value === null) return false;
    return value === ONBOARDED_VALUE;
  } catch {
    return false;
  }
}

/**
 * Marks first-launch onboarding as completed on this device. Fire-and-forget
 * from the UI — the worst case on a storage error is the user sees the
 * intro again next launch, which is recoverable.
 */
export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, ONBOARDED_VALUE);
  } catch {
    // Ignore — see jsdoc above.
  }
}

/**
 * Wipes the device-wide flag so the next launch re-shows the intro.
 * Useful in development (`await clearOnboarded()` from a debug menu) and
 * for future "Show me the intro again" surfaces.
 */
export async function clearOnboarded(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDED_KEY);
  } catch {
    // Ignore — see jsdoc above.
  }
}
