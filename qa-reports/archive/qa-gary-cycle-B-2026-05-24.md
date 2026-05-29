# Gary — Test-coverage gap analysis for Cycle B — 2026-05-24

Role: Gary the QA Engineer
Mode: Read-only — gap analysis only, NO code or test changes
Scope: 5 feature branches from Cycle B on top of main HEAD `5b982ec`
Test framework: Jest
Convention: pure lib functions are unit-tested; component logic is not

## Summary

Coverage across all five new libs is strong on the **happy path + most named edge cases**, but each lib has at least one
useful gap that would let a regression land silently. The single most fragile gap is in **`directionsLink`**, which never
calls `new URL(...)` on the iOS/Android variants and has zero coverage for the web round-trip on the (0, 0) "null island"
or for any input that would be considered out-of-range by a maps app (lat > 90, lng > 180). The largest absolute number
of gaps is in **`dataExport`** — 17 tests is a lot, but the format string is very large and several real-world inputs
(extreme display names, multi-line descriptions, contact_email, a category that lands outside the labeller map) are
unspec'd.

Total gaps identified: **27** across the 5 libs.
Weakest lib: **`directionsLink`** (smallest absolute gap count but the gaps include genuine URL-validity holes).
Densest lib: **`dataExport`** (largest absolute gap count — 9 missing tests).

## Branch-by-branch gaps

### directionsLink (R2)

**Branch:** `feat/get-directions-2026-05-24`
**File:** `src/lib/directionsLink.ts` (38 LOC, 1 export)
**Tests reported:** 15
**Tests in file:** 14 `it(...)` blocks, organized into 5 describe groups.

**What's well covered**
- All three platform branches (iOS / Android / web) verified.
- Sign handling: positive, negative-lat, negative-lng, both-negative, (0, 0).
- 6–7-decimal precision preserved.
- No-whitespace invariant per platform.
- `URL` constructor parse-and-introspect — but ONLY for the web variant.
- `Platform.OS` fall-through when `platformOverride` is omitted.

**Gaps**

1. **iOS / Android URL parse round-trip is not exercised.** The web URL is parsed via `new URL(...)` and assertions are
   made on protocol/host/path/query, but the `maps:` and `geo:` URLs are only matched against a regex. A regression that
   produced `maps:?daddr=` with no comma, or `geo:` with a swapped lat/lng, would still pass the regex if you slipped a
   typo into the format string. The regex is a weaker invariant than parse-and-extract. Worth at least:
   `expect(new URL(iosUrl).protocol).toBe('maps:')` and `expect(new URL(iosUrl).searchParams.get('daddr')).toBe('lat,lng')`.

2. **No "very large coords" case** (lat > 90, lng > 180, lat < -90, lng < -180). The formatter is a pure pipe and won't
   reject these, but a snapshot would document the contract (the function happily emits them; rejection is the caller's
   job).

3. **No "1e-10 precision / 10-decimal lat-lng" case.** The tests cover 6–7 decimals but the comment in the file says
   "any rounding here would push the user onto the wrong block." A test that passes lat with 10 decimals and asserts
   `toContain('.1234567890')` would lock in "no rounding ever."

4. **`platformOverride === undefined` is only exercised once and not asserted against the explicit web URL.** The current
   test says "exact value doesn't matter — we only need to confirm that omitting the argument yields a valid URL
   containing the coords." Since the Jest harness reports web for RN, the assertion COULD be `expect(url).toBe('https://...')`
   — a stronger invariant that would break if Platform.OS started mocking to ios/android in the test runner config.

5. **No test that the function is referentially-transparent for identical inputs.** A regression that introduced
   `Math.random()` or a clock read would not be caught. (Low priority — the function visibly has no such reads — but a
   one-liner `expect(getDirectionsUrl(1, 2, 'ios')).toBe(getDirectionsUrl(1, 2, 'ios'))` would lock it in.)

### reputationTier (T4)

**Branch:** `feat/reputation-tier-2026-05-24`
**File:** `src/lib/reputationTier.ts` (86 LOC, 3 exports: `REPUTATION_TIERS`, `getTier`, `pointsToNextTier`)
**Tests reported:** 32
**Tests in file:** 32 `it(...)` blocks across 6 describe groups.

