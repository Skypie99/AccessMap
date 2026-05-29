# FEATURES.md Audit — 2026-05-25

**Role:** Quinn (product owner)
**Main SHA at time of audit:** `74e73d9` (752 tests)

## What changed

Cross-referenced every entry in FEATURES.md against `git log --oneline main` and `git branch --no-merged main`. The following corrections were made:

**Moved to Shipped (were listed as Parked or Now but are on main):**
- R7 (Tasks sort options, `e4e7cb6`), R8 (Map long-press drop, `0bc2b81`), and R9 (Profile nearest-flag jump, `1f31d06`) were listed as "Parked (2026-05-23)" but all three commits are confirmed ancestors of `main` — moved to a new "Shipped 2026-05-23 (R7–R9 cycle)" section.
- `feat/flag-pagination-2026-05-25` was listed as Parked but its merge commit (`d1e2123`) is on main — moved to Shipped Wave 4.
- The three "Now" items (remaining `#999` callsites, CI/CD GitHub Actions, LEARNINGS.md sequential merge rule) are all on main (`e243498`, `b1450f9`, `9a3dca9`) — removed from Now, added to Shipped Wave 4.
- Cycle F items F1, F2, and F4 (placeholderTextColor sweep, sevDot decorativeProps, surfaceSoft contrast test) are on main via `ef2b717` and `e85cf82` — removed from "Cycle F remaining" section (section itself deleted), added to Shipped Wave 4.
- New Wave 4 late-breaking ships added: TasksScreen `renderItem` memoization and flag status timeline UI (`582b1c4`).

**Kept as Parked (genuinely unmerged):**
- `a11y/full-sweep-2026-05-25` — branch exists and is not merged.
- `feat/decorative-glyph-2026-05-24` (`ff44775`) — commit is not an ancestor of main.
- `a11y/placeholder-sweep-cycle-f` (`9a6a16a`) was removed from the Parked list because its content (F1/F2) is now confirmed on main via a different commit path; the branch itself still exists but is superseded.

**Later section:** was empty ("nothing queued"). Added three 1-sentence next-feature suggestions: offline map tile caching, flag photo review flow in triage, and a neighbourhood heat-map density layer.

**Removed sections:** "Now (next 1–2 runs)" (all items shipped), "Cycle F — remaining items" (all items shipped or superseded).

Two stray unmerged branches (`a11y/auto-2026-05-23`, `worktree-agent-*`) were noted but not added to the Parked list — `a11y/auto-2026-05-23` is a 2026-05-23 stale branch whose relevant work landed via other paths; the worktree branch is an artefact with no product content.
