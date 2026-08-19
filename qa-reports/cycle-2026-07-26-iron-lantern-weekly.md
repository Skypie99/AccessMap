---
date: 2026-07-26
role: iron-lantern-weekly-triage
mode: BACKGROUND
model_tier: haiku
---

# Iron Lantern Weekly Triage — 2026-07-26

## §1 Inventory

- qa-reports total: 517 files
- qa-reports today (2026-07-26): 3 files
- qa-reports .md index: 501 files
- INDEX regenerate: UNAVAILABLE (~/ClaudeCorp/scripts/regen-qa-index.sh not found)
- master-vs-deployed drift: UNAVAILABLE (~/ClaudeCorp/scripts/diff-master-deployed.sh not found)
- governance leaks: UNAVAILABLE (~/ClaudeCorp/scripts/detect-governance-leaks.sh not found)

## §2 Worktree staleness candidates (>14 days inactive)

12 session worktrees >14 days old (last mtime dates):

```
2026-06-14  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/8afcb65f-2f0c-4a86-b160-b67e91da33de
2026-07-02  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/2153fdc5-61c4-4f8c-8c6f-94c905e16ca5
2026-07-02  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/8ffe48bc-1397-42a0-bfc1-a7ba120435db
2026-07-02  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/efe8a611-3963-4a9a-a628-ba804ac30728
2026-07-03  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/34bad6ba-27b0-47c0-9c98-fa2629f9cbf1
2026-07-03  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/f49c1677-8a43-4258-8d67-f50203058669
2026-07-04  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/47db7328-c2d5-4e91-9f28-653a61cf2fcc
2026-07-04  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/f50e4225-912c-4ec5-be3c-0af83e0e5757
2026-07-04  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/fcffb9df-e6cd-4a98-9b52-73353e417c20
2026-07-05  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/49c15c22-487d-4a64-b3ef-fd7c8d072cc1
2026-07-06  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/3dc186c4-714f-4063-9118-e120a1452573
2026-07-06  /Users/skypie/.claude/projects/-Users-skypie-AccessMap/e927e8a2-0406-4703-a4b2-9ad1c73741e6
```

## §3 Plan staleness candidates (>14 days unreferenced)

63 plan files >14 days old. Sample (first 15):

```
2026-06-28  /Users/skypie/.claude/plans/accessmap-flagcard-redesign-nifty-simon.md
2026-06-28  /Users/skypie/.claude/plans/accessmap-flagcard-redesign-pure-candle.md
2026-06-28  /Users/skypie/.claude/plans/accessmap-flagcard-redesign-resilient-sketch.md
2026-07-01  /Users/skypie/.claude/plans/accessmap-app-wide-visual-buzzing-flurry.md
2026-07-01  /Users/skypie/.claude/plans/accessmap-visual-bug-tidy-sparkle-agent-afcb91a06569e1006.md
2026-07-01  /Users/skypie/.claude/plans/accessmap-visual-bug-tidy-sparkle.md
2026-07-02  /Users/skypie/.claude/plans/accessmap-tasks-liquid-glass-vivid-grove.md
2026-07-02  /Users/skypie/.claude/plans/accessmap-visual-bug-binary-rain-agent-a2a6ef05e0f823ff3.md
2026-07-02  /Users/skypie/.claude/plans/accessmap-visual-bug-binary-rain.md
2026-07-02  /Users/skypie/.claude/plans/accessmap-visual-bug-fluttering-quiche-agent-a18500c1c6885bbb5.md
2026-07-02  /Users/skypie/.claude/plans/accessmap-visual-bug-fluttering-quiche-agent-aa1916d0d6690385b.md
2026-07-02  /Users/skypie/.claude/plans/accessmap-visual-bug-fluttering-quiche.md
2026-07-02  /Users/skypie/.claude/plans/fable-audit-part-expressive-rainbow.md
2026-07-02  /Users/skypie/.claude/plans/fable-audit-part-smooth-reddy-agent-a39e0ae873a4851e6.md
2026-07-03  /Users/skypie/.claude/plans/accessmap-glass-rollout-fuzzy-zebra-agent-a056ac68acf368268.md
```

Full list available in `~/.claude/plans/` directory. Referential scan against `qa-reports/*.md` not performed (frameworks unavailable).

## §4 Framework status

Required maintenance scripts unavailable at `~/ClaudeCorp/scripts/`:

- `regen-qa-index.sh` ✗
- `diff-master-deployed.sh` ✗
- `detect-governance-leaks.sh` ✗

Task cannot complete framework validation steps. Escalate to Sky for setup verification.

## §5 Data integrity

No concerning patterns in qa-reports directory. File counts and timestamps consistent. Sessions remain active through 2026-07-26.
