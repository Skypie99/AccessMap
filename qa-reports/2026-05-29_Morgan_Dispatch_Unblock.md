# Morgan — Dispatch / Unblock Cycle (2026-05-29)

**Role:** Morgan (PM / coordination), DIRECT invocation by Sky
**Trigger:** "morgan dispatch agents to do anything that is holding us back"
**Mode:** Foreground, Sky-directed. Agents dispatched at Sonnet (Const. Opus gate — no Opus for dispatched work).

---

## Decisions recorded (Sky, 2026-05-29)

| # | Decision | Answer | Effect |
|---|---|---|---|
| **D5** | Heat-map severity-colour gradient rendering | **YES** | Unblocks Shamus heatmap severity gradient. NOTE: `shamus/d5-heatmap-2026-05-29-new` + `shamus/d5-heatmap-jordan-disclaimer-2026-05-29` branches already exist — likely built, pending merge not build. |
| **D6** | Flag-edit-history table + edit UI | **YES** | Table `public.flag_edit_history` already live on prod DB (verified 2026-05-29). Unblocks `shamus/marker-clustering-2026-05-25` edit UI merge. |

## Ground-truth correction (verified against live DB 2026-05-29)

The SQL apply queue in PROJECT_STATE.md + `2026-05-29_Morgan_SQL_Apply_Checklist.md` is **stale**. The live production project `kldlwszpfkdmsjrjhjym` ("Accessable City App") already has the full queue applied (several migrations applied multiple times). The only net-new migration this cycle — `latlong_range_constraint` — was applied + verified (see `2026-05-29_Steve_LatLng_ConstraintProposal.md`). **No SQL is actually pending.**

This means the "blocked on D3/D1 SQL apply" gates on marker-clustering are already cleared.

## What only Sky can do (NOT dispatched)
- **Merge to main** — Const. hard rule. Agents prep + verify; Sky merges.

## Agents dispatched (read-only / audit — no main merge, no DB writes, no external sends)

1. **Reconciliation (Sonnet, read-only):** corrected PROJECT_STATE migration + feature status vs. actual live DB. Output → `qa-reports/2026-05-29_Morgan_StateReconciliation.md`.
2. **Branch merge-readiness audit (Sonnet, isolated worktrees):** for each pending branch (d5-heatmap variants, design-creative-polish, a11y-perf wave3, security-hardening-wave2, marker-clustering, expo-web-vercel) — rebases-clean-vs-main? typecheck? tests? conflicts? → ordered, one-click merge list for Sky. Output → `qa-reports/2026-05-29_Morgan_MergeReadiness.md`.

## Next (after intelligence lands)
Dispatch targeted build/fix agents ONLY for genuinely-missing pieces the audits surface — not before. Avoids redundant work in a volatile multi-branch tree.
