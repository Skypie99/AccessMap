# QA — Cycle C (Gary) — 2026-05-24

Read-only review of the 4 Cycle-C branches against `main` (HEAD `40d7dd2`, baseline 38 suites / 578 tests / 0 TS errors). Each branch is 1 commit ahead of main.

Constitutional posture: READ-ONLY. No commits, no merges, no external sends. Morgan is the sole channel to Sky.

---

## 1. Gate results

| Branch | Worktree | tsc | jest suites | tests | runtime |
| --- | --- | --- | --- | --- | --- |
| **T1** status history | `~/AccessMap/.claude/worktrees/wt-t1` | PASS (0 errors) | 39 passed | **602 passed** (+24) | 1.65 s |
| **C4** time-of-day tags | `~/AccessMap/.claude/worktrees/wt-c4` | PASS (0 errors) | 39 passed | **607 passed** (+29) | 1.58 s |
| **CL1** lifted modals | `~/AccessMap/.claude/worktrees/wt-cl1` | PASS (0 errors) | 39 passed | **583 passed** (+5) | 1.43 s |
| **CL2** brandText token | `~/AccessMap/.claude/worktrees/wt-cl2` | PASS (0 errors) | **38 passed** | **578 passed** (+0) | 1.23 s |

All four branches are green on both gates. T1/C4/CL1 each add a single new test suite. CL2 adds no tests (pure theme token addition, see §2.4 for why this is acceptable but worth a follow-up).

Combined delta vs main: +3 suites / +58 tests / 0 TS errors, runtime stable (~1.5 s).

---

## 2. Coverage gaps

### 2.1 T1 — status history (`statusHistory.ts`, `StatusHistoryModal.tsx`)

**Tested today (`src/lib/__tests__/statusHistory.test.ts`):**
- `formatHistoryEntry` is well covered — 24 tests including the full 4×4 status transition matrix, initial-entry behavior (`from_status === null`), label-resolver delegation, i18n-style mapping, unknown-status passthrough, deterministic timestamp callback.

**Gaps:**

- **HIGH** — `listStatusHistory` (`src/lib/statusHistory.ts:41`) has **zero unit tests**. This is the function that talks to Supabase and contains the load-bearing "table doesn't exist yet (migration not applied) → return []" defensive path. None of the four code paths are exercised:
  1. happy-path: query succeeds, rows returned, ascending order preserved
  2. error-path: `error` object present (e.g. RLS rejection) → returns `[]`
  3. throw-path: query throws (network drop, schema-cache miss) → caught → returns `[]`
  4. null-data path: `data === null` with no error → returns `[]`
  Without these, the most likely production failure mode (migration not yet applied on the live DB) is unverified.
- **HIGH** — `StatusHistoryModal` (264 LoC) is **not tested at all**. No render test, no "empty state shows placeholder", no "ActivityIndicator while loading", no "modal closes on backdrop press", no "VoiceOver focus trap via accessibilityViewIsModal" smoke check.
- **MED** — `statusLabel` inner helper inside `StatusHistoryModal.tsx:47` (the `STATUS_LABELS` lookup + fallback for unknown status) is not exported, so its capitalize-on-unknown branch is uncovered.
- **MED** — RLS posture: the migration `supabase/migrations/2026-05-24_status_history_table.sql` declares RLS but no test fixture asserts the client cast (`supabase as unknown as {...}`) matches the actual PostgREST builder shape. If the `.eq().order()` chain shape ever drifts (e.g. PostgREST v2), this silently fails at runtime, not at typecheck.
- **LOW** — The `FlagDetailModal.tsx` 43-line addition (presumably the "View history" entry point) isn't covered by any new test.

### 2.2 C4 — time-of-day / context tags (`contextTags.ts`, `flags.ts`, `ReportFlagModal.tsx`)

**Tested today (`src/lib/__tests__/contextTags.test.ts`, 29 tests):**
- Excellent: vocabulary integrity (9 tags, every tag has a label, frozen objects, label-keys match tag-keys), `isValidTag` (every tag accepted, case-sensitivity, leading-space rejected, every non-string type rejected), `toggleTag` (add, remove, order preservation, no mutation, fresh reference on both branches, idempotent-pair), `sanitizeTagList` (non-array, empty array, unknown strings stripped, null/undefined stripped, dedup with first-seen order preservation, no mutation).

