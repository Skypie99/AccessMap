---
mode: active
date: 2026-05-26
title: Rory Merge Gates — Audit Handoff
---

# Rory Merge Gates — Audit Handoff

**Date:** 2026-05-26
**Context:** Constitution Art. 1.2 updated. Rory now executes merges to main with two-gate approval (Gary + subject-matter expert). This memo coordinates the immediate audit workflow for 5 AccessMap branches + Prompt Library a11y fix.

---

## Governance (Quick Reference)

- **Gate 1:** Gary audits code quality, tests, CI — **required on every branch**
- **Gate 2:** Subject-matter expert approves per branch type (see assignments below)
- **Orchestration:** Morgan (me) tracks approvals and tells Rory when both gates are green
- **Execution:** Rory merges only after both gates sign off

---

## AccessMap Branches (5 Ready to Merge)

These 5 branches were pre-verified by Rory as clean. Now they need the two-gate approval.

| Branch | Type | Gate 1 (Gary) | Gate 2 | Priority | Notes |
|---|---|---|---|---|---|
| `feat/tasks-tab-badge-2026-05-26` | UI | **[YOUR CALL, GARY]** | Alex | High | Pure UI, no new logic. Fast review. |
| `feat/photo-prompt-severity-2026-05-26` | UI | **[YOUR CALL, GARY]** | Alex | High | Amber nudge on severity 4/5, no photo. UI only. |
| `security/auto-2026-05-25-steve-send-push-auth` | Security | **[YOUR CALL, GARY]** | Steve | **HIGHEST** | Fixes unauthenticated push edge case. Steve will review his own code; Gary validates the gate. |
| `privacy/auto-2026-05-26-jordan-distance-filter-review` | Privacy | **[YOUR CALL, GARY]** | Jordan | High | Jordan already signed off on privacy (it's in the branch name). Gary validates; Jordan re-confirms. |
| `docs/auto-2026-05-25-will-merge-guide` | Docs | **[YOUR CALL, GARY]** | Alex | Medium | Documentation only. Alex confirms clarity/UX. Gary validates no code slipped in. |

---

## Prompt Library Branches (Secondary Sequence)

After Alex approves AccessMap a11y, she has one more gate: the API Nudge a11y fix.

| Branch | Type | Status | Gate 1 | Gate 2 | Notes |
|---|---|---|---|---|---|
| `fix/a11y-api-nudge-2026-05-26` | A11y Fix | Shamus fixed all 7 failures | **[GARY]** | **[ALEX]** | Re-review after Shamus's fixes (all 7 issues resolved). Alex's call. |

After this passes, the 5-branch Prompt Library merge sequence can proceed:
- `feat/basepath-2026-05-25`
- `cycle/auto-2026-05-23-n3-cleanup` (Gary already APPROVED)
- `docs/auto-2026-05-25-...`
- `a11y/fix-a11y-api-nudge-2026-05-26` (after Alex re-review)
- `feat/api-nudge-2026-05-26`

---

## What Each Auditor Should Check

### Gary (Code Quality Gate — Required on All Branches)

**What to verify:**
- Typecheck passes (`npm run typecheck`)
- Lint passes (existing ESLint config)
- Tests pass (if new tests added)
- No console errors or warnings in the change
- No dead code or debug statements left in
- No dependency version bumps without a security reason
- Branch is up-to-date with main (`git merge-base main <branch>` is recent)
- Commit history is clean (no merge commits, squash where sensible)

**Your output:**
- Write a brief approval to `/Users/skypie/AccessMap/qa-reports/2026-05-26_Gary_CodeAudit_<branch-name>.md` (or Prompt Library path)
- One paragraph: "Typecheck ✅, lint ✅, no surprises. Ready for secondary audit."
- **Once approved,** ping the secondary auditor for their gate

### Alex (Accessibility & UI — UX/a11y Gate for UI Branches)

**When:** AccessMap UI branches + Prompt Library API nudge

**What to verify:**
- WCAG 2.2 AA compliance (Art. 2.3)
- Touch targets ≥44pt
- Focus rings visible
- Color contrast ≥4.5:1 on text
- No component regressions (styles match design tokens)
- UX clarity (can a new user understand the flow?)

**Your output:**
- Write approval to `/Users/skypie/AccessMap/qa-reports/2026-05-26_Alex_A11yGate_<branch-name>.md`
- One paragraph: "A11y compliance ✅. No regressions. Ready to merge."
- Or: "Found X a11y issues — escalating to Shamus for fix."

### Steve (Security Gate — Security Branch)

**When:** `security/auto-2026-05-25-steve-send-push-auth`

**What to verify:**
- RLS is not weakened (Art. 7.3)
- Auth checks are in place (no unauthenticated paths exposed)
- No credentials/secrets committed
- No new attack surface introduced

**Your output:**
- Write approval to `/Users/skypie/AccessMap/qa-reports/2026-05-26_Steve_SecurityGate_send-push-auth.md`
- One paragraph: "Security boundaries intact. No new exposure. Ready to merge."

### Jordan (Privacy Gate — Privacy Branch)

**When:** `privacy/auto-2026-05-26-jordan-distance-filter-review`

**What to verify:**
- Location data not exposed (Art. 7.2)
- No indirect inference of user location/identity
- Privacy policies consistent with implementation
- No new third-party services collecting data

**Your output:**
- Write approval to `/Users/skypie/AccessMap/qa-reports/2026-05-26_Jordan_PrivacyGate_distance-filter.md`
- One paragraph: "Privacy boundary intact. No location/identity leak. Ready to merge."

---

## The Sequence (What You Invoke)

**You are invoked ONE ROLE AT A TIME by Sky, in this order:**

1. **`/gary`** — Audit all 5 AccessMap branches + Prompt Library a11y fix
   - Runs in parallel, all 6 branches
   - Outputs 6 approval reports (or blocks if issues found)

2. **`/alex`** — A11y gate on the two UI branches (tasks-badge, photo-nudge) + Prompt Library API nudge
   - Depends on Gary's approvals
   - Outputs 3 approval reports

3. **`/steve`** — Security gate on security branch
   - Depends on Gary's approval
   - Outputs 1 approval report (can run in parallel with Alex)

4. **`/jordan`** — Privacy gate on privacy branch
   - Depends on Gary's approval
   - Outputs 1 approval report (can run in parallel with Alex/Steve)

5. **`/rory`** — Merge all approved branches to main
   - Depends on both gates being green
   - Merges: tasks-badge, photo-nudge, send-push-auth, distance-filter, merge-guide
   - Then checks Prompt Library for merges (once API nudge is approved)

---

## How to Know You're Done

**Gary:** Write 6 approvals (5 AccessMap + 1 Prompt Lib). Secondary auditors can start.

**Alex:** Write 3 approvals (2 AccessMap + 1 Prompt Lib). Rory can merge the two UI branches.

**Steve:** Write 1 approval (security branch). Rory can merge the security branch.

**Jordan:** Write 1 approval (privacy branch). Rory can merge the privacy branch.

**Rory:** Merge all approved branches in one pass. Report merged + any still-blocked to Morgan.

---

## Notes for Auditors

- **Rory already pre-verified these branches as clean.** Your job is to add expert eyes, not to catch bugs Rory missed.
- **Write brief approvals.** One paragraph per branch; no need for detailed breakdowns.
- **If you find an issue:** Escalate to Shamus (for code/UI fixes) or the domain expert. Don't merge. Write what needs fixing and to whom.
- **Your qa-report IS the approval ticket.** Once Rory sees it, he knows you're ready.

---

**Morgan** — I'm tracking these approvals. Once I see all gates green for a branch, I tell Rory. No stalling.

