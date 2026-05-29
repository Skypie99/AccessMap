# D-NEW-9 Audit Scope — Rory Branch Merge-Path Safety Check

**Date:** 2026-05-28  
**Auditor:** Rory  
**Deadline:** Friday 2026-05-29 EOD  
**Model:** Opus (authorized for complex branches)  
**Risk Pattern:** LEARNINGS:2026-05-25 — "Parallel merge paths silently drop commits"

---

## 12+ Uncharted Branches (Built 2026-05-26–27)

### Feature Branches (8)
- `feat/notify-flag-status-2026-05-27` — Push notifications, Edge Function wired, DB pending
- `feat/shamus-category-quickfilter-2026-05-26` — Category filtering UX
- `feat/shamus-flag-deeplink-detail-2026-05-27` — Deep link handling for flags
- `feat/tasks-search-2026-05-25` — Text search in task list
- `fix/sql-cleanup-2026-05-27` — Schema cleanup, low-risk
- `security/hardening-wave2-2026-05-27` — Auth/RLS hardening
- `a11y-perf/wave3-2026-05-27` — A11y + perf optimization
- `design/creative-polish-2026-05-27` — UI polish, theming, tokens

### Design Token Branch (1)
- `design/auto-2026-05-26-linheight-token` — Line-height token addition

### Test Branches (3)
- `test/gary-wave2-2026-05-26` — Feature tests
- `test/gary-wave3-2026-05-27` — Feature tests
- `test/gary-wave4-heatmap-2026-05-27` — Heatmap tests (also referenced in D-NEW-8)

### Claude Agent Branches (6)
- `claude/agitated-archimedes-ff78d5`
- `claude/bold-volhard-e9b864`
- `claude/condescending-ardinghelli-f1d7d9`
- `claude/distracted-mirzakhani-dd2b90`
- `claude/dreamy-clarke-b0883a`
- `claude/nervous-ishizaka-01e1c4`

---

## Audit Checklist

For EACH branch:
1. **Unique commits?** Any work not present in main or other uncharted branches? (silent loss risk)
2. **Conflicts with recent merges?** Main is at commit 2086fde (2026-05-25). Any branch touching modified files?
3. **Test coverage?** Feature branches should have tests. Test branches should be additive only.
4. **RLS/auth changes?** Flag if touching security paths — cross-reference against D1 migration.
5. **Dependencies?** Does this branch depend on unmerged work from another branch?

---

## Merge-Wave Sequencing Recommendation

After audit, provide a **merge order** that respects dependencies and avoids silent loss:
- Which branches are safe to merge first (no cross-dependencies)?
- Which branches block others?
- Which test branches must land BEFORE their corresponding feature branches?

---

## Expected Output (Friday EOD)

Audit report with:
- Branch-by-branch status (safe to merge / blocked / conflicts / requires cleanup)
- Unique commit count per branch
- Merge order recommendation
- Any branches that should be deleted (e.g., superseded by feat/heat-map-severity-2026-05-27)

**File:** `qa-reports/d-new-9-rory-audit-report-2026-05-29.md`

---

**Authority:** Morgan (scope definition) + Rory (execution)  
**Opus access:** Pre-approved by Sky (2026-05-28)
