# Abandoned Branch Triage — AccessMap
**Date:** 2026-05-28  
**Analyst:** Archi (Cycle 6-Shadow)  
**Mode:** Read-only analysis

---

## Overview

Task requested triage of two branches: `heatmap-severity` and `tasks-search`. Neither name exists exactly in the repo. Three related branches were analyzed instead:

1. `feat/heatmap-severity-gradient-2026-05-25` — Last commit: c55c0a5 (2026-05-26)
2. `feat/heat-map-severity-2026-05-27` — Last commit: c797d9f (2026-05-28)
3. `feat/tasks-search-2026-05-25` — Last commit: 91cdb9f (2026-05-28)

---

## Analysis by Branch

### 1. `feat/heatmap-severity-gradient-2026-05-25`

**Last commit:** c55c0a5 2026-05-26 `fix(tokens): replace raw values with theme tokens in heatmap feature (Dani compile)`

**Divergence from main:** 5 unique commits
```
c55c0a5 fix(tokens): replace raw values with theme tokens in heatmap feature (Dani compile)
e1ea455 docs(qa): night feature push report — heatmap shipped, Tasks 1+2 verified already on main
e6ddb0e feat(heatmap): MapScreen toggle, disclaimer banner, in-memory wiring
d30a28c feat(heatmap): render HeatCell[] as Circle overlays on web + native
629e5e0 feat(heatmap): heatmap.ts grid binner + 17 unit tests
```

**Subsumption check:** NOT a descendant of main (ancestor check failed). Contains its own implementation of heatmap grid binning + rendering.

**File changes vs main:** +754 lines across 7 files:
- `src/lib/heatmap.ts` (181 lines new)
- `src/lib/__tests__/heatmap.test.ts` (186 unit tests)
- `src/components/PlatformMap.tsx` (58 lines added)
- `src/components/PlatformMap.web.tsx` (63 lines added)
- `src/screens/MapScreen.tsx` (107 lines added)
- `src/theme.ts` (5 lines added)
- `qa-reports/2026-05-26-shamus-night-feature-push.md` (158 lines)

**Status:** Feature-complete with tests. However, commit e1ea455 notes "heatmap shipped" and references it awaiting Dani's Design Compiler gate. Latest commit (c55c0a5) shows Dani's token-cleanup pass already applied.

**Disposition:** **KEEP-INVESTIGATE** — This branch has unique, tested feature code (heatmap grid + rendering) that diverges from main. It appears to have gone through QA (Dani's compile) but the review notes suggest it was awaiting final sign-off. Determine if it was intentionally left unmerged pending a decision, or if it should be reconsidered for merge.

---

### 2. `feat/heat-map-severity-2026-05-27`

**Last commit:** c797d9f 2026-05-28 `perf: add performance baseline for all branches (2026-05-29)`

**Divergence from main:** 0 unique commits (all commits contained in main or its ancestors)

**Subsumption check:** IS a descendant of main (ancestor check passed).

**Status:** This branch is fully subsumed by main. No unique work.

**Disposition:** **CLOSE** — Subsumed. Safe to delete. The naming suggests it may have been a spin-off or alias for heatmap-severity work that was eventually merged into the release cycle.

---

### 3. `feat/tasks-search-2026-05-25`

**Last commit:** 91cdb9f 2026-05-28 `ci: skip EAS build gracefully when EAS_TOKEN secret is not set`

**Divergence from main:** 7 unique commits
```
91cdb9f ci: skip EAS build gracefully when EAS_TOKEN secret is not set
1665c9e style: run prettier --write src/ on all 45 files flagged by format check
b43fd4f fix(test): add supabase mock to 3 more test files missing it
b741047 fix: merge origin/main and regenerate package-lock.json
ba87dc2 fix(test): add supabase mock to tasksDisplayFilter.test.ts
5ea92dd fix: regenerate package-lock.json to match package.json
65843ed fix: resolve merge conflicts with origin/main (leaderboard, templates, avatar)
```

**Subsumption check:** NOT a descendant of main (ancestor check failed).

**File changes vs main:** ~6500+ lines (including package-lock.json churn). Includes:
- `.github/workflows/eas-build.yml` (8 lines changed)
- Large component changes across modal system (AchievementsModal, ActivityFeedModal, etc.)
- Test file fixes (Supabase mock wiring)
- CI linting & format cleanup

**Observation:** Main merge commit (177283e) explicitly lists "tasks-search" in its merge message: "chore(release): merge cycle/auto-2026-05-28 — heatmap, **tasks-search**, exif-strip, push-dep, security-wave2, category-quickfilter, flag-deeplink, a11y-wave2, test-wave3, linheight-token, sql-cleanup"

However, this branch still holds 7 commits NOT yet on main. The graph shows feat/tasks-search-2026-05-25 branches off from an earlier point and contains test fixes + CI safety commits that post-date the merge.

**Status:** The original tasks-search feature WAS merged into main via cycle/auto-2026-05-28, but this branch has accumulated additional fix commits (test supabase mock wiring, EAS build safety, prettier formatting) that are NOT yet on main. These are small, reversible quality-of-life improvements.

**Disposition:** **MERGE-CANDIDATE** — The branch contains post-merge bug fixes (test mocking, CI resilience) that should be cherry-picked or re-applied to main. The commits are small and low-risk. However, these may have been intentionally deferred as "nice-to-have" pending review. Recommend Cherry-picking the 3 test-mock fixes (b43fd4f, ba87dc2, b741047) and the CI safety fix (91cdb9f) into a new PR or direct commit if deemed safe.

---

## Summary Table

| Branch | Last Commit | Divergence | Status | Disposition |
|--------|-------------|-----------|--------|-------------|
| `feat/heatmap-severity-gradient-2026-05-25` | c55c0a5 (2026-05-26) | 5 unique commits | Feature-complete, post-QA | **KEEP-INVESTIGATE** |
| `feat/heat-map-severity-2026-05-27` | c797d9f (2026-05-28) | 0 unique (subsumed) | Fully on main | **CLOSE** |
| `feat/tasks-search-2026-05-25` | 91cdb9f (2026-05-28) | 7 unique commits | Bug fixes post-merge | **MERGE-CANDIDATE** |

---

## Recommendations

1. **feat/heatmap-severity-gradient-2026-05-25**: Investigate why this completed, tested feature is still unmerged. Check with Shamus (who authored the QA report) and Dani (Design Compiler) to confirm whether the gate was satisfied or if it's awaiting a decision. If gate is satisfied, recommend merge to main or mark as intentionally deferred.

2. **feat/heat-map-severity-2026-05-27**: Safe to delete. Fully subsumed by main.

3. **feat/tasks-search-2026-05-25**: Cherry-pick test-mocking and CI safety fixes into main if they haven't already been applied separately. The 7 commits are small, low-risk additions to an already-merged feature.

---

## Notes

- No branches named exactly `heatmap-severity` or `tasks-search` exist; analysis used closest semantic matches.
- All observations are read-only; no commits or branches were modified.
- The recent release/main merge (177283e) confirms both heatmap and tasks-search were intentionally merged into the cycle, but branch-level state suggests some follow-up work remains.
