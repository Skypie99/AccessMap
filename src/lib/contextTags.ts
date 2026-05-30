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
  // ── General "when / under what conditions" tags ──
  | 'morning_rush'
  | 'evening_rush'
  | 'after_dark'
  | 'school_hours'
  | 'high_tide'
  | 'when_wet'
  | 'snow_or_ice'
  | 'event_day'
  | 'construction'
  // ── Seasonal tags (W6-5) — time-of-year context. A subset of context
  //    tags that share the same flags.context_tags column. See SEASONAL_TAGS. ──
  | 'icy_winter'
  | 'wet_spring'
  | 'construction_temporary'
  | 'shaded_summer'
  | 'event_temporary';

/**
 * Canonical chip display order. The UI renders chips in this sequence so the
 * picker layout is stable across renders. Frozen so a caller can't reorder it
 * by accident.
 *
 * NOTE: this is the GENERAL vocabulary only — seasonal tags live in their own
 * `SEASONAL_TAGS` array so the two pickers in ReportFlagModal stay separate.
 * Validation (`isValidTag`) and the display-label lookup (`tagLabel`) span
 * BOTH lists; only the chip rendering is split.
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
 * The seasonal subset of ContextTag. Kept as an explicit union (rather than
 * derived from the array) so callers like FlagDetailModal can narrow to it.
 */
export type SeasonalTag =
  | 'icy_winter'
  | 'wet_spring'
  | 'construction_temporary'
  | 'shaded_summer'
  | 'event_temporary';

/**
 * Seasonal tags (W6-5) — a small subset of context tags describing WHEN IN THE
 * YEAR a barrier applies. They give time-aware context to flags that aren't
 * year-round issues (e.g. "icy in winter", "flooded in spring", a construction
 * detour that clears in fall). Stored in the same `flags.context_tags` column;
 * rendered in their own chip group so the seasonal angle reads clearly.
 *
 * Frozen and intentionally short — Sky can expand the list later.
 */
export const SEASONAL_TAGS: ReadonlyArray<SeasonalTag> = Object.freeze([
  'icy_winter',
  'wet_spring',
  'construction_temporary',
  'shaded_summer',
  'event_temporary',
]);

/**
 * Human-readable label for each tag. Used for chip text and accessibility
 * labels. Frozen so a screen can't mutate it. If you change a label here,
 * remember screen readers will read the new value verbatim — keep it short
 * and natural.
 */
export const CONTEXT_TAG_LABELS: Readonly<Record<Exclude<ContextTag, SeasonalTag>, string>> =
  Object.freeze({
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
 * Human-readable labels for the seasonal tags. Kept in a separate map from
 * CONTEXT_TAG_LABELS so each chip group owns its own vocabulary; `tagLabel`
 * unifies the two for any code that just needs "the label for this tag".
 */
export const SEASONAL_TAG_LABELS: Readonly<Record<SeasonalTag, string>> = Object.freeze({
  icy_winter: 'Icy in winter',
  wet_spring: 'Flooded in spring',
  construction_temporary: 'Temporary construction',
  shaded_summer: 'Shaded in summer',
  event_temporary: 'Temporary event',
});

/**
 * Display label for ANY context tag — general or seasonal. Use this anywhere
 * a tag from a mixed source (e.g. a flag's stored `context_tags` array) needs
 * to be shown, so seasonal and general tags both resolve correctly.
 */
export function tagLabel(tag: ContextTag): string {
  return isSeasonalTag(tag) ? SEASONAL_TAG_LABELS[tag] : CONTEXT_TAG_LABELS[tag];
}

/**
 * Type guard: is this tag one of the seasonal ones? Lets the detail view
 * group seasonal chips separately from general context chips.
 */
export function isSeasonalTag(tag: ContextTag): tag is SeasonalTag {
  return SEASONAL_TAG_SET.has(tag);
}

const SEASONAL_TAG_SET: ReadonlySet<string> = new Set(SEASONAL_TAGS);

/**
 * Maximum number of context tags a single flag may carry — SHARED across the
 * general and seasonal groups, since both write to the one `context_tags`
 * column. Most flags are relevant under 1–3 conditions; capping at 5 keeps the
 * chip strip readable and discourages "tag everything" reports that dilute the
 * signal. `toggleTag` enforces this on the way in; `sanitizeTagList` enforces
 * it on the way out (defensive against dirty DB rows).
 */
export const MAX_CONTEXT_TAGS = 5;

/**
 * Lookup set for fast `isValidTag` checks. Spans BOTH the general and seasonal
 * vocabularies so a stored seasonal tag validates (and therefore renders) just
 * like a general one. Built from the two source arrays so they never drift.
 */
const VALID_TAG_SET: ReadonlySet<string> = new Set([...CONTEXT_TAGS, ...SEASONAL_TAGS]);

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
export function toggleTag(current: ReadonlyArray<ContextTag>, tag: ContextTag): ContextTag[] {
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
