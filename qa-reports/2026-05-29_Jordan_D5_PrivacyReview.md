# Jordan — D5 Heatmap Privacy Review

**Date:** 2026-05-29  
**Reviewer:** Jordan (privacy/PIPEDA advisor — NOT a lawyer)  
**Branch reviewed:** `shamus/d5-heatmap-2026-05-29`  
**Review type:** PRIVACY GATE — pre-approval conditions verification  
**Mode:** READ-ONLY. No code changes. No external sends.

---

## VERDICT

**CONDITIONAL APPROVAL — WITH CRITICAL REGRESSIONS BLOCKING MERGE**

The heatmap feature itself (location aggregation, k-anonymity floor, rendering) remains privacy-compliant with the pre-approved D5 conditions. **HOWEVER**, this branch introduces two unrelated security and privacy regressions that violate existing conditions (Jordan D8 and Steve A1 hardening):

1. **CRITICAL REGRESSION: EXIF/GPS stripping gate removed** — Photo upload privacy gate now silent warning instead of blocking upload
2. **CRITICAL REGRESSION: Push notification auth hardening removed** — Bearer token requirement, oracle fix, and input validation stripped
3. **MINOR REGRESSION: Guest user UX gate removed** — Report FAB now hidden instead of showing auth-required explanation

**These regressions must be fixed before merge.** They are not related to D5 heatmap approval — they are pre-existing conditions that should not be modified on this branch.

---

## D5 Heatmap Conditions — Status

I reviewed the heatmap implementation against the four conditions from my 2026-05-25 pre-approval. All conditions are met:

### Condition C1 — K-anonymity floor (k≥3)

**Status:** ✅ PASS

The heatmap library (`src/lib/heatmap.ts`) enforces:
- Default k-floor: `DEFAULT_K_FLOOR = 3` (line 29)
- Bucketing logic: cells below the floor are dropped entirely before rendering (line 146)
- Test coverage: heatmap.test.ts confirms k=3 threshold behavior and respects custom kFloor parameter

The comment in heatmap.ts explicitly states: _"Don't lower without another privacy review."_ This is correctly baked in.

**Impact:** Individual re-identification from the heat-map alone is not achievable at k≥3. The privacy guarantee holds.

---

### Condition C2 — Mandatory heat-map disclaimer

**Status:** ✅ PASS (with minor style adjustment)

MapScreen.tsx includes a heatmap disclaimer banner when `heatmapEnabled` is true:
```tsx
heatmapDisclaimer: {
  alignSelf: 'stretch',
  backgroundColor: 'rgba(0,0,0,0.55)',  // changed from color.overlayBtn
  borderRadius: radius.md,
  paddingHorizontal: 12,
  paddingVertical: 7,
},
heatmapDisclaimerText: {
  fontSize: 11,
  color: 'rgba(255,255,255,0.85)',  // changed from color.textOnBrand
  lineHeight: 15,
  textAlign: 'center',
},
```

The disclaimer text is rendered whenever heatmapEnabled is true. The style changes (background color + text color) are cosmetic and do not reduce visibility. The requirement is satisfied.

---

### Condition C3 — Library vetting (no outbound data sends)

**Status:** ✅ PASS

The implementation uses:
- **Web (Leaflet):** `leaflet.heat` is a pure client-side Leaflet plugin; no external calls. Pre-approved in original D5 review.
- **Native (react-native-maps):** Manual polygon/circle rendering using `react-native-maps` primitives; no network calls, no outbound data.

No third-party heat-map library was added. The code stays within the pre-approved paths.

---

### Condition C4 — No caching of heat-map grid data

**Status:** ✅ PASS

The heatmap grid is computed on-demand from the in-memory `flags` array using `useHeatCells()`. No persistence to AsyncStorage, file system, or database. The library heatmap.ts contains only pure functions; no caching logic.

---

## Critical Regressions Found

### REGRESSION 1: EXIF/GPS Stripping Gate Disabled

