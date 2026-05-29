# Branch Merge-Readiness Audit
**Date:** 2026-05-29  
**Role:** Gary (QA Engineer)  
**Model tier:** Sonnet  
**Repo:** /Users/skypie/AccessMap  
**main tip:** `0bdc5c1` (2026-05-29 09:31 — Rory merge wave 2 report, 1160/1160 tests)

---

## Summary Table

| Branch | Classification | Sec/Privacy? | Tests | Note |
|--------|---------------|-------------|-------|------|
| `chore/remove-stray-root-docs-2026-05-29` | **SAFE-TO-MERGE** | No | N/A — docs only | Deletes `CHANGELOG.md` + `SYSTEM_CONSTITUTION.md` from repo root (stale files). No code. |
| `ci/lighthouse-2026-05-30` | **BLOCKED** | No | N/A | Adds HeatmapLayer.tsx + MapScreen.tsx + `.lighthouserc.js`; HeatmapLayer and MapScreen already exist on main with diverged content — 6 text-level conflicts detected. |
| `claude/exciting-satoshi-25772e` | **NEEDS-REVIEW** | No | 1126/1126 green (on identical tip) | Same tip commit as `feat/shared-status-badge-2026-05-30`. Auto-generated branch name; content is StatusBadge component + callsite refactors + docs commits. Duplicate of feat/shared-status-badge — confirm intent before merging both. |
| `docs/beta-testing-guide-2026-05-30` | **BLOCKED** | YES — location + photo plist keys, unapplied SQL migration | N/A | Contains `app.json` iOS plist additions (location/camera/photo permissions) + `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` not yet applied. SQL unapplied; app.json privacy strings need Jordan sign-off. |
| `docs/incident-response-2026-05-30` | **NEEDS-REVIEW** | No | N/A — adds StatusBadge component | Unique commit adds `StatusBadge.tsx` + tests. Despite the `docs/` prefix this adds app code. Needs Steve or Jordan to confirm the StatusBadge component is absorbed/redundant vs main before merge. |
| `docs/incident-response-2026-05-30-steve` | **BLOCKED** | YES — location plist keys, unapplied SQL, MapScreen heatmap disclaimer | N/A | Adds `app.json` iOS permission strings + `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` (unapplied) + heatmap disclaimer to MapScreen. SQL must be applied first. Jordan sign-off needed for plist additions. |
| `docs/readme-v020-2026-05-30` | **NEEDS-REVIEW** | No | N/A — adds StatusBadge | Same unique commit as `docs/incident-response-2026-05-30` (adds StatusBadge + tests). Likely stale — StatusBadge may already be on main via wave 2. Steve or Jordan should confirm before merging. |
| `docs/release-notes-v0.2.0` | **SAFE-TO-MERGE** | No | N/A — docs + app.json version bump | Adds `docs/RELEASE_NOTES_v0.2.0.md` + PWA manifest fields to `app.json`. No code, no SQL, no auth/privacy surface. No conflicts. |
| `feat/shared-status-badge-2026-05-30` | **NEEDS-REVIEW** | No | 1126/1126 green | Adds `StatusBadge.tsx` component + tests + MyReportsModal refactor + MapScreen additions (includes heatmap disclaimer). Touches UI logic and MapScreen. Needs Steve sign-off (UI logic/auth surface not obvious) and Dani Design Compiler gate (UI-touching). |
| `feat/status-badge-callsites-2026-05-30` | **SAFE-TO-MERGE** | No | N/A — qa-reports only | Only adds two `qa-reports/` markdown files (Dana StatusBadge report + commit verification). No code. Same tip as `fix/token-adoption-sprint2`. |
| `fix/guest-ux-2026-05-30` | **SAFE-TO-MERGE** | No | N/A — docs only | Adds 17 lines to `README.md` only. No code, no SQL, no conflicts. |
| `fix/security-hardening-2026-05-30` | **BLOCKED** | YES — location/camera/photo plist keys (privacy), unapplied SQL | N/A | Adds iOS `NSPhotoLibraryUsageDescription` + `NSCameraUsageDescription` + `NSLocationAlwaysAndWhenInUseUsageDescription` to `app.json` and `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` (unapplied). Requires Jordan sign-off (location + photo permission strings) and Sky SQL apply. |
| `fix/token-adoption-sprint2` | **SAFE-TO-MERGE** | No | N/A — qa-reports only | Identical to `feat/status-badge-callsites-2026-05-30`; same tip commit (fbd3d68). Only qa-report markdown files. |
| `qa/e2e-test-plan-2026-05-30` | **BLOCKED** | YES — unapplied SQL migration; touches a11y (disability-data surface) | N/A | Adds a11y fixes to `FlashBanner.tsx` + `ReportFlagModal.tsx` severity label copy, plus `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` (unapplied). SQL must be applied first. A11y copy changes (severity labels, live region) = disability-data surface → Jordan sign-off. |
| `qa/heatmap-test-plan-2026-05-30` | **SAFE-TO-MERGE** | No | N/A — qa-report only | Single file: `qa-reports/2026-05-30_Riley_HeatmapQATestPlan.md` (661 lines, test plan prose). No code, no SQL. |
| `release/0.2.0-version-bump` | **BLOCKED** | No | N/A | Adds HeatmapLayer.tsx + MapScreen.tsx (diverged from main) — 6 text-level conflicts. Also adds `.github/workflows/lighthouse.yml` and bumps `package.json` version. Must resolve conflicts before merge. |
| `shamus/d5-heatmap-2026-05-29` | **SAFE-TO-MERGE** | No | N/A — qa-reports + DECISIONS_LOG | Adds qa-report files + `DECISIONS_LOG.md`. No app code, no SQL. |
| `shamus/d5-heatmap-2026-05-29-new` | **SAFE-TO-MERGE** | No | N/A — qa-report only | Single file: `qa-reports/2026-05-29_Shamus_D5_Implementation.md`. No app code, no SQL. |
| `shamus/d8-exif-fix-2026-05-29` | **NEEDS-REVIEW** | YES — EXIF/GPS strip logic (privacy-critical D8 gate) | **1161/1161 PASS**, typecheck clean | Replaces `expo-media-library` with `expo-image-manipulator` for EXIF stripping; adds fail-closed null-return when stripping fails; adds EXIF abort in `uploadAvatar`. Touches core privacy gate. **All tests pass.** Requires Jordan formal sign-off (EXIF/GPS/photo/location chain) per D8 pre-launch gate. |

