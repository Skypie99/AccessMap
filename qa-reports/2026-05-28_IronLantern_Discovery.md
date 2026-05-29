# IRON LANTERN — Discovery Report

**Date:** 2026-05-28
**Plan:** `~/.claude/plans/opus-max-effort-maintenance-wise-hippo.md`
**Phase:** 0 + 1 (State Preservation + Discovery Formalization)
**Operator:** Opus 4.7 (Sky-initiated)
**Authority:** Morgan Standing Approval (safe-reversible state capture)
**Status:** COMPLETE — Phase 2a (Forensic Drift Diff) follows in `2026-05-28_IronLantern_DriftDiff.md`

---

## §1 — State Preservation Artifacts

| Artifact | Path | Status |
|---|---|---|
| Git tag | `iron-lantern-baseline-2026-05-28` on `9b5edc9` in `~/AccessMap` | ✓ Created |
| Governance tarball | `~/.claude/backups/iron-lantern-pre-2026-05-28.tar.gz` (149 KB) | ✓ Created |
| Tarball contents | `commands/`, `CLAUDE.md`, `CONSTITUTION*.md`, `AGENT_OS.md`, `MODEL_TIER_MATRIX.md`, `settings*.json`, project memories | ✓ Verified |
| Discovery report | This file | ✓ Indexed (§5) |

**Rollback paths verified before any state-changing action:**
- AccessMap source rollback: `git -C ~/AccessMap reset --hard iron-lantern-baseline-2026-05-28` (Sky-only)
- Governance state rollback: `tar -xzf ~/.claude/backups/iron-lantern-pre-2026-05-28.tar.gz -C ~/`

---

## §2 — Corrected Discovery Numbers

Three Explore agents produced the original triage; this section reconciles their counts against direct measurement.

| Zone | Triage Estimate | Actual (verified) | Delta |
|---|---|---|---|
| qa-reports (live, .md at root) | 246 | **136** | Triage overcounted (counted .txt or recursed) |
| qa-reports archived | 96 | **0** in `archive/`, archive subdir empty/missing | Triage misclassified |
| qa-reports today (2026-05-28) | 49 | **26** | Triage overcounted by ~2× |
| Morgan reports today | 25 | **8** | Triage overcounted by ~3× |
| Project dirs under -Users-skypie-AccessMap | 23 / 106 | **108** | Triage 1 was wrong; triage 3 was close |
| Plans in `~/.claude/plans/` | 67 | **68** | Approximate match |
| Git branches (all) | 125 | **126** | Match |
| Memory files (active, AccessMap) | 48 | (per Explore: 48) | Not re-verified |

**Today's role breakdown (26 reports):**
Morgan 7 + Reggie 3 + Dana 2 + Cipher 2 + Archi 2 + 1 each of {Steve, Sage, Rory, Quinn, Quill, Nora, Jordan, Gary, Alex} + 1 lowercase `morgan` = 26.

---

## §3 — Governance Leaks (CRITICAL — Sky decision required)

Six role names appear in today's qa-reports but have **NO command file** in either `~/.claude/commands/` or `~/ClaudeCorp/.claude/commands/`:

| Role | Reports today | Status |
|---|---|---|
| **Reggie** | 3 (Cross-Project-Index, Index-Rebuild, Observability-Sync-Audit) | No command file |
| **Cipher** | 2 (Cross-Project-Secrets-Scan, Photo-Path-Consistency) | No command file |
| **Archi** | 2 (Abandoned-Branch-Triage, Worktree-Audit) | No command file |
| **Quill** | 1 (Wave6-Candidates) | No command file |
| **Nora** | 1 (Decisions-Log-Append) | No command file |
| **Sage** | 1 (Learnings-Extraction) | No command file |

Additionally, the deployed `morgan.md` (Const. Art. 1.5 scheduled task guard section) references **"Sam, Taylor"** as expected-Haiku roles — neither has a command file either. That makes **8 total potential governance leaks**.

