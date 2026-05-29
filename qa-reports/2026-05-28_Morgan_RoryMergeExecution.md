# RORY MERGE EXECUTION PLAN — 2026-05-28

**Delegated to:** Rory (DevOps & Merge Orchestration)  
**Authority:** Morgan autonomous dispatch + user approval of D1/D2/D3  
**Timeline:** Post-Sky migration apply (~4 hours total wall-clock)  
**Gate:** Gary/Jordan/Steve audit concurrent with Rory prep; Rory executes when ready

---

## GOVERNANCE

**New Policy (User Approved):**
- User will NOT execute merges (safety + expertise gap)
- Rory executes all merges with expert audit oversight
- Sky approves main merge per Constitution Art. 1

**Rory's Authority:**
- Execute merges to main once Sky approves
- Reorder/sequence merges if safer path found
- Override branch prerequisites if merge-critical

---

## EXECUTION SEQUENCE (POST-D1/D2/D3 MIGRATIONS APPLIED)

### MERGE 1: Marker Clustering (`shamus/marker-clustering-2026-05-25`)

**Prerequisites:**
- ✅ D1 migration applied (Sky has done this)
- ✅ Shamus code review complete
- ⏳ Gary validation in progress (code quality spot-check)
- ⏳ Alex validation in progress (a11y fixes on same branch)

**Rory's Merge Checklist:**
1. Confirm git status is clean (no uncommitted changes)
2. Fetch latest from origin (both main and branch)
3. Validate branch commits (no merge commits, clean history)
4. Check for conflicts vs. main (resolve if minimal, escalate if complex)
5. Run typecheck locally (tsc --noEmit must pass)
6. Run test suite locally (all tests must pass)
7. Confirm RLS migration is in place (SELECT * from flag_edits to verify schema)
8. **Merge to main:** `git merge shamus/marker-clustering-2026-05-25`
9. Push to origin main
10. Verify GitHub Actions CI passes

**Merge Conditions:**
- Gary audit complete + "code quality OK"
- Alex audit complete + "a11y fixes verified"
- No conflicts with main
- All tests green

**Report:** qa-report to `~/AccessMap/qa-reports/2026-05-28_Rory_MarkerClusteringMerge.md`
- **Status:** MERGED or HOLD (with reason)
- **Merge SHA:** commit hash
- **Notes:** any conflicts resolved, any decisions made

---

### MERGE 2: Heatmap Wave 3 (`feat/heat-map-severity-2026-05-27`)

**Prerequisites:**
- ✅ 827/827 tests green
- ✅ TSC clean (0 errors)
- ⏳ Gary validation in progress (final merge readiness check)

**Rory's Merge Checklist:**
1. Confirm git status is clean
2. Fetch latest from origin (both main and branch)
3. Validate 827 tests still passing (run test suite)
4. Confirm TSC clean (tsc --noEmit)
5. Check for conflicts vs. main (resolve if minimal)
6. Confirm no debugging logs / dead code (spot-check)
7. **Merge to main:** `git merge feat/heat-map-severity-2026-05-27`
8. Push to origin main
9. Verify GitHub Actions CI passes

**Merge Conditions:**
- Gary report complete + "READY TO MERGE"
- All tests green
- No conflicts with main

**Report:** qa-report to `~/AccessMap/qa-reports/2026-05-28_Rory_HeatmapMerge.md`
- **Status:** MERGED or HOLD (with reason)
- **Merge SHA:** commit hash
- **Test validation:** 827/827 confirmed

---

### MERGE 3: Expo Web + Vercel (`feat/expo-web-vercel-2026-05-25`)

**Prerequisites:**
- ✅ Vercel config validated
- ✅ Expo Web build clean
- ⏳ Rory validation in progress (infrastructure check)

**Rory's Merge Checklist:**
1. Confirm git status is clean
2. Fetch latest from origin (both main and branch)
3. Validate Expo Web build still clean (npm run build:web)
4. Confirm Vercel config is correct (vercel.json review)
5. Check for conflicts vs. main
6. Confirm no hardcoded secrets in config
7. **Merge to main:** `git merge feat/expo-web-vercel-2026-05-25`
8. Push to origin main
9. Verify GitHub Actions CI passes

**Merge Conditions:**
- Rory report complete + "infrastructure validated"
- No conflicts with main
- CI passes

**Report:** qa-report to `~/AccessMap/qa-reports/2026-05-28_Rory_ExpoWebMerge.md`
- **Status:** MERGED or HOLD (with reason)
- **Merge SHA:** commit hash
- **Build validation:** Expo Web + Vercel confirmed

---

## TIMING & PARALLELIZATION

**Current Time:** ~2026-05-28 14:00 (assumption)

1. **14:00–14:10:** Sky applies D1/D2/D3 migrations (parallel with expert audits)
2. **14:10–15:00:** Gary + Rory + Alex audits complete (concurrent work)
3. **15:00–15:30:** Rory executes Merge 1 (Marker Clustering)
4. **15:30–16:00:** Rory executes Merge 2 (Heatmap Wave 3)
5. **16:00–16:30:** Rory executes Merge 3 (Expo Web)
6. **16:30–17:00:** Morgan consolidates merge reports, confirms readiness
7. **~17:00 EOD:** All three merges complete + Sky approved

**Wall-clock total:** ~3 hours (Sky migration + expert audits + Rory merges)

---

## CONFLICT RESOLUTION

**If conflicts arise during merge:**
1. Identify conflicting files
2. Assess complexity:
   - **Simple (1–2 files, clear resolution):** Rory resolves, documents in report
   - **Complex (3+ files, logic conflicts):** Escalate to relevant expert (Gary/Alex/Shamus)
3. Re-run tests after conflict resolution
4. Proceed with merge if tests green

---

## ROLLBACK PROTOCOL

**If merge breaks tests or CI:**
1. Immediately revert merge: `git revert -m 1 <merge-sha>`
2. Push revert to origin
3. Document issue in qa-report
4. Escalate to domain expert (Gary/Alex/Shamus) for root cause
5. Schedule re-merge attempt after fix

---

## SUCCESS CRITERIA

- [ ] All 3 merges complete by 17:00 EOD
- [ ] GitHub Actions CI green for all 3
- [ ] No test regressions
- [ ] No conflicts with main
- [ ] All merge reports filed with qa-report citations
- [ ] Morgan consolidation complete

---

**Rory standing by for Sky migration apply. Ready to execute merges immediately after. ✓**
