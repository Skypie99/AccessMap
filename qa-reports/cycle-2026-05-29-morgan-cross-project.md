---
role: Morgan (PM)
cycle: 2026-05-29
mode: DIRECT (/morgan, Sky-initiated)
scope: cross-project (AccessMap · Portfolio · Dashboard · ClaudeCorpDashboard)
model_tier: Opus (Sky-initiated session — Const. 1.5 exception)
coherence_score: 0.91
state_consistency: fail   # AccessMap PROJECT_STATE header (2026-05-29) vs decisions table (2026-05-27) drift
duplicate_work_detected: no
drift_risk: medium
---

# Morgan Cross-Project Briefing — Blockers + Owners + Dispatch

## §1 Dependency Graph
nodes:
- gary/accessmap-branch-audit (Gary, audit) — classify 18 unmerged branches SAFE/REVIEW/BLOCKED
- rory/accessmap-merge-wave (Rory, merge) — gated merge of SAFE branches to main
- steve/accessmap-security-signoff (Steve, review) — fix/security-hardening + shamus/d8-exif-fix
- jordan/accessmap-privacy-signoff (Jordan, review) — exif/privacy-touching branches
- sky/accessmap-sql-apply (Sky, apply) — 6 pending migrations (DB)
- morgan/state-refresh (Morgan, housekeeping) — AccessMap state drift + Portfolio/Dashboard state files
- gary/portfolio-branch-audit (Gary, audit) — 3 unmerged Portfolio branches

edges:
- rory/accessmap-merge-wave → gary/accessmap-branch-audit (gate: SAFE classification)
- rory/accessmap-merge-wave → morgan/approval (gate: Const. Rory-elevated, Morgan approval + no privacy risk)
- steve/accessmap-security-signoff → rory/accessmap-merge-wave (gate: security branches blocked until signoff)
- jordan/accessmap-privacy-signoff → rory/accessmap-merge-wave (gate: privacy branches blocked until signoff)
- sky/accessmap-sql-apply → (no upstream — Sky-only, Const. Art. 5)

## §2 Reason for Ordering
- Gary audit precedes any merge — Const. Art. 5 (no main mutation without QA gate) + Rory-elevated authority memo requires "Gary audit + Morgan approval + no safety/privacy risk" (project_rory_elevated_approval, valid through 2026-05-30).
- SQL applies are Sky-only and have NO delegable upstream — Const. Art. 5 ("never apply anything to a live database"). These cannot be dispatched; they are reported, not actioned.
- Security/privacy branches gated behind Steve/Jordan before merge — Const. Art. 7.6 (Jordan trigger: disability/location/PII) + Art. 9.4 routing. shamus/d8-exif-fix touches photo metadata (EXIF GPS) → privacy trigger fires → Jordan Phase-0.
- State refresh is Morgan housekeeping — Const. Art. 10.2 (weekly PROJECT_STATE refresh authority).
- LEARNINGS:2026-05-28 — "EXIF stripping functions exported for test coverage" + worktree node_modules symlink rule cited for any Gary worktree audit.

## §3 Blocked Nodes
- {node: sky/accessmap-sql-apply, why: 6 migrations PROPOSE-ONLY/APPROVED awaiting DB apply (users_email_privacy, D3 status_update_trigger, D1 flag_edit_rls, D2 push_tokens, D4 batch), why blocked: only Sky may apply to live DB, unblock: Sky runs SQL in Supabase Editor, type: DECISION_FOR_SKY}
- {node: rory/accessmap-merge-wave, why: 18 branches unmerged, awaiting SAFE classification, unblock: Gary audit completes + Morgan approval, type: BLOCKER}
- {node: steve/accessmap-security-signoff, why: fix/security-hardening-2026-05-30 unreviewed, unblock: Steve sign-off, type: BLOCKER}
- {node: jordan/accessmap-privacy-signoff, why: shamus/d8-exif-fix touches EXIF GPS metadata, unblock: Jordan privacy gate PASS, type: BLOCKER}
- {node: dashboard/state, why: ~/Dashboard has no PROJECT_STATE.md (no canonical state), unblock: Morgan creates state file, type: MISSING_INPUT}