---

## Recommended Merge Order for Rory (SAFE-TO-MERGE only)

These branches contain no code changes, no SQL, no security/privacy surface, no conflicts, and no test failures. Rory may merge in any order via the standard gated wave (Gary test gate + Morgan approval):

1. `chore/remove-stray-root-docs-2026-05-29` — removes stale root-level docs
2. `docs/release-notes-v0.2.0` — release notes + PWA manifest fields
3. `fix/guest-ux-2026-05-30` — README update only
4. `qa/heatmap-test-plan-2026-05-30` — Riley heatmap QA test plan (qa-report)
5. `shamus/d5-heatmap-2026-05-29-new` — Shamus D5 implementation report (qa-report)
6. `shamus/d5-heatmap-2026-05-29` — Gary/Jordan/Morgan D5+D8 qa-reports + DECISIONS_LOG
7. `feat/status-badge-callsites-2026-05-30` — Dana StatusBadge qa-reports
8. `fix/token-adoption-sprint2` — identical tip to above; merge as no-op or delete

**Note on items 7 & 8:** `feat/status-badge-callsites-2026-05-30` and `fix/token-adoption-sprint2` share the same tip commit (`fbd3d68`). One will be a no-op after the other is merged. Rory should confirm intent and delete the duplicate.

---

## Route to Steve / Jordan (NEEDS-REVIEW)

| Branch | Route to | Reason |
|--------|----------|--------|
| `shamus/d8-exif-fix-2026-05-29` | **Jordan** | D8 EXIF/GPS privacy gate — core stripExifNative replacement + fail-closed abort. Tests pass (1161/1161), typecheck clean. Jordan formal sign-off required per D8 pre-launch gate before Rory merge. |
| `feat/shared-status-badge-2026-05-30` | **Steve + Dani** | UI component + MapScreen changes including heatmap disclaimer. Design Compiler gate (Constitution Art. 2.4) required for Dani. Steve to confirm no auth/security regression in MapScreen changes. |
| `claude/exciting-satoshi-25772e` | **Steve** | Auto-generated branch; identical tip to `feat/shared-status-badge-2026-05-30`. Clarify if this is a duplicate or intentional — recommend deleting after `feat/shared-status-badge` merges. |
| `docs/incident-response-2026-05-30` | **Steve** | Misleading `docs/` prefix — adds `StatusBadge.tsx` + tests (app code). Confirm component is not already on main; if absorbed by wave 2, delete branch. |
| `docs/readme-v020-2026-05-30` | **Steve** | Same as above — same unique commit as `docs/incident-response`. Likely stale duplicate. |

---

## BLOCKED — Needs Sky SQL Apply (and Jordan/Steve sign-off where noted)

| Branch | Blocker(s) |
|--------|-----------|
| `ci/lighthouse-2026-05-30` | **Merge conflict** — HeatmapLayer.tsx + MapScreen.tsx diverged from main (6 conflict markers). Branch author must rebase/resolve before merge. |
| `release/0.2.0-version-bump` | **Merge conflict** — same files as above (HeatmapLayer.tsx + MapScreen.tsx + package.json). Branch must be rebased. |
| `fix/security-hardening-2026-05-30` | (1) `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` — unapplied, requires Sky to apply in Supabase SQL Editor. (2) `app.json` adds `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription` — privacy-sensitive plist strings, requires **Jordan sign-off**. |
| `docs/beta-testing-guide-2026-05-30` | Same SQL migration (unapplied). Same `app.json` iOS permission string additions. Requires Sky SQL apply + Jordan sign-off. |
| `docs/incident-response-2026-05-30-steve` | Same SQL migration (unapplied) + same `app.json` additions + MapScreen heatmap disclaimer. Requires Sky SQL apply + Jordan sign-off. |
| `qa/e2e-test-plan-2026-05-30` | (1) Same SQL migration (unapplied). (2) `FlashBanner.tsx` + `ReportFlagModal.tsx` a11y copy changes touch disability-data UI surface — requires **Jordan sign-off**. |

---

## Notes for Sky

- **One SQL migration, four branches:** `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` (20-flag/24h rate limit trigger) appears in `fix/security-hardening-2026-05-30`, `docs/beta-testing-guide-2026-05-30`, `docs/incident-response-2026-05-30-steve`, and `qa/e2e-test-plan-2026-05-30`. Once Sky applies this migration, those four branches move from BLOCKED to the appropriate next step (NEEDS-REVIEW for Jordan/Steve). Only one application needed — the file is identical across all four.
- **iOS plist strings** in `app.json` (location-always, camera, photo library) — same delta across three branches (`fix/security-hardening`, `docs/beta-testing-guide`, `docs/incident-response-2026-05-30-steve`). Jordan sign-off covers all three.
- **D8 EXIF fix tests green:** `shamus/d8-exif-fix-2026-05-29` ran all 1161 tests in a clean worktree — all passing. This is the strongest candidate for Jordan's next sign-off session.
