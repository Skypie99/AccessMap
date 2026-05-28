# Thursday 6 PM Sync — Preparation Summary

**Meeting:** 2026-05-30, 6 PM PT  
**Participants:** Sky, Jordan, Morgan (+ optional: Shamus for Phase 1 technical questions)  
**Duration:** ~50 minutes  
**Status:** READY — all briefing materials prepared

---

## Pre-Sync (For You to Review Before Thursday)

**Read these 3 documents (in order):**

1. **`2026-05-27_Morgan_Phase1Launch.md`** (15 min read)
   - Phase 1 mission + timeline
   - Active agent dispatch + new hires
   - Critical path (next 3 days)
   - **DRAFT Decision Boundaries** (GREEN/YELLOW/RED framework for your feedback)

2. **`2026-05-27_Morgan_Phase2Strategy.md`** (10 min read)
   - Why infrastructure-first matters
   - Phase 2 timeline (W1-W12 breakdown)
   - Infrastructure dependencies + blockers
   - Resource allocation (who owns what)
   - Phase 2 → Phase 3 handoff criteria

3. **`2026-05-27_Morgan_NewHireOnboarding.md`** (5 min skim)
   - New hire onboarding plan (Marcus, Devon, Iris, Jake)
   - Week-by-week breakdown
   - Success criteria by T+28
   - Just reference; detailed for mentors to execute

---

## State Files (Always Current)

Live in `/Users/skypie/AccessMap/`:

- **`PROJECT_STATE.md`** — Phase 1 features, migrations, branches, decisions, Sky action items (reference during sync)
- **`DECISIONS_LOG.md`** — Historical record of all structural decisions (append-only; shows decision trail)
- **`TASK_GRAPH.json`** — Full dependency graph (Phase 1 active + Phase 2 pending; JSON for programmatic use)

All three auto-updated by Morgan throughout Phase 1.

---

## Thursday Sync Agenda (50 min)

### 1. Quick Recap (2 min)
- Phase 1 launch day accomplished: state files + agent dispatch + task creation
- 4 new hires approved + onboarding plan ready
- 3 critical Sky action items identified (see below)

### 2. Decision Boundaries Review (10 min)
**What:** GREEN/YELLOW/RED framework for decision authority  
**Current:** DRAFT in Phase1Launch.md  
**Your input:** Adjust as needed; this becomes binding for Phase 1 + early Phase 2

**Rough framework:**
- 🟢 **GREEN:** Morgan autonomous (routine dispatch, task reprioritization, state tracking, daily reports)
- 🟡 **YELLOW:** Morgan + Sky async, 24h turnaround (Phase 2 scope, feature prioritization, hiring pipeline)
- 🔴 **RED:** Sky decides (Phase 1 scope changes, security/privacy, DB schema, hiring key roles, Constitution changes)

### 3. Phase 1 Status + Immediate Blockers (8 min)
**Three things need Sky action this week:**

a) **Apply `2026-05-25_flag_edit_rls_replacement.sql`** (Supabase SQL Editor)
   - Time: 5 min
   - Unblocks: Shamus marker-clustering merge
   - Status: Ready in codebase

b) **Apply `2026-05-25_push_tokens.sql` + Deploy Edge Function** (Supabase)
   - Time: 10 min
   - Unblocks: Shamus push-notifications build
   - Status: Ready in codebase

c) **Decide: Heatmap severity color gradient** (yes or no)
   - Unblocks: Shamus heatmap build
   - Deadline: By 2026-05-29
   - Status: Dani will present design options + recommendation

**Ask:** Can you commit to these three by end of this week (2026-05-29)?

### 4. Phase 2 Structure Overview (15 min)
**Why infrastructure-first?**
- Phase 1 = features (8 Wave 1 features, fast)
- Phase 2 = quality gates + safe infrastructure (test coverage 80%, feature flags, observability, SRE)
- Phase 2 unblocks Wave 2-4 to ship safely without rework cycles