**Severity:** CRITICAL  
**Condition violated:** Jordan D8 privacy pre-launch gate  
**Files affected:** `src/lib/flags.ts`

**Change made:**
```diff
// uploadFlagPhoto (line 317-321)
- if (!exifCheckPassed) {
-   // D8 privacy gate: do not upload if GPS/EXIF metadata cannot be verified stripped.
-   throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
+ if (!exifCheckPassed) {
+   console.warn('[EXIF] Verification detected possible metadata markers.');
```

**Impact:**
- Photos with unstripped GPS/EXIF metadata are now uploaded without user awareness or blocking
- This violates the D8 privacy condition I set in my 2026-05-28_Jordan_ExifPrivacyReaudit.md
- PIPEDA Principle 4 (Limiting Collection) is violated: GPS metadata (location data at photo capture time) can now leak to cloud storage
- In AccessMap's context, photo-embedded GPS reveals the precise location where the user stood when they took the photo — potentially more sensitive than the flag lat/lng itself (which may be approximate or submitted after the fact)

**Why this is a regression:**
The original implementation had three layers:
1. Client-side EXIF stripping (`stripExifWeb` / `stripExifNative`)
2. Verification check (`verifyExifStripped`)
3. **Hard gate: throw if verification failed** ← This is now a silent warning

Removing the hard gate means users cannot consent to blocking an unsafe photo; the app silently uploads it.

**Fix required:** Restore the `throw new Error(...)` to block uploads when EXIF cannot be verified stripped. This must be done before merge.

---

### REGRESSION 2: Push Notification Auth Hardening Removed

**Severity:** CRITICAL  
**Condition violated:** Steve A1 security hardening (2026-05-26, re-applied 2026-05-30)  
**Files affected:** `supabase/functions/send-push-notification/index.ts`

**Changes made:**
1. **Bearer token auth removed:** The `isAuthorized()` function that checked `Authorization: Bearer <SEND_PUSH_SECRET>` was deleted
2. **Oracle fix removed:** Responses now return `404` when token is not found, instead of `200 {"status":"queued"}`. This leaks to callers which user IDs have push enabled
3. **Input validation removed:** Length limits for title (≤150 chars), body (≤300 chars), and data payload (≤1 KB) were removed
4. **Sanity checks weakened:** Bad token format now returns `400` instead of silent `200 {"status":"queued"}`, leaking server state

**Impact:**
- **Authentication:** Any caller who knows the function URL can now send arbitrary push notifications to any user (no secret required)
- **Enumeration oracle:** Attackers can enumerate which user IDs have push notifications enabled by comparing response codes (404 = has token, success = sent)
- **Social engineering:** No size limits means attackers can craft oversized payloads or malicious messages without server-side filtering
- This directly violates Steve's A1 hardening that was applied on 2026-05-30

**Historical context:**
Steve applied A1 hardening on 2026-05-26, then re-applied it on 2026-05-30 after it regressed during another branch merge. This branch has reverted those fixes again.

**Fix required:** Restore all auth hardening:
1. Restore `isAuthorized()` function with Bearer token check against `SEND_PUSH_SECRET`
2. Return `200 {"status":"queued"}` when token is not found (oracle fix)
3. Restore input length validation (title, body, data)
4. Return 200 on bad token format instead of 400 (avoid leaking server state)

This must be done before merge.

---

### REGRESSION 3: Guest User Auth Gate Removed (Minor)

**Severity:** MEDIUM  
**Condition violated:** Jordan Condition 2 (guest privacy gate from D5 pre-approval)  
**Files affected:** `src/screens/MapScreen.tsx`

**Change made:**
```diff
- {/* Jordan Condition 2: guests cannot create reports.
-     We show a disabled ghost FAB instead of hiding entirely so
-     users know the feature exists and why it is unavailable.
-     Tapping the ghost FAB surfaces a brief explanation + sign-in
-     nudge via Alert. */}
- {authUser ? (
+ {/* Jordan Condition 2: hide Report FAB for guest users */}
+ {authUser && (
   <Pressable ...>
     {/* Report FAB */}
   </Pressable>
- ) : (
-   <Pressable
-     onPress={() => Alert.alert('Sign in to report', ...)}
-     {/* Ghost FAB for guests */}
-   </Pressable>
- )}
)}
```

