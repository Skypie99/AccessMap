# Gary — Phase 5 Coverage Audit
**Date:** 2026-05-31 | **Branch:** main | **Commit:** bb74454

---

## Baseline (before this audit)

| Metric | Before | After |
|---|---|---|
| Test Suites | 94 | 94 |
| Tests (passing) | 1,504 | 1,530 |
| Tests (todo) | 136 | 136 |
| Statements | 85.24% | **86.97%** |
| Branches | 83.30% | **84.81%** |
| Functions | 86.47% | **87.39%** |
| Lines | 85.42% | **87.17%** |

Global threshold (80%) — **PASSING**.

---

## Phase 5 Files — All ≥80% ✅

| File | Statements | Branches | Status |
|---|---|---|---|
| `src/lib/pointEvents.ts` | 100% | 100% | ✅ |
| `src/lib/anonRateLimit.ts` | 100% | 100% | ✅ |
| `src/lib/reputationTier.ts` | 95% | 100% | ✅ |
| `src/lib/onboarding.ts` | 100% | 100% | ✅ |
| `src/lib/onboardingState.ts` | 100% | 100% | ✅ |
| `src/lib/contextTags.ts` (seasonal/disability) | 100% | 100% | ✅ |

`reputationTier.ts` line 84 is the defensive `return REPUTATION_TIERS[0]` fallback after a loop whose Bronze/0-threshold floor makes the branch provably unreachable. Not worth chasing.

`src/screens/ReportFlagModal.tsx` is excluded from coverage scope (`jest.config.js` excludes `src/screens/**` — screens require a native runtime). The existing `ReportFlagModal.test.tsx` suite passes.

---

## Coverage Improvements Made

### feedback.ts — 57% → 100%
Added `sendFeedback` and `openFeedbackComposer` tests covering:
- iOS path: `canOpenURL` true → `{status: 'opened'}`
- iOS path: `canOpenURL` false → `{status: 'unavailable'}`
- Web path: skips canOpenURL check
- `openURL` throws → `{status: 'error'}`
- `openFeedbackComposer` alert shown on unavailable/error

### feedbackFilter.ts — 64% → 100%
Added 11 tests for `filterFeedbackByQuery` (free-text AND-search):
- Empty/whitespace pass-through
- Single-token match
- Multi-token AND logic
- Case-insensitive
- Empty items list
- Whitespace normalization

### users.ts — 68% → 95%
Added 7 tests for `updateUserProfile` validation:
- Trims whitespace from display_name
- Converts whitespace-only to null
- Accepts null (clear name)
- Throws on >60 chars
- Accepts exactly 60 chars
- Returns saved UserRow on success
- Throws Supabase error on DB failure

Remaining uncovered: lines 78, 82, 88 — native EXIF stripping branches in `uploadAvatar` that require a real device runtime. Branches: 76.92%.

---

## Pre-existing Failures Fixed

### theme.test.ts — 7 failing tests from Dani's Phase 5 color token update

Tests were pinning pre-Phase-5 hex values. Updated to match the new "Wayfinder Blue" design system:

| Token | Old | New |
|---|---|---|
| `color.brand` | `#2f80ed` | `#1466E0` |
| `color.brandText` | `#1c4f99` | `#0F53BE` |
| `color.brandTextAlt` | `#1a4fa3` | `#0E4499` |
| `color.brandSofter` | `#eaf3ff` | `#EEF4FE` |

Design changes noted:
- **brand now passes small-text AA** (5.24:1 > 4.5:1) — the old test was documenting brand failed AA; that's no longer true. Test updated to document brand as AA-safe.
- **statusVerifiedFg decoupled from brandText** — now `#067A56` (semantic green for Verified badge). Added a new assertion confirming this intentional decoupling.

---

## Phase 6 Scaffold Tests — Already Committed

Three test files were in a previous merge (e0ebc6f) and confirmed passing:
- `src/components/__tests__/wave6.test.tsx` — RankBadge, CommentBubble, RealtimePulse stubs
- `src/lib/__tests__/riley-phase6.test.ts` — offline queue, severity guidance, reopen RPC stubs
- `src/screens/__tests__/MapScreen.heatmap.test.tsx` — heatmap screen integration stubs

---

## Remaining Below-80% Files (pre-existing, non-Phase 5)

These are carry-forward from before Phase 5. Not fixed in this cycle:

| File | Statements | Branches | Lines uncovered |
|---|---|---|---|
| `featureFlags.ts` | 0% | 0% | 20–77 (never imported in tests) |
| `admin.ts` | 0% | 0% | 12–42 |
| `location.ts` | 0% | 0% | 56–153 (device GPS API) |
| `flags.ts` | 72.62% | 72.76% | 129–208, 319–365, 530–533, 569, 572, 575, 956–970 |
| `geocode.ts` | 78.57% | 82.14% | 87–97 |

`featureFlags.ts`, `admin.ts`, `location.ts` at 0% because they depend on device APIs or admin role — hard to test without a real runtime. Recommend adding to a coverage exclusion list so they don't silently drag down the average.

---

## DECISIONS FOR SKY

None. All tests pass. Global threshold is 80%; actual is 87%. Safe to ship.

**Optional next step:** Add `featureFlags.ts`, `admin.ts`, `location.ts` to `collectCoverageFrom` exclusions in `jest.config.js` to avoid future confusion about 0% files that are intentionally untestable.
