# Gary — Wave 2 incident addendum (2026-05-27)

> Addendum to `2026-05-27_Gary_Wave2_CoverageDelta.md`. Surfaces a multi-agent
> worktree-contamination incident that occurred WHILE this branch was being
> built. Test work itself is fine — incident is a workflow / isolation bug.

**Branch:** `test/gary-wave2-2026-05-26`
**Tests:** ✅ 922/922 passing post-incident
**Typecheck:** ✅ green
**Risk:** No data loss. Branch history is messy but recoverable.

---

## What happened

While I was writing tests against `test/gary-wave2-2026-05-26` from the
primary worktree (`/Users/skypie/AccessMap`), at least three other agents
were operating on the same primary worktree (NOT separate `.claude/worktrees/`
sandboxes):

1. An **Alex** agent ran `git commit` here. Because my branch was checked
   out at the time, Alex's `a11y(leaderboard): announce error state...`
   commit landed on **my** branch (now `3d804ec`). Alex later cherry-picked
   that commit onto `a11y/alex-wave2-2026-05-26` (as `2d1091e`), so the
   change is preserved in two places.
2. A **Shamus** agent ran `git commit -a` (or similar) and produced commit
   `5360cc6` with subject *"feat(tasks): category quick-filter chips on the
   Tasks screen"* — but the commit also swept up MY four untracked files:
   - `src/lib/__tests__/recentlyViewed.test.ts`
   - `src/lib/__tests__/reportTemplates.test.ts`
   - `src/lib/__tests__/userReportStats.test.ts`
   - `qa-reports/2026-05-27_Gary_Wave2_CoverageDelta.md`
3. Several other claude/* branches appear in `git branch -a` with the
   worktree marker (`+`), confirming concurrent worktree usage:
   `claude/funny-bohr-45d01b`, `claude/eloquent-morse-8339ec`,
   `claude/intelligent-merkle-6a7781`, etc.

## Why I did not "fix" the contamination

- Splitting commit `5360cc6` (interactive rebase / `reset --soft` / cherry-pick
  surgery) is destructive editing of another agent's commit and would force
  rewriting branch history while other workers may still be active. Per
  Constitution Art. 5 and Sky's standing guidance "investigate before
  deleting or overwriting," this is not a safe unilateral action.
- Resetting `3d804ec` off my branch would re-orphan Alex's commit. It IS
  preserved on `a11y/alex-wave2-2026-05-26` so the change wouldn't be lost,
  but the gesture is still destructive editing of branch history.
- The end-state of my own work — three test files and the qa-report — IS
  present in the tree and IS committed. The contamination is cosmetic
  (commit attribution and message) not functional.

## Current state of `test/gary-wave2-2026-05-26`

```
5360cc6 feat(tasks): category quick-filter chips on the Tasks screen
        ↑ contaminated — also contains Gary's 3 test files + qa-report
3d804ec a11y(leaderboard): announce error state via accessibilityLiveRegion
        ↑ Alex's commit, accidentally on this branch
3c30d1e fix: resolve merge conflicts in ProfileScreen and SettingsScreen
        ↑ main HEAD
```

Plus this addendum, which I will commit cleanly on top.

## What Morgan / Sky should do

**Recommended cleanup path (when no other workers are active):**

1. Snapshot current state: `git tag pre-cleanup-gary-wave2 test/gary-wave2-2026-05-26`
2. Cut a clean Gary branch off main: `git checkout -b test/gary-wave2-2026-05-26-clean main`
3. Cherry-pick only Gary's files from `5360cc6`:
   ```
   git checkout 5360cc6 -- \
     src/lib/__tests__/recentlyViewed.test.ts \
     src/lib/__tests__/reportTemplates.test.ts \
     src/lib/__tests__/userReportStats.test.ts \
     qa-reports/2026-05-27_Gary_Wave2_CoverageDelta.md \
     qa-reports/2026-05-27_Gary_Wave2_Incident_Addendum.md
   git commit -m "test: Wave 6/7 coverage — recentlyViewed, reportTemplates, userReportStats"
   ```
4. Delete the contaminated branch: `git branch -D test/gary-wave2-2026-05-26`
5. Likewise reconstruct Shamus's quick-filter branch from `5360cc6` minus
   Gary's files.

**Root-cause work for the orchestrator:**

- Parallel role agents MUST run in isolated `.claude/worktrees/` sandboxes,
  not the primary working tree. The Constitution Art. 8 should make this
  enforceable, not advisory.
- `git add -A` / `git commit -a` should be banned in role prompts when
  multi-agent execution is active. Only explicit file lists.
- Before any agent commits, it should verify the current branch matches the
  branch it was assigned to. (Alex's commit landing on my branch was caused
  by skipping this check.)
- The orchestrator should not dispatch new agents into a worktree that has
  uncommitted changes belonging to a different agent.

## Confirmed not lost

| Artifact | Where it lives |
|---|---|
| Gary's 3 test files | Committed in `5360cc6` on `test/gary-wave2-2026-05-26` |
| Gary's coverage qa-report | Committed in `5360cc6` |
| Gary's incident addendum (this file) | Will be in the follow-up commit below |
| Alex's leaderboard a11y fix | On `a11y/alex-wave2-2026-05-26` as `2d1091e` (cherry-pick) AND on `test/gary-wave2-2026-05-26` as `3d804ec` |
| Shamus's TasksScreen quick-filter | In `5360cc6` (TasksScreen.tsx diff portion) |

Test counts:
- Before my work: 872 passing
- After my work: **922 passing** (+50, all green)
- After Shamus's contamination commit landed on top: still **922 passing**

## For Morgan

Treat this as a P0 process bug, not a P0 code bug. The code is fine — the
multi-agent isolation model is broken. Until fixed, every parallel
orchestrator run is at risk of producing branches like this one that need
manual untangling.
