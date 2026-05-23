import type { FlagRow, FlagStatus } from '@/types/database';

// Loose-typed payload shape because supabase-js's generic for
// postgres_changes adds nothing to the merge logic we actually run.
// `old` carries the row's prior state on UPDATE/DELETE; on INSERT it's
// effectively empty. On DELETE, `new` is effectively empty and we
// identify the row by `old.id`.
export type FlagRealtimePayload =
  | { eventType: 'INSERT'; new: FlagRow; old: Partial<FlagRow> }
  | { eventType: 'UPDATE'; new: FlagRow; old: Partial<FlagRow> }
  | { eventType: 'DELETE'; new: Partial<FlagRow>; old: { id?: string } };

// Apply a single realtime row event to the in-memory flag list, respecting
// the currently-active status filter. Pure — easy to unit-test without
// mocking Supabase channels. Mirrors `listFlags`: newest first, rows whose
// status isn't in `statuses` are excluded.
export function mergeFlagRealtimePayload(
  flags: FlagRow[],
  payload: FlagRealtimePayload,
  statuses: FlagStatus[],
): FlagRow[] {
  switch (payload.eventType) {
    case 'INSERT': {
      const row = payload.new;
      if (!statuses.includes(row.status)) return flags;
      if (flags.some((f) => f.id === row.id)) return flags;
      const next = [row, ...flags];
      // Re-sort defensively: a late-arriving INSERT could carry an earlier
      // created_at than rows already in the list.
      next.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return next;
    }
    case 'UPDATE': {
      const row = payload.new;
      const exists = flags.some((f) => f.id === row.id);
      if (!statuses.includes(row.status)) {
        return exists ? flags.filter((f) => f.id !== row.id) : flags;
      }
      if (exists) {
        return flags.map((f) => (f.id === row.id ? { ...f, ...row } : f));
      }
      const next = [row, ...flags];
      next.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return next;
    }
    case 'DELETE': {
      const id = payload.old.id;
      if (!id) return flags;
      return flags.filter((f) => f.id !== id);
    }
    default:
      return flags;
  }
}
