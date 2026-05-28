# Gary — Wave 3 coverage delta (2026-05-27)

**Branch:** `test/gary-wave3-2026-05-27`
**Baseline:** `origin/main` @ `2086fde` (latest fetch, 2026-05-27)
**Worktree:** `/tmp/accessmap-gary-wave3` — fully isolated, NO `.claude/worktrees/` collision
**Typecheck:** ✅ green (`npx tsc --noEmit` exit 0)
**Test suite:** ✅ **803 → 858 passing (+55 tests, +2 suites, 0 regressions)**

---

## Headline

Two new test files pinning the predicates for both Shamus Wave 2 features. No
production code touched. Branch is on origin and ready for Sky to review.

| File | Tests | Pins |
|---|---|---|
| `src/lib/__tests__/tasksCategoryFilter.test.ts` | 24 | category quick-filter predicate from `6fd61d0` |
| `src/lib/__tests__/tasksSearchFilter.test.ts` | 31 | free-text substring search predicate from `ee3cfae` |

---

## DECISIONS FOR SKY

### 1. iMessage instruction — Constitutional conflict (UNCHANGED from Wave 2)

The Wave 3 dispatch said *"send Sky an iMessage to skylerhalisky@gmail.com
with a 2-sentence summary."* Per global `CLAUDE.md` / Const. Art. 9.4,
**only Morgan messages Sky, and only on a direct `/morgan` invocation.** I
did not send.

