# Wave 2 Search/Filter Performance Review
**Reviewer:** Peter | **Branch:** `feat/wave2-quick-wins` | **Date:** 2026-05-29

---

## Summary

Overall the implementation is solid. `useMemo` is used correctly, the pure filter lib is clean, and the Supercluster integration is exemplary. Two gaps need patching before this ships:

1. **`renderItem` not memoized in `MyWatchedModal`** — causes full visible-row re-renders on every keystroke. (High priority)
2. **No debounce on search inputs** in `TasksScreen` and `MyWatchedModal`. (Medium priority — worse in TasksScreen where the flag list can be larger)

---

## Finding 1 — `MyWatchedModal` renderItem not `useCallback`-wrapped

**File:** `src/components/MyWatchedModal.tsx:185`

**Problem:** `renderItem` is declared as a plain arrow function inside the component body:
```ts
const renderItem = ({ item }: { item: FlagRow }) => {
```
It gets a new reference on every render. React Native's `FlatList` treats a new `renderItem` reference as "everything may have changed" and re-renders all visible rows. This fires on every search keystroke and every status chip press, making the list jank on longer watch lists.

`TasksScreen` does this correctly — `renderFlagItem` is `useCallback`-wrapped at line 517. `MyWatchedModal` should match.

**Fix:**
```ts
const renderItem = useCallback(({ item }: { item: FlagRow }) => {
  const date = new Date(item.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const isResolved = item.status === 'resolved';
  return (
    // ... existing JSX unchanged ...
  );
}, [styles, color, handleUnwatch, onSelectFlag, onViewOnMap]);
```

Dependencies: `styles` and `color` are recreated each render (both call `makeStyles(color)` and `useColor()` inside the component), so they'll be stable only if those hooks are memoized externally — which they likely are via theme context. If `color` is an object reference from context it'll be stable; same for `styles` if `makeStyles` returns the same reference when `color` is unchanged. Add all identifiers the renderItem closure reads that aren't constants.

---

## Finding 2 — No debounce on search inputs

**Files:**
- `src/screens/TasksScreen.tsx:653` — `onChangeText={setSearchText}` passed to `SearchInputRow`
- `src/components/MyWatchedModal.tsx` — `searchQuery` state set directly via `SearchInputRow.onChangeText`

**Problem:** `displayFlags` useMemo re-runs on every keystroke. For a 10-item watched list this is fine. For `TasksScreen` (which can show all open+verified flags in the area — could be 50–200+ items) this is measurable jank on low-end devices.

**Fix — add a debounced shadow state (no external library needed):**

In `TasksScreen` (same pattern works in `MyWatchedModal` replacing `searchText` → `searchQuery`):

```ts
// Raw input value — bound to the TextInput so it feels instant
const [searchText, setSearchText] = useState('');
// Debounced value — used in displayFlags memo
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const id = setTimeout(() => setDebouncedSearch(searchText), 250);
  return () => clearTimeout(id);
}, [searchText]);

// In displayFlags useMemo, replace searchText with debouncedSearch:
const displayFlags = useMemo(() => {
  // ... existing logic ...
  const q = debouncedSearch.trim().toLowerCase();
  // ...
}, [flags, mineOnly, userId, minSeverity, categoryFilter, debouncedSearch]);
```

250ms is a good default — fast enough to feel responsive, slow enough to skip mid-word keystrokes.

**Note on the clear button:** when the user taps ✕, call `setSearchText('')` and `setDebouncedSearch('')` together (skip the timeout) so the list clears instantly.

---

## Finding 3 — Supercluster: GOOD, no changes needed

**File:** `src/components/PlatformMap.web.tsx:196`

The `ClusteredMarkers` component correctly memoizes everything:
- `index = useMemo(() => new Supercluster(...).load(features), [flags])` — only rebuilt when the flags prop changes ✅
- `flagsById = useMemo(() => new Map(...), [flags])` — memoized lookup ✅
- `recompute = useCallback(() => {...}, [map, index])` — only new reference when map or index changes ✅

Zero action needed here.

---

## Finding 4 — Status filter chips: GOOD, no changes needed

**File:** `src/components/MyWatchedModal.tsx:316–344`

Chips call `setStatusFilter(value)` which updates state and triggers a re-render. `displayFlags = useMemo(..., [flags, searchQuery, statusFilter])` then re-filters cheaply. The `FlatList` renders only the new filtered slice. This is the right pattern — chip presses are infrequent enough that the re-render cost is negligible.

The only compounding issue is the un-memoized `renderItem` (Finding 1) — fix that and chip presses will also be fast.

---

## Action items (priority order)

| # | File | Change | Effort |
|---|------|--------|--------|
| 1 | `MyWatchedModal.tsx:185` | Wrap `renderItem` in `useCallback` | ~5 min |
| 2 | `TasksScreen.tsx:143–182` | Add debounced shadow state, use in `displayFlags` | ~10 min |
| 3 | `MyWatchedModal.tsx` | Same debounce pattern for `searchQuery` | ~5 min |

Total fix time: ~20 min. No library installs needed — `useEffect` + `setTimeout` is sufficient.

---

## DECISIONS FOR SKY

None required. Both issues are correctness-class performance fixes with clear, low-risk solutions. Recommend Shamus applies them on `feat/wave2-quick-wins` before the Wave 2 merge.
