---
date: 2026-08-02
role: iron-lantern-weekly-triage
mode: BACKGROUND
model_tier: haiku
---

# Iron Lantern Weekly Triage — 2026-08-02

## §1 Inventory

- **qa-reports total:** 604 files
- **qa-reports today:** 1 file (this report)
- **INDEX regenerated:** deferred (regen script not found; manual audit performed instead)
- **master-vs-deployed drift:** DRIFT DETECTED (Constitutional files out of sync)
- **governance leaks:** none detected (manual spot-check clean)

---

## §2 Worktree staleness candidates (>14 days inactive)

No stale worktrees found. (Scan of `~/.claude/projects/-Users-skypie-AccessMap/` complete; all worktree dirs current or within 14-day threshold.)

---

## §3 Plan staleness candidates (>14 days unreferenced)

**98 plans >14 days old; 1 referenced in recent qa-reports, 97 unreferenced:**

Referenced (sample):
- `fable-5-max-effort-toasty-moth.md` (2026-07-16, 17d ago) — cited in `cycle-2026-07-19-iron-lantern-weekly.md`

Unreferenced candidates (oldest first, sample):
- `fable-audit-accessmap-lively-llama.md` (2026-07-04, 29d ago)
- `accessmap-glass-rollout-fuzzy-zebra.md` (2026-07-03, 29d ago)
- `portfolio-uplift-p0-a-dapper-thacker.md` (2026-07-03, 29d ago)
- `fable-audit-sky-s-parsed-quail.md` (2026-07-03, 29d ago)
- `accessmap-uplift-p0-deep-lake.md` (2026-07-04, 28d ago)
- `accessmap-glass-rollout-fuzzy-zebra-agent-a056ac68acf368268.md` (2026-07-03, 29d ago)
- `portfolio-uplift-p0-b-jolly-valley.md` (2026-07-04, 28d ago)
- `fable-audit-accessmap-cheeky-hennessy.md` (2026-07-04, 28d ago)
- `portfolio-uplift-p1-sequential-honey.md` (2026-07-04, 28d ago)
- `accessmap-bench-2-opus-4-8-snug-wilkinson.md` (2026-07-06, 26d ago)

*(97 total; full list available via `find ~/.claude/plans -name "*.md" ! -path "*/.archive/*" -newermt "2026-07-19" -prune -o -print`)*

---

## §4 Drift Summary

**CONSTITUTION.md drift detected:**
- Deployed (`~/.claude/CONSTITUTION.md`): mtime 2026-06-18 18:18:52
- Master (`~/ClaudeCorp/.claude/CONSTITUTION.md`): mtime 2026-07-16 16:40:11
- **Status:** Master is NEWER by 29 days with governance updates (Articles 9 and 12 restructured; Art. 9.4 offset changes; expert routing additions)
- **Direction:** Deployed version is STALE; master was updated but not synced back to deployed

**AGENT_OS.md drift detected:**
- Deployed (`~/.claude/AGENT_OS.md`): mtime 2026-06-18 18:18:52
- Master (`~/ClaudeCorp/.claude/AGENT_OS.md`): mtime 2026-07-16 16:40:11
- **Status:** Master is NEWER by 29 days with governance-article cross-references updated (9.9 → 9.4, 12.2 + 9.9 → 12.2 + 9.4)
- **Direction:** Same as CONSTITUTION.md — deployed is STALE

**CLAUDE.md:** clean (deployed and master match, mtime 2026-07-16 both sides)

---

## §5 Governance Leak Summary

Manual spot-check of law files (`~/.claude/`, `~/ClaudeCorp/.claude/`) for governance-instruction leaks (instructions embedded in role/skill files that override Constitution):
- No leaks detected
- Role files (`~/.claude/commands/*.md`) do not contradict Articles 1, 5, 9, 12, 17
- Skill manifests inspected; no local overrides found

---

## §6 Action Blockers for Morgan

**CONSTITUTION.md and AGENT_OS.md are out of sync.** Per CLAUDE.md § "Master folder", the deployed `~/.claude/` copies ARE the canonical law (Sky-facing), and master (`~/ClaudeCorp/.claude/`) should mirror them *from* deployed, never the reverse. Current state is inverted: master has July governance updates that deployed lacks.

**Decision needed:** Was the 2026-07-16 master update intentional and awaiting a deliberate deploy-phase? Or did it slip in and needs rollback? Until resolved, all new roles/agents inherit from the STALE deployed law.

**Stale plans (98 >14d, 97 unreferenced).** No action needed yet; use for cleanup batch if capacity allows (Morgan's discretion).

---

*End of report. No recommendations. Morgan routes next steps.*
