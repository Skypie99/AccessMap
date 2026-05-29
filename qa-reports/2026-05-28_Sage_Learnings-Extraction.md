# Learnings Extraction — Cycles 5–6 Patterns (2026-05-28)

**Specialist:** Sage (temporary, deployed by Morgan in Cycle 6-Shadow)  
**Period scanned:** 2026-05-22 through 2026-05-28  
**Reports sampled:** 15 diverse reports across roles (Morgan, Steve, Jordan, Rory, Gary, Alex, Quinn, Shamus)  
**Method:** Read-only audit of qa-reports; identified recurring issues, Constitution citations, anti-patterns, patterns.

---

## Key Patterns Identified

### 1. Delegated Gate Authority Works (Steve + Jordan Autonomy)

**Pattern observed:** Steve (security) and Jordan (privacy) were delegated gate approval authority per Constitution Art. 7.6 + 2026-05-28 amendment. They acted autonomously without bouncing items back to Sky.

**Outcome (Cycle 5):**
- D1 (flag-edit RLS): Steve ✅ + Jordan ✅ → approved
- D2 (push-tokens): Steve ✅ + Jordan ✅ (conditional on app-level sign-out) → approved  
- D3 (status-update trigger): Steve ✅ + Jordan ✅ → approved
- D4 (realtime-flags): Steve silent, Jordan flagged policy question → correctly escalated to Sky

**Success indicator:** The D4 escalation was correct (privacy design is policy, not security). Both roles knew the boundary between their authority (can approve/block) and Sky decisions (can change design intent).

**Recurring risk:** Delegation only works when the role understands its scope. If a role fuzzes the boundary ("maybe I should ask Sky about this") the gating gets slow.

### 2. Morgan's Standing Approval Authority Reduces Latency

**Pattern observed:** Morgan was granted standing approval authority for "safe + quality + forward" changes (per 2026-05-28 amendment). In Cycle 5, Morgan:
- Dispatched 7 agents in parallel without requesting Sky approval per item
- Consolidated outputs into one summary report (Cycle5-Summary.md)
- Only escalated ONE item to Sky (D4 policy question)

**Outcome:** Three days of work (5 projects, 60+ features in flight) compressed into one Morgan dispatch + one summative handoff. Latency dropped from "approval per branch" to "approval per cycle."

**Load-bearing rule:** Morgan must be disciplined about what "safe" means. In this cycle, all 7 dispatches stayed within boundaries (no prod DB writes, no main-branch touches, no external sends). If Morgan drifted to "I'll ship this on my authority," the standing approval would break the Constitution.

### 3. Sequential Merge Discipline (Again) — Worktree Isolation Required

**Pattern observed:** Two separate learnings hit in the 2026-05-22 through 2026-05-28 period:
- 2026-05-25: Concurrent merge agents (two Shamus) collided in the same working tree, dropping commits undetected
- 2026-05-28: Gary's worktree had no `node_modules`, so `npm test` failed (new learning added to LEARNINGS.md)

**Root cause:** Isolation boundary not enforced by the dispatch plan.

**Mitigation:** New LEARNINGS.md entry added (2026-05-28) — worktree node_modules must be symlinked. Also, every concurrent build agent MUST get `isolation: "worktree"` in the dispatch plan.

**Constitution bridge:** Art. 5 (no unattended prod writes) is safe, but Art. 1 (Sky-only merges) depends on git state being clean. Worktree collisions corrupt that state silently.

### 4. Privacy Policy Decisions Are NOT Technical Blockers

**Pattern observed:** D4 (realtime-flags) is technically sound — RLS is correct, no auth bypass, no PII exposure. But Jordan correctly flagged a DESIGN QUESTION: is it INTENDED that all authenticated users stream all flags in real-time, including location + disability category?

**Outcome:** Jordan did NOT block D4. Instead, Jordan filed three escalation options for Sky to choose. This is the right pattern for policy-vs-technical separation.

**Anti-pattern to avoid:** A role saying "this is a privacy issue, so I'm blocking it" without telling Sky what the technical alternatives are. Jordan avoided that.

### 5. Propose-Only SQL Migrations (Const. Art. 5.3 Working)

**Pattern observed:** D1, D2, D3, D4 are all FILES in `supabase/migrations/` with "HOW TO APPLY" headers. No agent applied them to the live DB. Sky will apply them (or not) in a separate action.

**Outcome:** Steve + Jordan could audit without ever touching the database. Schema drifts if the migration sits unapplied, but the client code handles it (dual-write pattern + graceful degradation).

**Recurring strength:** This pattern is working exactly as intended. No credentials leaked, no accidental prod writes.

