---
date: 2026-05-29
role: gary
audit: merge-readiness
branch: fix/security-hardening-2026-05-30
---

# Gary Merge Readiness Audit — fix/security-hardening-2026-05-30

**Branch:** `fix/security-hardening-2026-05-30` vs `main`  
**Merge Base:** `1b27266` (docs: privacy policy draft)  
**Status:** CONFLICTS + STALE BRANCH  
**Mergeable:** CONFLICTS  

---

## Summary

The branch `fix/security-hardening-2026-05-30` contains **TWO logical changes**:

1. **iOS plist security keys** (safe, non-DB) — app.json NSLocationAlwaysAndWhenInUseUsageDescription, NSCameraUsageDescription, NSPhotoLibraryUsageDescription
2. **Flag rate-limit migration** (DB-only) — supabase/migrations/2026-05-30_flag_creation_rate_limit.sql (20 flags/user/24h trigger)

### Conflict Analysis

**Merge conflict detected:** `app.json` (content conflict, 3-way)

- **main** has modified app.json through unrelated plist tweaks
- **branch** adds NSLocationAlwaysAndWhenInUseUsageDescription key
- **Conflict type:** Field order + key insertion in nested infoPlist object

**Large diff (~5624 deletions):** The branch includes broad file deletions:
- qa-reports/* — 8 report files (Dani, Shamus, Riley, etc.)
- docs/* — security, incident response, release notes, runbook
- public/* — index.html, sw.js
- src/components/* — FlagCard, StatusBadge + tests
- src/lib/webShare.ts

These deletions appear to be **stale commits from earlier in the merge wave**, now conflicting because main has progressed further. The branch is ~11 commits behind main's latest merge (79ad178).

---

## Classification

### Content Classification

| Item | Category | Notes |
|------|----------|-------|
| **app.json plist keys** | SAFE_MORGAN_LANE | Non-privacy, non-DB; simple config. Conflict is resolvable (add missing keys). |
| **flag_creation_rate_limit.sql** | SKY_ONLY_DB | Database migration; requires live apply by Sky (Supabase SQL Editor). Stored as migration FILE (no state leak). |
| **qa-reports, docs, public deletions** | REVIEW_FIRST | Wholesale deletions conflict with concurrent main merges. Intentionality unclear. |

---

## Merge Readiness

| Check | Result | Details |
|-------|--------|---------|
| **Branch exists** | ✓ PASS | Local + remote branches present |
| **Merge conflicts** | ✗ CONFLICTS | app.json only (manageable) |
| **Conflict files** | app.json | 3-way conflict in iOS infoPlist object |
| **DB migrations** | ✓ SAFE FILE | Migration stored as .sql (no applied state); needs Sky's manual apply in Supabase SQL Editor |
| **Privacy/Auth touches** | ✗ INSPECT | Location plist keys are configuration, not logic (safe). Rate limit is purely backend enforcement (no PII involved). |
| **Build status** | ? UNKNOWN | No build context provided; assume clean per latest CI runs on main |
| **Branch age** | ⚠ STALE | Based on commit 1b27266 (2026-05-29 03:41 UTC); main is at 79ad178 (later same day). 11+ commits behind. |

---

## Merge Recommendation

**Status:** CONFLICTS — **Do not merge yet**

**Path forward:**

1. **Rebase the branch** onto current main (79ad178) — Git will surface ALL true conflicts once fast-forward history is fixed.
   ```
   git rebase main fix/security-hardening-2026-05-30
   ```
   This will reveal whether the wholesale deletions (qa-reports, docs, public, components) are intentional or merge artifacts.

2. **Resolve app.json conflict** — 3-way merge is straightforward:
   - Keep both plist sets (union the keys, preserve all NSLocation* + NSCamera + NSPhoto keys)
   - Resolve via standard merge tool or manual edit

3. **Verify migration SQL** — Review `/supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`:
   - ✓ Check_flag_rate_limit() function: rate limit 20 flags/24h per user
   - ✓ Trigger on flags table: BEFORE INSERT
   - ✓ Errors on quota exceeded (ERRCODE P0001)
   - Assess: **Safe to commit** (does not execute; Sky applies manually in Supabase UI)

4. **Clarify deletions** — Before final push, confirm:
   - Are qa-reports, docs, public intentionally being removed?
   - Or are these stale from an earlier branch state?
   - If intentional: provide rationale. If merge artifact: drop them in rebase.

---

## Build Known

No live build context provided. Assume **latest main CI is clean** (79ad178 merged successfully 2026-05-29).

---

## Next Steps

- **Rory + Morgan** gate: rebase branch, resolve app.json, verify intent on deletions
- **Sky apply:** once merged, manually run migration SQL in Supabase SQL Editor (note: trigger will auto-activate on next INSERT to flags table)
- **No external sends:** Gary audit only; findings surface to qa-report + Morgan

---

**Audit Date:** 2026-05-29  
**Auditor:** Gary (QA + CI safety)  
**Scope:** Read-only merge simulation + diff analysis  
