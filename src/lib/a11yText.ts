import {
  SEVERITY_LABELS,
  STATUS_LABELS,
} from '@/lib/flags';
import type { FlagSeverity, FlagStatus } from '@/types/database';

// Centralised accessibility-text helpers. Every screen used to compose its own
// string like `"severity ${n}"` or `"severity ${n} of 5, ${SEVERITY_LABELS[n]}"`;
// the result drifted between screens. Keeping the truth in one file means a future
// label change (or a new severity level, or a new status) lives in exactly one
// place and every screen stays in sync.

/**
 * Screen-reader-friendly severity phrase, e.g. `"severity 3 of 5, Moderate"`.
 * Use anywhere an `accessibilityLabel` mentions a severity value. Always pairs
 * the number with the descriptor word so meaning isn't carried by color alone
 * (WCAG 1.4.1 Use of Color) and so AT users hear both the magnitude and the
 * human label.
 */
export function severityA11y(severity: FlagSeverity): string {
  return `severity ${severity} of 5, ${SEVERITY_LABELS[severity]}`;
}

/**
 * Screen-reader-friendly status phrase, e.g. `"status Open"`. Centralised
 * so we never accidentally read out the raw enum (`"status open"` — lowercase,
 * sounds like a verb to a screen reader) instead of the human label.
 */
export function statusA11y(status: FlagStatus): string {
  return `status ${STATUS_LABELS[status]}`;
}