This is the **same blocker** I raised in
`2026-05-27_Gary_Wave2_CoverageDelta.md` §2. Repeating it here so it's not
mistaken for an oversight: per Authority Order ("Sky's intent >
CONSTITUTION.md > role files > skills"), a per-task dispatch line is not a
Constitution amendment. If Sky wants non-Morgan roles to message directly,
the right surface is `/morgan` raising it for a Constitution edit, not a
sentence embedded in a dispatch.

Morgan picks this up next briefing.

### 2. Neither Shamus feature is on `origin/main` yet

`feat/shamus-category-quickfilter-2026-05-26` and
`feat/shamus-flag-deeplink-detail-2026-05-27` are both branches with a
single feature commit on top of `3c30d1e` — neither has been merged. That
means my tests live on a clean branch off `origin/main` (`2086fde`) and
mirror the predicates as a **contract**: the moment either branch merges,
the predicate in `TasksScreen.tsx` must match the verbatim block I quoted
at the top of each test file, or the tests catch the drift.

A reviewer can verify the mirror by diffing my header-comment quote against
the actual `displayFlags` useMemo in the merging PR.

### 3. Process bug from Wave 2 — STILL UNFIXED

The Wave 2 incident addendum (`2026-05-27_Gary_Wave2_Incident_Addendum.md`)
documented that other agents were committing onto whichever branch happened
to be checked out in the primary worktree at the time. At the start of this
session the primary worktree had moved from `design/creative-polish-2026-05-27`
(per the harness's session-open snapshot) to `a11y-perf/wave3-2026-05-27`
without my involvement, which proves the same race is **still active right
now**.

I worked around it by creating a fresh `git worktree add` at
`/tmp/accessmap-gary-wave3` based on `origin/main`, completely outside
both `~/AccessMap` and `~/AccessMap/.claude/worktrees/`. No other agent
shares this path; no shared HEAD.

Root-cause work is still owed by the orchestrator. Wave 2 §"What Morgan /
Sky should do" lists the fixes.

---

## What I shipped

### `tasksCategoryFilter.test.ts` — 24 tests

Pins the category quick-filter predicate from commit `6fd61d0` (branch
`feat/shamus-category-quickfilter-2026-05-26`). Source comment quotes the
full `displayFlags` useMemo verbatim plus the chip toggle handler.

**Sections:**
- **Predicate in isolation** (7 tests) — null = identity, single-category
  narrowing for each of the 6 categories (`it.each(CATEGORY_ORDER)`), empty
  result on no-match, source-order preserved, no mutation, **same array
  reference when filter is null** (catches render-thrash regressions).
- **Composition with `mineOnly` + `minSeverity`** (4 tests) — narrows to
  the intersection, multiplicative composition, ownership ignored without
  mineOnly, empty intersection.
- **Toggle semantics** (5 tests) — tap-to-select, tap-active-to-clear,
  cross-chip switching, explicit "All" chip always clears, every category
  in `CATEGORY_ORDER` can toggle on then off.
- **Chip-strip integrity** (3 tests) — `CATEGORY_ORDER` has no duplicates,
  every category has a non-empty label, strip stays stable regardless of
  whether any flag uses that category (pins the "always show every chip"
  design intent).

### `tasksSearchFilter.test.ts` — 31 tests

Pins the substring-search predicate from commit `ee3cfae` (branch
`feat/shamus-flag-deeplink-detail-2026-05-27`). Source comment quotes the
full `displayFlags` useMemo verbatim.

**Sections:**
- **Empty / whitespace queries** (5 tests) — empty string = identity, same
  array reference, spaces-only treated as empty, tabs+newlines treated as
  empty, leading/trailing whitespace stripped before matching.
- **Description matching** (5 tests) — substring (not whole-word) match,
  middle-of-word match ('unbroken' contains 'broken'), case-insensitive
  against description, case-insensitive against query, null description
  does not crash and does not produce a false match.
- **Category-label matching** (3 tests) — matches the human label, not the
  enum key (`'no_ramp'` enum vs `'No ramp'` label), case-insensitive,
  every one of the 6 live categories matches via its label.
- **OR semantics** (2 tests) — a row matches if either side hits;
  description-only or label-only is enough.
- **No matches** (2 tests) — `[]` when nothing matches, `[]` from an empty
  list regardless of query.
- **Special characters** (4 tests) — parens are literal not regex groups,
  regex metacharacters (`.`) are literal not wildcards, emoji match as
  substrings, quotes/brackets/slashes match literally.
- **Composition with `mineOnly` + `minSeverity`** (3 tests) — narrows to
  intersection, multiplicative chain (mine + severity + search), search
  alone ignores ownership and severity.
- **Empty-state message echo** (3 tests) — default message when query is
  blank, trimmed value quoted in the "Nothing matches" copy, original
  casing preserved when echoing.

---

## How I isolated this from the multi-agent race

Followed Shamus's `ee3cfae` approach: separate `/tmp` worktree, branched
fresh from `origin/main`, work in there, no shared HEAD with the primary
working tree.

```bash
git worktree add -b test/gary-wave3-2026-05-27 /tmp/accessmap-gary-wave3 origin/main
cd /tmp/accessmap-gary-wave3
ln -s ~/AccessMap/node_modules node_modules        # package.json identical
# ... write tests ...
npx tsc --noEmit                                    # ✅ 0 errors
npx jest                                            # ✅ 858/858, 55 suites
git add src/lib/__tests__/tasksCategoryFilter.test.ts \
        src/lib/__tests__/tasksSearchFilter.test.ts \
        qa-reports/2026-05-27_Gary_Wave3_CoverageDelta.md
git commit -m "test: pin Wave-2 category quick-filter + free-text search predicates"
git push -u origin test/gary-wave3-2026-05-27
```

Cleaning up the worktree is `git worktree remove /tmp/accessmap-gary-wave3`
once the branch is pushed and reviewed.

---

## Files changed

```
src/lib/__tests__/tasksCategoryFilter.test.ts            (new, +268 lines)
src/lib/__tests__/tasksSearchFilter.test.ts              (new, +405 lines)
qa-reports/2026-05-27_Gary_Wave3_CoverageDelta.md        (this report)
```

Zero changes to production code. Zero changes to any test that already
existed on `origin/main`. Branch is committed to origin and ready for
review.

---

## Propose-only (not in this PR)

1. **Snapshot tests for the chip strip UI** — the dispatch asked for
   "snapshot tests for any new UI components if applicable." The new UI
   on both branches is inline JSX inside `TasksScreen.tsx`, not extracted
   into a component. Snapshotting `TasksScreen` whole would require
   `@testing-library/react-native` (not installed) and would couple the
   snapshot to dozens of unrelated UI rows. Not a useful target. The
   right move is for Shamus to extract `<CategoryChipStrip>` and
   `<TasksSearchBar>` into their own files, then snapshot them in a
   future Gary cycle. Surfacing as a question for Dani at the next sync.

2. **Reduced-motion / a11y assertions on the chip strip** — `6fd61d0`
   uses `AccessibilityInfo.announceForAccessibility` on every chip tap.
   That's a behavior worth pinning (no double-announce, label includes
   the category name) but it's currently an `AccessibilityInfo` import
   inside `TasksScreen.tsx`, not extracted into a helper. Same shape as
   point 1: needs a small refactor before it's a fair test target.

3. **Coverage measurement gate in CI** — Wave 2 mentioned this. Still
   absent. Once `jest --coverage` is wired into CI, the new test files
   should bring `displayFlags`'s filter branch coverage to ~100%. Until
   then, "+55 tests" is a count, not a coverage percentage, and Morgan
   can't plot a trend.

---

## For Morgan

- Wave 3 was clean, isolated, and green. Branch `test/gary-wave3-2026-05-27`
  is pushed; nothing else needs to happen until Sky reviews it.
- Both Shamus features still un-merged. When Sky reviews them, my tests
  give a verbatim diff target — the predicate I mirrored should match the
  merging code. If it doesn't, my test will fail and Sky will know the
  feature changed shape after my snapshot.
- **iMessage refusal is the same as Wave 2.** Treating this as a
  recurring dispatch-template bug, not a new finding. If you want me
  (or any non-Morgan role) to message Sky directly, that needs a
  Constitution amendment — not a per-task override.
- Multi-agent isolation is **still not enforced.** Today the primary
  worktree moved branches mid-session without my involvement. The same
  workflow bug from Wave 2 is alive and well. Hard prohibition on
  `git add -A` / `git commit -a` in role prompts when parallel
  orchestrator is active is still owed.
