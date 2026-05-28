# Task: Alex or Quinn — Pre-Validate 12+ Branches

**Assigned:** 2026-05-28 by Morgan  
**Deadline:** ASAP–tomorrow (15 min task, parallelizable)  
**Blocker:** Rory audit efficiency (D-NEW-9)

---

## Task

For each of the 12+ uncharted branches, run:
```bash
git checkout <branch>
npm run typecheck
npm run test
```

Report back: PASS or FAIL for each branch.

---

## Branches to Validate

```
a11y-perf/wave3-2026-05-27
design/auto-2026-05-26-linheight-token
design/creative-polish-2026-05-27
feat/notify-flag-status-2026-05-27
feat/shamus-category-quickfilter-2026-05-26
feat/shamus-flag-deeplink-detail-2026-05-27
feat/tasks-search-2026-05-25
fix/sql-cleanup-2026-05-27
security/hardening-wave2-2026-05-27
test/gary-wave2-2026-05-26
test/gary-wave3-2026-05-27
test/gary-wave4-heatmap-2026-05-27
claude/* (6 branches)
```

---

## Unblocks

Rory's audit (D-NEW-9) focuses on merge-path safety + commit uniqueness, not code quality. Pre-validation catches broken code early → saves ~2 hours of re-work.

---

## Output

Create a summary table:
```
| Branch | Typecheck | Tests | Status |
|---|---|---|---|
| a11y-perf/wave3-2026-05-27 | PASS | PASS | ✅ Ready |
| ... | ... | ... | ... |
```

File: `qa-reports/prevalidate-12branches-results-2026-05-28.md`

---

**Authority:** Morgan dispatch (zero-risk QA gate)  
**Timeline:** Can execute immediately in parallel with Gary review + Phase 1 checkins
