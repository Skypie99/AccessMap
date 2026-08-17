/**
 * Pure formatter for the "Export my data" Settings action.
 *
 * Renders a human-readable plain-text view of everything AccessMap has on
 * the signed-in user: their profile (display name, points), every flag
 * they've submitted, and (when the feedback table is enabled) every
 * feedback message they've sent.
 *
 * Why plain text, not JSON:
 *  - PIPEDA's "right of access" leans toward formats the data subject can
 *    actually read. JSON is intimidating to non-developers and reads as
 *    "developer dump" rather than "your data".
 *  - Plain text drops straight into an email, a Note, a printout, or a
 *    text file the user keeps for their records. No parsing required.
 *
 * Defensive contract:
 *  - `feedback` is optional. When `undefined`, the FEEDBACK section
 *    renders as "not enabled" — this is the path when the feedback
 *    migration hasn't been applied yet on the user's Supabase project.
 *    Pass `[]` to indicate "feedback is enabled but the user hasn't
 *    sent any messages" (renders as "0 items").
 *  - `generatedAt` is injectable so tests are deterministic. Defaults
 *    to `new Date()` at call time in production.
 *
 * The function is intentionally synchronous and pure — no I/O, no Supabase,
 * no clipboard. The caller (SettingsScreen) is responsible for fetching
 * the data and handing it to the clipboard. Keeping the formatter pure
 * means we can test every variation as a plain string-in / string-out
 * snapshot without mocking anything.
 */

import type { FlagRow } from '@/types/database';

export interface FeedbackRow {
  id: string;
  category: string;
  body: string;
  contact_email: string | null;
  created_at: string;
}

export interface ExportInput {
  user: {
    email?: string | null;
    display_name?: string | null;
    points?: number | null;
  };
  flags: readonly FlagRow[];
  // Optional — `undefined` means "feedback table not enabled on this
  // Supabase project yet" (the migration hasn't been applied). `[]`
  // means "enabled but the user hasn't sent any".
  feedback?: readonly FeedbackRow[];
  // Injected so the screen can map enum values to friendly labels
  // without this file having to depend on src/lib/flags.ts (avoiding a
  // circular import the day we move flags.ts).
  categoryLabel: (cat: FlagRow['category']) => string;
  // For deterministic tests. Defaults to `new Date()`.
  generatedAt?: Date;
}

// YYYY-MM-DD in UTC so the same export always renders identically no
// matter what timezone the user is in. (PIPEDA-style records should be
// reproducible — a user comparing two exports a year apart shouldn't see
// drift just because their device's TZ changed.)
function formatDate(iso: string): string {
  // Defensive: a malformed ISO falls through as the raw string so the
  // user still sees *something* readable rather than "Invalid Date".
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format the export. See module doc for the contract.
 *
 * Ordering: flags are rendered newest-first (matches listFlagsByUser's
 * server-side ordering — `created_at DESC`). Feedback is also newest-first
 * (matches listFeedbackByUser). Both are sorted defensively here too so
 * an upstream change doesn't accidentally scramble the export.
 */
export function formatDataExport(input: ExportInput): string {
  const generatedAt = input.generatedAt ?? new Date();
  const generatedDate = formatDate(generatedAt.toISOString());

  const emailLine = input.user.email ?? '(no email on file)';
  const displayName = input.user.display_name ?? '(not set)';
  // `??` only catches null/undefined — NaN and Infinity slip through and
  // would render as literal "NaN" / "Infinity" in the export. Number.isFinite
  // rejects NaN, +Infinity, -Infinity, and non-numbers, so 0 is the safe
  // fallback. Keeps PIPEDA "right of access" output honest (never shows the
  // user garbage where their point total should be).
  const points = Number.isFinite(input.user.points) ? input.user.points : 0;

  const lines: string[] = [];
  lines.push(`Flagstone data export for ${emailLine}`);
  lines.push(`Generated ${generatedDate}`);
  lines.push('');
  lines.push(`Display name: ${displayName}`);
  lines.push(`Points: ${points}`);
  lines.push('');

  // ---- REPORTS section -------------------------------------------------

  // Defensive newest-first sort. Stable for ties (preserves input order
  // when created_at matches — keeps the export deterministic).
  const sortedFlags = [...input.flags].sort((a, b) => b.created_at.localeCompare(a.created_at));

  lines.push(`REPORTS (${sortedFlags.length} flags):`);
  if (sortedFlags.length === 0) {
    lines.push('  (none yet)');
  } else {
    for (const f of sortedFlags) {
      const date = formatDate(f.created_at);
      // Defensive: if the caller's categoryLabel returns undefined for a
      // future/unknown category, fall back to the raw enum string. Without
      // this guard the export would print literal "undefined" — confusing,
      // and worse, it would hide what the actual category was.
      const category = input.categoryLabel(f.category) ?? f.category;
      lines.push(`  - ${date} · ${category} · severity ${f.severity}/5 · ${f.status}`);
      // Coords: 6 decimal places (~10cm precision) is fine for a
      // user-readable record. They're not editing surveying data.
      lines.push(`    ${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}`);
      // Description is optional; skip the line entirely when missing
      // so the user doesn't see an awkward "Description: " orphan.
      const desc = f.description?.trim();
      if (desc) lines.push(`    ${desc}`);
    }
  }
  lines.push('');

  // ---- FEEDBACK section ------------------------------------------------
  //
  // ⚑ IF YOU CAME HERE ASKING "why does my export contain
  // `[REPORT] v2 target=comment id=…`?" — because it should. Abuse reports are
  // written into `feedback` with the reporter's `user_id`, which makes them the
  // user's own data, which makes them part of a PIPEDA subject-access request.
  //
  // `MyFeedbackModal` hides those rows (HIGH-1) because it is a READING
  // surface and the envelope is internal encoding rendered as prose. This is a
  // COMPLETENESS surface, and the two are deliberately different. Sky's stance,
  // §SKY-6: exports must be complete; raw data in a data export is honest.
  // Filtering here to make the output tidier would quietly narrow what a person
  // is told about themselves, in the one place the whole point is not to.
  //
  // The divergence is enforced upstream: `listFeedbackByUser`'s
  // `excludeBodyPrefix` is opt-in, and `SettingsScreen`'s export call does not
  // pass it.

  if (input.feedback === undefined) {
    // Table not enabled (migration not applied) — be explicit so the
    // user knows the export is complete-for-now, not silently missing
    // a section.
    lines.push('FEEDBACK: not enabled');
  } else {
    const sortedFeedback = [...input.feedback].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    lines.push(`FEEDBACK (${sortedFeedback.length} items):`);
    if (sortedFeedback.length === 0) {
      lines.push('  (none yet)');
    } else {
      for (const fb of sortedFeedback) {
        const date = formatDate(fb.created_at);
        lines.push(`  - ${date} · ${fb.category}`);
        const body = fb.body.trim();
        if (body) lines.push(`    ${body}`);
      }
    }
  }
  lines.push('');
  lines.push('(End of export)');

  return lines.join('\n');
}
