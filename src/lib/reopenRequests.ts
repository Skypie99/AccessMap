// Per-device dedup for flag reopen requests (F10 client-side safeguard).
//
// The increment_reopen_request RPC stores NO user_id (Jordan privacy gate),
// so the server cannot enforce "one reopen vote per user per flag". Without a
// client guard, one person could single-handedly reopen any resolved flag by
// tapping "request reopen" repeatedly. This module records, on-device, which
// flags this user has already voted to reopen so the UI can refuse a second
// vote on the same flag.
//
// Scope/limitation: this is per-device and does NOT reset per resolution cycle
// (the migration's reopen_requests_reset_at). It deliberately errs toward
// UNDER-counting (a conservative, safe direction) rather than allowing spam.
// Full per-cycle dedup is a proposed Wave-C refinement — see the deep audit
// report's DECISIONS FOR SKY.

import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId: string): string => `@accessmap/reopen_requested_v1:${userId}`;

/** Returns true if this user has already requested a reopen for this flag on this device. */
export async function hasRequestedReopen(userId: string, flagId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return false;
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) && ids.includes(flagId);
  } catch {
    // Read failure → treat as "not requested" (fallback per error policy).
    return false;
  }
}

/** Record that this user has requested a reopen for this flag on this device. */
export async function recordReopenRequest(userId: string, flagId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    let ids: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) ids = parsed as string[];
      } catch {
        // Corrupt stored value — start fresh rather than carry it forward.
        ids = [];
      }
    }
    if (!ids.includes(flagId)) {
      ids.push(flagId);
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(ids));
    }
  } catch {
    // Best-effort: if the write fails the worst case is the user can vote
    // again later. No user content is lost, so we don't surface an error.
  }
}
