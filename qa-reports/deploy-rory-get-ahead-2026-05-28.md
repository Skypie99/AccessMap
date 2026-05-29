# Task: Rory — Get-Ahead Work (Parallel to D-NEW-9 Audit)

**Assigned:** 2026-05-28 18:05 UTC by Morgan  
**Deadline:** ASAP (before Friday audit report)  
**Authority:** Rory merge specialist + T3 authority  
**Unblocks:** Friday audit efficiency + merge wave clarity

---

## Task

Three parallel get-ahead tasks. All execute in parallel with your D-NEW-9 branch audit.

### **1. Deploy Edge Function (after Sky applies D2 SQL)**

**When:** Immediately after Sky successfully applies `supabase/migrations/2026-05-25_push_tokens_table.sql`

**What:** Deploy Edge Function from commit 838b166 (`feat/notify-flag-status`)

**How:** Use Vercel deploy (you have authority for this)

**Impact:** Notifications system live; unblocks feature merge

**Timeline:** 10 min

---

### **2. Merge Conflict Pre-Scan (10 min)**

**What:** Scan all 12+ uncharted branches for merge conflicts vs. main + cross-branch dependencies

**Output:** Recommended merge order based on conflict analysis

**File:** Create `qa-reports/merge-conflict-prescan-2026-05-29.md` with:
- Branches with conflicts (vs. main)
- Cross-branch dependencies (if branch A must merge before B)
- Recommended merge sequence
- Flag any concerning patterns

**Impact:** Friday audit has merge path clarity immediately

**Timeline:** 10 min

---

### **3. Pre-Validate 12+ Branches (15 min)**

**What:** Quick type + test check on all 12 branches

**How:**
```bash
for branch in $(git branch --no-merged main | grep -E "feat|fix|a11y|design|test|security"); do
  git checkout $branch
  npm run typecheck 2>&1 | tail -1
  npm test 2>&1 | tail -1
done
```

**Output:** Create `qa-reports/branch-validation-prescan-2026-05-29.md` with:
- Branch name | typecheck | tests result | status (PASS/FAIL)

**Impact:** Identifies branches with compile/test issues before Friday audit. Saves audit time.

**Timeline:** 15 min

---

## Total Effort

30 min parallel work. Gives Friday audit massive head start.

---

## Authority

You're approved to:
- Deploy Edge Function (Vercel)
- Run local testing/scanning on all branches
- Create audit pre-reports

Use Opus for any complex work. You're pre-authorized.

---

## Timeline

```
NOW         → Sky: Apply D2 SQL
ASAP        → Rory: Deploy Edge Function (5 min after D2 SQL)
PARALLEL    → Rory: Conflict pre-scan (10 min)
PARALLEL    → Rory: Pre-validate branches (15 min)
FRIDAY EOD  → Rory: Full D-NEW-9 audit report (with pre-scans as foundation)
```
