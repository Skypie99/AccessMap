/**
 * Flag-update tracker — remembers the last-seen status for each flag the
 * user cares about (own reports + watched), so we can show a "what changed
 * since your last visit" banner.
 *
 * Storage shape: { [flagId]: FlagStatus }, per-user, in AsyncStorage under
 * '@accessmap/flag_last_seen_v1:{userId}'. Fail-soft on every read/write —
 * a busted preference store should never break the app.
 *
 * Diff rule for v1: a flag is "updated" only when its current status
 * differs from a previously-recorded status. First-time-seen flags don't
 * count as updates (otherwise every new report would generate noise on
 * first launch). Once `markSeen` is called on a flag, its current status
 * becomes the new baseline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';
import type { FlagRow, FlagStatus } from '@/types/database';

const STORAGE_KEY_PREFIX = '@accessmap/flag_last_seen_v1:';

// Cap so a runaway reader can't blow up AsyncStorage. We trim to the
// most-recent N entries (by appearance order in the flags we pass to
// `mergeSeen`). Same rationale as MAX_WATCHED in watchedFlags.
const MAX_TRACKED = 500;

export type LastSeenMap = Record<string, FlagStatus>;

export interface FlagUpdate {
  flag: FlagRow;
  // The status we last recorded for this flag (always defined — first-time
  // flags are skipped by `diffUpdates`).
  fromStatus: FlagStatus;
  // The status the flag currently holds.
  toStatus: FlagStatus;
}

function storageKey(userId: string): string {
  return STORAGE_KEY_PREFIX + userId;
}

/**
 * Validates a parsed JSON blob into a LastSeenMap. Defensive: returns {} on
 * anything weird (null, array, primitives, mixed types).
 */
function parseLastSeen(raw: unknown): LastSeenMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: LastSeenMap = {};
  for (const [id, status] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof id !== 'string' || typeof status !== 'string') continue;
    if (
      status !== 'open' &&
      status !== 'verified' &&
      status !== 'resolved' &&
      status !== 'rejected'
    ) {
      continue;
    }
    out[id] = status as FlagStatus;
  }
  return out;
}

export async function loadLastSeen(userId: string): Promise<LastSeenMap> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return parseLastSeen(JSON.parse(raw));
  } catch (e) {
    console.warn(
      '[flagUpdates] load failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
    return {};
  }
}

async function persist(userId: string, map: LastSeenMap): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch (e) {
    console.warn(
      '[flagUpdates] save failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
  }
}

/**
 * Pure: returns the list of flags whose current status differs from the
 * recorded last-seen status. New (un-recorded) flags are skipped.
 */
export function diffUpdates(
  flags: FlagRow[],
  lastSeen: LastSeenMap,
): FlagUpdate[] {
  const updates: FlagUpdate[] = [];
  for (const f of flags) {
    const prev = lastSeen[f.id];
    if (prev === undefined) continue; // first-time-seen — silent baseline
    if (prev !== f.status) {
      updates.push({ flag: f, fromStatus: prev, toStatus: f.status });
    }
  }
  return updates;
}

/**
 * Pure: returns the next LastSeenMap with every flag's current status as
 * the baseline. New flags are added; existing entries are overwritten.
 * Caller passes the result to `persist` (or use `markAllSeen` for the
 * common load-merge-save pattern).
 */
export function nextLastSeen(
  flags: FlagRow[],
  lastSeen: LastSeenMap,
): LastSeenMap {
  const merged: LastSeenMap = { ...lastSeen };
  for (const f of flags) {
    merged[f.id] = f.status;
  }
  // Trim to MAX_TRACKED entries (most-recently-touched wins). We can't
  // perfectly LRU without timestamps, but freshly-merged keys are at the
  // end of insertion order in JS objects — keep those.
  const entries = Object.entries(merged);
  if (entries.length <= MAX_TRACKED) return merged;
  const kept = entries.slice(entries.length - MAX_TRACKED);
  return Object.fromEntries(kept);
}

/**
 * Convenience: load the current lastSeen, merge in the given flags' current
 * statuses, and persist. Use after the user has acknowledged updates (e.g.
 * opened the Activity Feed or dismissed the banner).
 */
export async function markAllSeen(
  userId: string,
  flags: FlagRow[],
): Promise<LastSeenMap> {
  const current = await loadLastSeen(userId);
  const merged = nextLastSeen(flags, current);
  await persist(userId, merged);
  return merged;
}

export { MAX_TRACKED };
