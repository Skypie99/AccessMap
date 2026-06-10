import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

/**
 * Watched flags — a per-user, on-device list of flag IDs the user is
 * tracking. "Watching" a flag is purely client-side; it doesn't
 * subscribe to anything on the server. The Profile screen's "Watched
 * Flags" view re-fetches each watched flag's current state so the user
 * can see status changes (e.g. a flag they watched as 'open' is now
 * 'resolved').
 *
 * Why local-only:
 *   - Zero schema, zero RLS, zero new dependencies. Same trade-off as
 *     map filter persistence.
 *   - Not data the server cares about — it's a personal UX shortcut.
 *   - If we ever want cross-device sync, this becomes a Supabase table
 *     with the same shape and the helpers swap to .from() calls.
 *
 * Two-key style: keyed per-user (one blob per user_id) so signing
 * out + in as a different account on the same device doesn't expose
 * the first user's list. Single namespaced+versioned prefix so a
 * future schema change can bump _v1 → _v2 and re-default cleanly.
 */

const STORAGE_KEY_PREFIX = '@accessmap/watched_flags_v1:';

// Cap to keep AsyncStorage round-trips small and the Watched list UI
// scannable. If a user wants to watch their 500th flag, the oldest is
// dropped to make room — see addWatched().
const MAX_WATCHED = 200;

function watchedKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Defensive parser — rejects anything that isn't an array of strings.
 * A bad blob silently degrades to "no watched flags" rather than
 * crashing the Watched view.
 */
function parseWatched(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

/**
 * Load the user's watched-flag IDs, oldest first (insertion order
 * preserved). Returns [] for any failure or empty state.
 */
export async function loadWatched(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(watchedKey(userId));
    return parseWatched(raw);
  } catch (e) {
    console.warn('[watchedFlags] load failed:', errorMessage(e, 'AsyncStorage error.'));
    return [];
  }
}

/**
 * Add a flag ID to the user's watched list. No-op if already watched.
 * If the list is at MAX_WATCHED, the OLDEST entry is dropped to make
 * room (FIFO) — so adding to a full list always succeeds.
 * Returns the new full list (lets the caller update local state in one
 * step instead of re-reading).
 */
export async function addWatched(userId: string, flagId: string): Promise<string[]> {
  const current = await loadWatched(userId);
  if (current.includes(flagId)) return current;
  const next = current.length >= MAX_WATCHED ? [...current.slice(1), flagId] : [...current, flagId];
  await persist(userId, next);
  return next;
}

/**
 * Remove a flag ID from the user's watched list. No-op if not present.
 * Returns the new full list (same reason as addWatched).
 */
export async function removeWatched(userId: string, flagId: string): Promise<string[]> {
  const current = await loadWatched(userId);
  if (!current.includes(flagId)) return current;
  const next = current.filter((id) => id !== flagId);
  await persist(userId, next);
  return next;
}

/**
 * Bulk-add a batch of flag IDs to the watched list. Returns a summary
 * with `added` (how many were newly stored), `alreadyWatched` (how many
 * IDs in the batch were already on the list, no-oped), and `dropped`
 * (how many of the OLDEST existing entries got evicted to stay under
 * MAX_WATCHED).
 *
 * Why not loop addWatched: each individual call does its own load+save
 * round-trip. For a batch (e.g. a 20-flag triage selection), the
 * sequential AsyncStorage writes pile up — the FIFO bookkeeping also
 * gets confusing across writes. One read + one write here keeps the
 * semantics obvious and the storage churn low.
 */
export async function addWatchedBulk(
  userId: string,
  flagIds: string[],
): Promise<{ added: number; alreadyWatched: number; dropped: number }> {
  if (flagIds.length === 0) {
    return { added: 0, alreadyWatched: 0, dropped: 0 };
  }
  const current = await loadWatched(userId);
  const existingSet = new Set(current);
  // Preserve the caller's batch order, dedupe within the batch itself
  // (in case the selection had duplicates from somewhere), and drop any
  // ids already on the list (those become alreadyWatched counts).
  const seenInBatch = new Set<string>();
  const toAdd: string[] = [];
  let alreadyWatched = 0;
  for (const id of flagIds) {
    if (seenInBatch.has(id)) continue;
    seenInBatch.add(id);
    if (existingSet.has(id)) {
      alreadyWatched += 1;
      continue;
    }
    toAdd.push(id);
  }
  if (toAdd.length === 0) {
    return { added: 0, alreadyWatched, dropped: 0 };
  }
  const combined = [...current, ...toAdd];
  // FIFO eviction to stay at MAX_WATCHED. Compute dropped count so the
  // UI can warn the user if some watched-for-ages flags got bumped.
  const dropped = Math.max(0, combined.length - MAX_WATCHED);
  const next = dropped > 0 ? combined.slice(dropped) : combined;
  await persist(userId, next);
  return { added: toAdd.length, alreadyWatched, dropped };
}

/**
 * Replace the user's watched list with the given ids (preserving the
 * order given). Used by the Watched view to prune ids whose flags no
 * longer exist on the server. No-op if the new list is identical to
 * what's already stored, so a routine refresh that finds nothing to
 * prune doesn't generate a pointless AsyncStorage write.
 */
export async function setWatched(userId: string, ids: string[]): Promise<string[]> {
  const current = await loadWatched(userId);
  const unchanged = current.length === ids.length && current.every((id, i) => id === ids[i]);
  if (unchanged) return current;
  await persist(userId, ids);
  return ids;
}

async function persist(userId: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(watchedKey(userId), JSON.stringify(ids));
  } catch (e) {
    console.warn('[watchedFlags] save failed:', errorMessage(e, 'AsyncStorage error.'));
    // F43 (re-sweep): the watched list is user data the user deliberately
    // curates — per the CLAUDE.md error tier for AsyncStorage WRITEs of user
    // data (same class as savedPlaces.persist), a failed save must THROW so
    // callers surface it instead of confirming a Watch that was never stored.
    throw e;
  }
}

/**
 * Clears the entire watched list for a user. Equivalent to setWatched([], …)
 * but with a more descriptive name for use in "Clear all" confirmation flows.
 */
export async function clearWatched(userId: string): Promise<void> {
  await persist(userId, []);
}

export { MAX_WATCHED };
