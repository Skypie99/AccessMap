# AccessMap — Decisions Log

Structural decisions, append-only. New entries at the top. Do NOT re-litigate entries without Sky approval — conflicts with logged decisions are BLOCKERs (VL Coherence Check 1).

---

## 2026-05-27 — Heat-map Wave 3 Cycle

- **D5 RESOLVED:** Heat-map severity-colour rendering → **gradient** (green→yellow→red ramp).
  Sky answered; Shamus delivered on branch `feat/heat-map-severity-2026-05-27`. Built with gradient as default (`DEFAULT_HEATMAP_MODE = 'gradient'` in `src/lib/heatmap.ts`) and one-line density flip. 827/827 tests, TSC clean. Jordan's two pre-approval conditions wired: k≥3 floor enforced in-lib; HeatmapLegend overlay live in UI.
  **Authority:** Sky (decision), Shamus (build), Morgan (log update)

- **D-NEW-8 OPEN:** Merge `feat/heat-map-severity-2026-05-27` into main.
  No migration dependency. No gate. Only prerequisite: Gary review of `test/gary-wave4-heatmap-2026-05-27` to confirm tests are additive (recommended before merge per LEARNINGS:2026-05-25 — Sequential merge/build discipline).
  **Status:** Ready. **Authority:** Sky (merge decision only)

- **D-NEW-9 OPEN:** 12+ uncharted branches built 2026-05-26–27 (feat/notify-flag-status, feat/shamus-category-quickfilter, feat/shamus-flag-deeplink-detail, feat/tasks-search, fix/sql-cleanup, security/hardening-wave2, a11y-perf/wave3, design/creative-polish, design/auto-linheight, test/gary-wave2, test/gary-wave3, + 6 claude/ branches). Will must audit before next merge wave to prevent silent commit loss (LEARNINGS:2026-05-25 — Parallel merge paths silently drop commits).
  **Status:** Will audit pending. **Authority:** Will (audit), Morgan (coverage in next briefing)

- **D-NEW-10 OPEN:** Delete `feat/heatmap-severity-gradient-2026-05-25` (superseded by `feat/heat-map-severity-2026-05-27`). Must wait for Will to confirm no unique commits not present in the new branch.
  **Status:** Blocked on Will audit. **Authority:** Sky (delete approval)

---

## 2026-05-24 — Bootstrap Velocity Loop State Files

- **Decision:** Create PROJECT_STATE.md, DECISIONS_LOG.md, TASK_GRAPH.json for AccessMap as first-cycle bootstrap.
- **Rationale:** AGENT_OS v1.14 STATE AUTHORITY requires these three files as canonical state authority for all ACTIVE projects. Files were absent; every orchestrator run was rebuilding state from conversation context — a coherence risk. Morgan created them on first post-project audit cycle.
- **Supersedes:** Nothing (first entry).
- **Authority:** Morgan (ACTIVE mode — direct invocation; reversible write to project root per Const. 5.5)
