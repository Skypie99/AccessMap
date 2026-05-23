# Feature Spec — Saved named filter sets on the Map — 2026-05-23

## Story

As a regular AccessMap user who scouts the same two or three areas
(say, *downtown commute* and *park paths*) and wants a different
filter combination for each, I want to save my current filter as a
named set, switch between sets with a tap, and delete the ones I no
longer use — so I never re-toggle five pills just to flip between
views I use every day.

This is the third "Now" item in `FEATURES.md` and the natural
follow-on to filter persistence (Loop 2, already merged). Filter
persistence remembers the *last* combination; this feature remembers
a small library of *named* combinations and lets the user choose.

## Scope

In:
- New module `src/lib/filterSets.ts` — AsyncStorage-backed CRUD for a
  small list of named `FilterSet` objects, with the same defensive
  validation pattern as `mapFilters.ts`.
- `listSets()`, `saveSet(name, current)`, `deleteSet(id)`. Hard cap
  at 5 sets. Duplicate names rejected (case-insensitive trim match).
- A "Saved" row in the Map filter panel, above the "Categories" row:
  - Zero sets: empty-state copy + "Save current filter" CTA.
  - 1–5 sets: horizontal pill row with each set's name. Tap to
    APPLY (overwrites `activeCategories` / `minSeverity` /
    `activeStatuses`). Long-press → delete confirmation.
  - "+ Save current" tail button visible while under the cap.
- Save flow uses a cross-platform `Modal` + `TextInput` (`Alert.prompt`
  is iOS-only and the user is on both platforms; one path is
  simpler than two).
- Accessibility: each chip carries `accessibilityRole="button"`, a
  named label, a hint, and `selected` state when the chip matches the
  active filter triple. Delete confirmation alert.

Out (explicitly):
- No auto-apply on launch. The mapFilters hydration continues to
  load the *last-used* values; saved sets are explicit picks. Default
  set selection is a separate future feature.
- No server-side sync. Pure on-device, same as mapFilters.ts.
- No icons or color swatches per set. v1 is text chips only.
- No "edit set" affordance. Delete + re-save covers it for now and
  keeps the surface small.
- No drag-reorder. Sets are listed in creation order (oldest first).
- No usage analytics.

## Acceptance criteria

1. With zero sets saved, the filter panel shows a "Saved" subheading,
   one line of helper copy, and a "Save current filter" button. The
   rest of the filter panel (Categories / Severity / Status) is
   unchanged.
2. Setting a few filters and tapping "Save current filter" prompts
   for a name. Submitting a non-empty unique name closes the prompt
   and shows the new chip in the saved row.
3. Tapping a saved chip immediately reflects its filter combination
   in the panel and the map results. The chip becomes `selected`.
4. Long-pressing a saved chip opens a native confirmation alert.
   Confirming removes that set.
5. Submitting a duplicate name (case-insensitive, trimmed) shows a
   user-facing error and does not save.
6. Trying to save a 6th set shows a user-facing error ("You can save
   up to 5 filter sets") and does not save.
7. AsyncStorage corruption (hand-edited devtools, partial blob) is
   tolerated: `listSets()` returns whatever it can validate, dropping
   garbage entries silently.
8. `npm run typecheck` exits 0.
9. No new npm dependency. AsyncStorage is already on the tree; id
   generation uses `Date.now()` + `Math.random()` slice.

## Design notes

Module shape (`src/lib/filterSets.ts`):

```ts
type FilterSet = {
  id: string;
  name: string;
  categories: FlagCategory[];
  minSeverity: FlagSeverity;
  statuses: FlagStatus[];
  createdAt: string;
};
```

- Single AsyncStorage key `@accessmap/filter_sets_v1`. Payload is
  `FilterSet[]` serialised as JSON.
- Validation mirrors `mapFilters.ts` — reuse the same `CATEGORY_ORDER`
  / `STATUS_ORDER` / `SEVERITY_ORDER` lookup sets, drop entries with
  unknown enum values rather than failing the whole load.
- `saveSet` throws a typed `FilterSetError` (`code: 'cap' | 'duplicate' |
  'empty'`) so the caller can render a specific Alert. UI code uses
  `instanceof FilterSetError` and falls back to `errorMessage` for
  anything else.
- `MAX_SETS = 5`. One number to twiddle if we ever bump it.
- Ids are `Date.now().toString(36) + Math.random().toString(36).slice(2,6)` —
  short, sortable enough, no UUID dep.

UI wiring in `MapScreen.tsx`:

- New state `savedSets: FilterSet[]`, hydrated once on mount alongside
  the existing `mapFilters` hydration. Errors during list logged but
  the rest of the screen renders normally.
- New state `nameModalOpen: boolean` + `nameDraft: string` for the
  save-name flow. Submit calls `saveSet(...)`, on success pushes the
  new set into local state. On error shows `Alert.alert`.
- Long-press handler on chip → `Alert.alert(..., [{ text: 'Delete',
  style: 'destructive', onPress: () => removeSet(id) }])`.
- "Apply" path: write to `setActiveCategories`/`setMinSeverity`/
  `setActiveStatuses` and rely on the existing save-effect to push
  through to `mapFilters.ts` storage. No extra writes.
- "Selected" state on a chip compares the chip's `(categories,
  minSeverity, statuses)` triple to the active triple. Categories
  and statuses are compared as sets (order-insensitive) so a stored
  `[a, b]` matches an active `[b, a]`.

Render order inside the filter panel:
```
Filter flags                                 Clear
─────────────────────────────────────────────────
SAVED                                      (new)
[chip] [chip] [+ Save current]             (new)
─────────────────────────────────────────────────
CATEGORIES
…unchanged…
```

## Risks / what could go wrong

- Hidden state if all 5 sets exist but none matches the current
  filter. Mitigation: the "+ Save current" button is hidden when
  cap is reached; the user has to delete one first. Helper text
  inside the (now disabled or removed) tail position explains this.
  For v1 we just hide the "+ Save" button and let the user discover
  the cap when they try the long-press-delete flow.
- Long-press is invisible without a hint. Mitigation: chip
  `accessibilityHint` reads "Long press to delete this saved
  filter."
- Race on rapid taps (apply → save before state lands). Negligible
  in practice — both operations write through React state — but the
  save-effect in `mapFilters.ts` is already debounced by React's
  batching.

## Verification plan

- `npm run typecheck` green before and after each commit.
- Manual trace of each flow on paper:
  - Save flow: open panel → tap save → modal → submit → set appears.
  - Apply flow: tap chip → filters change → map results re-fetch via
    the existing `setStatuses` mirror.
  - Delete flow: long-press chip → confirm → set vanishes.
  - Cap path: save 5 sets, try a 6th → error alert.
  - Duplicate path: save "A", try "a " → error alert (case+trim).
- `filterSets.test.ts` covers list/save/delete + cap + duplicate +
  corrupt-blob paths against the same in-memory AsyncStorage stub
  used by `mapFilters.test.ts`.

## Out-of-scope items spotted

None new. Pre-existing backlog items (clustering, pagination, RLS
hardening) continue to apply.