**What's well covered**
- Catalog: 4-entry length, name-order, full-shape matchObject for each tier.
- **Threshold-chaining invariant** (each tier's `nextThreshold === next tier's threshold`) IS already tested — this is
  better than what I'd suggested might be missing.
- `getTier` boundary behavior at 0, 9, 10, 49, 50, 199, 200, 1000.
- `getTier` defensive: negative, undefined, null, NaN, +Infinity, -Infinity.
- `getTier` returns matching label + emoji for every tier.
- `pointsToNextTier` at 0, 9, 10, 49, 50, 199, 200, 1000.
- `pointsToNextTier` defensive: negative, undefined, null, NaN.

**Gaps**

1. **No tier-NAME-uniqueness invariant.** The catalog test verifies the exact 4 names in order, but doesn't say "no
   duplicate names" as a standalone invariant. A future edit that copy-pasted a row and forgot to rename it would
   change `toEqual([...])` to fail with a confusing diff. Cleaner: `expect(new Set(REPUTATION_TIERS.map(t => t.name)).size).toBe(REPUTATION_TIERS.length)`.

2. **No threshold-MONOTONICITY-ONLY invariant.** Chain test (`cur.nextThreshold === nxt.threshold`) covers chaining,
   but not the standalone "every tier threshold is strictly greater than the previous." If someone edits the array
   and accidentally swaps `silver.threshold = 50, gold.threshold = 10`, the chain test would fail in a confusing
   way (`nextThreshold` mismatch) but a direct `expect(tiers[i+1].threshold > tiers[i].threshold).toBe(true)` would
   surface the typo immediately.

3. **No threshold-snapshot.** The `toMatchObject({ threshold: 0, nextThreshold: 10, ... })` block IS effectively a
   snapshot, but if a future PR adds a fifth tier (Diamond, 500) the existing test would still pass for the four old
   tiers — there's no `expect(REPUTATION_TIERS).toMatchSnapshot()` or numeric-only snapshot to catch threshold drift on
   the existing four. (Mild — already tested via per-tier matchObject, so this is just belt-and-suspenders.)

4. **`pointsToNextTier(Infinity)` and `pointsToNextTier(-Infinity)` not exercised** even though `getTier(Infinity)` and
   `getTier(-Infinity)` ARE. Should return 10 by symmetry with the other defensive cases.

5. **No test for `pointsToNextTier(0)` returning 10 AND for the user being in Bronze** (the existing test asserts the
   number but doesn't assert that getTier and pointsToNextTier agree about which tier the user is in).

### filterPresets (F4-wire)

**Branch:** `feat/filter-presets-apply-2026-05-24`
**File:** `src/lib/filterPresets.ts` (extends an existing file, adds `presetSummary` + several CRUD helpers + IO)
**Tests reported:** "4 tests for new `presetSummary`"
**Tests in file:** 4 `it(...)` blocks under the `presetSummary` describe — confirmed; the rest of the test file (CRUD,
IO) is from earlier work in the same branch series.

**What's well covered for `presetSummary`**
- Empty categories → "All categories · severity ≥<M>".
- Singular: 1 category → "1 category · severity ≥<M>" (singular noun).
- Plural: 3 categories → "3 categories · severity ≥<M>" (plural noun).
- Status-independence: passing different `statusFilter` arrays produces the same string.

**Gaps**

1. **Severity 1 (the minimum) is exercised in test #1 but not on a non-empty categories case.** The "All categories"
   test happens to use `minSeverity: 1`, but no test uses `minSeverity: 1` with a non-empty category list — so the
   "severity ≥1" rendering on the plural path isn't explicitly locked.

2. **Severity 5 (the maximum) is never tested.** A regression that capped severity at 4 in the formatter wouldn't be
   caught.

3. **Order-stability of the summary.** `presetSummary({ categories: ['a','b'] })` vs
   `presetSummary({ categories: ['b','a'] })` should produce the SAME string (the count is order-independent). No test
   asserts this. Currently it's safe because the formatter only reads `length`, but the test would lock the contract.

4. **No "many categories" boundary** — e.g. 10 categories. Not a real risk (the formatter just reads `length`), but a
   snapshot at a realistic size (e.g. 6 — the full category vocabulary) would document the expected output.

5. **No test that the summary string is ASCII-safe / has no trailing/leading whitespace.** Tests assert exact strings,
   so this is implicitly checked — but a regression that added `\n` or non-breaking space wouldn't be caught
   downstream by the SR / row layout. (Low priority.)

### taskSelection (Bulk)

**Branch:** `feat/tasks-bulk-select-2026-05-24`
**File:** `src/lib/taskSelection.ts` (95 LOC, 6 exports: `EMPTY_SELECTION`, `toggleId`, `clearSelection`,
`enterSelectionWith`, `isSelected`, `count`)
**Tests reported:** 15
**Tests in file:** 16 `it(...)` blocks across 6 describe groups.

**What's well covered**
- `EMPTY_SELECTION` starts inactive with no ids.
- `enterSelectionWith` flips to active with one id picked.
- `toggleId` adds an absent id at the end; removes a present id; preserves order; is its own inverse; preserves `active`.
- The "first selected first" order invariant IS tested (in the "preserves the order of the first-selected ids" test).
- `isSelected` against populated and empty selections.
- `count` matches `selectedIds.length`.
- `clearSelection` from active and from `EMPTY_SELECTION`; no input mutation.

**Gaps**

1. **`toggleId` on an id-not-in-selection of an inactive-empty state does NOT return same input by reference.** The
   contract per the file is "returns a NEW state every time" — but for FlatList identity (re-render skip), a referential-
   equality test like `expect(toggleId(EMPTY_SELECTION, 'a')).not.toBe(EMPTY_SELECTION)` would lock the always-new
   invariant. (More importantly: the IS-IN-SELECTION case where toggle REMOVES the id from a single-item state should
   yield SOMETHING equal to `EMPTY_SELECTION` shape — but is it the same reference? Per the code it's NOT — it's a new
   object — and that's fine, but the test should assert "deep-equal but not reference-equal" so a future optimization
   doesn't inadvertently change behavior.)

2. **`enterSelectionWith(id)` followed by `toggleId(state, id)` should yield an EMPTY-shaped state (active=true,
   selectedIds=[]).** This is currently NOT tested. It exercises a real user flow: long-press to start selecting → tap
   the same card to deselect. The result should leave `active: true` (so the user can pick a different card) with no
   ids — the existing tests cover toggle-add-then-toggle-remove on 2-element lists but not on the 1→0 transition where
   the post-state matters for whether the toolbar shows "Cancel" or auto-dismisses.

3. **`clearSelection(EMPTY_SELECTION)` returns reference-identical state (since the function returns the frozen
   `EMPTY_SELECTION` directly).** This IS exercised functionally but not with `toBe` (reference equality). A test like
   `expect(clearSelection(EMPTY_SELECTION)).toBe(EMPTY_SELECTION)` would lock the always-same-reference invariant the
   file comment promises.

4. **No large-N test.** The file says `isSelected` is O(N) but n is tiny. A functional test at N=1000 (not a perf test,
   just "still correct") would document the contract holds. Low priority.

5. **No test that `EMPTY_SELECTION` is actually frozen.** `Object.isFrozen(EMPTY_SELECTION) === true` and
   `Object.isFrozen(EMPTY_SELECTION.selectedIds) === true`. Without this, a future refactor that drops `Object.freeze`
   would silently break the "frozen" invariant the file promises.

6. **No test for `count(state)` on a multi-id selection independently of the rest of the toggle flow.** The existing
   test does cover it (`count({ active: true, selectedIds: ['a', 'b', 'c'] })`), so this is fine — withdrawn.

### dataExport (Export)

**Branch:** `feat/data-export-2026-05-24`
**File:** `src/lib/dataExport.ts` (135 LOC, 1 export: `formatDataExport` + a `FeedbackRow` type)
**Tests reported:** 17
**Tests in file:** 17 `it(...)` blocks across 4 describe sections.

**What's well covered**
- Header / profile: full populated, all-missing fallbacks ("(no email on file)", "(not set)", `Points: 0`).
- REPORTS: empty list → "(none yet)"; fully-populated single flag; description = null omitted; description = whitespace
  only omitted.
- All 6 category labels rendered.
- All 5 severities (1-5) rendered.
- All 4 status enum values (open / verified / resolved / rejected) rendered.
- Flags sorted newest-first regardless of input order.
- FEEDBACK: undefined → "FEEDBACK: not enabled" sentinel; empty array → "FEEDBACK (0 items): (none yet)";
  newest-first ordering on populated array.
- Determinism: same input → same output.
- "(End of export)" sentinel.
- Mixed real-world payload with both sections populated.
- Malformed `created_at` falls back to the raw string and the export still renders.

**Gaps**

1. **No test that `contact_email` on a feedback row is or isn't rendered.** The `FeedbackRow` type has `contact_email`
   but the formatter ignores it. This is intentional (the user's email is already in the header), but a test that asserts
   `expect(out).not.toContain('contact-test@example.com')` when a feedback row has a contact_email would document the
   choice and catch a regression that started leaking it.

2. **No test for a multi-line description.** The formatter does `f.description?.trim()` then writes it as a single
   line via `lines.push('    ' + desc)`. A real user description with embedded `\n` would render with NO indent on
   continuation lines — would look broken in the export. Worth a snapshot: input description `'line one\nline two'`,
   expected output `'    line one\nline two'` (note: line two has no leading indent — this is what the formatter
   actually does; testing it locks the contract one way or the other).

3. **No test for a very long description (e.g. 5000 chars).** Same concern — does the formatter wrap, truncate, or pipe
   through? It currently pipes through, which means a single huge flag could make the export hard to scan. The contract
   is "pipe through verbatim" — a 5000-char test that asserts the full string survives would lock it.

4. **No test for a category value that doesn't have a `categoryLabel` mapping (e.g. `categoryLabel` returns `undefined`).**
   The test labeller is exhaustive; a real labeller might return `undefined` for a new enum value added on the server.
   The current code would render "undefined" as the category text. A test that asserts this (or, better, surfaces it as
   a gap to fix) would catch the regression.

5. **No test for `display_name` containing special characters** (emoji, multi-byte, leading/trailing whitespace, or a
   string that LOOKS like a header — e.g. "REPORTS"). The formatter doesn't escape or trim — a name of "REPORTS (10
   flags):" would create ambiguity in the output. Probably fine (the user owns the consequence), but worth a test.

6. **No test for `email` containing special characters / unicode.** Same concern.

7. **No test for `points: -1`, `points: NaN`, `points: Infinity`** — the formatter does `input.user.points ?? 0` so
   only null/undefined fall back. A `-1` or `NaN` would render as `Points: NaN`. Worth deciding the contract.

8. **No test for `lat` / `lng` of extreme precision.** `f.lat.toFixed(6)` always produces 6 decimals — but a `lat` of
   `49` becomes `49.000000` which IS what we want. A test on round-number coords would lock this.

9. **No test for `lat` / `lng` of `NaN` or `Infinity`.** `toFixed` on `NaN` is `"NaN"`. Unlikely from the DB but
   defensive.

10. **No test for the empty-state where flags=[] AND feedback=[].** The mixed-payload test covers both populated; the
    individual tests cover each alone. The double-empty case (a brand-new user with no data) would render two "(none
    yet)" lines — partially covered by the empty-feedback test but worth a dedicated assertion.

11. **No test that the export ends with EXACTLY ONE trailing newline before "(End of export)".** Looking at the code:
    `lines.push('')` before "(End of export)" produces a blank line. A snapshot of the tail would lock the trailing
    whitespace convention.

## Recommended tests (consolidated, priority order)

**Tier 1 — would catch real silent regressions:**

1. `dataExport`: Multi-line description rendering test (#2 above). Real user input could produce surprising output.
2. `dataExport`: `categoryLabel` returns `undefined` test (#4). The format would render literal "undefined" — worth
   surfacing the contract.
3. `directionsLink`: Parse-and-extract iOS and Android URLs (not just regex match) (#1). Catches typos in the format
   string the regex misses.
4. `reputationTier`: Name-uniqueness invariant (#1). Catches a copy-paste typo when adding a new tier.
5. `dataExport`: `points: NaN` / `Infinity` test (#7). The formatter doesn't defend against these.

**Tier 2 — locks an invariant the file promises but the test doesn't assert:**

6. `taskSelection`: `Object.isFrozen(EMPTY_SELECTION)` test (#5). The frozen invariant is load-bearing for the
   "stray-mutation surfaces loudly" promise.
7. `taskSelection`: `enterSelectionWith(id) → toggleId(state, id)` should yield `{active: true, selectedIds: []}` (#2).
   Real user flow.
8. `taskSelection`: `clearSelection(EMPTY_SELECTION).toBe(EMPTY_SELECTION)` reference equality test (#3).
9. `filterPresets/presetSummary`: Order-independence of category array (#3). Locks the "count not order" contract.
10. `reputationTier`: Threshold-monotonicity standalone invariant (#2). Catches threshold typos with a clear failure.

**Tier 3 — nice to have, low risk:**

11. `directionsLink`: Out-of-range coords (lat > 90) and high-precision (1e-10) tests (#2, #3).
12. `reputationTier`: `pointsToNextTier(Infinity)` / `pointsToNextTier(-Infinity)` (#4).
13. `filterPresets/presetSummary`: `minSeverity: 5` plural-categories test (#2).
14. `dataExport`: Round-number coord (`lat: 49`) → `49.000000` test (#8).
15. `dataExport`: Both-empty (flags=[] AND feedback=[]) test (#10).

## Libs with weakest coverage

**Ranked by gap-severity (not just gap-count):**

1. **`dataExport`** — 17 tests is impressive, but the file is large (135 LOC) and several real-world inputs are
   unspec'd. Most gaps are "what does it do?" questions where the test would document the contract.
2. **`directionsLink`** — Smallest gap count, but the gaps include genuine URL-validity holes (iOS/Android never
   parsed). The web path is locked down hard; the native paths are regex-tested only.
3. **`taskSelection`** — Mostly excellent. Gaps are around invariants (frozen, reference-equality) the file promises
   but doesn't test.
4. **`reputationTier`** — Strongest coverage of the five. Gaps are belt-and-suspenders invariants (uniqueness,
   monotonicity) that would catch typos earlier than the existing tests.
5. **`filterPresets/presetSummary`** — 4 targeted tests for a small new helper. Coverage is proportional. Gaps are
   minor (severity 5, order-independence).

## Files inspected (absolute paths)

- `/Users/skypie/AccessMap/src/lib/directionsLink.ts` (via `git show feat/get-directions-2026-05-24:...`)
- `/Users/skypie/AccessMap/src/lib/__tests__/directionsLink.test.ts` (ditto)
- `/Users/skypie/AccessMap/src/lib/reputationTier.ts` (via `git show feat/reputation-tier-2026-05-24:...`)
- `/Users/skypie/AccessMap/src/lib/__tests__/reputationTier.test.ts` (ditto)
- `/Users/skypie/AccessMap/src/lib/filterPresets.ts` (via `git show feat/filter-presets-apply-2026-05-24:...`)
- `/Users/skypie/AccessMap/src/lib/__tests__/filterPresets.test.ts` (ditto)
- `/Users/skypie/AccessMap/src/lib/taskSelection.ts` (via `git show feat/tasks-bulk-select-2026-05-24:...`)
- `/Users/skypie/AccessMap/src/lib/__tests__/taskSelection.test.ts` (ditto)
- `/Users/skypie/AccessMap/src/lib/dataExport.ts` (via `git show feat/data-export-2026-05-24:...`)
- `/Users/skypie/AccessMap/src/lib/__tests__/dataExport.test.ts` (ditto)
- `/Users/skypie/AccessMap/src/types/database.ts` (for `FlagRow` / `FeedbackRow` shape verification)

## DECISIONS FOR SKY

None — this is a read-only gap analysis. No blockers. All recommendations are additive tests; none require code changes
in the libs. Morgan to surface any tier-1 items if/when desired.
