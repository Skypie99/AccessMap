# Workflow Improvements Rollout Plan
**Date:** 2026-05-28  
**Coordinator:** Morgan  
**Mode:** Operational coordination (repo artifacts only, no external sends)

---

## Executive Summary

10 workflow improvements identified. Improvements 1–3 already implemented (templates, queues, delegation). Improvements 4–9 rolling out in two phases:

- **Phase 1 (This week, 2026-05-28–2026-05-29):** Process changes (tiered reporting, wave cadence formalization)
- **Phase 2 (Next week, 2026-05-30–2026-06-06):** Technical infrastructure (GitHub Actions, memory-as-code)

**Improvement 10 (Dashboard):** Deferred to next sprint (separate initiative, depends on infrastructure in place).

---

## Improvements 1–3 (Already Done)

| # | Improvement | Status | Owner | Artifact |
|---|---|---|---|---|
| 1 | Decision Gate Templates | ✅ DONE | Morgan | DECISION_GATE_TEMPLATE.md |
| 2 | Task Queue JSON Schema | ✅ DONE | Morgan | TASK_QUEUE_SCHEMA.json |
| 3 | Async Expert Sign-Offs (Steve/Jordan) | ✅ DONE | Sky | memory: delegation-steve-jordan-gates.md |

---

## Phase 1 Rollout (This Week)

### Improvement 5: Tiered Reporting by Frequency

**What:** Reduce qa-report noise. Three tiers instead of full reports every day:
- **Daily checkin:** 1 sentence + blockers (team sends async, no meeting)
- **Weekly digest (Friday EOD):** 200 words per role (shipped, merged, bugs, pending)
- **Deep dive on-demand:** Full report if a blocker needs context

**Owner:** Morgan (coordinate adoption, model daily format)  
**Timeline:** Start 2026-05-28, first digests Friday 2026-05-29

**Implementation checklist:**
- [ ] Morgan: Write "Daily Checkin Format" guide (examples: "Marker clustering code done, waiting D1 migration")
- [ ] Morgan: Post to Slack/iMessage to team: "Starting daily checkins this week, weekly digests Friday EOD"
- [ ] Shamus/Dani/Steve: Send first daily checkins 2026-05-28 EOD
- [ ] Shamus/Dani/Steve: Send first weekly digests 2026-05-29 EOD
- [ ] Morgan: Read digests, extract key blockers for briefing

**Token savings:** 60% reduction in daily reporting volume (20 min of reading → 3 min)

---

### Improvement 8: Wave Batching + Fixed Sprint Cadence

**What:** Formalize existing Mon–Fri pattern. All Wave N features land together, all D-gates for Wave N+1 due Friday EOD.

**Owner:** Morgan (coordinate wave planning, gate deadlines)  
**Timeline:** Wave 5 starts Monday 2026-06-02 (first full wave cycle)

**Implementation checklist:**
- [ ] Morgan: Create "Wave 5 Planning" doc (which features, target merge dates, gate deadlines)
- [ ] Morgan: Set calendar reminders: D-gate proposals due Friday 5pm, reviews Saturday morning
- [ ] Shamus/Dani: Review wave features by Friday EOD, surface new blockers
- [ ] Morgan: Consolidate gates for Sky approval Saturday morning (batch them)
- [ ] Sky: Approve/apply gates Sunday, features merge Monday–Friday

**Psychological benefit:** Clear "sprint done" moments, reduced context-switching overhead.

---

## Phase 2 Rollout (Next Week)

### Improvement 4: Pre-Merge CI Automation

**What:** GitHub Actions gate runs before merge: typecheck + lint + test + "no secrets grep" + "no hardcoded API keys".

**Owner:** Rory (CI/CD specialist per Const. 9.4)  
**Timeline:** Live by 2026-06-02

**Implementation checklist:**
- [ ] Rory: Review `.github/workflows/` folder (likely exists, needs enhancement)
- [ ] Rory: Add pre-merge job: typecheck (tsc), lint (ESLint), test (Jest), secrets scan
- [ ] Rory: Set branch protection on `main`: require all checks to pass before merge
- [ ] Rory: Test on next feature branch (e.g., fix/statushistory-darkmode) — ensure checks block merge if they fail
- [ ] Morgan: Announce to team: "CI gates now required before merge, prevents broken main"

**Safety gain:** Automates 80% of review issues (catches secrets, lint, type errors, failed tests before human review).

