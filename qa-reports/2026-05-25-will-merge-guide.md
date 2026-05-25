# AccessMap — Complete Merge Guide 2026-05-25

**Author:** Will (Documentation Specialist)
**Date:** 2026-05-25
**Main SHA at time of writing:** `da54dd4` — 789 tests passing, 0 TSC errors

---

## Quick Reference

| Status | Branch count |
|---|---|
| Merge (CoWork session) | 7 |
| Merge (post-CoWork) | 2 |
| Delete — stale / superseded | 8 |

---

## Situation Overview

All 17 open branches were audited. The current `main` tip is `da54dd4` (CachedTileLayer wired into PlatformMap.web.tsx). Seven "CoWork" feature branches all diverge from commit `1659092` — three commits behind current main — because they were built during the morning continuation session before the leaflet interception and design-token work landed. They carry **older versions of modal/screen files** (negative diffs vs main) alongside their real new features. This means each merge in the CoWork session will generate conflicts on those shared files. Resolution strategy is always: **keep main's version of the shared files, apply only the branch's net-new file additions.**

---

## Part 1 — CoWork Session Branches

*Merge these during the CoWork session, in the order listed. Each will conflict on shared modal/screen files — always keep main's version of those.*

### Merge Order

#### Step 1: `feat/edit-profile-2026-05-25`
**What:** Avatar photo upload + initials fallback in ProfileScreen heroCard; `uploadAvatar()` + `getInitials()` in `users.ts`; `eas.json` (new file — EAS Build config); two new Supabase migrations.

