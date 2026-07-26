# Morgan Cycle — BP13 Unblock (AccessMap R2 train)

```yaml
date: 2026-07-18
mode: DIRECT /morgan
model_tier: opus-4-8   # Sky-initiated interactive; S-10 train law
coherence_score: 0.85
state_consistency: pass   # build-plan DECISIONS §P authoritative & accurate; NOTE: ~/AccessMap/PROJECT_STATE.md is STALE (2026-06-20, pre-R2)
duplicate_work_detected: no   # risk flagged — see §5
drift_risk: medium   # stranded uncommitted work + a possibly-still-open prior window + stale PROJECT_STATE
```

## TL;DR — THE FIX
The R2 train is **not broken**. It is **stalled at a half-finished BP13.** Landing BP13 unblocks the whole tail.
**One action:** fire `13_arrival-and-waits.md` in a **fresh Opus window** — its resume rule reconciles the stranded T7 edits and completes T9, then writes its §P tip. BP14→BP17 then unlock in order.
**Do NOT** fire BP14–17 now (they §0-STOP). **Do NOT** `git checkout`/`stash`/`reset` — that clobbers the stranded T7 work (LEARNINGS 2026-05-25).

## Diagnosis (read-only, 2026-07-18 00:31)
- BP12 is the last LANDED phase (§P tip `705a798`). Branch `r2/bp13-arrival-waits` exists but == BP12 tip (reflog: created-from, 0 commits; no §P entry).
- A BP13 run was active ~23:41 (≈50 min before this cycle) and left **uncommitted, PARTIAL** work on the shared tree:
  - **T7 (arrival) drafted:** `PlatformMap.tsx` (+24, instant-camera), `PlatformMap.web.tsx` (+9, instantCut), `MapScreen.tsx` (+54, T7 / F4-03 / F5-03 no-location voice) — 4 T7 markers.
  - **T9 (word-every-wait / never-claim-a-zero) = NOT STARTED** — 0 markers for T9 / F5-01/02/05/09. **BP13 is ~half done.**
- Never committed, gated, or recorded in §P.

## §1 Dependency Graph
nodes:
- `bp13/arrival-waits#T7` (executor, build) — IN-FLIGHT, uncommitted
- `bp13/arrival-waits#T9` (executor, build) — NOT STARTED
- `bp13/§P-tip` (executor, land) — the unblock gate for the tail
- `bp14-editorial-frame` (executor, build) — LOCKED
- `bp15-drawer-guest` / `bp16-copy-gate` / `bp17-hygiene-deploy` (executor, build) — LOCKED (cascade)

edges:
- `bp13#T9 → bp13#T7` (serialize: shared `MapScreen.tsx`)
- `bp14 → bp13/§P-tip` (gate: §0 prior-tip present)
- `bp15 → bp14/§P-tip` · `bp16 → bp15/§P-tip` · `bp17 → bp16/§P-tip` (+ L9 runs-last)

## §2 Reason for Ordering
- Linear stack; each branch cuts from the prior phase's §P tip — master §6 **L2** + the §0 gates verified on BP14/15/16/17 this session.
- BP17 runs last — master §6 **L9** ("run early it consolidates nothing").
- **One BP13 window only** — never a 2nd agent on the shared tree while T7 edits are in-flight: `LEARNINGS:2026-05-25 — Sequential build/merge discipline (uncommitted-change collision)` + `— Concurrent working-tree collision` (a `git checkout` clobbered in-flight `TasksScreen.tsx` edits — the exact failure mode here).
- BP13/T7 reuses BP1's instant-camera path, never forks it — master §7 / §6 **L1**.

## §3 Blocked Nodes
- `{node: bp13#T9, why: not started (T7 uncommitted), unblock: fire BP13 fresh — resume rule finishes it, type: MISSING_INPUT}`
- `{node: bp14-editorial-frame, why: no BP13 §P tip, unblock: BP13 lands §P, type: BLOCKER}`
- `{node: bp15/bp16/bp17, why: cascade behind bp14, unblock: prior §P tips land in order, type: BLOCKER}`
- `{node: fire-BP13, why: needs an executor window (Morgan is read-only on code), unblock: Sky fires fresh OR authorizes finish-in-this-window, type: DECISION_FOR_SKY}`

## §4 Checkpoint References
- `{name: BP12 (last landed), role: executor, artifact: commit:705a798, qa-report: design-reviews/r2-audit/build-plan/DECISIONS.md §P BP12 line}`
- `{name: BP13 stranded T7, role: executor, artifact: branch:r2/bp13-arrival-waits (uncommitted; tip==705a798), qa-report: ~/.claude/plans/bp14-the-woolly-peach.md}`

## §5 Duplication Report
- `{agents: [prior BP13 window (~23:41), a NEW BP13 window], overlap: shared working tree + r2/bp13-arrival-waits branch, resolution: CONFIRM the prior window is closed before firing; run exactly ONE BP13 window (LEARNINGS 2026-05-25)}`

## Jordan trigger check (Const. 7.6)
- T7 brushes the **location** trigger (no-location arrival = permission-state presentation) but adds NO new persistence/send and is privacy-**positive** (removes the fake-San-Francisco frame). Honesty fence already mandated in the BP13 spec → **no Phase-0 Jordan gate required.**

## §6 State Snapshot
- Train: **12/17 phases landed on branches** (BP1+BP2 merged to `main` `373c582`; BP3→BP12 STOPPED-on-branches). BP13 half-done + stranded. BP14 fired→STOPPED (this session, zero edits).
- **ACTION (deferred):** `PROJECT_STATE.md` is STALE (compiled 2026-06-20, pre-R2 — still describes the Phase 7a→13 editorial era at `45bca1a`). Recommend a `/new-window` refresh **after** BP13 lands — not now (avoid working-tree churn during the stranded state). Authoritative state today = DECISIONS §P + the MEMORY.md R2 index line (both current).
- Rollback anchor for the tail: BP12 tip `705a798`.

## §7 Execution Plan Summary
- Critical path: `bp13 → bp14 → bp15 → bp16 → bp17` (strictly serial — L2 + L9). No parallelizable groups (linear train). **acyclic: true.**
- READY: `bp13` (with resume-reconcile). LOCKED: `bp14`–`bp17`. BLOCKED beyond the cascade: none.
- BACKGROUND constraints: n/a (Sky-interactive, Opus per S-10).

## Recommendation
Land BP13 — either (A) I switch this window into the BP13 executor now and finish it (Opus, resume rule reconciles T7 + builds T9, STOP-on-branch), or (B) you fire a fresh BP13 window yourself. Confirm no other BP13 window is open first, either way.