### 6. Cycle Branching + Wave Consolidation (Release Branch Pattern)

**Pattern observed:** Rory's merge wave (2026-05-28) consolidated 63 commits from multiple feature branches into `release/auto-2026-05-28`, all off `main`. Typecheck 0 errors, Jest 1068/1068 passing.

**Outcome:** Gary can audit the release branch in one pass rather than reviewing 12 individual feature branches. Reduces gate complexity.

**Load-bearing detail:** Rory explicitly did NOT push to `main`. The release branch is a proposal. Sky does the final merge.

### 7. Constitution Article 1 (Sky-Only Merges) Holding

**Pattern across cycle:** No agent merged to `main` on any project. Every "ready to merge" report ends with "Sky executes the final merge." Morgan's standing approval covers dispatch + unblock, not merges.

**Verification:** Rory's Cycle5 report explicitly states `Const. Art. 1 compliance: Rory did NOT push to main.` Same in Gary's, Alex's, Quinn's reports.

**Meta-risk:** If an agent ever says "I merged the release branch to main because it was approved," that's a Constitution violation. The reports show no such case in Cycle 5–6.

### 8. EXIF Metadata Stripping — Private Functions Should Be Exported for Testing

**Pattern observed:** Dana's privacy-critical EXIF stripping code in `flags.ts` was initially private (`stripExifNative`, `stripExifWeb`, `verifyExifStripped`). New LEARNINGS.md entry (2026-05-28) says these should be exported so Gary can test them directly without mocking the full Supabase + MediaLibrary chain.

**Outcome:** Privacy-critical code is easier to audit if tests don't require integration mocks.

**General principle:** Any function that handles PII, strips metadata, or validates data should be exported, even if it's "internal." The export keyword adds zero runtime overhead.

### 9. Async Confirmation Decisions (No Bouncing)

**Pattern observed:** Morgan's decision-routing (Cycle 5-DecisionRouting.md) explicitly routed 8 decisions without re-asking Sky for micro-approvals. Items like "apply Security Wave 2 hardening" and "stage the release branch" were marked READY and routed to the next agent (Gary for audit, Rory for staging) without a Sky-confirmation round-trip.

**Outcome:** Parallelization across 7 agents; no waiting for Sky's reply to "should I audit this branch now?" before starting.

**Failure mode:** If a routed decision turned out to need Sky input, the agent would discover it, file it as a DECISIONS FOR SKY block, and downstream agents would see it.

### 10. Worktree Node_modules Symlink Is Load-Bearing

**Pattern observed (new 2026-05-28):** Gary's worktree at `/tmp/gary-exif-2026-05-28` had no `node_modules`. Running `npm test` failed with "jest: command not found." The fix was `ln -s ~/AccessMap/node_modules /tmp/<worktree-name>/node_modules`.

**Outcome:** New rule added to LEARNINGS.md for any orchestrator prompt that creates a worktree and runs npm/jest/tsc.

**Constitutional link:** This is a gotcha that could cause a QA agent to bail with a false "build broken" report when it's just isolation setup.

### 11. Privacy Gate and Security Gate Work in Parallel (Not Sequential)

**Pattern observed:** Steve and Jordan both audited D1–D4 simultaneously. Their reports came back on the same day (2026-05-28). They did NOT block each other.

**Outcome:** Dual-gate pattern is fast — one role's slowness doesn't cascade.

**Anti-pattern to avoid:** Serial gating ("security first, then privacy") that forces one audit to wait for the other.

### 12. Proposol-Only Branches Accumulate Without Merging Blocker

**Pattern observed:** As of 2026-05-28, AccessMap has 41 feature branches in flight. Quinn's reconciliation report names the Top 10 and marks the rest as "ready but sequenced after D1/D3 SQL applies."

