# AccessMap Re-Sweep Triage — 2026-06-09
**Morgan's Assessment for Sky — READ-ONLY Briefing**

Branch: `audit/accessmap-resweep-2026-06-09` (17 commits, main untouched)  
Audit: 1,585 tests passing · 0 lint errors · All prior refutations hold  
Task: Triage 9 DECISIONS + 15 verified-but-unfixed items → scannable Y/N/defer list for Sky

---

## DECISIONS FOR SKY (9 Items)

### 1. ✓ EXIF Privacy Gate Rewrite (F29, F30) — HIGH

**What it is:**
Old gate scanned the entire buffer for raw JPEG markers (0xFFE1, 0xFFED, 0xFFE9). This false-positives on PNG's DEFLATE-compressed data (~1 per 64 KB), so virtually every iPhone screenshot (PNG format) was rejected with a fake "privacy check failed" error. New gate is structural: JPEG walks marker segments properly, PNG checks for real `eXIf` chunk (which the old byte-scan couldn't), and unknown formats fail closed.

**Privacy gate still holds fail-closed? ✓ YES — verified:**
- JPEG verification (src/lib/flags.ts:290–316): walks SOI→SOS, rejects any APP1/APP13/APP9 metadata marker
- PNG verification (src/lib/flags.ts:322–345): walks chunks, rejects any `eXIf` chunk (actual PNG EXIF storage)
- Both formats: strict bounds checks; malformed input fails closed (returns false = REJECT)
- Tests: +17 locking tests added; sweep verified "EXIF walkers' bounds math"
- Result: GPS-bearing JPEG/HEIC still blocked; PNG screenshots now upload ✓

**Your decision:**
- **Option A (MERGE):** Privacy-strengthening fix, unblocks legitimate PNG use, tests verify bounds. Low risk.
- **Option B (DEFER):** Wait for independent review (though audit already covered it).

**Recommendation:** MERGE  
**Risk of merge:** Negligible. Code is sound, bounds-checked, audit-verified.  
**Risk of deferring:** iPhone users cannot attach screenshots (major friction for accessibility app).

**Blocker tag:** [CAN WAIT — later wave] if you want a separate review; otherwise [BLOCKS TESTFLIGHT] to fix the user-facing bug.

---

### 2. Notification Preference Toggles Are Decorative (HIGH) — NOT FIXED

**What it is:**
Notification Preferences screen is now reachable (was unreachable). Four toggles (mute, quiet, etc.) write to AsyncStorage, but nothing in the push delivery pipeline reads them. Screen says "changes take effect immediately" — a lie. Not fixed this run.

**Your decision:**
- **Option A (Wire now):** Add `notification_preferences` migration + edge-function change to read the toggles.
- **Option B (Hide):** Remove/relabel the Notification Preferences screen until you're ready to wire it. Reversible.
- **Option C (Accept):** Ship as-is; testers/users toggle them as a placebo; it doesn't break anything.

**Recommendation:** Option B  
**Risk of A:** 1 migration + 1 edge-function change. Small work, but adds scope if you're on a testflight clock.  
**Risk of B:** Testers won't see the feature, but push still works fine. Ship it later.  
**Risk of C:** Silent mismatch between UI and reality. Bad UX pattern.

**Blocker tag:** [BLOCKS TESTFLIGHT] if you have a "no false UI" policy; [CAN WAIT — later wave] if you're OK hiding it.

---

### 3. Offline Sign-Out Is Impossible (SURFACED, NOT SOLVED) — MEDIUM

**What it is:**
`supabase-js` always POSTs to the server on sign-out, even with `scope:'local'`. When offline, sign-out appears to work (caches cleared, session alive in the background). Old behavior: silent failure (user thought they were signed out, but session alive = privacy risk). New behavior: honestly tells user "Sign out failed, network required."

Full offline sign-out would require manual session-storage removal + synthetic SIGNED_OUT event — RPC surgery, non-trivial.

**Your decision:**
- **Option A (Fix now):** Implement manual session storage cleanup for true offline sign-out.
- **Option B (Accept):** Honest error message is better than silent failure. Ship as-is.

