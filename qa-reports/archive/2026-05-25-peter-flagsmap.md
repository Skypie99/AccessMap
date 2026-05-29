# Peter Perf QA — flagsMap useMemo Optimization
**Date:** 2026-05-25
**Branch:** `feat/flags-map-2026-05-25`
**Base SHA:** 74e73d9
**Role:** Peter (Performance Engineer)

---

## Summary

Implemented the `flagsMap` useMemo optimization from the Peter perf audit backlog. Converts O(n) `Array.find()` flag lookups by ID into O(1) `Map.get()` calls. The Map is rebuilt once per `flags` state change via `useMemo`, so the cost is amortized — consumers pay nothing at lookup time.

---

## Changes Made

### `src/lib/flagsStore.tsx`

- Added `flagsMap: Map<string, FlagRow>` to `FlagsContextValue` type with JSDoc explaining the purpose and when to prefer it over `flags.find()`.
- Added `const flagsMap = useMemo(...)` inside `FlagsProvider` that builds the map from the `flags` array whenever it changes.
- Added `flagsMap` to the `value` useMemo (both the object and the dependency array).

### `src/screens/TasksScreen.tsx`

Two confirmed O(n) lookups existed and were updated:

1. **`selectedOpenCount`** (line ~202): `flags.find((f) => f.id === id)` → `flagsMap.get(id)`. Dependency array updated from `flags` → `flagsMap`.
2. **`runBulkAction`** (line ~284): `flags.find((f) => f.id === id)` → `flagsMap.get(id)`. Dependency array updated from `flags` → `flagsMap`.

`flagsMap` is destructured alongside `providerFlags` from `useFlags()`.

---

## Performance Impact

| Scenario | Before | After |
|---|---|---|
| `selectedOpenCount` with 10 selected, 50 flags | O(10 × 50) = 500 comparisons | O(10) map lookups |
| `selectedOpenCount` with 10 selected, 500 flags | O(10 × 500) = 5,000 comparisons | O(10) map lookups |
| `runBulkAction` filter with 20 selected, 500 flags | O(20 × 500) = 10,000 comparisons | O(20) map lookups |
| Map rebuild cost | n/a | O(n) once per flags change |

At the current typical flag count (<200), the difference is imperceptible. At >200 flags (the stated threshold), bulk-select operations in TasksScreen will see measurable improvement. The `flagsMap` is also now available to any future consumer — flagSearch, NearbyFlagsModal, ActivityFeedModal — without any additional provider changes.

---

## Lookups NOT converted (by design)

The following patterns were reviewed and left as-is:

- `flags.filter((f) => TRIAGE_STATUSES.includes(f.status))` — full-scan filter, no ID lookup, no Map equivalent.
- `flags.filter((f) => f.category === cat)` — category filter, not an ID lookup.
- `flags.filter((f) => f.user_id === user.id)` — user_id filter, not an ID lookup.
- `flags.filter((f) => f.status === 'open')` — status filter, not an ID lookup.
- `setFlags((prev) => prev.filter((f) => f.id !== id))` in `removeFlag` — this mutates the source array, which necessarily triggers a Map rebuild via `useMemo([flags])`. No action needed.
- `patchFlag` uses `prev.map(...)` similarly — already O(n) and must be since it updates the source.

---

## Quality Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm test --passWithNoTests --forceExit` | 752/752 passed |
| Branch created | `feat/flags-map-2026-05-25` |
| Merged to main | NO — awaiting Sky review |

---

## DECISIONS FOR SKY

None required. This is a non-breaking additive change:
- Existing consumers reading `flags` directly are unaffected.
- `flagsMap` is opt-in on the context — consumers use it only if they destructure it.
- No DB, RLS, or privacy-sensitive surface touched.