**Outcome:** Queuing is explicit (Quinn's job). Features don't merge until their dependencies land, but they're not lost or forgotten.

**Risk:** If an agent mistakes "ready" for "merged," they could build on a non-existent base. The qa-reports make this explicit, so confusion is low.

### 13. Constitution Art. 9.4 (No External Sends) Holding

**Pattern across cycle:** Morgan's Cycle 5 summary explicitly states "No agent applied SQL to prod DB. No external sends." Same verification in Gary's, Alex's, Rory's reports.

**Detail:** No iMessage, email, Slack, webhook, app-store submit, deploy. All findings surface in qa-reports; Morgan picks them up.

### 14. Design Compiler (Art. 2.4) Not Triggered This Cycle

**Pattern observed:** No UI-touching changes triggered the 7-layer Design Compiler gate. Shamus's builds (heatmap, tokens, polish) all have _existing_ design specs approved by Dani in prior cycles. When Alex audits a11y on those features, it's post-design validation, not pre-design.

**Risk:** If a UI feature ships WITHOUT Dani's compile gate (e.g., a new modal Shamus built off-spec), that's a violation. No such case in this cycle.

### 15. Dual-Sign Pattern (Steve + Jordan) Reduces False Escalations

**Pattern observed:** D1/D2/D3 could have been "Steve approves, then Jordan approves (sequential)" or "either one blocks (disjunctive)." Instead, the amendment created dual-sign: both must pass, either can escalate.

**Outcome in D4:** Jordan escalated the policy question, and because it wasn't a technical blocker, Morgan could still report "D1/D2/D3 APPROVED, D4 NEEDS DECISION" rather than "all items blocked pending Sky."

**Lesson:** Dual-gate amplifies signal (two independent audits) without creating a false bottleneck (one role's uncertainty doesn't stop the other).

---

## Anti-Patterns to Avoid

1. **Concurrent agents on the same working tree without worktree isolation.** (Learned 2026-05-25, relearned 2026-05-28 with node_modules issue.)

2. **Assuming "propose-only" means "ready to merge" without verifying dependencies.** (Quinn's reconciliation explicitly maps which items block which; order matters.)

3. **Delegating a gate without defining the boundary.** Steve and Jordan succeeded because the amendment was explicit: "can approve/block in your domain; escalate policy decisions to Sky."

4. **Merging to `main` without Sky's final confirmation.** (No such case observed, but Rory's explicit "Const. Art. 1 compliance" statement shows vigilance.)

5. **Treating privacy design questions as technical blockers.** (Jordan got this right with D4: filed options, didn't block.)

6. **Stacking feature branches without a consolidation point.** (Rory's release branch + Gary's audit pattern prevents this.)

---

## Constitutional Citations (This Cycle's Invocations)

| Article | Invocation | Context |
|---------|-----------|---------|
| **Art. 1** | Sky-only merges to main | Rory, Gary, Alex, Shamus reports all verify non-compliance |
| **Art. 5** | No prod DB writes + propose-only migrations | Jordan, Steve, Dana reports all adhere |
| **Art. 5.3** | Migrations are files, never applied by agents | 4 SQL migrations (D1–D4) are propose-only; Sky applies |
| **Art. 7.6** | Mandatory privacy gate | Jordan's audit on D1–D4; D4 escalated for policy |
| **Art. 9.4** | No external sends | Morgan, Rory, Gary all verify compliance |
| **Art. 2.4** | Design Compiler gate | No UI-touching changes; existing specs used; Dani NOT invoked |

---

## Velocity & Latency Wins This Cycle

- **Delegated gates (Steve + Jordan):** Reduced approval latency from "Sky decides each item" to "roles auto-approve within scope, escalate policy decisions."
- **Morgan standing approval:** Enabled 7-agent parallel dispatch without per-dispatch Sky approval rounds.
- **Release branch consolidation:** Reduced audit scope from "review 12 branches" to "audit 1 release branch + 63 commits."
- **Dual-sign pattern:** Prevented false blockers while keeping signal integrity.

---

## Gotchas Solidified This Cycle

1. **Worktree node_modules symlink is non-obvious.** New agents will make this mistake. LEARNINGS.md entry + orchestrator prompt updates required.

2. **Privacy design ≠ technical blocker.** Steve (security) and Jordan (privacy) have different scopes. Jordan's escalation of D4 was correct and precise.

3. **Proposal accumulation is fine if dependencies are explicit.** 41 AccessMap branches, 8 gates — not chaos, it's a queue. Quinn's reconciliation made the order clear.

---

## Recommendations for Cycle 6

1. **Update any orchestrator prompt that creates worktrees** to include the symlink step immediately after `git worktree add`.

2. **Formalize the Release Branch + Audit pattern** as the standard for merging 5+ features in one cycle. Make it explicit in Morgan's dispatch plans.

3. **Monitor the 41-branch queue.** If D1 and D3 SQL get applied, Shamus can merge marker-clustering and unblock 5 downstream features. This is the critical path for Cycle 6 productivity.

4. **Preserve the dual-sign pattern.** It's working. No changes needed.

5. **Encourage Jordan to raise more policy questions early.** D4's "is this intended?" is exactly the kind of early-catch that prevents user-facing surprises post-ship.

---

**Report filed:** 2026-05-28 · 19:45 UTC  
**Method:** Read-only audit of 15 diverse qa-reports  
**Constitution alignment:** 100% (Art. 1, 5, 7.6, 9.4, 2.4 all held)  
**Blocking issues found:** None (all safety rules followed)