**Gaps:**

- **HIGH** — `createFlag`'s new graceful-degradation path (`src/lib/flags.ts:90–134`) is untested. The branch that detects a `PGRST204` "context_tags column missing" error and silently retries the insert without the field is exactly the kind of code that breaks the moment the message format changes upstream. Specifically uncovered:
  - `isUnknownColumnError(err, 'context_tags')` for `code === 'PGRST204'` → true
  - `isUnknownColumnError` for `message` containing "could not find the 'context_tags' column" → true
  - `isUnknownColumnError` for an unrelated error (e.g. severity check constraint violation) → false **and rethrown**
  - The retry path: with-tags insert errors with PGRST204 → fallback insert succeeds → returns the row WITHOUT context_tags
  - The `tagsToSend === undefined` path: only the legacy insert runs (single round-trip optimization)
  - The `tagsToSend === []` path: per the caller (ReportFlagModal:115), an empty array is converted to `undefined`, but `createFlag` itself doesn't enforce that — a future caller passing `[]` would hit the tags path
- **MED** — `ReportFlagModal` tag picker UX (the 9 chip rendering, `accessibilityState.checked`, the active/inactive style swap, the helper text) has no render/snapshot test. The chips have a 44pt min-touch-target claim in the comments — no test enforces that.
- **MED** — **No maximum-count enforcement.** Neither `contextTags.ts` nor `createFlag` caps how many tags a single flag can carry. A scripted client could send 1000+ tags; `sanitizeTagList` would faithfully return them all. The migration SQL may have a length check — worth a follow-up to either add a `MAX_CONTEXT_TAGS = 9` constant + test or document the absence.
- **LOW** — Round-trip: no test asserts that `sanitizeTagList(serialized via JSON)` equals the input. If anything ever encodes context_tags through `JSON.stringify`/`JSON.parse` (e.g. local draft persistence), an extra layer might wrap them in `{tags: [...]}` and silently drop them all.

### 2.3 CL1 — lifted modals (`sharedModalsContext.tsx`, `RootNavigator`, `ProfileScreen`, `SettingsScreen`)

**Tested today (`src/lib/__tests__/sharedModalsContext.test.tsx`, 5 tests):**
- `open === null` on first render
- `setOpen('help')` → reflects in next observation
- `setOpen('changelog')` then `setOpen(null)` → final null, intermediate value observed
- `useSharedModals()` outside provider throws with `/SharedModalsProvider/`
- Smoke-check that each of the 4 union keys (`help`, `changelog`, `feedback`, `myFeedback`) round-trips

**Gaps — the four user-asked questions, mapped:**

- **(a) Provider mounted at root — HIGH gap.** There is NO test that confirms `RootNavigator` actually wraps in `<SharedModalsProvider>`. The provider's existence is asserted indirectly (the new tests would fail if you removed it), but a regression where someone refactors RootNavigator and accidentally moves the provider below a tab would still let `sharedModalsContext.test.tsx` pass while breaking the app. A render test of `RootNavigator` calling `useSharedModals()` from a fake screen would catch this.
- **(b) `setOpen()` opens the right modal — MED gap.** The unit test confirms `setOpen('help')` updates context state, but NOT that `HelpModal` actually receives `visible={true}` as a consequence. The `SharedModalsHost` (the new component in RootNavigator that maps `open === 'help'` to `<HelpModal visible={true} />`) is uncovered. An integration test could mount `<SharedModalsProvider><SharedModalsHost /></SharedModalsProvider>`, fire `setOpen('help')`, and assert one of the four modals is `visible`.
- **(c) Closing returns focus — HIGH gap (accessibility).** Zero tests for focus return. React Native's `<Modal>` has known focus-restoration gotchas when a screen mounts → modal opens → modal closes → focus should land on the caller button. This is exactly the kind of thing the lift can silently break: previously `ProfileScreen` owned the modal and the caller and the focus chain was straightforward; now the modal is mounted at root and the caller lives two component tiers down. Worth at least an `accessibilityViewIsModal` audit (the comment says all 4 set it, but no test enforces).
- **(d) No double-mount regression — HIGH gap.** This is the core motivation for CL1 and there is NO test that proves it. A regression where someone reverts the ProfileScreen modal import while leaving the navigator host in place would re-introduce double-mount silently. A simple counter-instrumented mock-of-`HelpModal` rendered through `<RootNavigator />` would catch it: assert only ONE `HelpModal` is in the tree.
- **MED** — The `useMemo` dependency on `[open]` (line 84) means consumers don't re-render on unrelated provider re-renders. Currently untested — if someone changes the deps to `[]` or adds an unstable callback, the optimization regresses silently.
- **LOW** — The test uses `react-test-renderer` via a require + manual cast (lines 23–31 of the test file) because `@types/react-test-renderer` isn't installed. Pragmatic, but fragile — note for future cleanup.

