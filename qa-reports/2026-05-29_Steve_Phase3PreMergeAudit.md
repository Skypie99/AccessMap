# Steve — Phase 3 Pre-Merge Audit
**Date:** 2026-05-29  
**Author:** Steve (Safety & Robustness)  
**Scope:** All unmerged Phase 3 branches before landing on main  
**Integration branch audited:** `a11y/phase3-alex-premerge` (contains all Phase 3 changes including F1+F2 fixes)

---

## Branches Audited

| Branch | Commits vs main | Status |
|---|---|---|
| `feat/wave3-features` | 1 | ✅ Clean |
| `qa/coverage-sprint-phase3` | 2 | 🟡 1 fix needed (F3) |
| `security/pre-launch-hardening` | 2 | ✅ Clean |
| `a11y/phase3-polish` | 2 | ✅ Clean |
| `security/eas-json-pii-cleanup` | 3 | ✅ Clean |
| `design/a11y-phase3-fixes-2026-05-29` | 4 (spec only) | ✅ Specs applied by Alex |
| `a11y/phase3-alex-premerge` | integration | ✅ All blockers resolved |

---

## Findings

### ✅ F1 — WCAG 1.4.3 Contrast: `heroLabel` in ProfileScreen
**Status: FIXED** by Alex on `a11y/phase3-alex-premerge` (commit `3f72909`)  
**File:** `src/screens/ProfileScreen.tsx` — `heroLabel` style  

`heroLabel` had `fontSize: 11, fontWeight: '700'` with `color.pointsPillText` (`#dbe7fb`) on `color.brand` (`#2f80ed`). Contrast ratio was **3.10:1** — fails WCAG 1.4.3 (small text requires 4.5:1).

**Fix applied:** `fontSize` changed to `font.size.base` (14pt bold). At 14pt bold, WCAG classifies this as "large-scale text" which requires only 3.0:1. Actual ratio 3.10:1 **passes**. `heroSubtitle` was also corrected in the same commit.

**Verified:** `src/screens/ProfileScreen.tsx:1590` now reads `fontSize: font.size.base`.

---

### ✅ F2 — WCAG 1.4.4 Resize Text: ReportFlagModal action buttons unreachable
**Status: FIXED** by Alex on `a11y/phase3-alex-premerge` (commit `3f72909`)  
**File:** `src/screens/ReportFlagModal.tsx`  

The modal `card` View had no `maxHeight` and no scrollable content area. At Dynamic Type Large Accessibility scale, the Cancel + Report buttons were pushed off screen. WCAG 1.4.4 (Resize Text) requires functionality to remain available when text is scaled 200%.

**Fix applied:** `card` gains `maxHeight: '88%'`; all form content is wrapped in a `<ScrollView keyboardShouldPersistTaps="handled">` (`styles.scrollContent`, `flex: 1`); the `actions` View remains outside the ScrollView as a sticky footer. Matches the pattern in `designs/2026-05-29-report-modal-scrollview.md`.

**Verified:** `src/screens/ReportFlagModal.tsx:236–244` has the ScrollView; `styles.card` at line 593 has `maxHeight: '88%'`.

---