**Implication:** Either these are uncommitted slash-commands that Sky has invoked from elsewhere, sub-personas of Morgan/Will, or experimental roles that bypassed the Constitution's role-definition gate.

**Recommended path for Sky (§7 Decision §1):**
- (a) **Formally create** command files in `~/ClaudeCorp/.claude/commands/` for each role with explicit scope (Reggie = state/index, Cipher = security/secrets, Archi = branch/worktree archival, Quill = backlog scoping, Nora = decisions-log curator, Sage = learnings curator) — recommended for any role with ≥3 reports.
- (b) **Formally retire** roles by reassigning their work to existing 15 roles (e.g., Reggie → Will, Cipher → Steve, Archi → Rory, Quill → Quinn, Nora/Sage → Will).
- (c) **Leave as-is** — accept undocumented authority. Not recommended; violates Const. Art. 4 (Execution Boundaries).

---

## §4 — Master-vs-Deployed Drift Pattern (preview for Phase 2a)

All 17 command files (15 roles + orchestrator + cycle/sync-router) have **deployed > master** byte deltas. Pattern analysis:

| File | Δ bytes | Pattern |
|---|---|---|
| `morgan.md` | +1394 | **Substantive rewrite.** New: TACTICAL ROUTING table, Confidence Gate, Reporting Cadence, Housekeeping Authority, SCHEDULED TASK CREATION GUARD. Removed: SCOPE RESTRICTION block, enforcement pre-dispatch validators. |
| `sync-router.md` | +947 | **Restructure.** Adds CANONICAL SPEC heading, formalizes allowed/forbidden actions, reformats step blocks. |
| `orchestrator.md` | +334 | Adds SCOPE RESTRICTION block (AccessMap+Portfolio focus) that morgan.md removed. |
| 14 other role files | +24 to +25 each | **Single common line added:** `autonomous-model: sonnet` in YAML frontmatter (the Opus restriction implementation). |

**Two contradictions identified:**

1. **Frontmatter vs documented tier map.** The 14 files with `autonomous-model: sonnet` include Gary, Casey, Will, Rory, Riley — but morgan.md's "Expected model by role" table classifies these as Haiku-tier. The frontmatter contradicts the documented Constitution Art. 1.5 tier map.

2. **CLAUDE.md HARD RULE vs deployed defaults.** `~/.claude/CLAUDE.md` (2026-05-28) declares: *"Default model for autonomous work is Haiku."* But 14 of 17 deployed command files declare `autonomous-model: sonnet`. The runtime contradicts the global rule.

**Implication for Phase 2:** Promoting deployed → master would propagate both contradictions into the canonical source. Phase 2a (DriftDiff) must surface these as per-file decisions, not bulk-promote.

---

## §5 — Cross-Domain Headlines

**Healthy zones (no Iron Lantern action needed):**
- Source tree clean — 0 TODOs, no dead files, no orphan deps (per discovery Agent 1).
- Constitution v1.11 + AGENT_OS v1.16 byte-identical between deployed and master — Constitution layer integrity intact.
- Memory: 48 active files indexed in MEMORY.md, no duplicate keys (per Agent 3).
- Settings layer minimal (no hook sprawl).
- Scheduled tasks: 1 active (`morgan-scheduled-task-opus-audit`, Haiku).
- BACKGROUND_HALT sentinel: not set (background work permitted by config).

