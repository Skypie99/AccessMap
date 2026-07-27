// Per-device dedup for flag dispute requests (W1 client-side safeguard).
//
// DELIBERATELY A BYTE-SHAPE COPY of reopenRequests.ts. Same privacy gate, same
// storage idiom, same error policy — only the key and the names differ. Sharing
// one parameterised module would have coupled two independently-resettable
// server counters to one client structure, and the reopen list has shipped and
// is populated on real devices; a refactor of its storage shape is a migration,
// not a tidy-up.
//
// The increment_dispute_request RPC stores NO user_id (Jordan privacy gate),
// so the server cannot enforce "one doubt per user per flag". This guard is not
// optional decoration: DISPUTE_THRESHOLD is 2, so without it ONE person could
// carry any flag to the disputed threshold alone by pressing, closing the sheet,
// and pressing again. This module records, on-device, which flags this user has
// already flagged as wrong so the UI can refuse a second vote on the same flag.
//
// Scope/limitation: this is per-device and does NOT reset per resolution cycle
// (the migration's dispute_requests_reset_at, which the on_flag_dispute_reset
// trigger bumps on ANY status change). It therefore errs toward UNDER-counting
// — after a flag is verified and its counter resets, this device still refuses
// a second vote — which is the conservative, safe direction, exactly the trade
// F10 accepted for reopen.

import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId: string): string => `@accessmap/dispute_requested_v1:${userId}`;

/** Returns true if this user has already flagged this flag as wrong on this device. */
export async function hasRequestedDispute(userId: string, flagId: string): Promise<boolean> {
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

/** Record that this user has flagged this flag as wrong on this device. */
export async function recordDisputeRequest(userId: string, flagId: string): Promise<void> {
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
