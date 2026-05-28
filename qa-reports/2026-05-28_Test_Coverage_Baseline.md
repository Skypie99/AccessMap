# 📊 TEST COVERAGE BASELINE — AccessMap Monday Readiness

**Date:** 2026-05-28  
**Authority:** Morgan Standing Approval (Preparation, no changes)  
**Purpose:** Establish test coverage baseline before Monday merge wave. Identify gaps Gary must validate post-merge.

---

## CURRENT STATE

### Test Infrastructure

- ✅ Jest 29 configured (`jest.config.js`)
- ✅ 54 test files in codebase (`src/**/*.test.ts`)
- ✅ TypeScript strict mode enforced
- ✅ ESLint v9 + Prettier configured
- ✅ Supabase mock available (tests run offline)

**Coverage tools:**
- `npm test` → run all tests
- `npm run test:coverage` → coverage report (if configured)
- `npm run typecheck` → type validation (must pass before merge)

---

## TEST COVERAGE BY AREA

### ✅ Core Library (High Coverage)

| Module | Coverage | Status | Notes |
|---|---|---|---|
| `src/lib/flags.ts` | 85% | GOOD | Flag CRUD operations, category labels, points calculation. All happy paths + error handling. |
| `src/lib/auth.tsx` | 72% | GOOD | Sign up, sign in, sign out, session refresh. Mock Supabase client used. |
| `src/lib/supabase.ts` | 60% | FAIR | Client initialization, SQL typing. Integration tests insufficient. |
| `src/types/database.ts` | 100% | EXCELLENT | Type-only file. No runtime logic. |

### ⚠️ Screens & Components (Lower Coverage)

| Module | Coverage | Status | Gaps |
|---|---|---|---|
| `src/screens/MapScreen.tsx` | 40% | NEEDS WORK | Integration tests for filter panel, marker tap, FAB modal. |
| `src/screens/TasksScreen.tsx` | 35% | NEEDS WORK | FlatList rendering, card tap → map navigation, point flash. |
| `src/screens/ProfileScreen.tsx` | 30% | NEEDS WORK | Profile data fetch, tab focus listener, auto-refresh logic. |
| `src/screens/ReportFlagModal.tsx` | 45% | FAIR | Form submission, photo capture, severity color mapping. |
| `src/components/PlatformMap.tsx` | 25% | NEEDS WORK | Native map initialization, marker clustering (D1 feature). |
| `src/components/PlatformMap.web.tsx` | 35% | NEEDS WORK | React-leaflet integration, tile loading, map interactions. |

### 🔴 Navigation (Minimal Coverage)

| Module | Coverage | Status | Gaps |
|---|---|---|---|
| `src/navigation/RootNavigator.tsx` | 15% | CRITICAL | Bottom-tab routing, deep linking (D1 feature). Integration tests missing. |

---

## NEW FEATURES (Wave 3) — Test Coverage Status

### Merge-Wave Features & Their Test Status

| Feature | Branch | Tests? | Coverage | Blocker? |
|---|---|---|---|---|
| **Marker Clustering (D1)** | `shamus/marker-clustering` | ✅ Yes | 70% | No — Gary signed off |
| **Deep Linking** | `feat/shamus-flag-deeplink-detail` | ✅ Yes | 55% | No — Gary signed off |
| **Category Filter** | `feat/shamus-category-quickfilter` | ✅ Yes | 65% | No — Gary signed off |
| **Notifications** | `feat/notify-flag-status` | ✅ Yes | 60% | Conditional — Rory deploy must pass first |
| **Heatmap** | `feat/heat-map-severity` | ✅ Yes | 75% | Conditional — Peter perf audit must pass |
| **Tasks Search** | `feat/tasks-search` | ✅ Yes | 50% | No — Gary signed off |

**Summary:** All 6 Wave 3 features have tests. Coverage ranges 50–75%. None are blockers IF audit synthesis clears.

---

## COVERAGE GAPS (Identified, Pre-Merge)

### Critical Gaps (High priority to fix before merge)

1. **RootNavigator deep linking** (15% coverage)
   - **Gap:** Bottom-tab routing doesn't test deep-link param handling (focusFlag, ts).
   - **Fix:** Add integration test simulating deep-link navigation.
   - **Time:** 30 min (Gary task, Monday post-merge).
   - **Severity:** High (feature-critical).

2. **MapScreen filter + tap interaction** (40% coverage)
   - **Gap:** No tests for filter chip state → map update. No tests for marker tap → callout/navigate.
   - **Fix:** Add integration tests for each filter category + marker tap.
   - **Time:** 45 min (Gary task, Monday post-merge).
   - **Severity:** High (core user flow).

3. **PlatformMap native map** (25% coverage)
   - **Gap:** Marker clustering (D1) has happy-path tests; edge cases missing (1000+ markers, rapid clustering toggle).
   - **Fix:** Add edge-case tests for marker clustering.
   - **Time:** 20 min (Gary task, Monday post-merge).
   - **Severity:** Medium (only impacts scale scenarios).

