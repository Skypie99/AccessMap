# Workflow Instructions: Decision Gates + Task Queues

**For Sky, Morgan, and the team to use together starting 2026-05-28.**

---

## Three Artifacts Working Together

| Artifact | Who Uses It | When | Why |
|---|---|---|---|
| **DECISION_GATE_TEMPLATE.md** | Sky + Decision Owner | When a decision blocks features | Removes re-reading 20-page proposals. Sky approves in 5 min. |
| **TASK_QUEUES_CURRENT.md** | Shamus, Dani, Steve + Morgan | Weekly Friday EOD update | Morgan reads queue status instead of parsing 15 qa-reports. |
| **TASK_QUEUE_SCHEMA.json** | Developers + parsing tools | When adding new tools/dashboards | Standardized format for automation. |

---

## Sky's Workflow (Decision Approval)

**When a decision is ready:**

1. **Receive** — Morgan sends iMessage: "D3 ready for decision (trigger approval)" with link to decision gate file
2. **Read** — Open `qa-reports/DECISION_GATE_TEMPLATE.md`, find D3 section
3. **Check checklist** — 5 boxes, all must be checked by the decision owner
4. **Decide** — Mark `☐ APPROVED` or `☐ HOLD` in the template
5. **Apply** — Follow the "What to Apply" section (Supabase SQL Editor OR Terminal command)
6. **Confirm** — Post timestamp + confirmation link in the "Applied Confirmation" section
7. **Notify** — Morgan reads confirmation, messages the blocking team member (Shamus: "D1 applied, merge when ready")

**Time commitment per decision:** 5 min reading + 5 min applying = 10 min per D-gate.

**Current backlog:** D1 (30 min: 2 migrations) + D2 (15 min: 1 migration) + D3 (messaging Steve, 1 min) + D5 (1 min: pick a color) = ~50 min total to unblock 6–8 features.

---

## Team's Workflow (Task Queue Updates)

**Each role updates their queue every Friday EOD:**

**Shamus, Dani, Steve:** (5 min per week)
1. Open `qa-reports/TASK_QUEUES_CURRENT.md` in your editor
2. Find your section
3. Update each task:
   - Change `status` if it moved (e.g., "in-code-review" → "ready-to-merge")
   - Update `merge_eta` if you know when it's landing
   - Update `notes` (e.g., "Waiting on D1" → "D1 applied, merging now")
4. If a task is done: move it to "COMPLETED" section, promote next queued task
5. Commit: `git add qa-reports/TASK_QUEUES_CURRENT.md && git commit -m "chore: update task queues ($(date +%Y-%m-%d))"`

**Format stays the same** (YAML, human-readable). Morgan parses status + blockers columns; no ambiguity.

---

## Morgan's Workflow (Daily/Weekly Reading)

**Daily (30 sec):**
- Scan "status" column for any `blocked` → check if a decision gate can unblock it
- Example: "feat-clustering" shows `blocked: D1` → message Sky if D1 hasn't been applied yet

**Weekly briefing (Friday EOD):**
1. Read `TASK_QUEUES_CURRENT.md` instead of parsing 15 qa-reports
2. Check "merge_eta" column → expect which features land next week
3. Check "blockers" column → identify which D-gates are critical path
4. Report to Sky (iMessage): "6 features queued, 3 waiting on D1 + D2, ETA once you apply (30 min work)"

**Reduce briefing token cost by 30%** because you're reading a structured queue, not prose qa-reports.

---

## Example Flow: D1 Application (Today)

**11:00 AM — Sky:**
1. Reads decision gate D1 template (2 min reading)
2. Checks 5-min checklist ✅ all green
3. Applies migration in Supabase SQL Editor (3 min)
4. Posts confirmation: timestamp + "Supabase logs show policy applied"

**11:10 AM — Morgan:**
1. Sees confirmation in decision gate file
2. Messages Shamus (iMessage): "D1 applied, marker-clustering is ready to merge"

