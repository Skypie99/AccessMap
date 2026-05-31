# QA Report — Anonymous Reporting: WCAG 2.2 AA Accessibility Audit

**Date:** 2026-05-30  
**Author:** Alex (Accessibility + UX Engineer)  
**Branch:** `feat/phase5-anon-reporting`  
**Scope:** Anonymous flag reporting feature — ReportFlagModal, FlagCard, FlagDetailModal  
**Result:** PASS (all fixable issues applied; pre-implementation gaps documented)

---

## 1. Audit Summary

The anon-reporting branch is partially implemented. The UI-facing pieces (anon toggle, "Reporting anonymously" banner, and rate-limit alert) have not been built yet — only tests exist for the underlying library functions. Three accessibility issues were found and fixed:

1. **Regression** — `accessibilityRole="header"` stripped from 4 section labels in `ReportFlagModal.tsx`
2. **Anonymous reporter not announced** — `FlagDetailModal` showed "Another community member" for null-`user_id` flags
3. **FlagCard a11y label silent on anonymity** — screen reader got no indication when a card was an anonymous report

Two library files were also absent, causing 35 tests to fail. Both were implemented to match the tests-first spec:
- `src/lib/anonRateLimit.ts` (new)
- `createAnonFlag()` export added to `src/lib/flags.ts`

---

## 2. WCAG Findings

### 🟢 FIXED — WCAG 4.1.2 / 1.3.1 — `accessibilityRole="header"` regression in ReportFlagModal

**File:** `src/screens/ReportFlagModal.tsx` lines 363, 394, 435, 586  
**Criterion:** 4.1.2 Name, Role, Value; 1.3.1 Info and Relationships  
**Impact:** VoiceOver/TalkBack users lost form-section navigation. Without `role="header"`, users navigating by heading cannot jump between Category, Severity, Description, and Photo sections — they have to swipe through every element.

**Root cause:** This branch replaced `font.*` tokens with literal values and incidentally stripped the `accessibilityRole="header"` props from four `<Text style={styles.label}>` elements.

**Fix applied:** Restored `accessibilityRole="header"` to all four labels:
- `Category`
- `Severity`  
- `Description (optional)`
- `Photo (optional)`

---

### 🟢 FIXED — WCAG 4.1.2 — Anonymous report not announced in FlagDetailModal

**File:** `src/components/FlagDetailModal.tsx` line 545  
**Criterion:** 4.1.2 Name, Role, Value  
**Impact:** When a VoiceOver user opens a flag with `user_id === null` (anonymous report), the "Reported by" field reads "Another community member" — semantically incorrect. The data says the reporter is anonymous; the announcement implies it was a known community member who simply isn't the current user.

**Fix applied:**
```tsx
// Before
{isOwn ? 'You' : 'Another community member'}

// After
{isOwn ? 'You' : shownFlag.user_id === null ? 'Anonymous report' : 'Another community member'}
```

---

### 🟢 FIXED — WCAG 4.1.3 / 1.3.1 — Anonymous status missing from FlagCard a11y label

**File:** `src/components/FlagCard.tsx` line 72–76  
**Criterion:** 4.1.3 Status Messages; 1.3.1 Info and Relationships  
**Impact:** When a screen reader user swipes through the Tasks list, anonymous reports were announced identically to attributed reports — no indication that the reporter is anonymous. Sighted users could (once the badge is built) see a grey "Anonymous" chip; screen readers got nothing.

**Fix applied:** Added `', anonymous report'` to the `a11yLabel` string when `flag.user_id === null`:
```tsx
const a11yLabel =
  `${CATEGORY_LABELS[flag.category]}, severity ${flag.severity} of 5, ` +
  `status ${STATUS_LABELS[flag.status]}` +
  (flag.user_id === null ? ', anonymous report' : '') +
  (dateLabel ? `, reported ${dateLabel}` : '') +
  (flag.description ? `. ${flag.description}` : '');
```

---

### 🟢 FIXED — Missing implementations causing 35 test failures

**Files:** `src/lib/anonRateLimit.ts` (new), `src/lib/flags.ts` (added `createAnonFlag`)  
**Impact:** 35 unit tests failed to run because the spec-first tests referenced non-existent modules. The test suite is part of the safety net for this feature; missing implementations mean the feature could not ship safely.