---

### Improvement 6: Automated PROJECT_STATE.md Refresh

**What:** GitHub Actions job runs every 12 hours. Parses `git log`, counts tests, identifies merged/unmerged branches, auto-updates PROJECT_STATE.md.

**Owner:** Rory (CI/CD)  
**Timeline:** Live by 2026-06-02

**Implementation checklist:**
- [ ] Rory: Create GitHub Actions job: `refresh-project-state.yml`
  - Every 12h, run script that:
    - Counts `npm test` output for total tests
    - Lists branches via `git branch --no-merged main`
    - Parses `tsc --noEmit` for error count
    - Updates `PROJECT_STATE.md` with latest numbers
- [ ] Rory: Test job manually (run the script locally first)
- [ ] Rory: Commit job to `.github/workflows/`, push to main
- [ ] Morgan: Verify PROJECT_STATE.md updates automatically in next 12h

**Time savings:** Morgan doesn't re-read git state from scratch (was ~15 min per briefing).

---

### Improvement 7: Memory-as-Code

**What:** Move decisions, gotchas, constraints out of prose qa-reports into structured files:
- `decisions.json` — D1–D8 status, unblocks, prerequisites
- `constraints.yaml` — architecture constraints, RLS rules, privacy rules
- `learnings.yaml` — patterns extracted from LEARNINGS.md for automation

**Owner:** Dani (architecture/design model) + Morgan (decisions consolidation)  
**Timeline:** Start 2026-05-30, MVP ready by 2026-06-05

**Implementation checklist:**
- [ ] Morgan: Create `decisions.json` schema (id, name, status, unblocks, prerequisites, applied_date)
- [ ] Dani: Create `constraints.yaml` schema (category, rule, reasoning, enforcement)
- [ ] Morgan: Seed `decisions.json` with D1–D8 current state
- [ ] Dani: Seed `constraints.yaml` with existing rules (RLS policies, privacy rules from Const. 7.6)
- [ ] Morgan: Link `decisions.json` to decision-gate templates (source of truth for gate status)
- [ ] Team: Update `decisions.json` when gates are approved/applied (no more manual tracking)

**Token savings:** Same briefing information, structured format → easier to parse for future dashboards/automation.

---

### Improvement 9: Proposal > Review > Decision Async Loop

**What:** Proposal → async expert review (1 hr) → decision (1 min) instead of synchronous approval meetings.

**Owner:** Shamus (feature builds, coordinates code review) + Morgan (workflow)  
**Timeline:** Start 2026-05-30, live by 2026-06-02

**Implementation checklist:**
- [ ] Shamus: When a decision needs approval, create `qa-reports/proposals/feature-X.md` (20–50 lines)
- [ ] Shamus: Post proposal link in Slack: "D5 decision: heatmap severity colors. Review + comment: [link]"
- [ ] Steve/Jordan/Dani: Review asynchronously, comment on proposal doc (GitHub or Notion, read within 1 hr)
- [ ] Sky: Read comments, reply in proposal doc: "✅ APPROVED" or "❌ needs X first"
- [ ] Shamus: Feature builds immediately, no meeting needed
- [ ] Morgan: Confirm written record in proposal doc (vs. Slack threads that disappear)

**Meeting savings:** ~2–3 hrs/week of sync approval calls → async comments (1 hr total per proposal).

---

## Implementation Checklist (Master)

### Pre-Phase-1 (Today, 2026-05-28)
- [x] Decision gate templates finalized (DECISION_GATE_TEMPLATE.md)
- [x] Task queue schema + examples (TASK_QUEUES_CURRENT.md)
- [x] Async expert sign-off delegation (memory + Steve/Jordan notified)
- [ ] Morgan: Send Slack message: "Workflow improvements starting this week—see qa-reports/WORKFLOW_INSTRUCTIONS.md"

### Phase 1 (This Week)
- [ ] Morgan: Write daily checkin format guide
- [ ] Morgan: Announce tiered reporting to team
- [ ] Shamus/Dani/Steve: Send first daily checkins (2026-05-28 EOD)
- [ ] Shamus/Dani/Steve: Send first weekly digests (2026-05-29 EOD)
- [ ] Morgan: Confirm wave 5 planning doc (features, gate deadlines)
- [ ] Morgan: Set calendar reminders for gate deadlines (Friday 5pm)

