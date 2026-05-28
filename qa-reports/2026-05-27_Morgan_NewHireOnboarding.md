# New Hire Onboarding Checklist — Phase 1 Integration

**Date:** 2026-05-27 (T+0)  
**New Hires:** Marcus (QA), Devon (SRE), Iris (UX Research), Jake (Dev Experience)  
**Start Date:** ASAP (same week, Phase 1 parallel)  
**Mentors:** Casey (Marcus), Rory (Devon), Will (Iris), Shamus (Jake)

---

## Pre-Start (Day 0 — Before arrival)

**For Morgan:**
- [ ] Slack channels created: #team-qa, #sre-incident-response, #ux-research, #dev-experience
- [ ] GitHub team permissions granted (Marcus, Devon: admin; Iris, Jake: contributor)
- [ ] Email forwarding set up
- [ ] Calendar invites: Thursday 6 PM weekly sync + daily 7 PM status digest
- [ ] Pairing schedule blocked (see below)
- [ ] Sent welcome email + onboarding doc link

**For Mentors:**
- [ ] Casey: Block 2h daily w/ Marcus (code review standards, quality framework, test gates)
- [ ] Rory: Block 2h daily w/ Devon (deployment, rollback, runbooks, SRE setup)
- [ ] Will: Block 2h daily w/ Iris (user research methods, Wave 2-4 feature validation)
- [ ] Shamus: Block 2h daily w/ Jake (build setup, repo structure, DX pain points)

---

## Day 1 — Onboarding (4 hours)

### All New Hires (30 min, together)
- [ ] Welcome + team intro video call (Sky + Morgan + full team)
- [ ] Overview of Phase 1 + Phase 2 structure
- [ ] Token optimization context ("why we're hiring right now")
- [ ] Review: CLAUDE.md + PROJECT_STATE.md + DECISIONS_LOG.md + TASK_GRAPH.json
- [ ] Slack channel intro + daily digest signup

### Marcus (QA Manager) — 3.5h
**Mentor:** Casey  
**Goal:** Understand AccessMap quality status + code review standards

- [ ] Git clone + build (follow CLAUDE.md setup)
- [ ] `npm run typecheck` + `npm run test` — see current state (~789/789 tests passing)
- [ ] Read: qa-reports/ folder (last 3 weeks) — understand quality patterns
- [ ] Read: `src/` structure — understand code organization
- [ ] Review: Last 5 PRs + Casey's code review comments — see patterns
- [ ] Pair with Casey: Design test coverage gate (80% target, CI enforcement approach)
- [ ] Homework: Draft test coverage checklist for team review (due W1 end)

### Devon (SRE / Incident Response) — 3.5h
**Mentor:** Rory  
**Goal:** Understand deployment, rollback, incident response framework

- [ ] Git clone + build
- [ ] Read: `release-2026-05-25.md` — understand EAS/TestFlight approach
- [ ] Review: PROJECT_STATE.md "Migrations" section — understand database change process
- [ ] Pair with Rory: Review production deployment procedures + rollback process
- [ ] Pair with Rory: Design on-call procedures + SRE runbook template
- [ ] Homework: Draft incident response playbook (due W1 end)

### Iris (User Researcher) — 3.5h
**Mentor:** Will  
**Goal:** Understand AccessMap users + Wave 2-4 feature direction

- [ ] Build app + explore as fresh user (20 min) — notice UX friction
- [ ] Read: Will's UX audit (when available, 2026-05-28)
- [ ] Review: USER_RESEARCH folder (if exists; otherwise create plan)
- [ ] Pair with Will: Discuss feature validation methods + user interview planning
- [ ] Pair with Will: Plan Wave 2-4 user research schedule + questions
- [ ] Homework: Draft user research plan for Wave 2 quick-wins (due W1 end)

### Jake (Dev Experience Lead) — 3.5h
**Mentor:** Shamus  
**Goal:** Understand repo, build setup, developer pain points

- [ ] Git clone + build — time how long setup takes (should be <10 min)
- [ ] `npm run typecheck`, `npm run test`, `npm run web` — verify all work
- [ ] Read: CLAUDE.md + setup section — follow as fresh dev, note friction
- [ ] Pair with Shamus: Review build setup, Expo config, device setup
- [ ] Pair with Shamus: Identify top 3 DX pain points to fix Phase 1
- [ ] Homework: Draft DX improvements roadmap (due W1 end)

---

## Week 1 (T+1 to T+7) — Deep Dive + Framework Design

### Marcus (QA Manager) — Full-time QA work
**Week 1 Goals:**
- Pair w/ Casey daily on code review standards (2h)
- Draft test coverage enforcement framework (GitHub Actions, CI rules)
- Review Phase 1 PRs + provide feedback
- Design code review checklist template
- Attend Thursday 6 PM planning sync

**Deliverable by W1 end:** Test coverage gate design + code review checklist (draft for team review)

### Devon (SRE / Incident Response) — Full-time SRE work
**Week 1 Goals:**
- Pair w/ Rory daily on deployment + rollback (2h)
- Draft SRE runbook template (incident response, on-call, escalation)
- Review Rory's deployment procedures + ask questions
- Design incident response process
- Pair with Riley (on-call leadership) on incident coordination

**Deliverable by W1 end:** SRE runbook template + incident response playbook (draft)

### Iris (UX Research) — Full-time UX work
**Week 1 Goals:**
- Pair w/ Will daily on UX audit insights (2h)
- Plan Wave 2-4 user research interviews
- Design feature validation survey/interview questions
- Coordinate with Shamus + Dani on Wave 2 feature finalization
- Start recruiting users for research (if needed)

