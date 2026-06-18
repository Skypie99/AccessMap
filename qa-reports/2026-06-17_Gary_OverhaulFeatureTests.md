# 2026-06-17 — Gary — Overhaul Feature Tests (TASK #1)

**Role:** Gary (QA Engineer) — tests only, no source changes.
**Scope:** Lock the 2026-06-17 expressive-overhaul code with jest (jest-expo preset). TS strict, no new `any`.

## Summary

Added **32 new tests** across 5 files (3 new, 2 extended). All pass. Full suite stays green
(108 suites, 1740 passed, 136 pre-existing todo) and `tsc --noEmit` is clean.

| # | Target | File | Tests | Status |
|---|--------|------|-------|--------|
| 1 | GlassSurface | `src/components/ui/__tests__/GlassSurface.test.tsx` (NEW) | 11 | PASS |
| 2 | useReduceTransparency | `src/lib/__tests__/accessibility.test.ts` (EXTENDED) | +7 | PASS |
| 3 | StatusHistoryModal timeline | `src/components/__tests__/StatusHistoryModal.test.tsx` (NEW) | 6 | PASS |
| 4 | MyReportsModal initialStatus | `src/components/__tests__/MyReportsModal.test.tsx` (NEW) | 4 | PASS |
| 5 | ReportFlagModal active-severity cue | `src/screens/__tests__/ReportFlagModal.test.tsx` (EXTENDED) | +4 | PASS |

`npx jest <5 files>` → **5 suites, 69 tests, 69 passed**.

## What each file locks in

1. **GlassSurface** — children always render; BlurView present by default (Reduce Transparency
   off); BlurView ABSENT and opaque `color.overlay` fill under `useReduceTransparency()===true`;
   intensity/tint defaults (24 / 'light') and overrides forwarded; `solidColor` override; extra
   ViewProps (testID, accessibilityLabel) forwarded on both paths. `expo-blur` mocked to a tagged
   stub so present/absent is unambiguous; `useReduceTransparency` mocked to toggle.

2. **useReduceTransparency** — false initially / on probe-false; resolves to probed `true`;
   subscribes to `reduceTransparencyChanged`; live on→off update; unsubscribe on unmount; stays
   false when the probe rejects (web/unsupported). Mirrors the `useReducedMotion` shape via a
   mocked `AccessibilityInfo` + `renderHook`.

3. **StatusHistoryModal timeline** — one row per entry labeled with its formatted line; a
   status-colored dot per entry mapped from the themed `status*Fg` tokens (open/verified/resolved)
   plus the `brandText` fallback for an unrecognized status; the LAST entry has NO connector while
   earlier entries do (the timeline invariant); empty + null-flagId states. `statusDotColor` isn't
   exported, so dot color + connector presence are asserted via the rendered subtree (style
   inspection keyed off the public row accessibilityLabel).

4. **MyReportsModal initialStatus** — `initialStatus='verified'` seeds the status filter so the
   "Verified" chip reads `selected` on open (and "All"/others don't); omitting it defaults to "All"
   selected; re-seeding on reopen with a new status. Fixture spans multiple statuses so the chip
   row renders (`presentStatuses.length > 1`).

5. **ReportFlagModal active-severity cue** — exactly one severity selected (default 3); the
   decorative Check tick (lucide → RNSVG node) rides only the selected button and is hidden from
   AT (`accessibilityElementsHidden` + `importantForAccessibility`); tapping a new severity moves
   the selected state AND the tick. This is the WCAG 1.4.1 non-color-cue guard.

## Coverage honesty — MapScreen memos SKIPPED (documented)

`categoryCounts`, `emptyResetChips`, and `nearestOpenHit` (plus the Tasks banner's `nearestOpenHit`)
are **inline `useMemo`s inside the 2565-line MapScreen** closing over component state — not exported,
not extractable without rendering the entire screen (PlatformMap, location, supabase realtime,
clustering, ~dozens of libs). Per the task's "light test ONLY if cheap, otherwise document why"
guidance, I did NOT write brittle full-screen render tests. The logic they wrap is already covered:
- `findNearestUnresolved` → `src/lib/__tests__/nearestFlag.test.ts`
- `categoryCounts` is a trivial reducer over `flags`; `emptyResetChips` is presentation glue that
  flips already-tested filter setters.

If these become worth pinning, the right move is to extract the per-category tally + chip-builder
into a pure helper in `src/lib/` and unit-test that — a small source refactor, out of scope here.

## Notes

- No source files modified. Tests only.
- One benign residual: MyReportsModal emits "update not wrapped in act" console warnings from the
  trailing `setLoading(false)` after `load()` on reopen — tests are green and deterministic; the
  same trailing-update pattern is documented and tolerated in the existing ReportFlagModal suite.
  Chasing zero warnings here reintroduced unmount/timeout fragility, so I left it.
- Lint: 0 errors (only the repo-standard `import/first` warnings from Jest-hoisted `jest.mock`
  calls, identical to the existing ReportFlagModal test).
