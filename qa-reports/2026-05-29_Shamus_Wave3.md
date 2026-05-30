# Shamus — Wave 3 QA Report
**Date:** 2026-05-29
**Branch:** `feat/wave3-features`
**Commit:** a1490e4
**Role:** Shamus, Feature Development

---

## Pre-flight Audit

Before building, I audited the strategy doc and FEATURES.md to find what was
actually unbuilt at Wave 3 launch time. Most candidates were already done:

| Candidate | Status |
|---|---|
| Onboarding flow (OnboardingCards) | ✅ Already built + wired in App.tsx (FirstLaunchGate) |
| Profile stats row | ✅ Already had Reported + Resolved + tier + breakdown pills |
| Flag detail deep-link sharing | ✅ shareFlag.ts / webShare.ts already shipped |
| Heatmap | ✅ On `feat/heatmap-build-2026-05-29` awaiting merge |
| Web map clustering (Supercluster) | ✅ Already wired into PlatformMap.web.tsx |
| Watched Flags search/filter | ✅ Already in MyWatchedModal |
| **Watched Flags sort picker** | ❌ Not built — useMemo sorted by fixed order |
| **Watched Flags pull-to-refresh** | ❌ Not built — FlatList had no RefreshControl |
| **Profile "Verified" stat** | ❌ Not exposed — byStatus.verified was fetched but unused |

---

## What Was Built

### 1. MyWatchedModal — Sort Picker (Wave 3)

**File:** `src/components/MyWatchedModal.tsx`

Added user-controllable sort order to the Watched Flags list:

| Sort mode | Behaviour |
|---|---|
| Status (default) | Open → Verified → Resolved → Rejected; newest first within each group |
| Newest | Purely chronological, newest first |
| Oldest | Purely chronological, oldest first |
| Severity ↓ | Highest severity first; newest first as tiebreaker |

**Implementation notes:**
- `WatchedSort` type and `sortWatchedFlags()` pure function exported for testability
- Sort applied in `displayFlags` useMemo — changing sort never triggers a network refetch
- Sort chips (4 options) rendered as a horizontal ScrollView below the status filter chips
- Active chip: `brandSofter` background + 1px `brand` border; inactive: `surfaceNeutral`
- `≥44pt` minHeight on all chips (WCAG 2.5.5)
- `accessibilityState={{ selected: active }}` on each chip (VoiceOver / TalkBack)
- Sort resets to `'status'` when the modal re-opens (alongside search and status filter reset)
- Sort removed from `load()` — single source of truth in useMemo

### 2. MyWatchedModal — Pull-to-Refresh (Wave 3)

**File:** `src/components/MyWatchedModal.tsx`

Added `RefreshControl` to the FlatList with:
- `refreshing={loading}` drives the spinner
- `onRefresh={load}` re-fetches watched flag IDs + their rows
- `accessibilityLabel="Pull down to refresh watched flags"` for screen readers

### 3. ProfileScreen — 3-Stat Row (Wave 3)

**File:** `src/screens/ProfileScreen.tsx`

Expanded the stats row from 2 → 3 stats:

| Before | After |
|---|---|
| Reported · Resolved | Reported · Verified · Resolved |

- `stats.byStatus.verified` was already fetched in the existing `flags.select('status')` query — **zero additional network calls**
- `accessibilityRole="summary"` + combined `accessibilityLabel` groups the three numbers into one VoiceOver announcement: "Your stats: N reported, N verified, N resolved"

---

## Files Changed

| File | Change |
|---|---|
| `src/components/MyWatchedModal.tsx` | Sort picker + pull-to-refresh |
| `src/screens/ProfileScreen.tsx` | 3-stat row (add Verified) |
| `src/components/__tests__/MyWatchedModal.sort.test.ts` | New — 19 tests |

---

## Typecheck

```
npm run typecheck → clean (0 errors)
```

---

## Test Results

| Metric | Before Wave 3 | After Wave 3 |
|---|---|---|
| Test suites | 78 (1 flaky fail) | 79 (all pass) |
| Tests passing | 1211 | 1231 |
| New tests | — | +19 (MyWatchedModal.sort.test.ts) |
| Tests todo | 18 | 18 |

### New test coverage (MyWatchedModal.sort.test.ts — 19 tests)

- `newest`: returns newest first, single flag, non-mutation
- `oldest`: returns oldest first, reverse-of-newest property
- `severity`: sev5 before sev1, newest tiebreaker, equal-severity fallback
- `status`: open → verified → resolved → rejected, newest-within-status, default branch
- Edge: empty input (all 4 modes), single flag (all 4 modes)

---

## Accessibility

- Sort chips: ≥44pt, `accessibilityRole="button"`, `accessibilityState={{ selected }}`
- Pull-to-refresh: `accessibilityLabel` on RefreshControl
- Profile stat row: `accessibilityRole="summary"` + combined label groups stats

---

## No Schema or Migration Required

All changes are purely client-side:
- `byStatus.verified` already fetched via existing `flags.select('status')` query
- Sort is local (no server-side query changes)
- RefreshControl calls the existing `load()` function

---

## Branch Status

`feat/wave3-features` — commit `a1490e4`. Do NOT merge to main directly. Morgan schedules.
