---
date: 2026-06-14
role: iron-lantern-weekly-triage
mode: BACKGROUND
model_tier: haiku
---

# Iron Lantern Weekly Triage — 2026-06-14

## §1 Inventory

- qa-reports total: 457
- qa-reports today: 0
- INDEX regenerated: no — referenced scripts not found
- master-vs-deployed drift: unable to detect (script missing)
- governance leaks: unable to detect (script missing)

## §2 Worktree staleness candidates (>14 days inactive)

None found. No stale worktrees in `~/.claude/projects/-Users-skypie-AccessMap/`.

## §3 Plan staleness candidates (>14 days unreferenced)

83 plans dated before 2026-05-31 (>14 days old).
0 of 83 referenced in recent qa-reports (sampled last 30 reports, 2026-06-10 to latest).

Sample of unreferenced stale plans:
- `you-are-a-game-warm-liskov.md` (2026-05-21)
- `prompt-library-delegation.md` (2026-05-22)
- `sequential-sleeping-lake.md` (2026-05-22)
- `you-are-a-meticulous-playful-giraffe.md` (2026-05-22)
- `continuous-build-run-optimized-meteor.md` (2026-05-23)
- ... (78 more, all dated 2026-05-21 through 2026-05-31)

All 83 are eligible for archival if confirmed unused.

## §4 STATUS

- Latest qa-report: `2026-06-09_AccessMap_ReSweep_Fixes.md` (2026-06-10, 4 days old)
- Recommended next action: Morgan to review stale plan list for archival. Reference scripts in MAINTENANCE_FRAMEWORK.md § 1 (`regen-qa-index.sh`, `diff-master-deployed.sh`, `detect-governance-leaks.sh`) do not exist in `~/ClaudeCorp/scripts/` — framework documentation may be out of sync with deployed scripts or sentinel files.

---

**Report end. No recommendations. Morgan decides next step.**
