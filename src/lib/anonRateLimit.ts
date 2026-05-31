import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'anon_submit_timestamps';
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

async function loadTimestamps(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter((v): v is number => typeof v === 'number');
  } catch {
    return [];
  }
}

/**
 * Throws if the device has already submitted MAX_PER_WINDOW anonymous reports
 * within the last 24 hours. Resolves (void) when submission is allowed.
 *
 * Call this BEFORE createAnonFlag. Does not record a timestamp — call
 * recordAnonSubmit() after a successful submission.
 */
export async function checkAnonRateLimit(): Promise<void> {
  const all = await loadTimestamps();
  const now = Date.now();
  const recent = all.filter((ts) => ts > now - WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    throw new Error(
      `You've reached the limit of ${MAX_PER_WINDOW} anonymous reports per 24 hours. Sign in to report more.`,
    );
  }
}

/**
 * Records a timestamp for the current submission and prunes expired entries.
 * Silent on write failure — a missed record only means the window is slightly
 * under-counted, which is acceptable.
 */
export async function recordAnonSubmit(): Promise<void> {
  try {
    const all = await loadTimestamps();
    const now = Date.now();
    const pruned = all.filter((ts) => ts > now - WINDOW_MS);
    pruned.push(now);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Silent — see JSDoc
  }
}
