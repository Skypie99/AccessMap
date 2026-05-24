/**
 * Pure flag text-search — case-insensitive substring match across the
 * fields users naturally describe a flag with: free-text description,
 * category label, and status label.
 *
 * Multi-token query: each whitespace-separated token must match at
 * least one field. So "broken ramp" finds flags whose category is
 * "Broken sidewalk" AND whose description mentions "ramp" (or both).
 * "broken AND ramp" semantics, not "broken OR ramp" — matches what
 * users expect from search UIs.
 *
 * Empty / whitespace-only query short-circuits to the input list.
 */
import { CATEGORY_LABELS, STATUS_LABELS } from './flags';
import type { FlagRow } from '@/types/database';

/** Tokenize a query — lowercased, trim, split on whitespace, drop empties. */
export function tokenizeQuery(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];
  return trimmed.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Pure: filter `flags` to those matching every token in `query` across
 * description / category label / status label. Returns the input array
 * reference unchanged when the query is empty (cheap no-op for callers).
 */
export function searchFlags(flags: FlagRow[], query: string): FlagRow[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return flags;
  return flags.filter((f) => {
    const haystack = (
      `${f.description ?? ''} ` +
      `${CATEGORY_LABELS[f.category] ?? ''} ` +
      `${STATUS_LABELS[f.status] ?? ''}`
    ).toLowerCase();
    return tokens.every((tok) => haystack.includes(tok));
  });
}