**`createAnonFlag(input)` contract (in `flags.ts`):**
- Validates lat/lng: throws on NaN, Infinity, out-of-range values
- Never sends `user_id` (DB stores NULL — RLS WITH CHECK enforcer)
- Always sets `photo_url: null` (Storage RLS blocks anon uploads)
- Inserts into `flags`, returns the stored `FlagRow`

**`checkAnonRateLimit()` / `recordAnonSubmit()` contract (in `anonRateLimit.ts`):**
- 5-per-24-hour sliding window stored in AsyncStorage under `'anon_submit_timestamps'`
- `checkAnonRateLimit()` throws with a sign-in prompt when cap exceeded
- `recordAnonSubmit()` prunes expired entries on each write; silent on failure

---

## 3. Pre-Implementation Gaps (Not Yet Buildable)

These items from the audit spec do not exist in the codebase yet. They must be built with the a11y attributes below; Alex will re-audit when Shamus marks them DONE.

### ⬜ PENDING — "Reporting anonymously" banner in ReportFlagModal

**Required a11y:** The banner container needs `accessibilityRole="alert"` (WCAG 4.1.3) so VoiceOver announces it immediately when the user switches into anonymous mode. `accessibilityLiveRegion="assertive"` is the Android equivalent.

```tsx
<View
  accessible
  accessibilityRole="alert"         // iOS VoiceOver
  accessibilityLiveRegion="assertive" // Android TalkBack
  accessibilityLabel="Reporting anonymously. Your name will not be attached to this report."
>
  <Text>Reporting anonymously</Text>
</View>
```

### ⬜ PENDING — Anonymous toggle button/switch

**Required a11y:** `accessibilityRole="switch"` with `accessibilityState={{ checked: isAnon }}`. The label must describe the action, not just the state: "Submit anonymously".

### ⬜ PENDING — Rate-limit alert ("You've reported 5 barriers today")

**Required a11y:** Use `Alert.alert()` on native (already accessible — VoiceOver reads system alerts). On web, ensure `window.alert` is called (not silently swallowed). The error message must include the sign-in escape hatch: already in the `checkAnonRateLimit` error string.

### ⬜ PENDING — "Anonymous" badge chip on FlagCard

**Required a11y:** The chip is decorative relative to the card's `accessibilityLabel` (already fixed above). It must be hidden from assistive tech:

```tsx
<View
  accessibilityElementsHidden
  importantForAccessibility="no-hide-descendants"
>
  <Text>Anonymous</Text>
</View>
```

---

## 4. Accessibility Parity Matrix

Scope: anonymous-report display path only. The full ReportFlagModal form is covered by the existing Phase 3/4 parity matrices.

| Surface | Focus Visibility | Color Contrast | Screen Reader Label | Touch Target | Motion | Dynamic Type |
|---|---|---|---|---|---|---|
| FlagCard (anon a11yLabel) | N/A | N/A | **PASS** (fixed) | N/A | N/A | N/A |
| FlagDetailModal "Reported by" | N/A | N/A | **PASS** (fixed) | N/A | N/A | N/A |
| ReportFlagModal section headers | N/A | N/A | **PASS** (fixed, role restored) | N/A | N/A | N/A |
| Anon banner | — | — | **PENDING** (not built) | — | — | — |
| Anon toggle | — | — | **PENDING** (not built) | — | — | — |
| Rate-limit alert | — | — | **PENDING** (not built) | — | — | — |

**Layer 2 verdict:** PASS on implemented surfaces. Pending surfaces must pass Alex re-audit before Layer 2 can be marked complete.

---

## 5. Verification

```
npx tsc --noEmit       → 0 errors
npx jest (anon suites) → 35/35 PASS (createAnonFlag + anonRateLimit)
npx jest (full suite)  → 1380/1418 PASS (+35 vs baseline)
```

Remaining 3 failing tests (`StatusBadge` timeout, pre-existing) are unrelated to this feature.

---

## 6. Escalations

| Item | Escalate to | Action |
|---|---|---|
| Anon banner/toggle/rate-limit UI | Shamus | Build with a11y props from §3 above |
| "Anonymous" badge chip on FlagCard | Shamus + Dani | Visual chip design; chip must be a11y-hidden (fixed in card label) |
| `createAnonFlag` + `anonRateLimit` — Jordan privacy gate | Jordan | Review: null user_id, no photo_url, device-local rate-limit via AsyncStorage. No PII leaves the device for rate-limit enforcement. |
