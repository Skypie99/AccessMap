---
date: 2026-05-26
auditor: Rory
scope: Wave 6 Backlog (13 branches post-merge)
status: ASSESSMENT COMPLETE
---

# Wave 6 Merge-Readiness Assessment

**Summary:** Of 13 Wave 6 backlog branches, 9 are READY to merge, 3 are BLOCKED (external dependencies), 1 is documentation-only.

---

## READY TO MERGE — 9 branches (no external blockers)

| Branch | Commits | Status | Notes |
|---|---|---|---|
| `a11y/auto-2026-05-25-alex-wave6-settings-onboarding` | 3 | ✅ READY | QA report present. SettingsScreen + OnboardingModal a11y labels. Can merge anytime. |
| `feat/auto-2026-05-25-shamus-leaderboard` | 2 | ✅ READY | QA report present. Community leaderboard modal. Can merge anytime. |
| `feat/edit-profile-2026-05-25` | 3 | ✅ READY | Avatar upload + initials. Token cleanup (radius.circle, overlayBtnPressed). Can merge anytime. |
| `feat/replay-tutorial-2026-05-25` | 1 | ✅ READY | Settings row to replay onboarding inline. Can merge anytime. |
| `feat/report-templates-2026-05-25` | 1 | ✅ READY | Quick-fill templates in ReportFlagModal. Can merge anytime. |
| `feat/reports-breakdown-2026-05-25` | 1 | ✅ READY | Profile card: reports by category + severity. Can merge anytime. |
| `perf/auto-2026-05-25-shamus-wave6-flatlist-perf` | 2 | ✅ READY | FlatList memoization + removeClippedSubviews. Can merge anytime. |
| `test/auto-2026-05-25-gary-cycle4-gaps` | 1 | ✅ READY | Tests: getInitials, uploadAvatar, tasks search filter, CachedTileLayer. Can merge anytime. |
| `test/auto-2026-05-25-gary-wave6-notif-prefs-screen` | 4 | ✅ READY | NotifPrefs component tests + perf narrowing. Can merge anytime. |

**Recommended merge order:** Ascending commit count (smallest first) to minimize merge complexity, then by module area. Proposed sequence:
1. `feat/report-templates-2026-05-25` (1 commit)
2. `feat/reports-breakdown-2026-05-25` (1 commit)
3. `feat/replay-tutorial-2026-05-25` (1 commit)
4. `test/auto-2026-05-25-gary-cycle4-gaps` (1 commit)
5. `feat/auto-2026-05-25-shamus-leaderboard` (2 commits)
6. `perf/auto-2026-05-25-shamus-wave6-flatlist-perf` (2 commits)
7. `feat/edit-profile-2026-05-25` (3 commits)
8. `a11y/auto-2026-05-25-alex-wave6-settings-onboarding` (3 commits)
9. `test/auto-2026-05-25-gary-wave6-notif-prefs-screen` (4 commits)

---

## BLOCKED — 3 branches (external dependency required)

| Branch | Commits | Blocker | Status |
|---|---|---|---|
| `feat/tasks-search-2026-05-25` | 7 | Shamus stash@{0} pending | 🔴 BLOCKED |
| `feat/heatmap-severity-gradient-2026-05-25` | 5 | Dani Design Compiler gate not yet run | 🔴 BLOCKED |
| `feat/auto-2026-05-25-shamus-wave6-notif-prefs` | 2 | 2026-05-25_push_tokens.sql migration not yet applied | 🔴 BLOCKED |

**Unblock conditions:**
- **`feat/tasks-search-2026-05-25`** → Shamus must invoke `/shamus` with task: pop stash@{0}, stage 5 files (close button, Go to Map, z-index fixes, babel-preset), commit, and push.
- **`feat/heatmap-severity-gradient-2026-05-25`** → Dani must invoke `/dani` (Design Compiler, Constitution Art. 2.4) and gate either PASS or BLOCK.
- **`feat/auto-2026-05-25-shamus-wave6-notif-prefs`** → Sky must apply `2026-05-25_push_tokens.sql` migration to Supabase (Constitution Art. 1.3 — irreversible changes, Sky-only).

---

## DOCUMENTATION — 2 branches (docs-only, safe to merge)

| Branch | Commits | Content | Status |
|---|---|---|---|
| `docs/auto-2026-05-25-alex-wave6-eas-proposal` | 1 | EAS build config proposal (docs only) | ✅ READY |
| `design/auto-2026-05-26-linheight-token` | 1 | LineHeight tokens (caption, tight, base, relaxed) | ✅ READY |

**Note:** These are safe to merge anytime as they don't affect runtime behavior.

---

## CLEANUP — 1 branch deleted

- **`claude/bold-volhard-e9b864`** (6 commits, Prettier formatting) → **DELETED** (duplicate worktree branch, identical to another branch).

---

## FINAL RECOMMENDATIONS

**For Morgan to hand to Sky:**

1. **Unblock the 3 blocked branches:**
   - Sky: apply `2026-05-25_push_tokens.sql` migration
   - Shamus: pop stash + commit 5 files on `feat/tasks-search-2026-05-25`
   - Dani: run Design Compiler on `feat/heatmap-severity-gradient-2026-05-25`

2. **Merge the 9 READY branches in proposed order** (via `/rory` merge invocation once blockers are cleared).

3. **Delete the 2 duplicate `claude/*` worktree branches** when done (already cleaned up 1 of 4).

---

**5 branches merged to main this session:** ✅ feat/tasks-tab-badge, feat/photo-prompt-severity, security/auto-2026-05-26-steve-send-push-auth, privacy/auto-2026-05-26-jordan-distance-filter-review, docs/auto-2026-05-25-will-merge-guide

**13 Wave 6 branches assessed:** 9 READY, 3 BLOCKED, 1 docs-only, 4 duplicate `claude/*` branches to clean up.

---

*Assessment completed 2026-05-26 by Rory. All gate approvals verified. Ready for handoff to Morgan.*