**Deliverable by W1 end:** User research plan for Wave 2-4 (feature list + questions + schedule)

### Jake (Dev Experience) — Full-time DX work
**Week 1 Goals:**
- Pair w/ Shamus daily on repo + build (2h)
- Identify + triage top 10 DX pain points
- Design improvements (no implementation yet, just design/proposal)
- Review onboarding process (they just went through it!)
- Propose quick-win DX fixes for Phase 1 (if any)

**Deliverable by W1 end:** DX improvements roadmap (prioritized, Phase 1 quick-wins + Phase 2 infrastructure)

---

## Week 2-4 (T+8 to T+28) — Ramp-Up to Autonomous

### Marcus (QA Manager)
- [ ] Implement test coverage gates in GitHub Actions (w/ Casey, Rory)
- [ ] Iterate code review checklist based on team feedback
- [ ] Lead first "quality standards" team meeting (explain goals + process)
- [ ] Review all Phase 1 PRs for quality compliance
- Autonomy target: Can design + implement a new quality gate by W3 end

### Devon (SRE / Incident Response)
- [ ] Implement SRE runbook documentation system (Markdown + repo structure)
- [ ] Set up on-call rotation framework (PagerDuty or Slack integration)
- [ ] Design + propose incident response process to team
- [ ] Pair with Riley on real/simulated incident response
- Autonomy target: Can lead incident response + coordinate escalation by W3 end

### Iris (UX Research)
- [ ] Conduct first batch of user interviews (Wave 2 feature validation)
- [ ] Synthesize insights + share findings with product team (Shamus + Dani)
- [ ] Plan next research batch (if needed for Wave 3 features)
- [ ] Coordinate with Will on incorporating research into product roadmap
- Autonomy target: Can independently design + run user research by W3 end

### Jake (Dev Experience)
- [ ] Implement top 3 DX quick-wins (setup time, build speed, docs clarity)
- [ ] Propose Phase 2 DX infrastructure improvements (build tooling, CI setup, docs automation)
- [ ] Update onboarding docs + README based on lessons learned
- [ ] Set up automatic API documentation generation (TypeDoc)
- Autonomy target: Can independently propose + implement DX improvements by W3 end

---

## Success Criteria (By T+28, end of W4)

| Hire | Success Metric | By W4 End |
|---|---|---|
| **Marcus** | Test coverage gates live + enforcing in CI; code review checklist mandatory | All PRs must pass quality gate |
| **Devon** | On-call runbooks drafted; SRE process proposed to team | Ready for real incident response |
| **Iris** | Wave 2 user research complete; insights shared with product team | Feature roadmap validated by users |
| **Jake** | Top 3 DX pain points fixed; Phase 2 DX infrastructure proposed | Dev setup <10 min, tests <30s |

---

## Ongoing Cadence (Phase 1 + Beyond)

**Daily:**
- All new hires attend 7 PM PT Morgan status digest (iMessage)
- Pair sessions with mentors (2h each)

**Weekly:**
- Thursday 6 PM PT planning sync (all team + new hires)
- 1:1 w/ Morgan (Monday, 30 min) — progress check + blockers
- New hire retrospective (Friday, 30 min) — what's working, what needs adjustment

**Bi-weekly:**
- Mentor check-in (mentor + new hire + Morgan, 45 min) — feedback + growth plan

**Monthly:**
- All-hands update (new hires present learnings)
- Autonomy review (are they ready for independent work?)

---

## Contingencies

**If onboarding falls behind:**
- Extend pairing schedule to 3h daily (vs. 2h)
- Reduce Phase 1 other responsibilities (don't add more tasks)
- Schedule intensive onboarding week (T+10-14)

**If mentor is blocked (e.g., Shamus busy with feature build):**
- Rotate to secondary mentor (Gary for Jake if Shamus unavailable)
- Pair with 2 mentors (rotate, so learning continues)
- Work on async learning (docs, code review, solo research)

**If new hire not ramping fast enough by W2:**
- Morgan + mentor 1:1 (identify blockers)
- Adjust pairing focus (maybe too ambitious scope)
- Consider extending ramp (T+28 might be too ambitious for full autonomy)

---

## Mentor Responsibilities

Each mentor commits to:
- [ ] 2h daily pairing (M-F, during new hire's work hours)
- [ ] Weekly feedback (clear, actionable, positive)
- [ ] Escalate to Morgan if new hire struggling
- [ ] Celebrate milestones (first PR review, first runbook, first research insight, etc.)

---

## New Hire Responsibilities

Each new hire commits to:
- [ ] Full-time focus Phase 1 (no other distractions)
- [ ] Daily pairing + homework (framework design, runbook drafts, etc.)
- [ ] Weekly sync + retrospective feedback
- [ ] Proactive blocker communication (ask for help if stuck)
- [ ] Onboarding doc updates (improve CLAUDE.md + setup docs as you learn)

---

## Expected Costs (First 4 Weeks)

- **Mentor time:** ~10h/week per mentor × 4 weeks = 40h overhead (factored into Phase 1 timeline)
- **Setup + tools:** Slack channels, GitHub perms, accounts (~2h setup total)
- **Onboarding doc updates:** Will improve CLAUDE.md + setup (long-term ROI)

**ROI by T+120 (Phase 1 end):** 
- Marcus: Quality gates live, enforcing on every merge
- Devon: On-call procedures established, incident response <5 min
- Iris: Wave 2-4 roadmap validated by real users
- Jake: Dev setup time cut in half, team DX satisfaction +30%

---

**Prepared by:** Morgan  
**Distribute to:** Marcus, Devon, Iris, Jake + mentors (Casey, Rory, Will, Shamus)  
**Start:** ASAP (T+0 week, this week)
