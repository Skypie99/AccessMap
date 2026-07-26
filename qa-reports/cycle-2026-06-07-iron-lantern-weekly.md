---
date: 2026-06-07
role: iron-lantern-weekly-triage
mode: BACKGROUND
model_tier: haiku
---

# Iron Lantern Weekly Triage — 2026-06-07

## §1 Inventory
- qa-reports total: 454
- qa-reports today: 4
- INDEX regenerated: yes (line count: 69)
- master-vs-deployed drift: framework scripts not deployed
- governance leaks: framework scripts not deployed

## §2 Worktree staleness candidates (>14 days inactive)
None detected. No active worktree directories found in `~/.claude/projects/-Users-skypie-AccessMap/`.

## §3 Plan staleness candidates (>14 days unreferenced)
- `/Users/skypie/.claude/plans/sequential-sleeping-lake.md` (2026-05-22)
- `/Users/skypie/.claude/plans/prompt-library-delegation.md` (2026-05-22)
- `/Users/skypie/.claude/plans/you-are-a-senior-lucky-frog.md` (2026-05-23)
- `/Users/skypie/.claude/plans/you-are-a-game-warm-liskov.md` (2026-05-21)
- `/Users/skypie/.claude/plans/you-are-a-meticulous-playful-giraffe.md` (2026-05-22)
- `/Users/skypie/.claude/plans/continuous-build-run-optimized-meteor.md` (2026-05-23)
- `/Users/skypie/.claude/plans/task-you-are-a-rosy-scone.md` (2026-05-23)

All 7 plans >14 days old are unreferenced in AccessMap qa-reports.

## §4 Drift summary
Framework scripts not yet deployed to `~/ClaudeCorp/scripts/`. The maintenance automation harness is defined but not yet installed.

## §5 Governance leak summary
Framework scripts not yet deployed. Governance leak detection unavailable.

---

**Note:** INDEX exists and is maintained (69 lines). All 454 qa-reports accessible. Framework automation scripts (`regen-qa-index.sh`, `diff-master-deployed.sh`, `detect-governance-leaks.sh`) are referenced in the maintenance framework documentation but not yet available in the ClaudeCorp scripts directory. This is a deployment dependency, not an operational leak.
