# Task Queues — Current State (2026-05-28)

Each role maintains a 3-item queue. Morgan reads these files instead of parsing qa-reports.  
**Format:** YAML for readability; Morgan parses via schema.json.

---

## Shamus — Feature Builder

**Updated:** 2026-05-28 14:00 UTC  
**Current queue:**

### 1. `feat-clustering` — Marker clustering + flag edit UI
- **Status:** ready-to-merge (all code done, tests passing)
- **Branch:** origin/shamus/marker-clustering-2026-05-25
- **Blocker:** D1 (flag_edit_rls_replacement migration)
- **Merge ETA:** 2026-05-28 EOD once D1 applied
- **Unblocks:** dani-polish-phase, will-ux-refinement, wave5-design-final
- **Tests added:** 20 (Gary's updateFlagContent tests)
- **Notes:** Code review done. Alex a11y audit complete (5 fixes applied). Waiting on Sky to apply D1 migration.

### 2. `feat-notify-flag-status` — Push notification Edge Function
- **Status:** ready-to-deploy (code written, tested)
- **Branch:** origin/feat/notify-flag-status
- **Blocker:** D2 (push_tokens migration + Edge Function deploy)
- **Merge ETA:** 2026-05-29 once D2 applied (merge), then Rory deploys Edge Function
- **Unblocks:** end-to-end push notifications in app
- **Tests added:** 12
- **Notes:** Edge Function written (commit 838b166). Blocked on Sky applying D2 + Rory deploying via Supabase Dashboard.

### 3. `fix-statushistory-darkmode` — StatusHistoryModal tokens + a11y
- **Status:** in-code-review (Dani reviewing token changes)
- **Branch:** origin/fix/dani-statushistory-darkmode-2026-05-25
- **Blocker:** None (can merge once code review done)
- **Merge ETA:** 2026-05-29 morning (waiting Dani feedback)
- **Unblocks:** none (polish pass on existing feature)
- **Tests added:** 3
- **Notes:** Raw #fff tokens need design-token replacement. Alex a11y roles pending Dani approval.

---

## Dani — Design & Tokens

**Updated:** 2026-05-28 14:00 UTC  
**Current queue:**

### 1. `design-creative-polish` — Wave 4 visual refinement
- **Status:** in-progress (design comps 80% done)
- **Branch:** origin/design/creative-polish-wave4
- **Blocker:** None (design phase, can iterate independently)
- **Merge ETA:** 2026-05-30 (Shamus builds UI once design lands)
- **Unblocks:** shamus-creative-UI-build
- **Tests added:** 0 (design branch, no code yet)
- **Notes:** Color gradient refinement, spacing tweaks. Waiting on decision D5 (heatmap severity colors) to finalize palette.

### 2. `token-residuals-darkmode` — Design token consolidation
- **Status:** ready-to-merge (all token definitions audited)
- **Branch:** origin/chore/design-token-residuals-2026-05-25
- **Blocker:** None
- **Merge ETA:** 2026-05-28 EOD (can merge anytime, low risk)
- **Unblocks:** statushistory-darkmode-fix, future dark-mode features
- **Tests added:** 0 (no behavior change)
- **Notes:** Consolidates radius.circle, overlayBtnPressed, accessibilityRole. Cleanup, no logic changes.

### 3. `audit-statushistory-darkmode` — Review Shamus's statushistory fix
- **Status:** in-code-review (reviewing token replacements)
- **Branch:** origin/fix/dani-statushistory-darkmode-2026-05-25
- **Blocker:** None (can approve/request changes immediately)
- **Merge ETA:** 2026-05-29 (once Dani approves, Shamus can merge)
- **Unblocks:** allows that feature to land in Wave 5
- **Tests added:** 3 (from Shamus)
- **Notes:** Reviewing #fff → use-token replacements. Once approved, Shamus merges.

---

## Steve — Security & RLS

**Updated:** 2026-05-28 14:00 UTC  
**Current queue:**

### 1. `sign-off-trigger-logic` — Approve status update trigger
- **Status:** ready-for-decision (security audit complete)
- **Branch:** N/A (decision gate D3, not a feature branch)
- **Blocker:** None (review is done, waiting on Sky's go/no-go)
- **Decision ETA:** 2026-05-28 (Morgan messages Sky: "Steve says trigger is safe")
- **Unblocks:** D3 application → enables status-history audit (feature already merged)
- **Notes:** Trigger logic reviewed. No RLS conflicts. Points calculation is correct (matches schema). Steve recommends APPROVE.

### 2. `rls-hardening-wave2` — RLS policy audit & tightening
- **Status:** in-progress (audit 60% done)
- **Branch:** origin/security/hardening-wave2
- **Blocker:** None (security audit, can run in parallel)
- **Merge ETA:** 2026-05-31 (audit finishes, proposes fixes)
- **Unblocks:** stronger RLS before public launch (D8 prep)
- **Tests added:** 0 so far (audit phase)
- **Notes:** Reviewing all policies for privilege creep. Proposal will be a set of ALTER POLICY statements for Sky review.

### 3. `exif-metadata-review` — Privacy pre-launch audit (D8)
- **Status:** blocked (waiting on photos to be in production)
- **Branch:** N/A (audit task)
- **Blocker:** Needs flag photos actually live + used in production
- **Merge ETA:** Post-launch audit (2026-05-31+)
- **Unblocks:** D8 resolution (EXIF GPS strip before public launch)
- **Notes:** Low priority right now; will trigger once photos are live. Steve will scan sample photos for EXIF GPS data, recommend client-side strip strategy.

---

## Morgan's Reading

**To understand current state without parsing qa-reports:**
- Shamus: 2 features ready (clustering, notifications), 1 in code review (darkmode). All blocked on D1/D2 decisions.
- Dani: 2 features ready (polish design, tokens), 1 in review. No blockers except D5 decision (heatmap colors).
- Steve: 1 decision needed (D3 trigger), 1 audit in progress, 1 future. No code blockers.

**Critical path:** D1 + D2 apply → clustering + notifications merge → Wave 5 design lands → Shamus builds creative UI.

**Parallel:** Dani's design + Steve's RLS audit run independently; can land anytime without blocking critical path.

---

## How to Update This

**Each role updates their queue weekly (Friday EOD):**
1. Move completed tasks off the list
2. Add new tasks that are now ready to build
3. Update status/blockers/ETA as things change
4. Commit to git: `git add qa-reports/TASK_QUEUES_CURRENT.md && git commit -m "chore: update task queues (Shamus/Dani/Steve)"`

**Morgan's reading rhythm:**
- Daily: glance at queue status column for blockers
- Weekly: read notes to understand why tasks are waiting
- Decision time: check if a D-gate unblocks any queued tasks

**Example Friday EOD update (once D1 is applied):**
```yaml
### 1. feat-clustering — COMPLETED
- Status: merged (commit a3c91f)
- Merge date: 2026-05-28 14:35 UTC
- Next task promoted: [new feature]
```