### 2.4 CL2 — `color.brandText` theme token

**Tested today:** None. The diff is `+22 / -9` across 4 files — pure visual token swap (presumably replacing low-contrast text colors with a token that meets WCAG AA 4.5:1).

**Gaps:**

- **MED** — There is **no test of any kind** in this branch. The 3 migrated callsites (`AddressSearchModal`, `FlagDetailModal`, `MapScreen`) have no snapshot tests, no visual diff, no contrast-ratio assertion.
- **MED** — The new `color.brandText` token in `src/theme.ts` is not asserted against the WCAG AA 4.5:1 contrast threshold. If someone later tweaks the value to `#888` on white, no test fails — the whole point of introducing the token (passing AA) regresses silently.
- **LOW** — No test confirms the token is exported (would fail at typecheck, but a `theme.test.ts` asserting `expect(color.brandText).toBeDefined()` is a one-liner that doubles as living documentation).
- **LOW** — No "all callsites that were `#999` are now `color.brandText`" lint rule or test. If a future contributor adds another `#999` text color, it would not be caught.

**Why CL2 is still acceptable to land:** the change is mechanical, tsc enforces shape, and the visual claim ("now meets AA") is properly a Dani / Alex domain (Design Compiler Layer 2, Accessibility Parity). Gary's view: ship as-is, but recommend a `theme.test.ts` follow-up with a contrast-ratio helper.

---

## 3. Tests that look like they pass-by-luck

- **T1 — `formatHistoryEntry` "4×4 matrix"** is thorough but only asserts a string format. If the formatter ever switched to JSX (e.g. to render the arrow as a styled `<Text>`), the tests would still need to be rewritten anyway, so this is fine — flagging only because future-Gary may want to migrate to a structured object return.
- **C4 — `sanitizeTagList` "does not mutate the input array"** uses `expect(input).toEqual(snapshot)`. If `sanitizeTagList` mutated by replacing element 0 with the same value, this would still pass. Stronger: `Object.freeze(input)` before the call and rely on strict-mode throw. Low priority.
- **CL1 — `sharedModalsContext.test.tsx` "supports each of the four shared modal keys"** is a true smoke test — it asserts the union accepts each key, but doesn't assert anything about side effects. The test would pass even if `setOpen` were `() => {}` and state was never updated, because `observed[observed.length - 1]` would be `null` and the assertion would say `toBe('help')` — wait, actually that one WOULD fail. So the smoke check is genuine. Retracting this concern.
- **CL1 — "throws when useSharedModals is used outside the provider"** uses `toThrow(/SharedModalsProvider/)`. Solid (matches the throw message). Good defensive test.
- **C4 — `contextTags` round-trip is its own inverse** is one of the cleaner property-style tests in the suite. No concerns.

No outright pass-by-luck offenders. The biggest weakness across all 4 branches is **what's NOT tested** (modals, navigation glue, the Supabase query layer) rather than tests that lie.

---

## 4. Recommended additions

### T1 — `statusHistory.test.ts` add:
- `it('returns [] when the supabase query returns error PGRST200')` — mock `supabase.from(...).select().eq().order()` to resolve `{ data: null, error: { code: 'PGRST200' } }`; assert `[]`.
- `it('returns [] when the supabase query throws')` — mock to reject; assert `[]` (catches the outer try/catch).
- `it('returns parsed rows in ascending created_at order on success')` — mock to resolve `{ data: [row1, row2], error: null }`; assert returned array `=== data`.
- `it('returns [] when data is null with no error')` — guards the `?? []` fallback.

### T1 — new `StatusHistoryModal.test.tsx`:
- `it('shows placeholder text when listStatusHistory returns []')`
- `it('renders one row per history entry in order')`
- `it('calls onClose when backdrop is pressed')`
- `it('sets accessibilityViewIsModal so VoiceOver focus is trapped')`