**Recommendation:** Option B  
**Risk of A:** Non-trivial auth machinery surgery; edge case (airplane mode + offline).  
**Risk of B:** Offline users see "network required" error. They understand; it's acceptable.

**Blocker tag:** [CAN WAIT — later wave] · UX is actually improved (honest vs silent).

---

### 4. Proposed DB Migration (File Only, NOT Applied) — MEDIUM

**What it is:**
File `supabase/migrations/2026-06-09_status_transition_guard_PROPOSED.sql` exists (not applied). The app now does compare-and-set status updates (F53: prevents stale flag overwrites). But a hand-rolled REST client could still write invalid transitions (e.g., `resolved → verified`, silently reverting a resolution). Trigger enforces legal state machine. Rollback included.

**Your decision:**
- **Option A (Apply):** Run the migration now. Hardens the API against invalid transitions.
- **Option B (File only):** Keep it as a proposal. The in-app flow is solid; API bypass is a low-risk edge case.

**Recommendation:** Option B for testflight; Option A for public release  
**Risk of A:** Small risk; the migration is sound. But adds one more thing to verify.  
**Risk of B:** REST bypass possible. Low customer risk if you control all clients.

**Blocker tag:** [CAN WAIT — later wave] · Nice-to-have hardening, not a blocker.

---

### 5. Public Storage Orphans (PROPOSE-ONLY) — MEDIUM