**11:15 AM — Shamus:**
1. Merges `origin/shamus/marker-clustering-2026-05-25` to main
2. Updates task queue Friday EOD (removes feat-clustering, promotes next task)

**Outcome:** Feature shipped, zero Slack back-and-forth, clear 5-min decision execution time.

---

## Setup Instructions for Team

**Copy-paste for Cowork or Slack:**

```
Hey team, we have three new workflow artifacts starting today (2026-05-28):

1. **Decision gates** — Sky approves decisions in 5 min using a standard template (no re-reading proposals)
2. **Task queues** — Shamus/Dani/Steve maintain a 3-item queue. Morgan reads these instead of parsing qa-reports.
3. **Task queue schema** — standardized JSON format for future dashboard

Files:
- DECISION_GATE_TEMPLATE.md (how decisions are approved and applied)
- TASK_QUEUES_CURRENT.md (current state of features in progress)
- TASK_QUEUE_SCHEMA.json (structure for tooling)
- WORKFLOW_INSTRUCTIONS.md (this guide)

**What changes for you:**
- Shamus/Dani/Steve: update your queue section every Friday EOD (5 min). That's it. No more full qa-reports.
- Sky: approve decisions using the template (5 min per decision). No more reading long proposals.
- Morgan: read task queues instead of qa-reports (saves token cost, faster briefings).

**First update:** Friday 2026-05-29 EOD. Update your queue with final status before weekend.

Questions? Ask Morgan.
```

---

## FAQ

**Q: Do I still write qa-reports?**  
A: No for task updates. Yes for deep issues/decisions that need context. Shamus's "marker clustering is 80% done" → goes in task queue. "We found a RLS bug that affects 3 features" → still a qa-report (gets sent to Morgan + routed to Steve).

**Q: What if something changes mid-week?**  
A: Update the task queue anytime. Not just Friday EOD. If blocking changes (e.g., D1 applied), update immediately so Morgan's daily scan catches it.

**Q: Do I fill out the decision gate template myself?**  
A: The decision OWNER fills it out (e.g., Steve fills D3 "trigger sign-off" — he writes what it unblocks, prerequisites, rollback plan). Sky reads it and fills the "Decision" section (APPROVED/HOLD/BLOCKED).

**Q: What if my task doesn't fit the queue?**  
A: If it's a security/privacy/RLS issue, it becomes a qa-report + decision gate. If it's a bug affecting multiple features, it goes in a shared "blockers" section. The 3-item queue is for on-track features; exceptions get escalated to Morgan.

**Q: How does this connect to the dashboard?**  
A: The dashboard will read `TASK_QUEUE_SCHEMA.json` and render the queues + decision gates as a real-time status board. For now, it's YAML files + manual updates. Automation comes later.

---

## Adoption Timeline

- **2026-05-28 (today):** Files created, workflow documented
- **2026-05-28–2026-05-29:** Team reads instructions, confirms they understand
- **2026-05-29 EOD (Friday):** First weekly updates to task queues
- **2026-05-30 (Saturday morning):** Morgan reads updated queues, prepares weekly briefing for Sky
- **Ongoing:** Daily queue scans for Morgan, weekly team updates, decision approvals use template

**Estimated time savings:** 2 hrs/week per team member (less qa-report writing), 1 hr/week for Morgan (faster briefings), 10 min/decision for Sky (no re-reading proposals).

---

## When to Escalate (Still Use qa-reports)

**Write a qa-report if:**
- A blocker affects 3+ features (escalate to Morgan + Steve/Jordan as needed)
- A security/privacy issue is discovered (goes to Steve/Jordan for decision gate)
- A design conflict between two features (goes to Dani for arbitration)
- A test failure affects multiple branches (goes to Gary + team)

**Otherwise:** Keep it in task queue (status + notes). Cleaner signal.