### C4 — `flags.test.ts` (new file) add:
- `it('createFlag without context_tags uses the single legacy insert path')` — mock insert; assert called once with payload sans `context_tags`.
- `it('createFlag with tags + PGRST204 falls back to legacy insert and returns the row')` — mock the first insert to error with `{ code: 'PGRST204' }`; mock the second to succeed; assert row returned, no throw.
- `it('createFlag rethrows non-unknown-column errors')` — mock insert to error with `{ code: '23505' }` (unique violation); assert throws.
- `it('isUnknownColumnError matches PGRST204 by code')` — export the helper (or move to a testable boundary) and pin the heuristic.
- `it('isUnknownColumnError matches message-based "not find" / "not exist" patterns')`.

### C4 — `contextTags.test.ts` add (or new `contextTags.maxCount.test.ts`):
- `it('caps a sanitized list at MAX_CONTEXT_TAGS')` — requires introducing a `MAX_CONTEXT_TAGS = 9` constant. **Decision for Sky:** does the product want a cap, or is "9 is the natural cap because there are only 9 valid tags" sufficient? Currently a malicious client could `Array(1000).fill('high_tide')` and `sanitizeTagList` would dedupe to 1, but `[t1,t2,...,t9, 'high_tide', ..., 'high_tide']` of length 10k would return 9 distinct in O(n) — fine in practice, but worth documenting.

### CL1 — `sharedModalsContext.test.tsx` add:
- `it('useMemo identity is stable across unrelated re-renders')` — render the provider with a parent that re-renders 3 times without touching `open`; assert the context value object reference is preserved.
- `it('opening a second modal supersedes the first')` — `setOpen('help')` then `setOpen('changelog')`; assert final state is `'changelog'`, not both visible.

### CL1 — new `RootNavigator.integration.test.tsx`:
- `it('mounts exactly one HelpModal in the tree')` — render `RootNavigator`; query for HelpModal instances; assert length === 1. (Catches the double-mount regression.)
- `it('SharedModalsHost responds to setOpen by toggling the right modal visible prop')` — render `RootNavigator`; obtain `setOpen` via a probe component; call `setOpen('feedback')`; assert `FeedbackModal` has `visible={true}`.
- `it('useSharedModals() throws if called from a tree that lacks the provider')` — wrap a screen without the provider; expect render to throw.

### CL2 — new `theme.test.ts`:
- `it('color.brandText is defined and a 6-char hex string')`
- `it('color.brandText meets WCAG AA 4.5:1 against color.surface')` — uses a `contrastRatio(hexA, hexB)` helper (~20 LoC, no deps).
- `it('color.brandText is referenced in at least the 3 migrated files')` — grep-style guard against accidental token removal.

---

## Decisions for Sky

1. **C4 max-context-tag policy** — should there be a `MAX_CONTEXT_TAGS` cap, and if so, where (client `sanitizeTagList`, `createFlag`, or DB CHECK constraint in the migration)? Currently no cap anywhere.
2. **CL1 integration tests vs unit tests** — the unit tests for `sharedModalsContext` are tight, but the integration claim (provider mounted at root, single-mount, focus returns) is unproven. Should Gary add a `react-test-renderer` integration test of `RootNavigator` itself, even though it pulls in many transitive mocks?
3. **CL2 theme tests** — does Sky want a `theme.test.ts` with a contrast-ratio helper as a standing guard, or is this Alex's domain (Design Compiler Layer 2)?

---

## Verification (stdout)

- File written: `/Users/skypie/AccessMap/qa-reports/qa-gary-cycle-C-2026-05-24.md`
- Gate table summary: **4/4 PASS tsc, 4/4 PASS jest**, totals — T1: 39 suites / 602 tests · C4: 39 / 607 · CL1: 39 / 583 · CL2: 38 / 578. All branches green vs main baseline (38 / 578).
- Gap counts: **HIGH 6, MED 9, LOW 4** across the 4 branches (T1: 2H/2M/1L, C4: 1H/2M/1L, CL1: 3H/1M/1L, CL2: 0H/2M/1L).
- Recommended additions: 19 specific test names spec'd in §4.

Read-only. No commits. No external sends.
