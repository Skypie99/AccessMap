/**
 * Pure filter for the "Watched Flags" list — case-insensitive, NFC-normalized
 * substring match across the user-facing fields of each flag:
 *
 *   - free-text description
 *   - category label  (supplied via callback so this lib stays decoupled
 *     from the labels table)
 *
 * Multi-token query uses AND semantics: every whitespace-separated token
 * must match somewhere in the haystack. So "ramp concrete" matches a flag
 * whose description mentions concrete and whose category is "No ramp".
 * Mirrors `filterMyReports` in src/lib/myReportsFilter.ts.
 *
 * NFC normalization on both sides means `café` (precomposed, single
 * code point) matches `café` (NFD: 'cafe' + combining acute). Without
 * `.normalize('NFC')` JS `.includes()` compares code units and the two
 * encodings would never match.
 *
 * Empty / whitespace-only query short-circuits to the input list
 * reference (cheap no-op for callers — the FlatList prop won't churn).
 */
import type { FlagRow } from '@/types/database';

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
