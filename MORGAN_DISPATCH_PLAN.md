# Morgan — Agent Dispatch Plan
**Date:** 2026-05-26 | **Mission:** Get all agents working on Phase 1 Wave 6 tasks immediately

---

## Your Role
You are the dispatch coordinator. Your job: get each agent connected, informed, and working on their assigned task **in this exact order**. No waiting for confirmation between steps — keep velocity.

---

## Dispatch Order (Execute in sequence)

### 1️⃣ RORY → Git Lock Blocker (Task #5) — PRIORITY
**Status:** Ready to start immediately  
**Blocker:** `.git/index.lock` preventing all git operations  
**Impact:** Blocking Tasks #2 (Shamus) and #3 (Gary)

**What Rory needs to do:**
```
Investigate and resolve .git/index.lock:
- ls -la .git/index.lock (check ownership, permissions)
- Attempt removal with appropriate context
- Document blockers if unresolvable
- Goal: unblock Tasks #2 and #3 for immediate execution

PARALLEL: Code review for rapid merge prep:
- Branch: feat/tasks-search-2026-05-25 (Shamus)
  * Verify: npm run typecheck passes
  * Verify: commit message follows convention
  * Ready for: git merge --no-ff
  
- Branch: feat/notifications-expo-sdk54 (Gary)
  * Verify: npm run typecheck passes
  * Verify: commit message follows convention
  * Ready for: git merge --no-ff
```

**Success:** Lock resolved OR blockers documented. Code review complete. Both branches merge-ready.

**Then:** Rory resumes prior work until complete.

---

### 2️⃣ DANI & WILL → UX/Feature Audit (Task #6) — START NOW
**Status:** Ready to start immediately  
**No blockers:** Design/audit work is independent

**What they need to do:**
```
End-to-end app review. Focus areas:

1. VISUAL DESIGN
   - Flags page default behavior (doesn't feel right per Sky)
   - Color palette (too much white — needs improvement)
   - Contrast, spacing, hierarchy

2. FEATURE AUDIT
   - What's missing?
   - What could work better?
   - Low-hanging fruit vs. complex work

3. ACCESSIBILITY GAPS
   - Guest mode (no sign-up required) — HIGH PRIORITY
   - Vision loss mode (future planning)
   - Other a11y issues

4. DELIVERABLE
   Prioritized list of improvements for Waves 2–4:
   - What: feature/change description
   - Why: impact on user experience
   - Effort: S/M/L estimate
   - Wave: target wave (2, 3, 4, or Future)
```

**Success:** Suggestions document complete. Prioritized roadmap implications clear.

---

### 3️⃣ SHAMUS → Task #2 (Pop Stash & Commit) — QUEUED
**Status:** Awaiting git lock resolution from Rory  
**Branch:** `feat/tasks-search-2026-05-25`  
**Stash:** `stash@{1}` — "pre-merge-stash: package.json expo-notifications + coverage + qa-reports"

**Ready-to-execute commands (once git lock clears):**
```bash
git checkout feat/tasks-search-2026-05-25
git stash pop stash@{1}
git commit -m "feat: add search query filter to tasks display (GAP-7)"
git push
npm run typecheck  # verify
```

**Success:** Commit pushed. typecheck passes. Merged to main.

---

### 4️⃣ GARY → Task #3 (Commit expo-notifications) — QUEUED
**Status:** Awaiting git lock resolution from Rory  
**Branch:** `feat/notifications-expo-sdk54`  
**Completed:** `npm install expo-notifications` (8 packages added, 9 changed), typecheck passes  
**Pending:** git commit + push

**Ready-to-execute commands (once git lock clears):**
```bash
git add package.json package-lock.json
git commit -m "feat: add expo-notifications dependency"
git push origin feat/notifications-expo-sdk54
```

**Success:** Commit pushed. Changes integrated. Branch ready to merge.

---

### 5️⃣ DANI (concurrent) → Task #4 + Task #6
**Task #4:** Design Compiler gate for heatmap-severity (active)  
**Task #6:** UX/Feature audit (with Will)

**No git dependencies.** Both run in parallel. No blockers.

---

## Timeline & Dependencies

```
NOW (T+0):
├─ Rory: Start Task #5 (git lock + code review)
└─ Dani & Will: Start Task #6 (UX/Feature audit)

When Rory resolves git lock (T+?):
├─ Shamus: Execute Task #2 (~3 min)
└─ Gary: Execute Task #3 (~2 min)

Parallel:
└─ Dani: Finish Task #4 design specs (independent)

Phase 2 begins when:
✅ Task #1 (Rory): COMPLETE
✅ Task #2 (Shamus): Commit pushed
✅ Task #3 (Gary): Commit pushed
✅ Task #4 (Dani): Design delivered
```

---

## Success Criteria

| Task | Owner | Status | Done When |
|------|-------|--------|-----------|
| #1: Merge 11 branches | Rory | ✅ COMPLETE | — |
| #2: Pop stash & commit tasks-search | Shamus | 🔴 QUEUED | Commit pushed to main |
| #3: Install + commit expo-notifications | Gary | 🔴 QUEUED | Commit pushed to main |
| #4: Design Compiler gate | Dani | 🟢 ACTIVE | Design specs delivered |
| #5: Resolve git lock + code review | Rory | 🟡 READY | Lock resolved, branches merge-ready |
| #6: UX/Feature audit | Dani & Will | 🟡 READY | Prioritized suggestions document |

**Phase 2 Unblocks:** When Tasks #1–4 complete (currently 1/4 done).

---

## Key Principles

- **No waiting:** Each agent starts immediately. No confirmation delays.
- **Parallel execution:** Rory's git work runs parallel to Dani & Will's audit.
- **Queue management:** Tasks #2 and #3 are queued and ready to fire the instant git lock clears.
- **Back-to-work:** Rory returns to prior work after Task #5 completes.
- **Momentum:** All team members actively engaged. No idle blocks.

---

## Questions or Blockers?

If any agent encounters a blocker, document it and escalate to Sky (project lead). Don't wait.

---

**Dispatch starts NOW. Let's maintain velocity. 🚀**