**Three Phase 2 tracks:**
- Track A: Quality Initiatives (10 items, Tasks #8-17) — Casey + Marcus lead
- Track B: Infrastructure (feature flags, observability, SRE, Tasks #18-19, #26) — Gary + Peter + Rory + Devon lead
- Track C: Product (Wave 2-4 features, audits, tech debt, Tasks #20-25) — Shamus + Dani + Alex + Steve lead

**All 19 Phase 2 tasks created** (pending Thursday refinement/approval)

### 5. Jordan's 6-Month Roadmap (10 min)
**For Jordan to present:**
- Technical vision for Wave 2-4
- Architecture decisions needed Phase 2
- Skills/hiring alignment
- Mentorship plan (Jordan → team leadership development)

### 6. New Hire Onboarding Plan (3 min)
**Reference:** `2026-05-27_Morgan_NewHireOnboarding.md` (just mention it's ready, mentors have it)

**Key dates:**
- Start: ASAP (this week, T+0)
- Full autonomy target: T+28 (by 2026-06-24)
- Weekly syncs: Thursday 6 PM (with full team)

### 7. Q&A + Adjustments (2 min)
- Any questions on Phase 1 plan?
- Any adjustments to Phase 2 structure?
- Confirm weekly Thursday sync + Monday 1:1s with new hires?

---

## Follow-Up (Post-Sync)

**Before next week:**
1. Morgan updates DECISIONS_LOG.md with Thursday decisions
2. Morgan finalizes Phase 2 task assignments (based on Thursday feedback)
3. Morgan coordinates new hire start logistics (Slack, GitHub, accounts, first day calendar)
4. Shamus + Casey + Rory + Will confirm mentor availability
5. Sky applies the three critical migrations/decisions (if approved)

**Ongoing:**
- Daily: Phase 1 agent progress monitoring (qa-reports, blockers)
- Weekly: Thursday 6 PM sync
- Weekly: Monday 1:1s with new hires (Morgan)

---

## Materials to Have Ready for Sync

**On hand (not printed, just reference):**
- Phase1Launch.md (decision boundaries section + critical path)
- Phase2Strategy.md (infrastructure dependencies graph)
- PROJECT_STATE.md (Phase 1 Status section)
- TASK_GRAPH.json (for visual reference if needed)

**Talking points (for Morgan):**
- Phase 1 is 4-agent dispatch + 12 implementation team + foundation work
- Phase 2 is infrastructure-first to enable Wave 2-4 safe rollouts
- New hires remove capacity bottleneck (too much on Shamus, not enough QA/SRE/UX)
- Decision boundaries clarify what Morgan owns vs. what needs Sky sign-off
- All work tracked in state files (PROJECT_STATE.md, TASK_GRAPH.json) for real-time visibility

---

## Success Metrics (What We're Measuring)

### Phase 1 Success (T+120, 2026-06-26)
- 8 Wave 1 features merged + live ✅
- Test coverage ≥80% (enforced) ✅
- WCAG 2.2 AA full audit complete ✅
- Security audit complete + hardening roadmap ✅
- 4 new hires autonomous in their roles ✅

### Phase 2 Success (T+210, 2026-09-24)
- Quality gates live + enforcing ✅
- Feature flags system production-ready ✅
- Observability stack monitoring baseline metrics ✅
- Wave 2 quick-wins shipped (4-6 features) ✅
- SRE team responding to incidents <5 min ✅

---

## Open Questions (For Thursday Discussion)

1. **Feature flags vs. observability:** Which is higher priority Phase 2? (recommend: parallel, not sequential)
2. **Tech debt tolerance:** How much debt can we carry Phase 2 vs. must fix immediately?
3. **Wave 2 scope:** How many features in Phase 2? (Will + Iris research will inform)
4. **New hire integration:** Any other onboarding we should plan for (office setup, legal, payroll, etc.)?
5. **Thursday sync cadence:** Lock this in as standing recurring (6 PM PT, every Thursday)?

---

## Confidence Level (Pre-Sync)

- ✅ Phase 1 plan: SOLID (16 agents, clear tasks, timeline realistic)
- ✅ Phase 2 structure: SOLID (19 tasks, infrastructure-first justified, dependencies clear)
- ✅ New hire plan: SOLID (detailed onboarding, mentors assigned, success criteria defined)
- ✅ Decision boundaries: DRAFT (ready for feedback Thursday)
- ✅ State tracking: LIVE (PROJECT_STATE.md, DECISIONS_LOG.md, TASK_GRAPH.json all active)

**No surprises expected.** This is a straightforward handoff from planning → execution.

---

## Notes

- All briefing documents are in `qa-reports/` and dated 2026-05-27
- State files auto-update as Phase 1 progresses
- Thursday sync can reference these docs for deep dives (don't need to re-read the whole thing in the meeting)
- Post-sync, Morgan will update DECISIONS_LOG.md + finalize Phase 2 task assignments

---

**Prepared by:** Morgan  
**Ready for:** Thursday 2026-05-30, 6 PM PT  
**Questions:** Reach out before Thursday if clarification needed on Phase 1 or Phase 2 structure
