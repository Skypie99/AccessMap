# Flagstone — Governance & Maintenance Process

**Version:** 1.0 (2026-05-26)  
**Authority:** Sky + Team consensus

---

## 1. Weekly Check-Ins (Mondays)

**Time:** 30 min, standing meeting  
**Attendees:** Morgan (coord), Rory (merge), Gary (QA), Shamus (features)  
**Agenda:**
- Open tasks: anyone stalled?
- Blocked branches: external deps still waiting?
- Gate status: which gates are open, which passed?
- Priorities: realign if needed (pull from FEATURES.md + DECISIONS_LOG)

**Output:** Brief update to PROJECT_STATE.md "NEXT ACTIONS" section.

---

## 2. Pre-Wave Handoff Checklist

**Timing:** Before starting any wave (Wave 6, Wave 7, etc.)  
**Owner:** Morgan (enforcement), Rory (coordination)  
**Checklist:**

- [ ] All prior-wave branches merged to main
- [ ] All gates passed (Code Quality, Data Integrity, Human Understanding)
- [ ] All blocking migrations applied + verified
- [ ] Blockers identified & external deps assigned (Shamus/Dani/Sky/Gary)
- [ ] Merge sequence documented (ascending commit count or priority order)
- [ ] Handoff roles clear (Rory merge executor, Gary QA auditor, Dani design compiler)

**Approval:** Sky sign-off required before wave begins.

**Output:** Checklist snapshot → DECISIONS_LOG (dated entry).

---

## 3. Pre-Merge Sign-Off Gates

**No branch merges without:**

1. **Gary's code-quality audit** ✅ (Constitution Art. 1.2)
   - Typecheck passes
   - Lint passes (or flagged + approved)
   - Tests added for new logic (if applicable)
   - No security/privacy red flags

2. **Subject-matter expert approval** ✅ (varies by branch type)
   - UI features: Dani (Design Compiler PASS) + Alex (a11y)
   - Data/schema: Sky (migration review)
   - Features: Shamus (feature-complete) + Gary (tests)
   - Infra: Rory (release-ready)

**Format:** Each approval logged in a qa-report with role-prefixed filename.  
**Example:** `2026-05-26_Gary_CodeQuality_Wave6.md` or `2026-05-26_DesignCompile_heatmap.md`

---

## 4. Blocking Rules (Hard Stops)

**ANY of these discovered → wave halts:**

- 🔴 **Security gap** (Auth, credentials, injection risk, data exposure)
- 🔴 **Privacy breach** (Location data, health/disability info, behavioral tracking — undeclared)
- 🔴 **Performance regression** (LCP >4s, FID >100ms, CLS >0.1 on mobile)
- 🔴 **Accessibility failure** (WCAG 2.2 AA not met, keyboard navigation broken, screen reader silent)
- 🔴 **Data integrity violation** (RLS policy missing, trigger broken, migration out of sequence)

**Resolution path:**
1. Create blocker qa-report: `<date>_BLOCKER_<category>.md`
2. Assign to responsible role (Sky for security/privacy, Gary for perf, Alex for a11y, Shamus for RLS)
3. Wave paused until fix verified + re-gated
4. Update DECISIONS_LOG with blocker + resolution

---

## 5. Post-Merge Debrief

**Timing:** Within 1 hour of merge completing  
**Owner:** Rory (merge executor)  
**Template:** `<project>/qa-reports/<date>_PostMerge_Debrief.md`

**Sections:**
- **Merged:** List all branches + commit count + SHA range
- **Duration:** Total wall-clock time (Phase 1 + Phase 2 + Phase 3 if applicable)
- **Blockers encountered:** Any merges that failed? Why?
- **Rollbacks or reversions:** Any needed? (Should never happen if gates worked — flag if it did)
- **Next unblocked tasks:** What became ready after this merge?
- **Metrics:** Tests passing (before/after), typecheck status, lines changed
- **Lessons:** What went smooth? What needs process improvement?

**Output:** Attach debrief to PROJECT_STATE.md as "Latest Debrief" section.

---

## 6. Breaking Changes / Reversions Policy

**If a merge breaks something post-merge:**
1. Rollback immediately (Rory authority per Art. 1.2)
2. Create post-mortem: `<date>_ROLLBACK_<branch>.md`
3. Root cause analysis (missing gate? test gap? integration issue?)
4. Fix on new branch + re-gate before re-merge

**This should be rare.** If it's happening, gates are not tight enough — escalate to Morgan + Sky.

---

## 7. Maintenance Cadence

| Frequency | Task | Owner |
|---|---|---|
| Every Monday 10am | Weekly check-in + priority realign | Morgan |
| Every wave start | Pre-wave handoff checklist + Sky approval | Rory |
| Before each merge | Gary code-quality audit + subject-matter expert gate | Gary + role-specific |
| Post-merge | Debrief qa-report + metrics snapshot | Rory |
| Every 2 weeks | DECISIONS_LOG + TASK_GRAPH review (remove stale items) | Morgan |
| Every 4 weeks | Full PROJECT_STATE.md audit (verify coherence) | Sky + Morgan |

---

## 8. Cleanup Prevention

**To avoid recurring cleanup work:**

1. **State files are source of truth** (PROJECT_STATE.md, DECISIONS_LOG.md, TASK_GRAPH.json)
   - Every decision recorded immediately (not retroactively)
   - Every task tracked when created (not when done)
   - Stale tasks deleted quarterly, not accumulated

2. **qa-reports are immutable** (one per event, dated, never edited after written)
   - Gate pass/fail recorded
   - Blocker surfaced
   - Decision logged
   - Can search/audit later without doubt

3. **Branches clean immediately post-merge** (Rory deletes merged branches same day)
   - No cluttered branch list
   - No "is this old?" guessing

4. **Scheduled tasks auto-clean** (tasks that hit their deadline + no re-trigger auto-delete)
   - No accumulating one-off reminders

---

**Approved by:** Sky (2026-05-26)  
**Next review:** 2026-06-26 (monthly)
