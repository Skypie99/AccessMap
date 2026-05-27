# AccessMap — Decisions Log

Structural decisions, append-only. New entries at the top. Do NOT re-litigate entries without Sky approval — conflicts with logged decisions are BLOCKERs (VL Coherence Check 1).

---

## 2026-05-24 — Bootstrap Velocity Loop State Files

- **Decision:** Create PROJECT_STATE.md, DECISIONS_LOG.md, TASK_GRAPH.json for AccessMap as first-cycle bootstrap.
- **Rationale:** AGENT_OS v1.14 STATE AUTHORITY requires these three files as canonical state authority for all ACTIVE projects. Files were absent; every orchestrator run was rebuilding state from conversation context — a coherence risk. Morgan created them on first post-project audit cycle.
- **Supersedes:** Nothing (first entry).
- **Authority:** Morgan (ACTIVE mode — direct invocation; reversible write to project root per Const. 5.5)

## 2026-05-26 (Evening) — Wave 1 Completion + Gate 2 Verification

- **[WAVE6-MERGE-SEQUENCE]** 9 READY Wave 6 branches merge in ascending commit-count order (report-templates 1 → notif-prefs-screen 4 commits). Minimizes merge complexity and gate-passing risk. — 2026-05-26
- **[RLS-MIGRATION-APPLIED]** Flag editing RLS policy deployed to live Supabase (2026-05-25_flag_edit_rls.sql). Owners cannot edit flags once status ≠ 'open'. Constitution Art. 7.3 gap closed. Verified: RLS 403 on non-owner/non-open edits, points trigger active. — 2026-05-26
- **[GATE-2-VERIFIED]** Supabase backend integrity gate PASSED. RLS policies enforced, points trigger verified (5/10/2/5 points), schema consistent. Ready for Gate 3 (human understanding test). — 2026-05-26