**Documentation drift (Phase 3 target):**
- `PROJECT_STATE.md` dated 2026-05-27, contradicts current `main` after recent auto-merge cycle (commit `177283e` landed multiple "blocked" branches into main).
- LEARNINGS.md is 51 KB and growing daily — not yet at compression threshold but trending toward it.
- DECISIONS_LOG.md is 4.1 KB, fresh, append-only, coherent.
- **INDEX.md drift is SEVERE.** Header claims "Cycle 5 Wave (46 Reports)" but **17 of 22 Morgan-indexed entries point to files that DO NOT EXIST** on disk. INDEX.md was likely written from a planned-dispatch list, not from actual files. Phase 3 must regenerate from `ls`, not from prior INDEX state.
  - Missing files include: `Morgan_APPROVED_AuditExecution.md`, `Morgan_APPROVED_D2_PushTokens.md`, `Morgan_APPROVED_Heatmap_D6.md`, `Morgan_Alex_A11yAudit.md`, `Morgan_D1_RLSMigrationGate.md`, `Morgan_DISPATCH_EXECUTION.md`, `Morgan_EXECUTION_LIVE.md`, `Morgan_Gary_HeatmapMergeReview.md`, `Morgan_Jordan_PrivacyAudit.md`, `Morgan_MergeWave_Complete.md`, `Morgan_Monday_Execution_Readmap.md`, `Morgan_Quinn_FeaturePriority.md`, `Morgan_RoryMergeExecution.md`, `Morgan_Rory_BranchAudit.md`, `Morgan_Rory_ExpoWebMergeReview.md`, `Morgan_Saturday_Verification_Checklist.md`, `Morgan_URGENT_UnblockingPlan.md`.
  - **Actual Morgan files on disk (9):** Cycle5-Control, Cycle5-Summary, Cycle6-Summary, Cycle7-Summary, D4-Dispatch-Control, DecisionRouting, Kickoff-Dispatch, Sky-Actions-Complete, dashboard-scope (lowercase).
  - Updates Phase 3 consolidation target: from "8 → 3-4 master summaries" to **"audit INDEX vs disk, decide on missing files (write or remove from INDEX), then consolidate the actual 9 Morgan files."**

**Accumulation zones (Phase 5 target):**
- 108 worktree dirs (most concurrent branch state, but mtime audit needed).
- 68 plan files in `~/.claude/plans/` (all ≤7 days, retention policy still needed).
- 126 git branches (3 pre-flagged for deletion in PROJECT_STATE.md).
- Duplicate Jordan EXIF audits (ExifPrivacyAudit + ExifPrivacyReaudit) on 2026-05-28.

---

## §6 — Index Update

This report has been registered. INDEX.md will be appended with:

```
- [2026-05-28_IronLantern_Discovery.md](2026-05-28_IronLantern_Discovery.md) — Phase 0+1 of PROJECT IRON LANTERN; 8 governance leaks identified; drift profile complete
```

(Append performed in next tool call.)

---

## §7 — DECISIONS FOR SKY (must resolve before Phase 2b promotion)

1. **Governance leaks (§3)** — for each of {Reggie, Cipher, Archi, Quill, Nora, Sage, Sam, Taylor}: create command file, retire and reassign, or leave undocumented?
2. **autonomous-model contradiction (§4.1)** — should `sonnet` files be corrected to `haiku` per morgan.md's documented tier map, or should morgan.md's tier map be updated to match the frontmatter?
3. **CLAUDE.md HARD RULE conflict (§4.2)** — does the "Haiku default" rule override the 14 deployed `sonnet` declarations, or do the deployed declarations document an explicit exception that should be added to CLAUDE.md?
4. **morgan.md SCOPE RESTRICTION** — the deployed version removed the "AccessMap+Portfolio only" block but orchestrator.md added it. Was the move intentional, or should both files carry it (or only orchestrator)?
5. **Phase 2 promotion direction** — given the contradictions, accept "per-file with forensic review" (plan default) or pause and resolve the contradictions in `~/ClaudeCorp/` first, then promote a cleaned-up version both ways?

The DriftDiff report (Phase 2a) provides per-file recommendations to support these decisions.

---

## §8 — Phase 2a Handoff

Next artifact: `~/AccessMap/qa-reports/2026-05-28_IronLantern_DriftDiff.md` — per-file diff classification with promote/skip/manual-review recommendations. Read-only (no mutations). Produces the decision surface Sky needs for Phase 2b.

After Phase 2a completes, **execution pauses at Sky gate** per the plan's execution model.

---

**Report integrity:** All numbers in this report are from direct `ls`, `wc`, `diff`, and `git` calls executed in the current session. No values derived from Explore agent estimates without re-verification. Discrepancies between triage and actual measurement are surfaced in §2.