## §4 Checkpoint References
- {name: AccessMap main, role: Rory, artifact: commit:5698fef, qa-report: 2026-05-29_Rory_MergeWave.md}
- {name: AccessMap tests green, role: Gary, artifact: branch:shamus/d5-heatmap-2026-05-29#commit:8e02302 (79 heatmap tests + 1135 suite), qa-report: PROJECT_STATE.md:5}
- {name: Portfolio live, role: Shamus, artifact: branch:shamus/portfolio-fixes-2026-05-29#commit:951f1ea, qa-report: PROJECT_STATE.md (portfolio)}
- {name: Dashboard hardening, role: Rory, artifact: branch:rory/dashboard-hardening-2026-05-29#commit:58bd12a, qa-report: 2026-05-30_Peter_VercelPWA.md}

## §5 Duplication Report
- {agents: [~/Dashboard, ~/ClaudeCorpDashboard], overlap: two separate "dashboard" repos both active with open branches; unclear if same product, resolution: escalation — Morgan flags to Sky for canonical-repo decision; treating ~/Dashboard as active per memory un-hold 2026-05-28}

## §6 STATE SNAPSHOT
- AccessMap: main 5698fef, 1135 tests, 18 unmerged branches, 6 SQL migrations pending Sky. STATE DRIFT (decisions table dated 2026-05-27, header 2026-05-29) → Morgan refresh queued.
- Portfolio: live (github.io/portfolio), 3 unmerged branches, state stale 2026-05-28.
- Dashboard: 1 branch (rory hardening), NO state file.
- ClaudeCorpDashboard: 3 branches (gary tests x2, peter icon audit), no state file.

## §7 Execution Plan Summary
- Phase 0 (READY now, safe): gary/accessmap-branch-audit (dispatched, Sonnet, read-only)
- Phase 1 (LOCKED on Gary): rory/accessmap-merge-wave (SAFE branches only) + Steve/Jordan signoff on security/privacy branches
- Phase 2 (Sky-only, BLOCKED): SQL applies
- Classification: total 7 nodes · READY 1 · LOCKED 4 · BLOCKED 2 (Sky-only)
- Critical path: gary-audit → rory-merge-wave → (Sky SQL apply, parallel)
- acyclic: true

---

## Blockers + Suggested Owners (the ask)

| # | Project | Blocker | Owner | Type |
|---|---|---|---|---|
| B1 | AccessMap | 6 SQL migrations awaiting DB apply (PII email, D3 trigger, D1 RLS, D2 push, D4 batch) | **Sky only** (Const. Art. 5) | DECISION |
| B2 | AccessMap | 18 unmerged branches piled up 2026-05-29 | **Gary** (audit) → **Rory** (gated merge) | BLOCKER |
| B3 | AccessMap | fix/security-hardening + shamus/d8-exif-fix need review before merge | **Steve** (security) + **Jordan** (EXIF privacy) | BLOCKER |
| B4 | AccessMap | PROJECT_STATE decisions table stale (2026-05-27) vs header (2026-05-29) | **Morgan** (housekeeping) / /new-window | DRIFT |
| B5 | Portfolio | 3 unmerged branches; state stale 2026-05-28 | **Gary** (audit) → **Rory/Sky** (merge); **Morgan** (refresh) | BLOCKER |
| B6 | Dashboard | No PROJECT_STATE.md; 1 branch pending | **Morgan** (create state); **Gary/Rory** (branch) | MISSING_INPUT |
| B7 | Dashboard×2 | ~/Dashboard vs ~/ClaudeCorpDashboard both active — canonical? | **Sky** (clarify) | DECISION |

## Dispatch this cycle
- **DISPATCHED:** Gary AccessMap branch-readiness audit (Sonnet, read-only, background). Output → 2026-05-29_Gary_BranchAudit.md. This is the gate that unblocks Rory's merge wave.
- **HELD (need Sky go):** SQL applies (B1), main merges (B2/B5), dashboard reconcile (B7).
- **QUEUED (Morgan, next):** state refresh AccessMap decisions table + create Dashboard PROJECT_STATE.
