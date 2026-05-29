/**
 * Pure filters for the "Watched Flags" list.
 *
 * filterWatchedFlags — case-insensitive, NFC-normalized substring match across
 *   free-text description and category label. Multi-token AND semantics.
 *   Mirrors `filterMyReports` in src/lib/myReportsFilter.ts.
 *
 * filterWatchedFlagsByStatus — restricts to a specific status value, or returns
 *   the input reference unchanged when statusFilter is 'all'.
 *
 * NFC normalization means `café` (precomposed) matches `café` (NFD) because
 * `.normalize('NFC')` puts both into the same code-unit sequence before
 * `.includes()` compares them.
 *
 * Empty / whitespace-only query and 'all' status both short-circuit to the
 * input list reference (cheap no-op — the FlatList prop won't churn).
 */
import type { FlagRow } from '@/types/database';

export type WatchedStatusFilter = 'all' | 'open' | 'verified' | 'resolved';

/** Normalize a string for substring search: NFC + lowercase. */
function normalize(s: string): string {
  return s.normalize('NFC').toLowerCase();
}

/** Tokenize a query — normalized, trimmed, split on whitespace, drop empties. */
function tokenize(query: string): string[] {
  const trimmed = normalize(query).trim();
  if (trimmed.length === 0) return [];
  return trimmed.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Pure: filter `flags` to those matching every token in `query` across
 * description and category label. The category label is resolved via the
 * `categoryLabel` callback so this lib stays decoupled from the concrete
 * CATEGORY_LABELS table — pass it in from the calling component.
 *
 * Returns the input array reference unchanged when the query is empty
 * (FlatList won't re-render when the prop reference is stable).
 */
export function filterWatchedFlags(
  flags: FlagRow[],
  query: string,
  categoryLabel: (cat: FlagRow['category']) => string,
): FlagRow[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return flags;
  return flags.filter((f) => {
    const haystack = normalize(`${f.description ?? ''} ` + `${categoryLabel(f.category) ?? ''}`);
    return tokens.every((tok) => haystack.includes(tok));
  });
}

/**
 * Pure: filter `flags` to those matching the given status. 'all' returns the
 * input reference unchanged. Compose with filterWatchedFlags for combined
 * text+status filtering.
 */
export function filterWatchedFlagsByStatus(
  flags: FlagRow[],
  statusFilter: WatchedStatusFilter,
): FlagRow[] {
  if (statusFilter === 'all') return flags;
  return flags.filter((f) => f.status === statusFilter);
}