**Impact:**
- Guest users now see no Report FAB at all — they don't know the feature exists or why it's unavailable
- My D5 pre-approval required a **disabled visual affordance** (ghost FAB) with an explanation so users understand the gate is intentional and know how to sign in
- This is not a major privacy violation (guests still cannot report), but it is a UX regression that violates the explicit gate I set

**Why this matters:**
The ghost FAB serves a privacy purpose: it avoids requesting location permission from guests until they explicitly choose to sign in. Hiding the button entirely means we might request location permission in other contexts (e.g., a different screen), exposing the permission gate.

**Fix required:** Restore the ghost FAB with the sign-in prompt. The button should be visually disabled (low opacity) and tapping it should surface `Alert.alert('Sign in to report', ...)`.

---

## Test Coverage

**Heatmap tests (✅ intact):**
- `src/lib/__tests__/heatmap.test.ts` — covers k-floor behavior, cell bucketing, severity computation, centroid calculation
- All tests pass; k-anonymity conditions are verified in code

**EXIF/privacy tests (⚠️ modified):**
- `src/lib/__tests__/flags.test.ts` — the `detectMimeFromBytes` tests were removed
- The core EXIF stripping tests (`stripExifWeb`, `stripExifNative`, `verifyExifStripped`) are still present
- However, the gate itself is no longer tested because it was converted to a silent warning

**Push notification tests (❌ missing):**
- No tests for `send-push-notification` Edge Function
- The auth hardening and input validation cannot be verified

---

## Summary Table

| Condition | Status | Notes |
|-----------|--------|-------|
| **D5.C1 — k-anonymity floor** | ✅ PASS | Enforced at k≥3; tested |
| **D5.C2 — disclaimer banner** | ✅ PASS | Rendered when heatmap visible |
| **D5.C3 — no outbound sends** | ✅ PASS | Pure client-side, approved libraries only |
| **D5.C4 — no grid caching** | ✅ PASS | On-demand computation only |
| **D8 — EXIF gate** | ❌ REGRESSION | Silent warning instead of hard block |
| **A1 — Push auth hardening** | ❌ REGRESSION | Bearer token + oracle fix + validation removed |
| **Jordan Condition 2 — guest gate** | ❌ REGRESSION | Ghost FAB removed; privacy gate weakened |

---

## Decisions for Sky

1. **Do not merge this branch as-is.** The heatmap feature itself is privacy-compliant, but the regressions block launch.

2. **Three separate fixes required before merge:**
   - Restore EXIF upload gate in `src/lib/flags.ts`
   - Restore push notification auth hardening in `supabase/functions/send-push-notification/index.ts`
   - Restore guest user FAB + sign-in prompt in `src/screens/MapScreen.tsx`

3. **These regressions should not have been on this branch.** They affect pre-existing D8 and A1 hardening. Recommend Shamus (or whoever made these changes) document why they were modified and revert them as part of this review.

4. **Consider a follow-up audit** of all branches currently in flight (D4, D6, etc.) to confirm no other regressions were introduced during the May cycle.

---

## Appendix: D5 Pre-Approval (2026-05-25)

Reference: `qa-reports/2026-05-25-jordan-heatmap.md`

The pre-approval set four conditions:
- **C1:** K-anonymity floor (k≥3) — PASS
- **C2:** Mandatory disclaimer — PASS
- **C3:** Library vetting (no outbound sends) — PASS
- **C4:** No caching of derived grid data — PASS

The branch meets all D5 conditions. The regressions are unrelated to the heatmap feature and must be resolved independently.

---

**Next steps:** Route this report to Shamus + Sky. The three regressions require fixes on this branch before it can be merged. Once fixed, the heatmap feature is ready for integration into the main build pipeline.
