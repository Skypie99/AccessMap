import { supabase } from './supabase';

/**
 * One audit-log entry for a flag's status lifecycle. Written by the
 * `handle_flag_status_change` and `handle_flag_insert_history` triggers
 * defined in `supabase/migrations/2026-05-24_status_history_table.sql`.
 *
 * The client reads through the `flag_status_history_public` view, which
 * EXCLUDES `user_id` (Jordan privacy condition #1, 2026-05-24). So the
 * shape here intentionally has no `user_id` field — the community can
 * see the history of a flag without learning who made each change.
 *
 *  - `from_status === null` means this is the INITIAL creation entry
 *    (the flag was reported and entered 'open' for the first time).
 *    `to_status` is then always `'open'`.
 *
 * We don't type from_status / to_status as `FlagStatus` because the DB
 * is `text` (so a future status value rolled out before the client knows
 * about it doesn't crash the parser). The UI labels-callback resolves
 * the string to a friendly label and falls back to the raw value if it's
 * unknown.
 */
export interface StatusHistoryEntry {
  id: string;
  flag_id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
}

/**
 * Fetch the full status history for a single flag, oldest first.
 *
 * Queries the SECURITY INVOKER view `flag_status_history_public`, which
 * omits `user_id` so the client never sees who made each change. The raw
 * `flag_status_history` table is maintainer-only for direct SELECT.
 *
 * DEFENSIVE: if the view doesn't exist (migration not yet applied) or
 * the query errors for any other reason, returns `[]` — the caller
 * renders an empty-state placeholder either way, so the distinction
 * doesn't matter for UX. Same pattern as `feedbackStore.listFeedbackByUser`.
 *
 * Ordered ascending so the UI can render top-to-bottom in chronological
 * order ("Reported" first, then each transition in the order it
 * happened) — which matches how users read a timeline.
 */
export async function listStatusHistory(
  flagId: string,
): Promise<StatusHistoryEntry[]> {
  try {
    // Cast through `any` on purpose: the `flag_status_history_public`
    // view is intentionally NOT in src/types/database.ts yet because
    // the migration is propose-only (Sky applies it; until then the
    // view doesn't exist on the server). We don't want to claim a type
    // for an object that may not exist. The fetch is fully defensive —
    // any error or wrong-shape data falls through to the [] return.
    // When the migration is applied and Sky regenerates types, this
    // cast can be removed in a follow-up.
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    };
    const { data, error } = await client
      .from('flag_status_history_public')
      .select('id,flag_id,from_status,to_status,created_at')
      .eq('flag_id', flagId)
      .order('created_at', { ascending: true });
    if (error) {
      // View might not exist yet (migration not applied) or RLS rejected
      // — either way, the UI shows the "not yet enabled" placeholder.
      return [];
    }
    return (data ?? []) as StatusHistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Pure formatter for a single history entry. Exported separately from
 * the modal so it's easy to unit-test without rendering anything, and
 * so it can be reused (e.g. in a future "recent activity" feed).
 *
 * Format:
 *   - Initial entry (from_status === null):    "Reported · 2h ago"
 *   - Transition entry:    "Open → Verified · 2h ago"
 *
 * Callers inject `statusLabel` and `relativeTime` so the formatter
 * stays free of React-Native and Supabase imports — a tiny pure
 * function that can be tested in plain JS.
 */
export function formatHistoryEntry(
  entry: StatusHistoryEntry,
  statusLabel: (s: string) => string,
  relativeTime: (iso: string) => string,
): string {
  if (entry.from_status === null) {
    return `Reported · ${relativeTime(entry.created_at)}`;
  }
  return `${statusLabel(entry.from_status)} → ${statusLabel(entry.to_status)} · ${relativeTime(entry.created_at)}`;
}
