# BRANCH SAFETY AUDIT — AccessMap

**Delegated to:** Rory (DevOps/Infrastructure)  
**Authority:** Morgan autonomous deployment (safe + scoped)  
**Timeline:** 2–3 hours  
**Scope:** Audit 12+ uncharted branches for safety before merge wave (D-NEW-9)

---

## THE WORK

You're auditing 12+ branches built 2026-05-26–27 that are not yet charted in PROJECT_STATE. Goal: safety signal before Monday merge wave.

---

## BRANCHES TO AUDIT

From PROJECT_STATE "Uncharted" section:
- `feat/notify-flag-status-2026-05-27`
- `feat/shamus-category-quickfilter-2026-05-26`
- `feat/shamus-flag-deeplink-detail-2026-05-27`
- `feat/tasks-search-2026-05-25`
- `fix/sql-cleanup-2026-05-27`
- `security/hardening-wave2-2026-05-27`
- `a11y-perf/wave3-2026-05-27`
- `design/creative-polish-2026-05-27`
- `design/auto-2026-05-26-linheight-token`
- `test/gary-wave2-2026-05-26`
- `test/gary-wave3-2026-05-27`
- `test/gary-wave4-heatmap-2026-05-27`
- `claude/*` (6 branches)

---

## EXECUTION SCOPE

**For each branch:**
1. Verify no merged main commits (branch is unmerged, diverged only)
2. Check: no secrets, no hardcoded paths, no env vars
3. Spot-check: tests green on that branch, no lingering debugs
4. Classify: **SAFE** (ship next) | **REVIEW** (needs Will audit) | **HOLD** (blocker found)
5. Identify **dependency order** — what must merge first?

**Superseded check:**
- `feat/heatmap-severity-gradient-2026-05-25` — verify no unique commits vs. Wave 3, recommend delete

**Report:** qa-report to `~/AccessMap/qa-reports/2026-05-28_Rory_BranchAudit.md`
- One-line per branch: name | status | reason
- Dependency order list
- Merge wave sequence (Day 1 / Day 2 / later)
- Recommendations

---

## SCOPE NOTES

This is **safety + sequencing**. Not implementation review (Will does that). Just: can we merge these, in what order?

---

## NEXT STEP

Audit all 12+, classify, sequence, report by Friday EOD.

---

**Morgan standing by. Prerequisite for Monday merge wave. ✓**
