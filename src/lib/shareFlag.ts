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
 *   See it on the map: https://accessmap.skypistudio.com/flag/<id>
 *   Open in the app: accessmap://flag/<id>
 *   Reported via Flagstone.
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
 * Public origin of the web build. ONE place, so the move to the Flagstone-branded
 * host is a single edit. Flipped 2026-08-18, once the host actually served the
 * app: DNS resolves to the same Vercel target as the old host, the certificate
 * is issued, and https://flagstone.skypistudio.com returns the app with no
 * redirect. The OLD host stays live and is NOT retired — the `accessmap://`
 * scheme is pinned to it, and every link shared before today points at it, so
 * both hosts serve the same build.
 *
 * NOT a reason, despite what the move runbook claimed: the Supabase Site URL.
 * It never referenced the old host. It sat at the unconfigured default
 * `http://localhost:3000` until 2026-08-18, when it was repointed at the
 * Flagstone origin; both origins are now in the Supabase redirect allowlist.
 * See design-reviews/demo-domain/2026-08-17/DOMAIN-MOVE.md § CORRECTION.
 */
export const WEB_ORIGIN = 'https://flagstone.skypistudio.com';

/** Shareable https URL for a single flag — the web twin of accessmap://flag/{id}. */
export function webFlagUrl(flagId: string): string {
  return `${WEB_ORIGIN}/flag/${flagId}`;
}

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
  flag: Pick<FlagRow, 'id' | 'category' | 'severity' | 'lat' | 'lng' | 'status' | 'description'>,
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

  // Footer — the WEB link leads, because it is the only one that works for
  // everybody. `accessmap://` is a custom scheme: it opens the app when the
  // app is installed and does nothing at all on a desktop, or on a phone
  // without it, which made every shared flag a dead link for most recipients.
  // The same id resolves on the web build (RootNavigator maps `flag/:flagId?`
  // onto FullMap, which fetches it and opens its callout), so the https URL
  // lands anyone on the actual flag. The scheme line stays underneath it so
  // people who DO have the app keep the direct jump.
  const footer =
    `See it on the map: ${webFlagUrl(flag.id)}\n` +
    `Open in the app: accessmap://flag/${flag.id}\n` +
    `Reported via Flagstone.`;

  return `${headerLines.join('\n')}\n${middle}\n${footer}`;
}
