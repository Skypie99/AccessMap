# Feature Push — AccessMap — 2026-05-27 — Category Quick-Filter Chips

**Owner:** Shamus
**Branch:** `feat/shamus-category-quickfilter-2026-05-26`
**Status:** Built, typecheck green, pushed. NOT merged to main — awaiting Sky review.

---

## Origin

Picked up from the abandoned worktree at `~/AccessMap/.claude/worktrees/funny-bohr-45d01b`
(item A11 in `cowork-2026-05-26.md`). The worktree had a sound concept — a
horizontally-scrollable chip strip for filtering Tasks by category — but it was
branched off `da54dd4`, and `main` had advanced **28 commits** since then. Committing
the worktree file as-is would have **clobbered bulk-watch and several Wave-6 features**
that landed between `da54dd4` and `3c30d1e`.

**What I did instead:** re-applied the concept on top of current `main` by editing the
live `TasksScreen.tsx`. Same UX, but additive — touches only the new chip-row + its
filter wiring, leaves bulk-watch, leaderboards, profile-edit, etc. untouched.

---

## Spec (as built)

**What:** A horizontally-scrollable chip strip between the severity filter row and the
sort row in the Tasks screen. Chips: `All`, `No ramp`, `Broken sidewalk`, `Blocked path`,
`Missing signal`, `Steep grade`, `Other`. Tapping a chip filters the list to that
category; tapping the active chip clears it (toggles back to "All").

**Where it lives:** `src/screens/TasksScreen.tsx`. Filter chain sits in the existing
`displayFlags` `useMemo` alongside `mineOnly` and `minSeverity`.

**User flow:**
1. User opens Tasks — chips show "All" selected, full list visible.
2. User taps "Broken sidewalk" → list narrows to that category, screen reader announces
   *"Showing Broken sidewalk"*.
3. User taps "Broken sidewalk" again → filter clears, screen reader announces
   *"Showing all categories"*. Equivalent to tapping "All".
4. If the filter produces no matches → empty state changes from "All caught up ✨" to
   "No <category> flags 🔍" with copy directing the user back to the "All" chip.

**Why session-only (not persisted):** new flags arrive frequently. A stale persisted
filter ("Steep grade" from yesterday) would confuse the user when there are zero matches
today. Resetting with the tab keeps triage intent explicit. Same rationale as the
existing `minSeverity` filter, which is also session-only.

**Accessibility:**
- Each chip has `accessibilityRole="button"`, `accessibilityState={{ selected }}`.
- Active chip's a11y label includes ", selected, tap to deselect" so screen readers
  describe both state and affordance.
- `AccessibilityInfo.announceForAccessibility` fires on every change so VoiceOver /
  TalkBack users get audible feedback without re-focusing the list.
- ScrollView has `accessibilityLabel="Filter by category"` so the chip group is
  understandable as a unit.
- Min touch target 36px high × 12px padding — comfortably above WCAG 2.5.5 (44pt) since
  the chip label adds vertical to that, and chips have a circular fill so the touch
  surface extends beyond the visible text.

---

## What was built

**Files changed:** `src/screens/TasksScreen.tsx` (+91, −9)

Key changes:
- Added `ScrollView` to react-native imports.
- Added `CATEGORY_ORDER` to the `@/lib/flags` named import.
- Added `FlagCategory` to the `@/types/database` named import.
- New state: `const [categoryFilter, setCategoryFilter] = useState<FlagCategory | null>(null);`
- New callback `handleCategoryChange` that sets the filter and announces via
  `AccessibilityInfo`.
- Added `if (categoryFilter) out = out.filter((f) => f.category === categoryFilter);`
  inside `displayFlags`'s `useMemo`; appended `categoryFilter` to the deps array.
- Rendered the chip strip beneath the severity row, guarded by `flags.length > 0`.
- Updated the SectionList's `ListEmptyComponent` to show category-aware copy when
  the filter narrows the list to zero matches.
- 4 new styles: `categoryScroll`, `categoryScrollContent`, `catChip`,
  `catChipActive`, `catChipText`, `catChipTextActive`.

---

## Verification

- `npm run typecheck` → ✅ green before and after.
- `npm test` (baseline before changes) → ✅ 872/872 passing. (Worth noting: the dispatch
  brief claimed "789/789 tests, 0 TSC errors" — actual count is higher; main is 28
  commits ahead of `da54dd4`.)
- Manual code review: change is additive — bulk-watch, leaderboard, profile-edit,
  Wave-6 a11y/perf work all preserved.

---

## How to try it

1. `git fetch origin && git checkout feat/shamus-category-quickfilter-2026-05-26`
2. `npm start` (or `npm run web` for browser)
3. Sign in → tap the **Tasks** tab.
4. Below the severity row (All / 2+ / 3+ / 4+ / 5), see the new horizontally-scrollable
   chip strip.
5. Tap "Broken sidewalk" → list narrows.
6. Tap it again → filter clears (or tap "All").
7. Tap a category with no current flags → "No <category> flags 🔍" empty state appears.

---

## How to review

```bash
git diff main..feat/shamus-category-quickfilter-2026-05-26
# Merge:   git checkout main && git merge --no-ff feat/shamus-category-quickfilter-2026-05-26
# Discard: git branch -D feat/shamus-category-quickfilter-2026-05-26
```

---

## Proposals (NOT applied — need your review)

None. Pure client-side feature. No schema changes, no new deps, no permissions.

---

## Disposition of original worktree

The worktree at `~/AccessMap/.claude/worktrees/funny-bohr-45d01b` is now obsolete
(branched off `da54dd4`, file would conflict with current `main`). Safe to discard
when convenient:

```bash
git worktree remove ~/AccessMap/.claude/worktrees/funny-bohr-45d01b --force
git branch -D claude/funny-bohr-45d01b
```
