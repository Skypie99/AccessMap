# Gary — Merge Readiness Audit
**Branch:** `qa/auto-2026-05-29` vs `main`  
**Date:** 2026-05-29  
**Context:** 7 security/privacy fixes from background agent (Const. Art. 12 BACKGROUND mode)  
**Mode:** READ-ONLY merge-readiness review  

---

## Merge Status: CONFLICTS + PRIVACY GATES

### Conflict Detection

```
git merge-tree --write-tree --messages main qa/auto-2026-05-29
Exit code: 1 (CONFLICTS)

Conflicted file:
  supabase/functions/send-push-notification/index.ts
```

**Conflict root cause:**  
- **Main (Steve 2026-05-26):** Comprehensive security hardening with detailed comments, oracle-fix pattern (return 200 {"status":"queued"} on missing token), rate-limiting instructions, and 4 security sub-gates (shared-secret auth, input length limits, caller scope, rate limiting).
- **Branch (BACKGROUND agent 2026-05-29):** Minimal auth gate implementation (Bearer token check only), shorter comments, missing oracle-fix and rate-limiting details.

**Resolution:** Main's version is more complete. Branch's is a subset. Merge will require **Sky decision** on which set of security comments to retain (or manually combine them).

---

## Diffstat Summary

```
62 files changed, 2163 insertions(+), 6001 deletions(-)
```

Key changes:
- **qa-reports/**: 8 new role reports added (Gary D5/D8, Jordan D8, Morgan triage, Steve hardening); 7 old reports deleted (cleanup).
- **src/lib/flags.ts**: Added lat/lng bounds validation in `createFlag()`.
- **src/lib/users.ts**: Removed `email` from `.select()` post-migration.
- **src/screens/ProfileScreen.tsx**: `void` annotation on `signOut()` call; hardcoded color values changed from theme variables.
- **supabase/functions/send-push-notification/index.ts**: Added `isAuthorized(req)` auth gate (CONFLICTED).
- **docs/**: Deleted 7 docs files (PRIVACY_POLICY.md, RELEASE_RUNBOOK.md, SECURITY_INCIDENT_RESPONSE.md, etc.).
- **app.json**: 16-line change (version bump, config update).
- **CHANGELOG.md**: 334 lines added.
- **SYSTEM_CONSTITUTION.md**: 461 lines added (appears to be a copy of ~/ClaudeCorp/CONSTITUTION.md — BLOCKER).

---

## Privacy & Security Classification

### CRITICAL FINDING: EXIF Privacy Gate Downgrade

**File:** `src/lib/flags.ts` (line ~320)  
**Current (main):**
```typescript
if (!exifCheckPassed) {
  throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
}
```

**Branch version:**
```typescript
if (!exifCheckPassed) {
  console.warn('[EXIF] Verification detected possible metadata markers.');
}
```

**Issue:** The branch **removes the hard privacy gate** that prevents flag photos with unstripped EXIF data from uploading. Instead of blocking with an error, it only logs a warning and proceeds with the upload.

**Privacy risk:** EXIF data may contain:
- GPS coordinates (user location leak)
- Camera model/serial (device fingerprinting)
- Timestamp metadata (user activity pattern)

This contradicts the D8 privacy gate (noted in old main code comment: "D8 privacy gate: do not upload if GPS/EXIF metadata cannot be verified stripped").

**Status:** 🚨 **SKY_ONLY_PRIVACY** — This is a **deliberate downgrade of privacy enforcement**, not a bug. It may have been approved on a different branch (commit 563401c "D8-A: Replace stripExifNative..."), but it's not documented in Steve's 2026-05-29 security report and was not approved in this audit cycle.

---

### Secondary Privacy Concern: Hardcoded Colors in ProfileScreen

**File:** `src/screens/ProfileScreen.tsx` (lines ~1897-1898)  
**Change:**
```typescript
// From:
toggleLabel: { fontSize: 14, fontWeight: '600', color: color.textStrong },
toggleHint: { fontSize: 12, color: color.textMuted },

// To:
toggleLabel: { fontSize: 14, fontWeight: '600', color: '#222' },
toggleHint: { fontSize: 12, color: '#666' },
```

**Issue:** Breaks theme-aware design. Not a privacy issue per se, but **visual regression**. This is a cosmetic change that doesn't belong in a security-focused batch.

---

### Approved Fixes (Low Risk)

1. **`send-push-notification` auth gate** — ✅ Correct (when conflict resolved). Prevents unauthenticated push spam.
2. **`createFlag` lat/lng bounds validation** — ✅ Low risk, defense-in-depth. Client-side validation of coordinate bounds.
3. **Remove email from `updateUserProfile` select** — ✅ Low risk, post-migration cleanup per 2026-05-27 decision.
4. **`void signOut()` annotation** — ✅ Low risk, lint fix + clarifying comment.
5. **Remove hardcoded project ref from `apply-migrations.js`** — ✅ Low risk, hygiene.

---

### Structural Issues

1. **SYSTEM_CONSTITUTION.md added to repo** — 🚨 **BLOCKER**. This file (461 lines) appears to be a copy of `~/ClaudeCorp/CONSTITUTION.md` committed to the AccessMap repo. Per Const. Art. 1.2, `~/.claude/**` and `~/ClaudeCorp/.claude/**` are **hard-excluded from projects**. This must be **removed before merge**.

2. **qa-reports files deleted** — Cleanup of old role reports is reasonable, but the branch also **deletes qa-reports/2026-05-29_Dani_DesignSystemAudit.md** and **qa-reports/2026-05-29_Shamus_D5_Implementation.md**. Verify this is intentional (likely yes, as they're in the "old" report set).

3. **Merge conflict in send-push-notification** — Requires **manual resolution** (Sky decision on which security comments to keep).

---

## Build Status

- **No known build errors** from context.
- **Typecheck:** Assuming passing (no errors noted in Steve's report).
- **Tests:** Steve reports "79 tests passing, privacy verified" (from qa-reports/2026-05-29_Gary_D5_Tests.md).

---

## Classification

**MERGEABLE:** CONFLICTS  
**CATEGORY:** SKY_ONLY_PRIVACY + REVIEW_FIRST  
**BLOCKERS:**
1. Merge conflict in `supabase/functions/send-push-notification/index.ts` (requires manual resolution).
2. EXIF privacy gate downgrade (intentional change, but not documented — requires Sky decision).
3. SYSTEM_CONSTITUTION.md committed to repo (must be removed per Const. Art. 1.2).
4. Hardcoded colors in ProfileScreen (visual regression — should revert or justify).

**RECOMMENDATION:** DO NOT MERGE until:
1. Sky confirms the EXIF gate downgrade is intended (D8-A decision).
2. SYSTEM_CONSTITUTION.md is removed from the branch.
3. The send-push-notification conflict is manually resolved.
4. ProfileScreen color hardcodes are reverted or approved.

---

## Summary

This branch contains **4 solid security/validation fixes** (auth gate, bounds checking, RLS cleanup, lint) but is **blocked by 4 decision points** that only Sky can resolve:

1. **Intentional EXIF downgrade?** (Privacy gate removed)
2. **Constitution file in repo?** (Structural violation)
3. **Manual conflict resolution** (send-push-notification auth comments)
4. **Hardcoded theme colors?** (Visual design regression)

All are **reversible** except #2 (which requires deletion). Flag for Morgan to escalate to Sky.

