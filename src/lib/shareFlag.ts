/**
 * Pure formatter for the OS share-sheet message used by FlagDetailModal's
 * Share button. Kept React-Native-free on purpose so it's trivially testable
 * and the only thing that ever needs to change when we tweak how a flag
 * reads in iMessage / Mail / etc.
 *
 * Shape (one trailing newline-free string):
 *
 *   [Category label]
 *   Severity: <N>/5
 *   At <lat, lng rounded to 5 decimals>
 *   Status: <status>
 *
 *   <description (only if non-empty after trim)>
 *
 *   Reported via AccessMap.
 *
 * The 5-decimal rounding is intentional — that's roughly ~1m of precision,
 * same as the directions URL builder (`buildDirectionsUrl`). Anything more
 * is GPS noise; anything less puts the recipient on the wrong street.
 *
 * `categoryLabel` is injected as a function so this module doesn't pull in
 * `CATEGORY_LABELS` (and the whole flags.ts surface). Callers pass
 * `(cat) => CATEGORY_LABELS[cat]` from the component. That also lets us
 * swap to a localized label later without touching this formatter.
 */

import type { FlagRow } from '@/types/database';

/**
 * Build the share-sheet text body for a flag.
 *
 * @param flag         Minimal slice of a FlagRow — just the fields the
 *                     message renders. Picks (not the full row) so this
 *                     stays independent of unrelated schema growth.
 * @param categoryLabel Function returning the human label for a category.
 *                      Pass `(cat) => CATEGORY_LABELS[cat]` at the call site.
 */
export function formatFlagShareText(
  flag: Pick<FlagRow, 'category' | 'severity' | 'lat' | 'lng' | 'status' | 'description'>,
  categoryLabel: (cat: FlagRow['category']) => string,
): string {
  const label = categoryLabel(flag.category);
  // toFixed(5) — same precision the rest of the app uses for coords.
  // Negative numbers keep their sign; toFixed handles that correctly.
  const lat = flag.lat.toFixed(5);
  const lng = flag.lng.toFixed(5);

  // Header lines — always present, in this order.
  const headerLines = [
    label,
    `Severity: ${flag.severity}/5`,
    `At ${lat}, ${lng}`,
    `Status: ${flag.status}`,
  ];

  // Description is optional. Trim and treat whitespace-only as absent so
  // we don't ship a blank paragraph between the header and the footer.
  const desc = flag.description?.trim();
  const middle = desc ? `\n${desc}\n` : '';

  // Footer — credits the source so a forwarded message has context.
  const footer = 'Reported via AccessMap.';

  return `${headerLines.join('\n')}\n${middle}\n${footer}`;
}
