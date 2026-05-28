# Gary — Wave 2 coverage delta (2026-05-27)

**Branch:** `test/gary-wave2-2026-05-26`
**Baseline:** main @ `3c30d1e` (NOT `da54dd4` as briefed — see Section 1)
**Typecheck:** ✅ green before and after
**Test suite:** ✅ 872 → **922 passing** (+50 tests, 0 regressions)

---

## DECISIONS FOR SKY

### 1. Briefing accuracy — baseline drift

The handoff said "main is at `da54dd4`, 789/789 tests passing". Both numbers were stale:

| Claim | Reality |
|---|---|
| main HEAD | `3c30d1e` (28 commits ahead of `origin/main`); `da54dd4` is the original CachedTileLayer commit, long since merged |
| Test count | **872** passing before my work, not 789. 789 was the count at the end of the 2026-05-25 night sprint — Wave 6 (perf/edit-profile/notif-prefs/onboarding/leaderboard/etc.) has landed since |

Per my standing rule "verify PM handoff is fresh," I sanity-checked each claim before acting. Flagging here so Morgan can correct the dispatch plan source.

### 2. iMessage instruction — Constitutional conflict

The dispatch said "send an iMessage to Sky when done." Per global CLAUDE.md / Const. Art. 9.4, **only Morgan messages Sky, and only on a direct `/morgan` invocation**. As Gary I cannot iMessage Sky — hard prohibition. I did not send. Morgan picks this report up next briefing and decides whether to surface to Sky.

If Sky wants Gary (and other non-Morgan roles) to message directly, that's a Constitution amendment, not a per-task override — should go through `/morgan` or a Constitution edit, not embedded in a Gary dispatch.

### 3. Priority 1 + 2 were already covered

`tileCache.ts` and `CachedTileLayer` (PlatformMap.web.tsx) **already had comprehensive tests** when I started — landed in the cycle-4 gaps run on 2026-05-25 (commit `02ded70`, branch `test/auto-2026-05-25-gary-cycle4-gaps`). No work needed there.

| File | Existing test file | Cases covered |
|---|---|---|
| `src/lib/tileCache.ts` | `src/lib/__tests__/tileCache.test.ts` | cache miss, TTL expiry (Jordan C5), cache hit, `lastAccessed` update, LRU eviction (Jordan C4), per-user isolation, `clearTileCache` (Jordan C1) — 11 tests |
| `PlatformMap.web.tsx::CachedTileLayer.createTile` | `src/components/__tests__/CachedTileLayer.test.ts` | PATH-1 (no userId), PATH-2 (cache hit), PATH-3 (cache miss → fetch → FileReader → cache), PATH-4 (error fallback) — 17 tests across 4 paths |

If the dispatch plan still lists these as gaps, the plan is reading from a pre-2026-05-25 snapshot.

---

## What I shipped

3 new test files, all under `src/lib/__tests__/`, targeting genuine gaps in Wave 6/7 code.

### `recentlyViewed.test.ts` — 19 tests

Covers `src/lib/recentlyViewed.ts` (added 2026-05-25 in `bf39892` — Profile "Recently Viewed flags" row). AsyncStorage-mocked, same in-memory pattern as `addressRecents.test.ts`.

- `loadRecentlyViewed`: empty, round-trip, invalid JSON, non-array shape, non-string entries filtered, hard-cap at `RECENTLY_VIEWED_MAX` (10) on load, getItem throws
- `recordView`: front-insertion, dedupe (re-view bubbles to index 0), cap enforcement (oldest drops off), fire-and-forget on setItem failure
- `clearRecentlyViewed`: removes key, no-op on empty, throws absorbed
- `dropFromRecent`: removes single id, no-op when id absent (verified by `__peek` — does NOT rewrite storage), no-op when user has nothing stored, setItem failure absorbed
- Per-user isolation: alice's recents do not leak to bob; clearing alice does not touch bob

### `reportTemplates.test.ts` — 13 tests

Covers `src/lib/reportTemplates.ts` (added 2026-05-25 in `6794cfc` — quick-fill chips in ReportFlagModal). Pure data + one filter function.

- Static integrity: at least one template, unique ids, non-empty label/glyph, every category in `CATEGORY_ORDER`, every severity in `SEVERITY_ORDER`, description is null or non-empty (never empty string)
- `validReportTemplates()`: returns all today, preserves source order, returns a new array (not the source reference), every field carried through unchanged, every result still passes enum check, source array not mutated, shape conforms to `ReportTemplate`

