# Rory — Reconciliation Plan: fix/security-hardening-2026-05-30
**Date:** 2026-05-29
**Role:** Rory (DevOps / Merge Authority)
**Status:** READ-ONLY AUDIT — no git writes executed

---

## Summary Verdict

**RECOMMEND: ABANDON_REDUNDANT**

This branch has exactly 2 unique commits (ahead of merge-base). Both commits have been substantially absorbed into `origin/main` via independent cherry-picks. The one remaining divergence (`NSLocationAlwaysAndWhenInUseUsageDescription`) was deliberately excluded from main (see commit `359dfa8` message: "Deliberately excluded NSLocationAlwaysAndWhenInUseUsageDescription: the app uses when-in-use location only; adding Always would be an unnecessary privacy over-ask"). The branch should be abandoned; there is no net-new code to salvage.

---

## Branch Topology

| Item | Value |
|---|---|
| Branch | `fix/security-hardening-2026-05-30` |
| Branch tip | `9eb8d88` |
| `origin/main` tip | `259a034` → later at `d771339` |
| **Merge base** | `1b27266` (commit: `docs: add privacy policy draft`) |
| Commits ahead of merge-base | **2** |

---

## Commits Unique to Branch (since merge-base `1b27266`)

### Commit 1: `9ffc13d` — "security: flag rate limit migration + iOS App Store plist keys"
**Author:** Sky Pie, 2026-05-29 03:41

**Files changed:**
- `qa-reports/2026-05-30_Steve_SecurityHardening.md` (new, 34 lines)
- `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` (new, 40 lines)

**Note:** This commit originally also intended to modify `app.json`, but the diff shows it did NOT touch app.json (the app.json change lands in commit 2 below).

**Status per file:**

| File | Verdict | Reason |
|---|---|---|
| `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` | ALREADY ON MAIN (redundant) | Commit `4de52a4` on main ("fix(security): add flag creation rate limit migration — Lifted verbatim from fix/security-hardening-2026-05-30") contains the identical 40-line SQL. `git diff origin/main fix/security-hardening-2026-05-30 -- supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` returns empty. |
| `qa-reports/2026-05-30_Steve_SecurityHardening.md` | ALREADY ON MAIN (redundant) | Commit `712cca7` on main is an identical copy. `git diff` for this file returns empty. |

**Disposition: DROP — entirely redundant.**

---

### Commit 2: `9eb8d88` — "security(ios): add missing App Store plist keys to app.json"
**Author:** Sky Pie, 2026-05-29 03:42

**Files changed:**
- `app.json` — adds 3 iOS infoPlist keys to `expo.ios.infoPlist`

**What the branch adds to app.json:**
```json
"NSLocationAlwaysAndWhenInUseUsageDescription": "AccessMap uses your location to show accessibility flags near you.",
"NSPhotoLibraryUsageDescription": "AccessMap needs photo access to attach images to accessibility reports.",
"NSCameraUsageDescription": "AccessMap uses the camera to capture photos of accessibility barriers."
```
(plus reorders existing keys — camera/photo appear after the Always key)

**What main already has (commit `359dfa8`):**
```json
"NSCameraUsageDescription": "AccessMap uses the camera to capture photos of accessibility barriers.",
"NSPhotoLibraryUsageDescription": "AccessMap needs photo access to attach images to accessibility reports."
```

**Status per key:**

| Key | Branch | Main | Verdict |
|---|---|---|---|
| `NSLocationWhenInUseUsageDescription` | Present (unchanged) | Present (unchanged) | Identical — no action |
| `NSCameraUsageDescription` | Present | Present (same text) | ALREADY ON MAIN — text identical, only key order differs |
| `NSPhotoLibraryUsageDescription` | Present | Present (same text) | ALREADY ON MAIN — text identical, only key order differs |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Present | **Absent** | DIVERGENT — see analysis below |

**Analysis of `NSLocationAlwaysAndWhenInUseUsageDescription` divergence:**

This is the sole piece of content on the branch that is not on main. However, it was **deliberately excluded from main** by a conscious engineering decision. Commit `359dfa8` on main explicitly states in its commit message:

> "Deliberately excluded NSLocationAlwaysAndWhenInUseUsageDescription: the app uses when-in-use location only; adding Always would be an unnecessary privacy over-ask and invites App Store scrutiny."

This means the divergence is **intentional, not accidental**. Main has the correct resolution. The branch's inclusion of the Always key represents an earlier, superseded decision that main's author (Sky, via a later cherry-pick) reversed on purpose.

**Disposition: DROP — the only divergent hunk was intentionally excluded from main for correct privacy/App Store reasons. Adopting it would reintroduce an unnecessary privacy over-ask.**

---

## Full Diff Scope Between Branch and Main

The `git diff --name-only origin/main fix/security-hardening-2026-05-30` shows ~65+ files differing. This is because the branch **predates** a massive merge wave (MergeWave2, merge wave 2026-05-30) that landed ~40 branches onto main after the branch's merge-base. All of those 65+ file differences are changes that exist on main but not yet on the branch — they are NOT new content on the branch; the branch simply hasn't received those upstream changes. The branch is a strict subset of main's content, except for the one disputed `NSLocationAlwaysAndWhenInUseUsageDescription` key which was deliberately dropped from main.

---

## Ordered Reconciliation Recipe

**Recommendation: ABANDON. Do not cherry-pick, do not rebase, do not merge.**

Step-by-step if Sky wants a formal close-out:

1. **No cherry-picks needed.** All substantive content from this branch is already on `origin/main`:
   - Rate limit migration SQL: on main via `4de52a4`
   - Steve SecurityHardening QA report: on main via `712cca7`
   - Camera + Photo Library plist keys: on main via `359dfa8`

2. **Do not cherry-pick `NSLocationAlwaysAndWhenInUseUsageDescription`.** This key was intentionally omitted from main. Adding it would be a privacy over-ask and could invite App Store review scrutiny. If this decision is ever reversed (e.g., if the app adds background location features), it should come through a dedicated branch with Jordan privacy signoff.

3. **Delete the branch** (Sky or Rory with Sky approval):
   ```
   git push origin --delete fix/security-hardening-2026-05-30
   ```
   No working tree changes required beforehand.

---

## Decisions for Sky

| # | Decision | Recommended Action |
|---|---|---|
| D1 | `NSLocationAlwaysAndWhenInUseUsageDescription` — branch adds it, main intentionally omits it | **Confirm omission is correct.** The app only uses when-in-use location; the Always key would be an over-ask. If AccessMap ever adds background location, add it then with a new branch + Jordan signoff. |
| D2 | Branch abandonment | **Approve deletion** of `fix/security-hardening-2026-05-30`. All content is absorbed. |

---

## Risk Assessment

| Risk | Level | Notes |
|---|---|---|
| Data loss from abandonment | NONE | All substantive content confirmed on main |
| App Store rejection risk | LOW | Main has Camera + Photo Library keys; omitting Always key is the correct decision per Apple guidelines for when-in-use-only apps |
| Rate limit not applied | NOTE | `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` is on main as a FILE but has NOT been applied to the live database (flagged in Steve report). Sky must apply manually via Supabase SQL Editor. |

---

*Report written by Rory (read-only audit mode — no git writes executed). Background loop owns the AccessMap repo; all actions above require explicit Sky approval before execution.*