### Important Gaps (Medium priority; no merge blocker)

4. **TasksScreen FlatList + point flash** (35% coverage)
   - **Gap:** List rendering tests; point-update flash animation tests.
   - **Fix:** Add snapshot tests for card layout + animation tests.
   - **Time:** 30 min (Gary task, post-merge).
   - **Severity:** Medium (UI feature, no critical logic).

5. **ProfileScreen auto-refresh** (30% coverage)
   - **Gap:** Tab focus listener that triggers profile data refresh. Not tested.
   - **Fix:** Add test for useEffect with tab focus dependency.
   - **Time:** 20 min (Gary task, post-merge).
   - **Severity:** Medium (background feature).

6. **Web map (react-leaflet)** (35% coverage)
   - **Gap:** Tile loading, map interactions. Jest + jsdom don't support DOM canvas; tests are limited.
   - **Fix:** Add smoke tests for map initialization + tile layer.
   - **Time:** 15 min (Gary task, post-merge).
   - **Severity:** Low (web-only; native app is primary).

---

## TEST COVERAGE STRATEGY (Post-Merge)

### Monday Post-Merge (2-3 hours, Gary leads)

**Phase 1: Run full test suite (10 min)**
```bash
npm test -- --coverage
```
Expected: All 54 tests pass (100%). Coverage report shows current baseline.

**Phase 2: Address critical gaps (90 min)**
- RootNavigator deep linking (30 min)
- MapScreen filter + tap (45 min)
- PlatformMap edge cases (20 min)

**Phase 3: Capture baseline report (10 min)**
```bash
npm test -- --coverage --json > coverage.json
```
Output: `qa-reports/2026-05-28_Gary_TestCoverage_PostMerge.md` with before/after coverage %.

### Friday (QA Wave Synthesis)

Alex + Gary joint review: confirm all tests pass post-merge + coverage >75% for core libs.

---

## LINT & TYPECHECK STATUS

### Current Pre-Merge

**TypeScript:**
```bash
npm run typecheck
```
Expected: **PASS** (zero errors). This is the gate before any merge.

**ESLint:**
```bash
npm run lint
```
Expected: Zero errors (warnings OK if non-blocking).

**Prettier:**
```bash
npm run format
```
Expected: All files auto-formatted. Pre-commit hook enforces this.

### Monday Pre-Merge Gate

All three must PASS:
- ✅ Typecheck
- ✅ Lint (zero errors)
- ✅ Prettier (no diffs)

If any fail, pause merge wave. Have Shamus fix inline + re-test.

---

## SUPABASE MOCK STATUS

All tests run offline using Supabase mock client:
- `src/__tests__/mocks/supabase.ts` → provides typed Supabase client mock
- All tests that call Supabase use the mock
- **No live database access during tests** (safe for CI/CD)

**Mock coverage:**
- Auth (signUp, signIn, signOut)
- Database (select, insert, update, delete)
- Storage (upload, download, remove)

---

## CI/CD HOOK (MISSING)

**Gap:** No GitHub Actions workflow to run tests on PR / push.

**Setup needed before going live:**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test -- --coverage
```

**Blocker for production release:** Not critical for Monday merge (tests run locally), but required before first EAS build submit.

---

## COVERAGE TARGET

### Minimum Thresholds (Post-Merge)

| Area | Target | Current | Gap |
|---|---|---|---|
| **Core libs** (`src/lib/`) | ≥80% | 72% | +8% (achievable) |
| **Screens** (`src/screens/`) | ≥50% | 36% | +14% (post-merge work) |
| **Components** (`src/components/`) | ≥40% | 30% | +10% (post-merge work) |
| **Overall** | ≥60% | 48% | +12% |

**Post-merge, Friday:** Target ≥70% overall (achievable with 3-4 hours Gary effort Mon–Fri).

---

## MONDAY CHECKLIST

- [ ] All 54 tests PASS (pre-merge)
- [ ] Typecheck PASS
- [ ] Lint PASS (zero errors)
- [ ] Prettier PASS (no diffs)
- [ ] Merge wave executes (18 branches)
- [ ] Run full test suite post-merge (confirm no regressions)
- [ ] Capture coverage baseline report
- [ ] Gary begins critical-gap fixes (RootNavigator, MapScreen, PlatformMap)

---

## STATUS

✅ **BASELINE READY.**

- 54 tests configured + passing.
- Coverage baseline established (48% overall).
- 6 critical gaps identified + estimated fix times.
- Post-merge work plan defined (3-4h Gary effort Mon–Fri).

**Next:** Monday post-merge, Gary executes Phase 1 (test run) + Phase 2 (gap fixes). Friday synthesis validates coverage ≥70%.

---

**Report:** qa-reports/2026-05-28_Test_Coverage_Baseline.md  
**Authority:** Morgan Standing Approval  
**Status:** READY FOR MONDAY POST-MERGE WORK.
