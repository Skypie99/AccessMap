# Rory MergeWave2 Report
**Date:** 2026-05-29  
**Role:** Rory (DevOps Engineer)  
**Model Tier:** Sonnet (claude-sonnet-4-6)  
**Authority:** Elevated merge-to-main (valid through 2026-05-30) — Gary audit + Jordan privacy gate (D8 PASS) + Steve security review + Morgan approval + Sky GO

---

## Part A — Merge Results

| Branch | Outcome | Merge SHA | Notes |
|--------|---------|-----------|-------|
| `shamus/d8-exif-fix-2026-05-29` | **MERGED** | `05ef0d31` | Jordan PASS (EXIF GPS strip, fail-closed). Dry-run clean. 20 files, 2431 insertions. Gary confirmed 1161/1161 tests. |
| `docs/beta-testing-guide-2026-05-30` | **SKIPPED — CONFLICT** | — | Conflict in `app.json`: branch adds `NSLocationAlwaysAndWhenInUseUsageDescription` key that main already has `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` from `fix/security-hardening` path. Conflict is divergent plist key ordering + NSLocationAlways key. Per instructions: stop, do not guess-resolve. See DECISIONS FOR SKY below. |
| `qa/e2e-test-plan-2026-05-30` | **MERGED** | `63d78fc` | Jordan privacy-clear. Dry-run clean (auto-merged FlashBanner + ReportFlagModal cleanly). Net: 1 new qa-report file. Rate-limit SQL already on main — not re-added. |

### Reconciliation note
Remote `origin/main` had a divergent commit `259a034` — Sky's direct D8 EXIF fix push (same content as `shamus/d8-exif-fix-2026-05-29`, different ancestry). A reconciliation merge (`d771339`) was performed after typecheck + tests confirmed clean. No file-content divergence (all changes already present). Pushed cleanly.

---

## Part B — Branch Deletion Results

| Branch | Outcome | Delta vs main | Reason |
|--------|---------|--------------|--------|
| `feat/shared-status-badge-2026-05-30` | **KEPT — not deleted** | 8 files, 513 insertions (+52 deletions) | NON-EMPTY delta vs main. Includes `StatusBadge.tsx`, `ActivityFeedModal`, `FlagDetailModal`, `MyReportsModal`, `MapScreen`, tests, and 2 docs. Steve confirmed content on main but `git diff main...` shows substantial delta — likely an ancestor mismatch (multiple merge bases warning). Content is NOT cleanly redundant by diff. |
| `claude/exciting-satoshi-25772e` | **KEPT — not deleted** | 8 files, 513 insertions (+52 deletions) | NON-EMPTY delta (identical scope to feat/shared-status-badge). Same multiple-merge-base ambiguity. |
| `docs/incident-response-2026-05-30` | **KEPT — not deleted** | 2 files, 172 insertions | StatusBadge.tsx + StatusBadge.test.tsx show as delta. Not cleanly redundant. |
| `docs/readme-v020-2026-05-30` | **KEPT — not deleted** | 2 files, 172 insertions | Same as above — StatusBadge delta. |
| `docs/incident-response-2026-05-30-steve` | **KEPT — not deleted** | 6 files, 878 insertions (+1 deletion) | NON-EMPTY. Includes `app.json` (adds NSLocationAlwaysAndWhenInUseUsageDescription), `SECURITY_INCIDENT_RESPONSE.md`, `MapScreen.tsx`, rate-limit SQL, 2 qa-reports. Remote-only branch (no origin remote). |
| `fix/security-hardening-2026-05-30` | **KEPT — not deleted** | 3 files, 78 insertions (+1 deletion) | NON-EMPTY as expected per instructions. Steve-noted residual: `app.json` adds `NSLocationAlwaysAndWhenInUseUsageDescription` key not present on main. Delta confirmed. Left for Sky decision. |

---

## Part C — Leave-Alone Branches (rebase needed)

| Branch | Status |
|--------|--------|
| `ci/lighthouse-2026-05-30` | Still needs rebase. Delta vs main: 5 files (GitHub Actions workflow, `.lighthouserc.js`, `HeatmapLayer.tsx`, `MapScreen.tsx`, qa-report). NOT touched. |
| `release/0.2.0-version-bump` | Still needs rebase. Delta vs main: 7 files (includes lighthouse workflow + `app.json` version bump + `package.json`). NOT touched. |

---

## Post-Merge Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS (exit 0) |
| `npm test` | PASS — 73 suites, **1161/1161** tests |
| `git push origin main` | PUSHED — `259a034..d771339` |

**Final main SHA:** `d77133994fba12a7fe8784195ba3591e41d588b2`

---

## DECISIONS FOR SKY

### 1. `docs/beta-testing-guide-2026-05-30` — merge blocked by app.json conflict
**Conflict:** Branch adds `NSLocationAlwaysAndWhenInUseUsageDescription` key in `app.json/infoPlist`. Main already has `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` (from prior merge). The branch also reorders plist keys differently.

**The key question (privacy/capability):** `NSLocationAlwaysAndWhenInUseUsageDescription` is the "always on" background location entitlement. Main currently only has `NSLocationWhenInUseUsageDescription`. Adding the Always key has App Store privacy implications — Jordan should review before this goes to main.

**Action needed from Sky:** (a) Confirm whether AccessMap needs background ("always") location access. If yes, Jordan reviews and Shamus rebases the branch. If no, the key should be dropped from the branch before merge.

### 2. `fix/security-hardening-2026-05-30` — NSLocationAlwaysAndWhenInUseUsageDescription residual
Same plist key as above — Steve's security hardening branch also adds it. Same privacy gate question applies.

### 3. Branches with unexpected non-empty delta vs main
`feat/shared-status-badge-2026-05-30`, `claude/exciting-satoshi-25772e`, `docs/incident-response-2026-05-30`, `docs/readme-v020-2026-05-30` all show 8-file / 172-file deltas due to a multiple-merge-base issue in git's three-way diff. Steve's assessment was they're redundant — but `git diff` shows otherwise. Sky should confirm: are these safe to force-delete? If so, Rory can clean them in a follow-up with explicit `git branch -D` (they have no origin remotes except `docs/incident-response-2026-05-30`).

---

## Summary

- **Merged to main:** `shamus/d8-exif-fix-2026-05-29` + `qa/e2e-test-plan-2026-05-30`
- **Skipped (conflict):** `docs/beta-testing-guide-2026-05-30`
- **Kept (non-empty delta):** all 6 Part B branches
- **Left alone (rebase needed):** `ci/lighthouse-2026-05-30`, `release/0.2.0-version-bump`
- **Tests:** 1161/1161 PASS
- **Push:** SUCCESS — final SHA `d77133994fba12a7fe8784195ba3591e41d588b2`
