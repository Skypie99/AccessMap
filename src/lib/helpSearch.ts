/**
 * Help & FAQ search — a pure, dependency-free filter used by HelpModal.
 *
 * Lives next to {@link ./flagSearch.ts} (which filters the map flag list)
 * so the two "search" helpers share a discoverable home in `src/lib/`. The
 * two functions intentionally don't share code: flag search has its own
 * tokenizer (handles status/category labels), while FAQ search is simpler
 * — combine question + answer text and check for substring matches.
 *
 * Why a separate module instead of inlining inside HelpModal?
 *   1. It's pure (no React, no React Native imports) so it's trivial to
 *      unit-test under Jest without a renderer.
 *   2. The Unicode-NFC normalization and AND-semantics are subtle enough
 *      to merit dedicated test coverage — and that coverage lives or dies
 *      with the function, not its caller.
 *
 * Design choices, called out so future-Sky knows why:
 *   - We normalize BOTH the haystack and the needle to Unicode NFC before
 *     lowercasing. `'é'` (precomposed, U+00E9) and `'e' + U+0301` (combining
 *     acute) compare unequal as raw strings — NFC canonicalizes them to the
 *     same form so a search for "café" hits an FAQ that contains "café"
 *     regardless of how either side was encoded. Same pattern lives in
 *     ./flagSearch.ts — see its NFC test case.
 *   - Empty or whitespace-only query returns the original list as-is (no
 *     filtering — the user hasn't asked us to narrow yet).
 *   - Multi-token query is AND: every token must appear somewhere in the
 *     combined q+a text. Matches the mental model of "narrow down by
 *     adding more words" that flag search already established.
 */

/**
 * Filter an array of FAQ-shaped items by a free-text query. Returns the
 * input list unchanged for empty / whitespace-only queries.
 *
 * The generic parameter lets callers pass their own richer shape (with
 * extra fields like `id`, `category`, etc.) without losing those fields
 * in the output.
 *
 * @param items list to filter; never mutated.
 * @param query free-text search; case-insensitive, NFC-normalized.
 *              Multi-word queries are AND-combined across q+a text.
 * @returns matching subset, preserving input order.
 */
export function filterFaqs<T extends { q: string; a: string }>(items: T[], query: string): T[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return items;
  }

  // Tokenize on any whitespace run; lowercase + NFC-normalize each token.
  // Map then filter avoids the empty-string token that a leading/trailing
  // space would otherwise produce.
  const tokens = trimmed
    .normalize('NFC')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return items;
  }

  return items.filter((item) => {
    // Combine question + answer text into one searchable haystack per item.
    // The single newline keeps tokens from one field from accidentally
    // colliding with tokens from the other ("word A end" + "begin word B"
    // shouldn't match "end begin" as one substring).
    const haystack = `${item.q}\n${item.a}`.normalize('NFC').toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