### Phase 2 Week 1 (2026-05-30–2026-06-02)
- [ ] Rory: Review + enhance GitHub Actions CI gates
- [ ] Rory: Test pre-merge checks on next feature branch
- [ ] Rory: Create + test automated PROJECT_STATE.md job
- [ ] Dani: Design `decisions.json` + `constraints.yaml` schemas
- [ ] Morgan: Seed `decisions.json` with D1–D8 current state
- [ ] Shamus: Pilot proposal-review loop with first decision (D5 heatmap colors)

### Phase 2 Week 2 (2026-06-03–2026-06-06)
- [ ] Rory: Merge CI enhancements to main, enable branch protection
- [ ] Morgan: Confirm PROJECT_STATE.md updates automatically
- [ ] Dani: Merge constraints.yaml to repo, document enforcement
- [ ] Team: All new proposals use async review loop
- [ ] Morgan: Consolidate learnings, prepare for dashboard phase

---

## Success Criteria

| Improvement | Metric | Target | Owner |
|---|---|---|---|
| 5 (Tiered reporting) | Daily checkins sent by each role | 3/3 by Fri EOD 2026-05-29 | Morgan |
| 8 (Wave cadence) | Gates batched for Friday deadline | All D5–D6 gates due Fri 2026-05-29 5pm | Morgan |
| 4 (CI automation) | Pre-merge checks blocking merge | All checks pass on main | Rory |
| 6 (Project state) | Automated updates every 12h | PROJECT_STATE.md fresh within 12h | Rory |
| 7 (Memory-as-code) | decisions.json updated when gates applied | D1–D8 status synced automatically | Morgan + Dani |
| 9 (Async proposals) | Proposal-review loop cycle time | <2 hrs from proposal to decision | Shamus |

---

## Delegation Map

| Owner | What | Deadline |
|---|---|---|
| **Morgan** | Tiered reporting adoption, wave planning, memory-as-code seed | Friday 2026-05-29 |
| **Rory** | GitHub Actions CI + PROJECT_STATE refresh | Monday 2026-06-02 |
| **Dani** | Memory-as-code schema (constraints.yaml) | Friday 2026-06-05 |
| **Shamus** | Async proposal loop pilot + weekly digests | Friday 2026-05-29 |
| **Team (Shamus/Dani/Steve)** | Daily checkins + Friday digests | Starting 2026-05-28 |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Team forgets daily checkins | Medium | Loses daily visibility | Morgan sends reminder Slack bot on Mon/Wed/Fri |
| GitHub Actions job fails silently | Low | PROJECT_STATE stale | Rory tests locally first, adds error notifications |
| Async proposal loop becomes status quo but decisions slow down | Medium | Negates time savings | Morgan tracks proposal-to-decision cycle time, flags if >2hrs |
| Constraints.yaml becomes stale | Medium | Dashboard uses outdated rules | Dani owns constraints.yaml updates, reviews quarterly |

---

## Notes for Sky

This rollout enables **50% faster decision cycles** (current: 1–2 hrs per decision → target: 10 min per decision) and **60% reduction in briefing prep time** (current: 1 hr reading qa-reports → target: 20 min reading queues + digests).

All improvements are **reversible** if they don't work:
- Tiered reporting can revert to full qa-reports anytime
- GitHub Actions gates can be disabled if they false-positive too much
- Async proposals can become sync if decisions stall

First window to validate: **Friday 2026-05-29 (end of Phase 1)**. Morgan will report: which improvements are working, which need adjustment.

---

## Appendix: Daily Checkin Format (For Team to Use)

**Example (Shamus, 2026-05-28 EOD):**
```
✅ Marker clustering code done. Waiting D1 migration.
🔴 Blocking: d1/flag_edit_rls — once applied, merge immediately
🟡 Weekly digest Friday EOD
```

**Example (Dani, 2026-05-29 Friday digest):**
```
## Dani — Week of 2026-05-25

**Shipped:** token-residuals-darkmode merged, 2 other features reviewed

**In progress:** creative-polish design comps 80% done, statushistory audit (Shamus's branch)

**Blockers:** waiting on D5 decision (heatmap color gradient) to finalize palette

**Next week:** finish creative comps, start dani-polish phase once Wave 5 lands
```

---

**END OF ROLLOUT PLAN**  
Morgan, 2026-05-28 14:47 UTC