**Net-new files (keep these from the branch):**
- `src/lib/users.ts` — adds `uploadAvatar()`, `getInitials()`, `UserProfile` type, `avatar_url` field
- `src/screens/ProfileScreen.tsx` — hero card with avatar photo + initials fallback
- `eas.json` — EAS Build configuration (does NOT exist in main; merge as-is)
- `supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql` — PROPOSE-ONLY; merge the file, Sky applies manually
- `supabase/migrations/2026-05-25_flag_edit_history_table.sql` — CONDITIONAL (pending Sky's D6 decision); merge the file, Sky applies if/when approved

**Also contains:**
- Several qa-reports from background runs — these are safe to merge (additive docs)
- `CHANGELOG.md`, `SYSTEM_CONSTITUTION.md`, `eas.json` — net-new, no conflicts
- Older versions of `StatusHistoryModal.tsx`, `PlatformMap.web.tsx` — **keep main's versions**

**Migration gate:** `2026-05-25_flag_edit_rls_replacement.sql` must be applied in Supabase SQL Editor BEFORE the `shamus/marker-clustering-2026-05-25` branch (not yet listed here — that's a separate pending branch). Apply the file, do not block this merge on it.

---

#### Step 2: `feat/context-tags-display-2026-05-25`
**What:** Display context tags in FlagDetailModal.

**Net-new files:**
- `src/components/FlagDetailModal.tsx` — adds context tags rendering section
- `src/types/database.ts` — adds `context_tags?: string[]` field to FlagRow Insert/Update types

**Conflict note:** `FlagDetailModal.tsx` is touched by bulk-watch (Step 3) as well. Resolve by taking context-tags additions here, then applying bulk-watch additions on top in Step 3.

---

#### Step 3: `feat/bulk-watch-2026-05-25`
**What:** Bulk Watch action in the TasksScreen selection bar.

**Net-new files:**
- `src/lib/watchedFlags.ts` — watched flags AsyncStorage module (already exists in main with some content; this branch extends it with bulk-watch capability — take the branch version)
- `src/screens/TasksScreen.tsx` — selection bar + bulk Watch action
- `src/components/FlagDetailModal.tsx` — additional changes on top of context-tags

**Dependency:** Merge AFTER Step 2 (context-tags). Resolve `FlagDetailModal.tsx` by combining both sets of additions.

---

#### Step 4: `feat/distance-filter-2026-05-25`
**What:** Distance radius filter (maxDistanceKm) added to map filter panel.

**Net-new files:**
- `src/lib/mapFilters.ts` — adds `maxDistanceKm: number | null` field + allowed values enum + filter logic
- `src/lib/__tests__/mapFilters.test.ts` — adds `maxDistanceKm` round-trip test cases

**Conflict note:** `mapFilters.ts` is a shared file that likely has been modified by previous steps' shared-file carries. Take main's current version of `mapFilters.ts` as the base, then apply the `maxDistanceKm` additions from this branch on top.

---

#### Step 5: `feat/recently-viewed-2026-05-25`
**What:** "Recently Viewed" flags row in ProfileScreen.

**Net-new files:**
- `src/components/RecentlyViewedRow.tsx` — new component (no conflict)
- `src/lib/recentlyViewed.ts` — new module (no conflict)
- `src/screens/ProfileScreen.tsx` — adds RecentlyViewedRow section

**Conflict:** `ProfileScreen.tsx` was modified in Step 1 (edit-profile). Resolve by starting from main+Step1 version and adding the RecentlyViewedRow section from this branch.

---

#### Step 6: `feat/reports-breakdown-2026-05-25`
**What:** Reports breakdown card (by category + severity) in ProfileScreen.

**Net-new files:**
- `src/components/ReportsBreakdownCard.tsx` — new component (no conflict)
- `src/lib/userReportStats.ts` — new module (no conflict)
- `src/screens/ProfileScreen.tsx` — adds ReportsBreakdownCard section

**Conflict:** `ProfileScreen.tsx` modified in Steps 1 and 5. Resolve by starting from current merged version and adding the ReportsBreakdownCard section from this branch.

---

#### Step 7: `feat/replay-tutorial-2026-05-25`
**What:** "Replay tutorial" row in SettingsScreen that opens OnboardingModal inline.

**Net-new files:**
- `src/screens/SettingsScreen.tsx` — adds Replay tutorial row (this file is unique to this branch; no conflict with prior steps)

**Note:** Cleanest merge of the group — no overlap with previous CoWork steps except shared modal carries.

---

#### Step 8: `feat/tasks-search-2026-05-25`
**What:** Text search input in TasksScreen triage list (filters by category label + description, local-only).

**Net-new files:**
- `src/screens/TasksScreen.tsx` — adds `SearchInputRow`, `searchQuery` state, local filter logic

**Also contains:**
- `qa-reports/feature-2026-05-25-morning.md` — safe to merge
- `qa-reports/feature-2026-05-25.md` — safe to merge (not in main)
- Test fix for 6 suites (supabase mock) — safe to merge

**Conflict:** `TasksScreen.tsx` was modified in Step 3 (bulk-watch). Resolve by taking the current merged main version and applying the search additions from this branch on top.

**Note on CoWork Phase 3C Leaflet agent:** The CoWork spec may include a Leaflet tile interception agent. **Skip it** — `feat/leaflet-tile-interception-2026-05-25` is already superseded; the work landed on main as commit `da54dd4`. Running the agent again would duplicate work that is already live.

---

## Part 2 — Post-CoWork Branches

*Merge these AFTER the CoWork session completes and all CoWork branches are in main.*

#### Step 9: `security/auto-2026-05-25-steve-edge-function-auth`
**What:** JWT auth + input validation hardening on the `notify-flag-status` Edge Function. Adds shared-secret auth check and validates all input fields before processing.

**Net-new files:**
- `supabase/functions/notify-flag-status/index.ts` — security hardening (no code conflicts; isolated Edge Function)
- `qa-reports/2026-05-25-quinn-shamus-cycle5.md` — safe to merge

**No dependencies.** Can technically merge at any time — isolated to the Edge Function. Listed post-CoWork to avoid complicating the CoWork session, but it is safe to merge whenever convenient.

---

#### Step 10: `test/auto-2026-05-25-gary-cycle4-gaps` (LAST)
**What:** Fills 4 HIGH-priority test coverage gaps from Cycle 4 features: `getInitials()` (9 cases), `uploadAvatar()` (5 cases), tasks search filter logic, `CachedTileLayer`.

**Net-new files:**
- `src/lib/__tests__/users.test.ts` — tests for `getInitials` + `uploadAvatar`
- `src/lib/__tests__/tasksDisplayFilter.test.ts` — tasks search filter tests
- `src/components/__tests__/CachedTileLayer.test.ts` — tile layer tests
- `qa-reports/2026-05-25-gary-cycle4-tests.md` — safe to merge

**Critical dependency:** Contains security branch commits (`1308a81`, `ec438c9`, `86d379d`). **Merge AFTER Step 9** so the security commits are already in main and git handles them as a fast-forward rather than duplicates.

**Also depends on:** `users.ts` having `uploadAvatar()` from Step 1 (edit-profile). Merge after all CoWork steps complete.

---

## Part 3 — Branches to Delete

*These branches are stale and would regress main if merged. All real work from these branches has already landed on main.*

| Branch | Reason | Safe to delete? |
|---|---|---|
| `feat/leaflet-tile-interception-2026-05-25` | Work already on main as `da54dd4`; PlatformMap.web.tsx diff vs main is empty; other files in branch are older versions | YES |
| `feat/offline-tiles-2026-05-25` | tileCache.ts already on main as `9597c31`; branch would DELETE tileCache.ts and tileCache.test.ts if merged | YES |
| `chore/design-token-residuals-2026-05-25` | Would remove CachedTileLayer from PlatformMap.web.tsx (older pre-interception version); predates current main | YES |
| `fix/dani-statushistory-darkmode-2026-05-25` | StatusHistoryModal dark mode fix already on main as `ffd60a0`; zero diff on that file vs main; other files are older | YES |
| `test/auto-2026-05-25` | Would DELETE tileCache.ts, tileCache.test.ts, and myFlagsFilter.test.ts which are in main; predates Wave 7b | YES |
| `docs/feature-report-2026-05-25` | Carries older versions of all modal files; only unique content is qa-reports/feature-2026-05-25.md (can cherry-pick if desired) | YES (cherry-pick qa-report if needed) |
| `a11y/audit-2026-05-25` | Check before deleting — not audited in detail (no commits ahead of main found); likely housekeeping branch | VERIFY FIRST |
| `a11y/cherry-pick-2026-05-25` | Check before deleting — same as above | VERIFY FIRST |
| `a11y/pending-fixes-2026-05-25` | Check before deleting — same as above | VERIFY FIRST |

**Note on backup branches:** `backup/pre-merge-*` branches are safety checkpoints from previous merge sessions. They are read-only historical snapshots — delete after the CoWork session completes successfully.

---

## Conflict Map

| File | Branches in conflict | Resolution |
|---|---|---|
| `src/screens/ProfileScreen.tsx` | edit-profile, recently-viewed, reports-breakdown | Merge sequentially (Steps 1→5→6); each adds a distinct section; no line-level overlap expected |
| `src/screens/TasksScreen.tsx` | bulk-watch, tasks-search | Merge bulk-watch first (Step 3), then tasks-search (Step 8); keep current main + add each branch's block |
| `src/components/FlagDetailModal.tsx` | context-tags, bulk-watch | Merge context-tags first (Step 2), bulk-watch second (Step 3); keep both sets of additions |
| All shared modal files (`AchievementsModal`, `ActivityFeedModal`, `ErrorBoundary`, `FlashBanner`, `MyFeedbackModal`, `MyReportsModal`, `MyWatchedModal`, `NotificationPrefsModal`, `PhotoLightboxModal`, `MapScreen`, `NearbyFlagsModal`, `ReportFlagModal`, `StatusHistoryModal`, `PlatformMap.web.tsx`, `theme.ts`, `ThemeContext.tsx`) | All 7 CoWork branches | All branches carry OLDER versions of these files. **Always keep main's version** of these files during every CoWork merge. The branches' net-new value is only in the unique new files listed per step above. |

---

## Sky's Merge Commands (Copy-Paste Ready)

```bash
# ============================================================
# PRE-FLIGHT: confirm you are on main and it's clean
# ============================================================
git -C ~/AccessMap status
git -C ~/AccessMap log --oneline -5

# ============================================================
# COWORK SESSION — Steps 1–8
# ============================================================

# Step 1: Edit Profile (avatar + users.ts + eas.json + migrations)
git -C ~/AccessMap merge feat/edit-profile-2026-05-25 --no-ff -m "merge: feat/edit-profile — avatar upload, getInitials, eas.json, edit-history migrations"

# Step 2: Context Tags Display
git -C ~/AccessMap merge feat/context-tags-display-2026-05-25 --no-ff -m "merge: feat/context-tags-display — show context tags in FlagDetailModal"

# Step 3: Bulk Watch
git -C ~/AccessMap merge feat/bulk-watch-2026-05-25 --no-ff -m "merge: feat/bulk-watch — bulk Watch action in TasksScreen selection bar"

# Step 4: Distance Filter
git -C ~/AccessMap merge feat/distance-filter-2026-05-25 --no-ff -m "merge: feat/distance-filter — maxDistanceKm radius filter in map filter panel"

# Step 5: Recently Viewed
git -C ~/AccessMap merge feat/recently-viewed-2026-05-25 --no-ff -m "merge: feat/recently-viewed — Recently Viewed flags row in ProfileScreen"

# Step 6: Reports Breakdown
git -C ~/AccessMap merge feat/reports-breakdown-2026-05-25 --no-ff -m "merge: feat/reports-breakdown — reports breakdown card by category + severity"

# Step 7: Replay Tutorial
git -C ~/AccessMap merge feat/replay-tutorial-2026-05-25 --no-ff -m "merge: feat/replay-tutorial — Replay Tutorial row in SettingsScreen"

# Step 8: Tasks Search
git -C ~/AccessMap merge feat/tasks-search-2026-05-25 --no-ff -m "merge: feat/tasks-search — text search in TasksScreen triage list"

# ============================================================
# POST-COWORK — Steps 9–10 (run after CoWork completes)
# ============================================================

# Step 9: Security (can merge any time — no feature dependencies)
git -C ~/AccessMap merge security/auto-2026-05-25-steve-edge-function-auth --no-ff -m "merge: security/edge-function-auth — JWT auth + input validation on notify-flag-status"

# Step 10: Gary test coverage (LAST — depends on Steps 1–9)
git -C ~/AccessMap merge test/auto-2026-05-25-gary-cycle4-gaps --no-ff -m "merge: test/gary-cycle4-gaps — getInitials, uploadAvatar, tasks search, CachedTileLayer tests"

# ============================================================
# CLEANUP — delete superseded branches after merges verify
# ============================================================
git -C ~/AccessMap branch -d feat/leaflet-tile-interception-2026-05-25
git -C ~/AccessMap branch -d feat/offline-tiles-2026-05-25
git -C ~/AccessMap branch -d chore/design-token-residuals-2026-05-25
git -C ~/AccessMap branch -d fix/dani-statushistory-darkmode-2026-05-25
git -C ~/AccessMap branch -d test/auto-2026-05-25
git -C ~/AccessMap branch -d docs/feature-report-2026-05-25
# Verify these three before deleting (check for any unique commits):
# git -C ~/AccessMap branch -d a11y/audit-2026-05-25
# git -C ~/AccessMap branch -d a11y/cherry-pick-2026-05-25
# git -C ~/AccessMap branch -d a11y/pending-fixes-2026-05-25
```

---

## Notes

### CoWork Phase 3C Leaflet Agent — SKIP
The CoWork session spec includes a "Phase 3C Leaflet tile interception" agent. **Skip it entirely.** The branch `feat/leaflet-tile-interception-2026-05-25` is already superseded — the CachedTileLayer work landed on main at `da54dd4`. Running that agent again would duplicate work and create unnecessary conflict.

### Migration timing
Two migrations arrive via `feat/edit-profile-2026-05-25`:
- `2026-05-25_flag_edit_rls_replacement.sql` — BLOCKING for `shamus/marker-clustering-2026-05-25` (a separate branch not in this guide). Apply in Supabase SQL Editor after merging Step 1.
- `2026-05-25_flag_edit_history_table.sql` — CONDITIONAL. Apply only after Sky answers YES to open Decision D6.

### Conflict resolution pattern for shared modal files
Every CoWork branch (Steps 1–8) carries older versions of the same ~15 modal/screen files. During each `git merge`, when git reports a conflict on those files, accept main's version (`git checkout --ours <file>` during a conflict, or use the "current change" option in your merge tool). The branch's real value is entirely in the NEW files listed per step — not in those shared files.

### test/auto-2026-05-25-gary-cycle4-gaps includes security commits
Gary's test branch was built on top of the security branch (`security/auto-2026-05-25-steve-edge-function-auth`). When Step 9 is merged before Step 10, git will correctly identify those commits as already present and apply only the new test files on top. Do NOT merge Step 10 before Step 9.

### Backup branches
`backup/pre-merge-*` branches are historical safety checkpoints. After the CoWork session completes and tests pass, they can all be safely deleted.

---

*Report written by Will, 2026-05-25. Read-only audit — no branches were merged or modified.*
