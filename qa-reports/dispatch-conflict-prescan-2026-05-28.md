# Task: Will or Rory — Merge Conflict Pre-Scan

**Assigned:** 2026-05-28 by Morgan  
**Deadline:** Before Friday audit report (10 min task)  
**Blocker:** Merge wave sequencing (D-NEW-9)

---

## Task

For each of the 12+ uncharted branches, identify potential merge conflicts:

```bash
git checkout <branch>
git merge --no-commit --no-ff main
# Check output for conflicts
git merge --abort
```

Document:
1. **Branches with conflicts vs. main** (list)
2. **Branches that depend on other unmerged branches** (cross-references)
3. **Recommended merge order** (respects dependencies)

---

## Why Now

Pre-scanning conflict chains saves Rory ~1 hour Friday morning on sequencing. By Friday audit report, we already know:
- Which branches block others
- Safe merge order for parallel landing
- Any branches that need pre-rebasing

---

## Unblocks

Friday: Merge wave sequencing ready at audit report time, not Friday EOD. Monday merge sprint can kick off immediately.

---

## Output

Create a conflict report:
```markdown
## Conflict Map

### Branches with conflicts vs. main
- feat/notify-flag-status-2026-05-27: CONFLICT in src/lib/flags.ts (lines 42-56)
- ... (list)

### Recommended merge order
1. [Branches with no conflicts vs. main]
2. [Branches that depend on #1]
3. [Branches with cross-dependencies]

### Notes
- D1/D2/D3 SQL migrations unblock some feature branches (note which)
- Heatmap merge does not conflict with any 12+ branches
```

File: `qa-reports/conflict-prescan-results-2026-05-29.md` (can be filed Friday)

---

**Authority:** Morgan dispatch (zero-risk merge analysis)  
**Timeline:** Can execute anytime before Friday audit report. Rory can do this as kickoff to her audit.
