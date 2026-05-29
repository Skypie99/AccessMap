# 🔧 PRE-MERGE CONFLICT RESOLUTION — AccessMap Monday Prep

**Date:** 2026-05-28  
**Authority:** Morgan Standing Approval (Preparation, no merges yet)  
**Purpose:** Identify branch conflicts with main before Monday merge wave.  
**Action:** Resolve or flag blockers by Saturday EOD.

---

## CONFLICT SCAN RESULTS

**Total branches scanned:** 18 unmerged  
**Linear (ready to merge):** 6  
**Diverged (need rebase or manual resolution):** 9  
**Unknown/Stale (claude/*):** 4  

---

## LINEAR BRANCHES (safe to merge as-is)

✅ **No conflicts with main. Ready for Monday wave.**

| Branch | Files Changed | Last Commit | Status |
|---|---|---|---|
| `a11y-perf/wave3-2026-05-27` | 45 | Wave 3 completion | READY |
| `a11y/alex-wave2-2026-05-26` | 2 | a11y fixes | READY |
| `design/creative-polish-2026-05-27` | 44 | Design refinements | READY |
| `feat/notify-flag-status-2026-05-27` | 2 | Notifications wiring | READY |
| `feat/shamus-category-quickfilter-2026-05-26` | 2 | Filter UX | READY |
| `feat/shamus-flag-deeplink-detail-2026-05-27` | 2 | Deep linking | READY |

**Action:** Merge these first (Tier 1–3) on Monday morning. No rebase needed.

---

## DIVERGED BRANCHES (need rebase or merge resolution)

⚠️ **These branches have diverged from main. Risk: content conflicts or stale bases.**

| Branch | Files Changed | Divergence | Recommended Action | Owner |
|---|---|---|---|---|
| `design/auto-2026-05-26-linheight-token` | 1 | 1 commit behind | Rebase on main (Sat) | Dani |
| `feat/heat-map-severity-2026-05-27` | 12 | 5+ commits | Merge main into branch (Sat) | Shamus + Gary |
| `feat/heatmap-severity-gradient-2026-05-25` | 7 | 5+ commits | Audit for duplication vs heat-map above | Gary + Shamus |
| `feat/tasks-search-2026-05-25` | 142 | 10+ commits | Merge main + resolve integration (Sat) | Shamus + Gary |

**Action:** Saturday morning, have Shamus + Dani + Gary resolve these. If conflicts are mechanical (code moved, same intent), merge. If semantic (two branches implement same feature), escalate to Morgan.

### Conflict Detail: `feat/heat-map-severity-*` (POTENTIAL DUPLICATION)

⚠️ **Alert:** Two branches with similar names: `feat/heat-map-severity-2026-05-27` and `feat/heatmap-severity-gradient-2026-05-25`.

**Likely scenario:** Shamus built the feature twice (second pass improves on first). The older `-gradient-` branch may be a duplicate.

**Saturday action:**
1. Shamus + Gary compare the two branches (features, test coverage, design quality).
2. Decide: **KEEP heat-map-severity (newer)**, **DISCARD heatmap-gradient (older)**, or **MERGE features**.
3. Report decision in qa-reports by Saturday 5pm.
4. Monday: merge only the approved version.

---

## UNKNOWN/STALE BRANCHES (claude/*)

❓ **These are auto-generated worktree branches. Likely stale or abandoned.**

| Branch | Files Changed | Action |
|---|---|---|
| `claude/agitated-archimedes-ff78d5` | 141 | Review + DELETE if no outstanding work |
| `claude/bold-volhard-e9b864` | 119 | Review + DELETE if no outstanding work |
| `claude/condescending-ardinghelli-f1d7d9` | 44 | Review + DELETE if no outstanding work |
| `claude/dreamy-clarke-b0883a` | 43 | Review + DELETE if no outstanding work |
| `claude/nervous-ishizaka-01e1c4` | 44 | Review + DELETE if no outstanding work |

**Recommended:** Saturday morning, Shamus or Morgan audits these:
- If work is complete + merged: delete.
- If work is pending: move to a named feature branch (e.g., `feat/auto-temp`).
- If abandoned: delete.

**Saturday action:** Run this to delete stale branches:
```bash
git branch -D claude/agitated-archimedes-ff78d5  # if confirmed stale
git branch -D claude/bold-volhard-e9b864
# ... etc
```

---

## RESOLUTION TIMELINE

### Saturday 6pm → End of Day

**Dani:** Rebase `design/auto-2026-05-26-linheight-token` on main.  
**Shamus + Gary:** Merge main into `feat/heat-map-severity` + `feat/tasks-search`. Resolve conflicts.  
**Gary:** Audit `feat/heatmap-severity-gradient` vs `feat/heat-map-severity`. Report duplication decision.  
**Morgan:** Review `claude/*` branches. Delete stale ones.

### Saturday 8pm

**All:** Conflict resolution DONE. Branches ready for merge.

### Sunday morning (contingency)

If any Saturday resolution failed: escalate to Sky with exact conflict details + proposed resolution.

### Monday 10am

Merge wave proceeds with conflict-free branches.

---

## DEPENDENCY NOTES

### Do NOT merge these before their dependencies:

- `feat/notify-flag-status`: Waits for `security/hardening` + Rory notifications deploy.
- `feat/heat-map-severity`: Waits for `design/creative-polish` + `design/auto-2026-05-26-linheight-token`.
- `feat/tasks-search`: Waits for design tokens (both design branches).

See `2026-05-28_Merge_Wave_Sequence.md` for full dependency graph.

---

## ROLLBACK PLAN

If Monday merge wave encounters an unexpected conflict:

1. **Pause merge wave** (stop at last successful merge).
2. **Report blocker** to Morgan with exact branch + conflict detail.
3. **Revert last merge** (git revert).
4. **Dispatch Shamus + Gary** to resolve offline (on the conflicted branch, not main).
5. **Re-test** post-resolution.
6. **Resume merge wave** once branch is clean.

Rollback time: ~10 min per branch. Main is never left in a broken state.

---

## STATUS

✅ **READY FOR SATURDAY RESOLUTION.**

- 6 branches: linear, ready now.
- 4 branches: need rebase/merge (Sat ~2h work).
- 4 branches: need cleanup (Sat ~30 min work).
- 1 branch pair: need duplication audit (Sat ~30 min work).

**Total Saturday effort:** ~3h with Shamus + Gary + Dani + Morgan.

**Monday readiness:** Expected PASS.

---

**Report:** qa-reports/2026-05-28_Pre_Merge_Conflict_Resolution.md  
**Status:** ASSIGNED (Dani/Shamus/Gary/Morgan actions required Saturday)  
**Next:** Saturday 6pm conflict resolution. Monday 10am merge wave.
