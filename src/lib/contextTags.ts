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
  | 'event_temporary'
  // ── Disability tags (Sprint 3) — WHO a barrier affects. Another subset of
  //    context tags sharing the same flags.context_tags column. Lets a user
  //    filter the map to barriers relevant to their access need. The tag
  //    describes the BARRIER ("this is a mobility barrier"), never the
  //    reporter's own disability. See DISABILITY_TAGS. ──
  | 'mobility_barrier'
  | 'vision_hazard'
  | 'hearing_concern'
  | 'cognitive_load'
  | 'temporary_closure';

/**
 * The GENERAL subset of ContextTag — everything in CONTEXT_TAGS (i.e. neither
 * a seasonal nor a disability tag). Typing CONTEXT_TAGS / CONTEXT_TAG_LABELS
 * with this (rather than the full union) keeps `CONTEXT_TAG_LABELS[tag]`
 * well-typed in the general chip picker, since the seasonal and disability
 * members widened the union.
 */
export type GeneralContextTag = Exclude<ContextTag, SeasonalTag | DisabilityTag>;

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
export const CONTEXT_TAGS: readonly GeneralContextTag[] = Object.freeze([
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
export const SEASONAL_TAGS: readonly SeasonalTag[] = Object.freeze([
  'icy_winter',
  'wet_spring',
  'construction_temporary',
  'shaded_summer',
  'event_temporary',
]);

/**
 * The disability subset of ContextTag. Like SeasonalTag, kept as an explicit
 * union (not derived from the array) so callers can narrow to it.
 */
export type DisabilityTag =
  | 'mobility_barrier'
  | 'vision_hazard'
  | 'hearing_concern'
  | 'cognitive_load'
  | 'temporary_closure';

/**
 * Disability tags (Sprint 3) — a small subset of context tags describing WHO a
 * barrier affects, so a user with a specific access need can filter the map to
 * only the barriers relevant to them (mobility, vision, hearing, cognitive,
 * temporary). Stored in the same `flags.context_tags` column; rendered in their
 * own chip group so the "who this affects" angle reads clearly.
 *
 * IMPORTANT privacy boundary (Jordan gate): each tag describes the BARRIER, not
 * the reporter's disability. "mobility_barrier" means "this obstacle affects
 * wheelchair/walker/scooter users" — it never records anything about who filed
 * or who is reading the flag.
 *
 * Frozen and intentionally short — Sky can expand the list later.
 */
export const DISABILITY_TAGS: readonly DisabilityTag[] = Object.freeze([
  'mobility_barrier',
  'vision_hazard',
  'hearing_concern',
  'cognitive_load',
  'temporary_closure',
]);

/**
 * Human-readable label for each tag. Used for chip text and accessibility
 * labels. Frozen so a screen can't mutate it. If you change a label here,
 * remember screen readers will read the new value verbatim — keep it short
 * and natural.
 */
export const CONTEXT_TAG_LABELS: Readonly<Record<GeneralContextTag, string>> = Object.freeze({
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
 * Human-readable labels for the disability tags. Kept in a separate map (like
 * SEASONAL_TAG_LABELS) so each chip group owns its own vocabulary; `tagLabel`
 * unifies all three for code that just needs "the label for this tag". These
 * read as plain-language descriptions of who a barrier affects, since screen
 * readers speak them verbatim in both the picker and the map filter.
 */
export const DISABILITY_TAG_LABELS: Readonly<Record<DisabilityTag, string>> = Object.freeze({
  mobility_barrier: 'Wheelchair, walker, or scooter',
  vision_hazard: 'Blind or low vision',
  hearing_concern: 'Deaf or hard of hearing',
  cognitive_load: 'Confusing layout or signage',
  temporary_closure: 'Temporarily closed',
});

/**
 * Display label for ANY context tag — general or seasonal. Use this anywhere
 * a tag from a mixed source (e.g. a flag's stored `context_tags` array) needs
 * to be shown, so seasonal and general tags both resolve correctly.
 */
export function tagLabel(tag: ContextTag): string {
  if (isSeasonalTag(tag)) return SEASONAL_TAG_LABELS[tag];
  if (isDisabilityTag(tag)) return DISABILITY_TAG_LABELS[tag];
  return CONTEXT_TAG_LABELS[tag];
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
 * Type guard: is this tag one of the disability ones? Lets the detail view and
 * the map filter narrow to the disability subset and group its chips
 * separately from general/seasonal context chips.
 */
export function isDisabilityTag(tag: ContextTag): tag is DisabilityTag {
  return DISABILITY_TAG_SET.has(tag);
}

const DISABILITY_TAG_SET: ReadonlySet<string> = new Set(DISABILITY_TAGS);

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
const VALID_TAG_SET: ReadonlySet<string> = new Set([
  ...CONTEXT_TAGS,
  ...SEASONAL_TAGS,
  ...DISABILITY_TAGS,
]);

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
export function toggleTag(current: readonly ContextTag[], tag: ContextTag): ContextTag[] {
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
export function sanitizeTagList(raw: readonly unknown[] | unknown): ContextTag[] {
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

/**
 * Pure predicate powering the map's "Who does this affect?" filter (Sprint 3).
 * Given a flag's stored `context_tags` and the set of disability tags the user
 * has selected, decide whether the flag should stay visible.
 *
 * Semantics:
 *   - No selection (empty `selected`) → always visible. This is the default,
 *     "show everything" state, so legacy flags with no disability tag are
 *     never hidden unless the user actively narrows by access need.
 *   - One or more selected → OR match: the flag is visible if it carries AT
 *     LEAST ONE of the selected disability tags. A user with multiple needs
 *     (e.g. mobility + vision) wants every barrier touching either, not only
 *     barriers tagged with both.
 *   - A flag with no disability tags is hidden whenever a filter is active —
 *     it isn't known to affect the selected need.
 *
 * Defensive: tolerates a missing/dirty `tags` value (null, undefined,
 * non-array) by treating it as "no tags", so a bad DB row can't crash the
 * map filter. Kept here (pure, no React/Supabase) so the filter logic is
 * unit-testable independent of the screen.
 */
export function matchesDisabilityFilter(
  tags: readonly unknown[] | null | undefined,
  selected: readonly DisabilityTag[],
): boolean {
  if (selected.length === 0) return true;
  if (!Array.isArray(tags)) return false;
  return selected.some((tag) => tags.includes(tag));
}
