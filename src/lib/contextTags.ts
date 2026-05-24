/**
 * Context tags — a small, controlled vocabulary describing WHEN / UNDER WHAT
 * CONDITIONS an accessibility flag is most relevant. Reporters pick zero or
 * more of these on the ReportFlagModal to add nuance to a flag (e.g. "blocked
 * at high tide", "slippery when wet"). The set is intentionally short — it's
 * easier to grow a vocabulary than to deprecate one.
 *
 * Storage shape: `text[]` column on `public.flags` (see migration
 * supabase/migrations/2026-05-24_flag_context_tags.sql). The DB doesn't
 * validate the vocabulary; this file is the single source of truth.
 *
 * Pure module — no I/O, no React, no Supabase. Easy to unit-test.
 */

export type ContextTag =
  | 'morning_rush'
  | 'evening_rush'
  | 'after_dark'
  | 'school_hours'
  | 'high_tide'
  | 'when_wet'
  | 'snow_or_ice'
  | 'event_day'
  | 'construction';

/**
 * Canonical chip display order. The UI renders chips in this sequence so the
 * picker layout is stable across renders. Frozen so a caller can't reorder it
 * by accident.
 */
export const CONTEXT_TAGS: ReadonlyArray<ContextTag> = Object.freeze([
  'morning_rush',
  'evening_rush',
  'after_dark',
  'school_hours',
  'high_tide',
  'when_wet',
  'snow_or_ice',
  'event_day',
  'construction',
]);

/**
 * Human-readable label for each tag. Used for chip text and accessibility
 * labels. Frozen so a screen can't mutate it. If you change a label here,
 * remember screen readers will read the new value verbatim — keep it short
 * and natural.
 */
export const CONTEXT_TAG_LABELS: Readonly<Record<ContextTag, string>> = Object.freeze({
  morning_rush: 'Morning rush hour',
  evening_rush: 'Evening rush hour',
  after_dark: 'After dark / poor visibility',
  school_hours: 'School hours',
  high_tide: 'Blocked at high tide',
  when_wet: 'Slippery when wet',
  snow_or_ice: 'Snow or ice',
  event_day: 'Event days only',
  construction: 'Active construction',
});

/**
 * Maximum number of context tags a single flag may carry. The vocabulary
 * is 9 wide and most flags are relevant under 1–3 conditions; capping at
 * 5 keeps the chip strip readable and discourages "tag everything"
 * reports that dilute the signal. `toggleTag` enforces this on the way
 * in; `sanitizeTagList` enforces it on the way out (defensive against
 * dirty DB rows).
 */
export const MAX_CONTEXT_TAGS = 5;

/**
 * Lookup set for fast `isValidTag` checks. Built from CONTEXT_TAGS so the
 * two never drift.
 */
const VALID_TAG_SET: ReadonlySet<string> = new Set(CONTEXT_TAGS);

/**
 * Type guard: is the given value one of the known ContextTag strings?
 * Returns false for non-strings, unknown strings, empty strings, etc.
 *
 * Used by `sanitizeTagList` to scrub server-supplied arrays before they
 * reach the UI — a future schema widening (or dirty data) shouldn't crash
 * a render.
 */
export function isValidTag(value: unknown): value is ContextTag {
  return typeof value === 'string' && VALID_TAG_SET.has(value);
}

/**
 * Pure helper: toggle membership of `tag` in `current`.
 *   - If `current` contains `tag`, return a new array without it (order of
 *     remaining tags preserved).
 *   - If it doesn't, append `tag` to a new array.
 *
 * Never mutates `current`. Returns a fresh array even when the contents are
 * unchanged so React's referential-equality check still triggers a re-render
 * on a no-op toggle (matches the `taskSelection.toggleId` pattern).
 */
export function toggleTag(
  current: ReadonlyArray<ContextTag>,
  tag: ContextTag,
): ContextTag[] {
  const idx = current.indexOf(tag);
  if (idx !== -1) return current.filter((t) => t !== tag);
  // Cap enforcement: an "add" that would exceed MAX_CONTEXT_TAGS is a
  // no-op (still returns a fresh array so a parent's referential check
  // doesn't think state changed).
  if (current.length >= MAX_CONTEXT_TAGS) return [...current];
  return [...current, tag];
}

/**
 * Defensive scrub for an array of tags coming from anywhere we don't fully
 * trust (a database row, a deep-link, a future API client). Drops:
 *   - non-string values
 *   - strings not in CONTEXT_TAGS (unknown vocabulary)
 *   - duplicates (keeps first occurrence — preserves caller's intended order)
 *
 * Returns an empty array for null / undefined / non-array input so the
 * caller can always do `.map` or `.length` without a guard.
 *
 * Why dedupe-and-preserve-order (not sort-and-dedupe): the order may
 * eventually carry meaning to the reporter (e.g. they picked rush-hour
 * first because it's the worst case). Stable order keeps that intent.
 */
export function sanitizeTagList(raw: ReadonlyArray<unknown> | unknown): ContextTag[] {
  if (!Array.isArray(raw)) return [];
  const out: ContextTag[] = [];
  const seen = new Set<ContextTag>();
  for (const value of raw) {
    if (!isValidTag(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    // Truncate at MAX_CONTEXT_TAGS so a dirty DB row (or a future
    // schema widening that lets through more than the cap) can't render
    // an unbounded chip strip.
    if (out.length >= MAX_CONTEXT_TAGS) break;
  }
  return out;
}