**What it is:**
Photos upload to the bucket before the flag row inserts. If the insert fails (or mid-multi-photo loop), publicly readable photos are orphaned in the bucket (user thinks they discarded; they're actually public). Retries create duplicates. Needs cleanup policy: best-effort `storage.remove()` in failure path and/or re-use uploaded URLs on retry.

**Your decision:**
- **Option A (Fix):** Add best-effort cleanup in the failure handler.
- **Option B (Accept):** Document the edge case; defer cleanup polish.

**Recommendation:** Option A for testflight; critical for public  
**Risk of A:** Low complexity. One try/catch wrapper in the failure path.  
**Risk of B:** Testers might discover orphaned public photos on failed multi-photo upload. Feels like a data leak.

**Blocker tag:** [BLOCKS TESTFLIGHT] · Error path exposure for internal testers.

---

### 6. Report FAB Uses Stale GPS Fix (PROPOSE-ONLY, Location-Touching) — LOW

**What it is:**
Report FAB pins a flag location from where the user WAS (old flag created), while the blue dot shows where they ARE NOW. Minor UX confusion. Fix: re-call `getLocation()` on FAB press. Location handling is privacy-sensitive, so requires your nod.

**Your decision:**
- **Option A (Fix):** Re-read location on FAB press (one-liner).
- **Option B (Accept):** Document it. Testers understand they're mobile; a stale pin is a known issue.

**Recommendation:** Option B for testflight; Option A polish later  
**Risk of A:** None; one-liner location re-fetch.  
**Risk of B:** Minor UX confusion on first tap after moving.

**Blocker tag:** [CAN WAIT — later wave] · Polish feature.

---

### 7a. SWR Precedence: Offline Cache vs Optimistic State (JUDGMENT CALL) — LOW

**What it is:**
Offline cache fallback can repaint over newer optimistic state (e.g., user optimistically deleted a filter, then the app renders stale cached data on top). A UX polish choice: should stale data win, or optimistic state win? Currently: stale data.

**Your decision:**
- **Option A:** Accept current behavior (offline data refreshes the screen; optimistic state is secondary).
- **Option B:** Reverse precedence (optimistic state wins; offline data unavailable).

**Recommendation:** Option A  
**Risk of A:** Users see stale data offline. Expected behavior; they know they're offline.  
**Risk of B:** Offline users see no data. Worse UX.

**Blocker tag:** [CAN WAIT — later wave] · Defensible either way; current choice is reasonable.

---

### 7b. Filter Preset Names: Allow Duplicates vs Consistency (JUDGMENT CALL) — LOW

**What it is:**
Filter presets allow duplicate names (e.g., two "All Categories" filters). Saved Places rejects duplicates. Inconsistency.

**Your decision:**
- **Option A (Fix):** Add uniqueness check to filter presets.
- **Option B (Accept):** Allow duplicates; document inconsistency.

**Recommendation:** Option B for testflight  
**Risk of A:** One constraint check. Non-blocking work.  
**Risk of B:** Testers won't create duplicates unintentionally.

**Blocker tag:** [CAN WAIT — later wave] · Minor UX consistency.

---

## 15 Verified-But-Unfixed Items

### Fix Before Testers See It (3 items)

| ID | Severity | Issue |
|----|----------|-------|
| M1 | MEDIUM | Comments: failed background refetch replaces thread with error (no retry link) |
| M2 | MEDIUM | Raw transport/server text reaches alerts app-wide (confuses testers on error paths) |
| M3 | MEDIUM | Report form stays editable during in-flight submit (data-confusion UX) |

**Recommendation:** One 1-line fix each. Worth doing before testers to avoid confusion.

---

### Nice to Fix (Medium priority; defer if schedule tight)

| ID | Severity | Issue |
|----|----------|-------|
| M4 | MEDIUM | MapScreen saved-filter-set Delete menu is silent no-op on web (hide on web, not broken) |
| M5 | MEDIUM | Share message never includes `accessmap://flag/{id}` deep link (incomplete feature, workaround exists) |
| M6 | MEDIUM | Deep link to flag outside loaded page-1 focuses empty spot (should `fetchFlagById` + merge) |

---

### Fine to Defer (10 items — low priority / edge cases)

| ID | Severity | Issue |
|----|----------|-------|
| L1 | LOW | Unbounded comment fetch/render (pagination gap, edge case) |
| L2 | LOW | "Copy coordinates" dead on Firefox desktop (browser-specific) |
| L3 | LOW | Web map-popup `<img>` lacks error fallback (graceful degradation) |
| L4 | LOW | Profile milestone bar badges the catalog doesn't have (display quirk) |
| L5 | LOW | Tasks vs Nearby search semantics diverge (minor UX; both work) |
| L6 | LOW | ReportFlagModal/ProfileScreen pickers leak blob URLs (resource leak, not critical) |
| L7 | LOW | Warm deep link while signed out is dropped (edge case, expected) |
| L8 | LOW | Re-tapping same flag link doesn't re-fire (UX quirk; users can tap again) |
| L9 | LOW | Web address bar shows `/flag/undefined` (cosmetic) |
| L10 | LOW | Parked backend items unchanged (10/3/15/7 points drift, duplicate trigger, RLS, webhook rotation) |

---

## Summary Table for Sky's Decision Pass

| Item | Recommendation | Tag | Required Approval? |
|------|-----------------|-----|-------------------|
| 1. EXIF gate | MERGE | Can wait / Blocks merge | **YES — privacy code** |
| 2. Notification toggles | Hide (Option B) | Blocks testflight | **YES** |
| 3. Offline sign-out | Accept (Option B) | Can wait | **NO — already improved** |
| 4. DB migration | File only (Option B) | Can wait | **NO — optional hardening** |
| 5. Storage orphans | Add cleanup (Option A) | Blocks testflight | **YES — data leak path** |
| 6. Stale GPS FAB | Accept (Option B) | Can wait | **NO — known, low-impact** |
| 7a. SWR precedence | Accept (Option A) | Can wait | **NO — current choice reasonable** |
| 7b. Filter duplicates | Allow (Option B) | Can wait | **NO — consistent with current** |
| M1–M3 | Fix before testers | — | **NO — 3 small fixes** |

---

## What You Can Reply

Sky, you can triage this in one message:
```
1. Yes
2. Option B
3. No action
4. No action
5. Yes
6. No action
7a. No action
7b. No action
Fix M1, M2, M3 before launch.
```

Or tell me which items you want to discuss further. I'm holding the full context and haven't touched anything — everything is reversible.

---

**Audit Summary:** 1,585 tests passing · 0 lint errors · All prior findings hold · Branch clean · Main untouched.
