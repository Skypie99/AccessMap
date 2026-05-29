# Morgan — Blockers & Get-Ahead Optimization (2026-05-28)

**Purpose:** Identify critical path blockers + parallelizable work to speed Friday merge wave  
**Analysis date:** 2026-05-28

---

## §1 Critical Path Blockers (Cannot Parallelize)

| Blocker | Owner | Unblocks | Timeline | Mitigation |
|---|---|---|---|---|
| **D1 RLS migration** | Sky | Shamus marker-clustering merge | Today–tomorrow | Already escalated; exact SQL ready |
| **D2 push_tokens migration** | Sky + Rory deploy | Push notifications | Today–tomorrow | Rory pre-approved Opus; ready when D2 lands |
| **D3 trigger confirmation** | Sky | Morgan applies in SQL | Today–tomorrow | Steve approved; just needs confirmation |
| **Rory audit D-NEW-9** | Rory | Next merge wave sequencing | Friday EOD | In progress; scope documented |

**Assessment:** All four are on critical path. None can parallelize further.

---

## §2 Get-Ahead Opportunities (Parallelizable — Dispatch Now)

### **OP-A: Gary Heatmap Test Review (HIGHEST PRIORITY)**

**Current status:** Gary standing by, NOT yet dispatched  
**Task:** Review `test/gary-wave4-heatmap-2026-05-27` — confirm tests are additive-only (no breaking changes)  
**Effort:** 5 minutes  
**Unblocks:** Heatmap merge (D-NEW-8) can proceed immediately after Phase 1 validation passes  
**Parallelization:** Can happen RIGHT NOW while Rory audits 12+ branches + team sends checkins  
**Recommendation:** **DISPATCH GARY IMMEDIATELY**

Once Gary approves, heatmap is 100% ready to merge Friday. No waiting.

---

### **OP-B: Pre-Merge Test Validation (MEDIUM PRIORITY)**

**Current status:** 12+ branches untested for this cycle  
**Task:** Before Rory audits, run `npm run typecheck` + tests on each of the 12+ branches to catch broken code early  
**Effort:** ~15 min (parallel typecheck across branches, or sequential if resources tight)  
**Benefit:** Rory's audit focuses on merge-path safety, not code quality. Fails caught now prevent re-work.  
**Recommendation:** **Can assign to Gary or Alex** (QA specialists). Gary does heatmap test review (5 min); Alex or Quinn could pre-validate the 12+ feature branches in parallel.

---

### **OP-C: Merge Conflict Pre-Scan (LOW–MEDIUM PRIORITY)**

**Current status:** Unknown if any 12+ branches conflict with each other or main  
**Task:** For each branch, check `git merge --no-commit --no-ff main` to identify conflicts before audit  
**Effort:** ~10 min  
**Benefit:** Rory flags merge order early; identify branches that block others  
**Recommendation:** **Can assign to Rory or Will**. If Rory does this as part of audit kickoff, excellent. If not, Will (or anyone with merge authority) could pre-scan.

---

### **OP-D: Design Compiler Queue (LOW PRIORITY)**

**Current status:** Unknown which branches have UI changes  
**Task:** Scan the 8 feature + design branches for UI changes. If any touch color/token/component/layout, queue for Dani's Design Compiler gate (7-layer check per Constitution 2.4)  
**Effort:** ~5 min (scan); then Dani's async review  
**Benefit:** UI changes don't silently land without design approval. Catches regressions early.  
**Recommendation:** **Can assign to Dani** as part of her audit pass, or Will could pre-identify UI-touching branches now.

---

## §3 Recommended Dispatch Order (Next 1 Hour)

### **NOW — Do This Immediately**
1. **Dispatch Gary** → Review `test/gary-wave4-heatmap-2026-05-27` (5 min)
   - Once approved, heatmap merge is unblocked
   - Report back: "Additive check PASS" or "Issues found"

### **Parallel Track (While Gary reviews)**
2. **Ask Alex or Quinn** → Pre-validate 12+ branches: `npm run typecheck` + tests
   - Report back: pass/fail list + any code quality blockers

3. **Ask Will or Rory** → Merge conflict pre-scan (optional but valuable)
   - Report back: conflicts found + merge order hints

---

## §4 Expected Speedup

| If We Do | Saves | By Friday EOD |
|---|---|---|
| Dispatch Gary now | 1 day (Gary review wait) | Heatmap merge ready immediately after Phase 1 validation |
| Pre-test 12+ branches | ~2 hours (Rory re-work) | Audit focuses on merge safety, not code failures |
| Pre-scan conflicts | ~1 hour (Rory sequencing) | Merge wave sequencing ready Friday morning, not Friday EOD |
| **Total time saved** | **~4 hours** | **Merge wave Friday morning ready; Monday merge sprint can begin immediately** |

---

## §5 Recommendation Summary

**HIGHEST IMPACT NOW:** Dispatch Gary (5 min review, unblocks heatmap, zero dependencies).  
**MEDIUM IMPACT NOW:** Pre-validate 12+ branches (catch code failures before audit).  
**LOWER IMPACT:** Conflict pre-scan (nice-to-have, Rory can do during audit).  
**LOWEST IMPACT:** Design Compiler queue (good practice, not blocking).

All four are zero-risk. None conflict with other work.

---

**Prepared by:** Morgan  
**Authority:** Expert routing — Gary (QA), Alex/Quinn (QA), Will (merge), Dani (design)  
**Status:** Ready to dispatch pending Sky approval
