---
date: 2026-07-19
role: iron-lantern-weekly-triage
mode: BACKGROUND
model_tier: haiku
status: audit-only
---

# Iron Lantern Weekly Triage — 2026-07-19

## §1 Inventory

- **qa-reports total:** 496 files
- **qa-reports today (2026-07-19):** 0 files
- **INDEX regeneration:** attempted (regen-qa-index.sh does not exist — infrastructure drift)
- **master-vs-deployed drift check:** diff-master-deployed.sh not found
- **governance-leak check:** detect-governance-leaks.sh not found

## §2 Infrastructure notes

Three maintenance scripts referenced in the task definition do not exist in `~/ClaudeCorp/scripts/`:
- `regen-qa-index.sh` (missing)
- `diff-master-deployed.sh` (missing)
- `detect-governance-leaks.sh` (missing)

Available scripts in `~/ClaudeCorp/scripts/` include: `audit-scheduled-tasks.sh`, `detect-stable-cycle.sh`, `morning-brief.sh`, `new-morgan-briefing.sh`, `regen-cross-project-qa-index.sh`, `regen-rag-index.sh`, and others. This represents a drift between task definition and deployed infrastructure.

## §3 Worktree staleness candidates (>14 days inactive)

No stale worktrees found in `~/.claude/projects/-Users-skypie-AccessMap/` with mtime >14 days ago.

## §4 Plan staleness candidates (>14 days old, unreferenced in qa-reports)

Stale plans detected — >14 days old and not referenced in AccessMap qa-reports:

- `/Users/skypie/.claude/plans/accessmap-app-wide-visual-buzzing-flurry.md` (2026-07-01)
- `/Users/skypie/.claude/plans/accessmap-bench-1-opus-4-8-woolly-graham.md` (2026-07-06)
- `/Users/skypie/.claude/plans/accessmap-bench-2-opus-4-8-snug-wilkinson.md` (2026-07-06)
- `/Users/skypie/.claude/plans/accessmap-bench-3-opus-4-8-wondrous-journal.md` (2026-07-07)
- `/Users/skypie/.claude/plans/accessmap-bench-4-opus-4-8-composed-peacock.md` (2026-07-07)
- `/Users/skypie/.claude/plans/accessmap-glass-rollout-fuzzy-zebra-agent-a056ac68acf368268.md` (2026-07-03)
- `/Users/skypie/.claude/plans/accessmap-glass-rollout-fuzzy-zebra.md` (2026-07-03)
- `/Users/skypie/.claude/plans/accessmap-glass-rollout-sparkling-bear-agent-af8c641e3d2cbff31.md` (2026-07-03)
- `/Users/skypie/.claude/plans/accessmap-glass-rollout-sparkling-bear.md` (2026-07-03)
- `/Users/skypie/.claude/plans/accessmap-glass-rollout-structured-raven.md` (2026-07-04)
- `/Users/skypie/.claude/plans/accessmap-tasks-liquid-glass-snoopy-liskov.md` (2026-07-03)
- `/Users/skypie/.claude/plans/accessmap-tasks-liquid-glass-vivid-grove.md` (2026-07-02)
- `/Users/skypie/.claude/plans/accessmap-uplift-p0-deep-lake.md` (2026-07-04)
- `/Users/skypie/.claude/plans/accessmap-uplift-p1-sparkling-penguin.md` (2026-07-05)
- `/Users/skypie/.claude/plans/accessmap-uplift-p2-temporal-dragonfly-agent-ae6278392bffe65c6.md` (2026-07-05)
- `/Users/skypie/.claude/plans/accessmap-uplift-p2-temporal-dragonfly.md` (2026-07-05)
- `/Users/skypie/.claude/plans/accessmap-uplift-p3-keen-river-agent-a6bae78f9de60c5a6.md` (2026-07-06)
- `/Users/skypie/.claude/plans/accessmap-uplift-p3-keen-river.md` (2026-07-06)
- `/Users/skypie/.claude/plans/accessmap-uplift-p4-magical-pine-agent-a6e7ac9e423b16d02.md` (2026-07-06)
- `/Users/skypie/.claude/plans/accessmap-uplift-p4-magical-pine.md` (2026-07-06)

(18 additional AccessMap plans listed above; plus dashboard/portfolio/fable-audit plan candidates — full list available on request)

## §5 Summary

**Critical:** Maintenance framework scripts missing. Task cannot fully execute without infrastructure alignment.

**Data:** 496 qa-reports on disk; 0 created today. No worktree staleness. 20+ AccessMap plans unreferenced, spanning visual-bug, glass-rollout, tasks-liquid-glass, and uplift phases (2026-07-01 through 2026-07-06).

---

*Report generated in BACKGROUND mode, AUDIT-ONLY. No external messages sent. No mutations applied.*