### 🟡 F3 — Test variable name typo: `mockMaybySingle` in points.test.ts
**Branch:** `qa/coverage-sprint-phase3` (Gary's worktree at `/private/tmp/gary-coverage-sprint`)  
**File:** `src/lib/__tests__/points.test.ts` — line 51  
**Status: NEEDS FIX before merge**

**Problem:**
```ts
// Line 51 — variable name typo (Mayby vs Maybe):
const mockMaybySingle = jest.fn();

// Line 73 — property key is correct, variable reference is misspelled:
mockPointsEq.mockReturnValue({ maybeSingle: mockMaybySingle });

// Lines 48 + 131 — comments also wrong:
// supabase.from(...).eq(...).maybySingle()   ← should be .maybeSingle()
```

The tests **pass** because the `{ maybeSingle: ... }` property key is correctly spelled and that's what Supabase resolves at runtime. The variable name `mockMaybySingle` is only confusing to future maintainers. Both comments on lines 48 and 131 also contain the same typo.

**Fix required on `qa/coverage-sprint-phase3` before merge:**
```
Rename: mockMaybySingle → mockMaybeSingle (globally in points.test.ts)
Fix comment lines 48, 131: .maybySingle() → .maybeSingle()
```

---

## Full Security Scan Results

### Hardcoded secrets / credentials
All branches: **None found.** Grep across all diffs for `key|secret|token|password|credential|api_key` with literal values returned zero results. The `security/eas-json-pii-cleanup` branch correctly converted the last hardcoded Apple identifiers (`appleTeamId`, `ascAppId`) to env vars (`$EXPO_APPLE_TEAM_ID`, `$EXPO_ASC_APP_ID`).

### HTTP vs HTTPS
All branches: **No `http://` calls in source code.** Confirmed by grep across all five diffs. The `security/pre-launch-hardening` report also verified this independently.

### Supabase queries without auth checks
`feat/wave3-features` `MyWatchedModal.load()` guards on `if (!user) return` before calling `loadWatched` / `fetchFlagsByIds`. Correct.  
No new Supabase queries introduced in other branches.

### NSLocationAlways* plist strings
`security/pre-launch-hardening` correctly removed both `NSLocationAlwaysUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription` from `app.json`. Privacy exposure eliminated.

### Privacy policy accuracy
`security/pre-launch-hardening` adds `docs/privacy-policy.html` which states GPS EXIF is stripped from all photos. Verified: `src/lib/flags.ts:58` defines `stripExifNative()` and `uploadFlagPhoto()` calls it with a post-strip `verifyExifStripped()` assertion. The claim is accurate.

---

## Error Handling Audit

### `feat/wave3-features` — MyWatchedModal
| Call | Handler | Assessment |
|---|---|---|
| `load()` — `loadWatched` + `fetchFlagsByIds` | `try/catch(e) → setLoadError(errorMessage(e, ...))` | ✅ Correct — shows error state with retry |
| `handleUnwatch` — `removeWatched` | `try {} catch { /* best-effort */ }` | ⚠️ Missing `console.warn` per project convention |
| `handleClearAll` — `clearWatched` | Same pattern | ⚠️ Same — see A3 advisory |

The `/* best-effort */` pattern is architecturally intentional (optimistic update already applied; a re-load re-syncs), but the project's CLAUDE.md error handling tier table specifies `console.warn` for AsyncStorage ephemeral writes. Filing as advisory only since the pre-existing version had the same behavior.

---

## Dead Code

All branches: **None found.** No `console.log` calls, no commented-out blocks, no unreachable imports in any diff.

---

## Type Safety

All branches: **No `any` types introduced.** `sortWatchedFlags` is strongly typed over `FlagRow[]` and `WatchedSort`. `ProfileScreen`'s `stats.byStatus` is `Record<FlagStatus, number>` initialized from `EMPTY_BY_STATUS` — `byStatus.verified` access is safe. Tests use proper generic jest mocks.

`npm run typecheck` on `a11y/phase3-alex-premerge`: **passes** (pre-existing `tsconfig baseUrl` deprecation warning only, not introduced by Phase 3 changes).

---

## Advisory Items (🟢 — document only, no code change needed)

### A1 — Android service account key still a TODO in eas.json
`"serviceAccountKeyPath": "TODO_PATH_TO_GOOGLE_SERVICE_ACCOUNT_KEY.json"` is in `eas.json` on both `main` and the cleanup branch. This pre-existed on main; Android CI submit is not wired. Safe to merge; `eas submit --platform android` will fail until this is resolved separately.

### A2 — Privacy policy has unfilled `[contact email]` and `[region]` placeholders
`docs/privacy-policy.html` and `docs/support.html` have placeholders highlighted in orange. The `docs/github-pages-setup.md` file documents this explicitly. Safe to merge to `main` for staging; must be filled before App Store submission.

### A3 — `handleUnwatch` / `handleClearAll` swallow errors without `console.warn`
`feat/wave3-features` `MyWatchedModal.tsx`: both catch blocks use `/* best-effort */` with no `console.warn`. Not a functional bug but misses the project's logging convention for AsyncStorage ephemeral write failures.

---

## Merge Checklist

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | F3: rename `mockMaybySingle` → `mockMaybeSingle` in `points.test.ts` | Gary | ❌ Needed |
| 2 | Merge `security/eas-json-pii-cleanup` | Rory | ✅ Green |
| 3 | Merge `security/pre-launch-hardening` | Rory | ✅ Green |
| 4 | Merge `a11y/phase3-polish` | Rory | ✅ Green |
| 5 | Merge `qa/coverage-sprint-phase3` (after F3 fix) | Rory | ❌ After F3 |
| 6 | Merge `feat/wave3-features` | Rory | ✅ Green |
| 7 | Merge `a11y/phase3-alex-premerge` (carries F1+F2 fixes) | Rory | ✅ Green |

---

## DECISIONS FOR SKY

None. All blockers resolved; F3 typo is a one-line rename Gary can apply before the coverage branch lands.