This pins the integrity contract referenced in the source file's header comment ("every template's category is in CATEGORY_ORDER, severity in SEVERITY_ORDER … stale entries filtered out at runtime"). A future category rename now fails CI loudly instead of silently producing a broken chip.

### `userReportStats.test.ts` — 18 tests

Covers `src/lib/userReportStats.ts` (added 2026-05-25 in `504105c` — Profile "reports breakdown" card). Uses the same hoisted Supabase mock pattern as `flags.test.ts`.

- `emptyCategoryCounts` / `emptySeverityCounts`: every enum key present and zeroed, independent objects per call (no shared mutable state via top-level constant capture)
- `EMPTY_USER_REPORT_STATS`: total=0, byCategory and bySeverity zeroed for every enum value
- `fetchUserReportStats` happy path: single row, multi-row aggregation across category+severity, empty result, null `data` from Supabase
- Defensive aggregation: orphan rows (category/severity outside live enum) count toward `total` but NOT toward breakdowns — pins the "defensive against future enum migrations" behavior documented in the source
- Error + query shape: Supabase error rethrown to caller; queries `flags` table; selects only `category, severity` (no over-fetch); filters by `user_id` (belt-and-suspenders with RLS)

---

## Wave 7 Photo Review in Triage — coverage status

The Wave 7 work (photo-triage UI + lightbox modal) shipped at commit `a24b44a` on 2026-05-25. It is presentational React Native modal code (`PhotoLightboxModal.tsx`, photo thumbnail rendering inside `FlagDetailModal.tsx`) — no pure logic to unit-test without a renderer.

Existing coverage I found:
- Photo upload pipeline (`uploadFlagPhoto`) — covered in `flags.test.ts` via the Supabase mock
- High-severity photo nudge logic — covered indirectly via ReportFlagModal validation

What's still uncovered (propose-only):
- Lightbox swipe / pinch-to-zoom interactions — needs `@testing-library/react-native` (not installed)
- Thumbnail accessibility-label generation if any exists — would need to be extracted into a pure function first

Not blocking. The presentational code is small enough that the Gate-1/Alex pass on 2026-05-25 (PASS WITH NOTES) is reasonable coverage for now.

---

## Propose-only (not in this PR)

1. **`useUserLocation` hook tests** — requires `@testing-library/react-native`. The hook (`src/lib/location.ts`) is small but is React state + effects. Workaround: extract the platform branch logic (web Geolocation vs. expo-location native) into a pure async function and test that — would also let the privacy-gate `requireExistingPermission` behavior be pinned without a renderer. Not done here because it'd require touching production code in a "tests only" branch.

2. **`flagsStore.tsx` React context** — same renderer constraint.

3. **`reportTemplates` description-uniqueness check** — could add a "every description (where non-null) is unique" assertion to prevent two templates from suggesting the exact same copy, but the current product intent allows similar descriptions across categories so this would be a stricter contract than the source promises. Surfacing as a question for Quinn, not enforcing.

4. **Coverage measurement** — there's no `jest --coverage` step in CI yet. Once added, these three modules should jump to ~100% line coverage; would give Morgan a real coverage trend to plot.

---

## Files changed

```
src/lib/__tests__/recentlyViewed.test.ts      (new, +213 lines)
src/lib/__tests__/reportTemplates.test.ts     (new, +130 lines)
src/lib/__tests__/userReportStats.test.ts     (new, +225 lines)
qa-reports/2026-05-27_Gary_Wave2_CoverageDelta.md  (this report)
```

Zero changes to production code. Branch is ready for Gate-1 / Sky merge.

---

## For Morgan

- Dispatch plan referenced stale baseline (`da54dd4`, 789 tests). Update source.
- Constitutional conflict: dispatch instructed a non-Morgan role to iMessage Sky. Either tighten dispatch templates or amend Const. Art. 9.4.
- Tier-1 priorities (tileCache, CachedTileLayer) were already covered — Wave 7b cycle-4-gaps run already shipped this. Reflect in TASK_GRAPH.json so future Gary cycles don't duplicate.
- Three Wave 6/7 source files (`recentlyViewed`, `reportTemplates`, `userReportStats`) had no tests; this branch closes that gap.
